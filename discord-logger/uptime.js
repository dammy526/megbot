module.exports = {
    name: "uptime",
    description: "查看 Bot 運行了多久",

    run: async (client, interaction) => {
        const ms = Date.now() - client.startTime;

        const seconds = Math.floor(ms / 1000) % 60;
        const minutes = Math.floor(ms / (1000 * 60)) % 60;
        const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));

        const uptime = `${days} 天 ${hours} 小時 ${minutes} 分 ${seconds} 秒`;

        interaction.reply({
            content: `🟢 Bot 已運行：\`${uptime}\``,
            ephemeral: false
        });
    }
}