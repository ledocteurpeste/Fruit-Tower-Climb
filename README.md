# 🌈 Rainbow Jump!

A simple, colorful **3D obby** (obstacle course, like Roblox) made for a young
child. Hop across floating platforms, collect coins 🪙, and reach the golden
flag ⭐. Fall off? You pop right back to the last platform — you can never
"lose", so it stays fun and frustration-free.

It's a **single HTML file with no dependencies** — no internet, no install, no
app store. It runs entirely on the device.

## How to play

- **Left side of the screen** — touch and slide to walk (a joystick appears
  under your thumb, Minecraft-style).
- **Big green JUMP button** (bottom right) — jump.
- **Drag the right side of the screen** — look around / turn the camera.
- On a computer: **WASD / arrow keys** to move, **Space** to jump, **drag the
  mouse** to look.

Best played on a **phone held sideways (landscape)**.

## Running it

### On a computer
Just double-click `index.html` — it opens in your browser and plays.

### On an iPhone / iPad (fully local, no server)
1. Email or AirDrop `index.html` to the device (or put it in Files / iCloud
   Drive).
2. Open the **Files** app, tap `index.html`.
3. If it doesn't open in a browser, share it to a browser, or use an app that
   opens local HTML. Then turn the phone **sideways** and tap **Play**.

### Easiest way to get it onto a phone
Serve the folder from a computer on the same Wi‑Fi and open the address on the
phone:

```bash
cd iOS-Local-Browser-Game
python3 -m http.server 8000
```

Then on the phone's browser go to `http://<your-computer-ip>:8000`.
(The game itself still runs 100% locally in the browser — the server is only
used to hand the file to the phone.)

## Tips for grown-ups

Everything the game does lives in `index.html`. A few easy tweaks:

- **Make it easier/harder:** in the `buildLevel()` function, the `steps` list
  controls each hop — `[sideways, forward, height, size]`. Smaller `forward`
  gaps and bigger `size` = easier.
- **Change jump feel:** the `JUMP`, `GRAV`, and `MOVE` constants near
  `const GRAV = ...`.
- **Colors:** the `PAL` palette and the character's colors in the `render()`
  function.

It's a tiny custom 3D engine built on WebGL (all shapes are boxes), so it stays
fast even on older phones.
