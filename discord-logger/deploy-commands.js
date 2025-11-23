require('dotenv').config();

const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error('❌ 請確認 .env 有設定 DISCORD_BOT_TOKEN, CLIENT_ID, GUILD_ID');
  process.exit(1);
}

// 定義所有斜線指令
const commands = [
  new SlashCommandBuilder()
    .setName('roleep')
    .setDescription('從多位使用者減少 EP')
    .addStringOption(opt =>
      opt.setName('targets')
        .setDescription('目標使用者（可標註或用ID，用空格/逗號隔開）')
        .setRequired(true))
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('要減少的 EP 數')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("踢出伺服器中的成員")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("要踢出的成員")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("踢出的原因"))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('pass')
    .setDescription('自動申請，給指定成員身分組並改暱稱')
    .addUserOption(option => 
      option.setName('target')
        .setDescription('要申請的成員')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("封鎖伺服器中的成員")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("要封鎖的成員")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("封鎖原因"))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("unban")
    .setDescription("解除封鎖成員")
    .addStringOption(option =>
      option.setName("userid")
        .setDescription("要解除封鎖的使用者 ID")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("mute")
    .setDescription("禁言成員（需要有已設定的 Mute 角色）")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("要禁言的成員")
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName("time")
        .setDescription("禁言時間（分鐘）")
        .setRequired(true))
    .addStringOption(option =>
      option.setName("reason")
        .setDescription("禁言原因"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),

  new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("解除禁言成員（需要有已設定的 Mute 角色）")
    .addUserOption(option =>
      option.setName("target")
        .setDescription("要解除禁言的成員")
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('開啟工單功能')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('活躍度檢查')
    .setDescription('發起活躍度檢查')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('活躍度結算')
    .setDescription('手動結束活躍度檢查並結算')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('addep')
    .setDescription('增加EP')
    .addStringOption(option =>
      option.setName('targets')
        .setDescription('目標使用者，可多個 @user')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('amount')
        .setDescription('EP數量')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('addrank')
    .setDescription('提交階級申請給管理員審核')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('要申請階級的使用者')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('rank')
        .setDescription('申請的階級')
        .setRequired(true)
        .addChoices(
          { name: 'LT', value: 'LT' },
          { name: 'SLT', value: 'SLT' },
          { name: 'CPT', value: 'CPT' },
          { name: 'MJR', value: 'MJR' },
          { name: 'LTC', value: 'LTC' },
          { name: 'COL', value: 'COL' },
          { name: 'DDIR', value: 'DDIR' },
          { name: 'DIR', value: 'DIR' },
          { name: 'RS', value: 'RS' },
        ))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('申請原因')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
  .setName('dm')
  .setDescription('向指定用戶發送私訊')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('要傳送訊息的用戶')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('message')
      .setDescription('要傳送的訊息')
      .setRequired(true)  // 確保這是 true
  )
  .addBooleanOption(option =>
    option.setName('use_embed')
      .setDescription('是否使用 Embed 發送')
      .setRequired(true)  // 確保這是 true
  )
  .toJSON(),

  new SlashCommandBuilder()
    .setName('addchannelpermissions')
    .setDescription('新增指定成員/角色的頻道權限')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('要設定的頻道')
        .setRequired(true))
    .addMentionableOption(option =>
      option.setName('target')
        .setDescription('要給予權限的成員或角色')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('perm')
        .setDescription('要給予什麼權限？')
        .addChoices(
          { name: '查看頻道 (View Channel)', value: 'ViewChannel' },
          { name: '發送訊息 (Send Messages)', value: 'SendMessages' },
          { name: '讀取訊息記錄 (Read Message History)', value: 'ReadMessageHistory' },
          { name: '加入語音 (Connect)', value: 'Connect' }
        )
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('發送一則公告到指定頻道（embed）')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('要發送公告的頻道')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('title')
        .setDescription('公告標題')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('公告內容（可多行）')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('mention')
        .setDescription('是否標註')
        .addChoices(
          { name: '不標註', value: 'none' },
          { name: '@everyone', value: 'everyone' },
          { name: '@here', value: 'here' }
        )
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('dammy526')
    .setDescription('連續多次發送訊息給指定用戶（管理員限定）')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('要發送的對象')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('times')
        .setDescription('要發送幾次（1-無限）')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('要發送的訊息內容（可多行）')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('deletechannelpermissions')
    .setDescription('刪除指定成員/角色的頻道權限覆寫')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('要設定的頻道')
        .setRequired(true))
    .addMentionableOption(option =>
      option.setName('target')
        .setDescription('要移除權限的成員或角色')
        .setRequired(true))
    .toJSON(),

  new SlashCommandBuilder()
    .setName('check')
    .setDescription('查詢指定使用者的 EP 點數')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('要查詢的使用者')
        .setRequired(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('checkin')
    .setDescription('每日簽到，獲得獎勵')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('postevent')
    .setDescription('發布一個活動')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('活動名稱')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('host')
        .setDescription('主持人')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('cohost')
        .setDescription('副主持人')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('supervisor')
        .setDescription('監督員')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('start')
        .setDescription('開始時間 (例: 1h30min)')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('eventlink')
        .setDescription('活動連結')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('voicelink')
        .setDescription('語音連結')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('gamelink')
        .setDescription('遊戲連結')
        .setRequired(false))
    .toJSON(),

  // 新增 rank 指令
  new SlashCommandBuilder()
    .setName('rank')
    .setDescription('查看你的等級卡片')
    .toJSON(),

];



const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('開始註冊指令...');
    const data = await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands },
    );
    console.log(`✅ 指令註冊成功！共註冊了 ${data.length} 個指令`);
    
    // 顯示已註冊的指令列表
    console.log('📋 已註冊指令列表:');
    data.forEach(cmd => {
      console.log(`  - /${cmd.name}: ${cmd.description}`);
    });
  } catch (error) {
    console.error('❌ 註冊指令失敗：', error);
    
    // 提供更詳細的錯誤資訊
    if (error.code === 50001) {
      console.error('❌ 缺少存取權限，請確認 Bot 有加入伺服器');
    } else if (error.code === 50013) {
      console.error('❌ 缺少權限，請確認 Bot 有 "applications.commands" 權限');
    } else if (error.code === 40060) {
      console.error('❌ 指令格式錯誤，請檢查指令選項設定');
    }
  }
})();