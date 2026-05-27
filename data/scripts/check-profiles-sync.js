const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'team-profiles');
const PROTO_DIR = path.resolve(__dirname, '..', '..', 'prototype', 'data', 'team-profiles');
const DATA_JS = path.resolve(__dirname, '..', '..', 'prototype', 'js', 'data.js');
const OUTPUT_FILE = path.resolve(__dirname, 'check-result.txt');

let dataJsContent = fs.readFileSync(DATA_JS, 'utf-8');
dataJsContent = dataJsContent.replace(/^var TEAMS_DATA = /, 'const TEAMS_DATA = ');
const closingBrace = dataJsContent.indexOf('\n};');
if (closingBrace > -1) {
  dataJsContent = dataJsContent.substring(0, closingBrace + 3);
}
const tmpPath = path.join(__dirname, '_tmp_data.js');
fs.writeFileSync(tmpPath, dataJsContent + '\nmodule.exports = TEAMS_DATA;\n', 'utf-8');
const TEAMS_DATA = require(tmpPath);
fs.unlinkSync(tmpPath);

const output = [];

function log(s) { output.push(s); }

function extractStage(content) {
  const m = content.match(/\*\*([^*]+)\*\*。/);
  return m ? m[1] : null;
}

function extractPlayers(content) {
  const section2 = content.split('## 2.')[1];
  if (!section2) return [];
  const section2Text = section2.split('## 3.')[0];
  const matches = [...section2Text.matchAll(/^- \*\*([^*]+)\*\*[：:]/gm)];
  return matches.map(m => m[1].trim()).filter(n => n.length > 1 && n.length < 20);
}

function normalize(name) {
  return name.replace(/[·\-・\s]/g, '').replace(/二世$/, '').replace(/Jr\.?$/, '').replace(/ Jr$/, '');
}

function findMatch(playerName, rosterNames) {
  const pn = normalize(playerName);
  return rosterNames.some(rn => {
    const rnN = normalize(rn);
    return rnN.includes(pn) || pn.includes(rnN);
  });
}

const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.md')).sort();
let hasIssues = false;

log('=== 球队档案一致性检查 ===');
log('');
log('检查项目：');
log('1. data/ 与 prototype/ 建队阶段是否一致');
log('2. prototype/ 档案中提到的核心球员是否在 data.js 阵容中');
log('3. data/ 档案中提到的核心球员是否在 data.js 阵容中');
log('');

const results = { stageMismatch: [], protoPlayerMismatch: [], dataPlayerMismatch: [] };

for (const f of files) {
  const teamId = f.replace('.md', '').toLowerCase();
  const dataContent = fs.readFileSync(path.join(DATA_DIR, f), 'utf-8');
  const protoPath = path.join(PROTO_DIR, f);
  const protoContent = fs.readFileSync(protoPath, 'utf-8');

  const dataStage = extractStage(dataContent);
  const protoStage = extractStage(protoContent);

  if (dataStage !== protoStage) {
    results.stageMismatch.push({ team: teamId.toUpperCase(), data: dataStage, proto: protoStage });
  }

  const teamData = TEAMS_DATA[teamId];
  if (!teamData) continue;
  const rosterNames = teamData.players.map(p => p.name);

  const protoPlayers = extractPlayers(protoContent);
  const protoMissing = protoPlayers.filter(pp => !findMatch(pp, rosterNames));
  if (protoMissing.length > 0) {
    results.protoPlayerMismatch.push({ team: teamId.toUpperCase(), missing: protoMissing, roster: rosterNames.slice(0, 5) });
  }

  const dataPlayers = extractPlayers(dataContent);
  const dataMissing = dataPlayers.filter(dp => !findMatch(dp, rosterNames));
  if (dataMissing.length > 0) {
    results.dataPlayerMismatch.push({ team: teamId.toUpperCase(), missing: dataMissing, roster: rosterNames.slice(0, 5) });
  }
}

if (results.stageMismatch.length > 0) {
  log('🔴 建队阶段不一致（data/ vs prototype/）：');
  for (const r of results.stageMismatch) {
    log(`  ${r.team}: data="${r.data}" | proto="${r.proto}"`);
  }
  log('');
  hasIssues = true;
} else {
  log('✅ 建队阶段全部一致\n');
}

if (results.protoPlayerMismatch.length > 0) {
  log('🔴 prototype/ 档案中提到但不在 data.js 阵容中的球员：');
  for (const r of results.protoPlayerMismatch) {
    log(`  ${r.team}: ${r.missing.join(', ')}`);
    log(`    当前阵容前5: ${r.roster.join(', ')}`);
  }
  log('');
  hasIssues = true;
} else {
  log('✅ prototype/ 档案核心球员全部在阵容中\n');
}

if (results.dataPlayerMismatch.length > 0) {
  log('🟡 data/ 档案中提到但不在 data.js 阵容中的球员：');
  for (const r of results.dataPlayerMismatch) {
    log(`  ${r.team}: ${r.missing.join(', ')}`);
    log(`    当前阵容前5: ${r.roster.join(', ')}`);
  }
  log('');
  hasIssues = true;
} else {
  log('✅ data/ 档案核心球员全部在阵容中\n');
}

if (!hasIssues) {
  log('🎉 所有检查通过，数据一致！');
} else {
  log('⚠️ 发现不一致，请修复后再运行此脚本验证。');
}

const fullOutput = output.join('\n');
fs.writeFileSync(OUTPUT_FILE, fullOutput, 'utf-8');
console.log(fullOutput);
process.exit(hasIssues ? 1 : 0);
