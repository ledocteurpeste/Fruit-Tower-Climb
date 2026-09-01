// Keyboard + touch input, ported from index.html (INPUT section, ~2984-3025)
// plus checkOrient (index.html:3206-3209) and the input->world basis (index.html:3223-3231).
import { cam } from './state.js';
import { recenterCam } from './camera.js';

const keys = {};
const stick = { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
const look = { active: false, id: null, lx: 0, ly: 0 };
const MAXR = 55;

let stickZone, stickBase, stickNub;

function sStart(id, x, y) {
  stick.active = true; stick.id = id; stick.bx = x; stick.by = y; stick.dx = 0; stick.dy = 0;
  stickBase.style.display = 'block'; stickBase.style.left = (x - 66) + 'px'; stickBase.style.top = (y - 66) + 'px';
  stickNub.style.left = '50%'; stickNub.style.top = '50%';
}
function sMove(x, y) {
  let dx = x - stick.bx, dy = y - stick.by, l = Math.hypot(dx, dy);
  if (l > MAXR) { dx = dx / l * MAXR; dy = dy / l * MAXR; }
  stick.dx = dx / MAXR; stick.dy = dy / MAXR;
  stickNub.style.left = (50 + stick.dx * 50) + '%'; stickNub.style.top = (50 + stick.dy * 50) + '%';
}
function sEnd() {
  stick.active = false; stick.id = null; stick.dx = 0; stick.dy = 0;
  stickBase.style.display = 'none';
}
function inStick(x, y) {
  const r = stickZone.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}
function onActionBtn(el) {
  return !!(el && el.closest && el.closest('.actbtn,#pauseBtn,.btn,.toggle,.arrow'));
}

export function readInput() {
  let ix = 0, iz = 0;
  if (stick.active) { ix += stick.dx; iz += stick.dy; }
  if (keys['a'] || keys['arrowleft']) ix -= 1;
  if (keys['d'] || keys['arrowright']) ix += 1;
  if (keys['w'] || keys['arrowup']) iz -= 1;
  if (keys['s'] || keys['arrowdown']) iz += 1;
  const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
  // Camera-relative basis. Screen-right is cross(forward, up) = (-fZ, fX).
  const fX = -Math.sin(cam.yaw), fZ = -Math.cos(cam.yaw), rX = -fZ, rZ = fX;
  return { ix: rX * ix + fX * (-iz), iz: rZ * ix + fZ * (-iz) };
}

export function checkOrient() {
  const portrait = innerHeight > innerWidth;
  const phone = Math.min(innerWidth, innerHeight) < 560 && ('ontouchstart' in window);
  document.getElementById('rotate').style.display = (portrait && phone) ? 'flex' : 'none';
}

export function initControls({ onJump }) {
  stickZone = document.getElementById('stickZone');
  stickBase = document.getElementById('stickBase');
  stickNub = document.getElementById('stickNub');

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === ' ') onJump();
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  // Listen on the window: the HUD sits above the canvas with pointer-events:auto,
  // so touches land there and bubble to the document, never to the canvas.
  addEventListener('touchstart', e => {
    for (const tc of e.changedTouches) {
      if (onActionBtn(tc.target)) continue;
      if (!stick.active && inStick(tc.clientX, tc.clientY)) sStart(tc.identifier, tc.clientX, tc.clientY);
      else if (!look.active) { look.active = true; look.id = tc.identifier; look.lx = tc.clientX; look.ly = tc.clientY; }
    }
  }, { passive: true });
  addEventListener('touchmove', e => {
    for (const tc of e.changedTouches) {
      if (stick.active && tc.identifier === stick.id) sMove(tc.clientX, tc.clientY);
      else if (look.active && tc.identifier === look.id) {
        cam.yaw -= (tc.clientX - look.lx) * 0.006; cam.pitch += (tc.clientY - look.ly) * 0.006;
        cam.pitch = Math.max(-0.1, Math.min(1.15, cam.pitch)); look.lx = tc.clientX; look.ly = tc.clientY;
      }
    }
  }, { passive: true });
  addEventListener('touchend', e => {
    for (const tc of e.changedTouches) { if (tc.identifier === stick.id) sEnd(); if (tc.identifier === look.id) look.active = false; }
  }, { passive: true });

  let md = false, mlx = 0, mly = 0;
  addEventListener('mousedown', e => { if (!onActionBtn(e.target)) { md = true; mlx = e.clientX; mly = e.clientY; } });
  addEventListener('mouseup', () => md = false);
  addEventListener('mousemove', e => {
    if (!md) return;
    cam.yaw -= (e.clientX - mlx) * 0.005; cam.pitch += (e.clientY - mly) * 0.005;
    cam.pitch = Math.max(-0.1, Math.min(1.15, cam.pitch)); mlx = e.clientX; mly = e.clientY;
  });

  const jb = document.getElementById('jumpBtn'), lb = document.getElementById('lookBtn');
  ['touchstart', 'mousedown'].forEach(ev => jb.addEventListener(ev, e => { e.preventDefault(); onJump(); }, { passive: false }));
  ['touchstart', 'mousedown'].forEach(ev => lb.addEventListener(ev, e => { e.preventDefault(); recenterCam(); }, { passive: false }));

  addEventListener('resize', checkOrient); checkOrient();
}
