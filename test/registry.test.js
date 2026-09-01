import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typeOf } from '../src/registry.js';

test('classifies solids by flag', () => {
  assert.equal(typeOf({ boat: true }), 'boat');
  assert.equal(typeOf({ tramp: true }), 'tramp');
  assert.equal(typeOf({ type: 'disc' }), 'disc');
  assert.equal(typeOf({ crumb: true }), 'banana');
  assert.equal(typeOf({ type: 'box', w: 1, h: 1, d: 1 }), 'box');
});

test('first-match order follows index.html render()', () => {
  assert.equal(typeOf({ gate: true, type: 'disc' }), 'gate');
  assert.equal(typeOf({ log: true, wall: true }), 'log');
  assert.equal(typeOf({ banana: true }), 'banana');
  assert.equal(typeOf({ wall: true }), 'wall');
  assert.equal(typeOf({ pad: true, belt: true }), 'pad');
});

test('falls back to box for plain and empty items', () => {
  assert.equal(typeOf({}), 'box');
  assert.equal(typeOf(null), 'box');
  assert.equal(typeOf({ type: 'box' }), 'box');
});
