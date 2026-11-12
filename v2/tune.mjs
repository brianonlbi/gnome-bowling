// node tune.mjs — quick strike-rate survey for the pin physics
import { initPhysics, Sim, C, TUNE } from './src/physics.js';
await initPhysics();
function shot(x, aim, power) {
  const s = new Sim(); s.rack(); s.launch(x, aim, power, power < 0.2, false);
  let t = 0; while (t < 14) { s._tick(1 / 120); t += 1 / 120; if (s.ball.done && s.ball.t > 1 && s.settled() ) break; if (s.ball.done) { if (!s._d) s._d = t; if (t - s._d > 4) break; } }
  const n = s.judge(); s.world.free(); return n;
}
const args = Object.fromEntries(process.argv.slice(2).map(a => a.split('=')).map(([k, v]) => [k, +v])); Object.assign(TUNE, args);
// standing stability
{ const s = new Sim(); s.rack(); for (let i = 0; i < 600; i++) s._tick(1 / 120); console.log('idle rack down:', s.judge()); }
for (const pw of [1, 0.6, 0.3, 0.1]) { let row = '', str = 0, sum = 0, n = 0;
  for (let x = -0.6; x <= 0.601; x += 0.05) { const k = shot(x, 0, pw); row += k === 10 ? 'X' : k; if (k === 10) str++; sum += k; n++; }
  console.log('power', pw, row, 'strikes', str + '/' + n, 'mean', (sum / n).toFixed(1)); }
{ let row = ''; for (let a = -1; a <= 1.001; a += 0.08) { const k = shot(0, a, 0.9); row += k === 10 ? 'X' : k; } console.log('aim sweep x=0  ', row); }
{ let str = 0, sum = 0, N = 150; for (let i = 0; i < N; i++) { const k = shot((Math.random() * 2 - 1) * 0.2, (Math.random() * 2 - 1) * 0.3, 0.6 + Math.random() * 0.4); if (k === 10) str++; sum += k; } console.log('good player:', (str / N * 100).toFixed(0) + '% strikes, mean', (sum / N).toFixed(1)); }
