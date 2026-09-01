import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cameraEye } from '../src/camera.js';

test('eye sits behind and above the player, looking at their head', () => {
  const cam = { yaw: Math.PI, pitch: 0.42, dist: 10 };
  const p = { x: 0, y: 0, z: 0 };
  const { eye, look } = cameraEye(p, cam);
  assert.ok(eye[1] > 1.5, 'above the player');
  assert.ok(Math.abs(eye[2]) > 3, 'pulled back on z');
  assert.deepEqual(look, [0, 0.7, 0]);
});
