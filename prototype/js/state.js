var state = {
  teams: [],
  moves: []
};

var MAX_TEAMS = 4;

function addTeam(teamId) {
  var team = TEAMS_DATA[teamId];
  if (!team) { showToast('球队数据不存在', 'error'); return false; }
  if (state.teams.length >= MAX_TEAMS) { showToast('最多选择 ' + MAX_TEAMS + ' 支球队', 'warn'); return false; }
  if (state.teams.some(function(t) { return t.id === teamId; })) { showToast('该球队已选择', 'warn'); return false; }

  state.teams.push(team);
  clearMovesInvolving(teamId);
  renderAll();
  showToast('已添加 ' + team.name, 'success');
  return true;
}

function removeTeam(teamId) {
  var idx = state.teams.findIndex(function(t) { return t.id === teamId; });
  if (idx === -1) return;
  var name = state.teams[idx].name;
  state.teams.splice(idx, 1);
  state.moves = state.moves.filter(function(m) { return m.from !== teamId && m.to !== teamId; });
  if (typeof activeTeamIndex !== 'undefined') {
    if (state.teams.length === 0) {
      activeTeamIndex = 0;
    } else if (activeTeamIndex >= state.teams.length) {
      activeTeamIndex = state.teams.length - 1;
    } else if (idx < activeTeamIndex) {
      activeTeamIndex--;
    }
  }
  renderAll();
  showToast('已移除 ' + name, 'info');
}

function addMove(player, fromTeamId, toTeamId) {
  if (player.restricted) {
    showToast(player.name + ' — ' + restrictionLabel(player.restrictionType) + '（提示，不阻止交易）', 'warn');
  }

  var dup = state.moves.find(function(m) { return m.player.id === player.id; });
  if (dup) {
    showToast(player.name + ' 已在交易中', 'warn');
    return;
  }

  state.moves.push({ player: player, from: fromTeamId, to: toTeamId });
  renderAll();
  showToast(player.name + ' → ' + getTeamShort(toTeamId), 'success');
}

function removeMove(playerId) {
  var idx = state.moves.findIndex(function(m) { return m.player.id === playerId; });
  if (idx === -1) return;
  var m = state.moves[idx];
  state.moves.splice(idx, 1);
  renderAll();
  showToast('已移除 ' + m.player.name, 'info');
}

function clearMovesInvolving(teamId) {
  state.moves = state.moves.filter(function(m) { return m.from !== teamId && m.to !== teamId; });
}

function isPlayerInTrade(playerId) {
  return state.moves.some(function(m) { return m.player.id === playerId; });
}

function getMovesForTeam(teamId, direction) {
  return state.moves.filter(function(m) {
    return direction === 'out' ? m.from === teamId : m.to === teamId;
  });
}

function getTeamPlayersInTrade(teamId) {
  return state.moves.filter(function(m) { return m.from === teamId; }).map(function(m) { return m.player; });
}

function getTeamPlayersOutgoingCount(teamId) {
  return state.moves.filter(function(m) { return m.from === teamId; }).length;
}

function getTeamPlayersIncomingCount(teamId) {
  return state.moves.filter(function(m) { return m.to === teamId; }).length;
}

function hasTeam(teamId) {
  return state.teams.some(function(t) { return t.id === teamId; });
}

function getTeamShort(teamId) {
  var t = state.teams.find(function(t2) { return t2.id === teamId; });
  return t ? getShortName(t, 4) : teamId;
}

function resetAll() {
  state.teams = [];
  state.moves = [];
  renderAll();
  showToast('已重置全部', 'info');
}