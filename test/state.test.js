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
