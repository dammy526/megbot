router.get('/bot/uptime', (req, res) => {
    const ms = Date.now() - global.botStartTime;

    const seconds = Math.floor(ms / 1000) % 60;
    const minutes = Math.floor(ms / (1000 * 60)) % 60;
    const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    res.json({
        uptime: `${days} 天 ${hours} 小時 ${minutes} 分 ${seconds} 秒`,
        ms
    });
});
