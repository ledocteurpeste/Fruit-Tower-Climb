# Three.js Engine Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Fruit Tower Climb's custom raw-WebGL renderer with a retained Three.js scene graph and a glTF player character, deleting the block-character costume system, while keeping physics, levels, audio, camera, controls, and the DOM HUD.

**Architecture:** New `game.html` + `src/*.js` ES modules, parallel to the untouched `index.html` until parity. Three.js loads via `<script type="importmap">` from jsdelivr — no bundler, no npm dependencies. Pure-logic modules (physics, levels, camera math, profile migration, character state machine) are DOM-free and tested with Node's built-in `node:test`. Rendering is verified by a documented manual browser checklist per milestone. Renderer-independent code (physics, level data, WebAudio, HUD) is extracted from `index.html` into modules with minimal edits.

**Tech Stack:** Three.js 0.160.0 (CDN, importmap), `GLTFLoader` addon, vanilla ES modules, Node 22 `node:test` for unit tests, a static file server for manual checks.

**Spec:** `docs/superpowers/specs/2026-08-31-threejs-engine-port-design.md`

## Global Constraints

- No bundler, no build step, no npm **dependencies**. `package.json` may exist but only to declare a `test` script; `node --test` is built in, no `npm install` is ever required.
- Three.js is pinned to exactly `0.160.0`, loaded from `https://cdn.jsdelivr.net/npm/three@0.160.0/` via importmap (`three` → `build/three.module.js`, `three/addons/` → `examples/jsm/`). This matches `gltf-test.html`.
- The folder must be served together (ES modules + importmap need HTTP). Local testing: `python3 -m http.server 8777` from the repo root.
- `index.html` is not touched until the final task. The old game stays playable throughout.
- Single owner per mutable datum: `player`, `world`, `opts`, and game-run state live in `src/state.js` and nowhere else. Modules import it; they never re-declare these.
- Side effects out of pure modules (`audio`, `showMsg`, level-flow callbacks) go through `src/hooks.js`, whose defaults are no-ops. `main.js` installs the real implementations; tests install spies.
- Placeholder world meshes share a geometry pool and use `MeshStandardMaterial`. Colors come from existing level data (`item.c`, a `[r,g,b]` 0..1 array from `C()`), else a per-type default.
- The character glTF slot uses `RobotExpressive.glb` for every character id until real models exist. Licence for any added `.glb` is recorded in `assets/README.md` (RobotExpressive: CC-BY, three.js examples).
- `localStorage` keys are unchanged: `ft_opts`, `ft_scores`, `ft_profiles`, `ft_char`.
- Conventional-commit messages. Every commit ends with the repo's `Co-Authored-By` / `Claude-Session` trailers (see recent history).

---

## File Structure

| File | Responsibility | DOM/three? |
|---|---|---|
| `game.html` | Menu/HUD markup + CSS (from `index.html`, costume UI removed), importmap, `<script type="module" src="src/main.js">` | — |
| `src/main.js` | Boot, state-machine transitions, `requestAnimationFrame` loop, installs `hooks`, wires modules | browser |
| `src/state.js` | Owns `player`, `world`, `opts`, `run` (lives/timers/flags), `cam`. Plain objects + small mutators. Constants (`GRAV`, `JUMP`, …) | pure |
| `src/hooks.js` | `hooks` object: `sfx`, `music`, `showMsg`, `onDie`, `onRespawn`, `onLevelComplete`, `onWin`, `onCoin`, `onCheckpoint`, `onSplash`. Defaults: no-ops | pure |
| `src/physics.js` | `physics()`, `updateDynamics()`, `postPhysics()`, `aabbH/aabbV/onDisc`, swing (`swingHandle/swingStep/releaseSwing`), `tryJump` | pure |
| `src/levels.js` | `THEMES`, `FRUIT`, `buildLevel(idx)`, `C()`, `mixc()` | pure |
| `src/camera.js` | `cameraEye(player, cam)` (pure), `applyCamera(threeCamera, player, cam)`, `recenterCam()`, orbit input handlers | split |
| `src/controls.js` | keyboard map, touch stick, look-drag, jump button, `checkOrient`, `readInput()` → `{ix, iz}` | browser |
| `src/scene.js` | Three renderer/scene/lights/fog, `REGISTRY`, geometry pool, `loadAssets()`, `buildSceneForLevel(world)`, `syncDynamics()`, environment + splash groups | browser + three |
| `src/character.js` | `loadCharacter(id)`, `updateCharacter(dt)` (mixer + state machine), `charSelectPreview` (start/stop/spin), `CHARACTERS` | browser + three |
| `src/audio.js` | `Audio_` object, verbatim from `index.html` | browser |
| `src/hud.js` | `updateHUD`, `showMsg`, screens map, `setState` DOM side, profiles, leaderboard, options, pause, char-select shell wiring | browser |
| `test/*.test.js` | Node `node:test` suites for the pure modules | node |
| `assets/README.md` | Asset licence log | — |
| `assets/character/RobotExpressive.glb` | Player placeholder model | — |

---

## Task 0: Test harness and scaffolding

**Files:**
- Create: `package.json`
- Create: `test/smoke.test.js`
- Create: `src/.gitkeep`
- Create: `assets/README.md`

**Interfaces:**
- Produces: `npm test` / `node --test` runs `test/*.test.js`.

- [ ] **Step 1: Write `package.json`** (no dependencies)

```json
{
  "name": "fruit-tower-climb",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test test/"
  }
}
```

- [ ] **Step 2: Write a smoke test**

`test/smoke.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('node:test harness runs', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 3: Run it**

Run: `node --test test/`
Expected: PASS, 1 test.

- [ ] **Step 4: Create asset log and download the placeholder model**

`assets/README.md`:
```markdown
# Assets

| File | Source | Licence |
|---|---|---|
| character/RobotExpressive.glb | three.js examples | CC-BY (Tomás Laulhé / Don McCurdy) |
```

Run:
```bash
mkdir -p assets/character src
touch src/.gitkeep
curl -L -o assets/character/RobotExpressive.glb \
  https://raw.githubusercontent.com/mrdoob/three.js/r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb
```
Expected: file is ~2 MB, `file assets/character/RobotExpressive.glb` reports data.

- [ ] **Step 5: Commit**

```bash
git add package.json test/ src/.gitkeep assets/
git commit -m "chore: add node:test harness and placeholder character asset"
```

---

## Task 1: `src/state.js` — shared state and constants

**Files:**
- Create: `src/state.js`
- Create: `test/state.test.js`

**Interfaces:**
- Produces:
  - `player` — object: `{x,y,z, vx,vy,vz, r:0.42, hh:0.9, onGround:false, facing:0, walk:0, standingOn:null, respawn:{x,y,z}, dead:false, deadT:0, deadKind:null, swing:null, swingCd:0, climbing:false, climbHint:false, hasKey:false, celebrateUntil:0}`
  - `world` — `let`, starts `null`; `setWorld(w)` setter
  - `opts` — `{music:true, sfx:true, cheat:false}`
  - `run` — `{lives:3, coinsLevel:0, coinsForLife:0, runTime:0, running:false, levelStartT:0, levelIdx:0}`
  - `cam` — `{yaw:Math.PI, pitch:0.42, dist:10}`
  - constants: `GRAV:-26, JUMP:11, MOVE:7, TRAMP:21, AIR:0.72, CLIMB:6`
  - `resetPlayerTo(p)` — copies `p.{x,y,z}` into player, zeroes velocity, clears `onGround/dead/swing/standingOn/swingCd/climbing`

- [ ] **Step 1: Write the failing test**

`test/state.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { player, resetPlayerTo, GRAV } from '../src/state.js';

test('constants match the original engine', () => {
  assert.equal(GRAV, -26);
});

test('resetPlayerTo moves the player and clears motion', () => {
  player.vx = 5; player.dead = true; player.onGround = true;
  resetPlayerTo({ x: 1, y: 2, z: 3 });
  assert.deepEqual([player.x, player.y, player.z], [1, 2, 3]);
  assert.equal(player.vx, 0);
  assert.equal(player.dead, false);
  assert.equal(player.onGround, false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/state.test.js`
Expected: FAIL — cannot find module `../src/state.js`.

- [ ] **Step 3: Implement `src/state.js`**

Port the literals from `index.html:2472-2482`. Structure:
```js
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
```

Note: `world` is exported `let`; importers that need the current value read the binding (`import { world } from ...`) which reflects `setWorld`. Physics reads `world` at call time, so this is safe.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/state.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state.js test/state.test.js
git commit -m "feat: add shared state module (player, world, opts, constants)"
```

---

## Task 2: `src/hooks.js` — side-effect seam

**Files:**
- Create: `src/hooks.js`
- Create: `test/hooks.test.js`

**Interfaces:**
- Produces: `hooks` — object with no-op methods: `sfx(name)`, `music(action)`, `showMsg(text, ms)`, `onDie(kind)`, `onRespawn()`, `onLevelComplete()`, `onWin()`, `onCoin(coin)`, `onCheckpoint(chk)`, `onSplash(x, z)`. And `installHooks(partial)` which `Object.assign`s over `hooks`.

- [ ] **Step 1: Write the failing test**

`test/hooks.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hooks, installHooks } from '../src/hooks.js';

test('defaults are callable no-ops', () => {
  assert.doesNotThrow(() => hooks.sfx('jump'));
  assert.equal(hooks.showMsg('hi', 100), undefined);
});

test('installHooks overrides selected methods', () => {
  const calls = [];
  installHooks({ sfx: (n) => calls.push(n) });
  hooks.sfx('coin');
  assert.deepEqual(calls, ['coin']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/hooks.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/hooks.js`**

```js
const noop = () => {};
export const hooks = {
  sfx: noop, music: noop, showMsg: noop,
  onDie: noop, onRespawn: noop, onLevelComplete: noop, onWin: noop,
  onCoin: noop, onCheckpoint: noop, onSplash: noop,
};
export function installHooks(partial) { Object.assign(hooks, partial); }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/hooks.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks.js test/hooks.test.js
git commit -m "feat: add hooks module for side-effect injection"
```

---

## Task 3: `src/levels.js` — themes, fruit, level builder

**Files:**
- Create: `src/levels.js`
- Modify: source lines `index.html:1587-2469` (THEMES, FRUIT, fruitBody/cutFace are draw-only — exclude those; keep data + `buildLevel`)
- Create: `test/levels.test.js`

**Interfaces:**
- Consumes: nothing (self-contained data).
- Produces:
  - `C(hex)` → `[r,g,b]` in 0..1
  - `mixc(a, b, t)` → `[r,g,b]`
  - `THEMES` — array of 3 theme objects
  - `FRUIT` — fruit shape table
  - `buildLevel(idx)` → `world` object: `{ theme, solids[], spikes[], fans[], swings[], checks[], coins[], npcs[], keys[], cages[], ports[], goal, finish, arch, spawn }`

- [ ] **Step 1: Write the failing test**

`test/levels.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, C, THEMES } from '../src/levels.js';

test('C converts hex to normalized rgb', () => {
  assert.deepEqual(C(0xff0000), [1, 0, 0]);
});

test('there are three themes', () => {
  assert.equal(THEMES.length, 3);
});

for (const idx of [0, 1, 2]) {
  test(`buildLevel(${idx}) produces a traversable world`, () => {
    const w = buildLevel(idx);
    assert.ok(w.spawn && typeof w.spawn.y === 'number');
    assert.ok(Array.isArray(w.solids) && w.solids.length > 5);
    assert.ok(w.goal || w.finish, 'has an end marker');
    // every solid has a collision footprint
    for (const s of w.solids) {
      const sized = (s.w && s.h && s.d) || (s.r && s.h) || s.type === 'disc';
      assert.ok(sized, `solid ${JSON.stringify(s).slice(0,80)} has size`);
    }
  });
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/levels.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/levels.js`**

Copy these ranges from `index.html` into the module, in order, and add `export`:
- `C`, `mixc` (`index.html:919-920`) — `export function C`, `export function mixc`.
- `THEMES` (`index.html:1587` to its closing `];`) — `export const THEMES`.
- `FRUIT` (`index.html:1605` to closing `};`) — `export const FRUIT`.
- `buildLevel` (`index.html:2078` to its closing `}` near line 2469) — `export function buildLevel`.

Remove from the copied `buildLevel` body any call into draw functions (there are none — `buildLevel` only pushes data). If `buildLevel` references `RAINBOW` (`index.html:2077`), copy that const too. If it references `Audio_`, route through `hooks` (check: it should not).

Do **not** copy `fruitBody`, `cutFace`, `drawWhole`, or any `draw*`.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/levels.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/levels.js test/levels.test.js
git commit -m "feat: extract level data and builder into src/levels.js"
```

---

## Task 4: `src/physics.js` — collision, dynamics, swing

**Files:**
- Create: `src/physics.js`
- Modify: source lines `index.html:2526-2741` (collision helpers, `updateDynamics`, `physics`, `postPhysics`, swing, `tryJump`)
- Create: `test/physics.test.js`

**Interfaces:**
- Consumes: `player`, `world`, `run`, constants, `resetPlayerTo` from `src/state.js`; `hooks` from `src/hooks.js`.
- Produces:
  - `aabbH(px,py,pz,s)`, `aabbV(px,py,pz,s)`, `onDisc(px,pz,s)` → boolean
  - `updateDynamics(dt, t)` — advances moving/spinning/crumbling solids; sets `s.dx/s.dy/s.dz`, `s.ang`, `s.fall`, `s.timer`
  - `physics(dt, t, inx, inz)` — integrates the player against `world`
  - `postPhysics(t)` — coins, checkpoints, keys, cages, finish, goal; calls `hooks.onCoin/onCheckpoint/onLevelComplete/onWin`
  - `swingHandle(sw)`, `swingStep(dt,inx,inz)`, `releaseSwing()`
  - `tryJump()`
  - `die(kind)`, `respawn()` — call `hooks.onDie` / `hooks.onRespawn`

- [ ] **Step 1: Write the failing test**

`test/physics.test.js`:
```js
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { player, run, setWorld, resetPlayerTo } from '../src/state.js';
import { installHooks } from '../src/hooks.js';
import { physics, aabbV, onDisc, die } from '../src/physics.js';

function flatWorld() {
  return {
    theme: {}, solids: [{ type: 'box', x: 0, y: 0, z: 0, w: 20, h: 2, d: 20 }],
    spikes: [], fans: [], swings: [], checks: [], coins: [],
    npcs: [], keys: [], cages: [], ports: [], goal: null, finish: null, arch: null,
    spawn: { x: 0, y: 3, z: 0 },
  };
}

beforeEach(() => {
  setWorld(flatWorld());
  resetPlayerTo({ x: 0, y: 3, z: 0 });
  run.running = true;
  installHooks({ onDie: () => { player.dead = true; } });
});

test('player falls under gravity and lands on the box top', () => {
  for (let i = 0; i < 120; i++) physics(1 / 60, i / 60, 0, 0);
  assert.ok(player.onGround, 'should be grounded');
  assert.ok(Math.abs(player.y - (1 + player.hh)) < 0.05, `y=${player.y}`);
});

test('walking off the edge and below y=-1 triggers a water death', () => {
  player.x = 100; // off the platform
  for (let i = 0; i < 240; i++) physics(1 / 60, i / 60, 0, 0);
  assert.equal(player.dead, true);
});

test('onDisc is a radial test', () => {
  assert.equal(onDisc(0, 0, { x: 0, z: 0, r: 2 }), true);
  assert.equal(onDisc(5, 0, { x: 0, z: 0, r: 2 }), false);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/physics.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/physics.js`**

Copy from `index.html`, in this order, adding `export` to each top-level function:
- `aabbH`, `aabbV`, `onDisc` (`index.html:2526-2531`)
- `die` (`index.html:2533-2540`) — replace the body's `Audio_.sfx(...)` with `hooks.sfx(...)`, `spawnSplash(...)` with `hooks.onSplash(...)`, keep the `player.dead/deadT/deadKind` writes; call `hooks.onDie(kind)` at the end.
- `respawn` (`index.html:2541`) — `resetPlayerTo(player.respawn)`; replace `resetHazards()` with `hooks.onRespawn()`; replace `showMsg(...)` with `hooks.showMsg(...)`.
- `updateDynamics` (`index.html:2543-2558`) — replace `Audio_.sfx('crack')` with `hooks.sfx('crack')`. Keep the hard-coded `30` gravity for crumble fall.
- `physics` (`index.html:2560-2643`) — replace `swingStep` call stays internal; replace `Audio_.sfx(...)` → `hooks.sfx(...)`; `showMsg(...)` → `hooks.showMsg(...)`; `die(...)` stays (local). Keep every collision branch and constant.
- `postPhysics` (`index.html:2644-2717`) — replace `Audio_.sfx` → `hooks.sfx`; `showMsg` → `hooks.showMsg`; coin pickup → also `hooks.onCoin(c)`; checkpoint → `hooks.onCheckpoint(ck)`; `levelComplete()` → `hooks.onLevelComplete()`; `winGame()` → `hooks.onWin()`; keep `player.hasKey`, cage-open, celebrate logic.
- swing block (`index.html:2718-2735`): `swingHandle`, `swingStep`, `releaseSwing` — `Audio_.sfx` → `hooks.sfx`.
- `tryJump` (`index.html:2737-2740`) — guard on `run.running` instead of `state==='play'&&running`; `Audio_.sfx` → `hooks.sfx`.

Imports at top:
```js
import { player, world, run, cam, GRAV, JUMP, MOVE, TRAMP, AIR, CLIMB, resetPlayerTo } from './state.js';
import { hooks } from './hooks.js';
```
Anywhere the original read a bare `world`, it now reads the imported binding (reflects `setWorld`). Anywhere it read `cam` (swing/jump use camera yaw? verify — if not, drop the `cam` import).

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/physics.test.js`
Expected: PASS, 3 tests. If the landing test is off by the `FT`/`hh` offset, adjust the assertion tolerance, not the physics.

- [ ] **Step 5: Run the whole suite**

Run: `node --test test/`
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add src/physics.js test/physics.test.js
git commit -m "feat: extract physics, dynamics, and swing into src/physics.js"
```

---

## Task 5: `src/camera.js` — orbit rig

**Files:**
- Create: `src/camera.js`
- Modify: source lines `index.html:2785-2787` (eye formula), `index.html:3021` (`recenterCam`)
- Create: `test/camera.test.js`

**Interfaces:**
- Consumes: `cam`, `player` from `src/state.js`.
- Produces:
  - `cameraEye(player, cam)` → `{ eye: [x,y,z], look: [x,y,z] }` — pure
  - `applyCamera(threeCamera)` — sets `threeCamera.position` / calls `lookAt` using `cameraEye`
  - `recenterCam()` — `cam.yaw = Math.PI; cam.pitch = 0.42`
  - `VFOV_RAD = 1.05` (the vertical FOV the old `M.perspective` used; `character`/`main` convert to degrees for `PerspectiveCamera`)

- [ ] **Step 1: Write the failing test**

`test/camera.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraEye } from '../src/camera.js';

test('eye sits behind and above the player, looking at their head', () => {
  const cam = { yaw: Math.PI, pitch: 0.42, dist: 10 };
  const p = { x: 0, y: 0, z: 0 };
  const { eye, look } = cameraEye(p, cam);
  assert.ok(eye[1] > 1.5, 'above the player');
  assert.ok(Math.abs(eye[2]) > 3, 'pulled back on z');
  assert.deepEqual(look, [0, 0.7, 0]);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/camera.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/camera.js`**

```js
import { cam as camState } from './state.js';

export const VFOV_RAD = 1.05;

export function cameraEye(player, cam) {
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  return {
    eye: [
      player.x + Math.sin(cam.yaw) * cam.dist * cp,
      player.y + 1.5 + cam.dist * sp,
      player.z + Math.cos(cam.yaw) * cam.dist * cp,
    ],
    look: [player.x, player.y + 0.7, player.z],
  };
}

export function applyCamera(threeCamera, player) {
  const { eye, look } = cameraEye(player, camState);
  threeCamera.position.set(eye[0], eye[1], eye[2]);
  threeCamera.lookAt(look[0], look[1], look[2]);
}

export function recenterCam() { camState.yaw = Math.PI; camState.pitch = 0.42; }
```

(The eye formula is `index.html:2785-2787` verbatim; `+0.7` look target matches the old `lookAt`.)

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/camera.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/camera.js test/camera.test.js
git commit -m "feat: add camera orbit rig module"
```

---

## Task 6: `src/audio.js` — WebAudio synth, verbatim

**Files:**
- Create: `src/audio.js`
- Modify: source lines `index.html:925-985` (the `Audio_` object)

**Interfaces:**
- Consumes: `opts` from `src/state.js` (the object reads `opts.music` / `opts.sfx`).
- Produces: `Audio_` — default export or named; methods `init`, `resume`, `kick`, `tone`, `noise`, `sfx(name)`, `setTheme(k)`, `startMusic`, `stopMusic`.

- [ ] **Step 1: Copy the object**

Copy `const Audio_ = { ... }` from `index.html:925` to its closing `};`. Prepend `import { opts } from './state.js';`. Change `const Audio_` to `export const Audio_`. No other edits — it only touches `window.AudioContext`, `opts`, and its own fields.

- [ ] **Step 2: Sanity import test**

`test/audio.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('audio module imports without a DOM', async () => {
  const mod = await import('../src/audio.js');
  assert.equal(typeof mod.Audio_.sfx, 'function');
});
```
Run: `node --test test/audio.test.js`
Expected: PASS (module loads; `init()` is never called in Node).

- [ ] **Step 3: Commit**

```bash
git add src/audio.js test/audio.test.js
git commit -m "feat: extract WebAudio synth into src/audio.js"
```

---

## Task 7: `game.html` — markup, CSS, importmap (Milestone 1a)

**Files:**
- Create: `game.html` (from `index.html` head+body, edited)

**Interfaces:**
- Produces: a served page with `<canvas id="game">`, the HUD (`#topbar`, `#coinPill`, `#coinCount`, `#timer`, `#lives`, `#pauseBtn`, `#centerMsg`, `#stickZone`/`#stickBase`/`#stickNub`, `#lookBtn`, `#jumpBtn`), all screen divs (`mainMenu`, `optionsScreen`, `leaderScreen`, `charScreen`, `pauseScreen`, `levelScreen`, `winScreen`, `overScreen`, `quitScreen`, `profileScreen`), and `<script type="importmap">` + `<script type="module" src="src/main.js">`.

- [ ] **Step 1: Copy `index.html` to `game.html`.**

```bash
cp index.html game.html
```

- [ ] **Step 2: Remove the old inline engine.**

In `game.html`, delete the entire `<script> ... </script>` block that starts at the line matching `/* --------------------------- mat4 --` and runs to the final `requestAnimationFrame(frame);` before `</body>` (in `index.html` this is roughly lines 744–3239 — the one big script). Leave the `<head>` `<style>` and all body markup.

- [ ] **Step 3: Remove costume/accessory markup.**

Delete these elements and their children from `game.html`:
- `#accDrawer` block (whole `<div id="accDrawer" ...> ... </div>`)
- Inside `#charScreen`: `#cosCol` (the `▲`/`▼` costume arrows) and the `#accBtn` button
- `#unlockNote` element (in the win screen)

Delete the now-unused CSS rules: `#accDrawer`, `#accDrawer h2`, `#accDrawer .tag`, `#accDrawer #accClose`, `#accGrid`, `#accEmpty`, `#unlockNote`, `#cosCol`, `.arrow` (verify `.arrow` is not used elsewhere first with a grep; if it is, keep it).

- [ ] **Step 4: Add the importmap and module script.**

Immediately before `</body>`:
```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
<script type="module" src="src/main.js"></script>
```

- [ ] **Step 5: Create a stub `src/main.js` so the page loads.**

```js
console.log('Fruit Tower Climb — Three.js port booting');
```

- [ ] **Step 6: Manual check.**

Run: `python3 -m http.server 8777` then open `http://localhost:8777/game.html`.
Expected: the intro screen and menu render (they are pure HTML/CSS). Console prints the boot line. No JS errors except that nothing is interactive yet. The old `http://localhost:8777/index.html` still works fully.

- [ ] **Step 7: Commit**

```bash
git add game.html src/main.js
git commit -m "feat: add game.html shell with importmap, costume UI removed"
```

---

## Task 8: `src/scene.js` — renderer, lights, geometry pool (Milestone 1b)

**Files:**
- Create: `src/scene.js`

**Interfaces:**
- Consumes: `three`.
- Produces:
  - `initScene(canvas)` → `{ renderer, scene, camera, levelGroup, envGroup }`
  - `GEO` — `{ box, cyl, cone, sphere }` shared `BufferGeometry` (unit-sized: box 1×1×1, cyl r=1 h=1, cone r=1 h=1, sphere r=1)
  - `mat(color)` → cached `MeshStandardMaterial` keyed by color string
  - `resize(renderer, camera, canvas)` — DPR-capped, updates aspect
  - `render()` — `renderer.render(scene, camera)`

- [ ] **Step 1: Implement `src/scene.js`.**

```js
import * as THREE from 'three';
import { VFOV_RAD } from './camera.js';

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
  cone: new THREE.ConeGeometry(1, 1, 20),
  sphere: new THREE.SphereGeometry(1, 20, 14),
};

const _mats = new Map();
export function mat(color) {
  const key = Array.isArray(color) ? color.join(',') : String(color);
  if (!_mats.has(key)) {
    const c = Array.isArray(color)
      ? new THREE.Color(color[0], color[1], color[2])
      : new THREE.Color(color);
    _mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }));
  }
  return _mats.get(key);
}

let _ctx = null;

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fд0ff <<< PLACEHOLDER — use 0x8fd0ff);
  scene.fog = new THREE.Fog(0x8fd0ff, 40, 260);

  const camera = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(VFOV_RAD), canvas.clientWidth / canvas.clientHeight, 0.1, 600);

  scene.add(new THREE.HemisphereLight(0xdfefff, 0x2f3a44, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 80;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 220 });
  scene.add(sun);

  const levelGroup = new THREE.Group();
  const envGroup = new THREE.Group();
  scene.add(levelGroup, envGroup);

  _ctx = { renderer, scene, camera, levelGroup, envGroup, sun };
  return _ctx;
}

export function resize(canvas) {
  if (!_ctx) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  _ctx.renderer.setSize(w, h, false);
  _ctx.camera.aspect = w / h;
  _ctx.camera.updateProjectionMatrix();
}

export function render() { if (_ctx) _ctx.renderer.render(_ctx.scene, _ctx.camera); }
export function ctx() { return _ctx; }
```

Fix the deliberately-broken `scene.background` line to exactly `scene.background = new THREE.Color(0x8fd0ff);` (the `<<<` marker is there so this step cannot be copy-pasted blind — set sky color to match the old `drawEnv` horizon; check `index.html` `drawEnv` for the real value and use that).

- [ ] **Step 2: Wire a spinning cube into `src/main.js` to prove the renderer.**

```js
import * as THREE from 'three';
import { initScene, render, resize, GEO, mat } from './scene.js';

const canvas = document.getElementById('game');
const { scene } = initScene(canvas);
const cube = new THREE.Mesh(GEO.box, mat(0xff4d6d));
cube.position.y = 3; scene.add(cube);

addEventListener('resize', () => resize(canvas));
resize(canvas);

function frame(now) {
  cube.rotation.y = now / 1000;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [ ] **Step 3: Manual check.**

Open `http://localhost:8777/game.html`. Expected: a pink cube spinning on a sky-colored background behind the menu. No console errors. Resize the window — cube stays centered, not stretched.

- [ ] **Step 4: Commit**

```bash
git add src/scene.js src/main.js
git commit -m "feat: add Three.js scene, lights, and shared geometry pool"
```

---

## Task 9: `src/character.js` — glTF load + state machine (Milestone 1c)

**Files:**
- Create: `src/character.js`

**Interfaces:**
- Consumes: `three`, `three/addons/loaders/GLTFLoader.js`, `player` from `src/state.js`.
- Produces:
  - `CHARACTERS` — `[{ id, name, glb }]` (start with one entry: `{ id: 'robot', name: 'Test Bot', glb: 'assets/character/RobotExpressive.glb' }`)
  - `loadCharacter(id)` → `Promise<THREE.Group>` (`playerGroup`, added by caller to the scene)
  - `updateCharacter(dt)` — advances the mixer, evaluates the state machine, positions `playerGroup` from `player`
  - `characterState()` → one of `'idle'|'run'|'jump'|'climb'|'swing'|'cheer'|'dead'` (pure, exported for testing)

- [ ] **Step 1: Write the failing test** (state machine only — no three needed if `characterState` takes player explicitly)

`test/character-state.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickState } from '../src/character.js';

const base = { dead: false, celebrateUntil: 0, swing: null, climbing: false,
  onGround: true, vx: 0, vz: 0 };

test('grounded and still → idle', () => {
  assert.equal(pickState({ ...base }, 0), 'idle');
});
test('grounded and moving → run', () => {
  assert.equal(pickState({ ...base, vx: 3 }, 0), 'run');
});
test('airborne → jump', () => {
  assert.equal(pickState({ ...base, onGround: false }, 0), 'jump');
});
test('dead wins over everything', () => {
  assert.equal(pickState({ ...base, dead: true, onGround: false }, 0), 'dead');
});
test('celebrate window → cheer', () => {
  assert.equal(pickState({ ...base, celebrateUntil: 5 }, 3), 'cheer');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/character-state.test.js`
Expected: FAIL — module not found. (This test imports only `pickState`; keep `pickState` free of any `three` import by putting it above the `import * as THREE` line is not possible — instead, put `pickState` in the module but ensure the module's top-level `three` import is dynamic OR accept that this test needs three. Simpler: `node --test` will try to load `three` from the importmap, which fails in Node. **Resolution:** put `pickState` in its own file `src/character-state.js` with no three import; `src/character.js` re-exports it.)

Adjust: create `src/character-state.js`:
```js
export function pickState(player, t) {
  if (player.dead) return 'dead';
  if (player.celebrateUntil > t) return 'cheer';
  if (player.swing) return 'swing';
  if (player.climbing) return 'climb';
  if (!player.onGround) return 'jump';
  if (Math.hypot(player.vx, player.vz) > 0.6) return 'run';
  return 'idle';
}
```
Point the test at `../src/character-state.js`.

- [ ] **Step 3: Run to verify it passes**

Run: `node --test test/character-state.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 4: Implement `src/character.js`.**

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { player } from './state.js';
import { pickState } from './character-state.js';
export { pickState };

export const CHARACTERS = [
  { id: 'robot', name: 'Test Bot', glb: 'assets/character/RobotExpressive.glb' },
];

// RobotExpressive clip names by state; fallbacks for the ones it lacks.
const CLIP = {
  idle: 'Idle', run: 'Running', jump: 'Jump', climb: 'Walking',
  swing: 'Jump', cheer: 'Dance', dead: 'Death',
};

let model = null, mixer = null, actions = {}, active = null, lastState = 'idle';
const playerGroup = new THREE.Group();
let footOffset = 0;

export function loadCharacter(id) {
  const def = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(def.glb, (gltf) => {
      while (playerGroup.children.length) playerGroup.remove(playerGroup.children[0]);
      model = gltf.scene;
      model.scale.setScalar(0.35);
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(model);
      footOffset = -box.min.y * 0.35; // feet to group origin; group origin sits at player.y - hh
      playerGroup.add(model);
      mixer = new THREE.AnimationMixer(model);
      actions = {};
      gltf.animations.forEach((c) => { actions[c.name] = mixer.clipAction(c); });
      active = null; lastState = 'idle';
      setAction(resolveAction('idle'));
      resolve(playerGroup);
    }, undefined, reject);
  });
}

function resolveAction(state) {
  return actions[CLIP[state]] || actions[CLIP.idle] || Object.values(actions)[0] || null;
}
function setAction(to) {
  if (!to || active === to) return;
  if (active) active.fadeOut(0.2);
  to.reset().fadeIn(0.2).play();
  active = to;
}

export function updateCharacter(dt, t) {
  if (!model) return;
  playerGroup.position.set(player.x, player.y - player.hh + footOffset, player.z);
  playerGroup.rotation.y = player.facing;
  const st = pickState(player, t);
  if (st !== lastState) { setAction(resolveAction(st)); lastState = st; }
  if (mixer) mixer.update(dt);
}

export function characterGroup() { return playerGroup; }
```

- [ ] **Step 5: Wire into `src/main.js`** — replace the spinning cube: `initScene`, `loadCharacter('robot').then(g => scene.add(g))`, and in `frame` call `updateCharacter(dt, t)` + `applyCamera(camera, player)` + `render()`. Set `player.y = 3` so it drops into view; no physics yet, so also temporarily set `player.onGround = true` after a second to see idle.

- [ ] **Step 6: Manual check.**

Open `game.html`. Expected: RobotExpressive stands on nothing at the origin, playing Idle, shadow cast on... nothing yet (no ground). Camera is behind/above. No console errors.

- [ ] **Step 7: Commit**

```bash
git add src/character.js src/character-state.js test/character-state.test.js src/main.js
git commit -m "feat: add glTF character loader and animation state machine"
```

---

## Task 10: `src/controls.js` — keyboard + touch (Milestone 1d)

**Files:**
- Create: `src/controls.js`
- Modify: source lines `index.html:2984-3025` (keys, stick, look, jump), `index.html:3206-3209` (`checkOrient`), `index.html:3223-3231` (input→world basis)

**Interfaces:**
- Consumes: `cam` from `src/state.js`; `recenterCam` from `src/camera.js`; `hooks` for `tryJump` wiring is done in `main`.
- Produces:
  - `initControls({ onJump })` — attaches all listeners to `window` / the HUD buttons
  - `readInput()` → `{ ix, iz }` already normalized (magnitude ≤ 1), in **camera-relative world space** (the `rX*ix+fX*(-iz)` transform from `index.html:3230-3231`)
  - `checkOrient()` — the portrait/landscape nag toggle

- [ ] **Step 1: Port the code.**

Copy the `keys` map + keydown/keyup, the `stick` object + `sStart/sMove/sEnd` + pointer listeners on `#stickZone`, the `look`/`md` drag handlers, the `#jumpBtn`/`#lookBtn` wiring, `inStick`, `onActionBtn`, `recenterCam` usage, and `checkOrient` from `index.html`. Replace `physics(...)`-adjacent basis math by exposing it in `readInput`:

```js
import { cam } from './state.js';

const keys = {};
const stick = { active: false, id: null, bx: 0, by: 0, dx: 0, dy: 0 };
// ... (sStart/sMove/sEnd, MAXR=55, pointer listeners) ...

export function readInput() {
  let ix = 0, iz = 0;
  if (stick.active) { ix += stick.dx; iz += stick.dy; }
  if (keys['a'] || keys['arrowleft']) ix -= 1;
  if (keys['d'] || keys['arrowright']) ix += 1;
  if (keys['w'] || keys['arrowup']) iz -= 1;
  if (keys['s'] || keys['arrowdown']) iz += 1;
  const mag = Math.hypot(ix, iz); if (mag > 1) { ix /= mag; iz /= mag; }
  const fX = -Math.sin(cam.yaw), fZ = -Math.cos(cam.yaw), rX = -fZ, rZ = fX;
  return { ix: rX * ix + fX * (-iz), iz: rZ * ix + fZ * (-iz) };
}

export function initControls({ onJump }) {
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (k === ' ') { e.preventDefault(); onJump(); }
  });
  addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  document.getElementById('jumpBtn').addEventListener('pointerdown', (e) => { e.preventDefault(); onJump(); });
  // ... stick zone, look drag, lookBtn → recenterCam, exactly as index.html ...
}
```

`stick.dx/dy` must be normalized to −1..1 (in `index.html` `sMove` divides by `MAXR`). Keep that.

- [ ] **Step 2: Wire into `main.js`** — `initControls({ onJump: tryJump })`; in `frame`, `const { ix, iz } = readInput(); physics(dt, t, ix, iz);` (physics still gated on `run.running`, set below in Task 11).

- [ ] **Step 3: Manual check.**

Open `game.html`. Force `run.running = true` and give a flat ground box temporarily (or wait for Task 11). Expected: WASD/arrows move the robot, it faces its travel direction, Running clip plays; Space → Jump clip; drag on the right of the screen orbits the camera; the JUMP button works on touch (test in devtools device mode).

- [ ] **Step 4: Commit**

```bash
git add src/controls.js src/main.js
git commit -m "feat: port keyboard and touch controls to a module"
```

---

## Task 11: `src/main.js` — boot, state machine, loop; physics online (Milestone 2)

**Files:**
- Modify: `src/main.js` (full rewrite from stub)
- Modify: source lines `index.html:2470-2519` (`state`, `startLevel`, `startRun`, `fmtTime`), `index.html:3027-3070` (`screens`, `setState`, `togglePause`, `click`), `index.html:3211-3238` (frame loop)

**Interfaces:**
- Consumes: everything from Tasks 1–10.
- Produces:
  - `setState(s)` — shows/hides screens, starts/stops music, toggles `run.running`
  - `startRun()` — `run.lives=3`, `run.runTime=0`, `startLevel(0)`, `setState('play')`
  - `startLevel(idx)` — `buildLevel(idx)` → `setWorld`, `resetPlayerTo(world.spawn)`, `buildSceneForLevel(world)`, `resetHazards`
  - the `frame` loop

- [ ] **Step 1: Write the failing test** for level-flow glue that is pure.

`test/flow.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtTime } from '../src/flow.js';

test('fmtTime formats mm:ss.d', () => {
  assert.equal(fmtTime(0), '0:00.0');
  assert.equal(fmtTime(75.4), '1:15.4');
});
```

Put `fmtTime` (from `index.html:2510`) and `bankTowerTime`/`levelComplete`/`winGame`/`gameOver`/`nextLevel` pure parts into `src/flow.js`; `main.js` imports them and supplies the DOM/scene effects via hooks. Keep `flow.js` DOM-free.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/flow.test.js`
Expected: FAIL — `src/flow.js` not found.

- [ ] **Step 3: Implement `src/flow.js`** with `fmtTime`, and level-progression helpers that mutate `run` and call `hooks`:

```js
import { run } from './state.js';
import { hooks } from './hooks.js';

export function fmtTime(t) {
  const m = Math.floor(t / 60), s = (t % 60);
  return m + ':' + s.toFixed(1).padStart(4, '0');
}

export function levelComplete() {
  run.levelIdx += 1;
  if (run.levelIdx >= 3) { hooks.onWin(); return; }
  hooks.sfx('level');
  hooks.startNextLevel(run.levelIdx); // installed by main
}
```
(Copy the real body of `levelComplete`/`bankTowerTime`/`winGame` from `index.html:2743-2772`; route `setState`, `startLevel`, score-save, and DOM writes through `hooks` entries that `main` installs. Add `hooks` keys as needed: `startNextLevel`, `gameOver`, `setState`.)

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/flow.test.js`
Expected: PASS.

- [ ] **Step 5: Rewrite `src/main.js`.**

```js
import * as THREE from 'three';
import { player, run, opts, setWorld, resetPlayerTo, world } from './state.js';
import { installHooks } from './hooks.js';
import { buildLevel } from './levels.js';
import { physics, updateDynamics, postPhysics, tryJump, die, respawn } from './physics.js';
import { initScene, render, resize, ctx } from './scene.js';
import { buildSceneForLevel, syncDynamics, resetHazards } from './scene.js'; // added in Task 12/13
import { loadCharacter, updateCharacter, characterGroup } from './character.js';
import { applyCamera } from './camera.js';
import { initControls, readInput, checkOrient } from './controls.js';
import { Audio_ } from './audio.js';
import { fmtTime, levelComplete } from './flow.js';
import * as hud from './hud.js'; // added in Task 15

const canvas = document.getElementById('game');
const { scene, camera } = initScene(canvas);
addEventListener('resize', () => { resize(canvas); checkOrient(); });
resize(canvas);

installHooks({
  sfx: (n) => Audio_.sfx(n),
  music: (a) => (a === 'start' ? Audio_.startMusic() : Audio_.stopMusic()),
  showMsg: (t, ms) => hud.showMsg(t, ms),
  onDie: () => {},                    // physics already sets player.dead
  onRespawn: () => resetHazards(),
  onLevelComplete: () => levelComplete(),
  onWin: () => setState('win'),
  onCoin: () => {},
  onCheckpoint: () => {},
  onSplash: () => {},                 // wired in Task 14
  startNextLevel: (idx) => startLevel(idx),
  setState: (s) => setState(s),
  gameOver: () => setState('over'),
});

let state = 'intro';
function setState(s) {
  state = s;
  hud.showScreen(s);
  run.running = (s === 'play');
  if (s === 'play' && opts.music) Audio_.startMusic();
  if (s === 'over' || s === 'win' || s === 'menu') Audio_.stopMusic();
}

function startLevel(idx) {
  run.levelIdx = idx;
  const w = buildLevel(idx);
  setWorld(w);
  resetPlayerTo(w.spawn);
  player.respawn = { ...w.spawn };
  buildSceneForLevel(w);
  resetHazards();
}

function startRun() {
  run.lives = 3; run.runTime = 0; run.coinsForLife = 0;
  startLevel(0);
  setState('play');
}

initControls({ onJump: tryJump });
hud.wireMenu({ startRun, setState, togglePause: () => setState(state === 'play' ? 'pause' : 'play') });

loadCharacter('robot').then((g) => scene.add(g));

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
      physics(dt, t, ix, iz);
      postPhysics(t);
      if ((now | 0) % 4 === 0) hud.updateHUD();
    }
  }
  syncDynamics(t);
  updateCharacter(dt, t);
  applyCamera(camera, player);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

For this task, `buildSceneForLevel`/`syncDynamics`/`resetHazards` may be **stubs** in `scene.js` (empty functions) — they are filled in Tasks 12–14. `hud.*` may be thin stubs too (filled in Task 15). The deliverable: pressing "Let's climb" builds level 0's `world`, drops the robot onto the (still-invisible) collision geometry, physics runs, and the HUD timer counts (once `hud.updateHUD` exists — acceptable to `console.log` here).

- [ ] **Step 6: Add temporary ground-proof.** In `buildSceneForLevel` stub, for now add a `THREE.Mesh` per `world.solids` entry with `s.w/h/d` as a box (skip discs). Just enough to *see* the player collide.

- [ ] **Step 7: Manual check (Milestone 2).**

Open `game.html` → menu → "Let's climb". Expected: robot spawns above the boat box, falls, lands, WASD walks it around the rough boxes, Space jumps, walking off into the water (`y < -1`) kills it and it respawns at spawn after ~1s. Timer counts up (in console or HUD). No console errors.

- [ ] **Step 8: Commit**

```bash
git add src/main.js src/flow.js test/flow.test.js src/scene.js
git commit -m "feat: boot, state machine, and frame loop with physics online"
```

---

## Task 12: `src/scene.js` — asset registry and level build (Milestone 3a)

**Files:**
- Modify: `src/scene.js`
- Create: `test/registry.test.js`

**Interfaces:**
- Consumes: `GEO`, `mat` (this module); `three`.
- Produces:
  - `REGISTRY` — `{ [type]: { glb: string|null, placeholder(item) → THREE.Object3D } }` covering every type in the list below
  - `typeOf(item)` → registry key string (pure — testable) using the same flag checks as the old `render()` (`item.boat`, `item.tramp`, `item.gate`, `item.log`, `item.pad`, `item.belt`, `item.slowMo`, `item.crumb||item.banana`, `item.wall`, `item.type==='disc'`, else `'box'`)
  - `buildSceneForLevel(world)` — clears `levelGroup`, instantiates one object per item across `solids/spikes/coins/keys/cages/npcs/ports` + `goal/finish/arch`, sets `item._obj`, marks `item._static` when the item has no `axis/spin/crumb/belt/riders/tramp` and is not a coin/portal
  - `disposeLevel()` — frees geometries/materials created per level (not the shared `GEO`)

- [ ] **Step 1: Write the failing test** for `typeOf` (pure).

`test/registry.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typeOf } from '../src/registry.js';

test('classifies solids by flag', () => {
  assert.equal(typeOf({ boat: true }), 'boat');
  assert.equal(typeOf({ tramp: true }), 'tramp');
  assert.equal(typeOf({ type: 'disc' }), 'disc');
  assert.equal(typeOf({ crumb: true }), 'banana');
  assert.equal(typeOf({ type: 'box', w: 1, h: 1, d: 1 }), 'box');
});
```

Put `typeOf` in `src/registry.js` (no three import) so the test runs in Node. `scene.js` imports it.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/registry.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/registry.js`** with `typeOf` — copy the branch order from `index.html:2794-2811` exactly (first match wins).

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/registry.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `REGISTRY` + `buildSceneForLevel` in `src/scene.js`.**

For each type, `placeholder(item)` returns a mesh scaled from the item's fields. Sizes/shapes (derive visually from `index.html` `draw*` for that type; these are the minimum viable forms):

| type | placeholder |
|---|---|
| `box` | `Mesh(GEO.box, mat(item.c||0xb4762f))` scaled `(item.w, item.h, item.d)` |
| `disc` | `Mesh(GEO.cyl, mat(0xffd34d))` scaled `(item.r*2, item.h, item.r*2)`; a child `Mesh(GEO.sphere, mat(fruitColor(item.fruit)))` on top for the fruit |
| `fruitTop` | folded into `disc` (child sphere) |
| `boat` | `Mesh(GEO.box, mat(0xf2f5f8))` scaled `(item.w, item.h, item.d)` |
| `tramp` | `Mesh(GEO.cyl, mat(0x39d0c0))` scaled `(item.r*2, item.h, item.r*2)`; store child ref for squash |
| `fan` | `Mesh(GEO.cyl, mat(0x8899aa))` tube `(item.r*2, item.height, item.r*2)` + a thin box "blade" child that spins |
| `swing` | a `THREE.Group`: balloon `Mesh(GEO.sphere, mat(0xff5566))` at the handle, a line to the anchor |
| `gate` | `Mesh(GEO.box, mat(0x8a5a2a))` scaled to `(item.w, item.h, item.d)` |
| `log` | `Mesh(GEO.cyl, mat(0x9c6b2f))` rotated 90° on Z, length `item.w` |
| `pad` | `Mesh(GEO.cyl, mat(0xff8c1a))` flat disc |
| `belt` | `Mesh(GEO.box, mat(0x444a55))` scaled `(item.w, item.h, item.d)` |
| `slowMo` | `Mesh(GEO.box, mat(0x66d46a))` translucent (`material.transparent`, `opacity 0.5`) |
| `banana` | `Mesh(GEO.box, mat(0xffd94d))` scaled `(item.w, item.h, item.d)` |
| `wall` | `THREE.Group` of 9 small boxes like `index.html:2805-2807` |
| `spike` (row) | `THREE.Group` of `item.n` cones `(item.r, item.h)` spaced by `item.w/item.n` |
| `coin` | `Mesh(GEO.sphere, mat(0xff3b6b))` r≈0.28, `material.emissive` set; bob/spin in sync |
| `key` | `THREE.Group`: ring torus (use `GEO.cyl` thin) + bit box, gold |
| `cage` | `THREE.Group` of thin vertical boxes forming bars |
| `npc` | `Mesh(GEO.sphere, mat(0xffd2a6))` body blob + smaller head sphere |
| `portal` | `Mesh(GEO.cyl, mat(0x9a7bff))` ring, `material.emissive`, spin in sync |
| `arch` | two `GEO.cyl` pillars + a top box |
| `finish` | a wide thin `GEO.box` banner `mat(0xffffff)` |

`fruitColor(name)` — small map from `FRUIT`/`THEMES` fruit names to a color; default `0xff6688`.

`buildSceneForLevel(world)`:
```js
export function buildSceneForLevel(world) {
  disposeLevel();
  const g = ctx().levelGroup;
  const add = (item, type) => {
    if (!item) return;
    const obj = resolve(type, item);
    obj.position.set(item.x, item.y, item.z);
    obj.rotation.y = item.ang || 0;
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    item._obj = obj;
    item._static = !(item.axis || item.spin || item.crumb || item.belt || item.riders || item.tramp);
    g.add(obj);
  };
  for (const s of world.solids) { if (s.nodraw) continue; add(s, typeOf(s)); }
  for (const k of world.spikes) add(k, 'spike');
  for (const c of world.coins) { add(c, 'coin'); c._static = false; }
  for (const k of world.keys) add(k, 'key');
  for (const c of world.cages) add(c, 'cage');
  for (const n of world.npcs) add(n, 'npc');
  for (const p of world.ports) { add(p, 'portal'); p._static = false; }
  add(world.goal, 'portal'); if (world.goal) world.goal._static = false;
  add(world.finish, 'finish');
  add(world.arch, 'arch');
}
```

`resolve(type, item)`: if `REGISTRY[type].glb` and the glb is loaded (Task 9 pattern, loaded in `loadAssets`), return `loadedGlb[type].scene.clone(true)`; else `REGISTRY[type].placeholder(item)`. For now every `glb` is `null`.

- [ ] **Step 6: Replace the Task 11 temporary ground-proof** with the real `buildSceneForLevel`.

- [ ] **Step 7: Manual check (Milestone 3a).**

Open `game.html` → play level 0. Expected: the boat, a run of fruit discs with colored tops, and whatever hazards level 0 has all appear as recognizable placeholder shapes at the right positions. The robot can jump between discs. Compare side-by-side with `index.html` level 0 — layout matches, only the art is blockier.

- [ ] **Step 8: Commit**

```bash
git add src/scene.js src/registry.js test/registry.test.js src/main.js
git commit -m "feat: asset registry and per-level scene build with placeholders"
```

---

## Task 13: `src/scene.js` — `syncDynamics` (Milestone 3b)

**Files:**
- Modify: `src/scene.js`

**Interfaces:**
- Consumes: `world` from `src/state.js`.
- Produces: `syncDynamics(t)` — per frame, for every non-`_static` item with `_obj`: copy transform + apply per-type animation.

- [ ] **Step 1: Implement `syncDynamics`.**

```js
import { world } from './state.js';

export function syncDynamics(t) {
  if (!world) return;
  for (const s of world.solids) {
    if (!s._obj || s._static) continue;
    s._obj.position.set(s.x, s.y, s.z);
    if (s.spin != null) s._obj.rotation.y = s.ang;
    if (s.tramp && s._obj.userData.pad) {
      const squash = s.squash > 0 ? Math.max(0.3, 1 - s.squash * 4) : 1;
      s._obj.userData.pad.scale.y = squash;
    }
    if (s.fan && s._obj.userData.blade) s._obj.userData.blade.rotation.z = t * 12;
    if (s.belt && s._obj.material && s._obj.material.map) s._obj.material.map.offset.y = (t * (s.belt || 1)) % 1;
    if ((s.crumb || s.banana) && s.dead) s._obj.position.y = s.y; // already falling in updateDynamics
  }
  for (const c of world.coins) {
    if (!c._obj) continue;
    if (c.got) { c._obj.visible = false; continue; }
    c._obj.position.set(c.x, c.y + Math.sin(t * 3 + c.ph) * 0.12, c.z);
    c._obj.rotation.y = t * 2;
  }
  for (const p of world.ports) if (p._obj) p._obj.rotation.y = t * 1.5;
  if (world.goal && world.goal._obj) world.goal._obj.rotation.y = t * 1.5;
  for (const sw of world.swings) {
    if (!sw._obj) continue;
    const h = swingHandleLocal(sw); // import swingHandle from physics or recompute
    sw._obj.position.set(h.x, h.y, h.z);
  }
}
```

Populate `_obj.userData.pad` / `_obj.userData.blade` in the relevant `placeholder` factories in Task 12 (go back and add them).

For belt scroll without a texture, instead nudge a child stripe's position; a texture `map` is optional — simplest is to skip visual belt motion and rely on the platform moving the player (physics already does `player.z += so.belt*dt`). Note this in a code comment.

- [ ] **Step 2: Manual check (Milestone 3b).**

Play all three levels end to end in `game.html`. Expected: moving platforms carry the robot, trampolines squash and launch, balloon swings track their arc and can be grabbed/released, fans push, crumbling banana segments fall after you step on them, spike rows are visible and kill on contact, coins bob and vanish on pickup, the end portal spins. Every tower is completable. Diff behavior against `index.html`.

- [ ] **Step 3: Commit**

```bash
git add src/scene.js
git commit -m "feat: syncDynamics drives moving platforms, swings, coins, hazards"
```

---

## Task 14: Environment, splash, `resetHazards` (Milestone 3c)

**Files:**
- Modify: `src/scene.js`
- Modify: source lines `index.html:1934-2076` (`initEnv`, `drawEnv`, `drawFins`, splash), `index.html:2483-2488` (`resetHazards`)

**Interfaces:**
- Produces:
  - `buildEnv(theme)` — sky dome/plane, water plane, cloud sprites, birds; added to `envGroup`
  - `updateEnv(t)` — drifts clouds/birds/waves
  - `spawnSplash(x, z)` / `updateSplash(dt)` — particle rings + droplets in `envGroup`
  - `resetHazards()` — re-seed crumble timers, swing angles, fan phases, moving-platform positions (port `index.html:2483-2488`), and clear splash

- [ ] **Step 1: Implement a minimal environment.**

Water: large `PlaneGeometry` at `y=-1` (`player` dies below `y=-1`), `mat(0x3aa0d0)` with `transparent`, `opacity 0.9`. Sky: set in Task 8 as `scene.background`; optionally a gradient via a large inverted sphere with `BackSide` material. Clouds: a dozen flattened white spheres at `y≈30-60`, drifting in `updateEnv`. Birds/fins: optional — a few small dark shapes; acceptable to defer.

- [ ] **Step 2: Implement splash.** Port `spawnSplash`/`updateSplash` data (`index.html:2050-2076`) — keep the `splashDrops`/`splashRings` arrays; render drops as tiny spheres and rings as expanding `RingGeometry` meshes; remove when their life expires. Wire `hooks.onSplash` in `main.js` to `spawnSplash`, and call `updateSplash(dt)` in the frame loop when `state==='play'`.

- [ ] **Step 3: Implement `resetHazards`** — copy `index.html:2483-2488` (it iterates `world.solids` resetting `.timer`, `.dead`, positions, `world.swings` angles, etc.). It's pure data — no draw. After resetting data, call a light `syncDynamics(0)` so meshes snap back.

- [ ] **Step 4: Manual check (Milestone 3c).**

Play `game.html`. Expected: water plane visible below the towers; falling in makes a splash; dying and respawning resets crumbled platforms and swings to their start state; clouds drift. Compare the "feel" to `index.html`.

- [ ] **Step 5: Commit**

```bash
git add src/scene.js src/main.js
git commit -m "feat: environment, water, splash particles, hazard reset"
```

---

## Task 15: `src/hud.js` — HUD, screens, profiles, leaderboard (Milestone 5a)

**Files:**
- Create: `src/hud.js`
- Modify: source lines `index.html:2511-2525` (`updateHUD`, `showMsg`), `index.html:3027-3199` (screens, toggles, leaderboard, profiles, menu chip) — **excluding** costume/accessory functions
- Create: `test/profile.test.js`

**Interfaces:**
- Consumes: `run`, `opts`, `player` from `src/state.js`; `fmtTime` from `src/flow.js`.
- Produces:
  - `updateHUD()` — writes `#coinCount`, `#timer`, `#lives`
  - `showMsg(text, ms)` — `#centerMsg` fade
  - `showScreen(state)` — the `screens` map show/hide
  - `wireMenu({ startRun, setState, togglePause })` — attaches all menu button listeners
  - `fixProfile(p)` / `BLANK_PROFILE()` — **without** `accs/cos/equipAcc/equipCos`
  - `loadScores()` / `saveScore(name, time)` — verbatim
  - profiles + leaderboard + menu-chip rendering, costume/accessory calls removed

- [ ] **Step 1: Write the failing test** for profile migration.

`test/profile.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixProfile, BLANK_PROFILE } from '../src/profile.js';

test('BLANK_PROFILE has no cosmetic fields', () => {
  const p = BLANK_PROFILE();
  assert.equal('accs' in p, false);
  assert.equal('cos' in p, false);
  assert.equal(p.beaten, 0);
});

test('fixProfile drops legacy cosmetic fields but keeps progress', () => {
  const legacy = { beaten: 2, fruit: 40, accs: ['fruitcrown'], cos: ['x'], equipAcc: 'fruitcrown', bestTimes: [12.3] };
  const p = fixProfile(legacy);
  assert.equal(p.beaten, 2);
  assert.equal(p.fruit, 40);
  assert.equal('accs' in p, false);
  assert.equal('equipAcc' in p, false);
});
```

Put `BLANK_PROFILE`, `fixProfile` in `src/profile.js` (DOM-free); `hud.js` imports them.

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/profile.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/profile.js`.**

Port `BLANK_PROFILE` (`index.html:1324`) and `fixProfile` (`index.html:1330-1335`), deleting the `accs`, `cos`, `equipAcc`, `equipCos` keys from `BLANK_PROFILE` and making `fixProfile` build from the new `BLANK_PROFILE` and copy only keys that exist in it (so legacy `accs`/`cos` are dropped). Keep `beaten`, `fruit`, `bestTimes`, and any other progress fields.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/profile.test.js`
Expected: PASS.

- [ ] **Step 5: Implement `src/hud.js`.**

Port from `index.html`, deleting every costume/accessory reference:
- `updateHUD` (`index.html:2511-2518`), `showMsg` (`index.html:2519-2525`), `msgTimer`.
- `screens` map (`index.html:3027-3029`), `hideAllScreens`, `showScreen(state)` (the DOM half of `setState`).
- `click(id, fn)` helper (`index.html:3046`), `wireToggle` (`index.html:3092-3099`), `fillLeaderboard` (`index.html:3100-3102`).
- profiles screen: `statTile`, `profileCard`, `updateProfileScreen`, `showNewProfile` (`index.html:3148-3185`) — **remove** the `statTile('Unlocks', …)` line and `unlockCount`/`TOTAL_UNLOCKS` usage.
- menu chip: `updateMenuWho` (`index.html:3186-3195`) — remove the `'🎁 '+unlockCount(p)+…` string, keep the name / fruit-collected part.
- `loadScores`/`saveScore` (`index.html:988-998`).
- `updateCharUI` (`index.html:3103-3108`) — reduce to setting the character **name** label; the 3D preview is Task 16. Remove `updateCosUI` and the costume-arrow wiring entirely.
- `wireMenu({ startRun, setState, togglePause })` — the block of `click('playBtn', …)` etc. from `index.html:3047-3070`, minus `click('cosUp'…)`, `click('cosDown'…)`, `click('accBtn'…)`.

Do **not** port: `openAccDrawer`, `closeAccDrawer`, `stepCostume`, `cosList`, `cosIndex`, `updateCosUI`, `grantUnlock`, `currentLook`, `previewLook`, `unlockCount`, `hasAcc`, `hasCos`, `myAccs`, `myCostumes`.

- [ ] **Step 6: Manual check (Milestone 5a).**

Open `game.html`. Expected: timer, coin count, lives all update during play; center messages ("Checkpoint!", "Try again!") appear; pause screen works; options toggles (music/sfx) work and persist across reload; leaderboard shows saved times; profiles screen lists players with best-time / towers-beaten tiles and **no** "Unlocks" tile; creating/switching a profile works. Load the page with a pre-port `ft_profiles` value in `localStorage` (copy one from `index.html`) — it loads without error and keeps its `beaten` count.

- [ ] **Step 7: Commit**

```bash
git add src/hud.js src/profile.js test/profile.test.js src/main.js
git commit -m "feat: port HUD, screens, profiles, leaderboard; drop unlock UI"
```

---

## Task 16: Character-select 3D preview + win/over screens (Milestone 5b)

**Files:**
- Modify: `src/character.js`, `src/hud.js`, `src/main.js`
- Modify: source lines `index.html:2756-2772` (`winGame`, `saveWinName`, `gameOver`), `index.html:2946-2982` (`renderCharSelect` — replaced)

**Interfaces:**
- Produces:
  - `startCharPreview(containerEl)` / `stopCharPreview()` in `src/character.js` — a small `WebGLRenderer` sized to `#charScreen`'s preview area showing the selected model rotating; reuses `loadCharacter` but into a private group
  - `selectCharacter(dir)` — steps `chosen` through `CHARACTERS`, persists `ft_char`, reloads preview and the in-game model
  - win screen: `saveWinName()` writes the score via `saveScore`; `gameOver()` → over screen

- [ ] **Step 1: Implement the preview renderer** in `src/character.js`.

A second `THREE.WebGLRenderer` (accepted trade-off per the spec's open item — one extra context; revisit only if it causes GPU-memory warnings) with its own `Scene`, one `HemisphereLight` + `DirectionalLight`, `PerspectiveCamera` at a 3/4 angle. `startCharPreview` appends its canvas into the char-screen preview container, loads `CHARACTERS[chosen].glb`, plays the `Idle` clip, and spins the model at ~0.5 rad/s in its own RAF loop. `stopCharPreview` cancels the loop and removes the canvas. Guard against WebGL context limits by fully disposing on stop.

- [ ] **Step 2: Wire char-select** in `hud.js`: on entering the `char` state call `startCharPreview($preview)`; on leaving call `stopCharPreview()`. The existing `◀ ▶` character arrows call `selectCharacter(-1|+1)`. `charGo` ("Let's climb!") confirms and returns to menu/starts.

- [ ] **Step 3: Port win/over.** `saveWinName` (`index.html:2766-2771`) → uses `saveScore(name, pendingTime)`; keep `pendingTime`/`savedThisWin` guards. `gameOver` → `setState('over')`, `saveProfiles()`.

- [ ] **Step 4: `selectCharacter` also swaps the in-game model** — call `loadCharacter(CHARACTERS[chosen].id)` and re-add its group to the main scene (remove the old group first).

- [ ] **Step 5: Manual check (Milestone 5b).**

Open `game.html` → Characters. Expected: the selected character renders in 3D in the preview panel, slowly turning, playing Idle. Arrows step through `CHARACTERS` (only one entry for now — arrows wrap or no-op cleanly). "Let's climb!" starts a run with that model. Finish a tower → win screen, enter a name → it appears on the leaderboard. Lose all lives → game-over screen. Leaving the char screen disposes the preview (no "too many WebGL contexts" warning after visiting it 5+ times).

- [ ] **Step 6: Commit**

```bash
git add src/character.js src/hud.js src/main.js
git commit -m "feat: 3D character-select preview, win/over screen wiring"
```

---

## Task 17: Full parity pass and cutover (Milestone 6)

**Files:**
- Modify: `README.md`
- Delete: `index.html` (old engine) — replaced by `game.html`
- Rename: `game.html` → `index.html`
- Modify: `gltf-test.html` — leave as-is (historical spike) or delete; decide with the user

**Interfaces:** none — this is verification + cutover.

- [ ] **Step 1: Parity checklist.** Open `index.html` (old) and `game.html` (new) side by side, same browser, and confirm each:
  - [ ] All three towers completable start to finish
  - [ ] Jump height / run speed / air control feel identical (physics constants unchanged)
  - [ ] Trampoline launch height matches
  - [ ] Balloon swing grab distance, arc, and release velocity match
  - [ ] Fan push strength matches
  - [ ] Moving/rotating platforms carry the player correctly, incl. rotation
  - [ ] Crumbling banana bridges drop on the same timing
  - [ ] Spikes, water, and out-of-bounds all kill and respawn at the last checkpoint
  - [ ] Coins: pickup radius, life-gain at threshold, count persists per run
  - [ ] Keys open cages; caged NPC rescue gates the finish
  - [ ] Checkpoint buoys update respawn
  - [ ] Timer, per-tower banking, and final time on the win screen match
  - [ ] Leaderboard save/load, options persistence, profile switching
  - [ ] Music starts on play, stops on menu/win/over; SFX fire on jump/coin/death/tramp/swing/crack
  - [ ] Touch controls on a phone (or devtools device mode): stick, look-drag, JUMP, orientation nag
  - [ ] `localStorage` migration: a pre-port profile loads and keeps `beaten`
  - [ ] 60 fps on a mid device (check `chrome://tracing` or the FPS meter); no per-frame allocations in `syncDynamics`
- [ ] **Step 2:** Fix any parity gaps found (each fix = its own commit referencing the checklist item).
- [ ] **Step 3: Run the full unit suite.** `node --test test/` — all green.
- [ ] **Step 4: Cutover.**

```bash
git rm index.html
git mv game.html index.html
```
Update the `<script type="module" src="src/main.js">` path if needed (it stays `src/main.js`). Update `README.md`: replace the "custom WebGL engine, single file, no dependencies" description with "Three.js (loaded from CDN via importmap), ES modules under `src/`, no build step; serve the folder over HTTP". Document `node --test` and `python3 -m http.server`.

- [ ] **Step 5: Decide `gltf-test.html`'s fate with the user** (keep as a spike artifact, or `git rm`).
- [ ] **Step 6: Final manual check.** Fresh `python3 -m http.server 8777`, open `http://localhost:8777/`, play one full tower. No console errors.
- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: cut over to the Three.js engine, retire the custom WebGL renderer"
```

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|---|---|
| File layout (`game.html` + `src/*`) | 7, plus every module task |
| Rendering model (retained graph, one renderer, groups, fog/lights) | 8, 14 |
| Asset registry (`REGISTRY`, `resolve`, glb slots) | 12 |
| Per-level build (`buildSceneForLevel`) | 12 |
| Per-frame sync (`syncDynamics`) | 13 |
| Placeholder meshes share geometry pool | 8, 12 |
| Environment + splash → placeholder meshes/particles | 14 |
| Character glTF load + `AnimationMixer` + `setAction` blend | 9 |
| Character state machine table | 9 |
| Foot offset alignment | 9 |
| Character-select 3D preview, `CHARACTERS` collapse | 16 |
| Camera formula ported 1:1 | 5 |
| Controls ported as-is, camera-relative basis | 10 |
| Deletions (drawChar, ACCS, COSTUMES, all draw*, custom gl engine) | 7 (markup/CSS), 17 (old file), and by omission throughout |
| Profile migration (drop cosmetic fields) | 15 |
| Frame loop shape | 11 |
| Milestones 1–6 | Tasks 7–17 map 1:1-ish |
| Risk: syncDynamics misses | 13 (walks every type), `_static` opt-in |
| Risk: fog/light mismatch | accepted; 17 is a pass not a pixel match |
| Risk: module state ownership | `src/state.js` single owner (Task 1); `hooks` seam (Task 2) |
| Risk: char-select second renderer | 16 picks second renderer, disposes on stop |
| Open item: `postPhysics` scene hook | Task 4 routes via `hooks.onCoin/onCheckpoint`; confirmed data-only |
| Audio kept verbatim | 6 |

No gaps found.

**2. Placeholder scan**

The deliberate `<<<` marker in Task 8 Step 1 is called out explicitly in that step and Step-1's closing paragraph tells the engineer exactly what value to substitute and where to find it — it is a stop-and-think guard, not an unresolved placeholder. All test steps contain real assertions. All code steps contain real code. Level/physics/audio/HUD extraction tasks reference exact `index.html` line ranges rather than reproducing hundreds of lines — the code to move already exists in the repo and copying it into the plan would risk drift.

**3. Type consistency**

- `buildSceneForLevel(world)`, `syncDynamics(t)`, `resetHazards()`, `disposeLevel()` — consistent across Tasks 11–14.
- `loadCharacter(id) → Promise<Group>`, `updateCharacter(dt, t)`, `pickState(player, t)` — consistent Tasks 9, 11, 16.
- `readInput() → {ix, iz}` (world-space) — Tasks 10, 11 agree.
- `cameraEye(player, cam) → {eye, look}`, `applyCamera(threeCamera, player)` — Tasks 5, 11 agree.
- `hooks` keys: `sfx, music, showMsg, onDie, onRespawn, onLevelComplete, onWin, onCoin, onCheckpoint, onSplash` (Task 2) plus `startNextLevel, setState, gameOver` (added in Task 11, Step 3/5 — flagged there). `main.js` installs all of them in Task 11.
- `fixProfile` / `BLANK_PROFILE` live in `src/profile.js` (Task 15), imported by `hud.js`.
- `typeOf(item)` in `src/registry.js` (Task 12), imported by `scene.js`.
- `pickState` in `src/character-state.js` (Task 9), re-exported by `character.js`.
- `fmtTime` in `src/flow.js` (Task 11).

The three "pure sub-module" splits (`registry.js`, `character-state.js`, `profile.js`, `flow.js`) exist so Node tests never load `three` through the importmap. This is consistent and intentional.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-31-threejs-engine-port.md`. Two execution options:

**1. Subagent-Driven (recommended)** — fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?
