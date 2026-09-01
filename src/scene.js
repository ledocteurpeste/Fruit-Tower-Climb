import * as THREE from 'three';
import { VFOV_RAD } from './camera.js';

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 24),
  cone: new THREE.ConeGeometry(1, 1, 20),
  sphere: new THREE.SphereGeometry(1, 20, 14),
};

const _mats = new Map();
export function mat(color) {
  const key = Array.isArray(color) ? color.join(',') : String(color);
  if (!_mats.has(key)) {
    const c = Array.isArray(color)
      ? new THREE.Color(color[0], color[1], color[2])
      : new THREE.Color(color);
    _mats.set(key, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0 }));
  }
  return _mats.get(key);
}

let _ctx = null;

export function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fd6f7);
  scene.fog = new THREE.Fog(0x8fd6f7, 40, 220);

  const camera = new THREE.PerspectiveCamera(
    THREE.MathUtils.radToDeg(VFOV_RAD), canvas.clientWidth / canvas.clientHeight, 0.1, 600);

  scene.add(new THREE.HemisphereLight(0xdfefff, 0x2f3a44, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(30, 60, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 80;
  Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 220 });
  scene.add(sun);

  const levelGroup = new THREE.Group();
  const envGroup = new THREE.Group();
  scene.add(levelGroup, envGroup);

  _ctx = { renderer, scene, camera, levelGroup, envGroup, sun };
  return _ctx;
}

export function resize(canvas) {
  if (!_ctx) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  _ctx.renderer.setSize(w, h, false);
  _ctx.camera.aspect = w / h;
  _ctx.camera.updateProjectionMatrix();
}

export function render() { if (_ctx) _ctx.renderer.render(_ctx.scene, _ctx.camera); }
export function ctx() { return _ctx; }
