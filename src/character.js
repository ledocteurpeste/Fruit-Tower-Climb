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

export function loadCharacter(id) {
  const def = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(def.glb, (gltf) => {
      while (playerGroup.children.length) playerGroup.remove(playerGroup.children[0]);
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
