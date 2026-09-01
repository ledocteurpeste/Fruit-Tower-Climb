import { initScene, render, resize } from './scene.js';
import { applyCamera } from './camera.js';
import { player } from './state.js';
import { loadCharacter, updateCharacter } from './character.js';

const canvas = document.getElementById('game');
const { scene, camera } = initScene(canvas);

player.y = 3;
player.onGround = false;

loadCharacter('robot')
  .then((g) => {
    scene.add(g);
    // No physics yet: settle onto the "ground" so Idle plays.
    setTimeout(() => { player.y = player.hh; player.onGround = true; }, 1000);
  })
  .catch((err) => console.error('character load failed', err));

addEventListener('resize', () => resize(canvas));
resize(canvas);

let last = 0;
function frame(now) {
  const t = now / 1000;
  const dt = Math.min(0.05, t - last);
  last = t;
  updateCharacter(dt, t);
  applyCamera(camera, player);
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
