/* Level-flow glue, DOM-free.
   Ported from index.html:2510 (fmtTime) and index.html:2743-2773
   (bankTowerTime / levelComplete / winGame / nextLevel).
   gameOver lives in main.js now (it needs setState + Audio_ directly).
   All DOM / scene / audio effects are routed through `hooks`, installed by main.js.
   Profile access comes straight from the DOM-free profile.js module (Task 15). */
import { run } from './state.js';
import { hooks } from './hooks.js';
import { prof, saveProfiles, saveScore, getProfileName } from './profile.js';

export { prof, saveProfiles };

export function fmtTime(t) {
  const m = Math.floor(t / 60), s = (t % 60);
  return m + ':' + s.toFixed(1).padStart(4, '0');
}

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
  hooks.setState('level');
  hooks.levelInterstitial(run.levelIdx);
}

export let pendingTime = null;
export let savedThisWin = false;

/* index.html:2757 — costume/unlock bits dropped per task-11 corrections. */
export function winGame() {
  run.running = false;
  hooks.sfx('win');
  hooks.music('stop');
  hooks.onWin();                        // main.js drives the screen transition
  pendingTime = run.runTime;
  savedThisWin = false;
  const p = prof();
  if (p) {
    p.beaten = (p.beaten || 0) + 1;
    if (p.best == null || run.runTime < p.best) p.best = run.runTime;
    saveProfiles();
  }
  saveWinName();
  hooks.winStats(run.runTime);
}

/* index.html:2766 — the run goes up under the profile name, no typing. */
export function saveWinName() {
  if (savedThisWin || pendingTime == null) return;
  const nm = (getProfileName() || '').trim() || 'Climber';
  saveScore(nm, pendingTime);
  savedThisWin = true;
  hooks.winName(nm);
}

/* index.html:2773 */
export function nextLevel() {
  hooks.setState('play');
  hooks.startNextLevel(run.levelIdx + 1);
  hooks.music('start');
}
