// Gnome Bowling 2.0 — the scenery: sky, snow, lane, workshop, trees, lights.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { C, pinSpots } from './physics.js';
import { Batch, G, M, glow, mesh, sph, cyl, box, cone, torus, grp, canvasTex, dotTex, mulberry, TAU, lerp } from './build.js';

export const GROUND = -0.2;
const L = C.LANE_HALF, GU = L + C.GUT_W, R = GU + C.RAIL_W;
const BULB = [0xff3b3b, 0xffd23f, 0x3ddc84, 0x4dabf7, 0xff7ae5];

function gable(w, h, d) { // triangular prism: ridge along z
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
}
function tree(b, x, z, h, rnd) {
  const y = groundY(x, z);
  b.add(G('Cylinder', 0.07 * h, 0.09 * h, 0.22 * h, 7), 0x4a2e1a, x, y + 0.1 * h, z);
  for (let i = 0; i < 4; i++) {
    const t = i / 4, r = h * 0.3 * (1 - t * 0.62), yy = y + h * (0.16 + 0.2 * i), ch = h * 0.36;
    b.add(G('Cone', 1, 1, 9), i % 2 ? 0x1d5c3a : 0x1a5235, x, yy + ch / 2, z, r, ch, r, 0, rnd() * 3);
    b.add(G('Cone', 1, 1, 9), 0xf4f8ff, x, yy + ch * 0.74, z, r * 0.58, ch * 0.55, r * 0.58, 0, rnd() * 3);
  }
}
// gentle hills away from the lane
export function groundY(x, z) {
  const dx = Math.max(0, Math.abs(x) - 4.5), dz = Math.max(0, Math.max(z - 5, -15 - z)), d = Math.hypot(dx, dz);
  const k = Math.min(1, d / 9);
  return GROUND + k * k * (Math.sin(x * 0.21 + 1.3) * Math.cos(z * 0.17) * 1.2 + Math.sin(x * 0.07 + z * 0.09) * 1.6 + 0.6);
}

export function buildWorld(scene, renderer, lowQ) {
  const W = { blink: [], tick: [] }, rnd = mulberry(1225);
  const FOG = 0x565fae;
  scene.fog = new THREE.Fog(FOG, 34, 135);

  // environment reflections (for the glossy ball and ice)
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.2; pm.dispose();

  // ── sky ──
  const skyTex = canvasTex(2048, 1024, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#03061c'); gr.addColorStop(0.3, '#0c1446'); gr.addColorStop(0.43, '#232b78'); gr.addColorStop(0.5, '#565fae'); gr.addColorStop(1, '#565fae');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { const y = Math.pow(rnd(), 0.8) * h * 0.47, r = rnd() * 1.5 + 0.4; g.fillStyle = 'rgba(255,255,255,' + (0.35 + rnd() * 0.65) + ')'; g.beginPath(); g.arc(rnd() * w, y, r, 0, TAU); g.fill(); }
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, toneMapped: false }));
  scene.add(sky);
  // moon
  const moon = grp(34, 9.5, -96);
  moon.add(new THREE.Mesh(new THREE.SphereGeometry(4.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xfff8dc, fog: false, toneMapped: false })));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: 0xfff2c0, transparent: true, opacity: 0.5, fog: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  halo.scale.set(34, 34, 1); moon.add(halo); scene.add(moon);
  [[-1.4, 1.2, 0.9], [1.3, -1.3, 0.6], [1.0, 1.5, 0.45]].forEach(c => { const m = new THREE.Mesh(new THREE.CircleGeometry(c[2], 12), new THREE.MeshBasicMaterial({ color: 0xd9d0b0, fog: false, toneMapped: false })); m.position.set(c[0], c[1], 4.5); moon.add(m); });
  // aurora ribbons
  const auTex = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,120,255,0)'); gr.addColorStop(0.35, 'rgba(120,160,255,.5)'); gr.addColorStop(0.7, 'rgba(80,255,170,.9)'); gr.addColorStop(1, 'rgba(80,255,170,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
  W.aurora = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(260, 26 - i * 4, 48, 1);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: auTex, transparent: true, opacity: 0.34 - i * 0.07, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(i * 14 - 10, 17 + i * 5, -150 - i * 8); m.userData.base = Float32Array.from(geo.attributes.position.array); m.userData.k = i; scene.add(m); W.aurora.push(m);
  }

  // ── lights ──
  W.hemi = new THREE.HemisphereLight(0xb4c4ff, 0x6f7fc4, 0.9); scene.add(W.hemi);
  const sun = new THREE.DirectionalLight(0xe6ecff, 3.3); sun.position.set(7, 13, 5); sun.target.position.set(0, 0, -3.5);
  sun.castShadow = true; const sm = lowQ ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm);
  const sc = sun.shadow.camera; sc.left = -7; sc.right = 7; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03; sun.shadow.radius = 3;
  scene.add(sun, sun.target); W.sun = sun;
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.55); fill.position.set(-2, 5, 12); scene.add(fill); W.fill = fill;

  // ── ground + mountains + trees ──
  const gg = new THREE.PlaneGeometry(300, 300, 90, 90); gg.rotateX(-Math.PI / 2);
  const gp = gg.attributes.position; for (let i = 0; i < gp.count; i++) gp.setY(i, groundY(gp.getX(i), gp.getZ(i)) - GROUND);
  gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ color: 0xdde7ff, roughness: 0.95 })); ground.position.y = GROUND; ground.receiveShadow = true; scene.add(ground);
  const mb = new Batch();
  for (let i = 0; i < 26; i++) {
    const a = i / 26 * TAU + rnd() * 0.15, d = 105 + rnd() * 30, h = 13 + rnd() * 16, r = h * (1.1 + rnd() * 0.5), x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
    mb.add(G('Cone', 1, 1, 6), 0x8794cc, x, h / 2 - 1, z, r, h, r, 0, rnd() * 3);
    mb.add(G('Cone', 1, 1, 6), 0xf2f6ff, x, h * 0.79 - 1, z, r * 0.44, h * 0.43, r * 0.44, 0, rnd() * 3);
  }
  const mm = mb.build({ flatShading: true, roughness: 1 }); mm.castShadow = false; mm.receiveShadow = false; scene.add(mm);
  const tb = new Batch();
  const fixed = [[-2.6, -11.5, 2.6], [3.4, -10.2, 2.8], [8.6, -14, 5.2], [-10.5, -11, 4.4], [-0.8, -19, 3.6], [2.2, -21, 4.2], [7.2, -8.6, 2.6], [-11, -6, 4], [9.5, -5, 3.6], [-6.8, -6.4, 2.6], [6.9, -5.2, 2.6], [-14, -17, 5], [12, -19, 5.5]];
  fixed.forEach(t => tree(tb, t[0], t[1], t[2], rnd));
  for (let i = 0; i < 85; i++) {
    const a = rnd() * TAU, d = 13 + rnd() * 50, x = Math.cos(a) * d, z = Math.sin(a) * d - 4;
    if (Math.abs(x) < 5.5 && z > -24 && z < 12) continue;
    if (x > -11 && x < -2 && z < -8 && z > -19) continue;       // workshop clearing
    if (x > 3 && x < 8 && z < -9 && z > -15) continue;         // big tree clearing
    tree(tb, x, z, 2.6 + rnd() * 3.8, rnd);
  }
  scene.add(tb.build());

  // ── lane ──
  const lane = new THREE.Group(); scene.add(lane);
  const iceLen = -C.DECK_END;
  W.iceMat = new THREE.MeshPhysicalMaterial({ color: 0xa6d8ff, roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 2.2, emissive: 0x000000 });
  const ice = box(L * 2, 0.4, iceLen, W.iceMat, 0, -0.2, -iceLen / 2); ice.receiveShadow = true; ice.castShadow = false; lane.add(ice);
  const woodTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#c9995f'; g.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(255,230,180,.10)' : 'rgba(90,50,10,.10)'; g.fillRect(i * 32, 0, 32, h); g.fillStyle = 'rgba(70,40,10,.55)'; g.fillRect(i * 32, 0, 2, h); } }, { wrapS: THREE.RepeatWrapping, wrapT: THREE.RepeatWrapping });
  woodTex.repeat.set(1.6, 1);
  const wood = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 });
  const ap = box(R * 2 + 0.3, 0.4, C.APPROACH - 0.3 + 0.6, wood, 0, -0.2, (C.APPROACH + 0.3 + 0.6) / 2); ap.receiveShadow = true; lane.add(ap);
  const ap2 = box(L * 2, 0.4, 0.3, wood, 0, -0.2, 0.15); ap2.receiveShadow = true; lane.add(ap2);
  lane.add(box(L * 2, 0.006, 0.06, M(0xd62828), 0, 0.003, 0));
  const lb = new Batch();
  const gl = 0.3 - C.PIT_END;
  [-1, 1].forEach(s => {
    lb.add(G('Box', 1, 1, 1), 0x2a3d63, s * (L + C.GUT_W / 2), -C.GUT_D - 0.15, 0.3 - gl / 2, C.GUT_W, 0.3, gl);
    lb.add(G('Box', 1, 1, 1), 0x3d5a80, s * (GU + C.RAIL_W / 2), -0.12, (0.3 + C.KICK_Z) / 2, C.RAIL_W, 0.34, 0.3 - C.KICK_Z);
    // candy-cane rail
    const n = Math.round((0.3 - C.KICK_Z) / 0.26), sl = (0.3 - C.KICK_Z) / n;
    for (let i = 0; i < n; i++) lb.add(G('Cylinder', 0.1, 0.1, 1, 12), i % 2 ? 0xffffff : 0xe23a3a, s * (GU + C.RAIL_W / 2), 0.045, 0.3 - sl * (i + 0.5), 1, sl * 1.01, 1, Math.PI / 2);
    lb.add(G('Sphere', 0.1, 12, 8), 0xffffff, s * (GU + C.RAIL_W / 2), 0.045, 0.3);
    // log kickbacks
    const kl = C.KICK_Z - C.PIT_END + 0.3;
    for (let i = 0; i < 3; i++) {
      lb.add(G('Cylinder', 0.13, 0.13, 1, 12), i % 2 ? 0x7b4a26 : 0x8a5530, s * (GU + 0.13), 0.13 + i * 0.25, C.KICK_Z - kl / 2 + 0.05, 1, kl, 1, Math.PI / 2);
      lb.add(G('Cylinder', 0.105, 0.105, 0.02, 12), 0xc79a63, s * (GU + 0.13), 0.13 + i * 0.25, C.KICK_Z + 0.06, 1, 1, 1, Math.PI / 2);
    }
    lb.add(G('Sphere', 1, 14, 8), 0xffffff, s * (GU + 0.13), 0.78, C.KICK_Z - kl / 2 + 0.05, 0.17, 0.09, kl / 2 + 0.05);
    // snow banked against the platform
    lb.add(G('Sphere', 1, 14, 8), 0xf4f8ff, s * (R + 0.25), GROUND, -3.2, 0.5, 0.22, 5.4);
  });
  // back wall of logs
  const bz = C.PIT_END - 0.16, bw = R * 2 + 0.5;
  for (let i = 0; i < 5; i++) {
    lb.add(G('Cylinder', 0.14, 0.14, 1, 12), i % 2 ? 0x7b4a26 : 0x8a5530, 0, 0.0 + i * 0.27, bz, 1, bw, 1, 0, 0, Math.PI / 2);
    [-1, 1].forEach(s => lb.add(G('Cylinder', 0.115, 0.115, 0.02, 12), 0xc79a63, s * bw / 2, i * 0.27, bz, 1, 1, 1, 0, 0, Math.PI / 2));
  }
  lb.add(G('Sphere', 1, 16, 8), 0xffffff, 0, 1.26, bz, bw / 2 + 0.08, 0.13, 0.24);
  lb.add(G('Sphere', 1, 12, 8), 0xffffff, -0.9, 1.3, bz, 0.5, 0.16, 0.22); lb.add(G('Sphere', 1, 12, 8), 0xffffff, 0.8, 1.31, bz, 0.6, 0.15, 0.22);
  lb.add(G('Box', 1, 1, 1), 0x070a18, 0, -0.44, (C.DECK_END + C.PIT_END) / 2, GU * 2, 0.02, C.DECK_END - C.PIT_END);
  lb.add(G('Box', 1, 1, 1), 0x1a2238, 0, -0.25, C.PIT_END - 0.02, GU * 2, 0.5, 0.04);
  // aiming arrows on the ice
  for (let i = -3; i <= 3; i++) lb.add(G('Cone', 0.05, 0.2, 3), 0x2a5f9a, i * 0.2, 0.004, -1.9 - (3 - Math.abs(i)) * 0.16, 1, 1, 0.08, -Math.PI / 2, 0, 0);
  const lm = lb.build(); lm.receiveShadow = true; lane.add(lm);
  const spotMat = new THREE.MeshBasicMaterial({ color: 0x2a5a8a, transparent: true, opacity: 0.28, depthWrite: false });
  pinSpots().forEach(s => { const m = new THREE.Mesh(G('Circle', 0.12, 20), spotMat); m.rotation.x = -Math.PI / 2; m.position.set(s.x, 0.004, s.z); lane.add(m); });

  // ── string lights (one instanced mesh for every bulb in the scene) ──
  const bulbs = [];
  const strand = (x0, y0, z0, x1, y1, z1, n, sag) => { for (let i = 0; i <= n; i++) { const t = i / n; bulbs.push([lerp(x0, x1, t), lerp(y0, y1, t) - Math.sin(t * Math.PI) * sag, lerp(z0, z1, t)]); } };
  strand(-R - 0.2, 1.22, bz + 0.2, 0, 1.2, bz + 0.2, 9, 0.16); strand(0, 1.2, bz + 0.2, R + 0.2, 1.22, bz + 0.2, 9, 0.16);

  // ── Santa's workshop ──
  const ws = new THREE.Group(); ws.position.set(-6.0, GROUND, -13.2); ws.rotation.y = 0.42; scene.add(ws);
  const wb = new Batch();
  wb.add(G('Box', 1, 1, 1), 0x8a3526, 0, 1.3, 0, 5.2, 2.6, 3.8);
  for (let i = 0; i < 6; i++) wb.add(G('Box', 1, 1, 1), 0x6f2a1e, 0, 0.3 + i * 0.42, 1.91, 5.22, 0.03, 0.02);
  wb.add(gable(5.9, 2.0, 4.3), 0x4c2418, 0, 2.6, 0);
  wb.add(gable(6.1, 2.07, 4.1), 0xffffff, 0, 2.72, 0);
  [-1, 1].forEach(s => wb.add(G('Sphere', 1, 12, 8), 0xffffff, s * 2.95, 2.62, 0, 0.3, 0.16, 2.1));
  wb.add(G('Box', 1, 1, 1), 0x7a4630, 1.5, 4.1, -0.4, 0.6, 1.3, 0.6); wb.add(G('Box', 1, 1, 1), 0xffffff, 1.5, 4.8, -0.4, 0.78, 0.2, 0.78);
  wb.add(G('Box', 1, 1, 1), 0x1f6b3a, 0, 0.85, 1.92, 0.95, 1.7, 0.06); wb.add(G('Cylinder', 0.475, 0.475, 0.06, 16, 1, false, 0, Math.PI), 0x1f6b3a, 0, 1.7, 1.92, 1, 1, 1, Math.PI / 2, 0, 0);
  wb.add(G('Torus', 0.2, 0.06, 8, 16), 0x1d8a44, 0, 1.45, 1.98); wb.add(G('Sphere', 0.06, 8, 6), 0xe63946, 0, 1.25, 2.0);
  wb.add(G('Box', 1, 1, 1), 0x4c2418, 0, 0.85, 1.9, 1.15, 1.9, 0.04);
  [-1.55, 1.55].forEach(x => { wb.add(G('Box', 1, 1, 1), 0x4c2418, x, 1.35, 1.9, 1.1, 1.0, 0.05); wb.add(G('Box', 1, 1, 1), 0xffffff, x, 0.84, 1.98, 1.2, 0.1, 0.16); });
  ws.add(wb.build());
  const winMat = glow(0xffd76a);
  [-1.55, 1.55].forEach(x => { ws.add(box(0.92, 0.82, 0.02, winMat, x, 1.35, 1.93)); ws.add(box(0.06, 0.82, 0.03, M(0x4c2418), x, 1.35, 1.95)); ws.add(box(0.92, 0.06, 0.03, M(0x4c2418), x, 1.35, 1.95)); });
  const signTex = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#e9c98a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b4423'; g.lineWidth = 10; g.strokeRect(0, 0, w, h); g.fillStyle = '#7a1f1f'; g.font = 'bold 50px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText("SANTA'S WORKSHOP", w / 2, h / 2 + 3); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.48), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 })); sign.position.set(0, 2.36, 1.96); ws.add(sign);
  const wl = new THREE.PointLight(0xffb866, 60, 16, 1.6); wl.position.set(0, 1.6, 3.2); ws.add(wl);
  ws.updateMatrixWorld(true);
  const wpt = (x, y, z) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(ws.matrixWorld); return [v.x, v.y, v.z]; };
  for (let i = 0; i <= 8; i++) { const t = i / 8; bulbs.push(wpt(lerp(-3.0, 0, t), lerp(2.55, 4.62, t), 2.1)); if (i) bulbs.push(wpt(lerp(3.0, 0, t), lerp(2.55, 4.62, t), 2.1)); }
  W.chimney = new THREE.Vector3(...wpt(1.5, 5.0, -0.4));

  // ── big Christmas tree with presents ──
  const TX = 5.6, TZ = -11.8, cb = new Batch();
  cb.add(G('Cylinder', 0.22, 0.28, 0.8, 8), 0x4a2e1a, TX, GROUND + 0.4, TZ);
  for (let i = 0; i < 5; i++) { const r = 2.0 * (1 - i * 0.17), yy = GROUND + 0.7 + i * 0.95; cb.add(G('Cone', 1, 1, 12), i % 2 ? 0x1d6b3f : 0x18603a, TX, yy + 0.8, TZ, r, 1.6, r); cb.add(G('Cone', 1, 1, 12), 0xf4f8ff, TX, yy + 1.22, TZ, r * 0.52, 0.8, r * 0.52); }
  [[1.6, 0.5, 0xe63946, 0.5], [-1.4, 0.9, 0x3a86ff, 0.42], [0.4, 1.9, 0x2a9d4a, 0.36], [-0.5, 1.7, 0xffd23f, 0.3], [2.1, -0.5, 0xb565e0, 0.34]].forEach(p => {
    cb.add(G('Box', 1, 1, 1), p[2], TX + p[0], GROUND + p[3] / 2, TZ + p[1], p[3], p[3], p[3], 0, p[0]);
    cb.add(G('Box', 1, 1, 1), 0xffffff, TX + p[0], GROUND + p[3] / 2, TZ + p[1], p[3] * 1.03, p[3] * 1.03, p[3] * 0.18, 0, p[0]);
    cb.add(G('Sphere', 1, 8, 6), 0xffffff, TX + p[0], GROUND + p[3] * 1.05, TZ + p[1], p[3] * 0.16);
  });
  scene.add(cb.build());
  for (let i = 0; i < 46; i++) { const t = i / 46, a = t * TAU * 5.2, r = 2.0 * (1 - t * 0.83) * 0.82, yy = GROUND + 1.0 + t * 4.4; bulbs.push([TX + Math.cos(a) * r, yy, TZ + Math.sin(a) * r]); }
  W.treeStar = mesh(new THREE.OctahedronGeometry(0.3), glow(0xffe36a), TX, GROUND + 6.25, TZ); W.treeStar.scale.set(1, 1.5, 0.5); scene.add(W.treeStar);
  const tl = new THREE.PointLight(0xffe0a0, 40, 14, 1.6); tl.position.set(TX - 0.5, 3, TZ + 2.4); scene.add(tl);

  // ── North Pole ──
  const nb = new Batch(), NX = -2.35, NZ = -3.9;
  for (let i = 0; i < 8; i++) nb.add(G('Cylinder', 0.07, 0.07, 0.2, 10), i % 2 ? 0xffffff : 0xe23a3a, NX, GROUND + 0.1 + i * 0.2, NZ);
  nb.add(G('Sphere', 0.13, 14, 10), 0xffd23f, NX, GROUND + 1.72, NZ); nb.add(G('Sphere', 1, 12, 8), 0xf4f8ff, NX, GROUND, NZ, 0.35, 0.12, 0.35);
  const npm = nb.build({ roughness: 0.4 }); scene.add(npm);
  const npTex = canvasTex(256, 72, (g, w, h) => { g.fillStyle = '#e9c98a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#6b4423'; g.lineWidth = 8; g.strokeRect(0, 0, w, h); g.fillStyle = '#7a1f1f'; g.font = 'bold 36px "Trebuchet MS",Verdana,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NORTH POLE', w / 2, h / 2 + 2); });
  const nps = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25), new THREE.MeshStandardMaterial({ map: npTex, roughness: 0.8, side: THREE.DoubleSide })); nps.position.set(NX, GROUND + 1.22, NZ + 0.09); nps.rotation.y = 0.25; scene.add(nps);

  // ── candy-cane lamp posts along the lane ──
  const pb = new Batch(); W.lamps = [];
  [[-2.15, -1.8], [2.15, -1.8], [-2.4, -8.2], [2.4, -8.2], [-3.7, 6.5], [3.7, 6.5]].forEach(p => {
    for (let i = 0; i < 9; i++) pb.add(G('Cylinder', 0.045, 0.045, 0.2, 8), i % 2 ? 0xffffff : 0xe23a3a, p[0], GROUND + 0.1 + i * 0.2, p[1]);
    pb.add(G('Box', 1, 1, 1), 0x2b2b2b, p[0], GROUND + 1.84, p[1], 0.2, 0.05, 0.2); pb.add(G('Cone', 0.16, 0.14, 4), 0x2b2b2b, p[0], GROUND + 2.16, p[1], 1, 1, 1, 0, Math.PI / 4);
    const lm2 = mesh(G('Box', 1, 1, 1), glow(0xffd98a), p[0], GROUND + 1.98, p[1], 0.15, 0.22, 0.15); lm2.castShadow = false; scene.add(lm2);
    const h2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex(), color: 0xffc870, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending })); h2.scale.set(0.9, 0.9, 1); h2.position.set(p[0], GROUND + 1.98, p[1]); scene.add(h2);
  });
  scene.add(pb.build({ roughness: 0.4 }));

  // bulbs
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.055, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), bulbs.length);
  const bg = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), bulbs.length);
  const dm = new THREE.Object3D();
  bulbs.forEach((b, i) => { dm.position.set(b[0], b[1], b[2]); dm.updateMatrix(); bm.setMatrixAt(i, dm.matrix); bg.setMatrixAt(i, dm.matrix); });
  bm.frustumCulled = bg.frustumCulled = false; scene.add(bm, bg); W.bulbs = bm; W.bulbGlow = bg; W.nBulbs = bulbs.length;

  // ── falling snow ──
  const NS = lowQ ? 900 : 1800, sp = new Float32Array(NS * 3), sv = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) { sp[i * 3] = (Math.random() * 2 - 1) * 16; sp[i * 3 + 1] = Math.random() * 12; sp[i * 3 + 2] = -24 + Math.random() * 38; sv[i * 3] = 0.6 + Math.random() * 0.9; sv[i * 3 + 1] = Math.random() * 6; sv[i * 3 + 2] = 0.4 + Math.random() * 1.2; }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const snow = new THREE.Points(sgeo, new THREE.PointsMaterial({ map: dotTex(), size: 0.085, transparent: true, opacity: 0.9, depthWrite: false, color: 0xffffff, sizeAttenuation: true }));
  snow.frustumCulled = false; scene.add(snow); W.snowMat = snow.material;

  const col = new THREE.Color(); let lastBlink = -1;
  W.update = (dt, time, party) => {
    for (let i = 0; i < NS; i++) {
      sp[i * 3 + 1] -= sv[i * 3] * dt; sp[i * 3] += (Math.sin(time * sv[i * 3 + 2] + sv[i * 3 + 1]) * 0.35 + 0.25) * dt;
      if (sp[i * 3 + 1] < GROUND) { sp[i * 3 + 1] = 12; sp[i * 3] = (Math.random() * 2 - 1) * 16; }
      if (sp[i * 3] > 16) sp[i * 3] = -16;
    }
    sgeo.attributes.position.needsUpdate = true;
    const ph = Math.floor(time * (party ? 7 : 2.5));
    if (ph !== lastBlink) {
      lastBlink = ph;
      for (let i = 0; i < W.nBulbs; i++) { const on = (i + ph) % 3 !== 0; col.setHex(BULB[i % 5]); if (!on) col.multiplyScalar(0.18); bm.setColorAt(i, col); col.setHex(BULB[i % 5]); if (!on) col.multiplyScalar(0); bg.setColorAt(i, col); }
      bm.instanceColor.needsUpdate = true; bg.instanceColor.needsUpdate = true;
    }
    W.aurora.forEach(m => {
      const p = m.geometry.attributes.position, b = m.userData.base, k = m.userData.k;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3]; p.setY(i, b[i * 3 + 1] + Math.sin(x * 0.035 + time * 0.35 + k * 2) * 3.2 + Math.sin(x * 0.09 - time * 0.22 + k) * 1.4); }
      p.needsUpdate = true; m.material.opacity = (0.3 - k * 0.06) * (0.75 + 0.25 * Math.sin(time * 0.6 + k * 1.7)) * (party ? 1.8 : 1);
    });
    W.treeStar.rotation.y = time * 1.2; const ts = 1 + Math.sin(time * 4) * 0.12; W.treeStar.scale.set(ts, ts * 1.5, 0.5 * ts);
  };
  return W;
}
