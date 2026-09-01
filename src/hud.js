/* HUD + screen plumbing — THIN STUB. Task 15 fleshes this out
   (coin-pill theme glyph, full menu wiring, leaderboard, profile UI, etc).
   Ported from index.html:2511-2525 (updateHUD/showMsg), 3027-3070 (screens/setState/click). */
import { run, opts } from './state.js';
import { fmtTime } from './flow.js';
import { THEMES } from './levels.js';

const $ = (id) => document.getElementById(id);

/* --- centre message (index.html:2519-2525) --- */
let msgTimer = null;
export function showMsg(text, ms) {
  const e = $('centerMsg');
  if (!e) return;
  e.textContent = text;
  e.style.opacity = '1';
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { e.style.opacity = '0'; }, ms || 1800);
}

/* --- HUD readout (index.html:2511-2518) --- */
export function updateHUD() {
  const cc = $('coinCount'); if (cc) cc.textContent = run.coinsLevel;
  const tm = $('timer'); if (tm) tm.textContent = fmtTime(run.runTime);
  const lv = $('lives');
  if (lv) {
    const FULL = '❤️', EMPTY = '🤍';
    lv.textContent = opts.cheat ? '∞' + FULL
      : (run.lives > 3 ? FULL + '×' + run.lives
        : FULL.repeat(Math.max(0, run.lives)) + EMPTY.repeat(Math.max(0, 3 - run.lives)));
  }
  // Task 15: #coinPill theme glyph
}

/* --- screens (index.html:3027-3038) --- */
const screens = {
  menu: 'mainMenu', options: 'optionsScreen', leader: 'leaderScreen', char: 'charScreen',
  pause: 'pauseScreen', level: 'levelScreen', win: 'winScreen', over: 'overScreen', quit: 'quitScreen',
  profile: 'profileScreen',
};
function hideAllScreens() {
  Object.values(screens).forEach((id) => { const e = $(id); if (e) e.classList.add('hidden'); });
}
export function showScreen(state) {
  hideAllScreens();
  const hud = $('hud');
  if (hud) hud.style.display = (state === 'play' || state === 'pause') ? 'block' : 'none';
  const menuish = (state !== 'play' && state !== 'pause');
  const bg = $('menuBG');
  if (bg) bg.classList.toggle('hidden', !(menuish && state !== 'char'));
  if (screens[state]) { const e = $(screens[state]); if (e) e.classList.remove('hidden'); }
}

/* --- level-done interstitial (index.html:2751-2755) --- */
export function setLevelInterstitial(prevIdx) {
  const T = THEMES[prevIdx], nx = THEMES[prevIdx + 1];
  const tt = $('levelTitle'); if (tt) tt.innerHTML = T.emoji + ' ' + T.name + ' Done!';
  const st = $('levelStats');
  if (st && nx) {
    st.innerHTML = 'Time so far: <b>' + fmtTime(run.runTime) + '</b> &nbsp;·&nbsp; '
      + T.coin + ' ' + run.coinsLevel + ' collected<br>Next up: ' + nx.emoji + ' <b>' + nx.name + ' Tower</b>';
  }
}

export function setWinStats(t) {
  const ws = $('winStats');
  if (ws) ws.innerHTML = 'You climbed all three towers in <b>' + fmtTime(t) + '</b>! 🍒🍓🫐';
}

/* --- minimal menu wiring: enough to start / pause / resume a run.
   Full menu (begin flow, options, leaderboard, profiles) is Task 15. --- */
export function wireMenu({ startRun, setState, togglePause, nextLevel, restartLevel }) {
  const on = (id, fn) => { const e = $(id); if (e) e.addEventListener('click', fn); };
  on('beginBtn', () => setState('char'));       // Task 15: ensureGuest / profiles
  on('charGo', () => startRun());
  on('pauseBtn', () => togglePause());
  on('resumeBtn', () => togglePause());
  on('restartBtn', () => (restartLevel ? restartLevel() : setState('play')));
  on('pMenuBtn', () => setState('menu'));
  on('levelNext', () => (nextLevel ? nextLevel() : setState('play')));
  on('winAgain', () => startRun());
  on('winMenu', () => setState('menu'));
  on('overRetry', () => startRun());
  on('overMenu', () => setState('menu'));
}
