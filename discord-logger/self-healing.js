module.exports = (client) => {

  // ===============================
  // 1. 自動偵測 WebSocket / Gateway 問題
  // ===============================
  client.on('error', (err) => {
    console.log('❌ Discord WebSocket 錯誤：', err);
    safeReconnect(client);
  });

  client.on('shardError', (err) => {
    console.log('⚠️ Shard 連線崩潰：', err);
    safeReconnect(client);
  });

  client.on('disconnect', () => {
    console.log('⚠️ Bot 與 Discord 斷線，正在嘗試重連...');
    safeReconnect(client);
  });

  // ===============================
  // 2. 捕捉指令錯誤（不讓 Bot 崩潰）
  // ===============================
  process.on('unhandledRejection', err => {
    console.log('❌ Unhandled Rejection：', err);
  });

  process.on('uncaughtException', err => {
    console.log('❌ Uncaught Exception：', err);
  });

  // ===============================
  // 3. 自動修復 - 清除多餘的 listeners
  // ===============================
  setInterval(() => {
    const max = 10;

    if (client.listenerCount('interactionCreate') > max) {
      console.log('⚠️ 偵測到 interactionCreate 註冊過多，開始自我修復...');

      client.removeAllListeners('interactionCreate'); // 清除全部
      delete require.cache[require.resolve('./commands/handler.js')]; // 清除快取
      require('./commands/handler.js')(client); // 重新載入事件

      console.log('✅ 已成功修復 listener memory leak！');
    }
  }, 15000); // 每 15 秒檢查一次

};

// ===============================
// 重新連線功能
// ===============================
async function safeReconnect(client) {
  try {
    console.log('🔁 正在重新連接到 Discord...');
    await client.destroy();
    await client.login(process.env.TOKEN);
    console.log('✅ 重連成功！Bot 運作正常。');
  } catch (err) {
    console.log('❌ 重連失敗，3 秒後再試...');
    setTimeout(() => safeReconnect(client), 3000);
  }
}
