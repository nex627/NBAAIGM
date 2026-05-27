const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const PROTOTYPE_JS = path.resolve(__dirname, '..', '..', 'prototype', 'js', 'data.js');

const contracts = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'contracts.json'), 'utf8'));
const rules = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'rules.json'), 'utf8'));

const SEASON = '2026-27';
const SEASON_KEY = '2026_27';

const TEAM_META = {
  ATL: { fullName: '亚特兰大老鹰',   shortName: '老鹰',   conference: 'east', color: '#C8102E', accent: '#FDB927' },
  BOS: { fullName: '波士顿凯尔特人', shortName: '凯尔特人', conference: 'east', color: '#007A33', accent: '#BA9653' },
  BKN: { fullName: '布鲁克林篮网',   shortName: '篮网',   conference: 'east', color: '#000000', accent: '#FFFFFF' },
  CHA: { fullName: '夏洛特黄蜂',     shortName: '黄蜂',   conference: 'east', color: '#1D1160', accent: '#00788C' },
  CHI: { fullName: '芝加哥公牛',     shortName: '公牛',   conference: 'east', color: '#CE1141', accent: '#000000' },
  CLE: { fullName: '克利夫兰骑士',   shortName: '骑士',   conference: 'east', color: '#860038', accent: '#FDBB30' },
  DAL: { fullName: '达拉斯独行侠',   shortName: '独行侠', conference: 'west', color: '#00538C', accent: '#002B5E' },
  DEN: { fullName: '丹佛掘金',       shortName: '掘金',   conference: 'west', color: '#0E2240', accent: '#FEC524' },
  DET: { fullName: '底特律活塞',     shortName: '活塞',   conference: 'east', color: '#C8102E', accent: '#1D42BA' },
  GSW: { fullName: '金州勇士',       shortName: '勇士',   conference: 'west', color: '#1D428A', accent: '#FFC72C' },
  HOU: { fullName: '休斯顿火箭',     shortName: '火箭',   conference: 'west', color: '#CE1141', accent: '#C4CED4' },
  IND: { fullName: '印第安纳步行者', shortName: '步行者', conference: 'east', color: '#002D62', accent: '#FDBB30' },
  LAC: { fullName: '洛杉矶快船',     shortName: '快船',   conference: 'west', color: '#C8102E', accent: '#1D428A' },
  LAL: { fullName: '洛杉矶湖人',     shortName: '湖人',   conference: 'west', color: '#552583', accent: '#FDB927' },
  MEM: { fullName: '孟菲斯灰熊',     shortName: '灰熊',   conference: 'west', color: '#5D76A9', accent: '#12173F' },
  MIA: { fullName: '迈阿密热火',     shortName: '热火',   conference: 'east', color: '#98002E', accent: '#F9A01B' },
  MIL: { fullName: '密尔沃基雄鹿',   shortName: '雄鹿',   conference: 'east', color: '#00471B', accent: '#EEE1C6' },
  MIN: { fullName: '明尼苏达森林狼', shortName: '森林狼', conference: 'west', color: '#0C2340', accent: '#236192' },
  NOP: { fullName: '新奥尔良鹈鹕',   shortName: '鹈鹕',   conference: 'west', color: '#0C2340', accent: '#85714D' },
  NYK: { fullName: '纽约尼克斯',     shortName: '尼克斯', conference: 'east', color: '#006BB6', accent: '#F58426' },
  OKC: { fullName: '俄克拉荷马雷霆', shortName: '雷霆',   conference: 'west', color: '#007AC1', accent: '#EF3B24' },
  ORL: { fullName: '奥兰多魔术',     shortName: '魔术',   conference: 'east', color: '#0077C0', accent: '#C4CED4' },
  PHI: { fullName: '费城76人',       shortName: '76人',   conference: 'east', color: '#006BB6', accent: '#ED174C' },
  PHX: { fullName: '菲尼克斯太阳',   shortName: '太阳',   conference: 'west', color: '#1D1160', accent: '#E56020' },
  POR: { fullName: '波特兰开拓者',   shortName: '开拓者', conference: 'west', color: '#E03A3E', accent: '#000000' },
  SAC: { fullName: '萨克拉门托国王', shortName: '国王',   conference: 'west', color: '#5A2D81', accent: '#63727A' },
  SAS: { fullName: '圣安东尼奥马刺', shortName: '马刺',   conference: 'west', color: '#C4CED4', accent: '#000000' },
  TOR: { fullName: '多伦多猛龙',     shortName: '猛龙',   conference: 'east', color: '#CE1141', accent: '#000000' },
  UTA: { fullName: '犹他爵士',       shortName: '爵士',   conference: 'west', color: '#002B5C', accent: '#F9A01B' },
  WAS: { fullName: '华盛顿奇才',     shortName: '奇才',   conference: 'east', color: '#002B5C', accent: '#E31837' },
};

const TAX_LINE = rules.salary_cap_thresholds[SEASON_KEY].luxury_tax_line;
const SALARY_CAP = rules.salary_cap_thresholds[SEASON_KEY].salary_cap;

function getSalaryForSeason(contract, season) {
  var ys = contract.yearly_salary || [];
  var entry = ys.find(function(y) { return y.season === season; });
  return entry && entry.salary > 0 ? entry.salary : 0;
}

function getYearsRemaining(contract, season) {
  var ys = contract.yearly_salary || [];
  var remaining = 0;
  var found = false;
  for (var i = 0; i < ys.length; i++) {
    if (ys[i].season === season) found = true;
    if (found && ys[i].salary > 0) remaining++;
  }
  return remaining > 0 ? remaining : 1;
}

function estimatePER(salary) {
  if (salary <= 0) return 10;
  if (salary >= 50000000) return 18 + Math.random() * 5;
  if (salary >= 40000000) return 16 + Math.random() * 4;
  if (salary >= 30000000) return 14 + Math.random() * 4;
  if (salary >= 20000000) return 12 + Math.random() * 4;
  if (salary >= 10000000) return 10 + Math.random() * 4;
  return 8 + Math.random() * 4;
}

function estimateTax(top10TotalSalary) {
  var EST_FULL_TEAM = 15;
  var MIN_SALARY = 2000000;
  var estimatedFull = top10TotalSalary + (EST_FULL_TEAM - Math.min(10, EST_FULL_TEAM)) * MIN_SALARY;
  var over = estimatedFull - TAX_LINE;
  return over > 0 ? Math.round(over) : 0;
}

var playerIdCounter = 0;
function nextId(teamAbbr, name) {
  playerIdCounter++;
  return (teamAbbr + '-' + name.replace(/[^a-zA-Z]/g, '').substring(0, 8).toLowerCase() + '-' + playerIdCounter).toLowerCase();
}

var teamGroups = {};
contracts.players.forEach(function(c) {
  var salary = getSalaryForSeason(c, SEASON);
  if (salary <= 0) return;

  var team = c.team;
  if (!TEAM_META[team]) return;

  if (!teamGroups[team]) teamGroups[team] = [];
  teamGroups[team].push({
    contract: c,
    salary: salary,
    yearsRemaining: getYearsRemaining(c, SEASON),
    displayName: c.name_cn || c.name,
  });
});

var MAX_PLAYERS = 10;

var lines = [];
lines.push('var TEAMS_DATA = {');

var sortedTeams = Object.keys(teamGroups).sort();

sortedTeams.forEach(function(teamAbbr, teamIdx) {
  var meta = TEAM_META[teamAbbr];

  var teamPlayers = teamGroups[teamAbbr]
    .sort(function(a, b) { return b.salary - a.salary; })
    .slice(0, MAX_PLAYERS);

  var totalSalary = 0;
  teamPlayers.forEach(function(p) { totalSalary += p.salary; });

  var overTax = estimateTax(totalSalary);
  var capRoom = Math.round(SALARY_CAP - totalSalary - (15 - teamPlayers.length) * 2000000);

  lines.push('  ' + teamAbbr.toLowerCase() + ': {');
  lines.push('    id: \'' + teamAbbr.toLowerCase() + '\',');
  lines.push('    name: \'' + meta.fullName + '\',');
  lines.push('    shortName: \'' + meta.shortName + '\',');
  lines.push('    conference: \'' + meta.conference + '\',');
  lines.push('    color: \'' + meta.color + '\',');
  lines.push('    accent: \'' + meta.accent + '\',');
  lines.push('    overTaxLine: ' + Math.round(overTax) + ',');
  lines.push('    capRoom: ' + Math.round(capRoom) + ',');
  lines.push('    cashUsedThisSeason: 0,');
  lines.push('    maxCashAllowed: 3000000,');
  lines.push('    players: [');

  teamPlayers.forEach(function(p, idx) {
    var per = estimatePER(p.salary);
    var pid = nextId(teamAbbr, p.contract.name);
    var isLast = idx === teamPlayers.length - 1;

    var restriction = '';
    if (p.contract.no_trade_clause) {
      var notes = (p.contract.contract_notes || []).join(' ');
      var hasFullNTC = /full\s+no-?trade\s+clause/i.test(notes);
      var hasImplicitNTC = /implicit\s+no-?trade\s+clause/i.test(notes) && !/waived\s+implicit/i.test(notes);
      if (hasFullNTC || hasImplicitNTC) {
        restriction = ', restricted:true, restrictionType:\'ntc\'';
      }
    }

    lines.push('      { id:\'' + pid + '\', name:\'' + p.displayName.replace(/'/g, '\\\'') + '\', salary:' + p.salary + ', per:' + per.toFixed(1) + ', yearsRemaining:' + p.yearsRemaining + restriction + ' }' + (isLast ? '' : ','));
  });

  lines.push('    ]');
  lines.push('  }' + (teamAbbr === sortedTeams[sortedTeams.length - 1] ? '' : ','));
});

lines.push('};');
lines.push('');
lines.push('var TEAM_LIST = Object.values(TEAMS_DATA);');
lines.push('');
lines.push('var CONFERENCE_LABELS = { west: \'西部联盟\', east: \'东部联盟\' };');

var output = lines.join('\n');

fs.writeFileSync(PROTOTYPE_JS, output, 'utf8');

var totalTeams = sortedTeams.length;
var totalPlayers = 0;
Object.values(teamGroups).forEach(function(arr) { totalPlayers += Math.min(arr.length, MAX_PLAYERS); });

console.log('Generated data.js (' + SEASON + ' season)');
console.log('  Teams: ' + totalTeams);
console.log('  Players: ' + totalPlayers);
console.log('  Salary Cap: $' + (SALARY_CAP / 1e6).toFixed(1) + 'M');
console.log('  Tax Line: $' + (TAX_LINE / 1e6).toFixed(1) + 'M');
console.log('  Output: ' + PROTOTYPE_JS);
