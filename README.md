# 🍒 Fruit Tower Climb 🫐

**A colorful 3D climbing game (an "obby"): Bounce, swing and dodge your way to the top of three fruity towers.**

Climb up **Cherry → Strawberry → Blueberry**, grabbing fruit and dodging hazards. Reach the flag at the top of each tower to move on, save princess Blueberry and race the clock for your best time. It's built for a young player: fun, forgiving, and includes frequent checkpoints, fall off and you pop right back to your last checkpoint.

> 🎮 **No install, no build step.** Runs on [Three.js](https://threejs.org/) (v0.160.0), pulled straight from the jsDelivr CDN via an import map, no bundler and no `npm install`. Best on a phone held **sideways (landscape)**.

---

## ▶️ Play it

[ledocteurpeste.github.io/Fruit-Tower-Climb](https://ledocteurpeste.github.io/Fruit-Tower-Climb/index.html)

If on mobile, turn the phone sideways and tap **Begin Game**. In Safari you can also tap **Share → Add to Home Screen** to get a real app icon that opens fullscreen.

## 🕹️ Controls

| Where | Does |
|---|---|
| **Left side** – touch & slide | Walk (a joystick appears under your thumb, typical‑mobile style) |
| **Big green JUMP button** | Jump — and tap it to let go of a rope mid‑swing |
| **Blue "view" button** | Snaps the camera back behind you if you get turned around |
| **Drag the right side** | Look around |
| **Keyboard (computer)** | WASD / arrows to move · Space to jump · drag mouse to look · Esc to pause |

---

## 🗺️ The three towers

| Tower | Theme | You'll meet… |
|---|---|---|
| 🍒 **Cherry** | Gentle intro | Stepping platforms, a **moving platform**, a **spinning disc** to ride, a climbing wall |
| 🍓 **Strawberry** | A step up | A **trampoline** to bounce over a wall, an **up‑fan** that lifts you, more spikes & moving platforms |
| 🫐 **Blueberry** | The finale | A **rope swing** across a big gap, falling platform hazards, treadmills, and spikes |

Clear all three to win — your total time is saved to the leaderboard.

---

## ✨ What's in it

- **Play as a 3D climber** — an animated character that runs, jumps and climbs its way up the towers (more characters coming).
- **Collectable fruit, a run timer, and 3 lives** shown at the top — collect **50 fruits for an extra life**. Fruits reset each tower.
- **Checkpoints** throughout: fall and you respawn at the last flag, so it never gets frustrating.
- **Full menus:** animated title screen, main menu (Begin · Options · Leaderboard · Quit), **Options** to toggle Music, Sound Effects, and **Cheats** (unlimited lives), and a **Leaderboard** of best times saved on the device.
- **Music & sound effects** are generated right in the browser — no audio files to load.

---

## 🛠️ For grown-ups (tweaking it)

`index.html` is a thin shell (markup, CSS, and an import map); the engine lives in ES modules under `src/`, with 3D assets under `assets/`.

```
index.html      – shell: markup, CSS, import map, loads src/main.js
src/            – the engine, as ES modules (main, scene, character, camera,
                  controls, physics, levels, audio, hud, registry, …)
assets/         – glTF character + prop models
test/           – Node unit tests
```

**Run it locally.** ES modules and import maps need HTTP (opening the file directly won't work):

```bash
python3 -m http.server 8000
# then open http://localhost:8000/
```

**Tests:** `npm test` — runs Node's built-in test runner, zero dependencies.

- **Make a tower easier/harder:** each tower is built from the level data in `src/levels.js`.
- **Jump feel:** the physics constants (`JUMP`, `GRAV`, `MOVE`, `TRAMP`) in `src/state.js` (`src/physics.js` just imports them).
- **Characters:** the `CHARACTERS` array in `src/character.js`.
- **Music:** the audio module in `src/audio.js` (each tower shifts musical key via `setTheme`).

Rendering is Three.js (a retained scene graph, one renderer, `MeshStandardMaterial` + lights) over the Web Audio API.
