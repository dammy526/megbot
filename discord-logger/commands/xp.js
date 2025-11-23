const path = require('path');
const epData = require(path.resolve(__dirname, '../ep-data.js'));
module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('顯示所有用戶的 EP 數'),

  async execute(interaction) {
    let description = '';
    for (const [userId, ep] of Object.entries(epData)) {
      description += `<@${userId}>: ${ep} EP\n`;
    }

    if (!description) description = '目前沒有 EP 數據。';

    const embed = new EmbedBuilder()
      .setTitle('所有用戶的 EP 數')
      .setDescription(description)
      .setColor(0x00AE86);

    await interaction.reply({ embeds: [embed] });
  },
};
