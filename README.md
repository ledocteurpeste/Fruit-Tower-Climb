# 🍒 Fruit Tower Climb 🫐

**A colorful 3D climbing game (an "obby"): Bounce, swing and dodge your way to the top of three fruity towers.**

Climb up **Cherry → Strawberry → Blueberry**, grabbing fruit and dodging hazards. Reach the flag at the top of each tower to move on, save princess Blueberry and race the clock for your best time. It's built for a young player: fun, forgiving, and includes frequent checkpoints, fall off and you pop right back to your last checkpoint.

> 🎮 **One file, no install, no internet.** The whole game is a single `index.html`, open it in any modern browser and play. Best on a phone held **sideways (landscape)**.

---

## ▶️ Play it

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
| 🫐 **Blueberry** | The finale | A **rope swing** across a big gap, falling platform hazards, treadmills, and a spikes |

Clear all three to win — your total time is saved to the leaderboard.

---

## ✨ What's in it

- **Choose your climber** — 3D characters: **Hazel** (blonde, white tee & jeans), **Mimi** (cat‑ear headband), **Max** (wavy "bacon" hair), and **Sam** (spiky black hair).
- **Collectable fruit, a run timer, and 3 lives** shown at the top — collect **50 fruits for an extra life**. Fruits reset each tower.
- **Checkpoints** throughout: fall and you respawn at the last flag, so it never gets frustrating.
- **Full menus:** animated title screen, main menu (Begin · Options · Leaderboard · Quit), **Options** to toggle Music, Sound Effects, and **Cheats** (unlimited lives), and a **Leaderboard** of best times saved on the device.
- **Music & sound effects** are generated right in the browser — no audio files to load.

---

## 🛠️ For grown-ups (tweaking it)

Everything lives in `index.html` — no build step, no dependencies.

- **Make a tower easier/harder:** each tower is built in `buildLevel()`; the `steps` list places platforms as `[sideways, forward, height, size]` — smaller gaps and bigger `size` = easier.
- **Jump feel:** the `JUMP`, `GRAV`, `MOVE`, `TRAMP` constants near the top of the game logic.
- **Characters:** the `CHARACTERS` array (colors + features).
- **Music:** the `Audio_` object (each tower shifts musical key via `Audio_.setTheme`).

Built on a tiny custom WebGL engine (boxes, cylinders and cones) plus the Web Audio API, so it stays fast even on older phones.
