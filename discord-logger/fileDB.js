const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..', 'backend', 'data', 'guilds');
if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });
function getGuildFile(id){ return path.join(base, id + '.json'); }
function getGuild(id){ const file = getGuildFile(id); if(!fs.existsSync(file)) return null; return JSON.parse(fs.readFileSync(file,'utf8')); }
function saveGuild(data){ const file = getGuildFile(data.id); fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
module.exports = { getGuild, saveGuild };
