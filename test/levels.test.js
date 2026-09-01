import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLevel, C, THEMES } from '../src/levels.js';

test('C converts hex to normalized rgb', () => {
  assert.deepEqual(C(0xff0000), [1, 0, 0]);
});

test('there are three themes', () => {
  assert.equal(THEMES.length, 3);
});

for (const idx of [0, 1, 2]) {
  test(`buildLevel(${idx}) produces a traversable world`, () => {
    const w = buildLevel(idx);
    assert.ok(w.spawn && typeof w.spawn.y === 'number');
    assert.ok(Array.isArray(w.solids) && w.solids.length > 5);
    assert.ok(w.goal || w.finish, 'has an end marker');
    // every solid has a collision footprint
    for (const s of w.solids) {
      const sized = (s.w && s.h && s.d) || (s.r && s.h) || s.type === 'disc';
      assert.ok(sized, `solid ${JSON.stringify(s).slice(0,80)} has size`);
    }
  });
}
