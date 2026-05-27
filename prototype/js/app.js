function initApp() {
  document.getElementById('modal-team-close').addEventListener('click', function() {
    hideModal('modal-team');
  });
  document.getElementById('modal-team').addEventListener('click', function(e) {
    if (e.target === this) hideModal('modal-team');
  });

  document.getElementById('modal-dest-close').addEventListener('click', function() {
    hideModal('modal-dest');
  });
  document.getElementById('modal-dest').addEventListener('click', function(e) {
    if (e.target === this) hideModal('modal-dest');
  });

  document.getElementById('modal-trade-result-close').addEventListener('click', function() {
    hideModal('modal-trade-result');
  });
  document.getElementById('modal-trade-result').addEventListener('click', function(e) {
    if (e.target === this) hideModal('modal-trade-result');
  });

  document.getElementById('btn-check-trade').addEventListener('click', function() {
    if (this.disabled) return;
    checkTrade();
  });

  document.getElementById('btn-share').addEventListener('click', handleShare);
  document.getElementById('btn-reset').addEventListener('click', function() {
    if (state.teams.length || state.moves.length) {
      resetAll();
      hideModal('modal-trade-result');
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') hideAllModals();
  });

  restoreFromUrl();
  renderAll();
  initAIUI();
  initGMChatUI();
  window.__tradeState = state;
}

function handleShare() {
  if (state.teams.length === 0) { showToast('请先添加球队', 'warn'); return; }

  var params = new URLSearchParams();
  state.teams.forEach(function(t) { params.append('t', t.id); });
  state.moves.forEach(function(m) { params.append('m', m.player.id + '|' + m.from + '|' + m.to); });

  var url = window.location.origin + window.location.pathname + '?' + params.toString();

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showToast('🔗 交易链接已复制到剪贴板', 'success');
    }).catch(function() {
      showToast('链接: ' + url, 'info');
    });
  } else {
    showToast('链接: ' + url, 'info');
  }
}

function restoreFromUrl() {
  try {
    var sp = new URLSearchParams(window.location.search);
    var teamIds = sp.getAll('t');
    var moveParams = sp.getAll('m');

    teamIds.forEach(function(tid) {
      if (TEAMS_DATA[tid] && state.teams.length < MAX_TEAMS) {
        state.teams.push(TEAMS_DATA[tid]);
      }
    });

    moveParams.forEach(function(param) {
      var parts = param.split('|');
      if (parts.length !== 3) return;
      var pid = parts[0], fromId = parts[1], toId = parts[2];

      var fromTeam = TEAMS_DATA[fromId];
      if (!fromTeam) return;
      var player = fromTeam.players.find(function(p) { return p.id === pid; });
      if (!player) return;
      if (!hasTeam(fromId) || !hasTeam(toId)) return;

      state.moves.push({ player: player, from: fromId, to: toId });
    });

    if (state.teams.length) showToast('📎 已从链接恢复交易方案', 'info');
  } catch (e) {}
}

window.addEventListener('load', function() {
  try {
    initApp();
  } catch (error) {
    console.error(error);
    var fb = document.createElement('div');
    fb.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#0f1117;color:#e2e8f0;font-size:16px;padding:24px;text-align:center;z-index:9999;';
    fb.textContent = '哎呀，出错了，请刷新页面试试吧~';
    document.body.innerHTML = '';
    document.body.appendChild(fb);
  }
});
