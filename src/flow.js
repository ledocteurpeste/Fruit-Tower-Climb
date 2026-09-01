/* Level-flow glue, DOM-free.
   Ported from index.html:2510 (fmtTime) and index.html:2743-2773
   (bankTowerTime / levelComplete / winGame / gameOver / nextLevel).
   All DOM / scene / audio effects are routed through `hooks`, installed by main.js.
   Profile access is routed through prof()/saveProfiles(), stubbed until Task 15. */
import { run } from './state.js';
import { hooks } from './hooks.js';

export function fmtTime(t) {
  const m = Math.floor(t / 60), s = (t % 60);
  return m + ':' + s.toFixed(1).padStart(4, '0');
}

/* --- profile access: real implementation wired in Task 15 --- */
let _prof = null;
let _saveProfiles = () => {};
export function setProfileAccess(profFn, saveFn) {
  _prof = profFn || null;
  _saveProfiles = saveFn || (() => {});
}
export function prof() { return _prof ? _prof() : null; }
export function saveProfiles() { _saveProfiles(); }

/* a tower's own time, and the profile's record for it (index.html:2743) */
export function bankTowerTime() {
  const p = prof();
  if (!p) return;
  const t = run.runTime - run.levelStartT;
  if (p.bestLvl[run.levelIdx] == null || t < p.bestLvl[run.levelIdx]) p.bestLvl[run.levelIdx] = t;
  saveProfiles();
}

/* index.html:2748 — physics fires onLevelComplete every frame the player is on
   the goal, so guard against re-entry with run.running. */
export function levelComplete() {
  if (!run.running) return;
  run.running = false;
  hooks.sfx('level');
  bankTowerTime();
  if (run.levelIdx >= 2) { winGame(); return; }
  if (hooks.setState) hooks.setState('level');
  if (hooks.levelInterstitial) hooks.levelInterstitial(run.levelIdx);
}

export let pendingTime = null;
export let savedThisWin = false;

/* index.html:2757 — costume/unlock bits dropped per task-11 corrections. */
export function winGame() {
  run.running = false;
  hooks.sfx('win');
  hooks.music('stop');
  if (hooks.onWin) hooks.onWin();
  pendingTime = run.runTime;
  savedThisWin = false;
  const p = prof();
  if (p && (p.best == null || run.runTime < p.best)) { p.best = run.runTime; saveProfiles(); }
  // Task 15: saveWinName() / saveScore() / leaderboard name label
  if (hooks.winStats) hooks.winStats(run.runTime);
}

/* index.html:2772 */
export function gameOver() {
  if (hooks.setState) hooks.setState('over');
  hooks.music('stop');
  saveProfiles();
}

/* index.html:2773 */
export function nextLevel() {
  if (hooks.setState) hooks.setState('play');
  if (hooks.startNextLevel) hooks.startNextLevel(run.levelIdx + 1);
  hooks.music('start');
}
