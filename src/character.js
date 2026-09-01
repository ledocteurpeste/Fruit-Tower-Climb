import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { player } from './state.js';
import { pickState } from './character-state.js';
export { pickState };

export const CHARACTERS = [
  { id: 'robot', name: 'Test Bot', glb: 'assets/character/RobotExpressive.glb' },
];

// RobotExpressive clip names by gameplay state. All six referenced names
// ('Idle','Running','Jump','Walking','Dance','Death') are present in the .glb.
const CLIP = {
  idle: 'Idle', run: 'Running', jump: 'Jump', climb: 'Walking',
  swing: 'Jump', cheer: 'Dance', dead: 'Death',
};

const MODEL_SCALE = 0.35;

let model = null, mixer = null, actions = {}, active = null, lastState = 'idle';
const playerGroup = new THREE.Group();
let footOffset = 0;

/* Dispose every geometry / material / texture under an Object3D. Shared by the
   in-game re-select path (Task-9 deferred minor) and the preview teardown. */
function disposeTree(obj) {
  if (!obj) return;
  obj.traverse((o) => {
    if (o.geometry && o.geometry.dispose) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((mat) => {
      if (!mat) return;
      for (const k in mat) { const v = mat[k]; if (v && v.isTexture && v.dispose) v.dispose(); }
      if (mat.dispose) mat.dispose();
    });
  });
}

export function loadCharacter(id) {
  const def = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(def.glb, (gltf) => {
      while (playerGroup.children.length) {
        const old = playerGroup.children[0];
        playerGroup.remove(old);
        disposeTree(old);
      }
      if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(mixer.getRoot()); mixer = null; }
      model = gltf.scene;
      model.scale.setScalar(MODEL_SCALE);
      model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      // Align feet to the group origin: after scaling, box.min.y is the lowest
      // point in local units; lift the model so that point sits at y=0.
      const box = new THREE.Box3().setFromObject(model);
      footOffset = -box.min.y;
      model.position.y = footOffset;
      playerGroup.add(model);
      mixer = new THREE.AnimationMixer(model);
      actions = {};
      gltf.animations.forEach((c) => { actions[c.name] = mixer.clipAction(c); });
      active = null; lastState = 'idle';
      setAction(resolveAction('idle'));
      resolve(playerGroup);
    }, undefined, reject);
  });
}

function resolveAction(state) {
  return actions[CLIP[state]] || actions[CLIP.idle] || Object.values(actions)[0] || null;
}

function setAction(to) {
  if (!to || active === to) return;
  if (active) active.fadeOut(0.2);
  to.reset().fadeIn(0.2).play();
  active = to;
}

export function updateCharacter(dt, t) {
  if (!model) return;
  // Group origin sits at the player's feet (player.y - half-height).
  playerGroup.position.set(player.x, player.y - player.hh, player.z);
  playerGroup.rotation.y = player.facing;
  const st = pickState(player, t);
  if (st !== lastState) { setAction(resolveAction(st)); lastState = st; }
  if (mixer) mixer.update(dt);
}

export function characterGroup() { return playerGroup; }

/* ---------------------------------------------------------------------------
   Character-select 3D preview (Task 16).

   A SECOND, self-contained WebGLRenderer with its own scene/camera/lights and
   its own requestAnimationFrame loop. Accepted trade-off per the spec: one
   extra WebGL context while the char screen is open. stopCharPreview() fully
   tears it down (dispose + forceContextLoss) so repeated visits do not leak
   contexts.
   --------------------------------------------------------------------------- */
const PREVIEW_DEFAULT = { w: 320, h: 420 };
let pv = null;   // { renderer, scene, camera, group, mixer, clock, raf, mountEl, w, h }

function previewSize(mountEl) {
  const w = Math.round(mountEl.clientWidth || 0);
  const h = Math.round(mountEl.clientHeight || 0);
  if (w > 1 && h > 1) return { w, h };
  return { w: PREVIEW_DEFAULT.w, h: PREVIEW_DEFAULT.h };
}

function loadPreviewModel() {
  if (!pv) return;
  const def = CHARACTERS[getChosenSafe()] || CHARACTERS[0];
  new GLTFLoader().load(def.glb, (gltf) => {
    if (!pv) return;              // stopped while loading
    while (pv.group.children.length) {
      const old = pv.group.children[0];
      pv.group.remove(old);
      disposeTree(old);
    }
    if (pv.mixer) { pv.mixer.stopAllAction(); pv.mixer = null; }
    const m = gltf.scene;
    m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    // Fit ~2 units tall and stand the model on the group origin.
    const box = new THREE.Box3().setFromObject(m);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = 2 / Math.max(0.001, size.y);
    m.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(m);
    m.position.y = -box2.min.y;
    m.position.x = -(box2.min.x + box2.max.x) / 2;
    m.position.z = -(box2.min.z + box2.max.z) / 2;
    pv.group.add(m);
    pv.mixer = new THREE.AnimationMixer(m);
    const idle = gltf.animations.find((c) => c.name === 'Idle') || gltf.animations[0];
    if (idle) pv.mixer.clipAction(idle).reset().play();
  }, undefined, (err) => console.error('preview model load failed', err));
}

// getChosen lives in hud.js; importing it here would create a hud <-> character
// cycle. selectCharacter is handed the accessors instead (see below); the
// preview keeps its own last-known index, seeded on start / select.
let pvChosen = 0;
function getChosenSafe() { return pvChosen % Math.max(1, CHARACTERS.length); }

export function startCharPreview(mountEl, chosenIdx) {
  if (!mountEl) return;
  if (pv) stopCharPreview();
  if (typeof chosenIdx === 'number') pvChosen = chosenIdx | 0;

  const { w, h } = previewSize(mountEl);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(w, h, false);
  const cv = renderer.domElement;
  cv.style.position = 'absolute';
  cv.style.left = '0';
  cv.style.top = '0';
  cv.style.width = '100%';
  cv.style.height = '100%';
  cv.style.pointerEvents = 'none';
  cv.style.zIndex = '0';
  if (getComputedStyle(mountEl).position === 'static') mountEl.style.position = 'relative';
  mountEl.insertBefore(cv, mountEl.firstChild);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
  camera.position.set(3.2, 2.4, 4.2);          // 3/4 angle
  camera.lookAt(0, 1, 0);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4);
  dir.position.set(3, 6, 4);
  scene.add(dir);
  const group = new THREE.Group();
  scene.add(group);

  pv = { renderer, scene, camera, group, mixer: null, clock: new THREE.Clock(), raf: 0, mountEl, w, h };
  loadPreviewModel();

  const tick = () => {
    if (!pv) return;
    pv.raf = requestAnimationFrame(tick);
    const dt = pv.clock.getDelta();
    // Handle a mount element that had zero size at start (or later resized).
    const s = previewSize(pv.mountEl);
    if (s.w !== pv.w || s.h !== pv.h) {
      pv.w = s.w; pv.h = s.h;
      pv.renderer.setSize(s.w, s.h, false);
      pv.camera.aspect = s.w / s.h;
      pv.camera.updateProjectionMatrix();
    }
    pv.group.rotation.y += 0.5 * dt;           // ~0.5 rad/s
    if (pv.mixer) pv.mixer.update(dt);
    pv.renderer.render(pv.scene, pv.camera);
  };
  pv.raf = requestAnimationFrame(tick);
}

export function stopCharPreview() {
  if (!pv) return;
  if (pv.raf) cancelAnimationFrame(pv.raf);
  if (pv.mixer) pv.mixer.stopAllAction();
  disposeTree(pv.scene);
  const cv = pv.renderer.domElement;
  pv.renderer.dispose();
  if (pv.renderer.forceContextLoss) pv.renderer.forceContextLoss();
  if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
  pv = null;
}

/* selectCharacter — steps the chosen index through CHARACTERS with wraparound,
   persists localStorage.ft_char, updates the preview model AND swaps the
   in-game model.

   Circular-import note: hud.js imports CHARACTERS from this module, so this
   module must NOT import from hud.js. Rather than pull in updateCharUI /
   setChosen / getChosen, selectCharacter receives them from the wiring site
   (hud.wireMenu, which owns all three locally) via the `hud` accessor object. */
export function selectCharacter(dir, hudApi) {
  const api = hudApi || {};
  const n = CHARACTERS.length;
  const cur = typeof api.getChosen === 'function' ? (api.getChosen() | 0) : pvChosen;
  const next = n > 0 ? ((cur + (dir | 0)) % n + n) % n : 0;
  pvChosen = next;
  if (typeof api.setChosen === 'function') api.setChosen(next);
  try { localStorage.setItem('ft_char', String(next)); } catch (e) { /* private mode */ }
  if (typeof api.onChange === 'function') api.onChange();
  // reload the small preview model
  if (pv) loadPreviewModel();
  // swap the in-game model (loadCharacter clears + disposes the old group first)
  const def = CHARACTERS[next] || CHARACTERS[0];
  loadCharacter(def.id).catch((err) => console.error('character swap failed', err));
}
