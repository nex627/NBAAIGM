const fs = require('fs');
const path = require('path');

const profilesDir = 'd:/nexdev/nbatrade/prototype/data/team-profiles';

const files = fs.readdirSync(profilesDir)
  .filter(f => f.endsWith('.md') && f !== '00-通用交易策略.md' && f !== 'README.md');
  // 处理所有球队，包括之前已修复的，确保没有遗漏

console.log(`准备处理 ${files.length} 个球队档案文件...`);

files.forEach(file => {
  const filePath = path.join(profilesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 1. 删除"交易偏好"部分（从 ## 8. 交易偏好 或 ## 8. 交易偏好与倾向 到文件末尾）
  const tradePrefIndex = content.search(/^##\s*8\.\s*交易偏好/im);
  if (tradePrefIndex !== -1) {
    content = content.substring(0, tradePrefIndex).trim() + '\n';
    console.log(`  [${file}] 已删除交易偏好部分`);
  }
  
  // 2. 替换绝对化表述
  const replacements = [
    { from: /不可交易/g, to: '交易门槛极高' },
    { from: /非卖品/g, to: '核心资产（交易门槛极高）' },
    { from: /绝对不/g, to: '除非收到无法拒绝的报价，否则不' },
    { from: /绝对核心/g, to: '核心球员' },
    { from: /绝不/g, to: '除非筹码足够高，否则不' },
    { from: /不出售/g, to: '交易门槛极高' },
    { from: /一定不/g, to: '除非收到合理报价，否则不' },
    { from: /永远不/g, to: '除非战略调整，否则不' },
    { from: /❌ 绝对不做的规则：/g, to: '❌ 高门槛原则：' },
    { from: /（史蒂文斯的铁律）/g, to: '' },
    { from: /\(史蒂文斯的铁律\)/g, to: '' },
    { from: /交易可能性为零/g, to: '交易门槛极高' },
    { from: /几乎不可能交易/g, to: '交易门槛极高' },
    { from: /交易几乎不可能/g, to: '交易门槛极高' },
    { from: /交易可能性极低/g, to: '交易门槛极高' },
    { from: /——他是湖人图腾/g, to: '' },
    { from: /，球队图腾/g, to: '' }
  ];
  
  let changed = false;
  replacements.forEach(r => {
    if (r.from.test(content)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  });
  
  if (changed) {
    console.log(`  [${file}] 已替换绝对化表述`);
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
});

console.log('\n✅ 所有球队档案处理完成！');
