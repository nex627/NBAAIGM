const fs = require('fs');
const path = require('path');

const DATA_JS_PATH = path.join(__dirname, 'js', 'data.js');
const PROFILES_DIR = path.join(__dirname, 'data', 'team-profiles');

console.log('='.repeat(60));
console.log('🔍 NBA 交易模拟器 - 数据一致性检查');
console.log('='.repeat(60));
console.log();

function loadDataJS() {
  const content = fs.readFileSync(DATA_JS_PATH, 'utf-8');
  const teamsMatch = content.match(/var TEAMS_DATA = (\{[\s\S]*?\n\});/);
  if (!teamsMatch) {
    throw new Error('无法从 data.js 中解析 TEAMS_DATA');
  }
  const teamsCode = teamsMatch[1];
  eval('var TEAMS_DATA = ' + teamsCode);
  return TEAMS_DATA;
}

function loadTeamProfile(teamId) {
  const profilePath = path.join(PROFILES_DIR, teamId.toUpperCase() + '.md');
  if (!fs.existsSync(profilePath)) {
    return null;
  }
  return fs.readFileSync(profilePath, 'utf-8');
}

function extractPlayersFromProfile(profile) {
  const players = [];
  
  const playerPattern = /- \*\*(.+?)\*\*：/g;
  let match;
  while ((match = playerPattern.exec(profile)) !== null) {
    players.push(match[1]);
  }
  
  const tradedPattern = /- \*\*(.+?)\*\*：.*?(?:已交易|已离队|已被裁|离队|加盟|签约)/g;
  const tradedPlayers = [];
  while ((match = tradedPattern.exec(profile)) !== null) {
    tradedPlayers.push(match[1]);
  }
  
  return { active: players, traded: tradedPlayers };
}

function normalizeName(name) {
  return name
    .replace(/[·\-]/g, '')
    .replace(/\s+/g, '')
    .replace(/^(扬尼斯|达米安|多诺万|埃文|詹姆斯|贾勒特|马克斯|丹尼斯|萨姆|杰隆|内匡|小克雷格|迈尔斯|凯尔|博比|AJ|小凯文|莱恩|小加里|加里)$/, '')
    .toLowerCase();
}

function checkTeamConsistency(teamId, dataJsPlayers, profile) {
  const issues = [];
  const profileData = extractPlayersFromProfile(profile);
  
  const dataJsNames = dataJsPlayers.map(p => p.name);
  const profileActiveNames = profileData.active;
  const profileTradedNames = profileData.traded;
  
  for (const dataJsName of dataJsNames) {
    const dataJsNormalized = normalizeName(dataJsName);
    
    const isInTraded = profileTradedNames.some(t => 
      normalizeName(t).includes(dataJsNormalized) || 
      dataJsNormalized.includes(normalizeName(t))
    );
    
    if (isInTraded) {
      issues.push({
        type: 'CRITICAL',
        message: `球员 "${dataJsName}" 在 data.js 中存在，但球队档案标记为已离队/已交易`
      });
      continue;
    }
    
    const isInActive = profileActiveNames.some(a => 
      normalizeName(a).includes(dataJsNormalized) || 
      dataJsNormalized.includes(normalizeName(a))
    );
    
    if (!isInActive && profileActiveNames.length > 0) {
      issues.push({
        type: 'WARNING',
        message: `球员 "${dataJsName}" 在 data.js 中存在，但球队档案中未列出为核心球员`
      });
    }
  }
  
  for (const tradedName of profileTradedNames) {
    const isStillInData = dataJsNames.some(n => 
      normalizeName(n).includes(normalizeName(tradedName)) ||
      normalizeName(tradedName).includes(normalizeName(n))
    );
    
    if (isStillInData) {
      issues.push({
        type: 'CRITICAL',
        message: `球员 "${tradedName}" 在球队档案中标记为已离队，但 data.js 中仍存在`
      });
    }
  }
  
  return issues;
}

function checkAbsoluteStatements(profile) {
  const absolutePatterns = [
    /非卖品/g,
    /不可交易/g,
    /绝对不/g,
    /绝不/g,
    /永远不/g,
    /不出售/g,
    /交易可能性为零/g,
    /几乎不可能交易/g
  ];
  
  const issues = [];
  
  for (const pattern of absolutePatterns) {
    const matches = profile.match(pattern);
    if (matches) {
      issues.push({
        type: 'WARNING',
        message: `检测到绝对化表述: "${matches[0]}" (出现 ${matches.length} 次)`
      });
    }
  }
  
  return issues;
}

function checkTradePreferenceSection(profile) {
  if (profile.includes('## 交易偏好') || profile.includes('## 7. 交易偏好')) {
    return [{
      type: 'WARNING',
      message: '检测到"交易偏好"章节，建议删除或弱化'
    }];
  }
  return [];
}

function main() {
  console.log('📁 加载 data.js...');
  const TEAMS_DATA = loadDataJS();
  console.log(`✅ 加载成功，共 ${Object.keys(TEAMS_DATA).length} 支球队`);
  console.log();
  
  let allIssues = [];
  let criticalCount = 0;
  let warningCount = 0;
  
  for (const teamId of Object.keys(TEAMS_DATA)) {
    const team = TEAMS_DATA[teamId];
    const profile = loadTeamProfile(teamId);
    
    console.log(`🏀 检查 ${team.name} (${teamId.toUpperCase()})...`);
    
    if (!profile) {
      console.log(`  ⚠️  未找到球队档案，跳过`);
      console.log();
      continue;
    }
    
    const teamIssues = [];
    
    const consistencyIssues = checkTeamConsistency(teamId, team.players, profile);
    teamIssues.push(...consistencyIssues);
    
    const absoluteIssues = checkAbsoluteStatements(profile);
    teamIssues.push(...absoluteIssues);
    
    const tradePrefIssues = checkTradePreferenceSection(profile);
    teamIssues.push(...tradePrefIssues);
    
    if (teamIssues.length === 0) {
      console.log(`  ✅ 无问题`);
    } else {
      for (const issue of teamIssues) {
        const icon = issue.type === 'CRITICAL' ? '🔴' : '🟡';
        console.log(`  ${icon} [${issue.type}] ${issue.message}`);
        if (issue.type === 'CRITICAL') criticalCount++;
        else warningCount++;
      }
      allIssues.push({ teamId, teamName: team.name, issues: teamIssues });
    }
    console.log();
  }
  
  console.log('='.repeat(60));
  console.log('📊 检查结果汇总');
  console.log('='.repeat(60));
  console.log(`🔴 严重问题 (CRITICAL): ${criticalCount} 个`);
  console.log(`🟡 警告问题 (WARNING): ${warningCount} 个`);
  console.log(`🏥 有问题的球队: ${allIssues.length} 支`);
  console.log();
  
  if (criticalCount > 0) {
    console.log('❌ 存在严重问题，需要立即修复！');
    console.log();
    console.log('严重问题列表：');
    for (const teamData of allIssues) {
      const criticalIssues = teamData.issues.filter(i => i.type === 'CRITICAL');
      if (criticalIssues.length > 0) {
        console.log(`\n  ${teamData.teamName}:`);
        for (const issue of criticalIssues) {
          console.log(`    🔴 ${issue.message}`);
        }
      }
    }
    process.exit(1);
  } else if (warningCount > 0) {
    console.log('⚠️  存在警告问题，建议检查');
    process.exit(0);
  } else {
    console.log('✅ 所有检查通过！');
    process.exit(0);
  }
}

main();
