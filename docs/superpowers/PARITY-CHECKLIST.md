# Three.js Engine Port — Parity Verification Checklist

The Three.js port is code-complete and cut over: `index.html` now loads the
`src/` engine. This checklist is the **browser playthrough** that verifies the
new engine behaves like the pre-port custom-WebGL engine. It could not be run in
the porting environment, so it is handed to you.

## How to run both versions side by side

1. Get the pre-port `index.html`:

   ```bash
   git show 22d0e6e:index.html > /tmp/old-index.html
   ```

2. Serve the repo over HTTP (import maps need it):

   ```bash
   python3 -m http.server 8777
   ```

3. Open the **new** engine at `http://localhost:8777/` in one browser tab/window.

4. Open the **old** engine by loading `/tmp/old-index.html` directly (it is a
   single self-contained file — `file://` is fine), ideally in a second window
   beside the first, same browser.

5. Play the same sections in both and compare feel. Watch the devtools console on
   the new version for errors.

---

## Movement feel

- [ ] All three towers completable start to finish
- [ ] Jump height / run speed / air control feel identical (physics constants unchanged)
- [ ] Trampoline launch height matches
- [ ] Balloon swing grab distance, arc, and release velocity match
- [ ] Fan push strength matches

## Platforms & hazards

- [ ] Moving/rotating platforms carry the player correctly, incl. rotation
- [ ] Crumbling banana bridges drop on the same timing
- [ ] Spikes, water, and out-of-bounds all kill and respawn at the last checkpoint

## Collectibles & progression

- [ ] Coins: pickup radius, life-gain at threshold, count persists per run
- [ ] Keys open cages; caged NPC rescue gates the finish
- [ ] Checkpoint buoys update respawn
- [ ] Timer, per-tower banking, and final time on the win screen match

## Camera & controls

- [ ] Camera follow distance, height, and catch-up feel match
- [ ] Touch controls on a phone (or devtools device mode): stick, look-drag, JUMP, orientation nag
- [ ] "View" button snaps the camera back behind the player

## Audio

- [ ] Music starts on play, stops on menu/win/over
- [ ] SFX fire on jump / coin / death / tramp / swing / crack
- [ ] Each tower shifts musical key

## UI / menus

- [ ] Animated title screen, main menu (Begin · Options · Leaderboard · Quit)
- [ ] Options toggles: Music, Sound Effects, Cheats (unlimited lives)
- [ ] Leaderboard save/load, options persistence, profile switching
- [ ] Character-select screen: 3D preview rotates, all four climbers selectable

## Profile migration

- [ ] `localStorage` migration: a pre-port profile loads and keeps `beaten`
- [ ] Cosmetic-only fields dropped from the old profile don't break loading

## Performance

- [ ] 60 fps on a mid device (FPS meter or `chrome://tracing`)
- [ ] No per-frame allocations in `syncDynamics`
- [ ] No console errors during a full tower run

---

## Known deferred cosmetic differences

These were accepted during the port (see the SDD ledger). They are **not**
parity bugs — do not file them as regressions:

- **Squash floor 0.35** — the trampoline pad won't fully flatten when hit.
- **Belt / treadmill** — no visual scroll on the belt surface (it still pushes
  the player).
- **Checkpoint buoy** — missing the white stripe and the thicker pole of the old
  model.
- **Birds and shark fins** — ambient background critters not ported.
- **Fog / lighting** — Three.js `MeshStandardMaterial` + lights instead of the
  old flat two-sided shader; will not pixel-match (colours and shading differ
  slightly).
- **`saveWinName` fallback** — default name is now `"Climber"`.
- **`#charDots`** — not rebuilt on the character-select screen.
