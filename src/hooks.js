const noop = () => {};
export const hooks = {
  sfx: noop, music: noop, showMsg: noop,
  onDie: noop, onRespawn: noop, onLevelComplete: noop, onWin: noop,
  onCoin: noop, onCheckpoint: noop, onSplash: noop,
  setState: noop, startNextLevel: noop, gameOver: noop,
  levelInterstitial: noop, winStats: noop, winName: noop,
};
export function installHooks(partial) { Object.assign(hooks, partial); }
