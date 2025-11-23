require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.WEB_PORT || 3000;

// 延遲導入 Bot 功能，確保 Bot 先啟動
let botFunctions = null;
let isBotReady = false;

// 中間件
app.use(express.json());
app.use(express.static('public'));

// 簡單的 API 金鑰驗證
const API_KEY = process.env.DASHBOARD_KEY || 'MEG_PRIVATE_KEY_2024';

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader === `Bearer ${API_KEY}`) {
        next();
    } else {
        res.status(401).json({ error: '未授權' });
    }
}

// 初始化 Bot 功能連接
function initializeBotFunctions() {
    try {
        botFunctions = require('./logger.js');
        isBotReady = botFunctions.client && botFunctions.client.isReady();
        console.log(`🤖 Bot 連接狀態: ${isBotReady ? '已連接' : '連接中...'}`);
        return true;
    } catch (error) {
        console.log('❌ 無法連接 Bot 功能:', error.message);
        return false;
    }
}

// 檢查 Bot 是否就緒的中間件
function checkBotReady(req, res, next) {
    if (!isBotReady) {
        // 嘗試重新初始化
        if (!initializeBotFunctions()) {
            return res.status(503).json({ 
                error: 'Bot 未就緒', 
                message: '請等待 Bot 完全啟動後再試' 
            });
        }
    }
    next();
}

// ==================== API 路由 ====================

// 獲取 Bot 狀態
app.get('/api/status', (req, res) => {
    try {
        if (!isBotReady || !botFunctions) {
            return res.json({
                status: 'offline',
                message: 'Bot 啟動中...',
                uptime: 0,
                guilds: 0,
                users: 0,
                commands: 0,
                enabledCommands: 0
            });
        }

        const stats = botFunctions.getBotStats ? botFunctions.getBotStats() : {
            status: botFunctions.client.isReady() ? 'online' : 'offline',
            uptime: botFunctions.client.uptime || 0,
            guilds: botFunctions.client.guilds?.cache.size || 0,
            users: botFunctions.client.users?.cache.size || 0,
            channels: botFunctions.client.channels?.cache.size || 0,
            commands: 25, // 預設值
            enabledCommands: 25
        };
        
        res.json(stats);
    } catch (error) {
        res.json({
            status: 'error',
            message: error.message,
            uptime: 0,
            guilds: 0,
            users: 0,
            commands: 0,
            enabledCommands: 0
        });
    }
});

// 獲取所有設定
app.get('/api/settings', authenticate, checkBotReady, (req, res) => {
    try {
        const settings = botFunctions.getBotSettings();
        res.json(settings);
    } catch (error) {
        // 如果獲取設定失敗，返回預設設定
        res.json(getDefaultSettings());
    }
});

// 更新設定
app.post('/api/settings', authenticate, checkBotReady, (req, res) => {
    try {
        const newSettings = req.body;
        const updatedSettings = botFunctions.updateBotSettings(newSettings);
        res.json({ 
            message: '設定更新成功', 
            settings: updatedSettings 
        });
    } catch (error) {
        res.status(500).json({ error: '更新設定失敗: ' + error.message });
    }
});

// 獲取伺服器列表
app.get('/api/guilds', authenticate, checkBotReady, (req, res) => {
    try {
        const guilds = botFunctions.client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ size: 64 }),
            memberCount: guild.memberCount,
            created: guild.createdAt
        }));
        res.json(guilds);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 獲取指令列表
app.get('/api/commands', authenticate, checkBotReady, (req, res) => {
    try {
        const settings = botFunctions.getBotSettings();
        const commands = Object.entries(settings.commands || {}).map(([name, enabled]) => ({
            name,
            enabled,
            description: getCommandDescription(name)
        }));
        res.json(commands);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 執行 Bot 指令
app.post('/api/command', authenticate, checkBotReady, (req, res) => {
    try {
        const { command, options } = req.body;
        const result = botFunctions.executeBotCommand(command, options);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 預設設定
function getDefaultSettings() {
    return {
        epSystem: {
            addPermission: 'admin',
            dailyReward: 3,
            levels: [
                { name: '[PVT3] Private Third Class', ep: 0 },
                { name: '[PVT2] Private Second Class', ep: 2 },
                { name: '[PVT1] Private First Class', ep: 5 }
            ]
        },
        moderation: {
            antiSpamEnabled: true,
            spamLimit: 5,
            warningLimit: 3,
            muteDuration: 10,
            autoModEnabled: false
        },
        automation: {
            welcomeEnabled: false,
            welcomeMessage: '歡迎 {user} 加入伺服器！',
            autoRoleEnabled: false,
            autoRoleName: '',
            statusRotation: true,
            statusMessages: [
                '/ep 查詢 EP',
                '/weather 查天氣',
                'EP 排行榜 / 工單 / 活動'
            ]
        },
        logging: {
            logChannel: '',
            logJoins: true,
            logMessages: true,
            logModActions: true,
            logErrors: false
        },
        commands: {
            addep: true, roleep: true, check: true, rank: true,
            kick: true, ban: true, unban: true, mute: true, unmute: true,
            dm: true, announce: true, addchannelpermissions: true, 
            deletechannelpermissions: true, pass: true,
            checkin: true, postevent: true, addrank: true,
            dammy526: true, ticket: true, '活躍度檢查': true, '活躍度結算': true
        }
    };
}

// 指令描述對照表
function getCommandDescription(commandName) {
    const descriptions = {
        addep: '增加使用者 EP',
        roleep: '減少使用者 EP', 
        check: '查詢 EP 和等級',
        rank: '查看等級卡片',
        kick: '踢出成員',
        ban: '封禁成員',
        unban: '解除封禁',
        mute: '禁言成員',
        unmute: '解除禁言',
        dm: '發送私訊',
        announce: '發送公告',
        addchannelpermissions: '新增頻道權限',
        deletechannelpermissions: '刪除頻道權限',
        pass: '自動申請',
        checkin: '每日簽到',
        postevent: '發布活動',
        addrank: '階級申請',
        dammy526: '管理員專用指令',
        ticket: '工單系統',
        '活躍度檢查': '檢查成員活躍度',
        '活躍度結算': '結算活躍度'
    };
    
    return descriptions[commandName] || '沒有描述';
}

// 啟動 Web 伺服器
app.listen(port, () => {
    console.log(`🌐 Web 控制台運行在 http://localhost:${port}`);
    console.log(`🔑 API 金鑰: ${API_KEY}`);
    
    // 延遲初始化 Bot 功能，確保 Bot 先啟動
    setTimeout(() => {
        if (initializeBotFunctions()) {
            console.log('✅ Bot 功能連接成功');
        } else {
            console.log('⚠️ 無法連接 Bot 功能，請確認 Bot 正在運行');
        }
    }, 3000);
});

// 定期檢查 Bot 連接狀態
setInterval(() => {
    if (botFunctions && botFunctions.client) {
        const newReadyState = botFunctions.client.isReady();
        if (newReadyState !== isBotReady) {
            isBotReady = newReadyState;
            console.log(`🤖 Bot 狀態變更: ${isBotReady ? '已連接' : '已斷開'}`);
        }
    }
}, 5000);