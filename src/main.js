/* Boot, state machine, and frame loop — Milestone 2 (physics online).
   Ported from index.html:2489-2519 (startLevel/startRun/fmtTime),
   3027-3070 (screens/setState/togglePause/click wiring), 3211-3238 (frame loop).
   Adapted to the real Task 1-10 module exports. */
import * as THREE from 'three';
import { player, run, opts, setWorld, resetPlayerTo, world } from './state.js';
import { installHooks, hooks } from './hooks.js';
import { buildLevel } from './levels.js';
import { physics, updateDynamics, tryJump, respawn } from './physics.js';
import {
  initScene, render, resize, ctx,
  buildSceneForLevel, syncDynamics, resetHazards,
  buildEnv, updateEnv, spawnSplash, updateSplash,
} from './scene.js';
import {
  loadCharacter, updateCharacter, startCharPreview, stopCharPreview,
} from './character.js';
import { applyCamera, recenterCam } from './camera.js';
import { initControls, readInput, checkOrient } from './controls.js';
import { Audio_ } from './audio.js';
import { levelComplete, nextLevel } from './flow.js';
import { prof, saveProfiles } from './profile.js';
import * as hud from './hud.js';

const canvas = document.getElementById('game');
const { scene, camera } = initScene(canvas);
resize(canvas);
addEventListener('resize', () => { resize(canvas); checkOrient(); });

/* -------------------------------------------------------------------------
   Hooks: physics.js / flow.js call into these; main supplies the effects.
   NOTE (task-11 corrections):
   - onDie must NOT touch run.lives / coin counters — physics.js owns those.
   - the frame loop must NOT re-run post-physics: physics() already does it.
   ------------------------------------------------------------------------- */
installHooks({
  sfx: (n) => Audio_.sfx(n),
  music: (a) => { Audio_.init(); if (a === 'stop') Audio_.stopMusic(); else if (opts.music) Audio_.startMusic(); },
  showMsg: (t, ms) => hud.showMsg(t, ms),
  onDie: () => {
    hud.updateHUD();
    if (!opts.cheat && run.lives <= 0) setTimeout(() => hooks.gameOver(), 700);
  },
  onRespawn: () => resetHazards(),
  onLevelComplete: () => levelComplete(),
  onWin: () => setState('win'),
  onCoin: () => { const p = prof(); if (p) { p.fruit = (p.fruit || 0) + 1; saveProfiles(); } },
  onCheckpoint: () => {},
  onSplash: (x, z) => spawnSplash(x, z),   // Task 14
  setState: (s) => setState(s),
  startNextLevel: (idx) => startLevel(idx),
  gameOver: () => { setState('over'); Audio_.stopMusic(); saveProfiles(); },   // index.html:2772
  levelInterstitial: (prevIdx) => hud.setLevelInterstitial(prevIdx),
  winStats: (t) => hud.setWinStats(t),
  winName: (nm) => {
    const el = document.getElementById('nameLabel');
    if (el) el.textContent = 'Nice one, ' + nm + ' — you’re on the board! 🏆';
  },
});

/* --- state machine (index.html:3031-3043) --- */
let state = 'menu';
function setState(s) {
  const prev = state;
  state = s;
  hud.showScreen(s);
  run.running = (s === 'play');
  if (s === 'play') { Audio_.init(); if (opts.music) Audio_.startMusic(); }
  if (s === 'over' || s === 'win' || s === 'menu') Audio_.stopMusic();
  // char-select 3D preview: spin up on enter, fully tear down on leave
  if (s === 'char' && prev !== 'char') {
    startCharPreview(document.getElementById('charMid'), hud.getChosen());
  } else if (prev === 'char' && s !== 'char') {
    stopCharPreview();
  }
}

/* --- startLevel (index.html:2489-2502) --- */
function startLevel(idx) {
  run.levelIdx = idx;
  const w = buildLevel(idx);
  setWorld(w);
  Audio_.setTheme(idx);
  player.respawn = { x: w.spawn.x, y: w.spawn.y, z: w.spawn.z };
  resetPlayerTo(w.spawn);
  run.coinsLevel = 0;
  run.levelStartT = run.runTime;
  player.climbHint = false;
  player.hasKey = false;
  player.celebrateUntil = 0;
  buildSceneForLevel(w);
  buildEnv(w.theme);
  resetHazards();
  recenterCam();                       // controls' look-drag isn't game-state gated
  const T = w.theme, c = ctx();
  if (c) {
    c.scene.background = new THREE.Color(T.sky[0], T.sky[1], T.sky[2]);
    if (c.scene.fog) c.scene.fog.color.setRGB(T.fog[0], T.fog[1], T.fog[2]);
  }
  hud.updateHUD();
  hud.showMsg(T.emoji + ' ' + T.name + ' Tower — climb!');
}

/* --- character select index, seeded from localStorage (index.html:1314) --- */
let chosen = 0;
try { chosen = Math.max(0, parseInt(localStorage.getItem('ft_char') || '0', 10) || 0); } catch (e) { /* private mode */ }
hud.setChosen(chosen);

/* --- startRun (index.html:2503-2509) --- */
function startRun() {
  run.lives = 3;
  run.coinsForLife = 0;
  run.runTime = 0;
  chosen = hud.getChosen();
  try { localStorage.setItem('ft_char', String(chosen)); } catch (e) { /* private mode */ }
  setState('play');
  startLevel(0);
}

function togglePause() {
  if (state === 'play') setState('pause');
  else if (state === 'pause') setState('play');
}

initControls({ onJump: tryJump });
hud.wireToggles();
hud.updateMenuWho();
hud.wireMenu({
  startRun, setState, togglePause, nextLevel,
  restartLevel: () => { setState('play'); startLevel(run.levelIdx); },
});

loadCharacter('robot')
  .then((g) => scene.add(g))
  .catch((err) => console.error('character load failed', err));

/* --- frame loop (index.html:3211-3238) --- */
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
  const t = now / 1000;
  if (state === 'play' && run.running && world) {
    updateDynamics(dt, t);
    if (player.dead) {
      player.deadT += dt;
      const wait = player.deadKind === 'water' ? 1.15 : 0.7;
      if (player.deadT > wait && (opts.cheat || run.lives > 0)) respawn();
    } else {
      run.runTime += dt;
      if (player.swingCd > 0) player.swingCd -= dt;
      const { ix, iz } = readInput();
      physics(dt, t, ix, iz);          // physics() runs the post-physics pass itself
      if ((now | 0) % 4 === 0) hud.updateHUD();
    }
    updateSplash(dt);
    updateEnv(t);
  }
  syncDynamics(t);
  updateCharacter(dt, t);
  applyCamera(camera, player);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* Keep the audio context alive across tab-switch / lock-screen (index.html:3240-3244) */
['pointerdown', 'touchstart', 'keydown'].forEach((e) =>
  addEventListener(e, () => { Audio_.init(); Audio_.kick(); }, { passive: true }));
document.addEventListener('visibilitychange', () => { if (!document.hidden) Audio_.kick(); });
setInterval(() => Audio_.kick(), 2000);

setState('menu');
