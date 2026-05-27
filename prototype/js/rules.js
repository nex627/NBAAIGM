function checkTrade() {
  if (state.teams.length < 2) return;

  var results = [];

  runSalaryCheck(results);
  runRosterCheck(results);

  var allPassed = results.every(function(r) { return r.passed !== false; });
  var hasWarn = results.some(function(r) { return r.level === 'warn'; });

  var icon = allPassed ? '<span class="material-symbols-outlined" style="font-size:20px;color:#22c55e;vertical-align:middle;">check_circle</span>' : '<span class="material-symbols-outlined" style="font-size:20px;color:#ef4444;vertical-align:middle;">cancel</span>';
  var title = allPassed ? (hasWarn ? '规则校验通过（有注意事项）' : '所有规则校验通过') : '规则校验未通过';
  var titleClass = allPassed ? (hasWarn ? 'warn' : 'pass') : 'fail';

  var html = '<div class="result-title" style="color:' + (titleClass === 'fail' ? 'var(--error)' : titleClass === 'warn' ? 'var(--tertiary)' : 'var(--primary)') + '">' + icon + ' ' + title + '</div>';

  results.forEach(function(r) {
    var iconEl = '';
    if (r.level === 'warn') iconEl = '<span class="material-symbols-outlined rule-icon warn" style="font-size:18px;color:var(--tertiary);">warning</span>';
    else if (r.passed) iconEl = '<span class="material-symbols-outlined rule-icon pass" style="font-size:18px;color:#22c55e;">check_circle</span>';
    else iconEl = '<span class="material-symbols-outlined rule-icon fail" style="font-size:18px;color:var(--error);">cancel</span>';

    html += '<div class="rule-item">' +
      iconEl +
      '<div class="rule-detail">' +
      '<span class="rule-name">' + r.name + '</span>' +
      '<div class="rule-desc">' + r.desc + '</div>' +
      '</div></div>';
  });

  document.getElementById('trade-result-modal-body').innerHTML = html;
  showModal('modal-trade-result');
}

function runSalaryCheck(results) {
  state.teams.forEach(function(team) {
    var outSalary = 0;
    var inSalary = 0;

    state.moves.forEach(function(m) {
      if (m.from === team.id) outSalary += m.player.salary;
      if (m.to === team.id) inSalary += m.player.salary;
    });

    if (outSalary === 0 && inSalary === 0) return;

    var maxIn = 0;
    if (outSalary > 0) {
      if (team.overTaxLine > 0) {
        maxIn = Math.floor(outSalary * 1.25 + 100000);
      } else if (team.capRoom >= 0) {
        maxIn = Math.floor(outSalary * 2 + 250000);
      } else {
        maxIn = Math.floor(outSalary * 1.5 + 250000);
      }
    }

    var pass = outSalary === 0 || inSalary <= maxIn;
    var taxLabel = team.overTaxLine > 0 ? '超税队' : (team.capRoom >= 0 ? '帽下队' : '税下队');
    var multLabel = team.overTaxLine > 0 ? '×1.25+$100K' : (team.capRoom >= 0 ? '×2+$250K' : '×1.5+$250K');

    results.push({
      name: team.shortName || team.name + ' · 薪资匹配',
      passed: pass,
      level: pass ? 'pass' : 'fail',
      desc: '送出 ' + fmt(outSalary) + ' → 获得 ' + fmt(inSalary) +
        ' | 可接收上限 ' + fmt(maxIn) + '（' + taxLabel + ' ' + multLabel + '）' +
        (pass ? '' : ' | 超出 ' + fmt(inSalary - maxIn))
    });
  });
}

function runRosterCheck(results) {
  state.teams.forEach(function(team) {
    var current = team.players.length;
    var out = getTeamPlayersOutgoingCount(team.id);
    var inCount = getTeamPlayersIncomingCount(team.id);
    var newCount = current - out + inCount;

    if (out === 0 && inCount === 0) return;

    var passed, desc;
    if (newCount === 0) {
      passed = false;
      desc = current + '人 → ' + newCount + '人（不能为0人）';
    } else if (newCount <= 15) {
      passed = true;
      desc = current + '人 → ' + newCount + '人（常规赛季上限15人）';
    } else if (newCount <= 20) {
      passed = true;
      desc = current + '人 → ' + newCount + '人（超15人，需在开赛前裁至15人；休赛期允许20人）';
    } else {
      passed = false;
      desc = current + '人 → ' + newCount + '人（超过20人上限，需调整交易方案）';
    }

    var level = !passed ? 'fail' : (newCount > 15 ? 'warn' : 'pass');

    results.push({
      name: (team.shortName || team.name) + ' · 阵容人数',
      passed: passed,
      level: level,
      desc: desc
    });
  });
}
