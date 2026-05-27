var aiAbortController = null;

function formatAIContent(text) {
  var html = text;
  html = html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  html = html.replace(/^---+$/gm, '<hr>');
  html = html.replace(/^\*\*\*+$/gm, '<hr>');
  html = html.replace(/^___+$/gm, '<hr>');
  html = html.replace(/^### (.+)$/gm, '<strong style="font-size:14px;display:block;margin:8px 0 4px">$1</strong>');
  html = html.replace(/^## (.+)$/gm, '<strong style="font-size:15px;display:block;margin:10px 0 4px">$1</strong>');
  html = html.replace(/^# (.+)$/gm, '<strong style="font-size:16px;display:block;margin:12px 0 4px">$1</strong>');
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<span style="display:block;padding-left:12px;position:relative">• $1</span>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<span style="display:block;padding-left:16px">$1. $2</span>');
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.08);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function initAIUI() {
  var panelBody = document.getElementById("ai-panel-body");
  var panelTitle = document.getElementById("ai-panel-title");
  var usageEl = document.getElementById("ai-usage");

  document.getElementById("btn-ai-explain").addEventListener("click", function () {
    if (this.disabled) return;
    handleAIExplain();
  });

  document.getElementById("btn-ai-settings").addEventListener("click", function () {
    var input = document.getElementById("ai-api-key-input");
    input.value = AI.getApiKey();
    showModal("modal-ai-settings");
  });

  document.getElementById("modal-ai-settings-close").addEventListener("click", function () {
    hideModal("modal-ai-settings");
  });

  document.getElementById("modal-ai-settings").addEventListener("click", function (e) {
    if (e.target === this) hideModal("modal-ai-settings");
  });

  document.getElementById("ai-settings-save").addEventListener("click", function () {
    var input = document.getElementById("ai-api-key-input");
    var key = input.value.trim();
    if (!key) {
      showToast("请输入 API Key", "warn");
      return;
    }
    AI.setApiKey(key);
    hideModal("modal-ai-settings");
    showToast("API Key 已保存", "success");
    updateAIUsage();
  });

  document.getElementById("ai-panel-close").addEventListener("click", function () {
    if (aiAbortController) {
      aiAbortController.abort();
      aiAbortController = null;
    }
    hideModal("ai-panel-modal");
    setAIButtonsDisabled(false);
  });

  document.getElementById("ai-panel-modal").addEventListener("click", function (e) {
    if (e.target === this) {
      if (aiAbortController) {
        aiAbortController.abort();
        aiAbortController = null;
      }
      hideModal("ai-panel-modal");
      setAIButtonsDisabled(false);
    }
  });

  updateAIUsage();
}

function updateAIUsage() {
  var el = document.getElementById("ai-usage");
  if (el) el.textContent = "今日剩余: " + AI.getRemaining() + " 次";
}

function setAIButtonsDisabled(disabled) {
  var btn = document.getElementById("btn-ai-explain");
  if (btn) btn.disabled = disabled;
}

function showAIPanel(title) {
  var panelTitle = document.getElementById("ai-panel-title");
  var panelBody = document.getElementById("ai-panel-body");

  panelTitle.innerHTML = '<span class="material-symbols-outlined" style="font-variation-settings: \'FILL\' 1;">smart_toy</span> ' + title;
  aiStreamRawText = "";
  panelBody.innerHTML = '<span class="ai-panel-loading">思考中<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
  showModal("ai-panel-modal");
  setAIButtonsDisabled(true);
}

var aiStreamRawText = "";

function appendAIContent(chunk) {
  var panelBody = document.getElementById("ai-panel-body");
  var loading = panelBody.querySelector(".ai-panel-loading");
  if (loading) loading.remove();
  aiStreamRawText += chunk;
  panelBody.innerHTML = formatAIContent(aiStreamRawText);
  panelBody.scrollTop = panelBody.scrollHeight;
}

function setAIContent(content) {
  var panelBody = document.getElementById("ai-panel-body");
  var loading = panelBody.querySelector(".ai-panel-loading");
  if (loading) loading.remove();
  aiStreamRawText = content;
  panelBody.innerHTML = formatAIContent(content);
  panelBody.scrollTop = panelBody.scrollHeight;
}

function showAIError(msg) {
  var panelBody = document.getElementById("ai-panel-body");
  panelBody.innerHTML = '<span style="color:#ef4444;">❌ ' + msg + "</span>";
  setAIButtonsDisabled(false);
}

function handleAISuggest() {
  if (state.teams.length === 0) {
    showToast("请先添加至少一支球队", "warn");
    return;
  }

  var firstTeam = state.teams[0];
  var partnerIds = state.teams.slice(1).map(function (t) { return t.id; });

  showAIPanel("AI 交易建议 — " + firstTeam.shortName);

  aiAbortController = new AbortController();

  AI.suggestTrade(firstTeam.id, partnerIds, function (chunk) {
    appendAIContent(chunk);
  }, aiAbortController.signal).then(function (result) {
    if (result.fromCache) {
      setAIContent(result.content);
    }
    setAIButtonsDisabled(false);
    aiAbortController = null;
    updateAIUsage();
    showToast("AI 建议已生成", "success");
  }).catch(function (err) {
    if (err.name === "AbortError") return;
    showAIError(err.message || "请求失败");
    aiAbortController = null;
  });
}

var gmChatState = {
  selectedTeamId: null,
  conversationHistory: [],
  isLoading: false,
  abortController: null
};

function initGMChatUI() {
  var modal = document.getElementById("gm-chat-modal");
  var teamSelect = document.getElementById("gm-chat-team-select");
  var input = document.getElementById("gm-chat-input");
  var sendBtn = document.getElementById("gm-chat-send");
  var closeBtn = document.getElementById("gm-chat-close");
  var clearBtn = document.getElementById("gm-chat-clear");
  var usageEl = document.getElementById("gm-chat-usage");

  var teamIds = Object.keys(TEAMS_DATA);
  teamIds.forEach(function (id) {
    var team = TEAMS_DATA[id];
    var option = document.createElement("option");
    option.value = id;
    option.textContent = team.name;
    teamSelect.appendChild(option);
  });

  document.getElementById("btn-gm-chat").addEventListener("click", function () {
    if (this.disabled) return;
    toggleGMChat();
  });

  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeGMChat();
  });

  teamSelect.addEventListener("change", function () {
    gmChatState.selectedTeamId = this.value;
    gmChatState.conversationHistory = [];
    clearChatMessages();
    if (this.value) {
      showGMChatWelcome(TEAMS_DATA[this.value]);
    }
  });

  sendBtn.addEventListener("click", function () {
    sendGMChatMessage();
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendGMChatMessage();
    }
  });

  closeBtn.addEventListener("click", function () {
    closeGMChat();
  });

  clearBtn.addEventListener("click", function () {
    gmChatState.conversationHistory = [];
    clearChatMessages();
    if (gmChatState.selectedTeamId) {
      showGMChatWelcome(TEAMS_DATA[gmChatState.selectedTeamId]);
    }
  });

  updateGMChatUsage();
}

function toggleGMChat() {
  var modal = document.getElementById("gm-chat-modal");
  var fab = document.getElementById("btn-gm-chat");
  var teamSelect = document.getElementById("gm-chat-team-select");

  if (modal.classList.contains("active")) {
    closeGMChat();
  } else {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    fab.classList.add("hidden");
    document.body.style.overflow = "hidden";

    if (!gmChatState.selectedTeamId && state.teams.length > 0) {
      var firstTeamId = state.teams[0].id;
      teamSelect.value = firstTeamId;
      gmChatState.selectedTeamId = firstTeamId;
      gmChatState.conversationHistory = [];
      clearChatMessages();
      showGMChatWelcome(TEAMS_DATA[firstTeamId]);
    }
  }
}

function closeGMChat() {
  var modal = document.getElementById("gm-chat-modal");
  var fab = document.getElementById("btn-gm-chat");
  if (gmChatState.abortController) {
    gmChatState.abortController.abort();
    gmChatState.abortController = null;
  }
  gmChatState.isLoading = false;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  fab.classList.remove("hidden");
  document.body.style.overflow = "";
  setGMChatInputEnabled(true);
}

function clearChatMessages() {
  var body = document.getElementById("gm-chat-body");
  var placeholder = document.getElementById("gm-chat-placeholder");
  body.querySelectorAll(".gm-chat-msg").forEach(function (el) { el.remove(); });
  if (body.querySelectorAll(".gm-chat-msg").length === 0) {
    placeholder.style.display = "";
  } else {
    placeholder.style.display = "none";
  }
}

function showGMChatWelcome(team) {
  var body = document.getElementById("gm-chat-body");
  var placeholder = document.getElementById("gm-chat-placeholder");
  placeholder.style.display = "none";

  addChatMessage("gm", "老板您好！我是" + team.name + "的总经理。我已经仔细研究了球队的阵容情况、薪资空间和选秀权储备。\n\n您有什么想讨论的？无论是球员评估、交易方向、阵容短板，还是具体的交易目标，我都可以帮您分析。请随时告诉我您的想法。");
}

function sendGMChatMessage() {
  var input = document.getElementById("gm-chat-input");
  var msg = input.value.trim();
  if (!msg) return;

  if (!gmChatState.selectedTeamId) {
    showToast("请先选择一支球队", "warn");
    return;
  }

  if (gmChatState.isLoading) return;

  input.value = "";
  input.focus();

  addChatMessage("owner", msg);
  gmChatState.conversationHistory.push({ role: "owner", content: msg });

  var loadingMsg = addChatMessage("gm-loading", "思考中...");

  gmChatState.isLoading = true;
  setGMChatInputEnabled(false);
  gmChatState.abortController = new AbortController();

  var historyCopy = gmChatState.conversationHistory.slice(0, -1);

  var streamRawText = "";

  AI.chatWithGM(
    gmChatState.selectedTeamId,
    historyCopy,
    msg,
    function (chunk) {
      var loadingEl = document.getElementById(loadingMsg.id);
      if (loadingEl) {
        loadingEl.classList.remove("gm-chat-msg-loading");
        streamRawText += chunk;
        var bubble = loadingEl.querySelector(".gm-chat-msg-bubble");
        if (bubble) bubble.innerHTML = formatAIContent(streamRawText);
      }
      var body = document.getElementById("gm-chat-body");
      body.scrollTop = body.scrollHeight;
    },
    gmChatState.abortController.signal
  ).then(function (result) {
    var loadingEl = document.getElementById(loadingMsg.id);
    if (loadingEl) {
      loadingEl.classList.remove("gm-chat-msg-loading");
      loadingEl.classList.add("gm");
      var label = loadingEl.querySelector(".gm-chat-msg-label");
      if (label) label.textContent = "总经理 · " + TEAMS_DATA[gmChatState.selectedTeamId].name;
      var bubble = loadingEl.querySelector(".gm-chat-msg-bubble");
      if (bubble) bubble.innerHTML = formatAIContent(result.content);
    }

    gmChatState.conversationHistory.push({ role: "gm", content: result.content });
    gmChatState.isLoading = false;
    gmChatState.abortController = null;
    setGMChatInputEnabled(true);
    updateGMChatUsage();

    var body = document.getElementById("gm-chat-body");
    body.scrollTop = body.scrollHeight;
  }).catch(function (err) {
    if (err.name === "AbortError") return;

    var loadingEl = document.getElementById(loadingMsg.id);
    if (loadingEl) {
      loadingEl.classList.remove("gm-chat-msg-loading");
      var bubble = loadingEl.querySelector(".gm-chat-msg-bubble");
      if (bubble) {
        bubble.textContent = "❌ " + (err.message || "请求失败，请稍后再试");
        bubble.style.color = "#ef4444";
      }
    }

    gmChatState.conversationHistory.pop();
    gmChatState.isLoading = false;
    gmChatState.abortController = null;
    setGMChatInputEnabled(true);
  });
}

function addChatMessage(role, content) {
  var body = document.getElementById("gm-chat-body");
  var placeholder = document.getElementById("gm-chat-placeholder");
  placeholder.style.display = "none";

  var msgId = "gm-msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);

  var wrapper = document.createElement("div");
  wrapper.className = "gm-chat-msg " + (role === "gm-loading" ? "gm gm-chat-msg-loading" : role);
  wrapper.id = msgId;

  var label = document.createElement("div");
  label.className = "gm-chat-msg-label";
  if (role === "gm" || role === "gm-loading") {
    label.textContent = "总经理 · " + (gmChatState.selectedTeamId ? TEAMS_DATA[gmChatState.selectedTeamId].name : "球队");
  } else if (role === "owner") {
    label.textContent = "老板 · 你";
  }

  var bubble = document.createElement("div");
  bubble.className = "gm-chat-msg-bubble";
  if (role === "gm" || role === "gm-loading") {
    bubble.innerHTML = formatAIContent(content);
  } else {
    bubble.textContent = content;
  }

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  body.appendChild(wrapper);

  body.scrollTop = body.scrollHeight;

  return { id: msgId, element: wrapper };
}

function setGMChatInputEnabled(enabled) {
  var input = document.getElementById("gm-chat-input");
  var sendBtn = document.getElementById("gm-chat-send");
  input.disabled = !enabled;
  sendBtn.disabled = !enabled;
  if (enabled) {
    sendBtn.textContent = "发送";
  } else {
    sendBtn.textContent = "...";
  }
}

function updateGMChatUsage() {
  var el = document.getElementById("gm-chat-usage");
  if (el) el.textContent = "今日剩余: " + AI.getRemaining() + " 次";
}

function handleAIExplain() {
  if (state.moves.length === 0) {
    showToast("请先构建一笔交易", "warn");
    return;
  }

  var firstTeam = state.teams.length > 0 ? state.teams[0] : null;
  var panelTitle = firstTeam ? "GM 评价 — " + firstTeam.shortName : "GM 评价";

  var results = [];
  runSalaryCheck(results);
  runRosterCheck(results);

  showAIPanel(panelTitle);

  aiAbortController = new AbortController();

  AI.explainTrade(results, function (chunk) {
    appendAIContent(chunk);
  }, aiAbortController.signal).then(function (result) {
    if (result.fromCache) {
      setAIContent(result.content);
    }
    setAIButtonsDisabled(false);
    aiAbortController = null;
    updateAIUsage();
    showToast("GM 评价已生成", "success");
  }).catch(function (err) {
    if (err.name === "AbortError") return;
    showAIError(err.message || "请求失败");
    aiAbortController = null;
  });
}
