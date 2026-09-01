import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickState } from '../src/character-state.js';

const base = { dead: false, celebrateUntil: 0, swing: null, climbing: false,
  onGround: true, vx: 0, vz: 0 };

test('grounded and still -> idle', () => {
  assert.equal(pickState({ ...base }, 0), 'idle');
});
test('grounded and moving -> run', () => {
  assert.equal(pickState({ ...base, vx: 3 }, 0), 'run');
});
test('airborne -> jump', () => {
  assert.equal(pickState({ ...base, onGround: false }, 0), 'jump');
});
test('dead wins over everything', () => {
  assert.equal(pickState({ ...base, dead: true, onGround: false }, 0), 'dead');
});
test('celebrate window -> cheer', () => {
  assert.equal(pickState({ ...base, celebrateUntil: 5 }, 3), 'cheer');
});
