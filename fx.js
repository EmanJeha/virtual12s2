/* Shared helpers: colors, escaping, confetti, sound, toast, floating cards, countdown. */
window.COLORS = ['#FF5C8A', '#2F80FF', '#FF8A3D', '#10C6B4', '#7B5CFF', '#FFB627'];
window.$ = (s) => document.querySelector(s);
window.$$ = (s) => Array.from(document.querySelectorAll(s));
window.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
window.store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};
window.toast = function (t, ms) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms || 1800); };
window.buzz = function (p) { try { if (navigator.vibrate) navigator.vibrate(p || 60); } catch (e) { /* no vibration */ } };

let ac = null;
window.beep = function (type) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const sets = {
      good: [523, 659, 784], bad: [300, 220], win: [523, 659, 784, 1047], tap: [660], tick: [880],
      streak: [659, 784, 988, 1319], go: [392, 523, 784], up: [440, 660], down: [660, 440], count: [523],
    };
    const notes = sets[type] || [660];
    const gap = type === 'tick' ? 0 : .1;
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type === 'bad' ? 'sawtooth' : type === 'tick' ? 'square' : 'triangle';
      o.frequency.value = f;
      const t0 = ac.currentTime + i * gap, len = type === 'tick' ? .05 : .2;
      g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(type === 'tick' ? .05 : .12, t0 + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + len);
      o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + len + .02);
    });
  } catch (e) { /* audio unavailable */ }
};

(function () {
  const cv = document.getElementById('fx'); if (!cv) return;
  const cx = cv.getContext('2d'); let parts = [], raf = null;
  const size = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
  addEventListener('resize', size); size();
  function loop() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.vy += .35; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life--;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      if (p.round) { cx.beginPath(); cx.arc(0, 0, p.s / 2.4, 0, 7); cx.fill(); } else cx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66);
      cx.restore();
    });
    parts = parts.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0, 0, innerWidth, innerHeight), null);
  }
  window.confetti = function (n, x) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ox = x != null ? x : innerWidth / 2;
    for (let i = 0; i < (n || 120); i++) parts.push({ x: ox + (Math.random() - .5) * 240, y: innerHeight * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 13 - 4, s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: COLORS[i % COLORS.length], life: 130, round: i % 3 === 0 });
    if (!raf) loop();
  };
})();

window.floaters = function (vals) {
  const f = document.getElementById('floaters'); if (!f) return; f.innerHTML = '';
  vals.forEach((v, i) => { const s = document.createElement('span'); s.textContent = v; s.style.background = COLORS[i % COLORS.length]; s.style.left = (5 + (i * 83) % 90) + '%'; s.style.top = (8 + (i * 37) % 80) + '%'; s.style.animationDelay = (-i * 2.3) + 's'; f.appendChild(s); });
};

/* Big 3-2-1-GO overlay. Calls done() when finished. */
window.countdown = function (done, label) {
  if (document.querySelector('.cdown')) return;
  const o = document.createElement('div'); o.className = 'cdown';
  o.innerHTML = `<div class="cd-label">${esc(label || 'Get ready')}</div><div class="cd-num" id="cdNum">3</div>`;
  document.body.appendChild(o);
  const seq = ['3', '2', '1', 'GO!']; let k = 0;
  const show = () => {
    const n = o.querySelector('#cdNum'); n.textContent = seq[k]; n.className = 'cd-num' + (k === 3 ? ' go' : '');
    n.style.color = COLORS[k % COLORS.length]; void n.offsetWidth; n.classList.add('in');
    beep(k === 3 ? 'go' : 'count');
    k++;
    if (k < seq.length) setTimeout(show, 800);
    else setTimeout(() => { o.classList.add('out'); setTimeout(() => { o.remove(); if (done) done(); }, 350); }, 650);
  };
  show();
};
