// Gnome Bowling 2.0 — every character and prop, built from simple shapes and posed like jointed toys.
import * as THREE from 'three';
import { G, M, glow, mesh, sph, cyl, box, cone, torus, grp, rot, limb, canvasTex, TAU, clamp } from './build.js';
import { C } from './physics.js';

const SKIN = 0xf6c9a8, RED = 0xc81d25, WHITE = 0xffffff, BLACK = 0x1c1c1c;
const fur = () => M(WHITE, { roughness: 1 });
const FONT = '"Arial Black",Impact,"Trebuchet MS",sans-serif';

function bentCone(r, h, bend, seg = 14) {
  const g = new THREE.ConeGeometry(r, h, seg, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = (p.getY(i) + h / 2) / h; p.setX(i, p.getX(i) + bend * t * t); p.setY(i, p.getY(i) - Math.abs(bend) * 0.35 * t * t); }
  g.computeVertexNormals(); return g;
}
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return c.getHex(); }
function textTex(text, o) {
  o = o || {};
  return canvasTex(o.w || 256, o.h || 128, (g, w, h) => {
    g.fillStyle = o.bg || '#fff'; g.fillRect(0, 0, w, h);
    if (o.border) { g.strokeStyle = o.border; g.lineWidth = o.bw || 12; g.strokeRect(0, 0, w, h); }
    g.fillStyle = o.color || '#c0392b'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let fs = o.size || h * 0.6; g.font = 'bold ' + fs + 'px ' + FONT;
    while (g.measureText(text).width > w * 0.86 && fs > 10) { fs -= 4; g.font = 'bold ' + fs + 'px ' + FONT; }
    g.fillText(text, w / 2, h / 2 + fs * 0.06);
  });
}

// ───────────────────────── gnome ─────────────────────────
const signTex = {};
export function buildGnome(hatCol, coatCol, tip) {
  const root = new THREE.Group(), vis = new THREE.Group(), model = new THREE.Group();
  root.add(vis); vis.add(model); model.scale.setScalar(1.12);
  const coat = M(coatCol), dark = M(shade(coatCol, 0.72)), skin = M(SKIN), white = fur();
  model.add(sph(1, M(0x4a2c17), -0.065, 0.035, 0.035, 0.065, 0.04, 0.095), sph(1, M(0x4a2c17), 0.065, 0.035, 0.035, 0.065, 0.04, 0.095));
  model.add(sph(0.15, coat, 0, 0.2, 0, 1, 1.05, 0.95));
  model.add(torus(0.146, 0.017, M(0x2b1a10), 0, 0.165, 0), box(0.05, 0.05, 0.02, M(0xffd23f, { metalness: 0.5, roughness: 0.3 }), 0, 0.165, 0.142));
  model.add(sph(0.108, skin, 0, 0.345, 0.014, 1, 0.9, 1), sph(0.108, white, 0, 0.338, -0.03, 1.03, 0.9, 0.9));
  model.add(sph(0.11, white, 0, 0.222, 0.088, 0.98, 1.3, 0.55));
  model.add(sph(0.054, M(0xf0a086, { roughness: 0.5 }), 0, 0.318, 0.128));
  const eyeM = M(0x1a1a1a, { roughness: 0.2 });
  const eyes = [sph(0.023, eyeM, -0.05, 0.372, 0.1), sph(0.023, eyeM, 0.05, 0.372, 0.1)];
  const whites = [sph(0.034, M(WHITE, { roughness: 0.3 }), -0.05, 0.374, 0.088), sph(0.034, M(WHITE, { roughness: 0.3 }), 0.05, 0.374, 0.088)];
  const xeyes = new THREE.Group();
  [-0.05, 0.05].forEach(x => { [-1, 1].forEach(s => { const b = box(0.06, 0.015, 0.015, eyeM, x, 0.372, 0.112); b.rotation.z = s * Math.PI / 4; xeyes.add(b); }); });
  const mouth = sph(1, M(0x5a1d1d), 0, 0.262, 0.142, 0.036, 0.03, 0.02), tongue = sph(1, M(0xff5a7a, { roughness: 0.4 }), 0, 0.238, 0.15, 0.022, 0.042, 0.016);
  model.add(...eyes, ...whites, xeyes, mouth, tongue);
  const hat = mesh(bentCone(0.14, 0.34, tip), M(hatCol), 0, 0.17, 0), brim = torus(0.136, 0.022, M(shade(hatCol, 0.8)), 0, 0.006, 0);
  const hatG = grp(0, 0.405, -0.012, hat, brim); hatG.rotation.x = -0.24; model.add(hatG);
  const arm = s => { const a = grp(s * 0.14, 0.275, 0, limb(0.035, 0.13, dark), sph(0.04, skin, 0, -0.145, 0)); model.add(a); return a; };
  const armL = arm(-1), armR = arm(1);
  const snowball = sph(0.05, white, 0, -0.2, 0); armR.add(snowball);
  const bum = grp(0, 0, 0, sph(0.085, M(0xf8cdb0, { roughness: 0.55 }), -0.062, 0.14, -0.105), sph(0.085, M(0xf8cdb0, { roughness: 0.55 }), 0.062, 0.14, -0.105), sph(1, M(0x31558f), 0, 0.06, -0.02, 0.16, 0.04, 0.155));
  model.add(bum);
  const sign = new THREE.Group(); sign.position.set(0.2, 0.3, 0.02);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.17), new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide })); board.position.y = 0.42; board.castShadow = true;
  sign.add(cyl(0.012, 0.012, 0.4, M(0x8a5a2b), 0, 0.2, -0.004), board); model.add(sign);
  const stars = new THREE.Group();
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glow(0xffd23f)); stars.add(s); }
  const g = { root, vis, model, armL, armR, eyes, whites, xeyes, mouth, tongue, bum, sign, board, snowball, stars, hatCol };
  poseGnome(g, {});
  return g;
}
export function gnomeSign(g, text) {
  if (!signTex[text]) signTex[text] = textTex(text, { border: '#8a5a2b', bw: 14 });
  g.board.material.map = signTex[text]; g.board.material.needsUpdate = true;
}
export function poseGnome(g, p) {
  const v = g.vis;
  v.position.set(p.dx || 0, p.dy || 0, p.dz || 0); v.rotation.set(p.rotX || 0, p.rotY || 0, p.rotZ || 0);
  const sx = p.sx == null ? 1 : p.sx, sy = p.sy == null ? 1 : p.sy; v.scale.set(sx, sy, sx);
  const al = p.armL == null ? 0.1 : p.armL, ar = p.armR == null ? 0.1 : p.armR;
  g.armL.rotation.set(-al * 0.5 * (p.armFwd == null ? 1 : p.armFwd), 0, -(0.3 + al * 2.5)); g.armR.rotation.set(-ar * 0.5 * (p.armFwd == null ? 1 : p.armFwd), 0, 0.3 + ar * 2.5);
  const e = p.eyes || 'n';
  g.eyes.forEach(m => { m.visible = e !== 'x'; m.scale.set(0.023, e === 'closed' ? 0.005 : 0.023, 0.023); if (e === 'closed') m.scale.x = 0.03; });
  g.whites.forEach(m => { m.visible = e === 'wide'; });
  g.xeyes.visible = e === 'x';
  const mo = p.mouth || 0; g.mouth.visible = mo > 0.05; g.mouth.scale.set(0.036, 0.008 + 0.03 * mo, 0.02);
  g.tongue.visible = !!p.tongue;
  const pa = p.pants || 0; g.bum.visible = pa > 0.02; g.bum.scale.setScalar(Math.max(0.01, pa));
  g.sign.visible = !!p.sign; g.snowball.visible = !!p.snowball;
}

// ───────────────────────── bowling ball ─────────────────────────
export function buildBall() {
  const g = new THREE.Group();
  const green = new THREE.MeshPhysicalMaterial({ color: 0x129a55, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 2.2 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xf2b705, roughness: 0.2, metalness: 0.9, clearcoat: 1, envMapIntensity: 3 });
  const body = mesh(new THREE.SphereGeometry(C.BALL_R, 32, 20), green); g.add(body);
  const hole = M(0x04200f, { roughness: 1 });
  [[-0.035, 0.03], [0.035, 0.03], [0, -0.035]].forEach(h => { const d = new THREE.Vector3(h[0], h[1], 0.15).normalize().multiplyScalar(C.BALL_R * 0.985); const m = sph(0.02, hole, d.x, d.y, d.z, 1, 1, 0.5); m.lookAt(0, 0, 0); m.castShadow = false; g.add(m); });
  g.userData.setGold = on => { body.material = on ? gold : green; };
  return g;
}

// ───────────────────────── Santa ─────────────────────────
export function buildCrown(s) {
  const gm = M(0xf2b705, { metalness: 0.9, roughness: 0.25 }), g = new THREE.Group();
  const ring = mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.09, 20, 1, true), gm, 0, 0.045, 0); ring.material = M(0xf2b705, { metalness: 0.9, roughness: 0.25, side: THREE.DoubleSide }); g.add(ring);
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; g.add(cone(0.045, 0.13, gm, Math.cos(a) * 0.148, 0.14, Math.sin(a) * 0.148, 8), sph(0.022, glow([0xe63946, 0x3a86ff, 0x2a9d4a][i % 3]), Math.cos(a) * 0.148, 0.215, Math.sin(a) * 0.148)); }
  g.scale.setScalar(s || 1); return g;
}
export function buildSanta() {
  const root = new THREE.Group(), red = M(RED), white = fur(), skin = M(SKIN), black = M(BLACK, { roughness: 0.4 }), green = M(0x14532d);
  const leg = s => { const l = grp(s * 0.14, 0.38, 0, limb(0.09, 0.3, red), torus(0.092, 0.035, white, 0, -0.24, 0), sph(1, black, 0, -0.32, -0.045, 0.105, 0.075, 0.16)); root.add(l); return l; };
  const legL = leg(-1), legR = leg(1);
  const torso = grp(0, 0.38, 0); root.add(torso);
  const heartTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#e63946'; for (let i = 0; i < 18; i++) { const x = (i % 6) * 44 + ((i / 6 | 0) % 2 ? 26 : 6), y = (i / 6 | 0) * 42 + 22, s = 9; g.beginPath(); g.moveTo(x, y + s * 0.9); g.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.1, x, y - s * 0.3); g.bezierCurveTo(x + s * 0.6, y - s * 1.1, x + s * 1.4, y - s * 0.1, x, y + s * 0.9); g.fill(); } }, { wrapS: THREE.RepeatWrapping });
  heartTex.repeat.set(2, 1);
  const boxers = mesh(G('Sphere', 1, 20, 14), new THREE.MeshStandardMaterial({ map: heartTex, roughness: 0.8 }), 0, 0.1, 0.03, 0.3, 0.24, 0.29); torso.add(boxers);
  const coat = grp(0, 0, 0); torso.add(coat);
  coat.add(sph(0.34, red, 0, 0.3, 0, 1, 1, 0.92));
  const hem = torus(0.3, 0.06, white, 0, 0.06, 0); hem.scale.set(1, 0.92, 1); coat.add(hem);
  const strip = mesh(G('Torus', 0.325, 0.045, 8, 20, Math.PI), white, 0, 0.3, 0); strip.rotation.set(0, Math.PI / 2, -Math.PI / 2); strip.scale.set(1, 1, 1); coat.add(strip);
  const belt = torus(0.338, 0.04, black, 0, 0.25, 0); belt.scale.set(1, 0.92, 1); coat.add(belt);
  coat.add(box(0.11, 0.11, 0.03, M(0xffd23f, { metalness: 0.6, roughness: 0.3 }), 0, 0.25, -0.325));
  const splat = grp(0, 0, 0, sph(0.1, white, -0.03, 0.42, 0.3, 1, 1, 0.4), sph(0.05, white, 0.09, 0.33, 0.31, 1, 1, 0.4), sph(0.04, white, -0.13, 0.33, 0.29, 1, 1, 0.4)); torso.add(splat);
  const arm = s => { const a = grp(s * 0.31, 0.56, 0, limb(0.08, 0.36, red), torus(0.085, 0.035, white, 0, -0.35, 0), sph(0.095, green, 0, -0.44, 0)); torso.add(a); return a; };
  const armL = arm(-1), armR = arm(1);
  const fork = grp(0, -0.44, 0, cyl(0.012, 0.012, 0.3, M(0xcfd6e4, { metalness: 0.8, roughness: 0.3 }), 0, 0, -0.16)); fork.children[0].rotation.x = Math.PI / 2;
  [-0.025, 0, 0.025].forEach(x => { const t = cyl(0.007, 0.007, 0.09, M(0xcfd6e4, { metalness: 0.8, roughness: 0.3 }), x, 0, -0.35); t.rotation.x = Math.PI / 2; fork.add(t); }); armL.add(fork);
  const knife = grp(0, -0.44, 0, box(0.03, 0.012, 0.34, M(0xe6ebf5, { metalness: 0.8, roughness: 0.25 }), 0, 0, -0.2)); armR.add(knife);
  const head = grp(0, 0.74, 0); torso.add(head);
  head.add(sph(0.2, skin), sph(0.206, white, 0, -0.01, 0.05, 1.04, 0.97, 0.9), sph(0.19, white, 0, -0.15, -0.115, 1.2, 1.2, 0.75));
  head.add(sph(0.05, white, 0.2, -0.04, 0.0, 0.6, 1.3, 1), sph(0.05, white, -0.2, -0.04, 0.0, 0.6, 1.3, 1));
  const mu = s => { const m = sph(1, white, s * 0.07, -0.062, -0.192, 0.095, 0.042, 0.05); m.rotation.z = s * -0.3; return m; };
  head.add(mu(-1), mu(1), sph(0.047, M(0xe98b7a, { roughness: 0.45 }), 0, -0.012, -0.205));
  const eyeM = M(0x161616, { roughness: 0.2 });
  const eyes = [sph(0.023, eyeM, -0.075, 0.05, -0.178), sph(0.023, eyeM, 0.075, 0.05, -0.178)]; head.add(...eyes);
  [-1, 1].forEach(s => { const b = sph(1, white, s * 0.078, 0.105, -0.168, 0.05, 0.016, 0.02); b.rotation.z = s * 0.2; head.add(b); head.add(sph(1, M(0xf29a9a), s * 0.125, -0.02, -0.15, 0.04, 0.028, 0.02)); });
  const mouth = sph(1, M(0x5a1d1d), 0, -0.115, -0.212, 0.06, 0.04, 0.03); head.add(mouth);
  const hatG = bentCone(0.2, 0.4, 0.2);
  const hat = mesh(hatG, red, 0, 0.13 + 0.2, 0.02); head.add(hat, torus(0.2, 0.055, white, 0, 0.125, 0.015));
  const pom = sph(0.075, white, 0.2, 0.33 + 0.2 - 0.07, 0.02); head.add(pom);
  const crown = buildCrown(1.25); crown.position.set(0, 0.2, 0.02); crown.rotation.z = -0.12; head.add(crown);
  const s = { root, legL, legR, torso, coat, boxers, armL, armR, head, eyes, mouth, splat, crown, fork, knife, hat, pom, handY: -0.44, armLen: 0.44 };
  poseSanta(s, {});
  return s;
}
// p: {x,z,y,rotY, legL:[fore,side], legR, hip, bend, armL:[fwd,out], armR, headX, headY, mouth, boxers, splat, crown, utensils, eyesHappy}
export function poseSanta(s, p) {
  const ll = p.legL || [0, 0], lr = p.legR || [0, 0], al = p.armL || [0, 0.12], ar = p.armR || [0, 0.12];
  s.legL.rotation.set(ll[0], 0, -ll[1]); s.legR.rotation.set(lr[0], 0, lr[1]);
  const drop = p.hip == null ? Math.min(Math.cos(ll[0]) * Math.cos(ll[1]), Math.cos(lr[0]) * Math.cos(lr[1])) : p.hip;
  const hipY = 0.075 + 0.305 * drop;
  s.legL.position.y = s.legR.position.y = hipY; s.torso.position.y = hipY;
  s.torso.rotation.set(p.bend || 0, p.twist || 0, p.lean || 0);
  s.armL.rotation.set(al[0], 0, -al[1]); s.armR.rotation.set(ar[0], 0, ar[1]);
  s.head.rotation.set(p.headX || 0, p.headY || 0, 0);
  const mo = p.mouth || 0; s.mouth.visible = mo > 0.05; s.mouth.scale.set(0.06, 0.012 + 0.045 * mo, 0.03);
  const bx = p.boxers || 0; s.boxers.visible = bx > 0.02; s.coat.position.y = bx * 0.1; s.coat.scale.set(1, 1 - bx * 0.12, 1);
  s.splat.visible = !!p.splat; s.crown.visible = !!p.crown; s.fork.visible = s.knife.visible = !!p.utensils;
  s.eyes.forEach(e => e.scale.set(0.023, p.eyesHappy ? 0.008 : 0.023, 0.023));
  s.pom.position.x = 0.2 + Math.sin((p.t || 0) * 2.4) * 0.012;
}

// ───────────────────────── Mrs. Claus ─────────────────────────
export function buildMrsClaus() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const red = M(RED), white = fur(), skin = M(SKIN), hair = M(0xf1f1f6, { roughness: 0.9 });
  const shoes = [sph(1, M(BLACK), -0.09, 0.04, 0.05, 0.07, 0.045, 0.11), sph(1, M(BLACK), 0.09, 0.04, 0.05, 0.07, 0.045, 0.11)]; root.add(...shoes);
  body.add(cyl(0.16, 0.37, 0.6, red, 0, 0.37, 0, 20)); body.add(torus(0.37, 0.05, white, 0, 0.09, 0));
  const apron = mesh(new THREE.CylinderGeometry(0.168, 0.375, 0.5, 16, 1, true, -0.62, 1.24), M(WHITE, { side: THREE.DoubleSide, roughness: 0.9 }), 0, 0.4, 0.004); body.add(apron);
  body.add(sph(1, M(0xe63946), 0, 0.42, 0.285, 0.04, 0.04, 0.012));
  body.add(sph(0.2, red, 0, 0.76, 0, 1, 1, 0.9), torus(0.125, 0.035, white, 0, 0.905, 0));
  const arm = s => { const a = grp(s * 0.19, 0.86, 0, limb(0.055, 0.3, red), torus(0.058, 0.025, white, 0, -0.29, 0), sph(0.05, skin, 0, -0.345, 0)); body.add(a); return a; };
  const armL = arm(-1), armR = arm(1);
  const head = grp(0, 1.04, 0); body.add(head);
  head.add(sph(0.15, skin), sph(0.158, hair, 0, 0.02, -0.035, 1.06, 1.0, 1), sph(0.078, hair, 0, 0.175, -0.03), sph(0.06, hair, -0.14, -0.02, 0, 0.6, 1.2, 1), sph(0.06, hair, 0.14, -0.02, 0, 0.6, 1.2, 1));
  head.add(sph(1, M(0x2a9d4a), -0.035, 0.25, -0.02, 0.045, 0.012, 0.022), sph(1, M(0x2a9d4a), 0.035, 0.25, -0.02, 0.045, 0.012, 0.022), sph(0.022, M(0xe63946, { roughness: 0.3 }), 0, 0.255, 0));
  const gm = M(0xd4a017, { metalness: 0.8, roughness: 0.3 });
  [-1, 1].forEach(s => { head.add(mesh(G('Torus', 0.042, 0.007, 6, 18), gm, s * 0.055, 0.012, 0.142)); head.add(sph(1, M(0x222222), s * 0.055, 0.014, 0.138, 0.018, 0.007, 0.01)); head.add(sph(1, M(0xf29a9a), s * 0.09, -0.04, 0.115, 0.035, 0.024, 0.016)); });
  head.add(box(0.03, 0.007, 0.007, gm, 0, 0.012, 0.146), sph(0.022, M(0xe9a58c), 0, -0.018, 0.15));
  const smile = mesh(G('Torus', 0.045, 0.008, 6, 14, Math.PI), M(0xa33030), 0, -0.05, 0.136); smile.rotation.z = Math.PI; head.add(smile);
  return { root, body, armL, armR, head, shoes };
}
// p: {walk, time, armL:[fwd,out], armR, lean, hop}
export function poseMrs(m, p) {
  const t = p.time || 0, w = p.walk ? 1 : 0;
  m.body.position.y = (p.hop || 0) + w * Math.abs(Math.sin(t * 10)) * 0.04; m.body.rotation.set(p.bend || 0, 0, (p.lean || 0) + w * Math.sin(t * 10) * 0.05);
  m.shoes[0].position.z = 0.05 + w * Math.sin(t * 10) * 0.1; m.shoes[1].position.z = 0.05 - w * Math.sin(t * 10) * 0.1;
  const al = p.armL || [0, 0.2], ar = p.armR || [0, 0.2];
  m.armL.rotation.set(al[0], 0, -al[1]); m.armR.rotation.set(ar[0], 0, ar[1]);
  m.head.rotation.set(p.headX || 0, p.headY || 0, 0);
}

// ───────────────────────── reindeer ─────────────────────────
const paddleTex = {};
export function buildReindeer(redNose, scarfCol, simple) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const br = M(0x9b6a3c), br2 = M(0x7a4e28), lt = M(0xc79a63), tan = M(0xd9b77a), dk = M(0x2b1a10);
  const legs = [];
  [[-0.3, -0.11], [-0.3, 0.11], [0.3, -0.11], [0.3, 0.11]].forEach((p, i) => { const l = grp(p[0], 0.56, p[1], cyl(0.045, 0.035, 0.5, i % 2 ? br : br2, 0, -0.25, 0, 8), cyl(0.045, 0.05, 0.08, dk, 0, -0.52, 0, 8)); body.add(l); legs.push(l); });
  const trunk = mesh(G('Capsule', 0.21, 0.52, 6, 14), br, 0, 0.72, 0); trunk.rotation.z = Math.PI / 2; body.add(trunk);
  body.add(sph(1, lt, 0, 0.62, 0, 0.4, 0.14, 0.17));
  const tail = sph(0.07, fur(), -0.5, 0.82, 0, 1, 1.2, 1); body.add(tail);
  const neck = grp(0.34, 0.8, 0); body.add(neck);
  const nk = cyl(0.1, 0.13, 0.5, br, 0.08, 0.2, 0, 10); nk.rotation.z = -0.38; neck.add(nk);
  const sc = torus(0.135, 0.04, M(scarfCol), 0.02, 0.06, 0); sc.rotation.set(Math.PI / 2, -0.38, 0); neck.add(sc, sph(0.04, M(0xffd23f, { metalness: 0.6, roughness: 0.3 }), 0.13, -0.02, 0));
  const head = grp(0.18, 0.5, 0); neck.add(head);
  head.add(sph(0.16, br, 0, 0, 0, 1.15, 0.95, 0.92), sph(0.1, lt, 0.17, -0.035, 0, 1.15, 0.85, 0.9));
  const nose = sph(redNose ? 0.06 : 0.05, redNose ? glow(0xff2d2d) : dk, 0.295, -0.02, 0); head.add(nose);
  let noseLight = null;
  if (redNose && !simple) { noseLight = new THREE.PointLight(0xff3030, 1.2, 2.5, 2); noseLight.position.set(0.33, -0.02, 0); head.add(noseLight); }
  const eyes = [];
  [-1, 1].forEach(s => {
    head.add(sph(0.042, M(WHITE, { roughness: 0.3 }), 0.085, 0.06, s * 0.105));
    const pu = sph(0.022, M(0x111111, { roughness: 0.2 }), 0.112, 0.064, s * 0.125); head.add(pu); eyes.push(pu);
    const ear = sph(1, br2, -0.09, 0.1, s * 0.15, 0.04, 0.09, 0.05); ear.rotation.x = s * 0.9; head.add(ear);
    const a = grp(-0.03, 0.13, s * 0.07); a.rotation.set(s * 0.3, 0, 0.15);
    a.add(cyl(0.018, 0.024, 0.36, tan, 0, 0.18, 0, 6));
    const p1 = cyl(0.014, 0.018, 0.17, tan, 0.05, 0.22, 0, 6); p1.rotation.z = -0.8; const p2 = cyl(0.014, 0.018, 0.15, tan, -0.045, 0.3, 0, 6); p2.rotation.z = 0.75; const p3 = cyl(0.012, 0.016, 0.13, tan, 0.04, 0.35, 0, 6); p3.rotation.z = -0.6;
    a.add(p1, p2, p3); head.add(a);
  });
  const mouth = sph(1, M(0x5a1d1d), 0.2, -0.1, 0, 0.06, 0.03, 0.05); head.add(mouth);
  // score paddle held in the mouth
  const paddle = grp(0.24, -0.07, 0); paddle.rotation.z = -0.5;
  paddle.add(cyl(0.016, 0.016, 0.42, M(0x8a5a2b), 0, 0.21, 0, 6));
  const disc = grp(0, 0.6, 0); disc.rotation.z = 0.5;
  disc.add(mesh(G('Cylinder', 0.21, 0.21, 0.03, 24), M(0xd62828), 0, 0, 0)); disc.children[0].rotation.x = Math.PI / 2;
  const faceMat = new THREE.MeshBasicMaterial({ toneMapped: false });
  const f1 = new THREE.Mesh(G('Circle', 0.185, 24), faceMat); f1.position.z = 0.017; const f2 = new THREE.Mesh(G('Circle', 0.185, 24), faceMat); f2.position.z = -0.017; f2.rotation.y = Math.PI;
  disc.add(f1, f2); paddle.add(disc); head.add(paddle);
  const r = { root, body, legs, tail, neck, head, nose, noseLight, mouth, paddle, faceMat, eyes, redNose };
  poseReindeer(r, {});
  return r;
}
export function reindeerPaddle(r, text) {
  if (!paddleTex[text]) paddleTex[text] = textTex(text, { w: 128, h: 128, color: '#d62828', size: text.length > 1 ? 70 : 96 });
  r.faceMat.map = paddleTex[text]; r.faceMat.needsUpdate = true;
}
export function poseReindeer(r, p) {
  r.body.position.y = p.hop || 0; r.body.position.x = p.shake || 0;
  r.neck.rotation.z = p.head || 0; r.head.rotation.y = p.turn || 0;
  const sw = p.legs || 0; r.legs.forEach((l, i) => { l.rotation.z = (i % 2 ? -1 : 1) * (i < 2 ? 1 : -1) * sw; });
  r.tail.rotation.y = p.tail || 0; r.tail.position.z = Math.sin(p.tail || 0) * 0.05;
  r.mouth.visible = !!p.mouth; r.paddle.visible = !!p.paddle;
  if (r.redNose && r.noseLight) r.noseLight.intensity = p.glow == null ? 1.2 : p.glow;
  r.eyes.forEach(e => e.scale.set(0.022, p.blink ? 0.004 : 0.022, 0.022));
}

// ───────────────────────── small critters ─────────────────────────
export function buildSnowman() {
  const root = new THREE.Group(), w = M(0xffffff, { roughness: 0.9 }), coal = M(0x222222);
  root.add(sph(0.36, w, 0, 0.3, 0, 1, 0.9, 1), sph(0.27, w, 0, 0.78, 0, 1, 0.92, 1));
  [0.68, 0.82].forEach(y => root.add(sph(0.03, coal, 0, y, 0.265)));
  const sc = torus(0.2, 0.05, M(0x2a9d4a), 0, 0.98, 0); root.add(sc, box(0.08, 0.26, 0.04, M(0x2a9d4a), 0.14, 0.86, 0.19));
  const armL = grp(-0.24, 0.82, 0, cyl(0.014, 0.018, 0.42, M(0x5a3a1a), 0, 0.2, 0, 5)); armL.rotation.z = 1.0; const armR = grp(0.24, 0.82, 0, cyl(0.014, 0.018, 0.42, M(0x5a3a1a), 0, 0.2, 0, 5)); armR.rotation.z = -1.0; root.add(armL, armR);
  const head = grp(0, 1.14, 0, sph(0.2, w)); root.add(head);
  [-1, 1].forEach(s => head.add(sph(0.027, coal, s * 0.07, 0.05, 0.18)));
  const car = cone(0.035, 0.2, M(0xf77f00), 0, 0, 0.27, 8); car.rotation.x = Math.PI / 2; head.add(car);
  for (let i = -2; i <= 2; i++) head.add(sph(0.016, coal, i * 0.04, -0.075 + Math.abs(i) * 0.013, 0.183));
  const hat = grp(0, 0.16, 0, cyl(0.2, 0.2, 0.025, M(BLACK), 0, 0, 0), cyl(0.13, 0.13, 0.24, M(BLACK), 0, 0.13, 0), cyl(0.133, 0.133, 0.05, M(0xd62828), 0, 0.045, 0)); head.add(hat);
  return { root, head, hat, armR };
}
export function buildPenguin() {
  const root = new THREE.Group(), bk = M(0x1b1f2e, { roughness: 0.5 }), w = M(0xffffff), or = M(0xffb703);
  root.add(sph(1, bk, 0, 0.13, 0, 0.3, 0.13, 0.17), sph(1, w, 0.02, 0.09, 0, 0.26, 0.1, 0.14));
  root.add(sph(0.11, bk, 0.3, 0.2, 0), sph(1, w, 0.36, 0.19, 0, 0.06, 0.07, 0.08));
  [-1, 1].forEach(s => { root.add(sph(0.018, M(0x111111), 0.385, 0.225, s * 0.045)); });
  const bkk = cone(0.035, 0.12, or, 0.45, 0.18, 0, 8); bkk.rotation.z = -Math.PI / 2; root.add(bkk);
  const feet = [sph(1, or, -0.32, 0.1, -0.07, 0.08, 0.02, 0.05), sph(1, or, -0.32, 0.1, 0.07, 0.08, 0.02, 0.05)]; root.add(...feet);
  const flips = [sph(1, bk, 0, 0.16, -0.18, 0.16, 0.02, 0.06), sph(1, bk, 0, 0.16, 0.18, 0.16, 0.02, 0.06)]; root.add(...flips);
  const sc = torus(0.1, 0.03, M(0xe63946), 0.22, 0.17, 0); sc.rotation.set(0, 0, Math.PI / 2 - 0.3); root.add(sc);
  const tailS = box(0.2, 0.04, 0.02, M(0xe63946), 0.12, 0.3, 0.02); root.add(tailS);
  return { root, feet, flips, tailS };
}
export function buildBunny() {
  const root = new THREE.Group(), w = M(0xffffff, { roughness: 0.9 });
  const mound = sph(1, M(0xf4f8ff), 0, 0, 0, 0.5, 0.2, 0.42); root.add(mound);
  const b = new THREE.Group(); root.add(b);
  b.add(sph(0.15, w, 0, 0.1, 0, 1, 1.1, 0.9));
  const head = grp(0, 0.34, 0.02, sph(0.125, w)); b.add(head);
  [-1, 1].forEach(s => { const e = grp(s * 0.05, 0.1, 0, sph(1, w, 0, 0.14, 0, 0.035, 0.14, 0.03), sph(1, M(0xffc2d1), 0, 0.14, 0.02, 0.018, 0.1, 0.016)); e.rotation.z = -s * 0.15; head.add(e); head.add(sph(0.018, M(0x111111), s * 0.045, 0.02, 0.113)); });
  head.add(sph(0.02, M(0xff8fab), 0, -0.015, 0.123));
  const ball = sph(0.06, w, 0.16, 0.22, 0.08); b.add(ball);
  return { root, b, head, ball };
}
export function buildBird() {
  const root = new THREE.Group(), r = M(0xd62828, { roughness: 0.6 }), d = M(0xa51d1d);
  root.add(sph(1, r, 0, 0, 0, 0.09, 0.07, 0.065), sph(0.055, r, 0.07, 0.05, 0));
  const cr = cone(0.03, 0.09, r, 0.05, 0.12, 0, 6); cr.rotation.z = 0.5; root.add(cr);
  const bk = cone(0.02, 0.06, M(0xffb703), 0.14, 0.045, 0, 6); bk.rotation.z = -Math.PI / 2; root.add(bk);
  root.add(sph(0.012, M(0x111111), 0.1, 0.065, 0.035), sph(0.012, M(0x111111), 0.1, 0.065, -0.035), sph(1, d, -0.13, 0.01, 0, 0.08, 0.012, 0.035));
  const wings = [grp(0, 0.03, 0.05, sph(1, d, 0, 0, 0.06, 0.06, 0.012, 0.08)), grp(0, 0.03, -0.05, sph(1, d, 0, 0, -0.06, 0.06, 0.012, 0.08))]; root.add(...wings);
  return { root, wings };
}

// ───────────────────────── sleigh team ─────────────────────────
export function buildSleigh(withBanner) {
  const root = new THREE.Group(), deer = [];
  for (let i = 0; i < 3; i++) { const d = buildReindeer(i === 2, i % 2 ? 0x2a9d4a : 0xe63946, true); d.root.scale.setScalar(0.7); d.root.position.set(1.2 + i * 1.15, 0, 0); root.add(d.root); deer.push(d); }
  root.add(mesh(G('Cylinder', 0.008, 0.008, 3.2, 4), M(0x5a3a1a), 2.0, 0.55, 0)); root.children[root.children.length - 1].rotation.z = Math.PI / 2;
  const red = M(RED, { roughness: 0.4 }), gold = M(0xffd23f, { metalness: 0.8, roughness: 0.3 });
  const body = grp(0, 0.2, 0);
  body.add(box(1.2, 0.36, 0.7, red, 0, 0.3, 0), box(0.14, 0.7, 0.7, red, -0.6, 0.55, 0), box(0.14, 0.3, 0.7, red, 0.62, 0.52, 0));
  [-1, 1].forEach(s => { body.add(box(1.7, 0.04, 0.05, gold, 0.05, 0, s * 0.3)); const c = mesh(G('Torus', 0.16, 0.022, 6, 12, Math.PI), gold, 0.9, 0.16, s * 0.3); c.rotation.z = -Math.PI / 2; body.add(c); body.add(box(0.04, 0.14, 0.04, gold, -0.4, 0.08, s * 0.3), box(0.04, 0.14, 0.04, gold, 0.4, 0.08, s * 0.3)); body.add(box(1.22, 0.05, 0.02, gold, 0, 0.49, s * 0.355)); });
  body.add(sph(0.36, M(0x7a4a2a), -0.3, 0.72, 0, 1, 1.05, 0.9), box(0.2, 0.2, 0.2, M(0x2a9d4a), -0.05, 0.9, 0.12), box(0.17, 0.17, 0.17, M(0x3a86ff), -0.45, 1.02, -0.1), box(0.15, 0.15, 0.15, M(0xffd23f), -0.2, 1.05, -0.12));
  root.add(body);
  const drv = buildGnome(0x2a9d4a, 0x2e6fb7, 0.06); drv.root.position.set(0.3, 0.65, 0); drv.root.rotation.y = Math.PI / 2; drv.root.scale.setScalar(0.95); poseGnome(drv, { armL: 0.9, armR: 0.9, mouth: 1 }); root.add(drv.root);
  let banner = null;
  if (withBanner) {
    const t = textTex('300!', { w: 256, h: 128, color: '#e63946', border: '#e63946', bw: 10 });
    banner = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.8, 12, 1), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: false })); banner.position.set(-1.9, 0.75, 0); root.add(banner);
    root.add(mesh(G('Cylinder', 0.008, 0.008, 0.5, 4), M(0x5a3a1a), -0.9, 0.75, 0)); root.children[root.children.length - 1].rotation.z = Math.PI / 2;
  }
  root.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return { root, deer, banner };
}

// ───────────────────────── props ─────────────────────────
export function buildTable() {
  const tex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(214,40,40,.55)'; for (let i = 0; i < 8; i += 2) { g.fillRect(i * 32, 0, 32, h); g.fillRect(0, i * 32, w, 32); } }, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  tex.repeat.set(3, 1.5);
  const root = new THREE.Group(), m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 });
  root.add(mesh(G('Box', 1, 1, 1), m, 0, 0.36, 0, 1.5, 0.56, 0.8), box(1.56, 0.03, 0.86, M(WHITE, { roughness: 0.8 }), 0, 0.655, 0));
  [[-0.65, -0.3], [0.65, -0.3], [-0.65, 0.3], [0.65, 0.3]].forEach(p => root.add(cyl(0.035, 0.035, 0.1, M(0x8a5530), p[0], 0.04, p[1], 8)));
  return { root, top: 0.67 };
}
export function buildChair() {
  const root = new THREE.Group(), wd = M(0x8a5530), cu = M(0xb3141c);
  root.add(box(0.74, 0.08, 0.6, wd, 0, 0.36, 0), box(0.74, 1.0, 0.08, wd, 0, 0.86, 0.3), box(0.58, 0.8, 0.03, cu, 0, 0.88, 0.25), box(0.6, 0.05, 0.5, cu, 0, 0.42, -0.02));
  [[-0.32, -0.25], [0.32, -0.25], [-0.32, 0.25], [0.32, 0.25]].forEach(p => root.add(box(0.07, 0.36, 0.07, wd, p[0], 0.18, p[1])));
  [-1, 1].forEach(s => root.add(sph(0.06, M(0xffd23f, { metalness: 0.7, roughness: 0.3 }), s * 0.34, 1.4, 0.3)));
  return { root };
}
export function buildTurkey() {
  const root = new THREE.Group(), silver = M(0xdfe5f0, { metalness: 0.85, roughness: 0.25 }), brown = M(0xc9853a, { roughness: 0.45 });
  root.add(cyl(0.36, 0.3, 0.03, silver, 0, 0.015, 0, 28), cyl(0.3, 0.3, 0.012, M(0xf2f5fa, { metalness: 0.6, roughness: 0.3 }), 0, 0.034, 0, 28));
  const bird = new THREE.Group(); root.add(bird);
  bird.add(sph(0.2, brown, 0, 0.15, 0, 1.2, 0.78, 0.95), sph(0.1, M(0xd99a48, { roughness: 0.4 }), 0, 0.22, 0.02, 1.4, 0.6, 1));
  [-1, 1].forEach(s => { const d = grp(s * 0.17, 0.17, 0.12); d.rotation.set(-0.9, 0, s * 0.5); d.add(sph(1, M(0xb9742c, { roughness: 0.45 }), 0, 0.06, 0, 0.065, 0.11, 0.065), cyl(0.014, 0.014, 0.1, M(0xf3e9d6), 0, 0.2, 0, 6), cyl(0.03, 0.03, 0.05, M(WHITE), 0, 0.25, 0, 8)); bird.add(d); });
  const garnish = new THREE.Group();
  for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + 0.3; garnish.add(sph(i % 3 ? 0.035 : 0.028, M(i % 3 ? 0x2a9d4a : 0xe63946, { roughness: 0.5 }), Math.cos(a) * 0.27, 0.06, Math.sin(a) * 0.24)); }
  root.add(garnish);
  const bones = new THREE.Group(), bm = M(0xf3e9d6);
  for (let i = -2; i <= 2; i++) { const r = mesh(G('Torus', 0.08, 0.012, 6, 12, Math.PI), bm, i * 0.06, 0.04, 0); r.rotation.y = Math.PI / 2; bones.add(r); }
  const b1 = cyl(0.014, 0.014, 0.2, bm, -0.2, 0.06, 0.1, 6); b1.rotation.z = 1.2; const b2 = cyl(0.014, 0.014, 0.2, bm, 0.2, 0.06, 0.12, 6); b2.rotation.z = -1.3; bones.add(b1, b2, sph(0.025, bm, -0.29, 0.1, 0.1), sph(0.025, bm, 0.29, 0.085, 0.12));
  root.add(bones);
  const t = { root, bird, bones, garnish };
  setTurkey(t, 0); return t;
}
export function setTurkey(t, eaten) { const done = eaten >= 1; t.bird.visible = !done; t.bones.visible = done; t.bird.scale.setScalar(1 - Math.min(1, eaten) * 0.6); }
export function buildTrophy() {
  const gold = M(0xf2b705, { metalness: 0.95, roughness: 0.2 }), root = new THREE.Group();
  const pts = [[0.001, 0], [0.2, 0], [0.2, 0.05], [0.07, 0.08], [0.04, 0.26], [0.1, 0.32], [0.24, 0.5], [0.29, 0.78], [0.27, 0.8], [0.001, 0.56]].map(p => new THREE.Vector2(p[0], p[1]));
  root.add(mesh(new THREE.LatheGeometry(pts, 24), M(0xf2b705, { metalness: 0.95, roughness: 0.2, side: THREE.DoubleSide })));
  [-1, 1].forEach(s => { const h = mesh(G('Torus', 0.12, 0.022, 8, 14, Math.PI), gold, s * 0.27, 0.6, 0); h.rotation.z = -s * Math.PI / 2; root.add(h); });
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.16), new THREE.MeshBasicMaterial({ map: textTex('300', { w: 128, h: 64, bg: '#fff3a0', color: '#8a5a00' }), toneMapped: false })); pl.position.set(0, 0.63, 0.275); pl.rotation.x = -0.2; root.add(pl);
  const pl2 = pl.clone(); pl2.position.z = -0.275; pl2.rotation.set(0.2, Math.PI, 0); root.add(pl2);
  return { root };
}
export function buildAimArrow() {
  const root = new THREE.Group(), y = glow(0xffd23f), o = new THREE.MeshBasicMaterial({ color: 0x5a2a00, side: THREE.BackSide, toneMapped: false });
  const parts = [[G('Cylinder', 0.07, 0.07, 0.4, 14), 0.52], [G('Cone', 0.2, 0.34, 18), 0.17]];
  parts.forEach(p => { const m = new THREE.Mesh(p[0], y); m.position.y = p[1]; if (p[1] < 0.3) m.rotation.x = Math.PI; root.add(m); const ol = new THREE.Mesh(p[0], o); ol.position.copy(m.position); ol.rotation.copy(m.rotation); ol.scale.set(1.22, 1.07, 1.22); root.add(ol); });
  const ring = new THREE.Mesh(G('Torus', 0.17, 0.028, 8, 28), y); ring.rotation.x = Math.PI / 2;
  const ring2 = new THREE.Mesh(G('Torus', 0.17, 0.05, 8, 28), new THREE.MeshBasicMaterial({ color: 0x5a2a00, toneMapped: false })); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.006;
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.04, 10), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8, toneMapped: false, depthWrite: false }), 22); dots.frustumCulled = false;
  return { root, ring: grp(0, 0, 0, ring2, ring), dots, mats: [y] };
}
