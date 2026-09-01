// Pure gameplay -> animation-state mapping. NO `three` import: must load under `node --test`.
export function pickState(player, t) {
  if (player.dead) return 'dead';
  if (player.celebrateUntil > t) return 'cheer';
  if (player.swing) return 'swing';
  if (player.climbing) return 'climb';
  if (!player.onGround) return 'jump';
  if (Math.hypot(player.vx, player.vz) > 0.6) return 'run';
  return 'idle';
}
