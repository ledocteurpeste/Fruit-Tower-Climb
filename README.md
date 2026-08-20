# 🍒 Fruit Tower Climb 🫐

A colorful 3D climbing **obby** (obstacle course) made for Hazel. Climb to the
top of three fruit-themed towers — **Cherry → Strawberry → Blueberry** — grab
coins on the way up, dodge the hazards, and reach the flag at the top to move on
to the next tower. Race the clock for your best time!

It's a **single HTML file with no dependencies** — no internet, no install, no
app store. Just open it on the phone and play. Best held **sideways
(landscape)**.

## How to play

- **Left side of the screen** — touch & slide to walk (a joystick appears under
  your thumb, Minecraft-mobile style).
- **Big green JUMP button** (bottom right) — jump.
- **Blue “view” button** — snaps the camera back behind you if you get turned
  around.
- **Drag anywhere on the right side** — look around.
- On a computer: **WASD / arrow keys** to move, **Space** to jump, **drag the
  mouse** to look, **Esc** to pause.

## What's in it

- **Choose your climber** — four Roblox-style characters: **Lily** (blonde,
  white tee & jeans), **Mimi** (cat-ear headband), **Max** (wavy “bacon” hair),
  and **Sam** (spiky black hair).
- **Three towers**, each fruit-themed with its own colors and music.
- **Obstacles & gadgets:** moving platforms, spinning ride discs, a trampoline
  that bounces you over a wall, spikes to avoid, fans that push you up (and
  down), and a **rope you swing from** (tap JUMP to let go!).
- **Coins** to collect, a **timer** for your run, and **3 lives** shown at the
  top. Grab **50 coins to earn an extra life**. Coins reset each tower.
- **Checkpoints** — if you fall, you pop back to the last flag you touched.
- **Menus:** animated title, main menu (Begin, Options, Leaderboard, Quit),
  **Options** to turn Music / Sound Effects on or off and enable **Cheats**
  (unlimited lives), and a **Leaderboard** of your best times (saved on the
  device).
- **Music & sound effects** are generated right in the browser — no audio files.

## Running it

### On a computer
Double-click `index.html` — it opens in your browser and plays.

### On an iPhone / iPad (fully local, no server)
1. AirDrop or email `index.html` to the device (or drop it in Files / iCloud
   Drive).
2. Open the **Files** app and tap `index.html` (or share it into Safari/Chrome).
3. Turn the phone **sideways**, wait for the title, and tap **Begin Game**.
   Tap the screen once so sound can start.

### Easiest way to get it onto a phone
Serve the folder from a computer on the same Wi-Fi:

```bash
cd iOS-Local-Browser-Game
python3 -m http.server 8000
```

Then on the phone's browser go to `http://<your-computer-ip>:8000`.
(The game still runs 100% locally in the browser — the server just hands over
the file.)

## Tips for grown-ups

Everything lives in `index.html`.

- **Make a tower easier/harder:** each tower is built in `buildLevel()`. The
  `steps` list places platforms as `[sideways, forward, height, size]` — smaller
  gaps and bigger `size` = easier.
- **Jump feel:** the `JUMP`, `GRAV`, `MOVE`, `TRAMP` constants near the top of
  the game logic.
- **Characters:** the `CHARACTERS` array (colors + features).
- **Music/keys:** the `Audio_` object (each tower shifts key with
  `Audio_.setTheme`).

Built on a tiny custom WebGL engine (boxes, cylinders and cones), so it stays
fast even on older phones.
