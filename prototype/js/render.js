var activeTeamIndex = 0;

function isDesktop() {
  return window.innerWidth >= 1024;
}

function renderAll() {
  renderTradeBar();
  renderActiveTeamPanel();
}

window.addEventListener('resize', function() {
  renderActiveTeamPanel();
});

function renderTradeBar() {
  var container = document.getElementById('trade-bar-teams');
  var checkBtn = document.getElementById('btn-check-trade');

  var html = '';

  state.teams.forEach(function(team, idx) {
    var isActive = idx === activeTeamIndex;
    var outgoing = state.moves.filter(function(m) { return m.from === team.id; });
    var incoming = state.moves.filter(function(m) { return m.to === team.id; });
    var outSalary = outgoing.reduce(function(s, m) { return s + m.player.salary; }, 0);
    var inSalary = incoming.reduce(function(s, m) { return s + m.player.salary; }, 0);
    var hasMoves = outgoing.length + incoming.length > 0;

    var cls = 'trade-bar-team-card' + (isActive ? ' active' : '');

    html += '<div class="' + cls + '" onclick="switchTeamTab(' + idx + ')" style="' + (isActive ? 'border-color:' + team.color + ';' : '') + '">' +
      '<div class="trade-bar-card-head">' +
        '<span class="trade-bar-card-logo" style="background:' + team.color + ';">' + getShortName(team, 2) + '</span>' +
        '<span class="trade-bar-card-name">' + (team.shortName || team.name) + '</span>' +
        (isActive ? '<span class="trade-bar-card-remove" onclick="event.stopPropagation(); removeTeam(\'' + team.id + '\')" title="移除"><span class="material-symbols-outlined">close</span></span>' : '') +
      '</div>' +
      (hasMoves ?
        '<div class="trade-bar-card-info">' +
        (outgoing.length > 0 ? '<div class="trade-bar-row trade-bar-out"><span class="material-symbols-outlined">north_east</span><span>送出 ' + outgoing.length + '人 ' + fmt(outSalary) + '</span></div>' : '') +
        (incoming.length > 0 ? '<div class="trade-bar-row trade-bar-in"><span class="material-symbols-outlined">south_west</span><span>接收 ' + incoming.length + '人 ' + fmt(inSalary) + '</span></div>' : '') +
        '</div>'
      : '<div class="trade-bar-card-info trade-bar-card-empty">暂无交易</div>') +
      '</div>';
  });

  if (state.teams.length < MAX_TEAMS) {
    html += '<div class="trade-bar-team-card add-card" onclick="openTeamModal()">' +
      '<span class="material-symbols-outlined" style="font-size:24px;">add</span>' +
      '<span>添加球队</span>' +
      '</div>';
  }

  container.innerHTML = html;
  if (checkBtn) checkBtn.disabled = state.moves.length === 0 || state.teams.length < 2;
}

function switchTeamTab(idx) {
  activeTeamIndex = idx;
  renderTradeBar();
  if (!isDesktop()) {
    renderActiveTeamPanel();
  }
}

function renderActiveTeamPanel() {
  var container = document.getElementById('team-panel-container');

  if (state.teams.length === 0) {
    container.innerHTML = '<div class="panels-empty">' +
      '<span class="material-symbols-outlined" style="font-size:48px;color:var(--outline-variant);display:block;margin-bottom:12px;">swap_horiz</span>' +
      '请点击上方「+ 添加球队」开始构建交易</div>';
    return;
  }

  if (isDesktop()) {
    var allHtml = '<div class="panels-scroll multi-panel">';
    state.teams.forEach(function(team) {
      allHtml += renderTeamPanel(team);
    });
    allHtml += '</div>';
    container.innerHTML = allHtml;
  } else {
    var team = state.teams[activeTeamIndex] || state.teams[0];
    if (!team) {
      container.innerHTML = '';
      return;
    }
    container.innerHTML = renderTeamPanel(team);
  }

  attachPanelEvents();
}

function renderTeamPanel(team) {
  var outgoingIds = state.moves
    .filter(function(m) { return m.from === team.id; })
    .map(function(m) { return m.player.id; });

  var html = '<div class="team-panel" data-team-id="' + team.id + '">';

  html += '<div class="panel-letter-bg" aria-hidden="true">' + team.id.toUpperCase() + '</div>';

  html += '<div class="panel-head">' +
    '<div class="panel-logo" style="background:' + team.color + ';">' + getShortName(team, 2) + '</div>' +
    '<span class="panel-name">' + team.name + '</span>' +
    '<span class="panel-conf">' + (team.conference === 'west' ? 'WEST' : 'EAST') + '</span>' +
    '</div>';

  html += '<div class="panel-finance">' +
    '<div><span class="fin-label">超税线</span><br><span class="fin-val ' + (team.overTaxLine > 0 ? 'danger' : 'success') + '">' + fmt(team.overTaxLine) + '</span></div>' +
    '<div><span class="fin-label">薪资空间</span><br><span class="fin-val ' + (team.capRoom >= 0 ? 'success' : 'danger') + '">' + fmt(team.capRoom) + '</span></div>' +
    '</div>';

  html += '<div class="player-list-header">' +
    '<span class="plh-name">球员</span>' +
    '<span class="plh-salary">薪资</span>' +
    '<span class="plh-per">PER</span>' +
    '<span class="plh-action"></span>' +
    '</div>';

  html += '<div class="player-list">';

  team.players.forEach(function(p) {
    var isOut = outgoingIds.indexOf(p.id) !== -1;
    var isInMove = state.moves.some(function(m) { return m.player.id === p.id; });
    var isInFromOther = isInMove && !isOut;

    var cls = '';
    if (isOut) cls = ' selected';
    else if (isInFromOther) cls = ' restricted';
    else if (p.restricted) cls = ' restricted';

    var pos = (typeof getPlayerPosition === 'function') ? getPlayerPosition(p.id) : null;
    var posLabel = pos ? (pos + ' / ' + team.id.toUpperCase()) : team.id.toUpperCase();

    html += '<div class="player-row' + cls + '" data-player-id="' + p.id + '" data-team-id="' + team.id + '">' +
      '<div class="player-avatar">' + p.name.charAt(0) + '</div>' +
      '<div class="player-info">' +
        '<span class="player-name">' + p.name + '</span>' +
        '<span class="player-position">' + posLabel + '</span>' +
      '</div>' +
      (p.restricted ? '<span class="material-symbols-outlined lock-icon" style="font-size:12px;color:var(--tertiary);">lock</span>' : '') +
      '<span class="player-salary">' + fmt(p.salary) + '</span>' +
      '<span class="player-per">' + p.per.toFixed(1) + '</span>' +
      '<span class="player-action">' + (isOut ? '<span class="material-symbols-outlined checked" style="font-size:16px;">check_circle</span>' : (isInFromOther ? '<span class="material-symbols-outlined arrow" style="font-size:14px;">fiber_manual_record</span>' : '<span class="material-symbols-outlined arrow" style="font-size:14px;">east</span>')) + '</span>' +
      '</div>';
  });

  html += '</div></div>';
  return html;
}

function attachPanelEvents() {
  document.querySelectorAll('.player-row').forEach(function(row) {
    row.removeEventListener('click', handlePlayerClick);
    row.addEventListener('click', handlePlayerClick);
  });
}

function handlePlayerClick(e) {
  var row = e.currentTarget;
  var playerId = row.getAttribute('data-player-id');
  var teamId = row.getAttribute('data-team-id');
  var team = TEAMS_DATA[teamId];
  var player = team.players.find(function(p) { return p.id === playerId; });

  if (!player) return;

  if (isPlayerInTrade(playerId)) {
    removeMove(playerId);
    return;
  }

  if (state.teams.length < 2) {
    showToast('请先添加至少 2 支球队', 'warn');
    return;
  }

  if (state.teams.length === 2) {
    var destTeam = state.teams.find(function(t) { return t.id !== teamId; });
    if (destTeam) {
      addMove(player, teamId, destTeam.id);
      return;
    }
  }

  openDestinationModal(player, teamId);
}

function renderCheckButton() {
}

function updateResultVisibility() {
}

function openTeamModal() {
  var modal = document.getElementById('modal-team');
  var body = document.getElementById('modal-team-body');
  var selectedIds = state.teams.map(function(t) { return t.id; });

  var westTeams = TEAM_LIST.filter(function(t) { return t.conference === 'west'; });
  var eastTeams = TEAM_LIST.filter(function(t) { return t.conference === 'east'; });

  var html = '<div class="modal-team-intro">选择一支球队开始交易模拟</div>';

  html += '<div class="modal-conf-section">';
  html += '<div class="modal-conf-title conf-east"><span class="material-symbols-outlined" style="font-size:16px;">public</span> 东部联盟 · EASTERN</div>';
  html += '<div class="modal-team-grid">';
  eastTeams.forEach(function(t) {
    var isSelected = selectedIds.indexOf(t.id) !== -1;
    var isFull = state.teams.length >= MAX_TEAMS;
    html += renderTeamCard(t, isSelected, isFull);
  });
  html += '</div></div>';

  html += '<div class="modal-conf-section">';
  html += '<div class="modal-conf-title conf-west"><span class="material-symbols-outlined" style="font-size:16px;">public</span> 西部联盟 · WESTERN</div>';
  html += '<div class="modal-team-grid">';
  westTeams.forEach(function(t) {
    var isSelected = selectedIds.indexOf(t.id) !== -1;
    var isFull = state.teams.length >= MAX_TEAMS;
    html += renderTeamCard(t, isSelected, isFull);
  });
  html += '</div></div>';

  body.innerHTML = html;

  body.querySelectorAll('.modal-team-card').forEach(function(card) {
    card.addEventListener('click', function() {
      var tid = this.getAttribute('data-team-id');
      if (this.classList.contains('selected') || this.classList.contains('disabled')) return;
      addTeam(tid);
      hideModal('modal-team');
    });
  });

  showModal('modal-team');
}

function renderTeamCard(team, isSelected, isFull) {
  var city = team.name.replace(team.shortName, '').trim();
  var cls = 'modal-team-card';
  if (isSelected) cls += ' selected';
  if (isFull && !isSelected) cls += ' disabled';

  return '<div class="' + cls + '" data-team-id="' + team.id + '" role="button" tabindex="0">' +
    '<div class="modal-card-letter-bg" aria-hidden="true">' + team.id.toUpperCase() + '</div>' +
    '<div class="modal-card-left">' +
      '<div class="modal-card-logo" style="background:' + team.color + ';">' +
        '<span>' + team.id.toUpperCase().substring(0, 2) + '</span>' +
      '</div>' +
      '<div class="modal-card-info">' +
        '<div class="modal-card-city">' + team.shortName + '</div>' +
        '<div class="modal-card-name">' + city + '</div>' +
      '</div>' +
    '</div>' +
    '<button class="modal-card-trade-btn' + (isSelected ? ' is-selected' : '') + '"' +
      ' type="button">' +
      (isSelected
        ? '<span class="material-symbols-outlined" style="font-size:16px;">check_circle</span> 已选'
        : '<span class="material-symbols-outlined" style="font-size:16px;">swap_horiz</span> Trade') +
    '</button>' +
  '</div>';
}

function openDestinationModal(player, fromTeamId) {
  var modal = document.getElementById('modal-dest');
  var body = document.getElementById('modal-dest-body');
  var title = document.getElementById('modal-dest-title');

  title.textContent = '将 ' + player.name + ' 送至';

  var html = '<div class="dest-player-info">' +
    '<span style="color:var(--on-surface-variant);">来自 </span>' +
    '<b>' + getShortName(TEAMS_DATA[fromTeamId], 6) + '</b>' +
    '<span style="color:var(--on-surface-variant);"> · ' + fmt(player.salary) + '</span>' +
    (player.restricted ? ' <span style="color:var(--tertiary);font-size:11px;"><span class="material-symbols-outlined" style="font-size:12px;vertical-align:middle;">lock</span> ' + restrictionLabel(player.restrictionType) + '</span>' : '') +
    '</div>';

  html += '<div class="modal-section-title">选择目标球队</div>';

  state.teams.forEach(function(t) {
    if (t.id === fromTeamId) return;
    html += '<div class="modal-team-row" data-team-id="' + t.id + '" role="button" tabindex="0">' +
      '<div class="modal-team-logo" style="background:' + t.color + ';">' + getShortName(t, 2) + '</div>' +
      '<span class="modal-team-name">' + t.name + '</span>' +
      '<span class="material-symbols-outlined" style="margin-left:auto;font-size:16px;color:var(--outline-variant);">east</span>' +
      '</div>';
  });

  body.innerHTML = html;

  body.querySelectorAll('.modal-team-row').forEach(function(row) {
    row.addEventListener('click', function() {
      var toTeamId = this.getAttribute('data-team-id');
      addMove(player, fromTeamId, toTeamId);
      hideModal('modal-dest');
    });
  });

  showModal('modal-dest');
}
