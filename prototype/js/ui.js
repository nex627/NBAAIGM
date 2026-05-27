function fmt(num) {
  if (num >= 1000000) return '$' + (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return '$' + (num / 1000).toFixed(0) + 'K';
  return '$' + num;
}

function fmtFull(num) {
  return '$' + num.toLocaleString('en-US');
}

function showToast(msg, type) {
  type = type || 'info';
  var container = document.getElementById('toast-container');
  var el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(function() {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(function() { el.remove(); }, 300);
  }, 2500);
}

function showModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('active');
  el.setAttribute('aria-hidden', 'false');
}

function hideModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  el.setAttribute('aria-hidden', 'true');
}

function hideAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(function(m) { hideModal(m.id); });
}

function restrictionLabel(type) {
  var map = { ntc: '交易否决权', poison_pill: '毒丸条款（薪资匹配取均值）', recently_signed: '近期签约限制', trade_kicker: '交易保证金' };
  return map[type] || '交易限制';
}

function getShortName(team, maxLen) {
  maxLen = maxLen || 4;
  if (team.shortName && team.shortName.length <= maxLen) return team.shortName;
  return team.name.substring(0, maxLen);
}

function modalTeamRow(team, onClick, disabled) {
  return '<div class="modal-team-row' + (disabled ? ' disabled' : '') + '" data-team-id="' + team.id + '" role="button" tabindex="0">' +
    '<div class="modal-team-logo" style="background:' + team.color + ';">' + getShortName(team, 2) + '</div>' +
    '<span class="modal-team-name">' + team.name + '</span>' +
    '</div>';
}