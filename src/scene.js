import * as THREE from 'three';
import { VFOV_RAD } from './camera.js';
import { typeOf } from './registry.js';

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

/* =========================================================================
   Asset registry + per-level scene build (Milestone 3a).
   REGISTRY: one entry per piece type, each { glb, placeholder(item) }.
   Placeholders are blocky stand-ins built from the shared GEO pool + cached
   mat(); a handful clone their material (translucency / emissive) and are
   tracked for disposal. Tasks 13/14 animate these via item._obj / userData
   and fill the syncDynamics / resetHazards stubs.
   ========================================================================= */

const SHARED_GEO = new Set(Object.values(GEO));
const _levelMats = new Set();
const _levelGeos = new Set();

// A per-level material clone (so we can flip transparent/emissive without
// mutating the shared cached material shared by every piece of that colour).
function ownMat(color) {
  const m = mat(color).clone();
  _levelMats.add(m);
  return m;
}

const FRUIT_COL = {
  cherry: 0xd6183f, strawberry: 0xf03047, blueberry: 0x4f61d8, raspberry: 0xe0335f,
  watermelon: 0xff5d6e, orange: 0xff8c1a, kiwi: 0x9bd35a, pineapple: 0xffd94d,
  banana: 0xffe04a, lollipop: 0xff4fa3, gumdrop: 0x7ee0e0,
};
function fruitColor(name) {
  return FRUIT_COL[name] != null ? FRUIT_COL[name] : 0xff6688;
}

export const REGISTRY = {
  box: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.box, mat(item.c != null ? item.c : 0xb4762f));
      m.scale.set(item.w || 1, item.h || 1, item.d || 1);
      return m;
    },
  },
  disc: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const r = item.r || 1.5, h = item.h || 1.2;
      const base = new THREE.Mesh(GEO.cyl, mat(0xffd34d));
      base.scale.set(r * 2, h, r * 2);
      g.add(base);
      const top = new THREE.Mesh(GEO.sphere, mat(fruitColor(item.fruit)));
      top.scale.setScalar(r * 0.7);
      top.position.y = h / 2 + r * 0.15;
      g.add(top);
      g.userData.fruitTop = top;
      return g;
    },
  },
  boat: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.box, mat(0xf2f5f8));
      m.scale.set(item.w || 19, item.h || 2, item.d || 10);
      return m;
    },
  },
  tramp: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const r = item.r || 2.5, h = item.h || 1.2;
      const pad = new THREE.Mesh(GEO.cyl, mat(0x39d0c0));
      pad.scale.set(r * 2, h, r * 2);
      g.add(pad);
      g.userData.pad = pad;
      return g;
    },
  },
  fan: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const r = item.r || 2, ht = item.height || 8;
      const tube = new THREE.Mesh(GEO.cyl, mat(0x8899aa));
      tube.scale.set(r * 2, ht, r * 2);
      g.add(tube);
      const blade = new THREE.Mesh(GEO.box, mat(0xccd5e0));
      blade.scale.set(r * 1.8, 0.12, 0.4);
      blade.position.y = ht / 2 + 0.1;
      g.add(blade);
      g.userData.blade = blade;
      return g;
    },
  },
  swing: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const len = item.len || 5.4;
      const geo = new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -len, 0)]);
      _levelGeos.add(geo);
      const lmat = new THREE.LineBasicMaterial({ color: 0x444444 });
      _levelMats.add(lmat);
      g.add(new THREE.Line(geo, lmat));
      const balloon = new THREE.Mesh(GEO.sphere, mat(0xff5566));
      balloon.scale.setScalar(0.8);
      balloon.position.y = -len;
      g.add(balloon);
      g.userData.balloon = balloon;
      return g;
    },
  },
  gate: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.box, mat(0x8a5a2a));
      m.scale.set(item.w || 4, item.h || 5, item.d || 1);
      return m;
    },
  },
  log: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.cyl, mat(0x9c6b2f));
      const dia = item.h || 1;
      m.scale.set(dia, item.w || 3, dia);
      m.rotation.z = Math.PI / 2;
      return m;
    },
  },
  pad: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.cyl, mat(0xff8c1a));
      m.scale.set(item.w || 3, item.h || 1, item.d || 3);
      return m;
    },
  },
  belt: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.box, mat(0x444a55));
      m.scale.set(item.w || 4, item.h || 1, item.d || 3);
      return m;
    },
  },
  slowMo: {
    glb: null,
    placeholder(item) {
      const sm = ownMat(0x66d46a);
      sm.transparent = true;
      sm.opacity = 0.5;
      const m = new THREE.Mesh(GEO.box, sm);
      m.scale.set(item.w || 4, item.h || 1, item.d || 3);
      return m;
    },
  },
  banana: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.box, mat(0xffd94d));
      m.scale.set(item.w || 3, item.h || 1, item.d || 3);
      return m;
    },
  },
  wall: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const w = item.w || 3, h = item.h || 3, d = item.d || 2;
      const base = new THREE.Mesh(GEO.box, mat(0x8f5a2a));
      base.scale.set(w, h, d);
      g.add(base);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        const crate = new THREE.Mesh(GEO.box, mat(0xa9702f));
        crate.scale.set(w * 0.27, h * 0.27, d * 1.12);
        crate.position.set((c - 1) * w * 0.31, (r - 1) * h * 0.31, 0);
        g.add(crate);
      }
      return g;
    },
  },
  spike: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const n = item.n || 4, w = item.w || 4, r = item.r || 0.52, h = item.h || 1.05;
      const step = w / n;
      for (let i = 0; i < n; i++) {
        const cone = new THREE.Mesh(GEO.cone, mat(0xcfd6da));
        cone.scale.set(r * 2, h, r * 2);
        cone.position.set(-w / 2 + step * (i + 0.5), h / 2, 0);
        g.add(cone);
      }
      return g;
    },
  },
  coin: {
    glb: null,
    placeholder(item) {
      const cm = ownMat(0xff3b6b);
      cm.emissive = new THREE.Color(0xff3b6b);
      cm.emissiveIntensity = 0.4;
      const m = new THREE.Mesh(GEO.sphere, cm);
      m.scale.setScalar(0.28);
      return m;
    },
  },
  key: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const gold = 0xffcc33;
      const ring = new THREE.Mesh(GEO.cyl, mat(gold));
      ring.scale.set(0.7, 0.14, 0.7);
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const bit = new THREE.Mesh(GEO.box, mat(gold));
      bit.scale.set(0.16, 0.6, 0.16);
      bit.position.y = -0.5;
      g.add(bit);
      return g;
    },
  },
  cage: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const r = item.r || 2.3, bars = 10;
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Math.PI * 2;
        const bar = new THREE.Mesh(GEO.box, mat(0x777f88));
        bar.scale.set(0.12, 3.4, 0.12);
        bar.position.set(Math.cos(a) * r, 1.7, Math.sin(a) * r);
        g.add(bar);
      }
      return g;
    },
  },
  npc: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(GEO.sphere, mat(0xffd2a6));
      body.scale.set(0.55, 0.75, 0.55);
      body.position.y = 0.75;
      g.add(body);
      const head = new THREE.Mesh(GEO.sphere, mat(0xffe0c0));
      head.scale.setScalar(0.34);
      head.position.y = 1.5;
      g.add(head);
      return g;
    },
  },
  portal: {
    glb: null,
    placeholder(item) {
      const pm = ownMat(0x9a7bff);
      pm.emissive = new THREE.Color(0x9a7bff);
      pm.emissiveIntensity = 0.5;
      const r = item.r || 2.2;
      const ring = new THREE.Mesh(GEO.cyl, pm);
      ring.scale.set(r * 2, 0.4, r * 2);
      ring.rotation.x = Math.PI / 2;
      const g = new THREE.Group();
      g.add(ring);
      g.userData.ring = ring;
      return g;
    },
  },
  arch: {
    glb: null,
    placeholder(item) {
      const g = new THREE.Group();
      const w = item.w || 6, h = item.h || 6;
      for (const sx of [-1, 1]) {
        const pillar = new THREE.Mesh(GEO.cyl, mat(0xd8c8a0));
        pillar.scale.set(0.6, h, 0.6);
        pillar.position.set(sx * w / 2, h / 2, 0);
        g.add(pillar);
      }
      const top = new THREE.Mesh(GEO.box, mat(0xd8c8a0));
      top.scale.set(w + 1, 0.8, 1);
      top.position.y = h;
      g.add(top);
      return g;
    },
  },
  finish: {
    glb: null,
    placeholder(item) {
      const m = new THREE.Mesh(GEO.box, mat(0xffffff));
      m.scale.set(item.w || 4, 1.6, 0.2);
      m.position.y = 1.4;
      return m;
    },
  },
};

const _loaded = {};

// No glb assets exist yet; every REGISTRY.glb is null, so this resolves
// immediately. Kept so Task 9's loader has a hook.
export async function loadAssets() {
  return _loaded;
}

function resolve(type, item) {
  const entry = REGISTRY[type] || REGISTRY.box;
  if (entry.glb && _loaded[type]) return _loaded[type].scene.clone(true);
  return entry.placeholder(item);
}

export function disposeLevel() {
  if (!_ctx) return;
  const g = _ctx.levelGroup;
  g.traverse((o) => {
    if (o.geometry && !SHARED_GEO.has(o.geometry)) o.geometry.dispose();
  });
  for (const m of _levelMats) m.dispose();
  for (const geo of _levelGeos) geo.dispose();
  _levelMats.clear();
  _levelGeos.clear();
  for (let i = g.children.length - 1; i >= 0; i--) g.remove(g.children[i]);
}

export function buildSceneForLevel(world) {
  if (!_ctx) return;
  disposeLevel();
  const g = _ctx.levelGroup;
  if (!world) return;

  const add = (item, type) => {
    if (!item) return;
    const obj = resolve(type, item);
    obj.position.set(item.x || 0, item.y || 0, item.z || 0);
    obj.rotation.y = item.ang || 0;
    obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    item._obj = obj;
    item._static = !(item.axis || item.spin || item.crumb || item.belt || item.riders || item.tramp);
    g.add(obj);
  };

  for (const s of world.solids || []) { if (s.nodraw) continue; add(s, typeOf(s)); }
  for (const k of world.spikes || []) add(k, 'spike');
  for (const c of world.coins || []) { add(c, 'coin'); c._static = false; }
  for (const k of world.keys || []) add(k, 'key');
  for (const c of world.cages || []) add(c, 'cage');
  for (const n of world.npcs || []) add(n, 'npc');
  for (const p of world.ports || []) { add(p, 'portal'); p._static = false; }
  add(world.goal, 'portal'); if (world.goal) world.goal._static = false;
  add(world.finish, 'finish');
  add(world.arch, 'arch');

  const th = world.theme;
  if (th) {
    if (th.sky) _ctx.scene.background = new THREE.Color(th.sky[0], th.sky[1], th.sky[2]);
    if (th.fog && _ctx.scene.fog) _ctx.scene.fog.color = new THREE.Color(th.fog[0], th.fog[1], th.fog[2]);
  }
}

export function syncDynamics(t) {}   // Task 13
export function resetHazards() {}    // Task 14
