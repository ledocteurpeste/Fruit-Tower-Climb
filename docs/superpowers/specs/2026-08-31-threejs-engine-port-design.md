# Three.js Engine Port — Design

**Status:** Approved (design). Ready for implementation planning.
**Date:** 2026-08-31
**Branch:** `Sandbox-Branch`

## Summary

Replace Fruit Tower Climb's custom raw-WebGL renderer with Three.js. The
game currently lives in a single 3262-line `index.html` that hand-rolls a
mat4 library, a GLSL shader, eight primitive meshes, and an immediate-mode
draw layer. This port swaps that renderer for a retained Three.js scene
graph, introduces a glTF character (the RobotExpressive model validated in
the Phase 1 spike, `gltf-test.html`), and removes the block-character
costume/accessory system entirely.

Physics, level layout data, the camera rig, touch controls, the WebAudio
synth, and the DOM menu/HUD are renderer-independent and are moved across
with minimal change. World art becomes a registry of placeholder
primitives today, with a per-type slot for dropping in `.glb` assets
later.

## Goals

- Render the game with Three.js instead of the custom `gl` engine.
- Load the player character from glTF with skeletal animation
  (`GLTFLoader` + `AnimationMixer`).
- Provide a clean seam for replacing every world piece with a `.glb`
  asset, one type at a time, without further structural change.
- Reach feature parity with the current `index.html`, then replace it.

## Non-goals

- Creating world or character art. Placeholders now; assets later.
- Porting the costume/accessory system in any form. It is deleted.
- Changing gameplay, level design, physics tuning, or audio.
- Adding a build step, bundler, or npm dependency.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Costume/accessory system | **Drop entirely.** Delete `ACCS`, `COSTUMES`, `drawChar`, `drawGlove`, accessory drawer, costume arrows, unlock/grant flow. Char-select becomes a plain list of glTF characters. Profiles keep only best-time / towers-beaten stats. |
| World rendering | **glTF-targeted, primitive placeholders now.** Each world piece type has a registry entry with an optional `.glb` slot and a placeholder-mesh factory. `glb: null` → placeholder. |
| Asset path | **Primitive placeholders now, glTF slots later.** The port ships working with placeholders; adding art is one registry line plus a file in `assets/`. |
| Tooling / structure | **Single HTML, split JS module files.** `game.html` + `src/*.js`, Three.js via `<script type="importmap">` from jsdelivr. No bundler, no npm. Folder must be served together. |
| Keep as-is (retargeted) | DOM menu/HUD/CSS, physics + level data, camera + touch controls, WebAudio synth. |
| Target | **New files, keep `index.html` until parity.** Build as `game.html` + `src/`; switch over (`git mv`) only at parity. Old game stays playable throughout. |

## Architecture

### File layout

```
game.html          menu/HUD markup + CSS, copied from index.html with the
                   costume/accessory UI removed. Contains the importmap
                   (three + three/addons from jsdelivr) and a single
                   <script type="module" src="src/main.js">.

src/main.js        Boot, state machine (intro/menu/char/play/pause/win/over),
                   the requestAnimationFrame loop, and wiring between modules.

src/scene.js       Three.js renderer, scene, lights, fog. The asset
                   REGISTRY. buildSceneForLevel(world) and syncDynamics().

src/character.js   glTF load, AnimationMixer state machine, and the
                   character-select preview renderer.

src/camera.js      Orbit rig: keeps cam = {yaw, pitch, dist}; each frame
                   positions a THREE.PerspectiveCamera with the current
                   formula. recenterCam().

src/controls.js    Keyboard map, touch stick, look-drag, jump button,
                   orientation check. Emits the same ix/iz + camera-relative
                   basis the current code feeds to physics().

src/physics.js     physics(), updateDynamics(), aabbH/aabbV/onDisc, swing
                   (swingHandle/swingStep/releaseSwing), postPhysics.
                   Moved verbatim; only the module boundary is new.

src/levels.js      THEMES, FRUIT, buildLevel(). Geometry, positions, and
                   the .c color values are kept as plain data. No draw code.

src/audio.js       Audio_ object. Moved verbatim.

src/hud.js         DOM HUD (updateHUD, showMsg), profiles, leaderboard,
                   screen show/hide, pause. Costume/accessory functions
                   removed.

assets/            .glb files. character/ for the player model; one file
                   per world piece type as art is produced. Empty at first.
```

Modules use ES `import`/`export`. Shared mutable state (`player`, `world`,
`state`, `opts`) is owned by `main.js` and passed in, or lives in a small
`src/state.js` imported where needed — the plan picks one; the design
requires only that there is a single owner per datum.

### Rendering model

The current engine is immediate-mode: `render(t)` re-issues every draw
call each frame. Three.js is retained: meshes are created once and the
renderer walks the graph. The port makes this shift explicit.

- `src/scene.js` owns one `THREE.WebGLRenderer` (`antialias: true`,
  `PCFSoftShadowMap`), one `scene`, one `THREE.Fog` tuned to match the
  current shader's fog (`FS` in `index.html`, `uFogAmt`/`vFog`), a
  `HemisphereLight` for ambient fill, and one `DirectionalLight` with
  shadows for the sun.
- A single `THREE.Group` (`levelGroup`) holds all level geometry. It is
  emptied and rebuilt on every `startLevel`.
- The environment (sky/water/clouds/birds/fins) and the splash particles
  live in their own groups, built once.

### Asset registry

`src/scene.js` exports:

```
const REGISTRY = {
  disc:     { glb: null, placeholder: makeDiscMesh },     // fruit platform
  box:      { glb: null, placeholder: makeBoxMesh },       // generic solid
  fruitTop: { glb: null, placeholder: makeFruitTopMesh },  // the fruit crown on a disc
  boat:     { glb: null, placeholder: makeBoatMesh },
  tramp:    { glb: null, placeholder: makeTrampMesh },
  fan:      { glb: null, placeholder: makeFanMesh },
  swing:    { glb: null, placeholder: makeSwingMesh },
  gate:     { glb: null, placeholder: makeGateMesh },
  log:      { glb: null, placeholder: makeLogMesh },
  pad:      { glb: null, placeholder: makePadMesh },
  belt:     { glb: null, placeholder: makeBeltMesh },
  slowMo:   { glb: null, placeholder: makeSlowRunMesh },
  banana:   { glb: null, placeholder: makeBananaSegMesh },
  wall:     { glb: null, placeholder: makeWallMesh },
  spike:    { glb: null, placeholder: makeSpikeRowMesh },
  coin:     { glb: null, placeholder: makeCoinMesh },
  key:      { glb: null, placeholder: makeKeyMesh },
  cage:     { glb: null, placeholder: makeCageMesh },
  npc:      { glb: null, placeholder: makeNpcMesh },
  portal:   { glb: null, placeholder: makePortalMesh },
  arch:     { glb: null, placeholder: makeArchMesh },
  finish:   { glb: null, placeholder: makeFinishMesh },
};
```

- Each `placeholder(item)` returns a `THREE.Object3D` sized from the
  item's existing fields (`item.w/h/d`, `item.r`, etc.). Placeholder
  meshes share a small pool of geometries (one `BoxGeometry`, one
  `CylinderGeometry`, one `ConeGeometry`, one `SphereGeometry`,
  scaled per instance) and use `MeshStandardMaterial({ color })` with the
  color from `item.c` or a per-type default.
- `resolve(type, item)`: if `REGISTRY[type].glb` is set, clone the loaded
  glTF scene for that type; else call `placeholder(item)`.
- Adding art for a type: set `REGISTRY[type].glb = 'assets/<type>.glb'`,
  drop the file in, done. The glTF is loaded at boot alongside the
  character; `resolve` swaps automatically.

### Per-level build

`buildSceneForLevel(world)`:

1. Dispose and clear `levelGroup`.
2. For each collection on `world` (`solids`, `spikes`, `coins`, `keys`,
   `cages`, `npcs`, `ports`, plus `goal`, `finish`, `arch`): pick the
   registry type from the item's flags (`s.boat`, `s.tramp`, `s.log`,
   `s.type === 'disc'`, …) the same way `render()` currently branches,
   call `resolve`, add the returned object to `levelGroup`, and store a
   back-reference `item._obj`.
3. Set static transforms once (position from `item.x/y/z`, rotation from
   `item.ang`).

### Per-frame sync

`syncDynamics()` runs each frame after `physics()`/`updateDynamics()`:

- For every item whose `_obj` exists and which can move: copy
  `item.x/y/z` → `_obj.position`, `item.ang` → `_obj.rotation.y`.
- Trampoline squash, crumbling-platform fall, belt scroll, fan blade
  spin, swing bob, coin bob/spin, portal shimmer: each reads the fields
  `updateDynamics()` already maintains (`s.dx/dy/dz`, `s.ang`, `s.squash`,
  `s.fall`, `s.timer`) and applies them to `_obj` (scale, position,
  child rotation, or material emissive intensity).
- Items that never move are skipped via a `_static` flag set at build.

## Character

`src/character.js` promotes the Phase 1 spike:

- `GLTFLoader` loads `assets/character/<id>.glb`. RobotExpressive is the
  placeholder for every character id until real models exist.
- On load: `AnimationMixer` on the model; a `setAction(clip)` helper that
  cross-blends with a 0.2s `fadeOut`/`fadeIn` (the spike's helper).
- The model is added to a `THREE.Group` (`playerGroup`). Each frame:
  `playerGroup.position.set(player.x, player.y, player.z)`,
  `playerGroup.rotation.y = player.facing`. A per-model vertical offset
  aligns the model's feet with the physics capsule bottom
  (`player.y - player.hh`), matching the `FT` fudge the old `drawChar`
  used.
- **State machine**, driven by existing `player` fields, evaluated each
  frame:

  | State | Condition | Clip (RobotExpressive) |
  |---|---|---|
  | `dead` | `player.dead` | `Death` |
  | `cheer` | `player.celebrateUntil > t` | `Dance` |
  | `swing` | `player.swing` | `Jump` (fallback) |
  | `climb` | `player.climbing` | `Walking` (fallback) |
  | `jump` | `!player.onGround` | `Jump` |
  | `run` | horizontal speed > 0.6 | `Running` |
  | `idle` | otherwise | `Idle` |

  The clip map is a per-model table; missing clips fall back to the
  nearest listed clip. Real models later supply proper climb/swing clips
  by editing the table.
- **Character select:** the screen shell (`charScreen`) stays. Its live
  preview becomes a small dedicated `WebGLRenderer` (or a scissored
  viewport) that shows the selected model rotating slowly, replacing the
  old `renderCharSelect` / `drawChar` preview. `CHARACTERS` collapses to
  `[{ id, name, glb }]`. `localStorage` key `ft_char` (the chosen index)
  is unchanged.

## Camera & controls

- `src/camera.js`: `cam = { yaw: Math.PI, pitch: 0.42, dist: 10 }` is
  kept. Each frame:

  ```
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  camera.position.set(
    player.x + Math.sin(cam.yaw) * cam.dist * cp,
    player.y + 1.5 + cam.dist * sp,
    player.z + Math.cos(cam.yaw) * cam.dist * cp
  );
  camera.lookAt(player.x, player.y + 0.7, player.z);
  ```

  This is the current formula (`index.html:2785-2787`) ported 1:1.
  `camera.fov` set so the vertical FOV matches the current
  `M.perspective(1.05, …)`. `recenterCam()` unchanged.
- `src/controls.js`: the keyboard map (`keys{}`), `stick` object,
  `sStart/sMove/sEnd`, look-drag (`look`, mouse + touch), `jumpBtn`,
  `lookBtn`, `inStick`, `onActionBtn`, `checkOrient` — all moved as-is.
  Output each frame is `ix/iz`, clamped, then rotated into world space
  with the camera-relative basis exactly as `index.html:3223-3231`, and
  passed to `physics(dt, t, wx, wz)`.

## Deletions

Removed outright, no replacement:

- `drawChar`, `drawGlove`
- `ACCS`, `ACC_BY_ID`, `COSTUMES`, `COS_BY_ID`
- Costume/accessory UI: accessory drawer (`openAccDrawer`,
  `closeAccDrawer`), costume arrows (`stepCostume`, `updateCosUI`,
  `cosList`, `cosIndex`), and their markup/CSS in `game.html`.
- `currentLook`, `previewLook`, `grantUnlock`, `unlockCount`,
  `TOTAL_UNLOCKS`, `hasAcc`, `hasCos`, `myAccs`, `myCostumes`.
- Every primitive world-draw function: `drawWhole`, `drawSlice`,
  `drawLollipop`, `drawGumdrop`, `drawCluster`, `drawFruitTop`,
  `fruitBody`, `cutFace`, `drawGate`, `drawFinish`, `drawArch`,
  `drawPortal`, `drawKey`, `drawCage`, `drawPerson`, `drawLog`,
  `drawPad`, `drawBelt`, `drawSlowRun`, `drawBananaSeg`, `drawBoat`,
  `drawTrampoline`, `drawFan`, `drawSwing`, `drawFins`, `drawEnv`,
  `drawSplash`, `renderCharSelect`, `render`.
- The custom engine: `M` (mat4 lib), `VS`/`FS` shader strings, `prog`,
  `loc`, `sh`, `makeMesh`, `bindMesh`, `CUBE`/`CYL`/`PYRAMID`/`CONE`/
  `SPH`/`HEMI`/`TOR`, `draw`, `box`, `cyl`, `cone`, `pyramid`, `sph`,
  `tor`, `dome`, `emit`, `alpha`, `fogAmt`, `glowOn`, `glowOff`.
  `C()` and `mixc()` colour helpers are kept (used by level data).

### Profile migration

`BLANK_PROFILE` drops `accs`, `cos`, `equipAcc`, `equipCos`. `fixProfile`
ignores those keys if present in stored JSON (`localStorage` key
`ft_profiles`), so existing saves load without error and simply lose the
cosmetic fields. `beaten` and best-times are preserved. The Profiles
screen and menu chip lose the "unlocks" tile.

## Frame loop

`src/main.js` `frame(now)` keeps the current shape
(`index.html:3211-3238`):

```
dt = clamp((now - last)/1000, 0, 0.05); t = now/1000
if state === 'play' && running && world:
    updateDynamics(dt, t)
    updateSplash(dt)
    squash timers
    if player.dead: deadT/respawn
    else:
        runTime += dt
        swingCd
        ix, iz = controls.read()
        physics(dt, t, worldX, worldZ)
        throttled updateHUD()
scene.syncDynamics()
character.update(dt)     // advances the mixer, evaluates the state machine
camera.update()
renderer.render(scene, camera)
requestAnimationFrame(frame)
```

## Milestones

Each is independently runnable and verifiable in a browser.

1. **Shell.** `game.html` boots, Three scene with lights/fog, empty
   `levelGroup`, RobotExpressive standing on a placeholder boat mesh,
   camera + controls move the model. No physics.
2. **Physics moved.** `physics.js`, `levels.js`, `audio.js` imported;
   player collides with a placeholder level 1; jump, fall, water-death,
   respawn all work.
3. **Registry parity.** Every piece type renders as a placeholder;
   levels 1–3 are fully traversable; `syncDynamics` drives moving
   platforms, trampolines, swings, fans, belts, spikes, crumbling
   platforms, coins.
4. **Character states.** idle / run / jump / climb / swing / cheer /
   dead all animate with cross-blends.
5. **UI.** Character-select glTF preview; profiles, leaderboard, pause,
   options all functional; costume/accessory UI removed with no dead
   references; profile migration verified against a pre-port save.
6. **Parity pass.** Side-by-side against the old `index.html`: all three
   towers completable, timing/HUD/leaderboard correct, audio correct,
   touch controls correct on a phone. Then `git mv game.html index.html`,
   move `src/` into place, delete the old engine, update `README.md`.

## Risks

- **Retained-graph bugs.** Items that move but are missed by
  `syncDynamics` will visually lag their collision. Mitigation:
  milestone 3 explicitly walks every dynamic type; the `_static` flag is
  opt-in (default dynamic) so a missed item is merely a perf cost, not a
  desync.
- **Fog/light mismatch.** The custom shader is flat-shaded two-sided with
  a bespoke fog curve. `MeshStandardMaterial` + real lights will not look
  identical. Acceptable per the "procedural placeholders" decision;
  milestone 6 is a parity *pass*, not a pixel match.
- **Module state ownership.** Splitting a single-scope file into modules
  can create two copies of a datum. Mitigation: the plan names a single
  owner (or `src/state.js`) for `player`, `world`, `state`, `opts`
  before any code moves.
- **Char-select second renderer.** Two `WebGLRenderer` instances cost
  context memory. Alternative: one renderer with a scissored viewport.
  The plan picks one during milestone 5.
- **glTF asset licensing.** RobotExpressive is CC. Any future `.glb`
  must have its licence recorded in `assets/README.md`.

## Open items for the plan

- Exact module state-ownership pattern (single owner vs `src/state.js`).
- Char-select: second renderer vs scissored viewport.
- Whether `postPhysics` collectible/checkpoint logic needs any scene-side
  hook or is purely data (expected: purely data).
