import * as THREE from 'three';
import { initScene, render, resize, GEO, mat } from './scene.js';

const canvas = document.getElementById('game');
const { scene } = initScene(canvas);
const cube = new THREE.Mesh(GEO.box, mat(0xff4d6d));
cube.position.y = 3; scene.add(cube);

addEventListener('resize', () => resize(canvas));
resize(canvas);

function frame(now) {
  cube.rotation.y = now / 1000;
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
