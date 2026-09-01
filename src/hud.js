/* HUD + screens + menu + profiles + leaderboard.
   Ported from index.html:2511-2521 (updateHUD/showMsg), 3027-3102 (screens,
   setState DOM half, click wiring, toggles, leaderboard), 3148-3196 (profiles
   screen + menu chip). The dress-up / unlock system is DELETED — its drawer,
   its stepping helpers, and its counting helpers are not ported, and the
   "Unlocks" stat tile and the "unlocked" chip string are gone. */
import { run, opts, world } from './state.js';
import { fmtTime } from './flow.js';
import { THEMES } from './levels.js';
import { CHARACTERS, selectCharacter } from './character.js';
import { Audio_ } from './audio.js';
import {
  ensureGuest, saveProfiles, prof, useProfile, getProfiles, getProfileName,
  loadScores,
} from './profile.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const bestStr = (t) => (t == null ? '—' : fmtTime(t));

/* character-select index — main.js seeds it from localStorage at boot */
let chosen = 0;
export function setChosen(n) { chosen = n | 0; }
export function getChosen() { return chosen; }

/* --- centre message (index.html:2519-2521) --- */
let msgTimer = null;
export function showMsg(text, ms) {
  const e = $('centerMsg');
  if (!e) return;
  e.textContent = text;
  e.style.opacity = '1';
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => { e.style.opacity = '0'; }, ms || 1800);
}

/* --- HUD readout (index.html:2511-2518, 2498 coin-pill glyph) --- */
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
  const pill = $('coinPill');
  if (pill && pill.firstChild && world && world.theme) pill.firstChild.textContent = world.theme.coin + ' ';
}

/* --- screens (index.html:3027-3042) --- */
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
  if (state === 'leader') fillLeaderboard();
  if (state === 'char') updateCharUI();
  if (state === 'menu') updateMenuWho();
  if (state === 'profile') { showNewProfile(false); updateProfileScreen(); }
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

/* --- character select: just the name label; 3D preview is Task 16
   (index.html:3103-3104 reduced) --- */
export function updateCharUI() {
  const nm = $('charName');
  if (nm) nm.textContent = CHARACTERS[chosen] ? CHARACTERS[chosen].name : '';
}

/* --- local leaderboard (index.html:3100-3102) --- */
export function fillLeaderboard() {
  const s = loadScores(), el = $('lbList');
  if (!el) return;
  const me = getProfileName();
  if (!s.length) { el.innerHTML = '<div style="opacity:.7;padding:16px">No times yet — be the first! 🏁</div>'; return; }
  el.innerHTML = s.map((r, i) => `<div class="lbrow ${i === 0 ? 'best' : ''} ${r.name === me ? 'you' : ''}">`
    + `<span class="rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}</span>`
    + `<span class="who">${esc(r.name)}${r.name === me ? ' <small>(you)</small>' : ''}</span>`
    + `<span>⏱ ${fmtTime(r.time)}</span></div>`).join('');
}

/* --- the Profiles screen (index.html:3148-3185, "Unlocks" tile removed) --- */
function statTile(lab, ico, val) {
  return '<div class="stat"><div class="lab">' + lab + '</div><div class="bar">'
    + '<span class="ico">' + ico + '</span><span class="val">' + val + '</span></div></div>';
}
function profileCard(name) {
  const profiles = getProfiles();
  const p = profiles[name], me = (name === getProfileName());
  const towers = THEMES.map((T, i) => statTile(T.name, T.emoji, bestStr(p.bestLvl[i]))).join('');
  return '<div class="profCard' + (me ? ' on' : '') + '">'
    + '<div class="profHead">'
    + '<div class="profAva">' + (me ? '😄' : '🙂') + '</div>'
    + '<div class="profWhoName">' + esc(name) + '<span class="sub">'
    + (me ? 'now playing' : (p.beaten ? p.beaten + ' win' + (p.beaten === 1 ? '' : 's') : 'no wins yet')) + '</span></div>'
    + (me ? '<div class="profBadge">✔ Playing</div>'
      : '<button class="btn small profPick" data-use="' + esc(name) + '">Choose</button>')
    + '</div>'
    + '<div class="statRow">'
    + statTile('Best Time', '⏱', bestStr(p.best))
    + statTile('Fruit Collected', '🍒', (p.fruit || 0))
    + statTile('Towers Beaten', '🏆', (p.beaten || 0))
    + '</div>'
    + '<div class="statRow" style="margin-top:8px">' + towers + '</div>'
    + '</div>';
}
export function updateProfileScreen() {
  const list = $('profList');
  if (!list) return;
  const names = Object.keys(getProfiles());
  list.innerHTML = names.length
    ? names.map(profileCard).join('')
    : '<div class="tag">No players saved yet — make one below!</div>';
  list.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => {
    useProfile(b.getAttribute('data-use'));
    Audio_.sfx('click');
    updateProfileScreen();
    updateMenuWho();
  }));
}
function showNewProfile(on) {
  const row = $('profNewRow'); if (row) row.classList.toggle('hidden', !on);
  const btn = $('profNew'); if (btn) btn.classList.toggle('hidden', on);
  if (on) { const i = $('profInput'); if (i) { i.value = ''; i.focus(); } }
}

/* --- main menu profile chip (index.html:3186-3195, "unlocked" string removed) --- */
export function updateMenuWho() {
  ensureGuest();
  const profiles = getProfiles(), me = getProfileName();
  const sel = $('menuProfPick');
  if (sel) {
    sel.innerHTML = '';
    Object.keys(profiles).forEach((n) => {
      const o = document.createElement('option');
      o.value = n; o.textContent = n; if (n === me) o.selected = true;
      sel.appendChild(o);
    });
  }
  const e = $('menuWho');
  if (e) { const p = prof(); e.textContent = p ? ('🍒 ' + (p.fruit || 0) + ' collected') : ''; }
}

/* --- options toggles (index.html:985-987 saveOpts, 3092-3098 wireToggle) --- */
function saveOpts() { try { localStorage.setItem('ft_opts', JSON.stringify(opts)); } catch (e) { /* private mode */ } }
function wireToggle(id, key, after) {
  const e = $(id);
  if (!e) return;
  const sync = () => e.classList.toggle('on', !!opts[key]);
  e.addEventListener('click', () => {
    Audio_.init();
    opts[key] = !opts[key];
    saveOpts();
    sync();
    Audio_.sfx('click');
    if (after) after();
  });
  sync();
}
export function wireToggles() {
  wireToggle('tgMusic', 'music', () => { if (opts.music) Audio_.startMusic(); else Audio_.stopMusic(); });
  wireToggle('tgSfx', 'sfx');
  wireToggle('tgCheat', 'cheat', () => updateHUD());
}

/* --- menu / screen button wiring (index.html:3046-3090, dress-up clicks removed) --- */
const HOME_SVG = '<svg class="homeIco" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">'
  + '<path d="M12 3 1.5 12h3v8.5h5V15h5v5.5h5V12h3L12 3z"/></svg>';

export function wireMenu({ startRun, setState, togglePause, nextLevel, restartLevel }) {
  /* every handler plays the click blip, like index.html's click() helper (3046) */
  const click = (id, fn) => {
    const e = $(id);
    if (e) e.addEventListener('click', () => { Audio_.init(); Audio_.sfx('click'); fn(); });
  };

  click('beginBtn', () => { ensureGuest(); saveProfiles(); setState('char'); });
  click('optionsBtn', () => setState('options'));
  click('leaderBtn', () => { fillLeaderboard(); setState('leader'); });
  click('quitBtn', () => { Audio_.stopMusic(); setState('quit'); });

  click('optBack', () => setState('menu'));
  click('lbBack', () => setState('menu'));
  click('quitBack', () => setState('menu'));
  click('charBack', () => setState('menu'));
  click('profBack', () => setState('menu'));

  /* selectCharacter owns the wraparound, ft_char persistence, preview reload and
     in-game model swap. It gets hud's index accessors + label refresh here so
     character.js never has to import hud.js (would be a cycle). */
  const charApi = { getChosen, setChosen, onChange: updateCharUI };
  click('charPrev', () => selectCharacter(-1, charApi));
  click('charNext', () => selectCharacter(1, charApi));
  click('charGo', () => startRun());

  click('profileBtn', () => { updateProfileScreen(); setState('profile'); });
  click('profNew', () => showNewProfile(true));
  click('profSave', () => {
    const v = $('profInput') ? $('profInput').value : '';
    if (useProfile(v)) {
      showNewProfile(false); updateProfileScreen(); updateMenuWho();
      showMsg('Saved! Playing as ' + getProfileName(), 1500);
    } else {
      showMsg('Type a name first 🙂', 1400);
    }
  });
  const pi = $('profInput');
  if (pi) pi.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); const b = $('profSave'); if (b) b.click(); }
  });
  const pick = $('menuProfPick');
  if (pick) pick.addEventListener('change', function () {
    Audio_.init(); useProfile(this.value); Audio_.sfx('click'); updateMenuWho();
  });

  click('pauseBtn', () => togglePause());
  click('resumeBtn', () => togglePause());
  click('restartBtn', () => (restartLevel ? restartLevel() : setState('play')));
  click('pMenuBtn', () => setState('menu'));
  click('levelNext', () => (nextLevel ? nextLevel() : setState('play')));
  click('winAgain', () => startRun());
  click('winMenu', () => setState('menu'));
  click('overRetry', () => startRun());
  click('overMenu', () => setState('menu'));

  /* the bar every sub-screen wears: back on the left, home on the right
     (index.html:3073-3079). data-back buttons carry their own ids and are
     wired above; data-home buttons just go to the menu. */
  document.querySelectorAll('[data-home]').forEach((b) => {
    b.innerHTML = HOME_SVG;
    b.setAttribute('aria-label', 'Main menu');
    b.addEventListener('click', () => { Audio_.init(); Audio_.sfx('click'); setState('menu'); });
  });
  document.querySelectorAll('[data-back]').forEach((b) => b.setAttribute('aria-label', 'Back'));
}
