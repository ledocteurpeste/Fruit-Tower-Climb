export const GRAV = -26, JUMP = 11, MOVE = 7, TRAMP = 21, AIR = 0.72, CLIMB = 6;

export const player = {
  x: 0, y: 2, z: 0, vx: 0, vy: 0, vz: 0, r: 0.42, hh: 0.9,
  onGround: false, facing: 0, walk: 0, standingOn: null,
  respawn: { x: 0, y: 2, z: 0 }, dead: false, deadT: 0, deadKind: null,
  swing: null, swingCd: 0, climbing: false, climbHint: false,
  hasKey: false, celebrateUntil: 0,
};

export const opts = { music: true, sfx: true, cheat: false };
export const run = { lives: 3, coinsLevel: 0, coinsForLife: 0, runTime: 0,
  running: false, levelStartT: 0, levelIdx: 0 };
export const cam = { yaw: Math.PI, pitch: 0.42, dist: 10 };

export let world = null;
export function setWorld(w) { world = w; }

export function resetPlayerTo(p) {
  player.x = p.x; player.y = p.y; player.z = p.z;
  player.vx = player.vy = player.vz = 0;
  player.onGround = false; player.dead = false; player.swing = null;
  player.standingOn = null; player.swingCd = 0; player.climbing = false;
}
