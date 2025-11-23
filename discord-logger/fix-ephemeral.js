// fix-ephemeral.js
const fs = require('fs');
const path = require('path');

const mainFile = path.join(__dirname, 'logger.js');

if (fs.existsSync(mainFile)) {
  let content = fs.readFileSync(mainFile, 'utf8');
  
  // 替換所有 ephemeral: true 為 flags: MessageFlags.Ephemeral
  content = content.replace(/ephemeral:\s*true/g, 'flags: MessageFlags.Ephemeral');
  
  fs.writeFileSync(mainFile, content, 'utf8');
  console.log('✅ 已修復所有 ephemeral 警告');
} else {
  console.log('❌ 找不到主程式檔案');
}