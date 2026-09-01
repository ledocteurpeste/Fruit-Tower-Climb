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
