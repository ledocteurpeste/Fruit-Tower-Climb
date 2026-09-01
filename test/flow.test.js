import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtTime, levelComplete, winGame, saveWinName } from '../src/flow.js';
import { installHooks, hooks } from '../src/hooks.js';
import { run } from '../src/state.js';
import { useProfile, prof } from '../src/profile.js';

test('fmtTime formats mm:ss.d', () => {
  assert.equal(fmtTime(0), '0:00.0');
  assert.equal(fmtTime(75.4), '1:15.4');
});

const noop = () => {};
function resetHooks() {
  installHooks({
    sfx: noop, music: noop, showMsg: noop, onDie: noop, onRespawn: noop,
    onLevelComplete: noop, onWin: noop, onCoin: noop, onCheckpoint: noop,
    onSplash: noop, setState: noop, startNextLevel: noop, gameOver: noop,
    levelInterstitial: noop, winStats: noop, winName: noop,
  });
}

function spies(names) {
  const calls = {};
  const partial = {};
  names.forEach((n) => { calls[n] = []; partial[n] = (...a) => calls[n].push(a); });
  installHooks(partial);
  return calls;
}

test('levelComplete fires onWin on the final tower (levelIdx >= 2)', () => {
  resetHooks();
  const c = spies(['onWin', 'setState', 'levelInterstitial']);
  useProfile('FlowTester');
  run.running = true;
  run.levelIdx = 2;
  run.runTime = 42;
  levelComplete();
  assert.equal(c.onWin.length, 1);
  assert.equal(c.levelInterstitial.length, 0);
});

test('levelComplete shows the interstitial on earlier towers', () => {
  resetHooks();
  const c = spies(['onWin', 'setState', 'levelInterstitial']);
  run.running = true;
  run.levelIdx = 0;
  levelComplete();
  assert.equal(c.onWin.length, 0);
  assert.deepEqual(c.setState.at(-1), ['level']);
  assert.deepEqual(c.levelInterstitial.at(-1), [0]);
});

test('levelComplete is a no-op when run.running is already false', () => {
  resetHooks();
  const c = spies(['sfx', 'onWin', 'setState', 'levelInterstitial']);
  run.running = false;
  levelComplete();
  assert.equal(c.sfx.length, 0);
  assert.equal(c.onWin.length, 0);
  assert.equal(c.setState.length, 0);
});

test('winGame increments p.beaten and records p.best', () => {
  resetHooks();
  useProfile('BeatTester');
  const p = prof();
  p.beaten = 0;
  p.best = null;
  run.running = true;
  run.levelIdx = 2;
  run.runTime = 30;
  winGame();
  assert.equal(prof().beaten, 1);
  assert.equal(prof().best, 30);

  // a slower second run still counts as a win but does not beat the record
  run.running = true;
  run.runTime = 99;
  winGame();
  assert.equal(prof().beaten, 2);
  assert.equal(prof().best, 30);
});

test('saveWinName only saves once per win (savedThisWin latch)', () => {
  resetHooks();
  const c = spies(['winName']);
  useProfile('LatchTester');
  run.running = true;
  run.levelIdx = 2;
  run.runTime = 12;
  winGame();               // calls saveWinName internally once
  assert.equal(c.winName.length, 1);
  saveWinName();            // latched — no second save
  saveWinName();
  assert.equal(c.winName.length, 1);
});
