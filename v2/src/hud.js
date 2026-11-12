// Gnome Bowling 2.0 — the flat overlay: scoreboard, power bar, banners, speech bubbles, menus.
// Drawn on a 2D canvas that sits on top of the 3D view. Logical height is always 640; width follows the window.
const TAU = Math.PI * 2;
const FONT = '"Trebuchet MS","Segoe UI",Verdana,sans-serif', HEAVY = '"Arial Black",Impact,"Trebuchet MS",sans-serif';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export function createHud(canvas) {
  const c = canvas.getContext('2d');
  let W = 960, scale = 1; const H = 640; let buttons = [];
  function rr(x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function poly(pts, fill) { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (fill) { c.fillStyle = fill; c.fill(); } }
  function line(x1, y1, x2, y2, col, w) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
  function txt(s, x, y, size, fill, o) {
    o = o || {}; c.font = (o.weight || 'bold') + ' ' + size + 'px ' + (o.font || FONT); c.textAlign = o.align || 'center'; c.textBaseline = o.base || 'middle';
    if (o.stroke) { c.lineWidth = o.sw || 4; c.strokeStyle = o.stroke; c.lineJoin = 'round'; c.strokeText(s, x, y); }
    c.fillStyle = fill; c.fillText(s, x, y);
  }
  function addBtn(x, y, w, h, action) { buttons.push({ x, y, w, h, action }); }
  function button(x, y, w, h, label, col, action, size) {
    c.fillStyle = 'rgba(0,0,0,.35)'; rr(x + 2, y + 4, w, h, 12); c.fill();
    c.fillStyle = col; rr(x, y, w, h, 12); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    c.fillStyle = 'rgba(255,255,255,.2)'; rr(x + 4, y + 4, w - 8, h * 0.4, 8); c.fill();
    txt(label, x + w / 2, y + h / 2 + 1, size || 24, '#fff', { font: HEAVY, stroke: 'rgba(0,0,0,.45)', sw: 4 }); addBtn(x, y, w, h, action);
  }
  function scoreboard(S) {
    const cw = 58, x0 = W / 2 - 302, y0 = 6;
    c.fillStyle = 'rgba(0,0,0,.35)'; rr(x0 - 10, y0 + 3, cw * 9 + 102, 62, 8); c.fill();
    c.fillStyle = '#8a5530'; rr(x0 - 10, y0, cw * 9 + 102, 60, 8); c.fill(); c.strokeStyle = '#4c2a12'; c.lineWidth = 3; c.stroke();
    for (let i = 0; i < 10; i++) {
      const w = i < 9 ? cw : 82, x = x0 + i * cw, cur = (i === S.fi && S.phase !== 'gameover');
      c.fillStyle = cur ? '#fff7d6' : '#f3e3c3'; rr(x + 2, y0 + 5, w - 4, 50, 4); c.fill(); if (cur) { c.strokeStyle = '#e63946'; c.lineWidth = 2.5; c.stroke(); }
      txt('' + (i + 1), x + 9, y0 + 13, 9, '#9a7b55');
      const m = S.marks(i), nb = i < 9 ? 2 : 3, bw = 17;
      for (let k = 0; k < nb; k++) {
        const bx = x + w - 4 - (nb - k) * bw; c.strokeStyle = '#b89468'; c.lineWidth = 1; c.strokeRect(bx, y0 + 7, bw - 2, 16);
        if (m[k]) txt(m[k], bx + (bw - 2) / 2, y0 + 16, 13, m[k] === 'X' || m[k] === '/' ? '#d62828' : '#3a2a1a');
      }
      if (S.scores[i] != null) txt('' + S.scores[i], x + w / 2, y0 + 40, 19, '#3a2a1a', { font: HEAVY });
    }
  }
  function powerBar(S) {
    const x = W - 52, y = 236, w = 30, h = 310, act = S.phase === 'power', show = act || S.phase === 'throw' || S.phase === 'roll';
    c.save(); c.globalAlpha = act ? 1 : (show ? 0.85 : 0.5);
    c.fillStyle = 'rgba(0,0,0,.45)'; rr(x - 6, y - 26, w + 12, h + 34, 8); c.fill();
    txt('POWER', x + w / 2, y - 13, 11, '#fff');
    const gr = c.createLinearGradient(0, y + h, 0, y); gr.addColorStop(0, '#3a86ff'); gr.addColorStop(0.2, '#3a86ff'); gr.addColorStop(0.21, '#2a9d4a'); gr.addColorStop(0.6, '#ffd23f'); gr.addColorStop(1, '#e63946');
    c.fillStyle = gr; c.fillRect(x, y, w, h); line(x, y + h * 0.8, x + w, y + h * 0.8, '#fff', 2);
    c.save(); c.translate(x + w / 2, y + h * 0.9); c.rotate(-Math.PI / 2); txt('KIDDIE', 0, 1, 10, '#fff'); c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 2.5; c.strokeRect(x, y, w, h);
    if (show) {
      const py = y + h * (1 - S.shot.power); c.fillStyle = '#fff'; c.fillRect(x - 5, py - 3, w + 10, 6); c.strokeStyle = '#111'; c.lineWidth = 1.5; c.strokeRect(x - 5, py - 3, w + 10, 6);
      poly([x - 16, py - 9, x - 5, py, x - 16, py + 9], '#ffd23f'); c.strokeStyle = '#111'; c.stroke();
    }
    c.restore();
  }
  function bubble(b) {
    const k = Math.min(1, b.t * 8) * Math.min(1, (b.dur - b.t) * 5); if (k <= 0 || b.x == null) return;
    c.save(); c.globalAlpha = k; c.font = 'bold 15px ' + FONT; const w = c.measureText(b.text).width + 20, x = clamp(b.x, w / 2 + 6, W - w / 2 - 6), y = clamp(b.y, 104, H - 20);
    c.fillStyle = '#fff'; rr(x - w / 2, y - 30, w, 26, 11); c.fill(); c.strokeStyle = '#223'; c.lineWidth = 2; c.stroke();
    poly([x - 6, y - 5, x + 6, y - 5, x, y + 6], '#fff'); line(x - 6, y - 4, x, y + 6, '#223', 2); line(x + 6, y - 4, x, y + 6, '#223', 2);
    txt(b.text, x, y - 16, 15, '#223'); c.restore();
  }
  function title(S) {
    const cx = W / 2;
    c.save(); c.translate(cx, 74); c.rotate(Math.sin(S.time * 1.5) * 0.015);
    txt('GNOME BOWLING', 0, 0, 78, '#e63946', { font: HEAVY, stroke: '#fff', sw: 14 }); txt('GNOME BOWLING', 0, 0, 78, '#e63946', { font: HEAVY, stroke: '#7a0f18', sw: 4 });
    c.restore();
    c.save(); c.translate(cx + 335, 104); c.rotate(-0.16); c.fillStyle = '#ffd23f'; rr(-42, -19, 84, 38, 10); c.fill(); c.strokeStyle = '#7a3b00'; c.lineWidth = 3; c.stroke(); txt('2.0', 0, 1, 26, '#7a0f18', { font: HEAVY }); c.restore();
    txt('at Santa’s Workshop', cx, 132, 24, '#fff', { stroke: '#14204a', sw: 6 });
    if (S.club300) txt('★ 300 CLUB ★', cx, 162, 16, '#ffd23f', { stroke: '#5a2a00', sw: 5 });
    c.fillStyle = 'rgba(10,18,60,.8)'; rr(cx - 265, 352, 530, 256, 18); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    txt('HOW TO PLAY', cx, 376, 17, '#ffd23f');
    const L = ['①  Move Santa left / right, then click to set his spot', '②  Click to lock the aim arrow above the gnomes', '③  Click to stop the power bar — top is full power', 'Under 20% power = a two-handed KIDDIE ROLL!'];
    for (let i = 0; i < L.length; i++) txt(L[i], cx, 402 + i * 23, 15, i === 3 ? '#9be7ff' : '#fff');
    txt('Choose your difficulty:', cx, 500, 15, '#ffd23f');
    button(cx - 205, 514, 190, 54, 'EASY', '#2a9d4a', 'easy'); button(cx + 15, 514, 190, 54, 'HARD', '#d62828', 'hard');
    txt('Slow arrow & bar' + (S.best.easy ? '  •  Best ' + S.best.easy : ''), cx - 110, 586, 12, '#cfe6ff');
    txt('Fast arrow & bar' + (S.best.hard ? '  •  Best ' + S.best.hard : ''), cx + 110, 586, 12, '#cfe6ff');
    txt('Mouse / touch, or keys: ← → move • Space select • M mute', cx, 626, 12, '#fff', { stroke: 'rgba(5,10,50,.8)', sw: 4 });
  }
  function gameOver(S) {
    const cx = W / 2, k = smooth(Math.min(1, S.pt * 2.5)), tot = S.total;
    c.save(); c.globalAlpha = k; c.fillStyle = 'rgba(5,8,30,.45)'; c.fillRect(0, 70, W, H - 70);
    c.fillStyle = 'rgba(10,18,60,.92)'; rr(cx - 230, 150, 460, 330, 20); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    if (tot === 300) txt('PERFECT GAME!', cx, 196, 44, '#fff', { font: HEAVY, stroke: 'hsl(' + ((S.time * 140) % 360) + ',95%,45%)', sw: 8 });
    else txt('GAME OVER', cx, 196, 44, '#ffd23f', { font: HEAVY, stroke: '#7a0f18', sw: 6 });
    txt('Final score', cx, 244, 18, '#cfe6ff'); txt('' + tot, cx, 296, 76, '#fff', { font: HEAVY, stroke: '#e63946', sw: 6 });
    const rank = tot === 300 ? 'North Pole IMMORTAL — golden ball unlocked!' : tot >= 250 ? 'North Pole LEGEND!' : tot >= 200 ? 'Sleigh-Team Captain!' : tot >= 150 ? 'Top of the Nice List!' : tot >= 100 ? 'Jolly good bowling!' : tot >= 60 ? 'Not bad for a guy in mittens.' : 'The gnomes are still laughing…';
    txt(rank, cx, 350, 19, '#9be7ff');
    txt((S.newBest ? '★ New best on ' + S.diff.toUpperCase() + '! ★' : 'Best on ' + S.diff.toUpperCase() + ': ' + S.best[S.diff]), cx, 378, 14, '#ffd23f');
    c.restore();
    if (S.pt > 0.5) { button(cx - 195, 404, 190, 54, 'PLAY AGAIN', '#2a9d4a', 'again', 20); button(cx + 5, 404, 190, 54, 'MENU', '#3a5fb0', 'menu', 20); }
  }
  function bigText(text, sub, t, y, size, fill, stroke, wob, time) {
    const k = t < 0.3 ? lerp(0.2, 1.15, t / 0.3) : t < 0.42 ? lerp(1.15, 1, (t - 0.3) / 0.12) : 1;
    c.save(); c.translate(W / 2, y); c.scale(k, k); c.rotate(Math.sin(time * 7) * wob);
    txt(text, 0, 0, size, fill, { font: HEAVY, stroke, sw: size * 0.16 }); txt(text, 0, 0, size, fill, { font: HEAVY, stroke: 'rgba(255,255,255,.9)', sw: 3 });
    if (sub) txt(sub, 0, size * 0.66, Math.max(16, size * 0.26), '#fff', { stroke: '#14204a', sw: 6 }); c.restore();
  }
  return {
    get W() { return W; }, H,
    gcamRect(k) { return { x: 14, y: 80, w: 288 * k, h: 192 * k }; },
    resize(cssW, cssH, dpr) { W = Math.round(H * cssW / cssH); scale = cssH * dpr / H; canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr); },
    hit(x, y) { for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.action; } return null; },
    draw(S) {
      buttons = []; c.setTransform(scale, 0, 0, scale, 0, 0); c.clearRect(0, 0, W, H); const cx = W / 2;
      if (S.phase === 'loading') { c.fillStyle = '#0a1030'; c.fillRect(0, 0, W, H); txt('GNOME BOWLING 2.0', cx, 290, 44, '#e63946', { font: HEAVY, stroke: '#fff', sw: 8 }); txt('Loading the North Pole' + '.'.repeat(1 + (S.time * 3 | 0) % 3), cx, 350, 20, '#fff'); return; }
      for (const f of S.floaters) { if (f.x == null || f.t < 0) continue; const fk = f.t / f.dur; c.globalAlpha = 1 - fk; txt(f.text, f.x + Math.sin(fk * 6) * 4, f.y - fk * 36, f.size, f.color, { stroke: 'rgba(0,0,40,.6)', sw: 3 }); }
      c.globalAlpha = 1;
      if (S.gcam > 0.02) {
        const r = this.gcamRect(S.gcam);
        c.strokeStyle = '#3a1c05'; c.lineWidth = 8; rr(r.x, r.y, r.w, r.h, 6); c.stroke(); c.strokeStyle = '#ffd23f'; c.lineWidth = 4; rr(r.x, r.y, r.w, r.h, 6); c.stroke();
        if (S.gcam > 0.8) { c.fillStyle = 'rgba(0,0,0,.6)'; rr(r.x + 6, r.y + 6, 96, 20, 6); c.fill(); if ((S.time * 2 | 0) % 2) { c.fillStyle = '#ff3b3b'; c.beginPath(); c.arc(r.x + 17, r.y + 16, 5, 0, TAU); c.fill(); } txt('GNOME CAM', r.x + 60, r.y + 17, 11, '#fff'); }
      }
      for (const b of S.bubbles) bubble(b);
      if (S.phase === 'title') title(S);
      else {
        scoreboard(S);
        if (S.phase !== 'turkey' && S.phase !== 'perfect' && S.phase !== 'gameover') powerBar(S);
        let msg = null;
        if (S.phase === 'position') msg = '① Move Santa left / right — click to set his spot';
        else if (S.phase === 'aim') msg = '② Click to lock your aim';
        else if (S.phase === 'power') msg = '③ Click to set your power!';
        if (msg) { const pul = 1 + Math.sin(S.time * 5) * 0.02; c.save(); c.translate(cx, 92); c.scale(pul, pul); txt(msg, 0, 0, 19, '#fff', { stroke: 'rgba(5,10,50,.85)', sw: 5 }); c.restore(); }
        txt((S.diff === 'easy' ? 'EASY' : 'HARD') + '  •  Frame ' + (Math.min(S.fi, 9) + 1) + '  •  Score ' + S.total, 14, 626, 13, '#fff', { align: 'left', stroke: 'rgba(5,10,50,.8)', sw: 4 });
        c.fillStyle = 'rgba(0,0,0,.45)'; rr(10, 10, 64, 28, 8); c.fill(); txt('MENU', 42, 25, 12, '#fff'); addBtn(10, 10, 64, 28, 'menu');
        const b = S.banner;
        if (b) {
          const bt = b.t, bs = bt < 0.25 ? lerp(0.2, 1.15, bt / 0.25) : bt < 0.35 ? lerp(1.15, 1, (bt - 0.25) / 0.1) : 1, al = bt > 1.8 ? 1 - (bt - 1.8) / 0.4 : 1;
          c.save(); c.globalAlpha = Math.max(0, al); c.translate(cx, b.small ? 140 : 150); c.scale(bs, bs); c.rotate(Math.sin(S.time * 6) * 0.02);
          txt(b.text, 0, 0, b.small ? 40 : 66, b.color, { font: HEAVY, stroke: '#14204a', sw: b.small ? 8 : 12 }); c.restore();
        }
        if (S.phase === 'turkey') {
          const t = S.pt;
          if (t < 3) { c.save(); c.globalAlpha = t > 2.6 ? 1 - (t - 2.6) / 0.4 : 1; bigText('TURKEY!', 'Three strikes in a row!', t, 150, 86, '#ffd23f', '#5a2a00', 0.04, S.time); c.restore(); }
          else if (t < 12.4) txt('tap to skip', cx, 100, 12, 'rgba(255,255,255,.75)', { stroke: 'rgba(5,10,50,.7)', sw: 3 });
        }
        if (S.phase === 'perfect') {
          const t = S.pt, fo = 1 - clamp((t - 23.2) / 0.8, 0, 1), big = t < 5.2, hue = (S.time * 140) % 360;
          c.save(); c.globalAlpha = fo; const k = big ? (t < 0.35 ? lerp(0.1, 1.2, t / 0.35) : t < 0.5 ? lerp(1.2, 1, (t - 0.35) / 0.15) : 1) : 1 + Math.sin(S.time * 6) * 0.04, sz = big ? 92 : 36;
          c.translate(cx, big ? 250 : 92); c.scale(k, k); c.rotate(Math.sin(S.time * 5) * (big ? 0.03 : 0.012));
          txt('PERFECT GAME!', 0, 0, sz, '#fff', { font: HEAVY, stroke: 'hsl(' + hue + ',95%,45%)', sw: big ? 20 : 11 });
          txt('PERFECT GAME!', 0, 0, sz, '#ffd23f', { font: HEAVY, stroke: '#5a2a00', sw: big ? 6 : 4 });
          if (big && t > 1) txt('Twelve strikes in a row!', 0, 66, 26, '#fff', { stroke: '#14204a', sw: 7 });
          c.restore();
          if (t < 0.8) { c.fillStyle = 'rgba(255,255,255,' + (1 - t / 0.8) + ')'; c.fillRect(0, 0, W, H); }
        }
        if (S.phase === 'gameover') gameOver(S);
      }
      // mute button
      c.fillStyle = 'rgba(0,0,0,.45)'; rr(W - 56, 10, 46, 28, 8); c.fill();
      poly([W - 45, 21, W - 39, 21, W - 32, 15, W - 32, 35, W - 39, 29, W - 45, 29], '#fff');
      if (S.muted) { line(W - 27, 19, W - 17, 31, '#ff6b6b', 2.5); line(W - 17, 19, W - 27, 31, '#ff6b6b', 2.5); }
      else { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.arc(W - 31, 25, 6, -0.8, 0.8); c.stroke(); c.beginPath(); c.arc(W - 31, 25, 11, -0.8, 0.8); c.stroke(); }
      addBtn(W - 56, 10, 46, 28, 'mute');
    }
  };
}
