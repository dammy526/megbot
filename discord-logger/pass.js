module.exports = {
  data: { name: 'pass' },
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true }); // 先避免超時卡住

    const targetUser = interaction.options.getUser('target');
    const date = interaction.options.getString('date');

    const channelId = '1389584652624461884';

    try {
      const targetChannel = await interaction.client.channels.fetch(channelId);

      if (!targetChannel || !targetChannel.isTextBased()) {
        return interaction.editReply({ content: '❌ 找不到目標頻道，請檢查權限與頻道 ID。' });
      }

      const embed = new EmbedBuilder()
        .setColor(0x00AE86)
        .setDescription(`🎉 Congratulations to ${targetUser} on passing the M.E.G. apply! 🎉`)
        .addFields(
          { name: 'Focus', value: 'Join apply', inline: true },
          { name: 'Date Graduated', value: date, inline: true }
        );

      await targetChannel.send({ content: '@everyone', embeds: [embed] });

      await interaction.editReply({ content: '✅ 已成功發送到公告頻道！' });
    } catch (err) {
      console.error('❌ 發送失敗：', err);
      await interaction.editReply({ content: '❌ 發送失敗，請查看日誌。' });
    }
  }
};
