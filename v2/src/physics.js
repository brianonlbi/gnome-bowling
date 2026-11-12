// Gnome Bowling 2.0 — physics world (Rapier). No rendering in here, so it also runs in Node for tuning.
import RAPIER from '@dimforge/rapier3d-compat';

// World layout. Units are metres-ish; +x right, +y up, -z down the lane (foul line at z = 0).
const HEAD_Z = -11;
export const C = {
  LANE_HALF: 0.8, GUT_W: 0.3, GUT_D: 0.09, RAIL_W: 0.2, RAIL_H: 0.12,
  APPROACH: 3.2, HEAD_Z, PIN_DX: 0.44, ROW_DZ: 0.381, DECK_END: HEAD_Z - 1.6, PIT_END: HEAD_Z - 2.5, KICK_Z: HEAD_Z + 0.55, KICK_H: 0.75,
  BALL_R: 0.15, PIN_H: 0.62, SANTA_Z: 0.95, SANTA_MAX: 0.62, AIM_MAX: 0.082,
  SPEED_MIN: 4.2, SPEED_MAX: 9.4, KID_MIN: 3.0, KID_MAX: 3.6
};
// Tuned with `node tune.mjs` so a good pocket hit strikes but a sloppy one does not.
export const TUNE = { ballMass: 8, pinMass: 2.0, pinRest: 0.42, pinFric: 0.4, laneFric: 0.3, baseR: 0.083, angDamp: 0.25, linDamp: 0.05, downCos: 0.8 };

export function initPhysics() { return RAPIER.init(); }
export function pinSpots() {
  const a = [];
  for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) a.push({ x: (j - r / 2) * C.PIN_DX, z: C.HEAD_Z - r * C.ROW_DZ });
  return a;
}

export class Sim {
  constructor() {
    const w = this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    w.timestep = 1 / 120; w.numSolverIterations = 8;
    this.acc = 0; this.pins = []; this.ball = null; this.onHit = null; this.time = 0;
    const box = (x0, x1, yTop, depth, z0, z1, fr, re) => {
      const d = RAPIER.ColliderDesc.cuboid(Math.abs(x1 - x0) / 2, depth / 2, Math.abs(z1 - z0) / 2)
        .setTranslation((x0 + x1) / 2, yTop - depth / 2, (z0 + z1) / 2).setFriction(fr == null ? 0.4 : fr).setRestitution(re == null ? 0.2 : re);
      return w.createCollider(d);
    };
    const L = C.LANE_HALF, G = L + C.GUT_W, R = G + C.RAIL_W;
    box(-L, L, 0, 0.6, C.APPROACH, C.DECK_END, TUNE.laneFric, 0.1);              // lane + approach
    box(-R, -L, 0, 0.6, C.APPROACH, 0.3, 0.5); box(L, R, 0, 0.6, C.APPROACH, 0.3, 0.5); // approach shoulders
    box(-G, -L, -C.GUT_D, 0.5, 0.3, C.DECK_END, 0.15, 0); box(L, G, -C.GUT_D, 0.5, 0.3, C.DECK_END, 0.15, 0); // gutters
    box(-R, -G, C.RAIL_H, 0.7, 0.3, C.KICK_Z, 0.3, 0.3); box(G, R, C.RAIL_H, 0.7, 0.3, C.KICK_Z, 0.3, 0.3);  // rails
    box(-R, -G, C.KICK_H, 1.4, C.KICK_Z, C.PIT_END, 0.4, 0.35); box(G, R, C.KICK_H, 1.4, C.KICK_Z, C.PIT_END, 0.4, 0.35); // kickbacks
    box(-G, G, -0.5, 0.4, C.DECK_END, C.PIT_END, 0.8, 0);                         // pit floor
    box(-R, R, 1.3, 2.2, C.PIT_END, C.PIT_END - 0.3, 0.6, 0.05);                  // back cushion
  }
  clearPins() { for (const p of this.pins) if (p.body) this.world.removeRigidBody(p.body); this.pins = []; }
  rack() {
    this.clearPins();
    pinSpots().forEach((s, i) => this.pins.push(this._pin(i, s.x, s.z)));
    return this.pins;
  }
  _pin(i, x, z) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, 0.002, z)
      .setAngularDamping(TUNE.angDamp).setLinearDamping(TUNE.linDamp).setCanSleep(true));
    const m = TUNE.pinMass, mk = d => this.world.createCollider(d.setRestitution(TUNE.pinRest).setFriction(TUNE.pinFric), body);
    mk(RAPIER.ColliderDesc.cylinder(0.045, TUNE.baseR).setTranslation(0, 0.045, 0).setMass(m * 0.16));
    mk(RAPIER.ColliderDesc.ball(0.14).setTranslation(0, 0.2, 0).setMass(m * 0.75));
    mk(RAPIER.ColliderDesc.cone(0.14, 0.1).setTranslation(0, 0.48, 0).setMass(m * 0.09));
    body.sleep();
    return { idx: i, body, hx: x, hz: z, down: false, gone: false, prevSpeed: 0 };
  }
  // Remove fallen pins; stand the survivors back up exactly where they ended.
  tidy() {
    for (const p of this.pins) {
      if (!p.body) continue;
      if (p.down) { this.world.removeRigidBody(p.body); p.body = null; p.gone = true; continue; }
      const t = p.body.translation();
      p.body.setTranslation({ x: t.x, y: 0.002, z: t.z }, false); p.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, false);
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, false); p.body.setAngvel({ x: 0, y: 0, z: 0 }, false); p.body.sleep();
    }
    this.pins = this.pins.filter(p => p.body);
  }
  removeBall() { if (this.ball) { this.world.removeRigidBody(this.ball.body); this.ball = null; } }
  launch(x, aim, power, kid, jitter, start) {
    this.removeBall();
    const j = jitter ? 1 : 0;
    const sp = (kid ? C.KID_MIN + power / 0.2 * (C.KID_MAX - C.KID_MIN) : C.SPEED_MIN + (power - 0.2) / 0.8 * (C.SPEED_MAX - C.SPEED_MIN)) * (1 + j * (Math.random() * 0.06 - 0.03));
    const m = (aim + j * (Math.random() * 0.06 - 0.03)) * C.AIM_MAX, n = Math.hypot(m, 1), vx = sp * m / n, vz = -sp / n;
    const y0 = Math.max(C.BALL_R + 0.02, start ? start.y : 0), z0 = start ? start.z : -0.25;
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y0, z0)
      .setLinvel(vx, -0.4, vz).setAngvel({ x: vz / C.BALL_R, y: 0, z: -vx / C.BALL_R }).setCcdEnabled(true).setCanSleep(false).setAngularDamping(0.05));
    this.world.createCollider(RAPIER.ColliderDesc.ball(C.BALL_R).setMass(TUNE.ballMass).setRestitution(0.25).setFriction(0.06)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min), body);
    this.ball = { body, kid, t: 0, gutter: false, done: false, slowT: 0, wob: Math.random() * 6.28, speed: sp };
    return this.ball;
  }
  step(dt) {
    this.acc += Math.min(dt, 0.05); let n = 0;
    while (this.acc >= 1 / 120 && n < 8) { this._tick(1 / 120); this.acc -= 1 / 120; n++; }
  }
  _tick(h) {
    const b = this.ball; this.time += h;
    if (b && !b.done) {
      b.t += h; const t = b.body.translation(), v = b.body.linvel();
      if (b.kid && !b.gutter && t.z > C.HEAD_Z + 0.5) b.body.applyImpulse({ x: Math.sin(b.t * 2.3 + b.wob) * 0.016, y: 0, z: 0 }, true);
      if (!b.gutter && t.y < C.BALL_R - 0.045 && t.z > C.DECK_END) { b.gutter = true; if (this.onGutter) this.onGutter(); }
      const sp = Math.hypot(v.x, v.z);
      if (sp < 1.2 && t.z > C.DECK_END) b.body.applyImpulse({ x: 0, y: 0, z: -0.12 }, true);  // never strand a slow ball
      b.slowT = sp < 0.25 ? b.slowT + h : 0;
      if (t.z < C.DECK_END - 0.25 || t.y < -0.6 || b.slowT > 1.2 || b.t > 14 || Math.abs(t.x) > 3 || t.z > 4) b.done = true;
    }
    this.world.step();
    for (const p of this.pins) {
      if (!p.body) continue;
      const v = p.body.linvel(), sp = Math.hypot(v.x, v.y, v.z);
      if (sp - p.prevSpeed > 0.9 && this.onHit) this.onHit(p, sp - p.prevSpeed);
      p.prevSpeed = sp;
    }
  }
  // Is everything on the deck at rest?
  settled() {
    for (const p of this.pins) {
      if (!p.body || p.body.isSleeping()) continue;
      const v = p.body.linvel(), w = p.body.angvel();
      if (Math.hypot(v.x, v.y, v.z) > 0.08 || Math.hypot(w.x, w.y, w.z) > 0.5) return false;
    }
    return true;
  }
  // Mark toppled / ejected pins. Returns how many are down in total.
  judge() {
    let n = 0;
    for (const p of this.pins) {
      if (p.body) {
        const t = p.body.translation(), q = p.body.rotation();
        const upY = 1 - 2 * (q.x * q.x + q.z * q.z);
        if (upY < TUNE.downCos || t.y < -0.05 || t.z < C.DECK_END || Math.abs(t.x) > C.LANE_HALF + 0.02 || t.z > C.HEAD_Z + 1.2) p.down = true;
      }
      if (p.down) n++;
    }
    return n;
  }
  isTipped(p) { if (!p.body) return true; const q = p.body.rotation(); return 1 - 2 * (q.x * q.x + q.z * q.z) < TUNE.downCos || p.body.translation().y < -0.05; }
}
