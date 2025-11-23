const fs = require('fs');
const path = './ep-data.json';

let epData = {};
if (fs.existsSync(path)) {
  try {
    epData = JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (err) {
    console.error('❌ 無法載入 EP 檔案：', err);
  }
}

function getAllEP() {
  return Object.entries(epData);
}

function getEP(userId) {
  return epData[userId] || 0;
}

function setEP(userId, amount) {
  epData[userId] = amount;
  save();
}

function addEP(userId, amount) {
  epData[userId] = (epData[userId] || 0) + amount;
  save();
  return epData[userId];
}

function reduceEP(userId, amount) {
  epData[userId] = Math.max((epData[userId] || 0) - amount, 0);
  save();
  return epData[userId];
}

function save() {
  fs.writeFileSync(path, JSON.stringify(epData, null, 2), 'utf8');
}

module.exports = {
  getAllEP,
  getEP,
  setEP,
  addEP,
  reduceEP,
};


