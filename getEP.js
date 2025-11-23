function getLevelProgress(ep) {
  // 找出目前 EP 所在等級區間
  let currentLevelIndex = 0;
  for (let i = 0; i < levels.length; i++) {
    if (ep >= levels[i].ep) currentLevelIndex = i;
    else break;
  }

  const currentLevel = levels[currentLevelIndex];
  const nextLevel = levels[currentLevelIndex + 1] || null;

  // 計算進度百分比
  let progress = 1;
  let epToNext = 0;

  if (nextLevel) {
    const epRange = nextLevel.ep - currentLevel.ep;
    epToNext = nextLevel.ep - ep;
    progress = (ep - currentLevel.ep) / epRange;
  }

  return { currentLevel, nextLevel, progress, epToNext };
}