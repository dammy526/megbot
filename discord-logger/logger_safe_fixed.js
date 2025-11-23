require('dotenv').config();
const {
  Client, GatewayIntentBits, Partials, Events, EmbedBuilder, PermissionsBitField,
  ChannelType, ButtonBuilder, ButtonStyle, ActionRowBuilder, ActivityType,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
  AttachmentBuilder, SlashCommandBuilder,  PermissionFlagsBits, MessageFlags,
} = require('discord.js');
const fs = require('fs');
const axios = require('axios');
const { QuickDB } = require('quick.db');
const Canvas = require('canvas');
const path = require('path');
const POST_EVENT_CHANNEL_ID = '1389584652624461884';
const Database = require('better-sqlite3');



// 初始化資料庫
const db = new Database('checkin.db');


// 建立資料表（若不存在）
db.prepare(`
  CREATE TABLE IF NOT EXISTS checkins (
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    PRIMARY KEY (userId, date)
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS totals (
    userId TEXT PRIMARY KEY,
    total INTEGER NOT NULL DEFAULT 0
  )
`).run();


const LOG_CHANNEL_ID = "1336598200005689354";
const STATUS_CHANNEL_ID = '1389582087807434782';
const VERIFY_CHANNEL_ID = '1402839094219899052';
const WEBHOOK_URL3 = 'https://discord.com/api/webhooks/1402626010414973010/XXBhne-7fYbi162WvlmSJMK_rpGCX856HxoVhQ90eXlp88mpiiC0gZM53-9yk8YTpocv';

const USER_ID = '856481799194148886'; // 要解除禁言的成員ID
const GUILD_ID = '1247917863688474664'; // 伺服器ID

const {
  ADMIN_ROLE_ID,
  CATEGORY_ID,
  WEATHER_API_KEY,
  DISCORD_BOT_TOKEN
} = process.env;








// 安全回覆函式
function safeReply(interaction, content) {
  return (interaction.replied || interaction.deferred) ? interaction.followUp(content) : interaction.reply(content);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});



// --- Ready 事件，只寫一次 ---
client.once('ready', async () => {
  console.log(`✅ Bot 上線：${client.user.tag}`);

// ✅ client 建立完成後再載入 self-healing
require('./self-healing')(client);

  // 設定機器人狀態並輪播
  let idx = 0;
  const status = [
    () => `/ep 查詢 EP`,
    () => `/weather 查天氣`,
    () => `EP 排行榜 / 工單 / 活動`,
  ];
  setInterval(() => {
    client.user.setActivity(status[idx++ % status.length](), { type: ActivityType.Listening });
  }, 10000);

  client.user.setPresence({
    status: 'online',
    activities: [{
      name: '等待dammy526編寫',
      type: ActivityType.Playing,
    }],
  });

  // 發送上線通知
  try {
    const statusChannel = await client.channels.fetch(STATUS_CHANNEL_ID);
    if (statusChannel && statusChannel.isTextBased()) {
      const onlineEmbed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('機器人狀態通知')
        .setDescription(`🤖 機器人 **${client.user.tag}** 已 **上線**！`)
        .setTimestamp();

      await statusChannel.send({ embeds: [onlineEmbed] });
    }
  } catch (e) {
    console.error('發送上線通知錯誤:', e);
  }

  // 解除禁言
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(USER_ID);

    if (!member) {
      console.log(`找不到成員 ${USER_ID}`);
      return;
    }

    await member.timeout(null);
    console.log(`已解除成員 ${member.user.tag} 的禁言`);
  } catch (error) {
    console.error('解除禁言時出錯:', error);
  }
});

// 關閉通知函式
async function notifyShutdown() {
  try {
    if (!client.isReady()) return;

    const statusChannel = await client.channels.fetch(STATUS_CHANNEL_ID);
    if (statusChannel && statusChannel.isTextBased()) {
      const shutdownEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('機器人狀態通知')
        .setDescription(`⚠️ 機器人 **${client.user.tag}** 正在 **關閉**...`)
        .setTimestamp();

      await statusChannel.send({ embeds: [shutdownEmbed] });
    }
  } catch (err) {
    console.error('Shutdown notification 發送失敗:', err);
  }
}

process.on('SIGINT', async () => {
  await notifyShutdown();
  process.exit();
});
process.on('SIGTERM', async () => {
  await notifyShutdown();
  process.exit();
});
process.on('exit', async () => {
  await notifyShutdown();
});

const ALLOWED_USERS = ['877854432073744384', '1170193865312055397', '856481799194148886'];
const GENERAL_ROLE_ID = '1261580373297463347';
const SPECIAL_ROLE_ID = '1247927424096931931';
const SPECIAL_USER_ID = '856481799194148886';

// --- 寫日誌用 ---
async function writeLog(action, content) {
  try {
    const logChannel = await client.channels.fetch('1403381540485857352');
    if (logChannel && logChannel.isTextBased()) {
      await logChannel.send(`[${action}] ${content}`);
    } else {
      console.log(`[${action}] ${content}`);
    }
  } catch (e) {
    console.error('寫日誌失敗:', e);
  }
}

// =======================================
// 🛠️ safeReply：修正 ephemeral & string 問題
// =======================================
async function safeReply(interaction, options) {
  try {
    // 如果傳進來的是字串，包裝成 content
    if (typeof options === "string") {
      options = { content: options };
    }

    // 相容舊代碼，ephemeral → flags
    if (options?.ephemeral) {
      options.flags = MessageFlags.Ephemeral;
      delete options.ephemeral;
    }

    if (interaction.deferred || interaction.replied) {
      return await interaction.followUp(options);
    } else {
      return await interaction.reply(options);
    }
  } catch (err) {
    console.error("❌ safeReply 出錯:", err);
  }
}

// =======================================
// 🛠️ 模擬 EP 系統函數 (實際要改成你的資料庫)
// =======================================
async function addEP(userId, amount) {
  return amount; // TODO: 改成資料庫儲存邏輯
}
async function reduceEP(userId, amount) {
  return amount; // TODO: 改成資料庫儲存邏輯
}

// =======================================
// 🎯 InteractionCreate
// =======================================
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.guild) {
      await interaction.guild.members.fetch(interaction.user.id);
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName, options } = interaction;

    // 🎯 EP 系統
    if (commandName === "addep" || commandName === "roleep") {
      const targetsString = options.getString("targets");
      const amount = options.getInteger("amount");

      if (!targetsString || amount === null) {
        return safeReply(interaction, { 
          content: "❌ 請提供目標使用者和有效數量", 
          flags: MessageFlags.Ephemeral 
        });
      }

      const idMatches = [...targetsString.matchAll(/<@!?(\d+)>|(\d+)/g)];
      const targetIds = [...new Set(idMatches.map(m => m[1] ?? m[2]))];

      if (targetIds.length === 0) {
        return safeReply(interaction, { 
          content: "❌ 找不到有效的目標使用者 ID", 
          flags: MessageFlags.Ephemeral 
        });
      }

      const successUsers = [];
      const failedUsers = [];

      for (const id of targetIds) {
        try {
          const newEP = commandName === "addep"
            ? await addEP(id, amount)
            : await reduceEP(id, amount);

          successUsers.push(`<@${id}> (${newEP} EP)`);
        } catch (e) {
          console.error(`EP 操作錯誤: userId=${id}`, e);
          failedUsers.push(`<@${id}>`);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle("💠 EP 操作結果 / EP Operation Result")
        .addFields(
          { name: "✅ 成功處理", value: successUsers.length ? successUsers.join("\n") : "無", inline: false },
          { name: "❌ 失敗處理", value: failedUsers.length ? failedUsers.join("\n") : "無", inline: false },
          { name: "🔢 數量 / Amount", value: `${commandName === "addep" ? "增加" : "減少"} ${amount} EP`, inline: false }
        )
        .setColor(commandName === "addep" ? 0x22c55e : 0xf43f5e)
        .setFooter({ text: "M.E.G EP 系統" })
        .setTimestamp();

      // ✅ 使用 safeReply
      await safeReply(interaction, {
        embeds: [embed],
        allowedMentions: { users: targetIds },
        flags: MessageFlags.Ephemeral
      });

      // 📡 發送 Webhook 通知
      try {
        await axios.post(
          "https://discord.com/api/webhooks/XXXX/XXXX", // ⚠️ 換成你的 Webhook URL
          {
            username: "EP 操作通知",
            avatar_url: "https://i.postimg.cc/VL8LPQ7B/M-E-G.png",
            embeds: [embed.toJSON()],
          }
        );
      } catch (webhookError) {
        console.error("Webhook 發送失敗:", webhookError);
      }
    }
  } catch (err) {
    console.error("互動處理錯誤:", err);
  }
});

const LOG_CHANNEL_ID2 = '1441774330303221880';
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'dm') {
    const target = interaction.options.getUser('user');
    const message = interaction.options.getString('message');
    const useEmbed = interaction.options.getBoolean('use_embed');

    try {
      if (useEmbed) {
        const embed = new EmbedBuilder()
          .setTitle(`📩 你收到一則訊息`)
          .setDescription(message) // 保留多行與 Markdown
          .setColor('#00A2FF')
          .setFooter({ text: `由 ${interaction.user.tag} 發送` })
          .setTimestamp();

        await target.send({ embeds: [embed] });
      } else {
        await target.send(message); // 純文字保留格式
      }

      await interaction.reply({ content: `✅ 已成功傳送 DM 給 ${target.tag}`, ephemeral: true });

      // 日誌紀錄
      if (LOG_CHANNEL_ID) {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        const logEmbed = new EmbedBuilder()
          .setTitle('📘 DM 紀錄')
          .addFields(
            { name: '發送者', value: interaction.user.tag, inline: true },
            { name: '接收者', value: target.tag, inline: true },
            { name: '內容', value: message.length > 1024 ? message.slice(0, 1020) + '...' : message }
          )
          .setColor('#FFD700')
          .setTimestamp();

        logChannel.send({ embeds: [logEmbed] });
      }

    } catch (err) {
      console.error(err);
      await interaction.reply({ content: `❌ 無法傳送 DM 給 ${target.tag}（可能關閉私訊）。`, ephemeral: true });
    }
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // ---------------------------
  // /addchannelpermissions
  // ---------------------------
  if (interaction.commandName === 'addchannelpermissions') {
    const channel = interaction.options.getChannel('channel');
    const target = interaction.options.getMentionable('target');
    const permName = interaction.options.getString('perm');

    const permValue = PermissionsBitField.Flags[permName];

    try {
      await channel.permissionOverwrites.edit(target.id, { [permName]: true });

      await interaction.reply({
        content: `✅ 已在 <#${channel.id}> 給予 **${target}** 權限：\`${permName}\``,
        ephemeral: true
      });

    } catch (err) {
      await interaction.reply({
        content: `❌ 設定權限時發生錯誤！請確認 Bot 是否有管理頻道權限。`,
        ephemeral: true
      });
    }
  }

  // ---------------------------
  // /deletechannelpermissions
  // ---------------------------
  if (interaction.commandName === 'deletechannelpermissions') {
    const channel = interaction.options.getChannel('channel');
    const target = interaction.options.getMentionable('target');

    try {
      await channel.permissionOverwrites.delete(target.id);

      await interaction.reply({
        content: `🗑️ 已刪除 <#${channel.id}> 中 **${target}** 的權限覆寫（恢復為伺服器預設）`,
        ephemeral: true
      });

    } catch (err) {
      await interaction.reply({
        content: `❌ 無法刪除權限覆寫！請確認 Bot 是否有權限。`,
        ephemeral: true
      });
    }
  }

});

client.on("interactionCreate", async interaction => {

  if (!interaction.isChatInputCommand()) return;

  // =====================
  // /announce
  // =====================
  if (interaction.commandName === "announce") {
    const channel = interaction.options.getChannel("channel");
    const title = interaction.options.getString("title");
    const message = interaction.options.getString("message");
    const mentionType = interaction.options.getString("mention");

    let mentionText = "";

    if (mentionType === "everyone") mentionText = "@everyone";
    if (mentionType === "here") mentionText = "@here";

    // 建立公告 Embed
    const embed = new EmbedBuilder()
      .setColor("#00A2FF")
      .setTitle(title)
      .setDescription(message)
      .setFooter({ text: `公告由 ${interaction.user.tag} 發布` })
      .setTimestamp();

    try {
      // 傳送公告
      await channel.send({ 
        content: mentionText || null,
        embeds: [embed] 
      });

      await interaction.reply({
        content: `✅ 公告已成功發送到 <#${channel.id}>`,
        ephemeral: true
      });

    } catch (err) {
      console.error(err);
      await interaction.reply({
        content: "❌ 發送公告時發生錯誤，請確認我是否有權限！",
        ephemeral: true
      });
    }
  }

});

const ALLOWED_USER_ID = '856481799194148886';

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'dammy526') {

    // 管理員限定或指定使用者
    if (
      !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      interaction.user.id !== ALLOWED_USER_ID
    ) {
      return interaction.reply({ content: '❌ 你沒有權限使用此指令。', ephemeral: true });
    }

    const target = interaction.options.getUser('user');
    let times = interaction.options.getInteger('times');
    const msg = interaction.options.getString('message');

    if (times < 1) times = 1;
    if (times > 1000) times = 1000; // 可自訂最大值

    await interaction.reply(`📨 已開始向 **${target.tag}** 發送訊息 **${times} 次**！`);

    const sleep = ms => new Promise(res => setTimeout(res, ms));

    for (let i = 1; i <= times; i++) {
      try {
        const embed = new EmbedBuilder()
          .setTitle(`📩 第 ${i} 次訊息`)
          .setDescription(msg)
          .setColor('Random')
          .setTimestamp();

        await target.send({ embeds: [embed] });
        await sleep(1000); // 延遲 1 秒

      } catch (err) {
        console.error(err);
        return interaction.followUp(`❌ 無法私訊 **${target.tag}**（可能關閉私訊）。`);
      }
    }

    await interaction.followUp(`✅ 已完成向 **${target.tag}** 發送 ${times} 次訊息！`);
  }
});


// 事件 - 成員加入、離開、訊息修改、刪除、頻道變化、身分組與暱稱變更
// 這部分維持你原本寫法，不再贅述，請確保 LOG_CHANNEL_ID 有權限發送訊息且頻道存在

// 簡化範例：
client.on(Events.GuildMemberAdd, async member => {
  try {
    const logChannel = member.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (!logChannel?.isTextBased()) return;
    const embed = new EmbedBuilder()
      .setColor('#00ff00')
      .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
      .setTitle('📥 成員加入')
      .setDescription(`**用戶：** ${member}`)
      .setTimestamp();
    await logChannel.send({ embeds: [embed] });
  } catch (e) {
    console.error(e);
  }
});

// 其餘事件請依照你給的原程式碼複製貼上即可。

// 防刷頻功能
const userMessageHistory = new Map();
const userWarnings = new Map();
const SPAM_INTERVAL = 5000;
const SPAM_LIMIT = 5;
const WARNING_LIMIT = 3;
const MUTE_DURATION = 10 * 60 * 1000;

client.on('messageCreate', async message => {
  if (message.author.bot || !message.guild) return;

  const now = Date.now();
  const userId = message.author.id;
  const channel = message.channel;
  const guild = message.guild;

  if (!userMessageHistory.has(userId)) {
    userMessageHistory.set(userId, []);
  }
  const history = userMessageHistory.get(userId);
  history.push({ id: message.id, timestamp: now, channelId: channel.id });

  const recent = history.filter(m => now - m.timestamp < SPAM_INTERVAL);
  userMessageHistory.set(userId, recent);

  if (recent.length >= SPAM_LIMIT) {
    try {
      const messageIds = recent.filter(m => m.channelId === channel.id).map(m => m.id);
      await channel.bulkDelete(messageIds, true).catch(() => {});

      const currentWarnings = userWarnings.get(userId) || 0;
      const newWarnings = currentWarnings + 1;
      userWarnings.set(userId, newWarnings);

      await channel.send(`⚠️ <@${userId}> 請勿刷頻！（第 ${newWarnings} 次警告）`);

      await axios.post(WEBHOOK_URL3, {
        content: `🚨 **使用者刷頻警告**\n👤 使用者：<@${userId}>（ID: ${userId}）\n📡 伺服器：${guild.name}\n#️⃣ 頻道：<#${channel.id}>（${channel.name}）\n⚠️ 警告次數：${newWarnings}`,
        username: 'Spam Detector',
        avatar_url: 'https://i.imgur.com/oBPXx0D.png'
      });

      if (newWarnings >= WARNING_LIMIT) {
        const member = await guild.members.fetch(userId);
        await member.timeout(MUTE_DURATION, '刷頻超過三次');
        userWarnings.set(userId, 0);

        await channel.send(`🔇 <@${userId}> 已被禁言 10 分鐘（警告達到 3 次）`);

        await axios.post(WEBHOOK_URL3, {
          content: `🔇 **使用者已被禁言**\n👤 使用者：<@${userId}>（ID: ${userId}）\n⏱️ 時間：10 分鐘`,
          username: 'Spam Detector',
          avatar_url: 'https://i.imgur.com/oBPXx0D.png'
        });
      }
    } catch (err) {
      console.error('🚨 處理刷頻錯誤:', err);
    }
  }
});
const epFilePath = path.join(__dirname, 'ep-data.json');

function getEPFromFile(userId) {
  if (!fs.existsSync(epFilePath)) return 0;
  const rawData = fs.readFileSync(epFilePath, 'utf-8');
  const epData = JSON.parse(rawData);
  return epData[userId] ?? 0;
}

// 這裡放你的等級階段定義
const levels = [
  { name: '[PVT3] Private Third Class', ep: 0 },
  { name: '[PVT2] Private Second Class', ep: 2 },
  { name: '[PVT1] Private First Class', ep: 5 },
  { name: '[PVTM] Pritave Master Class', ep: 8 },
  { name: '[SPC3] Specialist 3rd Class', ep: 10 },
  { name: '[SPC2] Specialist 2nd Class', ep: 15 },
  { name: '[SPC1] Specialist 1st Class', ep: 20 },
  { name: '[MSPC] Master Specialist', ep: 25 },
  { name: '[CPL]Corporal', ep: 35 },
  { name: '[SGT] Sergeant', ep: 40 },
  { name: '[SSGT] Staff Sergeant', ep: 45 },
  { name: '[FSGT] First Sergeant', ep: 55 },
  { name: '[CSGT] Command Sergeant', ep: 60 },
  { name: '[SGTM] Sergeant Major', ep: 65 },
  { name: '[CMDS] Command Sergeant Major', ep: 70 },
  { name: '[ESMJ] Executive Sergeant Major', ep: 75 },
  { name: '[CSMJ] Chief Sergeant Major', ep: 100 },
];

// 取得 EP：從身分組找最大 EP
async function getEP(userId, guild) {
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return 0;

  const roleNames = member.roles.cache.map(r => r.name);
  const roleEPMap = new Map(levels.map(l => [l.name, l.ep]));

  let ep = 0;
  for (const name of roleNames) {
    if (roleEPMap.has(name)) ep = Math.max(ep, roleEPMap.get(name));
  }
  return ep;
}

// 計算進度與下一階段
function getLevelProgress(ep) {
  if (typeof ep !== 'number') return null;

  let currentLevelIndex = 0;
  for (let i = 0; i < levels.length; i++) {
    if (ep >= levels[i].ep) currentLevelIndex = i;
    else break;
  }

  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1] || null;

  let progress = 1;
  let epToNext = 0;

  if (nextLevel) {
    const epRange = nextLevel.ep - currentLevel.ep;
    epToNext = nextLevel.ep - ep;
    progress = (ep - currentLevel.ep) / epRange;
  }

  return { currentLevel, nextLevel, progress, epToNext };
}

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'check') {
    try {
      const targetUser = interaction.options.getUser('user');
      if (!targetUser) {
        return interaction.reply({ content: '❌ 請指定一位使用者', flags: 64 });
      }

      const guild = interaction.guild;
      if (!guild) return interaction.reply({ content: '❌ 這個指令只能在伺服器使用', flags: 64 });

      const member = await guild.members.fetch(targetUser.id);

      const ep = getEPFromFile(targetUser.id);
      const progressInfo = getLevelProgress(ep);
      if (!progressInfo) {
        return interaction.reply({ content: '❌ 無效的 EP 數值', flags: 64 });
      }

      const { currentLevel, nextLevel, progress, epToNext } = progressInfo;

      const roles = await guild.roles.fetch();
      const role = roles.find(r => r.name === currentLevel.name);

      if (!role) {
        console.warn(`找不到身分組: ${currentLevel.name}`);
      }

      const levelRoleNames = levels.map(l => l.name);
      const rolesToRemove = member.roles.cache.filter(r => levelRoleNames.includes(r.name) && r.id !== (role ? role.id : ''));

      // 判斷哪些要新增和移除
      const rolesAdded = [];
      const rolesRemoved = [];

      try {
        if (role && !member.roles.cache.has(role.id)) {
          await member.roles.add(role);
          rolesAdded.push(role.name);
        }
        if (rolesToRemove.size > 0) {
          await member.roles.remove(rolesToRemove);
          rolesRemoved.push(...rolesToRemove.map(r => r.name));
        }
      } catch (err) {
        console.error('身分組更新失敗:', err);
      }

      // 更新暱稱，先移除舊的身分組前綴，再加上新的
      if (role) {
        try {
          const prefixMatch = role.name.match(/\[(.+?)\]/);
          const prefix = prefixMatch ? prefixMatch[0] + ' ' : '';

          const oldNick = member.nickname || member.user.username;
          // 移除之前有的身分組前綴（格式是中括號+空白）
          const newNickWithoutPrefix = oldNick.replace(/^\[[^\]]+\]\s*/, '');
          const newNick = prefix + newNickWithoutPrefix;

          if (oldNick !== newNick) {
            await member.setNickname(newNick);
          }
        } catch (err) {
          console.warn(`無法修改 ${member.user.tag} 的暱稱：${err.message}`);
        }
      }

      const totalBars = 10;
      const filledBars = Math.round(progress * totalBars);
      const emptyBars = totalBars - filledBars;
      const barString = '▰'.repeat(filledBars) + '▱'.repeat(emptyBars);

      let progressText = '';
      if (nextLevel) {
        progressText = `離下一階段 **${nextLevel.name}** 還差 **${epToNext} EP**\n進度: [${barString}] ${(progress * 100).toFixed(1)}%`;
      } else {
        progressText = `已達最高階段 **${currentLevel.name}**，恭喜！\n進度: [${barString}] 100%`;
      }

      // 組合更新身分組結果字串
      const roleUpdateText = 
        (rolesAdded.length ? `🟢 新增身分組：${rolesAdded.join(', ')}` : '🟢 新增身分組：無') + '\n' +
        (rolesRemoved.length ? `🔴 移除身分組：${rolesRemoved.join(', ')}` : '🔴 移除身分組：無');

      const embed = new EmbedBuilder()
        .setTitle(`💠 ${targetUser.tag} 的 EP 查詢結果`)
        .setDescription(`目前擁有 **${ep} EP**\n身分組：**${currentLevel.name}**\n\n${progressText}\n\n${roleUpdateText}`)
        .setColor(0x1abc9c)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('指令處理錯誤:', err);
      if (interaction.replied || interaction.deferred) {
        return interaction.followUp({ content: '❌ 指令執行錯誤', flags: 64 });
      } else {
        return interaction.reply({ content: '❌ 指令執行錯誤', flags: 64 });
      }
    }
  }
});

// /rank 指令
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'rank') {
        const user = interaction.user;
        const xp = db.get(`xp_${user.id}`) || 0;
        const level = db.get(`level_${user.id}`) || 1;
        const neededXP = levelXP(level);

        // 建立 Canvas
        const canvas = Canvas.createCanvas(800, 250);
        const ctx = canvas.getContext('2d');

        // 背景漸層
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#4e54c8');
        gradient.addColorStop(1, '#8f94fb');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 頭像
        const avatar = await Canvas.loadImage(user.displayAvatarURL({ extension: 'png' }));
        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 25, 25, 200, 200);
        ctx.restore();

        // 文字
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 40px Sans';
        ctx.fillText(user.username, 250, 80);

        ctx.font = '30px Sans';
        ctx.fillText(`等級: ${level}`, 250, 130);
        ctx.fillText(`XP: ${xp} / ${neededXP}`, 250, 170);

        // XP 進度條
        const barWidth = 500;
        const barHeight = 30;
        const filled = (xp / neededXP) * barWidth;

        ctx.fillStyle = '#444444';
        ctx.fillRect(250, 190, barWidth, barHeight);

        ctx.fillStyle = '#00ff99';
        ctx.fillRect(250, 190, filled, barHeight);

        // 輸出
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'rank.png' });
        await interaction.reply({ files: [attachment] });
    }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName !== 'postevent') return;

    const name = interaction.options.getString('name');
    const host = interaction.options.getString('host');
    const cohost = interaction.options.getString('cohost');
    const supervisor = interaction.options.getString('supervisor');
    const startStr = interaction.options.getString('start');
    const eventLink = interaction.options.getString('eventlink');
    const voiceLink = interaction.options.getString('voicelink');
    const gameLink = interaction.options.getString('gamelink') || null;

    const durationSec = parseDuration(startStr);
    if (!durationSec) {
      return interaction.reply({ content: '⛔ 時間格式錯誤！請用 1h30min、2h、30min 等格式', ephemeral: true });
    }

    const startTimestamp = Math.floor((Date.now() + durationSec * 1000) / 1000);

    const embed = new EmbedBuilder()
      .setTitle(`🎯 ${name}`)
      .setDescription(`**活動將在** <t:${startTimestamp}:R> **開始**`)
      .addFields(
        { name: '👑 主持人 / Host', value: host, inline: true },
        { name: '🤝 副主持人 / Co-Host', value: cohost, inline: true },
        { name: '🛡️ 監督員 / Supervisor', value: supervisor, inline: true }
      )
      .setColor(0x00AE86)
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Event Link / 活動連結').setStyle(ButtonStyle.Link).setURL(eventLink),
      new ButtonBuilder().setLabel('Event Voice / 活動語音').setStyle(ButtonStyle.Link).setURL(voiceLink),
      new ButtonBuilder().setCustomId(`complete_${name}`).setLabel('Completed / 已完成').setStyle(ButtonStyle.Success),
      ...(gameLink ? [new ButtonBuilder().setLabel('Game / 遊戲').setStyle(ButtonStyle.Link).setURL(gameLink)] : [])
    );

    const channel = await client.channels.fetch(POST_EVENT_CHANNEL_ID);
    const message = await channel.send({ embeds: [embed], components: [buttons] });

    await interaction.reply({ content: '✅ 活動已成功發布！', ephemeral: true });

  } catch (err) {
    console.error(err);
    interaction.reply({ content: '❌ 發布活動時發生錯誤', ephemeral: true });
  }
});

// 按鈕互動
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('complete_')) return;

    const eventName = interaction.customId.replace('complete_', '');
    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    embed.setDescription(`${embed.data.description}\n\n✅ **[${eventName}] 已完成**`).setColor(0x2ecc71);

    await interaction.update({ embeds: [embed], components: interaction.message.components });
  } catch (err) {
    console.error(err);
    interaction.reply({ content: '❌ 無法標記活動完成', ephemeral: true });
  }
});




// 生成日曆圖片
async function generateCalendarImage(year, month, signedDates) {
  const width = 700;
  const height = 450;
  const canvas = Canvas.createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#FFF8DC';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#FF8C00';
  ctx.font = '28px 微軟正黑體';
  ctx.fillText(`${year}年${month}月 簽到日曆`, 20, 40);

  const weekdays = ['日','一','二','三','四','五','六'];
  ctx.font = '20px 微軟正黑體';
  ctx.fillStyle = '#333';
  const startX = 40;
  const startY = 80;
  const cellSize = 80;

  weekdays.forEach((w, i) => {
    ctx.fillText(w, startX + i * cellSize + 30, startY);
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  ctx.font = '22px 微軟正黑體';

  for (let day = 1; day <= daysInMonth; day++) {
    const dayX = startX + ((firstDay + day - 1) % 7) * cellSize;
    const dayY = startY + Math.floor((firstDay + day - 1) / 7) * cellSize + 40;

    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#CCC';
    ctx.lineWidth = 2;
    ctx.fillRect(dayX, dayY - 30, cellSize - 10, cellSize - 10);
    ctx.strokeRect(dayX, dayY - 30, cellSize - 10, cellSize - 10);

    ctx.fillStyle = '#000';
    ctx.fillText(day.toString(), dayX + 10, dayY);

    if (signedDates.has(day)) {
      ctx.fillStyle = '#228B22';
      ctx.font = '28px Arial';
      ctx.fillText('✅', dayX + 40, dayY);
      ctx.font = '22px 微軟正黑體'; // 還原字體大小
    }
  }

  return canvas.toBuffer();
}

function formatDate(date) {
  const weekdays = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekday = weekdays[date.getDay()];
  const hh = String(date.getHours()).padStart(2,'0');
  const mm = String(date.getMinutes()).padStart(2,'0');
  return `${weekday}, ${y}年${m}月${d}日 ${hh}:${mm}`;
}

client.on('ready', () => {
  console.log(`已登入：${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  if (interaction.commandName === 'checkin') {
    const userId = interaction.user.id;
    const now = new Date();
    const today = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

    // 檢查今天是否已簽到
    const alreadyChecked = db.prepare(
      `SELECT 1 FROM checkins WHERE userId = ? AND date = ?`
    ).get(userId, todayStr);

    if (alreadyChecked) {
      await interaction.reply({ content: `你今天已經簽到了，明天再來吧！`, ephemeral: true });
      return;
    }

    // 寫入簽到紀錄
    db.prepare(`INSERT INTO checkins (userId, date) VALUES (?, ?)`).run(userId, todayStr);

    // 更新總數
    db.prepare(`
      INSERT INTO totals (userId, total)
      VALUES (?, 3)
      ON CONFLICT(userId) DO UPDATE SET total = total + 3
    `).run(userId);

    // 查詢當月已簽到日期
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
    const rows = db.prepare(
      `SELECT date FROM checkins WHERE userId = ? AND date BETWEEN ? AND ?`
    ).all(userId, monthStart, monthEnd);

    const signedDates = new Set(rows.map(r => parseInt(r.date.split('-')[2], 10)));

    // 查詢總數
    const total = db.prepare(`SELECT total FROM totals WHERE userId = ?`).get(userId).total;

    // 生成日曆圖片
    const imageBuffer = await generateCalendarImage(year, month, signedDates);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'calendar.png' });

    const embed = new EmbedBuilder()
      .setColor('#FFA500')
      .setTitle('🎉 簽到成功！')
      .setDescription(`<@${userId}> 你在 **${formatDate(now)}** 已簽到成功 ✅`)
      .addFields(
        { name: '🎁 獎勵', value: `🍔 3 個M.E.G. 拼圖碎片`, inline: true },
        { name: '📊 總累積', value: `${total} 個拼圖碎片`, inline: true }
      )
      .setImage('attachment://calendar.png')
      .setFooter({ text: '繼續保持簽到，收集更多拼圖碎片！', iconURL: client.user.displayAvatarURL() })
      .setTimestamp(now);

    await interaction.reply({ embeds: [embed], files: [attachment] });
  }
});

// 階級設定表（角色ID請換成你自己的）
const rankConfig = {
  LT: {
    roleToAdd: ['1261580373297463347', '1249575881970548791'], // 範例多加一個
    roleToRemove: [],
    prefix: '[LT]'
  },
  SLT: {
    roleToAdd: ['1305137723597787146'],
    roleToRemove: ['1261580373297463347', '1249575881970548791'],
    prefix: '[SLT]'
  },
  CPT: {
    roleToAdd: ['1315246286383091754'],
    roleToRemove: ['1305137723597787146'],
    prefix: '[CPT]'
  },
  MJR: {
    roleToAdd: ['1259297868200677507'],
    roleToRemove: ['1315246286383091754'],
    prefix: '[MJR]'
  },
  LTC: {
    roleToAdd: ['1259298106965626972'],
    roleToRemove: ['1259297868200677507'],
    prefix: '[LTC]'
  },
  COL: {
    roleToAdd: ['1259298416379429026'],
    roleToRemove: ['1259298106965626972'],
    prefix: '[COL]'
  },
  DDIR: {
    roleToAdd: ['1249354390058303548'],
    roleToRemove: ['1259298416379429026'],
    prefix: '[DDIR]'
  },
  DIR: {
    roleToAdd: ['1317707587151724575'],
    roleToRemove: ['1249354390058303548'],
    prefix: '[Director]'
  },
  RS: {
    roleToAdd: ['1279605472042811394'],
    roleToRemove: ['1249556465212067901','1249556465212067901','1259184065035370539','1259183925251543150','1259183309343428790','1259182810946867220','1403638094225477702','1259297513320747038'],
    prefix: '[RS]'
  },
};

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// 工具函式 - 安全回覆
async function safeReply(interaction, content) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp({ content, ephemeral: true });
  } else {
    return interaction.reply({ content, ephemeral: true });
  }
}

// 指令事件
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'addrank') {
        // 權限判斷
        if (!interaction.member.roles.cache.has(SPECIAL_ROLE_ID) && interaction.user.id !== SPECIAL_USER_ID) {
          return interaction.reply({ content: '❌ 你沒有權限使用此指令', ephemeral: true });
        }

        const target = interaction.options.getUser('target');
        const rank = interaction.options.getString('rank');
        const reason = interaction.options.getString('reason');

        if (!rankConfig[rank]) {
          return interaction.reply({ content: '❌ 找不到此階級設定', ephemeral: true });
        }

        const embed = new EmbedBuilder()
          .setTitle('階級申請審核')
          .addFields(
            { name: '申請者', value: `<@${target.id}>`, inline: true },
            { name: '階級', value: rank, inline: true },
            { name: '申請原因', value: reason, inline: false },
            { name: '申請人 ID', value: target.id, inline: true },
            { name: '申請人名稱', value: target.tag, inline: true },
            { name: '申請人發起者', value: interaction.user.tag, inline: true }
          )
          .setColor(0x0099ff)
          .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`approve_${target.id}_${rank}`)
            .setLabel('✅ 通過')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`deny_${target.id}_${rank}`)
            .setLabel('❌ 不通過')
            .setStyle(ButtonStyle.Danger),
        );

        const verifyChannel = await client.channels.fetch(VERIFY_CHANNEL_ID);
        await verifyChannel.send({ embeds: [embed], components: [row] });

        await interaction.reply({ content: `✅ 申請已送出，請等待管理員審核。`, ephemeral: true });
      }
    }

    // 按鈕互動事件
    if (interaction.isButton()) {
      const [action, targetId, rank] = interaction.customId.split('_');
      if (!['approve', 'deny'].includes(action)) return;

      // 權限判斷
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.roles.cache.has(SPECIAL_ROLE_ID) && interaction.user.id !== SPECIAL_USER_ID) {
        return interaction.reply({ content: '❌ 你沒有權限進行此操作', ephemeral: true });
      }

      const rankInfo = rankConfig[rank];
      if (!rankInfo) return interaction.reply({ content: '❌ 找不到階級設定', ephemeral: true });

      const targetMember = await interaction.guild.members.fetch(targetId);

      if (action === 'approve') {
        // 移除舊身分組
        for (const roleId of rankInfo.roleToRemove) {
          if (targetMember.roles.cache.has(roleId)) {
            await targetMember.roles.remove(roleId).catch(() => {});
          }
        }
        // 新增身分組
        for (const roleId of rankInfo.roleToAdd) {
          if (!targetMember.roles.cache.has(roleId)) {
            await targetMember.roles.add(roleId).catch(() => {});
          }
        }

        // 修改暱稱加前綴
        let oldNick = targetMember.nickname || targetMember.user.username;
        oldNick = oldNick.replace(/^\[[^\]]+\]\s*/, ''); // 去除舊前綴
        let newNick = `${rankInfo.prefix} ${oldNick}`;
        if (newNick.length > 32) {
          // 過長截斷
          const maxLen = 32 - rankInfo.prefix.length - 1;
          const shortName = targetMember.user.username.slice(0, maxLen);
          newNick = `${rankInfo.prefix} ${shortName}`;
        }
        await targetMember.setNickname(newNick).catch(() => {});

        await interaction.update({
          content: `✅ 已通過，${targetMember.user.tag} 獲得 ${rank} 身分組。`,
          components: [],
          embeds: [],
        });

      } else if (action === 'deny') {
        await interaction.update({
          content: `❌ 已拒絕，${targetMember.user.tag} 的 ${rank} 申請。`,
          components: [],
          embeds: [],
        });
      }
    }
  } catch (error) {
    console.error('錯誤:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ 發生錯誤', ephemeral: true });
    }
  }
});




process.on('unhandledRejection', err => console.error('❌ 未捕捉錯誤:', err));

// 處理互動
client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // KICK
    if (commandName === "kick") {
        const target = interaction.options.getMember("user");
        const reason = interaction.options.getString("reason") || "無原因";

        if (!target) return interaction.reply({ content: "❌ 找不到成員。", ephemeral: true });

        try {
            await target.kick(reason);
            await interaction.reply(`✅ 已踢出 **${target.user.tag}** (${reason})`);
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ 無法踢出，請檢查權限。", ephemeral: true });
        }
    }

    // MUTE
    if (commandName === "mute") {
        const target = interaction.options.getMember("user");
        const time = interaction.options.getInteger("time");
        const reason = interaction.options.getString("reason") || "無原因";

        if (!target) return interaction.reply({ content: "❌ 找不到成員。", ephemeral: true });

        try {
            const ms = time * 60 * 1000;
            await target.timeout(ms, reason);
            await interaction.reply(`✅ 已禁言 **${target.user.tag}** ${time} 分鐘 (${reason})`);
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ 禁言失敗，請檢查權限。", ephemeral: true });
        }
    }

    // UNMUTE
    if (commandName === "unmute") {
        const target = interaction.options.getMember("user");
        if (!target) return interaction.reply({ content: "❌ 找不到成員。", ephemeral: true });

        try {
            await target.timeout(null); // 解除 Timeout
            await interaction.reply(`✅ 已解除禁言 **${target.user.tag}**`);
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ 解除禁言失敗。", ephemeral: true });
        }
    }

    // BAN
    if (commandName === "ban") {
        const target = interaction.options.getMember("user");
        const time = interaction.options.getInteger("time");
        const reason = interaction.options.getString("reason") || "無原因";

        if (!target) return interaction.reply({ content: "❌ 找不到成員。", ephemeral: true });

        try {
            await target.ban({ reason });
            await interaction.reply(`✅ 已封禁 **${target.user.tag}** (${reason})`);

            // 自動解除封禁
            if (time) {
                setTimeout(async () => {
                    try {
                        await interaction.guild.members.unban(target.id, "封禁時間到期");
                        console.log(`✅ 自動解除封禁：${target.user.tag}`);
                    } catch (err) {
                        console.error("❌ 自動解除封禁失敗：", err);
                    }
                }, time * 60 * 1000);
            }
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ 封禁失敗。", ephemeral: true });
        }
    }

    // UNBAN
    if (commandName === "unban") {
        const userId = interaction.options.getString("userid");

        try {
            await interaction.guild.members.unban(userId, "手動解除封禁");
            await interaction.reply(`✅ 已解除封禁 <@${userId}>`);
        } catch (err) {
            console.error(err);
            interaction.reply({ content: "❌ 解除封禁失敗，可能此人未被封禁。", ephemeral: true });
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'pass') {
        const guild = interaction.guild;
        const targetUser = interaction.options.getUser('target'); // 取得 ping 的使用者
        const member = guild.members.cache.get(targetUser.id);

        if (!member) return interaction.reply({ content: '找不到指定的成員', ephemeral: true });

        try {
            // 加身分組
            const role = guild.roles.cache.get('1258774311238631475'); // 替換成你的角色 ID
            if (!role) return interaction.reply({ content: '找不到指定的身分組', ephemeral: true });
            await member.roles.add(role);

            // 改暱稱
            const newNickname = `Enlistee ${member.user.username}`;
            await member.setNickname(newNickname);

            // 回覆訊息 ping 指定成員
            interaction.reply({ content: `${member} 已完成自動申請！身分組已加，暱稱改成 ${newNickname}`, ephemeral: false });
        } catch (err) {
            console.error(err);
            interaction.reply({ content: '發生錯誤，無法完成自動申請', ephemeral: true });
        }
    }
});

// ===============================
// 📌 全域錯誤處理（不讓 Bot 當機）
// ===============================
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ 未捕捉的 Promise 錯誤：", reason);
});

process.on("uncaughtException", (err) => {
  console.error("❌ 未捕捉的例外錯誤：", err);
});

// ===============================
// 📌 Discord API 自動修復
// ===============================
client.rest.on('rateLimited', info => {
  console.warn(`⚠️ 遇到 API 限制，等待 ${info.timeout}ms`);
});

// ===============================
// 📌 WebSocket 自動恢復（常見掉線修復）
// ===============================
client.on('shardDisconnect', (event, shardID) => {
  console.warn(`⚠️ Shard ${shardID} 斷線：`, event);

  console.log("🔄 嘗試重新連線中...");
  client.login(process.env.TOKEN).catch(() => {});
});

client.on('shardError', (error, shardID) => {
  console.error(`❌ Shard ${shardID} 錯誤：`, error);
  console.log("🔄 嘗試修復 Shard...");
  client.login(process.env.TOKEN).catch(() => {});
});

// ===============================
// 📌 心跳偵測（自動檢查是否卡住）
// ===============================
let lastHeartbeat = Date.now();

client.on('debug', msg => {
  if (msg.includes("Heartbeat acknowledged")) {
    lastHeartbeat = Date.now();
  }
});

// 每 30 秒檢查一次
setInterval(() => {
  if (Date.now() - lastHeartbeat > 45000) { 
    console.warn("⚠️ 偵測到 WebSocket 心跳停止，重新連線...");
    client.login(process.env.TOKEN).catch(() => {});
  }
}, 30000);

// ===============================
// 📌 安全訊息重試（避免 DM 發送失敗）
// ===============================
async function safeSend(target, payload) {
  try {
    return await target.send(payload);
  } catch (err) {
    console.warn("❗訊息發送失敗，1 秒後重試...", err);
    await new Promise(res => setTimeout(res, 1000));

    try {
      return await target.send(payload);
    } catch (err2) {
      console.error("❌ 二次發送仍失敗：", err2);
      return null;
    }
  }
}

module.exports.safeSend = safeSend;

module.exports = (client) => {

    const OWNER_ID = '856481799194148886';

    // 發送 EMBED 給你
    async function sendErrorReport(title, error, fixResult, suggestions) {
        try {
            const owner = await client.users.fetch(OWNER_ID);

            const embed = new EmbedBuilder()
                .setTitle(`⚠️ ${title}`)
                .setColor('Red')
                .addFields(
                    {
                        name: '🛑 錯誤資訊',
                        value: `\`\`\`${error.stack || error}\`\`\``
                    },
                    {
                        name: '🔧 修復結果',
                        value: fixResult || '（無法自動判斷）'
                    },
                    {
                        name: '💡 建議修復方式',
                        value: suggestions || '（無建議）'
                    }
                )
                .setTimestamp();

            await owner.send({ embeds: [embed] });
        } catch (sendErr) {
            console.error('無法傳送錯誤日誌給擁有者：', sendErr);
        }
    }

    // 🔥 捕捉未處理錯誤
    process.on('uncaughtException', async (err) => {

        console.error('🔥 Uncaught Exception：', err);

        // 自動修復策略
        let fixResult = '已清除錯誤並繼續運作（未重新啟動 Bot）';
        let suggestions = '檢查觸發此錯誤的指令或事件，確認是否有 undefined/null 變數。';

        await sendErrorReport('未捕捉錯誤 (uncaughtException)', err, fixResult, suggestions);
    });

    // 🔥 捕捉 Promise 未處理錯誤
    process.on('unhandledRejection', async (reason) => {

        console.error('🔥 Unhandled Rejection：', reason);

        let fixResult = 'Promise 錯誤已攔截，Bot 持續正常運作';
        let suggestions = '請檢查 async/await 或 Promise 是否忘記加 try/catch。';

        await sendErrorReport('Promise 未處理錯誤 (unhandledRejection)', reason, fixResult, suggestions);
    });

    console.log('🛡️ 自動修復系統已啟動（Self-Healing Enabled）');
};



// 登入機器人
client.login(DISCORD_BOT_TOKEN);
