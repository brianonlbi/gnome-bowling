// Small helpers for building everything out of primitive shapes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = a => a[(Math.random() * a.length) | 0];
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const mats = new Map(), geos = new Map();
export function M(color, o) {
  const k = color + (o ? JSON.stringify(o) : '');
  let m = mats.get(k);
  if (!m) { m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.78, metalness: 0 }, o || {})); mats.set(k, m); }
  return m;
}
export function glow(color) { const k = 'glow' + color; let m = mats.get(k); if (!m) { m = new THREE.MeshBasicMaterial({ color, toneMapped: false }); mats.set(k, m); } return m; }
export function G(type, ...a) {
  const k = type + a.join(',');
  let g = geos.get(k);
  if (!g) { g = new THREE[type + 'Geometry'](...a); geos.set(k, g); }
  return g;
}
export function mesh(geo, mat, x = 0, y = 0, z = 0, sx = 1, sy, sz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy == null ? sx : sy, sz == null ? sx : sz); m.castShadow = true;
  return m;
}
export const sph = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1) => mesh(G('Sphere', 1, 20, 14), mat, x, y, z, r * sx, r * sy, r * sz);
export const cyl = (rt, rb, h, mat, x, y, z, seg = 16) => mesh(G('Cylinder', rt, rb, h, seg), mat, x, y, z);
export const box = (w, h, d, mat, x, y, z) => mesh(G('Box', 1, 1, 1), mat, x, y, z, w, h, d);
export const cone = (r, h, mat, x, y, z, seg = 16) => mesh(G('Cone', r, h, seg), mat, x, y, z);
export const torus = (r, t, mat, x, y, z, arc = TAU) => { const m = mesh(G('Torus', r, t, 10, 28, arc), mat, x, y, z); m.rotation.x = Math.PI / 2; return m; };
export function grp(x = 0, y = 0, z = 0, ...kids) { const g = new THREE.Group(); g.position.set(x, y, z); for (const k of kids) g.add(k); return g; }
export function rot(o, x = 0, y = 0, z = 0) { o.rotation.set(x, y, z); return o; }
// A capsule-ish limb hanging down from the origin (so rotating the parent swings it from the top).
export function limb(r, len, mat) { const m = mesh(G('Capsule', r, Math.max(0.001, len - 2 * r), 6, 12), mat, 0, -len / 2, 0); return m; }

// Merge lots of static shapes into one vertex-coloured mesh (one draw call).
export class Batch {
  constructor() { this.parts = []; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); }
  add(geo, color, x = 0, y = 0, z = 0, sx = 1, sy, sz, rx = 0, ry = 0, rz = 0) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz));
    g.applyMatrix4(this.m);
    const c = new THREE.Color(color), n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.parts.push(g); return this;
  }
  build(opts) {
    const geo = mergeGeometries(this.parts, false);
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.85 }, opts || {})));
    m.castShadow = true; m.receiveShadow = true; this.parts = [];
    return m;
  }
}
export function canvasTex(w, h, draw, opts) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; Object.assign(t, opts || {}); return t;
}
let _dot = null;
export function dotTex() { return _dot || (_dot = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.5, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); })); }

// Lightweight particle system: world-sized round points with per-particle colour, alpha and size.
export class Particles {
  constructor(n, additive) {
    this.n = n; this.i = 0; this.live = [];
    this.pos = new Float32Array(n * 3); this.col = new Float32Array(n * 4); this.size = new Float32Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(this.col, 4)); g.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 500);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float size;attribute vec4 color;varying vec4 vC;uniform float uScale;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(1.,size*uScale/-mv.z);gl_Position=projectionMatrix*mv;}',
      fragmentShader: 'varying vec4 vC;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vC.rgb,vC.a*smoothstep(.5,.28,d));}'
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.slots = new Array(n).fill(null);
  }
  emit(o) { // {x,y,z,vx,vy,vz,g,life,size,size1,color:[r,g,b],drag}
    const k = this.i; this.i = (this.i + 1) % this.n;
    this.slots[k] = { x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g == null ? 3 : o.g, t: 0, life: o.life || 1, s0: o.size || 0.05, s1: o.size1 == null ? (o.size || 0.05) : o.size1, c: o.color || [1, 1, 1], drag: o.drag || 0, a: o.alpha == null ? 1 : o.alpha, floor: o.floor };
  }
  update(dt) {
    const P = this.pos, Cc = this.col, S = this.size;
    for (let k = 0; k < this.n; k++) {
      const p = this.slots[k];
      if (!p) { S[k] = 0; continue; }
      p.t += dt; if (p.t >= p.life) { this.slots[k] = null; S[k] = 0; Cc[k * 4 + 3] = 0; continue; }
      p.vy -= p.g * dt; if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; p.vz *= f; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.floor != null && p.y < p.floor) { p.y = p.floor; p.vy *= -0.3; p.vx *= 0.6; p.vz *= 0.6; }
      const u = p.t / p.life;
      P[k * 3] = p.x; P[k * 3 + 1] = p.y; P[k * 3 + 2] = p.z;
      Cc[k * 4] = p.c[0]; Cc[k * 4 + 1] = p.c[1]; Cc[k * 4 + 2] = p.c[2]; Cc[k * 4 + 3] = p.a * (u < 0.7 ? 1 : (1 - u) / 0.3);
      S[k] = lerp(p.s0, p.s1, u);
    }
    const a = this.points.geometry.attributes; a.position.needsUpdate = a.color.needsUpdate = a.size.needsUpdate = true;
  }
}
export function hex3(h) { const c = new THREE.Color(h); c.convertLinearToSRGB(); return [c.r, c.g, c.b]; }
