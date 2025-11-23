const { EmbedBuilder } = require('discord.js');

const OWNER_ID = "856481799194148886"; // 你的ID

module.exports = async function registerErrorHandler(client) {

  async function sendErrorLog(title, error, fixResult, suggestion) {
    try {
      const owner = await client.users.fetch(OWNER_ID);

      const embed = new EmbedBuilder()
        .setTitle(`⚠️ ${title}`)
        .setColor("#FF4444")
        .addFields(
          { name: "📝 錯誤內容", value: `\`\`\`\n${String(error).slice(0, 1000)}\n\`\`\`` },
          { name: "🔧 修復結果", value: fixResult },
          { name: "💡 建議處理方式", value: suggestion }
        )
        .setTimestamp();

      await owner.send({ embeds: [embed] });
    } catch (err) {
      console.error("無法發送錯誤訊息給擁有者：", err);
    }
  }

  // -----------------------------------------------------
  // 🔥 未捕捉 Exception
  // -----------------------------------------------------
  process.on("uncaughtException", async (err) => {
    console.error("未捕捉例外：", err);

    await sendErrorLog(
      "未捕捉例外 (uncaughtException)",
      err.stack || err,
      "已嘗試保持程式持續運行，並清理當前事件循環。",
      "此錯誤通常是程式邏輯問題，請檢查錯誤堆疊來源檔案。"
    );
  });

  // -----------------------------------------------------
  // 🔥 未捕捉 Promise Rejection
  // -----------------------------------------------------
  process.on("unhandledRejection", async (reason) => {
    console.error("未捕捉 Promise 拒絕：", reason);

    await sendErrorLog(
      "未捕捉 Promise Rejection",
      reason,
      "已攔截錯誤並避免程式崩潰。",
      "請檢查 API 呼叫、資料格式或 Discord API 限制。"
    );
  });

  // -----------------------------------------------------
  // 🔥 Discord WebSocket 斷線
  // -----------------------------------------------------
  client.on("shardDisconnect", async (event, shardID) => {
    await sendErrorLog(
      `Shard #${shardID} WebSocket 斷線`,
      event,
      "正在嘗試自動重新連線...",
      "通常是 Discord 伺服器問題，無須手動處理。"
    );
  });

  // -----------------------------------------------------
  // 🔥 Discord 出現 Rate Limit
  // -----------------------------------------------------
  client.rest.on("rateLimited", async (info) => {
    await sendErrorLog(
      "API 達到 Rate Limit",
      JSON.stringify(info, null, 2),
      "系統會自動等待並重試發送。",
      "避免在短時間內大量發送訊息或建立大量 request。"
    );
  });

  // -----------------------------------------------------
  // 🔥 Discord API 40000 / 50000 系列錯誤
  // -----------------------------------------------------
  client.on("error", async (error) => {
    await sendErrorLog(
      "Discord API 錯誤",
      error,
      "已自動重試或重建 WebSocket。",
      "如頻繁發生，請檢查 API 權限或是否誤用 endpoint。"
    );
  });

  // -----------------------------------------------------
  // 🔥 Shard 重連成功
  // -----------------------------------------------------
  client.on("shardResume", async (id) => {
    await sendErrorLog(
      `Shard #${id} 已重新連線`,
      "連線已恢復。",
      "已成功重新連結 Discord Gateway。",
      "無需操作。"
    );
  });

};
