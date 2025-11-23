const API_KEY = 'MEG_PRIVATE_KEY_2024';
const API_BASE = 'http://localhost:3000/api';

// 當前選中的伺服器
let currentGuild = null;

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setInterval(updateBotStatus, 10000);
});

// 初始化儀表板
async function initializeDashboard() {
    await updateBotStatus();
    await loadSettings();
    await loadCommands();
    await loadGuilds();
}

// 更新 Bot 狀態
async function updateBotStatus() {
    try {
        const response = await fetch(`${API_BASE}/status`);
        const data = await response.json();
        
        document.getElementById('botStatus').textContent = 
            data.status === 'online' ? '✅ 線上' : '❌ 離線';
        document.getElementById('uptime').textContent = formatUptime(data.uptime);
        document.getElementById('guildCount').textContent = data.guilds;
        document.getElementById('userCount').textContent = data.users;
        document.getElementById('commandCount').textContent = data.enabledCommands;
    } catch (error) {
        document.getElementById('botStatus').textContent = '❌ 連線失敗';
    }
}

// 載入所有設定
async function loadSettings() {
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        const settings = await response.json();
        applyAllSettings(settings);
        showMessage('✅ 設定載入成功', 'success');
    } catch (error) {
        showMessage('❌ 無法載入設定', 'error');
    }
}

// 載入指令列表
async function loadCommands() {
    try {
        const response = await fetch(`${API_BASE}/commands`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        const commands = await response.json();
        renderCommands(commands);
    } catch (error) {
        console.error('載入指令失敗:', error);
    }
}

// 載入伺服器列表
async function loadGuilds() {
    try {
        const response = await fetch(`${API_BASE}/guilds`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        
        const guilds = await response.json();
        renderGuilds(guilds);
    } catch (error) {
        console.error('載入伺服器失敗:', error);
    }
}

// 應用所有設定到表單
function applyAllSettings(settings) {
    if (!settings) return;
    
    // EP 系統設定
    if (settings.epSystem) {
        document.getElementById('epAddPermission').value = settings.epSystem.addPermission || 'admin';
        document.getElementById('dailyReward').value = settings.epSystem.dailyReward || 3;
        if (settings.epSystem.levels) {
            renderLevelSettings(settings.epSystem.levels);
        }
    }
    
    // 管理功能設定
    if (settings.moderation) {
        document.getElementById('antiSpamEnabled').checked = settings.moderation.antiSpamEnabled !== false;
        document.getElementById('spamLimit').value = settings.moderation.spamLimit || 5;
        document.getElementById('warningLimit').value = settings.moderation.warningLimit || 3;
        document.getElementById('muteDuration').value = settings.moderation.muteDuration || 10;
        document.getElementById('autoModEnabled').checked = settings.moderation.autoModEnabled || false;
    }
    
    // 自動化設定
    if (settings.automation) {
        document.getElementById('welcomeEnabled').checked = settings.automation.welcomeEnabled || false;
        document.getElementById('welcomeMessage').value = settings.automation.welcomeMessage || '';
        document.getElementById('autoRoleEnabled').checked = settings.automation.autoRoleEnabled || false;
        document.getElementById('autoRoleName').value = settings.automation.autoRoleName || '';
        document.getElementById('statusRotation').checked = settings.automation.statusRotation !== false;
        if (settings.automation.statusMessages) {
            renderStatusMessages(settings.automation.statusMessages);
        }
    }
    
    // 日誌設定
    if (settings.logging) {
        document.getElementById('logChannel').value = settings.logging.logChannel || '';
        document.getElementById('logJoins').checked = settings.logging.logJoins !== false;
        document.getElementById('logMessages').checked = settings.logging.logMessages !== false;
        document.getElementById('logModActions').checked = settings.logging.logModActions !== false;
        document.getElementById('logErrors').checked = settings.logging.logErrors || false;
    }
}

// 收集所有設定
function collectAllSettings() {
    return {
        epSystem: {
            addPermission: document.getElementById('epAddPermission').value,
            dailyReward: parseInt(document.getElementById('dailyReward').value),
            levels: getLevelSettings()
        },
        moderation: {
            antiSpamEnabled: document.getElementById('antiSpamEnabled').checked,
            spamLimit: parseInt(document.getElementById('spamLimit').value),
            warningLimit: parseInt(document.getElementById('warningLimit').value),
            muteDuration: parseInt(document.getElementById('muteDuration').value),
            autoModEnabled: document.getElementById('autoModEnabled').checked
        },
        automation: {
            welcomeEnabled: document.getElementById('welcomeEnabled').checked,
            welcomeMessage: document.getElementById('welcomeMessage').value,
            autoRoleEnabled: document.getElementById('autoRoleEnabled').checked,
            autoRoleName: document.getElementById('autoRoleName').value,
            statusRotation: document.getElementById('statusRotation').checked,
            statusMessages: getStatusMessages()
        },
        logging: {
            logChannel: document.getElementById('logChannel').value,
            logJoins: document.getElementById('logJoins').checked,
            logMessages: document.getElementById('logMessages').checked,
            logModActions: document.getElementById('logModActions').checked,
            logErrors: document.getElementById('logErrors').checked
        },
        commands: getCommandStates()
    };
}

// 儲存所有設定
async function saveSettings() {
    const settings = collectAllSettings();
    
    try {
        const response = await fetch(`${API_BASE}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        if (response.ok) {
            showMessage('✅ 所有設定已儲存並同步到 Bot', 'success');
        } else {
            showMessage(`❌ 儲存失敗: ${result.error}`, 'error');
        }
    } catch (error) {
        showMessage('❌ 無法連接到 Bot', 'error');
    }
}

// 渲染指令列表
function renderCommands(commands) {
    const container = document.getElementById('commandsList');
    if (!container) return;
    
    container.innerHTML = commands.map(cmd => `
        <div class="command-item">
            <label class="command-toggle">
                <input type="checkbox" ${cmd.enabled ? 'checked' : ''} 
                       onchange="toggleCommand('${cmd.name}', this.checked)">
                <span class="toggle-slider"></span>
            </label>
            <div class="command-info">
                <strong>/${cmd.name}</strong>
                <span>${cmd.description}</span>
            </div>
        </div>
    `).join('');
}

// 切換指令狀態
function toggleCommand(commandName, enabled) {
    const settings = collectAllSettings();
    settings.commands[commandName] = enabled;
    
    // 立即儲存變更
    saveSettings();
}

// 獲取指令狀態
function getCommandStates() {
    const states = {};
    const checkboxes = document.querySelectorAll('input[type="checkbox"][onchange*="toggleCommand"]');
    
    checkboxes.forEach(checkbox => {
        const match = checkbox.getAttribute('onchange').match(/toggleCommand\('([^']+)'/);
        if (match) {
            states[match[1]] = checkbox.checked;
        }
    });
    
    return states;
}

// 工具函數
function formatUptime(uptime) {
    if (!uptime) return '--';
    const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
    const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return days > 0 ? `${days} 天 ${hours} 小時` : `${hours} 小時`;
}

function showMessage(text, type) {
    // 你的訊息顯示邏輯
    console.log(`[${type}] ${text}`);
}

// 確保這些函數在全局可訪問
window.loadSettings = loadSettings;
window.saveSettings = saveSettings;
window.toggleCommand = toggleCommand;