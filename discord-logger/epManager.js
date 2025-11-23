// epManager.js
const fs = require('fs');
const path = require('path');
const epDataPath = path.join(__dirname, 'ep-data.json');

function loadData() {
  if (!fs.existsSync(epDataPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(epDataPath, 'utf8'));
  } catch (error) {
    console.error('讀取 EP 資料失敗:', error);
    return {};
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(epDataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('寫入 EP 資料失敗:', error);
  }
}

function addEP(userId, amount) {
  const data = loadData();
  if (!data[userId]) data[userId] = 0;
  data[userId] += amount;
  saveData(data);
  return data[userId];
}

function reduceEP(userId, amount) {
  const data = loadData();
  if (!data[userId]) data[userId] = 0;
  data[userId] = Math.max(0, data[userId] - amount);
  saveData(data);
  return data[userId];
}

function getEP(userId) {
  const data = loadData();
  return data[userId] || 0;
}

function parseRoleMentions(inputString) {
  const roleIdMatches = [...inputString.matchAll(/<@&?(\d+)>|(\d{17,20})/g)];
  return [...new Set(roleIdMatches.map(m => m[1] ?? m[2]))];
}

function formatRoleResults(added, failed, userTag, action = '新增') {
  const embed = {
    title: `📛 身分組${action}結果`,
    color: action === '新增' ? 0x22c55e : 0xf43f5e,
    fields: [
      {
        name: '👤 使用者',
        value: userTag,
        inline: false
      },
      {
        name: '✅ 成功的身分組',
        value: added.length ? added.map(r => `<@&${r}>`).join(', ') : '無',
        inline: false
      },
      {
        name: '❌ 失敗的身分組',
        value: failed.length ? failed.join(', ') : '無',
        inline: false
      }
    ],
    footer: {
      text: 'M.E.G 系統'
    },
    timestamp: new Date().toISOString()
  };
  return embed;
}

module.exports = {
  addEP,
  reduceEP,
  getEP,
  parseRoleMentions,
  formatRoleResults
};

