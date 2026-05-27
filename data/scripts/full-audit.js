const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '..', 'team-profiles');
const PROTO_DIR = path.resolve(__dirname, '..', '..', 'prototype', 'data', 'team-profiles');
const DATA_JS = path.resolve(__dirname, '..', '..', 'prototype', 'js', 'data.js');
const OUTPUT_FILE = path.resolve(__dirname, 'full-audit-result.txt');

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

function extractGM(content) {
  const section3 = content.split('## 3.')[1];
  if (!section3) return null;
  const section3Text = section3.split('## 4.')[0];
  const boldMatch = section3Text.match(/\*\*([^*]*(?:总经理|GM|总裁|Morey|Morey|莫雷|斯通|琼斯|普雷斯蒂|弗兰克|扎尼克|康纳利|布思|迈尔斯|邓利维|韦弗|哈蒙德|施密特|霍斯特|罗萨斯|阿玛奇|皮特森|卡尔尼绍瓦斯|特拉扬|兰登|扎克·克莱曼|琼斯|威廉姆森|萨利赫|艾利|古布斯特|阿金索拉|图里亚夫)[^*]*)\*\*/);
  if (boldMatch) return boldMatch[1].trim();
  const lineMatch = section3Text.match(/\*\*([^*\n]{2,30})\*\*[（(]/);
  return lineMatch ? lineMatch[1].trim() : null;
}

function extractCoach(content) {
  const section5 = content.split('## 5.')[1];
  if (!section5) return null;
  const section5Text = section5.split('## 6.')[0];
  const boldMatch = section5Text.match(/\*\*([^*]*(?:教练|主帅|卢|纳斯|乌度卡|马祖拉|斯波尔斯特拉|卡尔|基德|威利·格林|比克斯塔夫|多诺万|芬奇|詹金斯|迈克·布朗|戴格诺特|马龙|波波维奇|奎因|莫斯利|博雷戈|克利福德|阿特金森|比卢普斯|威尔·哈迪|马特·迈尔斯|达科)[^*]*)\*\*/);
  if (boldMatch) return boldMatch[1].trim();
  const lineMatch = section5Text.match(/\*\*([^*\n]{2,30})\*\*[（(]/);
  return lineMatch ? lineMatch[1].trim() : null;
}

function extractOwner(content) {
  const section4 = content.split('## 4.')[1];
  if (!section4) return null;
  const section4Text = section4.split('## 5.')[0];
  const boldMatch = section4Text.match(/\*\*([^*]*(?:老板|主席|拥有者|鲍尔默|哈里斯|伊什比亚|费尔蒂塔|拉纳迪夫|本内特|格伦·泰勒|多兰|佩顿|克伦克|维维克|吉尔伯特|莱昂西斯|拉斯里|埃德尔森|丹·吉尔伯特|韦伯|约什|马特|蒂尔曼|史蒂夫|托德)[^*]*)\*\*/);
  if (boldMatch) return boldMatch[1].trim();
  const lineMatch = section4Text.match(/\*\*([^*\n]{2,30})\*\*[（(]/);
  return lineMatch ? lineMatch[1].trim() : null;
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

log('=== 球队档案全面核对 ===');
log('核对日期：2026-05-25');
log('');
log('核对维度：');
log('1. data/ 与 prototype/ 建队阶段是否一致');
log('2. 档案中核心球员是否在 data.js 阵容中');
log('3. data/ 与 prototype/ 总经理信息是否一致');
log('4. data/ 与 prototype/ 教练信息是否一致');
log('5. data/ 与 prototype/ 老板信息是否一致');
log('');

const results = {
  stageMismatch: [],
  protoPlayerMismatch: [],
  dataPlayerMismatch: [],
  gmMismatch: [],
  coachMismatch: [],
  ownerMismatch: [],
  gmInfo: [],
  coachInfo: [],
  ownerInfo: []
};

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

  const dataGM = extractGM(dataContent);
  const protoGM = extractGM(protoContent);
  results.gmInfo.push({ team: teamId.toUpperCase(), data: dataGM, proto: protoGM });
  if (dataGM && protoGM && dataGM !== protoGM) {
    results.gmMismatch.push({ team: teamId.toUpperCase(), data: dataGM, proto: protoGM });
  }

  const dataCoach = extractCoach(dataContent);
  const protoCoach = extractCoach(protoContent);
  results.coachInfo.push({ team: teamId.toUpperCase(), data: dataCoach, proto: protoCoach });
  if (dataCoach && protoCoach && dataCoach !== protoCoach) {
    results.coachMismatch.push({ team: teamId.toUpperCase(), data: dataCoach, proto: protoCoach });
  }

  const dataOwner = extractOwner(dataContent);
  const protoOwner = extractOwner(protoContent);
  results.ownerInfo.push({ team: teamId.toUpperCase(), data: dataOwner, proto: protoOwner });
  if (dataOwner && protoOwner && dataOwner !== protoOwner) {
    results.ownerMismatch.push({ team: teamId.toUpperCase(), data: dataOwner, proto: protoOwner });
  }
}

log('=== 一、建队阶段一致性 ===');
if (results.stageMismatch.length > 0) {
  log('🔴 不一致：');
  for (const r of results.stageMismatch) {
    log(`  ${r.team}: data="${r.data}" | proto="${r.proto}"`);
  }
} else {
  log('✅ 全部一致');
}
log('');

log('=== 二、核心球员与data.js阵容一致性 ===');
if (results.protoPlayerMismatch.length > 0) {
  log('🔴 prototype/ 档案提到但不在 data.js 阵容中的球员：');
  for (const r of results.protoPlayerMismatch) {
    log(`  ${r.team}: ${r.missing.join(', ')}`);
    log(`    当前阵容: ${r.roster.join(', ')}`);
  }
} else {
  log('✅ prototype/ 档案核心球员全部在阵容中');
}
log('');
if (results.dataPlayerMismatch.length > 0) {
  log('🟡 data/ 档案提到但不在 data.js 阵容中的球员：');
  for (const r of results.dataPlayerMismatch) {
    log(`  ${r.team}: ${r.missing.join(', ')}`);
    log(`    当前阵容: ${r.roster.join(', ')}`);
  }
} else {
  log('✅ data/ 档案核心球员全部在阵容中');
}
log('');

log('=== 三、总经理信息 ===');
if (results.gmMismatch.length > 0) {
  log('🔴 data/ 与 prototype/ 不一致：');
  for (const r of results.gmMismatch) {
    log(`  ${r.team}: data="${r.data}" | proto="${r.proto}"`);
  }
} else {
  log('✅ 两版本一致');
}
log('');
log('📋 全部总经理信息（需人工核对是否最新）：');
for (const r of results.gmInfo) {
  log(`  ${r.team}: ${r.data || '未提取到'}`);
}
log('');

log('=== 四、教练信息 ===');
if (results.coachMismatch.length > 0) {
  log('🔴 data/ 与 prototype/ 不一致：');
  for (const r of results.coachMismatch) {
    log(`  ${r.team}: data="${r.data}" | proto="${r.proto}"`);
  }
} else {
  log('✅ 两版本一致');
}
log('');
log('📋 全部教练信息（需人工核对是否最新）：');
for (const r of results.coachInfo) {
  log(`  ${r.team}: ${r.data || '未提取到'}`);
}
log('');

log('=== 五、老板信息 ===');
if (results.ownerMismatch.length > 0) {
  log('🔴 data/ 与 prototype/ 不一致：');
  for (const r of results.ownerMismatch) {
    log(`  ${r.team}: data="${r.data}" | proto="${r.proto}"`);
  }
} else {
  log('✅ 两版本一致');
}
log('');
log('📋 全部老板信息（需人工核对是否最新）：');
for (const r of results.ownerInfo) {
  log(`  ${r.team}: ${r.data || '未提取到'}`);
}
log('');

log('=== 六、汇总 ===');
const totalIssues = results.stageMismatch.length + results.protoPlayerMismatch.length + results.dataPlayerMismatch.length + results.gmMismatch.length + results.coachMismatch.length + results.ownerMismatch.length;
log(`共发现 ${totalIssues} 类不一致问题`);
log(`- 建队阶段不一致: ${results.stageMismatch.length}`);
log(`- prototype球员不一致: ${results.protoPlayerMismatch.length}`);
log(`- data球员不一致: ${results.dataPlayerMismatch.length}`);
log(`- 总经理不一致: ${results.gmMismatch.length}`);
log(`- 教练不一致: ${results.coachMismatch.length}`);
log(`- 老板不一致: ${results.ownerMismatch.length}`);
log('');
log('⚠️ 教练、总经理、老板信息需要通过搜索新闻人工核对是否最新');

const fullOutput = output.join('\n');
fs.writeFileSync(OUTPUT_FILE, fullOutput, 'utf-8');
console.log(fullOutput);
