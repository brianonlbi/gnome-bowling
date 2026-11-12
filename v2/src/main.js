// Gnome Bowling 2.0 — real-time 3D build. Same game as 1.0: position → aim → power, ten frames,
// gnome antics, turkey dinner, and a finale for a perfect game.
import * as THREE from 'three';
import { initPhysics, Sim, C, pinSpots } from './physics.js';
import { buildWorld, GROUND } from './world.js';
import * as CH from './characters.js';
import { Snd } from './audio.js';
import { createHud } from './hud.js';
import { Particles, TAU, rand, pick, clamp, lerp, smooth, seg, shuffle, hex3, dotTex, M, sph } from './build.js';

const V3 = THREE.Vector3;
const wrap = document.getElementById('wrap'), stage = document.getElementById('stage'), glCanvas = document.getElementById('gl'), hudCanvas = document.getElementById('hud');
const hud = createHud(hudCanvas);
const TOUCH = !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
const DEV = /dev/.test(location.hash);

// ───────────────────────── state ─────────────────────────
let time = 0, phase = 'loading', pt = 0, diff = 'easy';
const SPEED = { easy: { aim: 1.5, pow: 2.1 }, hard: { aim: 4.6, pow: 6.8 } };
let frames = [], fi = 0, rackCount = 10, sweepFull = false, sweepDone = false, gameOverNext = false, newBest = false, settleT = 0;
const santa = { x: 0, tx: 0, mode: 'idle', t: 0, hasBall: true, splat: 0, released: false };
const shot = { aim: 0, power: 0, kid: false }; let aimPh = 0, powPh = 0;
const keys = {}; let idleT = 0, anticT = 3, ambientT = 4;
let bubbles = [], floaters = [], shots = [], banner = null;
let cut = null, pendingCut = null, strikeStreak = 0, club300 = false;
const best = { easy: 0, hard: 0 };
try { const bs = JSON.parse(localStorage.getItem('gnomebowl2_best') || '{}'); best.easy = bs.easy || 0; best.hard = bs.hard || 0; club300 = localStorage.getItem('gnomebowl_300') === '1'; } catch (e) { }
const HATS = [0xd62828, 0x2a9d4a, 0x2563c9, 0x8e44ad, 0xe67e22, 0x12a5a5, 0xe0457b, 0xc9a30a, 0xb0183a, 0x3b4cc0];
const COATS = [0x2e6fb7, 0xb03a2e, 0x3a8f4d, 0x7a4a9e, 0x2f8f9a, 0xb5562a, 0x40609a, 0x8a3b6b, 0x4a7a2a, 0xa8322d];
const TAUNTS = ['Nyah nyah!', 'Missed me!', 'Yoo-hoo, Santa!', 'Ho ho NO!', 'Butterfingers!', 'Nice try, Tubby!', 'Can’t touch this!', 'Smell ya later!', 'Is that all you got?', 'My granny bowls better!', 'Over here, Beardy!'];
const SIGNS = ['MISS!', 'BOO!', 'LOL', 'NOPE', 'HA HA', '0/10', 'ZZZ…', 'WEAK!'];
const SANTA_GRUMBLE = ['Hey!', 'Naughty list!', 'Why, you little…', 'Ho ho HEY!', 'Coal for you!', 'Rude!'];
const HANDX = 0.39;

// ───────────────────────── renderer / scene ─────────────────────────
let renderer, scene, camera, world, sim, sparks, puffs;
let santaM, ballMesh, mrs, table, chair, turkey, trophy, arrow, sleigh, star300, discoA, discoB;
const gnomes = [], cr = {};
const cam = { pos: new V3(0, 3.8, 8.2), look: new V3(0, -0.82, -11.8), fov: 32 };
const camT = { pos: new V3(), look: new V3(), fov: 32 };
let sideways = false, lowQ = TOUCH, paused = false, stageW = 960, stageH = 640, gcamK = 0;
const gcam = new THREE.PerspectiveCamera(34, 1.5, 0.1, 300);

function resize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  sideways = TOUCH && vh > vw * 1.15;
  let w = sideways ? vh : vw, h = sideways ? vw : vh;
  const a = w / h; if (a < 1.25) h = w / 1.25; else if (a > 2.4) w = h * 2.4;
  stageW = w; stageH = h;
  stage.style.width = w + 'px'; stage.style.height = h + 'px'; stage.style.transform = sideways ? 'rotate(90deg)' : 'none';
  const dpr = Math.min(window.devicePixelRatio || 1, lowQ ? 1.5 : 2);
  hud.resize(w, h, dpr);
  if (renderer) { renderer.setPixelRatio(dpr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
}
window.addEventListener('resize', resize); window.addEventListener('orientationchange', () => setTimeout(resize, 250));

// ───────────────────────── helpers ─────────────────────────
const _p = new V3();
function toHud(v) { _p.copy(v).project(camera); return { x: (_p.x * 0.5 + 0.5) * hud.W, y: (-_p.y * 0.5 + 0.5) * hud.H, ok: _p.z < 1 }; }
function say(pos, text, dur, onGnome) { bubbles.push({ pos: pos.clone(), text, t: 0, dur: dur || 2, g: !!onGnome }); }
function floatText(pos, text, o) { o = o || {}; floaters.push({ pos: pos.clone(), text, t: -(o.delay || 0), dur: o.dur || 1.2, size: o.size || 14, color: o.color || '#fff' }); }
function gnomeHead(g) { return g.m.root.position.clone().add(new V3(0, 0.82, 0)); }
function santaHead() { return new V3(santaM.root.position.x, 1.75, santaM.root.position.z); }
const WHITE3 = [1, 1, 1];
function puff(x, y, z, n, s) { for (let i = 0; i < n; i++) puffs.emit({ x: x + rand(-0.06, 0.06), y: y + rand(0, 0.05), z: z + rand(-0.06, 0.06), vx: rand(-0.7, 0.7), vy: rand(0.2, 1.1), vz: rand(-0.7, 0.7), g: 1.2, life: rand(0.35, 0.75), size: (s || 1) * rand(0.07, 0.14), size1: (s || 1) * 0.02, color: WHITE3, alpha: 0.9, drag: 1.5 }); }
const CONF = ['#e63946', '#2a9d4a', '#ffd23f', '#ffffff', '#3a86ff'].map(hex3);
function confetti(n, cx, cz) { for (let i = 0; i < n; i++) puffs.emit({ x: (cx || 0) + rand(-2.4, 2.4), y: rand(2.2, 4.2), z: (cz == null ? -3 : cz) + rand(-3.5, 3.5), vx: rand(-1, 1), vy: rand(0, 2.2), vz: rand(-1, 1), g: 2.2, life: rand(1.6, 2.8), size: rand(0.05, 0.1), color: pick(CONF), drag: 0.9, floor: 0 }); }
const FW = ['#ff4d6d', '#ffd23f', '#7dffb0', '#6fc3ff', '#ff9f1c', '#e0aaff', '#ffffff'].map(hex3);
function firework(x, y, z, quiet, col) {
  col = col || pick(FW); const n = lowQ ? 50 : 90;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, b = Math.acos(rand(-1, 1)), v = rand(3, 7);
    sparks.emit({ x, y, z, vx: Math.sin(b) * Math.cos(a) * v, vy: Math.cos(b) * v, vz: Math.sin(b) * Math.sin(a) * v, g: 1.6, drag: 1.3, life: rand(0.9, 1.7), size: rand(0.22, 0.4), size1: 0.04, color: i % 6 === 0 ? WHITE3 : col });
  }
  sparks.emit({ x, y, z, g: 0, life: 0.3, size: 4.5, size1: 0.3, color: col, alpha: 0.6 });
  if (!quiet) Snd.boom();
}

// ───────────────────────── gnomes / rack ─────────────────────────
function newRack(drop) {
  sim.rack();
  gnomes.forEach((g, i) => {
    g.pin = sim.pins[i]; g.alive = true; g.m.root.visible = true; g.shrink = 1; g.act = null; g.rocket = false; g.rz = 0;
    g.dropY = drop ? 1.8 + i * 0.22 : 0; g.dropV = 0; g.landed = !drop; g.squash = 0; g.m.stars.visible = false;
  });
}
function isUp(g) { return g.alive && g.pin && g.pin.body && !g.pin.down && !sim.isTipped(g.pin); }
function standing() { return gnomes.filter(isUp); }
function startGame(d) {
  diff = d; strikeStreak = 0; cut = null; pendingCut = null; frames = []; for (let i = 0; i < 10; i++) frames.push([]); fi = 0; gameOverNext = false; newBest = false;
  hideCutProps(); newRack(true); santa.x = santa.tx = 0; beginRoll();
}
function beginRoll() {
  rackCount = sim.pins.length; sim.removeBall(); phase = 'position'; pt = 0; idleT = 0;
  santa.mode = 'idle'; santa.t = 0; santa.hasBall = true; santa.released = false; attachBall();
  anticT = rand(1.2, 3.5); banner = null; cr.rl.act = cr.rr.act = null;
}
function toTitle() { cut = null; pendingCut = null; hideCutProps(); phase = 'title'; pt = 0; newRack(false); sim.removeBall(); santa.mode = 'idle'; santa.hasBall = true; santa.x = santa.tx = 0; attachBall(); anticT = 1.5; banner = null; Snd.rollStop(); }
function attachBall() { santaM.armR.add(ballMesh); ballMesh.position.set(0, -0.57, 0); ballMesh.quaternion.identity(); ballMesh.visible = true; ballMesh.userData.setGold(club300); }

// scoring -----------------------------------------------------------------
function calcScores(fr) {
  let rolls = [], out = [], total = 0, pend = false, i = 0; fr.forEach(F => { rolls = rolls.concat(F); });
  for (let f = 0; f < 10; f++) {
    const F = fr[f]; let v = null;
    if (!F || !F.length || pend) { out.push(null); pend = true; continue; }
    if (f < 9) {
      if (F[0] === 10) { if (rolls[i + 1] != null && rolls[i + 2] != null) v = 10 + rolls[i + 1] + rolls[i + 2]; i += 1; }
      else if (F.length < 2) { i += 1; }
      else if (F[0] + F[1] === 10) { if (rolls[i + 2] != null) v = 10 + rolls[i + 2]; i += 2; }
      else { v = F[0] + F[1]; i += 2; }
    } else if (F.length === 3 || (F.length === 2 && F[0] + F[1] < 10)) v = F[0] + (F[1] || 0) + (F[2] || 0);
    if (v == null) { pend = true; out.push(null); } else { total += v; out.push(total); }
  }
  return out;
}
function totalScore() { const s = calcScores(frames); let t = 0; for (let i = 0; i < 10; i++) if (s[i] != null) t = s[i]; return t; }
function marks(f) {
  const F = frames[f] || [], m = [];
  if (f < 9) { if (F[0] === 10) return ['', 'X']; if (F.length > 0) m.push(F[0] === 0 ? '-' : '' + F[0]); if (F.length > 1) m.push(F[0] + F[1] === 10 ? '/' : (F[1] === 0 ? '-' : '' + F[1])); return m; }
  for (let i = 0; i < F.length; i++) {
    const v = F[i], prev = i > 0 ? F[i - 1] : null, fresh = (i === 0) || (i === 1 && F[0] === 10) || (i === 2 && (F[1] === 10 || (F[0] !== 10 && F[0] + F[1] === 10)));
    if (fresh) m.push(v === 10 ? 'X' : (v === 0 ? '-' : '' + v)); else m.push(prev + v === 10 ? '/' : (v === 0 ? '-' : '' + v));
  }
  return m;
}

// ───────────────────────── antics ─────────────────────────
function startAntic(type, list, dur) {
  list.forEach((g, i) => {
    let d = 0; if (type === 'wave') d = (g.pin.hx + 0.7) / 1.4 * 0.7; else if (type !== 'sleep' && type !== 'laugh' && type !== 'bow') d = i * rand(0, 0.12);
    g.act = { type, t: -d, dur, fired: false };
    if (type === 'sign') CH.gnomeSign(g.m, pick(SIGNS));
  });
}
function randomAntic() {
  const S = standing().filter(g => g.dropY === 0); if (!S.length) return;
  const r = Math.random(); let n = r < 0.38 ? 1 : r < 0.56 ? 2 : r < 0.72 ? Math.min(S.length, 3 + ((Math.random() * 5) | 0)) : S.length; n = Math.min(n, S.length);
  const types = ['moon', 'moon', 'moon', 'tongue', 'tongue', 'dance', 'dance', 'sign', 'snowball', 'spin']; if (n >= 3) types.push('wave', 'wave');
  const type = pick(types); if (type === 'snowball') n = Math.min(n, 2);
  let list = shuffle(S.slice()).slice(0, n); if (type === 'wave') list = S;
  startAntic(type, list, { moon: 3.2, tongue: 2.6, dance: 3.2, wave: 2.6, sign: 3, snowball: 1.5, spin: 2.2 }[type]);
  const h = gnomeHead(list[0]);
  if (type === 'moon') {
    Snd.raspberry(0.45); if (list.length > 3) Snd.raspberry(1.5); say(h, pick(['Kiss this, Santa!', 'Full moon tonight!', 'Nyah nyah!', 'Hey Santa! Lookie!']), 2.4, true);
    if (phase !== 'title' && Math.random() < 0.7) setTimeout(() => { if (phase === 'position' || phase === 'aim' || phase === 'power') say(santaHead(), pick(SANTA_GRUMBLE), 1.8); }, 1100);
  } else if (type === 'tongue') { Snd.nyah(); say(h, pick(TAUNTS), 2.2, true); }
  else if (type === 'dance') { Snd.jig(); if (list.length > 4) say(h, 'Gnome party!', 2, true); }
  else if (type === 'sign') Snd.pop(); else if (type === 'wave' || type === 'spin') Snd.whee();
}
function reactAll(type, dur, text) { const S = standing(); if (!S.length) return; startAntic(type, S, dur); if (text) say(gnomeHead(pick(S)), text, 2, true); }

const _pose = {};
function gnomePose(g, tipped, dt) {
  const p = _pose; for (const k in p) delete p[k];
  const a = g.act, type0 = (a && a.t >= 0) ? a.type : null, u = a ? clamp(a.t / a.dur, 0, 1) : 0, sd = g.seed;
  let type = type0, at = a ? a.t : 0;
  p.sy = 1 + Math.sin(time * 2.5 + sd) * 0.015; p.sx = 1; p.armL = p.armR = 0.1;
  if (tipped) { p.eyes = 'x'; p.armL = p.armR = 0.9; p.mouth = 1; return p; }
  if (!type && (phase === 'roll' || phase === 'throw') && sim.ball && !sim.ball.done) {
    if (sim.ball.gutter || sim.ball.kid) { type = 'laugh'; at = time; }
    else if (sim.ball.body.translation().z < -0.8) { p.dx = Math.sin(time * 50 + sd) * 0.012; p.eyes = 'wide'; p.armL = p.armR = 0.95; p.mouth = 1; }
  }
  if (g.squash > 0) { p.sy *= 1 - g.squash * 0.25; p.sx *= 1 + g.squash * 0.2; }
  if (g.dropY > 0) { p.dy = g.dropY; p.armL = p.armR = 0.9; p.eyes = 'wide'; }
  switch (type) {
    case 'moon': {
      const turn = seg(u, 0, 0.12) - seg(u, 0.88, 1), pa = seg(u, 0.14, 0.24) - seg(u, 0.78, 0.88);
      p.rotY = turn * Math.PI; p.pants = pa; p.dx = Math.sin(time * 15 + sd) * 0.03 * pa; p.dy = Math.abs(Math.sin(time * 7.5 + sd)) * 0.03 * pa; p.rotZ = Math.sin(time * 15 + sd) * 0.14 * pa;
      p.rotX = -0.42 * pa; p.armL = 0.25; p.armR = 0.25 + Math.max(0, Math.sin(time * 15)) * 0.3 * pa; break;
    }
    case 'tongue': p.tongue = 1; p.eyes = 'closed'; p.mouth = 0.6; p.armL = 0.82 + Math.sin(time * 22) * 0.12; p.armR = 0.82 + Math.cos(time * 22) * 0.12; p.rotZ = Math.sin(time * 8 + sd) * 0.14; break;
    case 'dance': p.dy = Math.abs(Math.sin(at * 8)) * 0.09; p.dx = Math.sin(at * 4) * 0.06; p.rotZ = Math.sin(at * 8) * 0.16; p.rotY = Math.sin(at * 4) * 0.6; p.armL = 0.6 + Math.sin(at * 8) * 0.4; p.armR = 0.6 - Math.sin(at * 8) * 0.4; p.mouth = 0.8; break;
    case 'wave': { const w = Math.max(0, Math.sin(at * 4.8)); p.dy = w * 0.22; p.armL = p.armR = 0.2 + w * 0.8; p.mouth = w; break; }
    case 'spin': p.rotY = at * 11; p.dy = Math.abs(Math.sin(at * 5)) * 0.08; p.armL = p.armR = 0.7; p.mouth = 0.7; break;
    case 'sign': p.sign = 1; p.armR = 0.75; p.dy = Math.abs(Math.sin(at * 6)) * 0.03; p.mouth = 0.6; break;
    case 'laugh': p.dy = Math.abs(Math.sin(at * 22 + sd)) * 0.025; p.mouth = 1; p.eyes = 'closed'; p.armL = p.armR = 0.3; p.rotZ = Math.sin(at * 11 + sd) * 0.07; p.rotX = -0.18; break;
    case 'snowball': { const wd = seg(u, 0, 0.5), th = seg(u, 0.5, 0.65); p.armR = lerp(0.2, 1.2, wd) - th * 0.8; p.rotX = -0.2 * wd + 0.45 * th; p.eyes = u > 0.5 ? 'n' : 'closed'; p.snowball = u < 0.55; break; }
    case 'sleep': p.rotZ = 0.2 + Math.sin(time * 1.6 + sd) * 0.05; p.eyes = 'closed'; p.mouth = 0.4 + Math.sin(time * 1.6 + sd) * 0.3; break;
    case 'bow': { const bw = Math.max(0, Math.sin(at * 3.6)); p.rotX = bw * 1.15; p.armL = p.armR = 1.05 - bw * 0.5; p.eyes = bw > 0.5 ? 'closed' : 'wide'; p.mouth = 1 - bw; break; }
  }
  return p;
}
const _q = new THREE.Quaternion();
function syncGnomes(dt) {
  for (const g of gnomes) {
    if (!g.alive) continue;
    const a = g.act;
    if (a) {
      a.t += dt;
      if (a.type === 'snowball' && !a.fired && a.t > a.dur * 0.55 && phase !== 'title') { a.fired = true; throwSnowball(g.m.root.position.clone().add(new V3(0.15, 0.6, 0.1)), new V3(santaM.root.position.x + rand(-0.1, 0.1), rand(0.7, 1.0), C.SANTA_Z + 0.25), 0.6, 1.2, hitSanta); }
      if (a.type === 'sleep' && a.t > 0 && Math.floor(a.t / 1.6) !== Math.floor((a.t - dt) / 1.6)) { floatText(gnomeHead(g), 'z', { dur: 1.5, size: 14 + Math.random() * 8, color: '#cfe6ff' }); if (Math.random() < 0.15) Snd.snore(); }
      if (a.type === 'laugh' && a.t > 0 && Math.random() < dt * 1.2) floatText(gnomeHead(g), pick(['HA', 'HEE', 'HO']), { dur: 0.9, size: 13 });
      if (a.t > a.dur) g.act = null;
    }
    const root = g.m.root;
    if (g.rocket) {
      g.rv += 9 * dt; g.rz += g.rv * dt; root.position.y = g.rz; root.rotation.y += dt * 9;
      for (let i = 0; i < 2; i++) sparks.emit({ x: root.position.x + rand(-0.05, 0.05), y: g.rz, z: root.position.z + rand(-0.05, 0.05), vx: rand(-0.4, 0.4), vy: rand(-2.5, -0.8), vz: rand(-0.4, 0.4), g: 0, life: rand(0.25, 0.5), size: rand(0.1, 0.18), size1: 0.02, color: pick([FW[1], FW[4], WHITE3]) });
      CH.poseGnome(g.m, { armL: 1.1, armR: 1.1, eyes: 'wide', mouth: 1 });
      if (g.rz > g.rTop) { firework(root.position.x, g.rz, root.position.z, false, hex3(g.m.hatCol)); firework(root.position.x + rand(-0.6, 0.6), g.rz + rand(-0.4, 0.5), root.position.z + rand(-0.6, 0.6), true); g.alive = false; root.visible = false; g.rocket = false; }
      continue;
    }
    let tipped = true;
    if (g.pin && g.pin.body) { const t = g.pin.body.translation(), q = g.pin.body.rotation(); root.position.set(t.x, t.y, t.z); root.quaternion.set(q.x, q.y, q.z, q.w); tipped = sim.isTipped(g.pin) || g.pin.down; }
    if (g.dropY > 0) { g.dropV -= 14 * dt; g.dropY += g.dropV * dt; if (g.dropY <= 0) { g.dropY = 0; if (!g.landed) { g.landed = true; g.squash = 1; puff(root.position.x, 0.02, root.position.z, 4); if (phase !== 'title') Snd.thud(); } } }
    if (g.squash > 0) g.squash = Math.max(0, g.squash - dt * 4);
    CH.poseGnome(g.m, gnomePose(g, tipped, dt));
    root.scale.setScalar(Math.max(0.001, g.shrink));
    const st = g.m.stars, rest = tipped && g.pin && g.pin.body && g.shrink > 0.6 && g.pin.prevSpeed < 0.3;
    st.visible = rest;
    if (rest) { st.position.set(root.position.x, 0.62, root.position.z); st.children.forEach((s, i) => { const an = time * 5 + i * TAU / 3; s.position.set(Math.cos(an) * 0.2, Math.sin(an * 0.7) * 0.03, Math.sin(an) * 0.2); s.rotation.y = an; }); }
  }
}

// snowballs ---------------------------------------------------------------
function throwSnowball(from, to, dur, arc, hit) { const m = shots.pool.find(s => !s.visible); if (!m) return; m.visible = true; shots.push({ m, from, to, t: 0, dur, arc, hit }); Snd.whoosh(); }
function hitSanta() { Snd.splat(); santa.splat = 3; const h = santaHead(); puff(h.x, 0.9, C.SANTA_Z + 0.3, 10, 1.3); say(h, pick(['Oof!', 'Brrr!', 'Hey!!', 'Cold! COLD!']), 1.4); }

// ───────────────────────── critters ─────────────────────────
function ambientEvent() {
  const o = [];
  if (!cr.penguin.on && (phase === 'position' || phase === 'title' || phase === 'react')) o.push('penguin');
  if (!cr.bunny.act) o.push('bunny'); if (!cr.bird.on) o.push('bird'); if (!cr.flyer.on && phase !== 'perfect') o.push('flyer');
  if (!cr.snowman.act) o.push('snowman', 'snowhead'); if (!cr.rr.act) o.push('honk'); if (!cr.rl.act && !cr.rr.act) o.push('rdance'); o.push('shoot');
  const e = pick(o);
  if (e === 'penguin') { Object.assign(cr.penguin, { on: true, t: 0, dur: 2.8, dir: Math.random() < 0.5 ? 1 : -1, z: rand(-3.4, -1.2) }); Snd.whee(); }
  else if (e === 'bunny') { cr.bunny.act = 'pop'; cr.bunny.at = 0; cr.bunny.threw = false; }
  else if (e === 'bird') { cr.bird.on = true; cr.bird.t = 0; cr.bird.ch = false; }
  else if (e === 'flyer') { Object.assign(cr.flyer, { on: true, t: 0, dur: 9, dir: Math.random() < 0.5 ? 1 : -1 }); }
  else if (e === 'snowman') { cr.snowman.act = 'tip'; cr.snowman.at = 0; }
  else if (e === 'snowhead') { cr.snowman.act = 'head'; cr.snowman.at = 0; }
  else if (e === 'honk') { cr.rr.act = 'honk'; cr.rr.at = 0; Snd.honk(); }
  else if (e === 'rdance') { cr.rl.act = cr.rr.act = 'dance'; cr.rl.at = cr.rr.at = 0; Snd.jig(); }
  else if (e === 'shoot') { const x0 = rand(-40, 20), y0 = rand(22, 34), z0 = -110; for (let i = 0; i < 26; i++) sparks.emit({ x: x0 + i * 0.9, y: y0 - i * 0.32, z: z0, g: 0, life: 0.5 + i * 0.012, size: 0.5 + i * 0.03, size1: 0.05, color: WHITE3, alpha: 0.4 + i * 0.02 }); }
}
function reindeerHeadPos(r) { return r.m.root.position.clone().add(new V3(r.flip ? -0.5 : 0.5, 1.75, 0)); }
function updateCritters(dt) {
  [cr.rl, cr.rr].forEach(r => {
    const a = r.act; if (a) { r.at += dt; if (r.at > ({ laugh: 2.2, hit: 0.8, dance: 2, paddle: 2.3, honk: 0.7, cheer: 2.2 }[a] || 2)) r.act = null; }
    const p = { head: Math.sin(time * 1.3 + r.seed) * 0.04, tail: Math.sin(time * (a ? 16 : 3)) * 0.5, blink: Math.sin(time * 0.9 + r.seed) > 0.985 };
    if (a === 'laugh') { p.head = -0.18 + Math.sin(time * 18) * 0.12; p.hop = Math.abs(Math.sin(time * 9)) * 0.04; p.mouth = 1; p.blink = true; if (Math.random() < dt * 3) floatText(reindeerHeadPos(r), 'HAW', { dur: 0.8, size: 15 }); }
    else if (a === 'hit') { p.shake = Math.sin(time * 45) * 0.03; p.head = 0.22; }
    else if (a === 'dance') { p.hop = Math.abs(Math.sin(time * 7 + r.seed)) * 0.12; p.head = Math.sin(time * 7) * 0.16; p.legs = Math.sin(time * 14) * 0.25; }
    else if (a === 'cheer') { p.hop = Math.abs(Math.sin(time * 9)) * 0.16; p.head = 0.2; p.paddle = 1; p.mouth = 1; }
    else if (a === 'paddle') { p.head = 0.14; p.paddle = 1; }
    else if (a === 'honk') { p.head = 0.1; p.glow = 9; p.mouth = 1; }
    CH.poseReindeer(r.m, p);
  });
  // snowman
  const s = cr.snowman, sm = s.m; let hatDy = 0, hx = 0, hy = 0, hr = 0;
  if (s.act) {
    s.at += dt;
    if (s.act === 'tip') { hatDy = Math.sin(clamp(s.at / 1.4, 0, 1) * Math.PI) * 0.16; if (s.at > 1.4) s.act = null; }
    else { const u = s.at / 2.6; if (u < 0.25) { const k = u / 0.25; hy = Math.sin(k * Math.PI) * 0.35 - k * 0.95; hx = k * 0.45; hr = k * 3; } else if (u < 0.7) { hx = 0.45 + Math.sin((u - 0.25) / 0.45 * Math.PI) * 0.25; hy = -0.95; hr = 3 + (u - 0.25) * 14; } else { const k2 = (u - 0.7) / 0.3; hx = lerp(0.45, 0, k2); hy = lerp(-0.95, 0, k2) + Math.sin(k2 * Math.PI) * 0.5; hr = (1 - k2) * 6; } if (s.at > 2.6) s.act = null; }
  }
  sm.head.position.set(hx, 1.14 + hy, hx * 0.5); sm.head.rotation.z = -hr; sm.hat.position.y = 0.16 + hatDy; sm.armR.rotation.z = -1.0 - (s.act === 'tip' ? Math.sin(clamp(s.at / 1.4, 0, 1) * Math.PI) * 0.9 : 0);
  // bunny
  const b = cr.bunny;
  if (b.act) {
    b.at += dt; const up = smooth(seg(b.at, 0, 0.4)) - smooth(seg(b.at, 2.6, 3));
    b.m.b.position.y = -0.62 + up * 0.72; b.m.head.rotation.y = Math.sin(b.at * 4) * 0.5; b.m.ball.visible = b.at > 0.7 && b.at < 1.3;
    if (b.at > 1.3 && !b.threw) { b.threw = true; throwSnowball(b.m.root.position.clone().add(new V3(0.16, 0.5, 0)), reindeerHeadPos(cr.rl).add(new V3(0, -0.2, 0)), 0.5, 0.8, () => { Snd.splat(); cr.rl.act = 'hit'; cr.rl.at = 0; const h = reindeerHeadPos(cr.rl); puff(h.x, h.y - 0.2, h.z, 8); say(h, 'Hey!', 1.2); }); }
    if (b.at > 3) b.act = null;
  } else b.m.b.position.y = -0.62;
  // penguin belly-slide across the lane
  const pg = cr.penguin; pg.m.root.visible = pg.on;
  if (pg.on) {
    pg.t += dt; const u = pg.t / pg.dur, x = lerp(-3.6, 3.6, u) * pg.dir, ax = Math.abs(x);
    const y = ax < 1.05 ? 0 : ax < 1.5 ? 0.16 * Math.sin((ax - 1.05) / 0.45 * Math.PI) + lerp(0, 0.0, 0) + (ax > 1.3 ? lerp(0, GROUND, (ax - 1.3) / 0.2) : 0) : GROUND;
    pg.m.root.position.set(x, y, pg.z); pg.m.root.rotation.y = pg.dir > 0 ? 0 : Math.PI;
    pg.m.feet.forEach((f, i) => { f.position.y = 0.1 + Math.sin(time * 30 + i * 2) * 0.03; }); pg.m.flips.forEach((f, i) => { f.rotation.x = (i ? 1 : -1) * (0.3 + Math.sin(time * 20) * 0.4); }); pg.m.tailS.rotation.z = Math.sin(time * 25) * 0.3;
    if (Math.random() < 0.6) puffs.emit({ x: x - pg.dir * 0.3, y: y + 0.03, z: pg.z + rand(-0.1, 0.1), vx: -pg.dir * rand(0.3, 1), vy: rand(0.2, 0.8), g: 2, life: 0.4, size: rand(0.04, 0.08), color: WHITE3 });
    if (pg.t > pg.dur) pg.on = false;
  }
  // cardinal visits the right reindeer
  const bd = cr.bird; bd.m.root.visible = bd.on;
  if (bd.on) {
    bd.t += dt; const perch = cr.rr.m.root.position.clone().add(new V3(-0.42, 2.0 + cr.rr.m.body.position.y, 0.06)), far = new V3(9, 5, -1), away = new V3(-9, 6, -6); let fl = false;
    if (bd.t < 1.4) { const u = smooth(bd.t / 1.4); bd.m.root.position.lerpVectors(far, perch, u); bd.m.root.position.y += Math.sin(u * Math.PI) * 0.6; bd.m.root.rotation.y = Math.PI; fl = true; }
    else if (bd.t < 5) { bd.m.root.position.copy(perch); bd.m.root.position.y += Math.abs(Math.sin(time * 6)) * 0.02; bd.m.root.rotation.y = Math.PI + Math.sin(time * 2) * 0.6; if (!bd.ch) { bd.ch = true; Snd.chirp(); floatText(perch, '♪', { dur: 1.2, size: 18 }); } }
    else { const u2 = (bd.t - 5) / 1.4; bd.m.root.position.lerpVectors(perch, away, u2 * u2); bd.m.root.rotation.y = Math.PI; fl = true; }
    bd.m.wings.forEach((w, i) => { w.rotation.x = fl ? (i ? -1 : 1) * Math.sin(time * 34) * 1.1 : 0; });
    if (bd.t > 6.4) bd.on = false;
  }
  // far-off sleigh silhouette
  const f = cr.flyer;
  if (f.on && phase !== 'perfect') {
    f.t += dt; const u = f.t / f.dur; sleigh.root.visible = true; if (sleigh.banner) sleigh.banner.visible = false;
    sleigh.root.scale.setScalar(2.2); sleigh.root.position.set(lerp(-75, 75, u) * f.dir, 13 + Math.sin(u * 9) * 2, -85); sleigh.root.rotation.set(0, f.dir > 0 ? 0 : Math.PI, 0);
    gallop(); if (f.t > f.dur) { f.on = false; sleigh.root.visible = false; }
  }
}
function gallop() { sleigh.deer.forEach((d, i) => { CH.poseReindeer(d, { legs: Math.sin(time * 13 + i * 2) * 0.5, hop: Math.sin(time * 6 + i) * 0.06, glow: 4 }); }); }

// ───────────────────────── Santa ─────────────────────────
function poseSantaNow() {
  const m = santa.mode, t = santa.t, p = { t: time, crown: club300 || phase === 'perfect', splat: santa.splat > 0 };
  let off = HANDX, z = C.SANTA_Z, y = 0, bl = [0, -0.57, 0], rotY = 0;
  if (m === 'throw') {
    const a = smooth(seg(t, 0, 0.35)), b = smooth(seg(t, 0.35, 0.6)), f = smooth(seg(t, 0.6, 0.85)), e = smooth(seg(t, 0.85, 1));
    const bend = lerp(lerp(lerp(0, -0.25, a), -0.8, b), -0.25, f) * (1 - e);
    let phi = lerp(lerp(0.05, -1.05, a), 0.3, b); if (t >= 0.6) phi = lerp(0.3, 2.5, f); phi *= (1 - e);
    const st = b * (1 - e);
    p.bend = bend; p.armR = [phi - bend, 0.1]; p.armL = [-0.3 * st - bend * 0.5, 0.14 + 0.9 * st]; p.legL = [0.6 * st, 0]; p.legR = [-0.55 * st, 0]; p.headX = -bend * 0.6; z -= 0.22 * st;
  } else if (m === 'kid') {
    const k1 = smooth(seg(t, 0, 0.3)), k2 = smooth(seg(t, 0.3, 0.5)), k3 = smooth(seg(t, 0.5, 0.7)), k4 = smooth(seg(t, 0.85, 1)), q = k1 - k4;
    const bend = -1.2 * q, phi = (-0.55 * k2 + 1.25 * k3) * q;
    p.bend = bend; p.armR = [phi - bend, lerp(0.14, -0.3, q)]; p.armL = [phi - bend, lerp(0.14, -0.3, q)]; p.legL = p.legR = [0, 0.5 * q]; p.boxers = q; p.headX = 0.5 * q;
    off = HANDX * (1 - q); bl = [lerp(0, -0.19, q), -0.55, 0]; y = Math.sin(time * 18) * 0.008 * seg(t, 0.3, 0.7) * (1 - k4);
  } else if (m === 'cheer') { y = Math.abs(Math.sin(time * 7)) * 0.13; p.armL = [0, 2.65 + Math.sin(time * 14) * 0.2]; p.armR = [0, 2.65 + Math.cos(time * 14) * 0.2]; p.mouth = 1; p.eyesHappy = true; }
  else if (m === 'sad') { p.bend = -0.3; p.headX = -0.45; p.armL = p.armR = [0.3, 0.08]; }
  else { y = Math.sin(time * 2) * 0.008; p.armL = [0, 0.14]; p.armR = [0, 0.14]; p.headY = phase === 'title' ? Math.sin(time * 0.7) * 0.4 : 0; }
  if (santa.splat > 2.6) off += Math.sin(time * 50) * 0.03;
  if (cut && cut.santa) cut.santa(p), off = cut.off == null ? off : cut.off, rotY = cut.rotY || 0;
  santaM.root.position.set(santa.x - off, y + (p.y || 0), z + (p.z || 0)); santaM.root.rotation.y = rotY;
  CH.poseSanta(santaM, p);
  if (ballMesh.parent === santaM.armR) ballMesh.position.set(bl[0], bl[1], bl[2]);
}
function launch() {
  santaM.root.updateMatrixWorld(true); const w = new V3(); ballMesh.getWorldPosition(w);
  scene.add(ballMesh); ballMesh.position.copy(w);
  sim.launch(santa.x, shot.aim, shot.power, shot.kid, true, { y: w.y, z: w.z });
  santa.hasBall = false; phase = 'roll'; pt = 0; Snd.rollStart(sim.ball.speed * 22);
  gnomes.forEach(g => { g.act = null; });
}

// ───────────────────────── roll resolution ─────────────────────────
function resolveRoll() {
  const n = sim.judge(), F = frames[fi];
  const strike = (rackCount === 10 && n === 10), spare = (!strike && rackCount < 10 && n === rackCount), gut = sim.ball && sim.ball.gutter && n === 0;
  F.push(n); phase = 'react'; pt = 0; Snd.rollStop(); strikeStreak = strike ? strikeStreak + 1 : 0;
  const pad = strike ? 'X' : spare ? '/' : '' + n; CH.reindeerPaddle(cr.rl.m, pad); CH.reindeerPaddle(cr.rr.m, pad);
  if (strike) { banner = { text: 'STRIKE!', t: 0, color: '#ffd23f' }; Snd.strike(); Snd.hoho(); santa.mode = 'cheer'; confetti(110, 0, C.HEAD_Z + 1); cr.rl.act = cr.rr.act = 'cheer'; cr.snowman.act = 'head'; cr.snowman.at = 0; setTimeout(() => { if (phase === 'react') say(santaHead(), 'HO HO HO!', 1.6); }, 1300); }
  else if (spare) { banner = { text: 'SPARE!', t: 0, color: '#7dffb0' }; Snd.spare(); santa.mode = 'cheer'; confetti(50, 0, C.HEAD_Z + 1); cr.rl.act = cr.rr.act = 'paddle'; }
  else if (gut) {
    banner = { text: 'GUTTER BALL!', t: 0, color: '#ff6b6b' }; Snd.sad(); santa.mode = 'sad'; cr.rl.act = cr.rr.act = 'laugh'; setTimeout(Snd.giggle, 500);
    if (Math.random() < 0.5) { reactAll('moon', 2.3, 'Thanks for the breeze!'); Snd.raspberry(0.4); } else reactAll('laugh', 2.3, pick(TAUNTS));
  }
  else if (n === 0) { banner = { text: 'MISSED!', t: 0, color: '#ff9f6b' }; Snd.sad(); santa.mode = 'sad'; cr.rl.act = cr.rr.act = 'paddle'; reactAll(pick(['tongue', 'laugh', 'dance']), 2.2, pick(TAUNTS)); Snd.giggle(); }
  else {
    banner = { text: n + (n === 1 ? ' GNOME!' : ' GNOMES!'), t: 0, color: '#ffffff' }; cr.rl.act = cr.rr.act = 'paddle'; if (n >= 7) santa.mode = 'cheer';
    if (Math.random() < 0.45 && standing().length) { reactAll(pick(['tongue', 'laugh', 'sign']), 2.1, pick(TAUNTS)); if (Math.random() < 0.5) Snd.giggle(); }
  }
  cr.rl.at = cr.rr.at = 0;
  const L = F.length; gameOverNext = false; sweepFull = false;
  if (fi < 9) { if (strike || L === 2) { fi++; sweepFull = true; } }
  else if (L === 1) sweepFull = strike;
  else if (L === 2) { if (F[0] === 10) sweepFull = (n === 10); else if (F[0] + F[1] === 10) sweepFull = true; else gameOverNext = true; }
  else gameOverNext = true;
  pendingCut = (gameOverNext && totalScore() === 300) ? 'perfect' : (strike && strikeStreak % 3 === 0) ? 'turkey' : null;
  if (gameOverNext) { const tot = totalScore(); if (tot > best[diff]) { best[diff] = tot; newBest = true; try { localStorage.setItem('gnomebowl2_best', JSON.stringify(best)); } catch (e) { } } }
}
function afterReact() {
  if (gameOverNext) { phase = 'gameover'; pt = 0; santa.mode = totalScore() >= 120 ? 'cheer' : 'idle'; }
  else {
    phase = 'sweep'; pt = 0; sweepDone = false; santa.mode = 'idle'; santa.hasBall = true; attachBall();
    gnomes.forEach(g => { if (g.alive && g.pin && (g.pin.down || sweepFull) && g.pin.body) { const t = g.pin.body.translation(); if (t.y > -0.2) puff(t.x, t.y + 0.15, t.z, 6); } });
  }
}

// ───────────────────────── celebrations ─────────────────────────
function hideCutProps() { [mrs.root, table.root, chair.root, turkey.root, trophy.root].forEach(o => { o.visible = false; }); sleigh.root.visible = false; star300.visible = false; discoA.intensity = discoB.intensity = 0; world.iceMat.emissive.setHex(0); world.sun.intensity = 3.3; world.hemi.intensity = 0.9; world.fill.intensity = 0.55; world.snowMat.color.setHex(0xffffff); cr.flyer.on = false; }
function startCut(type) { phase = type; pt = 0; cut = { f: {}, n: 0 }; pendingCut = null; banner = null; santa.hasBall = false; ballMesh.visible = false; santa.mode = type === 'perfect' ? 'cheer' : 'idle'; sim.removeBall(); }
function endCut() { const was = phase; cut = null; santa.mode = 'idle'; hideCutProps(); if (was === 'perfect') { club300 = true; try { localStorage.setItem('gnomebowl_300', '1'); } catch (e) { } } afterReact(); }
function once(k, t) { if (pt >= t && !cut.f[k]) { cut.f[k] = 1; return true; } return false; }

const T_HOME = new V3(-1.08, 0, 0.72), T_OFF = new V3(-4.6, 0, 0.9), T_TABLE = new V3(0, 0, 0.3), T_CHAIR = new V3(0, 0, C.SANTA_Z + 0.22);
function updateTurkey(dt) {
  const t = pt, sh = () => new V3(0, 1.8, C.SANTA_Z);
  if (once('a', 0)) { Snd.gobble(); Snd.fanfare(); confetti(70, 0, 0); cr.rl.act = cr.rr.act = 'dance'; cr.rl.at = cr.rr.at = 0; santa.tx = 0; mrs.root.visible = table.root.visible = chair.root.visible = true; turkey.root.visible = false; CH.setTurkey(turkey, 0); }
  if (once('b', 2.9)) Snd.whoosh();
  if (once('c', 3.3)) { Snd.thud(); puff(-0.7, 0.02, 0.3, 6); puff(0.7, 0.02, 0.3, 6); }
  if (once('d', 5.2)) say(mrs.root.position.clone().add(new V3(0, 1.5, 0)), 'Dinner is served, dear!', 1.8);
  if (once('e', 6.75)) { Snd.pop(); say(sh(), 'Ho ho ho! Don’t mind if I do!', 1.8); }
  if (t > 7 && t < 10.6) { cut.n -= dt; if (cut.n <= 0) { cut.n = 0.34; Snd.chomp(); for (let i = 0; i < 5; i++) puffs.emit({ x: rand(-0.15, 0.15), y: 0.95, z: 0.3, vx: rand(-1.2, 1.2), vy: rand(1, 2.4), vz: rand(-1.4, 0.2), g: 7, life: 0.7, size: rand(0.03, 0.06), color: pick([hex3(0xc9853a), hex3(0xe8b25a), hex3(0x8a5a2b)]), floor: 0.69 }); } }
  if (once('f', 9.0)) { Snd.kiss(); for (let h = 0; h < 5; h++) floatText(new V3(rand(-0.5, -0.1), rand(1.3, 1.6), C.SANTA_Z - 0.2), '♥', { delay: h * 0.12, dur: 1.4, size: rand(18, 30), color: '#ff5a7a' }); }
  if (once('g', 6)) Snd.jig(); if (once('g2', 8.2)) Snd.jig();
  if (once('h', 11.0)) { Snd.burp(); say(sh(), 'BUUURRRP!', 1.1); }
  if (once('i', 11.7)) say(mrs.root.position.clone().add(new V3(0, 1.5, 0)), 'Oh, Nicholas!', 1.3);
  if (once('j', 12.2)) { say(sh(), '…Pardon me!', 1.1); Snd.giggle(); }
  if (Math.floor(t / 1.8) !== Math.floor((t - dt) / 1.8)) { cr.rl.act = cr.rr.act = 'dance'; cr.rl.at = cr.rr.at = 0; }
  // Mrs. Claus
  const out = smooth(seg(t, 12.4, 13.4)), mp = mrs.root.position; let walk = false, face = 2.5, armL = [0, 0.2], armR = [0, 0.2], lean = 0, hop = 0;
  if (t < 1) mp.copy(T_OFF);
  else if (t < 2.8) { mp.lerpVectors(T_OFF, T_HOME, seg(t, 1, 2.8)); walk = true; face = Math.PI / 2; armL = armR = [0, 2.9]; }
  else if (t < 3.4) { mp.copy(T_HOME); if (t < 3) armL = armR = [0, 2.9]; }
  else if (t < 4.4) { mp.lerpVectors(T_HOME, T_OFF, smooth(seg(t, 3.4, 4.4))); walk = true; face = -Math.PI / 2; }
  else if (t < 4.8) mp.copy(T_OFF);
  else if (t < 6.3) { mp.lerpVectors(T_OFF, T_HOME, seg(t, 4.8, 6.3)); walk = true; face = Math.PI / 2; armL = armR = [-1.35, -0.05]; }
  else if (t < 12.4) {
    mp.copy(T_HOME); const ks = Math.sin(seg(t, 8.5, 9.5) * Math.PI); mp.x += ks * 0.72; mp.z += ks * 0.38; lean = -ks * 0.3; face = 2.5 - ks * 0.9; hop = Math.abs(Math.sin(time * 6)) * 0.04 * (1 - ks);
    if (t < 6.5) armL = armR = [-1.35, -0.05]; else { const cl = Math.abs(Math.sin(time * 9)) * 0.35; armL = armR = [-1.1, -0.45 + cl]; }
  } else { mp.lerpVectors(T_HOME, T_OFF, out); walk = true; face = -Math.PI / 2; armL = armR = [-1.3, 0]; }
  mrs.root.rotation.y = face; CH.poseMrs(mrs, { walk, time, armL, armR, lean, hop });
  // table + chair
  const tp = table.root.position, cp = chair.root.position;
  if (t < 1) { tp.set(-9, 0, 0); cp.set(-9, 0, 0); }
  else if (t < 2.8) { tp.set(mp.x, 1.42 + Math.sin(time * 10) * 0.02, mp.z); cp.set(mp.x, 2.1 + Math.sin(time * 10) * 0.02, mp.z); }
  else if (t < 3.3) { const u = smooth(seg(t, 2.8, 3.3)), h = Math.sin(u * Math.PI) * 0.7; tp.lerpVectors(new V3(T_HOME.x, 1.42, T_HOME.z), T_TABLE, u); tp.y += h; cp.lerpVectors(new V3(T_HOME.x, 2.1, T_HOME.z), T_CHAIR, u); cp.y += h * 1.4; }
  else { tp.copy(T_TABLE); cp.copy(T_CHAIR); tp.x = cp.x = -out * 4.6; }
  chair.root.rotation.y = 0;
  // turkey platter
  turkey.root.visible = t >= 4.8; CH.setTurkey(turkey, seg(t, 7, 10.6));
  if (t >= 4.8 && t < 6.3) { turkey.root.position.set(mp.x + 0.42, 0.98 + Math.abs(Math.sin(time * 10)) * 0.03, mp.z); }
  else if (t < 6.8) { const u = smooth(seg(t, 6.3, 6.8)); turkey.root.position.lerpVectors(new V3(T_HOME.x + 0.42, 0.98, T_HOME.z), new V3(0, table.top, 0.3), u); turkey.root.position.y += Math.sin(u * Math.PI) * 0.35; }
  else turkey.root.position.set(-out * 4.6, table.top, 0.3);
  if (t > 5 && t < 7.4 && Math.random() < dt * 14) puffs.emit({ x: turkey.root.position.x + rand(-0.1, 0.1), y: turkey.root.position.y + 0.3, z: turkey.root.position.z, vy: rand(0.3, 0.6), g: -0.2, life: 1, size: 0.06, size1: 0.2, color: WHITE3, alpha: 0.35 });
  // Santa's part
  const sit = seg(t, 3.3, 3.6) * (1 - seg(t, 12.3, 12.6)), eat = t >= 7 && t < 10.6, chew = eat ? Math.max(0, Math.sin(t * 9.2)) : 0;
  cut.off = lerp(HANDX, 0, smooth(seg(t, 0.3, 1.4))) * 1 + HANDX * smooth(seg(t, 12.6, 13.4)); cut.rotY = 0;
  cut.santa = p => {
    p.legL = p.legR = [1.45 * sit, 0.12 * sit]; p.hip = lerp(1, 1.42, sit); p.eyesHappy = t > 0.3 && t < 12.6; p.y = 0;
    if (t < 2.7 || (t > 6.4 && t < 7)) { p.armL = [0, 2.6 + Math.sin(time * 13) * 0.2]; p.armR = [0, 2.6 + Math.cos(time * 13) * 0.2]; p.mouth = 1; p.y = t < 2.7 ? Math.abs(Math.sin(time * 7)) * 0.1 : 0; }
    else if (t >= 7 && t < 10.9) { p.utensils = true; p.armL = [1.05 + Math.sin(t * 9.2) * 0.25, 0.25]; p.armR = [1.05 - Math.sin(t * 9.2) * 0.25, 0.25]; p.headX = -0.35 * chew; p.bend = -0.22 * chew; p.mouth = eat ? Math.abs(Math.sin(t * 9.2)) : 0; }
    else if (t >= 10.9 && t < 12.4) { p.armL = [0.9, 0.2]; p.armR = [0.75 + Math.sin(time * 12) * 0.12, -0.75]; p.mouth = t > 11 && t < 11.9 ? 1 : 0; p.bend = 0.12; }
    else { p.armL = [0.9 * sit, 0.2]; p.armR = [0.9 * sit, 0.2]; }
  };
  if (t > 13.5) endCut();
}

function updatePerfect(dt) {
  const t = pt, fo = 1 - seg(t, 23, 24);
  if (once('a', 0)) { Snd.glory(); Snd.boom(); confetti(160, 0, -2); santa.tx = 0; santa.mode = 'cheer'; star300.visible = true; star300.geometry.setDrawRange(0, 0); for (let i = 0; i < 6; i++) firework(rand(-9, 9), rand(5, 9), rand(-14, -4), true); }
  if (once('b', 1.6)) { gnomes.forEach(g => { if (g.alive && g.pin && g.pin.body) { const p = g.pin.body.translation(); puff(p.x, 0.2, p.z, 5); } }); newRack(true); }
  if (once('c', 3.4)) { startAntic('bow', standing(), 5.4); say(new V3(0, 1.3, C.HEAD_Z - 0.5), 'WE’RE NOT WORTHY!', 2.6); Snd.fanfare(); }
  if (once('c2', 6.2)) say(new V3(0, 1.3, C.HEAD_Z - 0.5), 'ALL HAIL SANTA!', 2.4);
  if (once('d', 4)) Snd.whee();
  if (once('e', 9)) { startAntic('dance', standing(), 5); Snd.jig(); Snd.glory(); say(new V3(0, 1.3, C.HEAD_Z - 0.5), 'GNOME PARTY!', 2); }
  if (once('e2', 11)) Snd.jig(); if (once('e3', 13)) Snd.jig(); if (once('f', 6)) Snd.hoho();
  if (once('g', 14.2)) cut.rk = 0;
  if (t > 14.2 && cut.rk < 10 && t > 14.2 + cut.rk * 0.38) { const S = standing().filter(g => !g.rocket); if (S.length) { const g = pick(S); g.rocket = true; g.act = null; g.rv = 1; g.rz = 0; g.rTop = rand(5, 8); if (g.pin && g.pin.body) { sim.world.removeRigidBody(g.pin.body); g.pin.body = null; g.pin.down = true; } g.m.root.quaternion.identity(); Snd.whistle(); } cut.rk++; }
  if (once('h', 19.2)) { Snd.glory(); confetti(160, 0, -2); say(santaHead(), 'HO HO HO! Merry Christmas!', 3); Snd.hoho(); }
  cut.n -= dt; if (cut.n <= 0) { cut.n = rand(0.2, 0.45); const a = Math.random() * TAU, d = rand(3, 11); firework(Math.cos(a) * d, rand(3.5, 8), -3 + Math.sin(a) * d, Math.random() < 0.45); }
  if (Math.floor(t / 1.8) !== Math.floor((t - dt) / 1.8)) { cr.rl.act = cr.rr.act = 'dance'; cr.rl.at = cr.rr.at = 0; }
  if (Math.floor(t / 3.4) !== Math.floor((t - dt) / 3.4)) { if (!cr.penguin.on) Object.assign(cr.penguin, { on: true, t: 0, dur: 2.4, dir: Math.random() < 0.5 ? 1 : -1, z: rand(-3.4, -1.2) }); if (!cr.snowman.act) { cr.snowman.act = 'head'; cr.snowman.at = 0; } confetti(40, 0, -2); }
  // disco lane + lights
  const hue = (time * 0.7) % 1, k = smooth(seg(t, 0.5, 2)) * fo;
  world.iceMat.emissive.setHSL(hue, 1, 0.5); world.iceMat.emissiveIntensity = 0.75 * k; discoA.color.setHSL((hue + 0.33) % 1, 1, 0.6); discoB.color.setHSL((hue + 0.66) % 1, 1, 0.6); discoA.intensity = discoB.intensity = 105 * k;
  world.sun.intensity = lerp(3.3, 0.9, k); world.hemi.intensity = lerp(0.9, 0.42, k); world.fill.intensity = lerp(0.55, 0.3, k);
  discoA.position.set(Math.sin(time * 1.7) * 2.2, 2.6, -1.5 + Math.cos(time * 1.3) * 2.5); discoB.position.set(Math.sin(time * 1.3 + 2) * 2.2, 2.6, -4 + Math.cos(time * 1.9) * 2.5);
  world.snowMat.color.setHSL((time * 0.5) % 1, 0.9, 0.5 + 0.5 * (1 - k));
  // 300 written in stars
  const n300 = star300.userData.n; star300.geometry.setDrawRange(0, Math.floor(n300 * seg(t, 8.5, 11.2))); star300.material.opacity = (0.8 + 0.2 * Math.sin(time * 9)) * fo; star300.material.size = 0.3 + Math.sin(time * 6) * 0.04;
  // sleigh fly-bys
  let sv = false; if (sleigh.banner) sleigh.banner.visible = true;
  const fly = (u, dir, drop) => {
    sv = true; const a = lerp(-1.25, 1.25, u) * dir, R = 12; sleigh.root.scale.setScalar(1); sleigh.root.position.set(Math.sin(a) * R, 4.6 + Math.sin(u * 7) * 0.7, -3 - Math.cos(a) * R * 0.75);
    sleigh.root.rotation.set(0, -a * 0.75 + (dir > 0 ? 0 : Math.PI), Math.sin(u * 7) * 0.08); gallop();
    const p = sleigh.root.position; if (Math.random() < 0.8) sparks.emit({ x: p.x + rand(-0.4, 0.4), y: p.y + rand(0, 0.5), z: p.z + rand(-0.4, 0.4), vy: rand(-0.6, 0), g: 0.3, life: rand(0.6, 1.2), size: rand(0.08, 0.16), size1: 0.02, color: pick([FW[1], WHITE3]) });
    if (drop && Math.random() < dt * 10) puffs.emit({ x: p.x + rand(-0.4, 0.4), y: p.y, z: p.z + rand(-0.4, 0.4), vx: rand(-0.5, 0.5), vz: rand(-0.5, 0.5), g: 5, life: 3, size: rand(0.16, 0.26), color: pick(CONF), floor: GROUND });
  };
  if (t > 3.8 && t < 9.2) fly((t - 3.8) / 5.4, 1, false); else if (t > 13 && t < 18) fly((t - 13) / 5, -1, true);
  sleigh.root.visible = sv;
  // Mrs. Claus with the trophy
  if (t > 6) {
    mrs.root.visible = trophy.root.visible = true; const inn = smooth(seg(t, 6, 8.2)), outt = smooth(seg(t, 22.6, 24)), wk = t < 8.2 || t > 22.6, hp = wk ? 0 : Math.abs(Math.sin(time * 7)) * 0.12;
    mrs.root.position.set(lerp(-5, -1.45, inn) - outt * 4, 0, 1.25); mrs.root.rotation.y = wk ? (t < 9 ? Math.PI / 2 : -Math.PI / 2) : Math.PI + Math.sin(time * 2) * 0.5;
    CH.poseMrs(mrs, { walk: wk, time, armL: [0, 2.85], armR: [0, 2.85], hop: hp, lean: wk ? 0 : Math.sin(time * 3.5) * 0.06 });
    trophy.root.position.set(mrs.root.position.x, 1.5 + hp + (wk ? Math.abs(Math.sin(time * 10)) * 0.04 : 0), 1.25); trophy.root.rotation.y = time * 1.5;
  }
  if (t > 24) endCut();
}

// ───────────────────────── input ─────────────────────────
function ptr(e) {
  const r = hudCanvas.getBoundingClientRect(); let u, v;
  if (!sideways) { u = (e.clientX - r.left) / r.width; v = (e.clientY - r.top) / r.height; }
  else { const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); u = dy / r.height + 0.5; v = -dx / r.width + 0.5; }
  return { x: u * hud.W, y: v * hud.H, u, v };
}
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function laneX(p) { ndc.set(p.u * 2 - 1, -(p.v * 2 - 1)); ray.setFromCamera(ndc, camera); const o = ray.ray.origin, d = ray.ray.direction; if (Math.abs(d.z) < 1e-4) return 0; const k = (C.SANTA_Z - o.z) / d.z; return o.x + d.x * k; }
function goFullscreen() {
  if (!TOUCH || window.self !== window.top) return;
  const d = document, el = d.documentElement, fs = d.fullscreenElement || d.webkitFullscreenElement;
  const standalone = (window.matchMedia && (window.matchMedia('(display-mode: fullscreen)').matches || window.matchMedia('(display-mode: standalone)').matches)) || navigator.standalone;
  if (fs || standalone) return;
  try { const rq = el.requestFullscreen || el.webkitRequestFullscreen; if (!rq) return; const pr = rq.call(el); const lock = () => { try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }; if (pr && pr.then) pr.then(lock).catch(() => { }); else lock(); } catch (e) { }
}
let drag = null;
function wake() { idleT = 0; gnomes.forEach(g => { if (g.act && g.act.type === 'sleep') g.act = null; }); }
function confirmStep() {
  if (phase === 'position') { phase = 'aim'; pt = 0; aimPh = (Math.random() < 0.5 ? 0 : Math.PI); Snd.click(); }
  else if (phase === 'aim') { phase = 'power'; pt = 0; powPh = 0; Snd.click(); }
  else if (phase === 'power') {
    shot.kid = shot.power < 0.2; phase = 'throw'; pt = 0; santa.mode = shot.kid ? 'kid' : 'throw'; santa.t = 0; santa.released = false;
    if (shot.kid) { Snd.boing(); banner = { text: 'KIDDIE ROLL!', t: 0, color: '#9be7ff', small: true }; } else Snd.whoosh();
  }
}
function doAction(a) {
  if (a === 'mute') { Snd.toggle(); return; }
  Snd.click();
  if (a === 'easy' || a === 'hard') startGame(a); else if (a === 'again') startGame(diff); else if (a === 'menu') toTitle();
}
hudCanvas.addEventListener('pointerdown', e => {
  e.preventDefault(); hudCanvas.focus(); if (phase === 'loading') return; Snd.init(); goFullscreen(); wake(); const p = ptr(e);
  const a = hud.hit(p.x, p.y); if (a) { doAction(a); return; }
  if (phase === 'position') {
    if (e.pointerType === 'mouse') { santa.tx = clamp(laneX(p), -C.SANTA_MAX, C.SANTA_MAX); confirmStep(); }
    else drag = { x: p.x, sx: santa.tx, t: time, moved: false };
  } else if (phase === 'turkey') { if (pt > 3 && pt < 12.4) pt = 12.4; }
  else confirmStep();
});
hudCanvas.addEventListener('pointermove', e => {
  if (phase !== 'position') return; const p = ptr(e);
  if (e.pointerType === 'mouse') { santa.tx = clamp(laneX(p), -C.SANTA_MAX, C.SANTA_MAX); idleT = 0; }
  else if (drag) { if (Math.abs(p.x - drag.x) > 8) drag.moved = true; santa.tx = clamp(drag.sx + (p.x - drag.x) * 0.0075, -C.SANTA_MAX, C.SANTA_MAX); wake(); }
});
function endDrag() { if (drag) { if (!drag.moved && time - drag.t < 0.4 && phase === 'position') confirmStep(); drag = null; } }
hudCanvas.addEventListener('pointerup', endDrag); hudCanvas.addEventListener('pointercancel', () => { drag = null; });
window.addEventListener('keydown', e => {
  const k = e.key;
  if (k === ' ' || k === 'Enter' || k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') e.preventDefault();
  if (e.repeat) { keys[k] = true; return; }
  if (phase === 'loading') return;
  Snd.init(); wake(); keys[k] = true;
  if (k === 'm' || k === 'M') { Snd.toggle(); return; }
  if (k === 'Escape') { if (phase !== 'title') toTitle(); return; }
  if (phase === 'title') { if (k === 'e' || k === 'E' || k === '1') { Snd.click(); startGame('easy'); } else if (k === 'h' || k === 'H' || k === '2') { Snd.click(); startGame('hard'); } return; }
  if (phase === 'gameover') { if (k === ' ' || k === 'Enter') { Snd.click(); startGame(diff); } return; }
  if (phase === 'turkey') { if ((k === ' ' || k === 'Enter') && pt > 3 && pt < 12.4) pt = 12.4; return; }
  if (k === ' ' || k === 'Enter') confirmStep();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });

// ───────────────────────── camera ─────────────────────────
function updateCamera(dt) {
  const T = camT; let rate = 3.2;
  if (phase === 'debug') { camera.position.copy(cam.pos); camera.lookAt(cam.look); camera.fov = cam.fov; camera.updateProjectionMatrix(); return; }
  const main = () => { T.pos.set(santa.x * 0.22, 3.8, 8.2); T.look.set(santa.x * 0.08, -0.82, -11.8); T.fov = 32; };
  main();
  if (phase === 'title') { const a = Math.sin(time * 0.17) * 0.95; T.pos.set(Math.sin(a) * 9.5, 2.5 + Math.sin(time * 0.23) * 0.5, -2.6 + Math.cos(a) * 9.8); T.look.set(0, 0.9, -3.4); T.fov = 40; rate = 1.4; }
  else if (phase === 'roll' || phase === 'settle') {
    const b = sim.ball; let bz = C.DECK_END, bx = 0; if (b && !b.done) { const p = b.body.translation(); bz = p.z; bx = p.x; }
    const k = smooth(clamp(-bz / 2.6, 0, 1));
    T.pos.set(bx * 0.3, lerp(3.8, 1.55, k), Math.max(C.HEAD_Z + 3.0, bz + lerp(8.2, 3.1, k))); T.look.set(bx * 0.15, lerp(-0.82, 0.3, k), lerp(-11.8, C.HEAD_Z - 0.8, k)); T.fov = lerp(32, 42, k); rate = 5;
    if (phase === 'settle') { T.pos.set(0.5, 1.9, C.HEAD_Z + 3.5); T.look.set(0, 0.3, C.HEAD_Z - 0.8); T.fov = 42; rate = 2; }
  }
  else if (phase === 'react' && pt < 1.35) { T.pos.set(0, 2.3, 0.1); T.look.set(0, 0.55, C.HEAD_Z + 0.2); T.fov = 46; rate = 3; }
  else if (phase === 'turkey') { const k = 1 - smooth(seg(pt, 12.5, 13.5)); if (k > 0) { T.pos.set(lerp(T.pos.x, 1.35, k), lerp(T.pos.y, 1.5, k), lerp(T.pos.z, -3.5, k)); T.look.set(lerp(T.look.x, -0.35, k), lerp(T.look.y, 0.85, k), lerp(T.look.z, 0.7, k)); T.fov = lerp(32, 40, k); } rate = 2.6; }
  else if (phase === 'perfect') { const a = pt * 0.27, k = 1 - smooth(seg(pt, 23, 24)); if (k > 0) { T.pos.set(Math.sin(a) * 6.6, 2.3 + Math.sin(pt * 0.4) * 0.5, -2.6 + Math.cos(a) * 6.6); T.look.set(0, 1.25, -2.6); T.fov = 52; } rate = 1.8; }
  else if (phase === 'gameover') { const a = Math.sin(time * 0.2) * 0.5; T.pos.set(Math.sin(a) * 9, 3.2, -1 + Math.cos(a) * 9); T.look.set(0, 0.6, -3); T.fov = 36; rate = 1.2; }
  const k = 1 - Math.exp(-rate * dt); cam.pos.lerp(T.pos, k); cam.look.lerp(T.look, k); cam.fov += (T.fov - cam.fov) * k;
  camera.position.copy(cam.pos); camera.lookAt(cam.look);
  const f = camera.aspect < 1.5 ? 2 * Math.atan(Math.tan(cam.fov * Math.PI / 360) * 1.5 / camera.aspect) * 180 / Math.PI : cam.fov;
  if (Math.abs(camera.fov - f) > 0.01) { camera.fov = f; camera.updateProjectionMatrix(); }
  const sc = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360)); sparks.mat.uniforms.uScale.value = sc; puffs.mat.uniforms.uScale.value = sc;
}
const _dm = new THREE.Object3D();
function updateArrow() {
  const show = phase === 'aim' || phase === 'power' || phase === 'throw';
  arrow.root.visible = arrow.ring.visible = show; arrow.dots.visible = show && diff === 'easy';
  if (!show) return;
  const D = 0.45 - C.HEAD_Z, tx = clamp(santa.x + shot.aim * C.AIM_MAX * D, -1.25, 1.25), act = phase === 'aim';
  arrow.root.position.set(tx, 0.92 + (act ? Math.sin(time * 9) * 0.05 : 0), C.HEAD_Z - 0.55); arrow.root.rotation.y = time * 2;
  arrow.ring.position.set(tx, 0.012, C.HEAD_Z + 0.42); arrow.mats[0].color.setHex(act ? 0xffd23f : 0xff9f1c);
  if (arrow.dots.visible) { for (let i = 0; i < 22; i++) { const u = (i + 0.5) / 22; _dm.position.set(lerp(santa.x, tx, u), 0.008, lerp(0.1, C.HEAD_Z + 0.6, u)); _dm.rotation.set(-Math.PI / 2, 0, 0); _dm.updateMatrix(); arrow.dots.setMatrixAt(i, _dm.matrix); } arrow.dots.instanceMatrix.needsUpdate = true; }
}

// ───────────────────────── update ─────────────────────────
function update(dt) {
  time += dt; pt += dt;
  for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].t += dt; if (floaters[i].t > floaters[i].dur) floaters.splice(i, 1); }
  for (let i = bubbles.length - 1; i >= 0; i--) { bubbles[i].t += dt; if (bubbles[i].t > bubbles[i].dur) bubbles.splice(i, 1); }
  for (let i = shots.length - 1; i >= 0; i--) { const s = shots[i]; s.t += dt; const u = Math.min(1, s.t / s.dur); s.m.position.lerpVectors(s.from, s.to, u); s.m.position.y += Math.sin(u * Math.PI) * s.arc; if (u >= 1) { s.m.visible = false; if (s.hit) s.hit(); shots.splice(i, 1); } }
  if (banner) { banner.t += dt; if (banner.t > 2.2) banner = null; }
  if (santa.splat > 0) santa.splat -= dt;
  ambientT -= dt; if (ambientT <= 0) { ambientEvent(); ambientT = rand(3.5, 7.5); }
  if (santa.mode === 'throw' || santa.mode === 'kid') {
    santa.t += dt / (santa.mode === 'kid' ? 1.7 : 0.95);
    if (!santa.released && santa.t >= (santa.mode === 'kid' ? 0.7 : 0.6)) { santa.released = true; poseSantaNow(); launch(); }
    if (santa.t >= 1) { santa.mode = 'watch'; santa.t = 0; }
  } else santa.t += dt;
  const acting = gnomes.some(g => g.alive && g.act);
  switch (phase) {
    case 'title': anticT -= dt; if (anticT <= 0 && !acting) { randomAntic(); anticT = rand(1.5, 3.5); } break;
    case 'position': {
      const mv = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
      if (mv) { santa.tx = clamp(santa.tx + mv * 1.0 * dt, -C.SANTA_MAX, C.SANTA_MAX); idleT = 0; }
      idleT += dt; if (idleT > 14 && !acting) { const S = standing(); if (S.length) { startAntic('sleep', S, 600); Snd.snore(); } }
    } // fallthrough
    case 'aim': case 'power':
      if (phase === 'aim') { aimPh += dt * SPEED[diff].aim; shot.aim = Math.sin(aimPh); }
      if (phase === 'power') { powPh += dt * SPEED[diff].pow; shot.power = 0.5 - 0.5 * Math.cos(powPh); }
      anticT -= dt; if (anticT <= 0 && !acting) { randomAntic(); anticT = rand(3.5, 7); }
      break;
    case 'roll': if (sim.ball && sim.ball.done) { phase = 'settle'; pt = 0; settleT = 0; Snd.rollStop(); ballMesh.visible = false; } break;
    case 'settle': settleT = sim.settled() ? settleT + dt : 0; if ((pt > 0.7 && settleT > 0.45) || pt > 4.5) resolveRoll(); break;
    case 'react': if (pt > 2.5) { if (pendingCut) startCut(pendingCut); else afterReact(); } break;
    case 'turkey': updateTurkey(dt); break;
    case 'perfect': updatePerfect(dt); break;
    case 'gameover': if (totalScore() === 300 && Math.random() < dt * 2.2) { const a = Math.random() * TAU, d = rand(7, 16); firework(Math.cos(a) * d, rand(5, 11), -3 + Math.sin(a) * d, true); } break;
    case 'sweep':
      if (!sweepDone) gnomes.forEach(g => { if (g.alive && g.pin && (g.pin.down || sweepFull)) g.shrink = Math.max(0, 1 - pt / 0.35); });
      if (pt > 0.4 && !sweepDone) { sweepDone = true; if (sweepFull) newRack(true); else { sim.tidy(); gnomes.forEach(g => { if (g.alive && g.pin && g.pin.gone) { g.alive = false; g.m.root.visible = false; g.m.stars.visible = false; } }); } }
      if (pt > (sweepFull ? 1.7 : 0.7)) beginRoll();
      break;
  }
  const gw = (phase === 'position' || phase === 'aim' || phase === 'power' || (phase === 'react' && pt > 1.5)) && gnomes.some(g => g.alive && g.act && g.act.t >= 0 && g.dropY === 0);
  gcamK = clamp(gcamK + (gw ? dt * 5 : -dt * 4), 0, 1);
  santa.x = lerp(santa.x, santa.tx, Math.min(1, dt * 14));
  if (phase !== 'loading') sim.step(dt);
  if (sim.ball && ballMesh.parent === scene && !sim.ball.done) { const p = sim.ball.body.translation(), q = sim.ball.body.rotation(); ballMesh.position.set(p.x, p.y, p.z); ballMesh.quaternion.set(q.x, q.y, q.z, q.w); }
  syncGnomes(dt); updateCritters(dt); poseSantaNow(); updateArrow();
  world.update(dt, time, phase === 'perfect');
  if (Math.random() < dt * 3) puffs.emit({ x: world.chimney.x, y: world.chimney.y, z: world.chimney.z, vx: 0.25, vy: rand(0.5, 0.8), g: -0.05, life: 3.2, size: 0.25, size1: 0.9, color: [0.87, 0.9, 1], alpha: 0.28 });
  sparks.update(dt); puffs.update(dt);
  updateCamera(dt);
}
function render() {
  renderer.render(scene, camera);
  const gr = hud.gcamRect(smooth(gcamK));
  if (gcamK > 0.02) { // picture-in-picture close-up of whatever the gnomes are up to
    const sx = stageW / hud.W, sy = stageH / hud.H, vx = gr.x * sx, vw = gr.w * sx, vh = gr.h * sy, vy = stageH - (gr.y + gr.h) * sy;
    gcam.aspect = gr.w / gr.h; gcam.position.set(0.55 + Math.sin(time * 0.6) * 0.15, 0.95, C.HEAD_Z + 2.2); gcam.lookAt(0, 0.4, C.HEAD_Z - 0.6); gcam.updateProjectionMatrix();
    const au = renderer.shadowMap.autoUpdate, av = arrow.root.visible; renderer.shadowMap.autoUpdate = false; arrow.root.visible = false;
    renderer.setScissorTest(true); renderer.setScissor(vx, vy, vw, vh); renderer.setViewport(vx, vy, vw, vh); renderer.render(scene, gcam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, stageW, stageH); renderer.shadowMap.autoUpdate = au; arrow.root.visible = av;
  }
  for (const b of bubbles) {
    if (b.g && gcamK > 0.6) { _p.copy(b.pos).project(gcam); b.x = gr.x + (_p.x * 0.5 + 0.5) * gr.w; b.y = gr.y + (-_p.y * 0.5 + 0.5) * gr.h; }
    else { const s = toHud(b.pos); b.x = s.ok ? s.x : null; b.y = s.y; }
  }
  for (const f of floaters) { const s = toHud(f.pos); f.x = s.ok ? s.x : null; f.y = s.y; }
  hud.draw({ phase, pt, time, diff, frames, fi, scores: phase === 'title' || phase === 'loading' ? [] : calcScores(frames), marks, total: frames.length ? totalScore() : 0, best, newBest, shot, banner, bubbles, floaters, muted: Snd.muted, club300, gcam: smooth(gcamK) });
}

// ───────────────────────── boot ─────────────────────────
async function boot() {
  resize(); hud.draw({ phase: 'loading', time: 0, floaters: [], bubbles: [] });
  await initPhysics();
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !lowQ, powerPreference: 'high-performance' });
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.95;
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(32, 1.5, 0.1, 500); scene.add(camera);
  world = buildWorld(scene, renderer, lowQ);
  sim = new Sim();
  sim.onHit = (p, dv) => { Snd.pin(dv * 55); if (p.body) { const t = p.body.translation(); puff(t.x, 0.12, t.z, 3); } };
  sim.onGutter = () => Snd.gutter();
  sparks = new Particles(lowQ ? 1500 : 3500, true); puffs = new Particles(lowQ ? 900 : 1800, false); scene.add(sparks.points, puffs.points);
  pinSpots().forEach((s, i) => { const m = CH.buildGnome(HATS[i], COATS[(i * 3 + 1) % 10], (i % 2 ? 1 : -1) * rand(0.03, 0.08)); scene.add(m.root, m.stars); gnomes.push({ m, pin: null, idx: i, seed: Math.random() * 10, act: null, alive: true, shrink: 1, dropY: 0, dropV: 0, landed: true, squash: 0, rocket: false, rz: 0, rv: 0 }); });
  santaM = CH.buildSanta(); scene.add(santaM.root); ballMesh = CH.buildBall();
  cr.rl = { m: CH.buildReindeer(false, 0xe63946), act: null, at: 0, seed: 1, flip: false }; cr.rl.m.root.position.set(-2.35, GROUND, C.HEAD_Z + 1.9); cr.rl.m.root.rotation.y = -0.3; scene.add(cr.rl.m.root);
  cr.rr = { m: CH.buildReindeer(true, 0x2a9d4a), act: null, at: 0, seed: 4, flip: true }; cr.rr.m.root.position.set(2.35, GROUND, C.HEAD_Z + 2.2); cr.rr.m.root.rotation.y = Math.PI + 0.3; scene.add(cr.rr.m.root);
  cr.snowman = { m: CH.buildSnowman(), act: null, at: 0 }; cr.snowman.m.root.position.set(2.45, GROUND, C.HEAD_Z - 0.9); cr.snowman.m.root.rotation.y = -0.45; scene.add(cr.snowman.m.root);
  cr.bunny = { m: CH.buildBunny(), act: null, at: 0 }; cr.bunny.m.root.position.set(-2.5, GROUND, 0.4); cr.bunny.m.root.rotation.y = 0.5; scene.add(cr.bunny.m.root);
  cr.penguin = { m: CH.buildPenguin(), on: false, t: 0 }; scene.add(cr.penguin.m.root);
  cr.bird = { m: CH.buildBird(), on: false, t: 0 }; scene.add(cr.bird.m.root);
  cr.flyer = { on: false, t: 0 };
  mrs = CH.buildMrsClaus(); table = CH.buildTable(); chair = CH.buildChair(); turkey = CH.buildTurkey(); trophy = CH.buildTrophy(); sleigh = CH.buildSleigh(true);
  scene.add(mrs.root, table.root, chair.root, turkey.root, trophy.root, sleigh.root);
  arrow = CH.buildAimArrow(); scene.add(arrow.root, arrow.ring, arrow.dots);
  shots.pool = []; for (let i = 0; i < 4; i++) { const m = sph(0.07, M(0xffffff)); m.visible = false; scene.add(m); shots.pool.push(m); }
  discoA = new THREE.PointLight(0xff00ff, 0, 12, 1.2); discoB = new THREE.PointLight(0x00ffff, 0, 12, 1.2); scene.add(discoA, discoB);
  // "300" in stars, pinned to the top of the view
  { const cv = document.createElement('canvas'); cv.width = 420; cv.height = 150; const g = cv.getContext('2d'); g.font = 'bold 150px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText('300', 210, 80);
    const d = g.getImageData(0, 0, 420, 150).data, pts = []; for (let y = 3; y < 150; y += 5) for (let x = 3; x < 420; x += 5) if (d[(y * 420 + x) * 4 + 3] > 120) pts.push([(x - 210) * 0.016, (80 - y) * 0.016, 0]);
    shuffle(pts); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.flat()), 3));
    star300 = new THREE.Points(geo, new THREE.PointsMaterial({ map: dotTex(), color: 0xffe27a, size: 0.2, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false })); star300.userData.n = pts.length; star300.position.set(0, 2.1, -12); star300.frustumCulled = false; star300.renderOrder = 5; camera.add(star300); }
  hideCutProps(); resize(); toTitle();
  cam.pos.set(6, 3, 7); cam.look.set(0, 0.9, -3.4); cam.fov = 40;
  renderer.compile(scene, camera);
  // If the device can't keep up, quietly step the detail down (sharpness first, then shadows).
  let last = 0, slowAcc = 0, slowN = 0, qLevel = 0;
  const loop = ts => {
    const raw = (ts - last) / 1000 || 0, dt = Math.min(0.05, raw); last = ts;
    if (!paused && !DEV && raw < 0.5 && phase !== 'loading') {
      slowAcc += raw; slowN++;
      if (slowN >= 150) {
        if (slowAcc / slowN > 1 / 34 && qLevel < 2) { qLevel++; if (qLevel === 1) { lowQ = true; renderer.setPixelRatio(1); hud.resize(stageW, stageH, 1); } else { world.sun.castShadow = false; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true; } }
        slowAcc = 0; slowN = 0;
      }
    }
    if (!paused) update(dt); render(); requestAnimationFrame(loop);
  }; requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => { }); });
  window.__gnomeBowling = {
    state: () => ({ phase, frame: fi, frames, score: frames.length ? totalScore() : 0, standing: standing().length, aim: shot.aim, power: shot.power, santa: santa.x, diff, pt }),
    antic: (type, n) => { const S = standing(); if (type === 'sign') S.forEach(g => CH.gnomeSign(g.m, pick(SIGNS))); startAntic(type, S.slice(0, n || S.length), 3.2); },
    _t: n => { if (n === 'perfect') { frames = []; for (let i = 0; i < 9; i++) frames.push([10]); frames.push([10, 10, 10]); fi = 9; gameOverNext = true; } else { gameOverNext = false; sweepFull = true; } startCut(n); },
    _shoot: DEV ? (x, aim, power) => { santa.x = santa.tx = x; shot.aim = aim; shot.power = power; phase = 'power'; confirmStep(); } : undefined,
    _ball: DEV ? () => sim.ball ? Object.assign({ done: sim.ball.done, gutter: sim.ball.gutter, t: sim.ball.t }, sim.ball.body.translation()) : null : undefined,
    _pause: DEV ? v => { paused = v; } : undefined,
    _fast: DEV ? n => { for (let i = 0; i < n; i++) update(1 / 60); } : undefined,
    _k: DEV ? () => { sim.pins.forEach(p => { if (p.body) p.body.applyImpulse({ x: rand(-1, 1), y: 1.5, z: -4 }, true); }); } : undefined,
    _cam: DEV ? (p, l, f) => { phase = 'debug'; cam.pos.set(...p); cam.look.set(...l); cam.fov = f; camT.pos.copy(cam.pos); camT.look.copy(cam.look); camT.fov = f; } : undefined,
    _ev: DEV ? e => { const o = { penguin: () => Object.assign(cr.penguin, { on: true, t: 0, dur: 2.8, dir: 1, z: -2 }), bunny: () => { cr.bunny.act = 'pop'; cr.bunny.at = 0; cr.bunny.threw = false; }, bird: () => { cr.bird.on = true; cr.bird.t = 0; }, head: () => { cr.snowman.act = 'head'; cr.snowman.at = 0; } }; o[e] && o[e](); } : undefined
  };
}
boot();
