import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fixProfile, BLANK_PROFILE } from '../src/profile.js';

test('BLANK_PROFILE has no cosmetic fields', () => {
  const p = BLANK_PROFILE();
  assert.equal('accs' in p, false);
  assert.equal('cos' in p, false);
  assert.equal('equipAcc' in p, false);
  assert.equal('equipCos' in p, false);
  assert.equal(p.beaten, 0);
});

test('fixProfile drops legacy cosmetic fields but keeps progress', () => {
  const legacy = {
    beaten: 2, fruit: 40, accs: ['fruitcrown'], cos: ['x'],
    equipAcc: 'fruitcrown', equipCos: { 0: 'x' }, bestLvl: [12.3, null, null],
  };
  const p = fixProfile(legacy);
  assert.equal(p.beaten, 2);
  assert.equal(p.fruit, 40);
  assert.deepEqual(p.bestLvl, [12.3, null, null]);
  assert.equal('accs' in p, false);
  assert.equal('cos' in p, false);
  assert.equal('equipAcc' in p, false);
  assert.equal('equipCos' in p, false);
});
