import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtTime } from '../src/flow.js';

test('fmtTime formats mm:ss.d', () => {
  assert.equal(fmtTime(0), '0:00.0');
  assert.equal(fmtTime(75.4), '1:15.4');
});
