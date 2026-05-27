var AI = (function () {
  var API_URL = "";
  var API_KEY = "";
  var MODEL = "deepseek-v4-pro";
  var DAILY_LIMIT = 20;
  var STORAGE_KEY = "nbatrade_ai_usage";
  var CACHE_PREFIX = "nbatrade_ai_cache_";
  var CACHE_TTL = 30 * 60 * 1000;

  function getApiEndpoint() {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3000/api/nba-ai';
    }
    return '/api/nba-ai';
  }

  var CONTRACT_DATA = null;
  var TPE_DATA = null;
  var RULES_DATA = null;
  var DRAFT_PICKS_DATA = null;

  function loadDataFiles() {
    var loadJson = function(path) {
      return fetch(path).then(function(r) { return r.ok ? r.json() : null; }).catch(function() { return null; });
    };

    return Promise.all([
      loadJson('data/output/contracts.json'),
      loadJson('data/output/team_tpes.json'),
      loadJson('data/output/rules.json')
    ]).then(function(results) {
      CONTRACT_DATA = results[0];
      TPE_DATA = results[1];
      RULES_DATA = results[2];
      DRAFT_PICKS_DATA = generateMockDraftPicks();
      return true;
    });
  }

  function generateMockDraftPicks() {
    var teams = Object.keys(TEAMS_DATA);
    var picks = {};
    teams.forEach(function(teamId) {
      var team = TEAMS_DATA[teamId];
      picks[teamId] = [];
      for (var year = 2026; year <= 2030; year++) {
        if (Math.random() > 0.3) {
          picks[teamId].push(year + " 首轮（自有）");
        }
        if (Math.random() > 0.5) {
          picks[teamId].push(year + " 次轮（自有）");
        }
      }
      if (team.overTaxLine > 50000000) {
        picks[teamId] = picks[teamId].filter(function(p) { return !p.includes("首轮"); });
      }
    });
    return picks;
  }

  function getContractInfo(playerName) {
    if (!CONTRACT_DATA || !CONTRACT_DATA.players) return null;
    var player = CONTRACT_DATA.players.find(function(p) {
      return p.name_cn === playerName || p.name === playerName;
    });
    return player || null;
  }

  function getTeamTPEs(teamName) {
    if (!TPE_DATA || !TPE_DATA.teams) return [];
    for (var fullName in TPE_DATA.teams) {
      if (fullName.includes(teamName) || teamName.includes(fullName.split(' ').pop())) {
        return TPE_DATA.teams[fullName].tpes || [];
      }
    }
    return [];
  }

  function getTeamDraftPicks(teamId) {
    if (!DRAFT_PICKS_DATA) return [];
    return DRAFT_PICKS_DATA[teamId] || [];
  }

  function buildDynamicRulesPrompt() {
    if (!RULES_DATA) return "";

    var thresholds = RULES_DATA.salary_cap_thresholds["2026_27"] || RULES_DATA.salary_cap_thresholds["2025_26"];
    var tpeRules = RULES_DATA.traded_player_exceptions;
    var apronRules = RULES_DATA.apron_rules;
    var adjustments = RULES_DATA.trade_salary_adjustments;

    var prompt = "## 最新 CBA 交易规则（2026-27 赛季）\n\n";

    prompt += "### 薪资帽阈值\n";
    prompt += "- 薪资帽: " + fmtSalary(thresholds.salary_cap) + "\n";
    prompt += "- 奢侈税线: " + fmtSalary(thresholds.luxury_tax_line) + "\n";
    prompt += "- 第一土豪线: " + fmtSalary(thresholds.first_apron) + "\n";
    prompt += "- 第二土豪线: " + fmtSalary(thresholds.second_apron) + "\n\n";

    prompt += "### 薪资匹配规则\n";
    prompt += "- 帽下队（capSpace > 0）：可接收送出薪资 ×2 + $250K\n";
    prompt += "- 税下队（超帽但未超税线）：可接收送出薪资 ×1.25 + $250K\n";
    prompt += "- 超税队（超税线但未超第二土豪线）：可接收送出薪资 ×1.25 + $100K\n";
    prompt += "- 第二土豪线队：只能等额交换（1:1），不能聚合薪资\n\n";

    prompt += "### 交易特例（TPE）类型\n";
    if (tpeRules.expanded_tpe) {
      prompt += "- 扩展 TPE（Expanded TPE）：\n";
      tpeRules.expanded_tpe.salary_limit_tiers.forEach(function(tier) {
        if (tier.outgoing_less_than) prompt += "  · 送出 < " + fmtSalary(tier.outgoing_less_than) + ": " + tier.formula + "\n";
        if (tier.outgoing_range) prompt += "  · 送出 " + tier.outgoing_range + ": " + tier.formula + "\n";
        if (tier.outgoing_more_than) prompt += "  · 送出 > " + fmtSalary(tier.outgoing_more_than) + ": " + tier.formula + "\n";
      });
    }
    if (tpeRules.standard_tpe) {
      prompt += "- 标准 TPE（Standard TPE）：可吸收 " + tpeRules.standard_tpe.salary_limit + "，有效期 12 个月\n";
    }
    prompt += "\n";

    prompt += "### 第二土豪线限制（非常重要！）\n";
    if (apronRules.second_apron_restrictions) {
      apronRules.second_apron_restrictions.forEach(function(r) {
        prompt += "- ❌ " + r + "\n";
      });
    }
    prompt += "\n";

    prompt += "### 薪资调整规则\n";
    if (adjustments.count_as_zero) {
      prompt += "- 不计入薪资匹配的资产: " + adjustments.count_as_zero.join("、") + "\n";
    }
    if (adjustments.trade_bonus_detail) {
      prompt += "- 交易保证金（Trade Kicker）：计入接收方薪资，不计入送出方\n";
    }
    if (adjustments.poison_pill_detail) {
      prompt += "- 毒药丸合同（Poison Pill）：新秀顶薪续约球员的入队薪资按平均计算\n";
    }
    prompt += "\n";

    return prompt;
  }

  function setApiKey(key) {
    API_KEY = key;
    localStorage.setItem("nbatrade_ai_key", key);
  }

  function getApiKey() {
    if (!API_KEY) {
      API_KEY = localStorage.getItem("nbatrade_ai_key") || "";
    }
    return API_KEY;
  }

  function getDailyUsage() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return 0;
      var data = JSON.parse(stored);
      var today = new Date().toISOString().slice(0, 10);
      if (data.date !== today) return 0;
      return data.count || 0;
    } catch (e) {
      return 0;
    }
  }

  function incrementUsage() {
    var today = new Date().toISOString().slice(0, 10);
    var current = getDailyUsage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: current + 1 }));
  }

  function getRemaining() {
    return Math.max(0, DAILY_LIMIT - getDailyUsage());
  }

  function checkLimit() {
    return getDailyUsage() < DAILY_LIMIT;
  }

  function getCached(key) {
    try {
      var stored = localStorage.getItem(CACHE_PREFIX + key);
      if (!stored) return null;
      var data = JSON.parse(stored);
      if (Date.now() - data.timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_PREFIX + key);
        return null;
      }
      return data.content;
    } catch (e) {
      return null;
    }
  }

  function setCache(key, content) {
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ timestamp: Date.now(), content: content }));
    } catch (e) {}
  }

  function hashStr(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var chr = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }
    return hash.toString(36);
  }

  function fmtSalary(num) {
    if (num === 0) return "$0";
    var abs = Math.abs(num);
    var sign = num < 0 ? "-" : "";
    if (abs >= 1000000) return sign + "$" + (abs / 1000000).toFixed(1) + "M";
    if (abs >= 1000) return sign + "$" + (abs / 1000).toFixed(0) + "K";
    return sign + "$" + abs;
  }

  function getTaxStatusLabel(team) {
    if (team.capRoom >= 0) return "帽下队";
    if (team.overTaxLine > 0) return "超税队";
    return "税下队";
  }

  function getApronLevel(team, thresholds) {
    if (!thresholds) return "未知";
    if (team.overTaxLine > thresholds.secondApron - thresholds.luxuryTaxLine) return "第二土豪线";
    if (team.overTaxLine > 0) return "第一土豪线";
    return "税下";
  }

  function evaluatePlayerTier(player) {
    var per = player.per || 0;
    var salary = player.salary || 0;
    var age = player.age || 25;
    var yearsRemaining = player.yearsRemaining || 1;

    var score = 0;

    if (per >= 20) score += 40;
    else if (per >= 17) score += 30;
    else if (per >= 14) score += 20;
    else if (per >= 11) score += 10;
    else score += 0;

    if (salary >= 40000000) score += 20;
    else if (salary >= 25000000) score += 15;
    else if (salary >= 15000000) score += 10;
    else if (salary >= 8000000) score += 5;
    else score += 0;

    if (age <= 25) score += 15;
    else if (age <= 28) score += 10;
    else if (age <= 32) score += 5;
    else score += 0;

    if (yearsRemaining >= 3) score += 10;
    else if (yearsRemaining >= 2) score += 5;
    else if (yearsRemaining === 1) score += 0;

    if (player.restricted) score += 15;

    if (score >= 70) return { tier: 'core', label: '建队核心' };
    if (score >= 50) return { tier: 'starter', label: '优质首发' };
    if (score >= 30) return { tier: 'rotation', label: '轮换球员' };
    if (yearsRemaining === 1 && salary >= 8000000) return { tier: 'expiring', label: '到期合同' };
    if (per < 11 && salary >= 15000000) return { tier: 'overpaid', label: '溢价合同' };
    return { tier: 'role', label: '角色球员' };
  }

  function formatPlayerInfo(p) {
    var tier = evaluatePlayerTier(p);
    var info = "  " + p.name + ": " + fmtSalary(p.salary) + ", PER " + p.per + ", " + p.yearsRemaining + "年" +
      (p.age ? ", " + p.age + "岁" : "") +
      (p.position ? ", " + p.position : "") +
      " [" + tier.label + "]";

    var contract = getContractInfo(p.name);
    if (contract) {
      var contractFlags = [];
      if (contract.no_trade_clause) contractFlags.push("NTC");
      if (contract.trade_kicker_pct) contractFlags.push("交易保证金" + contract.trade_kicker_pct + "%");
      if (contractFlags.length > 0) info += " (" + contractFlags.join(", ") + ")";
    }

    return info;
  }

  function buildPlayerDescription(p, includeContract) {
    var desc = p.name + ": " + fmtSalary(p.salary) + ", PER " + p.per + ", " + p.yearsRemaining + "年" +
      (p.age ? ", " + p.age + "岁" : "") +
      (p.position ? ", " + p.position : "");

    if (includeContract) {
      var contract = getContractInfo(p.name);
      if (contract) {
        var contractFlags = [];
        if (contract.no_trade_clause) contractFlags.push("NTC（不可交易条款）");
        if (contract.trade_kicker_pct) contractFlags.push("交易保证金" + contract.trade_kicker_pct + "%");
        if (contract.option_years && contract.option_years.length > 0) {
          contract.option_years.forEach(function(opt) {
            contractFlags.push((opt.type || "选项") + ": " + opt.season);
          });
        }
        if (contract.contract_notes && contract.contract_notes.length > 0) {
          contract.contract_notes.slice(0, 2).forEach(function(note) {
            contractFlags.push(note);
          });
        }
        if (contractFlags.length > 0) {
          desc += " [" + contractFlags.join("; ") + "]";
        }
      }
    }

    if (p.restricted) desc += ", untouchable=true";
    return desc;
  }

  function buildSuggestTradePrompt(team, partners, thresholds) {
    var taxStatus = getTaxStatusLabel(team);
    var apronLevel = getApronLevel(team, thresholds);

    var teamSection = "名称: " + team.name + "（" + team.shortName + "）\n" +
      "税线状态: " + taxStatus + "\n" +
      "土豪线级别: " + apronLevel + "\n" +
      "总薪资: " + fmtSalary(team.players.reduce(function (s, p) { return s + p.salary; }, 0)) + "\n" +
      "薪资空间: " + fmtSalary(team.capRoom) + "\n" +
      "阵容人数: " + team.players.length + "/15\n" +
      "需求: " + (Array.isArray(team.aiNeeds) ? team.aiNeeds.join("、") : (team.aiNeeds || "待分析"));

    var draftPicks = getTeamDraftPicks(team.id);
    if (draftPicks.length > 0) {
      teamSection += "\n可用选秀权: " + draftPicks.join("、");
    }

    var tpes = getTeamTPEs(team.name);
    if (tpes.length > 0) {
      var validTpes = tpes.filter(function(t) { return t.amount_remaining > 0; }).slice(0, 3);
      if (validTpes.length > 0) {
        teamSection += "\n可用TPE: " + validTpes.map(function(t) {
          return fmtSalary(t.amount_remaining) + "（到期: " + t.expires + ")";
        }).join("、");
      }
    }

    var corePlayers = team.players.filter(function (p) { return p.restricted || p.salary >= 30000000; });
    var tradablePlayers = team.players.filter(function (p) { return !p.restricted && p.salary < 30000000; });

    var coreSection = corePlayers.map(function (p) {
      return buildPlayerDescription(p, true);
    }).join("\n");

    var tradableSection = tradablePlayers.map(function (p) {
      return buildPlayerDescription(p, true);
    }).join("\n");

    var partnersSection = partners.map(function (partner) {
      var pTaxStatus = getTaxStatusLabel(partner);
      var pTradable = partner.players.filter(function (p) { return !p.restricted; });
      var pDraftPicks = getTeamDraftPicks(partner.id);
      var pTpes = getTeamTPEs(partner.name);

      var section = "### " + partner.name + "（" + partner.shortName + "）\n" +
        "税线状态: " + pTaxStatus + "\n" +
        "总薪资: " + fmtSalary(partner.players.reduce(function (s, p) { return s + p.salary; }, 0)) + "\n" +
        "薪资空间: " + fmtSalary(partner.capRoom) + "\n" +
        "需求: " + (Array.isArray(partner.aiNeeds) ? partner.aiNeeds.join("、") : (partner.aiNeeds || "到期合同、选秀权"));

      if (pDraftPicks.length > 0) {
        section += "\n可用选秀权: " + pDraftPicks.slice(0, 5).join("、");
      }

      if (pTpes.length > 0) {
        var pValidTpes = pTpes.filter(function(t) { return t.amount_remaining > 0; }).slice(0, 2);
        if (pValidTpes.length > 0) {
          section += "\n可用TPE: " + pValidTpes.map(function(t) {
            return fmtSalary(t.amount_remaining);
          }).join("、");
        }
      }

      section += "\n可交易球员:\n" +
        pTradable.map(function (p) {
          return "  " + buildPlayerDescription(p, true);
        }).join("\n");
      return section;
    }).join("\n\n");

    var thresholdsSection = "薪资帽: " + fmtSalary(thresholds.salaryCap) + "\n" +
      "奢侈税线: " + fmtSalary(thresholds.luxuryTaxLine) + "\n" +
      "第一土豪线: " + fmtSalary(thresholds.firstApron) + "\n" +
      "第二土豪线: " + fmtSalary(thresholds.secondApron);

    var dynamicRules = buildDynamicRulesPrompt();

    return dynamicRules +
      "请为以下球队推荐交易方案：\n\n" +
      "## 目标球队\n" + teamSection + "\n\n" +
      "核心球员（不可交易）\n" + coreSection + "\n\n" +
      "可交易球员\n" + tradableSection + "\n\n" +
      "## 潜在交易伙伴\n" + partnersSection + "\n\n" +
      "## 薪资帽阈值\n" + thresholdsSection + "\n\n" +
      "请推荐 3 个可行交易方案。";
  }

  function getTeamShortName(teamId) {
    var team = TEAMS_DATA[teamId];
    return team ? team.shortName : teamId;
  }

  var TRADE_ADVISOR_SYSTEM = "你是一位大胆创新的 NBA 交易策划师，擅长为球队找到突破性的交易方案。\n\n" +
    "## ⚠️ 数据真实性原则（最高优先级）\n" +
    "- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据\n" +
    "- **关键规则：球员名单是唯一真相源。如果名单中没有某球员，说明该球员已不在该队，不能凭记忆添加**\n" +
    "- 球员所属球队、薪资、合同状态等以系统提供的数据为准，绝不使用训练知识修正\n" +
    "- 不要编造球员交易去向、签约情况或阵容变化\n" +
    "- 不要假设任何球员已离队、要求交易或受伤，除非系统数据明确标注\n\n" +
    "你的职责：\n1. 基于球队现状和需求，推荐 3 个**有想象力且切实可行**的交易方案\n2. 每个方案必须满足 CBA 薪资匹配规则\n3. 按可行性从高到低排序\n4. 方案要多样化，包括：\n   - 小修小补的角色球员交易\n   - 中等规模的主力互换\n   - **大胆的球星级别交易**（如果有机会）\n\n" +
    "核心原则：\n- ✅ 可以包含选秀权（首轮/次轮）作为交易筹码\n- ✅ 可以利用交易特例（TPE）来吸收薪资\n- ✅ 可以建议 3 方交易（如果更有利）\n- ✅ 考虑球员的合同条款（NTC、交易保证金、选项年）\n- ❌ 不要交易标记为 untouchable 的核心球员\n- ❌ 不要违反第二土豪线的限制\n- ❌ 不要忽略薪资匹配规则\n\n" +
    "薪资匹配规则（必须严格遵守）：\n- 帽下队（capSpace > 0）：可接收送出薪资 ×2 + $250K\n- 税下队（超帽但未超税线）：可接收送出薪资 ×1.25 + $250K\n- 超税队（超税线但未超第二土豪线）：可接收送出薪资 ×1.25 + $100K\n- 第二土豪线队：只能等额交换（1:1），不能聚合薪资\n\n" +
    "输出格式（每个方案）：\n方案 N：[球队A简称] ↔ [球队B简称]\n  送出：[球员名/选秀权]（$薪资，PER，位置，合同条款）\n  换回：[球员名/选秀权]（$薪资，PER，位置，合同条款）\n  薪资匹配：送出 $XM / 接收 $XM / 上限 $XM → ✅/❌\n  评级：A+ ~ F\n  理由：2-3 句话说明为什么这笔交易对双方都有意义，包括战术层面和财务层面\n\n" +
    "输出要求：\n- 使用中文\n- 3 个方案之间用空行分隔\n- 薪资用百万美元简写（如 $52.6M）\n- 选秀权不计入薪资匹配（显示为 $0）\n- 如果使用了 TPE，要在薪资匹配中说明\n- 如果找不到 3 个合规方案，就输出能找到的，并说明限制\n- 可以使用 **加粗** 和 - 列表等基本格式，但不要使用 *** 或 --- 等分隔线\n- 控制在 800 字以内，理由要具体有深度";

  var SALARY_CAP_THRESHOLDS = {
    salaryCap: 154000000,
    luxuryTaxLine: 187950000,
    firstApron: 189070000,
    secondApron: 202070000
  };

  function callAPI(systemPrompt, userPrompt, onChunk, signal) {
    if (!checkLimit()) {
      return Promise.reject(new Error("今日 AI 分析次数已用完（" + DAILY_LIMIT + " 次/天），明天再来吧"));
    }

    var cacheKey = hashStr(systemPrompt + userPrompt);
    var cached = getCached(cacheKey);
    if (cached) {
      return Promise.resolve({ content: cached, fromCache: true });
    }

    var endpoint = getApiEndpoint();
    var useStream = !!onChunk;

    return fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: useStream,
        temperature: 0.7,
        max_tokens: 4096
      }),
      signal: signal
    }).then(function (response) {
      if (!response.ok) {
        return response.text().then(function (body) {
          throw new Error("请求失败: " + response.status);
        });
      }

      if (!useStream) {
        return response.text().then(function (text) {
          try {
            var data = JSON.parse(text);
            var content = '';
            if (data.content) {
              content = data.content;
            } else if (data.choices && data.choices[0] && data.choices[0].message) {
              content = data.choices[0].message.content || '';
            } else if (data.error) {
              throw new Error(data.error);
            }
            incrementUsage();
            setCache(cacheKey, content);
            if (onChunk) onChunk(content);
            return { content: content, fromCache: false };
          } catch (e) {
            if (e.message && !e.message.includes('JSON')) throw e;
            throw new Error("服务器返回了非预期响应，请稍后重试");
          }
        });
      }

      var reader = response.body.getReader();
      var decoder = new TextDecoder("utf-8");
      var fullContent = "";
      var reasoningChars = 0;
      var lastProgressUpdate = 0;
      var lineBuffer = "";

      function processLines(text) {
        var parts = text.split("\n");
        if (parts.length > 1) {
          parts[0] = lineBuffer + parts[0];
          lineBuffer = parts.pop();
        } else {
          lineBuffer += parts[0];
          return;
        }

        for (var i = 0; i < parts.length; i++) {
          var line = parts[i].trim();
          if (!line.startsWith("data: ")) continue;
          var data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            var parsed = JSON.parse(data);
            var choice = parsed.choices && parsed.choices[0];
            var delta = choice && choice.delta;
            if (delta) {
              var reasoning = delta.reasoning_content;
              var content = delta.content;
              if (reasoning) {
                reasoningChars += reasoning.length;
                if (!fullContent && onChunk) {
                  var now = Date.now();
                  if (now - lastProgressUpdate > 1000) {
                    var progress = "";
                    var dots = Math.floor(reasoningChars / 50) % 4;
                    for (var j = 0; j < dots; j++) progress += ".";
                    onChunk("\n🧠 思考中" + progress + " (已分析 " + Math.floor(reasoningChars / 100) + " 字)");
                    lastProgressUpdate = now;
                  }
                }
              }
              if (content) {
                if (!fullContent && onChunk) {
                  onChunk("\n\n✅ 分析完成！\n\n");
                }
                fullContent += content;
                onChunk(content);
              }
            }
          } catch (e) {}
        }
      }

      function read() {
        return reader.read().then(function (result) {
          if (result.done) {
            if (lineBuffer.trim()) {
              processLines("\n");
            }
            incrementUsage();
            setCache(cacheKey, fullContent);
            return { content: fullContent, fromCache: false };
          }

          var chunk = decoder.decode(result.value, { stream: true });
          processLines(chunk);

          return read();
        });
      }

      return read();
    });
  }

  function suggestTrade(teamId, partnerIds, onChunk, signal) {
    var team = TEAMS_DATA[teamId];
    if (!team) return Promise.reject(new Error("球队不存在: " + teamId));

    var partners = (partnerIds || []).map(function (id) { return TEAMS_DATA[id]; }).filter(Boolean);
    if (partners.length === 0) {
      var allOtherIds = Object.keys(TEAMS_DATA).filter(function (id) { return id !== teamId; });
      partners = allOtherIds.slice(0, 5).map(function (id) { return TEAMS_DATA[id]; });
    }

    return loadDataFiles().then(function() {
      var userPrompt = buildSuggestTradePrompt(team, partners, SALARY_CAP_THRESHOLDS);
      return callAPI(TRADE_ADVISOR_SYSTEM, userPrompt, onChunk, signal);
    });
  }

  function explainTrade(ruleResults, onChunk, signal) {
    if (state.moves.length === 0) {
      return Promise.reject(new Error("请先构建一笔交易"));
    }

    var firstTeamId = state.teams.length > 0 ? state.teams[0].id : null;
    if (!firstTeamId) return Promise.reject(new Error("没有选择球队"));

    var ownerMessage = buildTradeReviewMessage(state.teams, state.moves, ruleResults);
    return chatWithGM(firstTeamId, [], ownerMessage, onChunk, signal);
  }

  function buildTradeReviewMessage(teams, moves, ruleResults) {
    var tradeSummary = moves.map(function (m) {
      var toTeam = teams.find(function(t) { return t.id === m.to; });
      return m.player.name + "（" + fmtSalary(m.player.salary) + ", PER " + m.player.per + "）→ " + (toTeam ? toTeam.shortName : "?");
    }).join("\n");

    var teamBreakdown = teams.map(function (t) {
      var outSalary = 0, inSalary = 0;
      var outPlayers = [];
      var inPlayers = [];
      moves.forEach(function (m) {
        if (m.from === t.id) {
          outSalary += m.player.salary;
          outPlayers.push(m.player.name + "（" + fmtSalary(m.player.salary) + "）");
        }
        if (m.to === t.id) {
          inSalary += m.player.salary;
          inPlayers.push(m.player.name + "（" + fmtSalary(m.player.salary) + "）");
        }
      });
      var taxLabel = getTaxStatusLabel(t);
      return t.shortName + "（" + taxLabel + "）:\n" +
        "  送出: " + (outPlayers.length > 0 ? outPlayers.join("、") : "无") + "（合计 " + fmtSalary(outSalary) + "）\n" +
        "  换回: " + (inPlayers.length > 0 ? inPlayers.join("、") : "无") + "（合计 " + fmtSalary(inSalary) + "）";
    }).join("\n\n");

    var rulesSection = "";
    if (ruleResults && ruleResults.length > 0) {
      rulesSection = "\n\n规则校验结果:\n" + ruleResults.map(function (r) {
        var icon = r.level === "warn" ? "⚠" : (r.passed ? "✅" : "❌");
        return icon + " " + r.name + ": " + r.desc;
      }).join("\n");
    }

    return "老板我拟了一笔交易方向，你帮我落地：\n\n" +
      "交易概况:\n" + tradeSummary + "\n\n" +
      "各队详情:\n" + teamBreakdown + rulesSection + "\n\n" +
      "请帮我：1. 这个方向怎么落地成具体方案？2. 如果薪资不合规，怎么调整能合规？3. 战术上怎么让这笔交易更值？4. 有没有更好的搭配方式？";
  }

  var GM_CHAT_SYSTEM = "你是一位 NBA 球队的总经理（General Manager），正在与你的球队老板进行一对一的交易策略讨论。\n\n" +
    "## 你的角色与沟通风格\n" +
    "- 你是球队的篮球运营负责人，全权负责交易谈判和阵容构建\n" +
    "- **核心原则：Yes And。老板给方向，你接住并给出可行方案**\n" +
    "- 老板说\"把XX交易走\"，你的第一反应不是质疑\"为什么要交易他\"，而是\"好，我来找几个可行的交易方案\"\n" +
    "- 老板给的方向就是起点，你的工作是让它落地——找到合规的、对球队有利的具体方案\n" +
    "- 如果老板的方向确实有硬性障碍（如薪资规则不允许），不要否定方向，而是给出变通方案：\"这个方向没问题，但直接这样走不通，我们可以这样绕一下……\"\n" +
    "- 你可以补充老板没考虑到的角度，但目的是让方案更完善，不是推翻方向\n" +
    "- 展现总经理的执行力：老板拍板方向，你负责把方案摆到桌面上\n\n" +
    "## ⚠️ 数据准确性（最高优先级）\n" +
    "- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据，爬虫数据是唯一真相源\n" +
    "- 你必须且只能使用下方提供的「球队信息」「球员分层评估」「球队深度档案」中的数据\n" +
    "- **关键规则：球员名单是唯一真相源，球队档案可能过时。如果档案中提到某球员属于该球队，但球员名单中没有该球员，以球员名单为准——该球员已不在队中**\n" +
    "- 球员名单、薪资、PER、合同状态等一切数据，以提供的为准，绝不使用你自己的训练知识来补充或修正\n" +
    "- 如果提供的球员名单中没有某个球员，说明该球员已不在该球队，你不能凭记忆添加\n" +
    "- 如果提供的球员名单中有某个球员，即使与你的记忆不符，也必须以提供的数据为准\n" +
    "- 不要假设任何球员已离队、要求交易或受伤，除非系统数据明确标注\n" +
    "- 当被问到其他球队的球员时，如果你不确定该球员当前是否还在该队，明确说明你的信息可能过时，建议老板确认\n" +
    "- 绝不要编造球员交易去向、签约情况或阵容变化\n\n" +
    "## 你与老板的互动方式\n" +
    "- 老板给出方向（如\"我们要补强内线\"\"把XX送走\"）→ 你接住方向，给出 2-3 个可行方案\n" +
    "- 老板给出具体交易方案 → 你接住方案，评估可行性，如果需要调整就给出优化版本\n" +
    "- 老板问你的意见 → 诚实表达，但始终以\"我建议这样做\"收尾，而不是停留在\"这有问题\"\n" +
    "- 你的每条回复都应该包含**可执行的下一步**，而不是只分析问题\n\n" +
    "## 薪资匹配规则（必须遵守）\n" +
    "- 帽下队（有薪资空间）：可接收送出薪资 ×2 + $250K\n" +
    "- 税下队（超帽但未超税线）：可接收送出薪资 ×1.25 + $250K\n" +
    "- 超税队（超税线但未超第二土豪线）：可接收送出薪资 ×1.25 + $100K\n" +
    "- 第二土豪线队：只能等额交换（1:1），不能聚合薪资\n" +
    "- 第二土豪线额外限制：不能使用聚合特例、不能签买断球员、不能在交易中送出现金\n\n" +
    "## 交易方案输出格式（当老板要求提案时）\n" +
    "方案 N：[你的球队] ↔ [对方球队]\n" +
    "  送出：[球员名]（$薪资，PER，位置）\n" +
    "  换回：[球员名]（$薪资，PER，位置）\n" +
    "  薪资匹配：送出 $XM / 接收 $XM / 上限 $XM → ✅/❌\n" +
    "  评级：A+ ~ F\n" +
    "  理由：为什么这笔交易对双方都有意义\n\n" +
    "## 回复要求\n" +
    "- 使用中文\n" +
    "- 当提出交易方案时，薪资用百万美元简写（如 $52.6M）\n" +
    "- 如果老板没有要求提案，不要强行输出交易方案\n" +
    "- 回复长度根据问题复杂度灵活调整\n" +
    "- 展现总经理的执行力和专业度——自信、务实、永远有方案\n" +
    "- 不要使用 *** 或 --- 等分隔线，段落之间用空行分隔即可";

  var GM_CHAT_WELCOME = "老板好！阵容情况、薪资空间、选秀权储备我都摸清了。\n\n" +
    "您说方向，我来出方案。想补强哪个位置、送走谁、追求谁——直接说，我给您落地。";

  var TEAM_PROFILE_CACHE = {};
  var GENERAL_STRATEGY_CACHE = null;

  function loadGeneralStrategy() {
    if (GENERAL_STRATEGY_CACHE) {
      return Promise.resolve(GENERAL_STRATEGY_CACHE);
    }
    return fetch("data/team-profiles/00-通用交易策略.md")
      .then(function(resp) {
        if (!resp.ok) return "";
        return resp.text();
      })
      .then(function(text) {
        var lines = text.split("\n");
        var skipLines = ["# ", "> 最后更新：", "# NBA 交易底层通用策略"];
        var filtered = lines.filter(function(line) {
          var trimmed = line.trim();
          if (!trimmed) return false;
          for (var i = 0; i < skipLines.length; i++) {
            if (trimmed.startsWith(skipLines[i])) return false;
          }
          return true;
        });
        var strategy = filtered.join("\n").trim();
        GENERAL_STRATEGY_CACHE = strategy;
        return strategy;
      })
      .catch(function() {
        return "";
      });
  }

  function loadTeamProfile(teamId) {
    var abbr = teamId.toUpperCase();
    if (TEAM_PROFILE_CACHE[abbr]) {
      return Promise.resolve(TEAM_PROFILE_CACHE[abbr]);
    }
    return fetch("data/team-profiles/" + abbr + ".md")
      .then(function(resp) {
        if (!resp.ok) return "";
        return resp.text();
      })
      .then(function(text) {
        var lines = text.split("\n");
        var skipLines = ["# ", "> 最后更新：", "# 球队档案"];
        var filtered = lines.filter(function(line) {
          var trimmed = line.trim();
          if (!trimmed) return false;
          for (var i = 0; i < skipLines.length; i++) {
            if (trimmed.startsWith(skipLines[i])) return false;
          }
          return true;
        });
        var profile = filtered.join("\n").trim();
        TEAM_PROFILE_CACHE[abbr] = profile;
        return profile;
      })
      .catch(function() {
        return "";
      });
  }

  function detectMentionedTeams(message, currentTeamId) {
    var mentioned = [];
    var teamIds = Object.keys(TEAMS_DATA);
    for (var i = 0; i < teamIds.length; i++) {
      var tid = teamIds[i];
      if (tid === currentTeamId) continue;
      var t = TEAMS_DATA[tid];
      if (message.indexOf(t.name) !== -1 || message.indexOf(t.shortName) !== -1 || message.indexOf(tid.toUpperCase()) !== -1) {
        mentioned.push(tid);
      }
    }
    return mentioned;
  }

  function buildOtherTeamSummary(teamId) {
    var team = TEAMS_DATA[teamId];
    if (!team) return "";
    var totalSalary = team.players.reduce(function (s, p) { return s + p.salary; }, 0);
    var lines = [
      "### " + team.name + "（" + team.shortName + "）",
      "税线状态: " + getTaxStatusLabel(team),
      "总薪资: " + fmtSalary(totalSalary),
      "薪资空间: " + fmtSalary(team.capRoom),
      "球员名单:"
    ];
    for (var i = 0; i < team.players.length; i++) {
      var p = team.players[i];
      lines.push("  " + p.name + ": " + fmtSalary(p.salary) + ", PER " + p.per + ", " + p.yearsRemaining + "年");
    }
    return lines.join("\n");
  }

  function buildGMChatPrompt(team, generalStrategy, teamProfile, otherTeamsInfo, conversationHistory, ownerMessage) {
    var taxStatus = getTaxStatusLabel(team);
    var apronLevel = getApronLevel(team, SALARY_CAP_THRESHOLDS);
    var totalSalary = team.players.reduce(function (s, p) { return s + p.salary; }, 0);

    var teamInfo = "## 球队信息\n" +
      "球队: " + team.name + "（" + team.shortName + "）\n" +
      "税线状态: " + taxStatus + "\n" +
      "土豪线级别: " + apronLevel + "\n" +
      "总薪资: " + fmtSalary(totalSalary) + "\n" +
      "薪资空间: " + fmtSalary(team.capRoom) + "\n" +
      "阵容人数: " + team.players.length + "/15\n" +
      "需求: " + (Array.isArray(team.aiNeeds) ? team.aiNeeds.join("、") : "待分析");

    var draftPicks = getTeamDraftPicks(team.id);
    if (draftPicks.length > 0) {
      teamInfo += "\n可用选秀权: " + draftPicks.join("、");
    }

    var tpes = getTeamTPEs(team.name);
    if (tpes.length > 0) {
      var validTpes = tpes.filter(function(t) { return t.amount_remaining > 0; }).slice(0, 3);
      if (validTpes.length > 0) {
        teamInfo += "\n可用TPE: " + validTpes.map(function(t) {
          return fmtSalary(t.amount_remaining) + "（到期: " + t.expires + ")";
        }).join("、");
      }
    }

    var corePlayers = team.players.filter(function(p) { return evaluatePlayerTier(p).tier === 'core'; });
    var starterPlayers = team.players.filter(function(p) { return evaluatePlayerTier(p).tier === 'starter'; });
    var rotationPlayers = team.players.filter(function(p) { return evaluatePlayerTier(p).tier === 'rotation'; });
    var expiringPlayers = team.players.filter(function(p) { return evaluatePlayerTier(p).tier === 'expiring'; });
    var overpaidPlayers = team.players.filter(function(p) { return evaluatePlayerTier(p).tier === 'overpaid'; });
    var rolePlayers = team.players.filter(function(p) { return evaluatePlayerTier(p).tier === 'role'; });

    if (corePlayers.length > 0) {
      teamInfo += "\n\n🏆 建队核心（交易门槛极高，需要全明星级回报 + 高顺位选秀权才会考虑）:\n" +
        corePlayers.map(formatPlayerInfo).join("\n");
    }

    if (starterPlayers.length > 0) {
      teamInfo += "\n\n⭐ 优质首发（交易门槛中高，需要同级别球员或多个优质筹码组合）:\n" +
        starterPlayers.map(formatPlayerInfo).join("\n");
    }

    if (rotationPlayers.length > 0) {
      teamInfo += "\n\n🔄 轮换球员（报价合理即可讨论，寻求性价比交易）:\n" +
        rotationPlayers.map(formatPlayerInfo).join("\n");
    }

    if (expiringPlayers.length > 0) {
      teamInfo += "\n\n📅 到期合同（优质交易筹码，可用于释放空间或交易配平）:\n" +
        expiringPlayers.map(formatPlayerInfo).join("\n");
    }

    if (overpaidPlayers.length > 0) {
      teamInfo += "\n\n⚠️ 溢价合同（表现与薪资不匹配，愿意探讨交易方案，可能需要搭上选秀权）:\n" +
        overpaidPlayers.map(formatPlayerInfo).join("\n");
    }

    if (rolePlayers.length > 0) {
      teamInfo += "\n\n👥 角色球员（可交易资产，报价合理即可讨论）:\n" +
        rolePlayers.map(formatPlayerInfo).join("\n");
    }

    var salaryThresholds = "薪资帽 " + fmtSalary(SALARY_CAP_THRESHOLDS.salaryCap) +
      " / 税线 " + fmtSalary(SALARY_CAP_THRESHOLDS.luxuryTaxLine) +
      " / 第一土豪线 " + fmtSalary(SALARY_CAP_THRESHOLDS.firstApron) +
      " / 第二土豪线 " + fmtSalary(SALARY_CAP_THRESHOLDS.secondApron);

    var strategySection = "";
    if (generalStrategy && generalStrategy.length > 0) {
      strategySection = "\n\n## NBA 交易底层通用策略（所有球队通用）\n\n" + generalStrategy;
    }

    var profileSection = "";
    if (teamProfile && teamProfile.length > 0) {
      profileSection = "\n\n## 球队深度档案\n\n" + teamProfile;
    }

    var otherTeamsSection = "";
    if (otherTeamsInfo && otherTeamsInfo.length > 0) {
      otherTeamsSection = "\n\n## 老板提及的其他球队数据（供参考，回答时使用这些数据）\n\n" + otherTeamsInfo.join("\n\n");
    }

    var fullSystemPrompt = GM_CHAT_SYSTEM + "\n\n" + teamInfo + strategySection + profileSection + otherTeamsSection + "\n\n薪资帽阈值: " + salaryThresholds;

    var historyText = "";
    if (conversationHistory && conversationHistory.length > 0) {
      historyText = "## 对话历史\n" + conversationHistory.map(function (msg) {
        if (msg.role === "owner") return "老板：" + msg.content;
        return "总经理：" + msg.content;
      }).join("\n\n") + "\n\n";
    }

    var userPrompt = historyText + "## 老板的最新要求\n" + ownerMessage;

    return { systemPrompt: fullSystemPrompt, userPrompt: userPrompt };
  }

  function chatWithGM(teamId, conversationHistory, ownerMessage, onChunk, signal) {
    var team = TEAMS_DATA[teamId];
    if (!team) return Promise.reject(new Error("球队不存在: " + teamId));

    var mentionedTeamIds = detectMentionedTeams(ownerMessage, teamId);
    if (conversationHistory && conversationHistory.length > 0) {
      for (var h = 0; h < conversationHistory.length; h++) {
        var histMentioned = detectMentionedTeams(conversationHistory[h].content, teamId);
        for (var m = 0; m < histMentioned.length; m++) {
          if (mentionedTeamIds.indexOf(histMentioned[m]) === -1) {
            mentionedTeamIds.push(histMentioned[m]);
          }
        }
      }
    }

    var otherTeamsInfo = [];
    for (var i = 0; i < mentionedTeamIds.length; i++) {
      var summary = buildOtherTeamSummary(mentionedTeamIds[i]);
      if (summary) otherTeamsInfo.push(summary);
    }

    var profilePromises = mentionedTeamIds.map(function(tid) { return loadTeamProfile(tid); });

    return loadDataFiles().then(function() {
      return Promise.all([loadGeneralStrategy(), loadTeamProfile(teamId)].concat(profilePromises));
    }).then(function(results) {
      var generalStrategy = results[0];
      var teamProfile = results[1];
      var prompt = buildGMChatPrompt(team, generalStrategy, teamProfile, otherTeamsInfo, conversationHistory, ownerMessage);

      console.log("=== GM Chat 完整提示词 (DEBUG) ===");
      console.log("System Prompt:\n", prompt.systemPrompt);
      console.log("User Prompt:\n", prompt.userPrompt);
      console.log("=== 提示词结束 ===");

      return callAPI(prompt.systemPrompt, prompt.userPrompt, onChunk, signal);
    });
  }

  return {
    setApiKey: setApiKey,
    getApiKey: getApiKey,
    getRemaining: getRemaining,
    getDailyUsage: getDailyUsage,
    suggestTrade: suggestTrade,
    explainTrade: explainTrade,
    chatWithGM: chatWithGM,
    SALARY_CAP_THRESHOLDS: SALARY_CAP_THRESHOLDS
  };
})();
