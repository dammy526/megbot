require("dotenv").config();
const axios = require("axios");

const API_BASE = process.env.WEBSITE_API;

async function getGuildConfig(guildId) {
    try {
        const res = await axios.get(`${API_BASE}/guilds/${guildId}`);
        return res.data;
    } catch (err) {
        console.error("API 取得設定失敗", err.response?.data || err);
        return null;
    }
}

async function updateGuildConfig(guildId, data) {
    try {
        const res = await axios.post(`${API_BASE}/guilds/${guildId}`, data);
        return res.data;
    } catch (err) {
        console.error("API 更新設定失敗", err.response?.data || err);
        return null;
    }
}

module.exports = { getGuildConfig, updateGuildConfig };

