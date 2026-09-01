import { test } from 'node:test';
import assert from 'node:assert/strict';

test('audio module imports without a DOM', async () => {
  const mod = await import('../src/audio.js');
  assert.equal(typeof mod.Audio_.sfx, 'function');
});
