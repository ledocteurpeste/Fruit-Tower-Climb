import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hooks, installHooks } from '../src/hooks.js';

test('defaults are callable no-ops', () => {
  assert.doesNotThrow(() => hooks.sfx('jump'));
  assert.equal(hooks.showMsg('hi', 100), undefined);
});

test('installHooks overrides selected methods', () => {
  const calls = [];
  installHooks({ sfx: (n) => calls.push(n) });
  hooks.sfx('coin');
  assert.deepEqual(calls, ['coin']);
});
