/* Teacher's smart-board page. Open as board.html?game=warmup or board.html?game=wrapup.
   Session 2 additions: 3-2-1 countdown, live activity feed, streak badges, class accuracy,
   game clock, and automatic results when every player has finished. */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const gameId = window.GAMES[params.get('game')] ? params.get('game') : 'warmup';
  const G = window.GAMES[gameId];
  const other = gameId === 'warmup' ? 'wrapup' : 'warmup';
  const N = G.questions.length;
  const app = $('#app');
  // The QR must point to the website (GitHub Pages), not to a file on this computer.
  const siteBase = (window.SITE_URL && !/PASTE/.test(window.SITE_URL)) ? window.SITE_URL.replace(/\/?$/, '/') : location.href;
  const joinURL = new URL('index.html?game=' + gameId, siteBase).href;
  const localWarn = (location.protocol === 'file:' && siteBase === location.href)
    ? '<p class="banner" style="margin:0;text-align:left">This board is open from your computer, so phones cannot use this QR code. Open <b>board.html</b> from your GitHub link instead.</p>' : '';
  document.title = G.name + ' · Live';
  floaters(G.floaters || []);

  /* ---------- not connected: show setup help ---------- */
  if (!LIVE.on) {
    app.innerHTML = `<div class="card setup">
      <span class="pill">Live board not connected yet</span>
      <h1 style="font-size:40px">Connect Firebase to see players live</h1>
      ${LIVE.error ? `<p class="banner">${esc(LIVE.error)}</p>` : ''}
      <p>The board needs your Firebase settings in <code>config.js</code>. Follow <b>SETUP_GUIDE</b> in the download, then reload this page.</p>
      <ol><li>Create a free Firebase project and a Realtime Database.</li><li>Copy the web app settings into <code>config.js</code>.</li><li>Upload the files to GitHub again and reload.</li></ol>
      <p>Until then, students can still play in practice mode at:<br><code>${esc(joinURL)}</code></p>
    </div>`;
    return;
  }

  let state = null, round = 1, players = {}, unsub = null, showResults = false, showTickets = false, armed = false, autoShown = false;
  let prev = {}, feed = [], clock = null;
  const shown = {}; // displayed score per id (for count-up)

  LIVE.stateRef(gameId).on('value', (snap) => {
    const st = snap.val();
    if (!st) { LIVE.stateRef(gameId).set({ status: 'waiting', round: 1 }); return; }
    const changed = !state || st.round !== state.round;
    const statusChanged = !state || st.status !== state.status;
    const wentLive = !!state && !changed && state.status === 'waiting' && st.status === 'live';
    state = st; round = st.round || 1;
    if (changed) { players = {}; prev = {}; feed = []; autoShown = false; subscribe(); }
    if (statusChanged && st.status === 'ended') showResults = true;
    if (statusChanged && st.status !== 'ended') { showResults = false; autoShown = false; }
    renderShell();
    if (wentLive) countdown(null, 'Game on!');
  }, (err) => {
    app.innerHTML = `<div class="card setup">
      <span class="pill">Connected, but Firebase said no</span>
      <h1 style="font-size:40px">Open the database rules</h1>
      <p class="banner">${esc(err && err.message ? err.message : 'permission_denied')}</p>
      <p>In Firebase, open <b>Realtime Database → Rules</b>, replace them with the rules below, click <b>Publish</b>, then reload this page.</p>
      <pre style="background:#F1F4FF;padding:14px;border-radius:12px;font-size:16px">{\n  "rules": {\n    "sessions": { ".read": true, ".write": true }\n  }\n}</pre>
    </div>`;
  });
  function subscribe() {
    if (unsub) unsub();
    const ref = LIVE.playersRef(gameId, round);
    const fn = (snap) => { players = snap.val() || {}; diffFeed(); updatePlayers(); };
    ref.on('value', fn); unsub = () => ref.off('value', fn);
  }

  /* ---------- activity feed ---------- */
  function diffFeed() {
    const add = (html, cls) => { feed.unshift({ html, cls, t: Date.now() }); feed = feed.slice(0, 7); };
    Object.entries(players).forEach(([id, p]) => {
      if (!p || !p.name) return;
      const o = prev[id];
      const nm = `<b>${esc(p.name)}</b>`;
      if (!o) { add(`${nm} joined`, 'join'); return; }
      if ((p.q || 0) > (o.q || 0)) {
        const k = (p.q || 0) - 1, ok = p.answers && p.answers[k] === 1;
        add(ok ? `${nm} nailed Q${k + 1} ✓` : `${nm} missed Q${k + 1}`, ok ? 'ok' : 'no');
        if (ok && (p.streak || 0) >= 3 && (o.streak || 0) < (p.streak || 0)) shout(`🔥 ${p.name}: ${p.streak} in a row!`);
      }
      if (p.solved && !o.solved && G.mystery) { add(`${nm} cracked the topic! 🔓`, 'gold'); shout(`🔓 ${p.name} cracked the topic!`); }
      if (p.done && !o.done) add(`${nm} finished 🏁`, 'fin');
      if (p.exit && !o.exit) add(`${nm} sent an exit ticket ✉️`, 'fin');
    });
    prev = JSON.parse(JSON.stringify(players));
    paintFeed();
  }
  function paintFeed() {
    const box = $('#feed'); if (!box) return;
    box.innerHTML = feed.length ? feed.map((f, i) => `<li class="${f.cls} ${i === 0 ? 'new' : ''}">${f.html}</li>`).join('') : '<li class="idle">Moves will appear here live</li>';
  }
  let shoutT = null;
  function shout(text) {
    let s = $('#shout');
    if (!s) { s = document.createElement('div'); s.id = 'shout'; s.className = 'shout'; document.body.appendChild(s); }
    s.textContent = text; s.classList.remove('in'); void s.offsetWidth; s.classList.add('in');
    beep('streak');
    clearTimeout(shoutT); shoutT = setTimeout(() => s.classList.remove('in'), 2600);
  }

  /* ---------- layout ---------- */
  function renderShell() {
    const st = state.status;
    const label = st === 'live' ? 'Live' : st === 'ended' ? 'Finished' : 'Waiting to start';
    app.innerHTML = `
    <header class="bhead">
      <div class="t">${G.titleHTML.replace('<br>', ' ')}</div>
      <span class="status ${st}"><i></i>${label}</span>
      ${st === 'live' ? '<span class="clock" id="clock">⏱ 00:00</span>' : ''}
      <div class="controls">
        ${st === 'waiting' ? '<button class="btn teal" id="start">Start game</button>' : ''}
        ${st === 'live' ? '<button class="btn orange" id="end">End game</button>' : ''}
        ${st !== 'waiting' ? `<button class="btn small" id="toggleRes">${showResults ? 'Show leaderboard' : 'Show results'}</button>` : ''}
        <button class="btn small" id="newRound">New round</button>
        <a class="btn small" href="?game=${other}">Switch to ${esc(window.GAMES[other].name)}</a>
        <button class="btn small" id="fs">Full screen</button>
      </div>
    </header>
    <div class="bgrid">
      <aside class="joinbox ${st === 'live' ? 'mini' : ''}">
        <h2>${st === 'live' ? 'Join late?' : 'Scan to join'}</h2>
        ${localWarn}<div id="qr"></div>
        <div class="url">${esc(joinURL)}</div>
        <div class="counts"><div><b id="cJoined">0</b><small>Players</small></div><div><b id="cPlaying">0</b><small>Playing</small></div><div><b id="cDone">0</b><small>Finished</small></div></div>
        <div class="feedbox"><h3>Live moves</h3><ul class="feed" id="feed"></ul></div>
      </aside>
      <main id="main"></main>
    </div>`;
    try { const qr = qrcode(0, 'M'); qr.addData(joinURL); qr.make(); $('#qr').innerHTML = qr.createSvgTag({ cellSize: 8, margin: 0, scalable: true }); }
    catch (e) { $('#qr').innerHTML = '<p style="line-height:1.4;margin:0">QR code could not load. Share the link below.</p>'; }
    $('#fs').onclick = () => { try { const d = document.documentElement; const pr = document.fullscreenElement ? document.exitFullscreen() : (d.requestFullscreen ? d.requestFullscreen() : null); if (pr && pr.catch) pr.catch(() => toast('Full screen is not available here')); } catch (err) { toast('Full screen is not available here'); } };
    const s = $('#start'); if (s) s.onclick = () => { LIVE.stateRef(gameId).update({ status: 'live', startedAt: LIVE.now() }); };
    const e = $('#end'); if (e) e.onclick = () => { LIVE.stateRef(gameId).update({ status: 'ended', endedAt: LIVE.now() }); };
    const t = $('#toggleRes'); if (t) t.onclick = () => { showResults = !showResults; renderShell(); };
    const n = $('#newRound');
    n.onclick = () => {
      if (!armed) { armed = true; n.textContent = 'Click again: clears the board'; setTimeout(() => { armed = false; if (n.isConnected) n.textContent = 'New round'; }, 3500); return; }
      armed = false; LIVE.stateRef(gameId).set({ status: 'waiting', round: round + 1 });
    };
    clearInterval(clock);
    if (st === 'live') {
      const paintClock = () => { const c = $('#clock'); if (!c) return; const s0 = typeof state.startedAt === 'number' ? state.startedAt : Date.now(); const sec = Math.max(0, Math.floor((Date.now() - s0) / 1000)); c.textContent = '⏱ ' + String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
      paintClock(); clock = setInterval(paintClock, 1000);
    }
    paintFeed();
    updatePlayers(true);
  }

  /* ---------- live leaderboard ---------- */
  const sorted = () => Object.entries(players).map(([id, p]) => Object.assign({ id }, p))
    .filter((p) => p.name)
    .sort((a, b) => (b.score || 0) - (a.score || 0) || (b.correct || 0) - (a.correct || 0) || (a.finishedAt || 9e15) - (b.finishedAt || 9e15) || String(a.name).localeCompare(String(b.name)));
  const initials = (n) => String(n).split(/[\s&,+]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const colorFor = (id) => { let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };

  function classAccuracy(list) {
    let a = 0, r = 0;
    list.forEach((p) => Object.values(p.answers || {}).forEach((v) => { a++; if (v === 1) r++; }));
    return { a, pct: a ? Math.round((r / a) * 100) : null };
  }

  function updatePlayers(fresh) {
    const main = $('#main'); if (!main) return;
    const list = sorted();
    $('#cJoined').textContent = list.length;
    $('#cPlaying').textContent = list.filter((p) => !p.done && (p.q || 0) > 0).length;
    $('#cDone').textContent = list.filter((p) => p.done).length;

    // everybody finished? show the results automatically
    if (state.status === 'live' && !autoShown && !showResults && list.length && list.every((p) => p.done)) {
      autoShown = true;
      setTimeout(() => { if (state.status === 'live' && !showResults) { showResults = true; toast('Everyone finished! Here are the results', 2500); renderShell(); } }, 1800);
    }
    if (showResults) { renderResults(main, list); return; }

    if (fresh || !$('#lbList')) {
      main.innerHTML = `<section class="lb"><div class="acc" id="acc"></div><div class="lb-head"><span>Rank</span><span>Player</span><span class="hp">Progress</span><span style="text-align:right">Score</span></div><div class="lb-list" id="lbList"></div></section>`;
    }
    const A = classAccuracy(list);
    $('#acc').innerHTML = A.a ? `<span>Class accuracy</span><div class="accbar"><i style="width:${A.pct}%"></i></div><b>${A.pct}%</b><small>${A.a} answers</small>` : `<span>Class accuracy</span><div class="accbar"><i style="width:0"></i></div><b>—</b><small>no answers yet</small>`;
    const box = $('#lbList');
    if (!list.length) {
      box.innerHTML = `<div class="empty"><div class="wait-dots"><i></i><i></i><i></i><i></i></div><b>Waiting for players to join…</b><span>Scan the QR code, type your name, and you will appear here.</span></div>`;
      return;
    }
    const emptyEl = box.querySelector('.empty'); if (emptyEl) emptyEl.remove();
    // FLIP: remember old positions
    const before = {};
    box.querySelectorAll('.row').forEach((r) => { before[r.dataset.id] = r.getBoundingClientRect().top; });
    const keep = new Set(list.map((p) => p.id));
    box.querySelectorAll('.row').forEach((r) => { if (!keep.has(r.dataset.id)) r.remove(); });
    list.forEach((p, k) => {
      let row = box.querySelector(`.row[data-id="${CSS.escape(p.id)}"]`);
      if (!row) { row = document.createElement('div'); row.className = 'row'; row.dataset.id = p.id; }
      row.className = 'row' + (k < 3 && (p.score || 0) > 0 ? ' r' + (k + 1) : '');
      const q = Math.min(p.q || 0, N);
      const progressText = p.done ? 'Finished ✓' : state.status === 'waiting' ? 'Ready' : q === 0 ? 'Starting…' : `Question ${Math.min(q + 1, N)} of ${N}`;
      const dots = Array.from({ length: N }, (_, i) => { const v = p.answers ? p.answers[i] : null; return `<i class="${v === 1 ? 'y' : v === 0 ? 'n' : ''}"></i>`; }).join('');
      row.innerHTML = `<div class="rank">${k + 1}</div>
        <div class="pname"><span class="ava" style="background:${colorFor(p.id)}">${esc(initials(p.name))}<i class="on ${p.online === false ? 'off' : ''}"></i></span><b>${esc(p.name)}</b>${(p.streak || 0) >= 2 ? `<span class="fire">🔥${p.streak}</span>` : ''}${p.solved && G.mystery ? '<span class="badge">Topic cracked</span>' : ''}</div>
        <div class="prog"><small class="${p.done ? 'fin' : ''}">${progressText} · ${p.correct || 0} correct</small><div class="dots">${dots}</div></div>
        <div class="pscore" data-s>${shown[p.id] != null ? shown[p.id] : p.score || 0}</div>`;
      box.appendChild(row);
      countUp(row, p);
    });
    box.querySelectorAll('.row').forEach((r) => {
      const old = before[r.dataset.id]; if (old == null) return;
      const dy = old - r.getBoundingClientRect().top;
      if (Math.abs(dy) > 2) { r.style.transition = 'none'; r.style.transform = `translateY(${dy}px)`; requestAnimationFrame(() => { r.style.transition = ''; r.style.transform = ''; }); }
    });
  }
  function countUp(row, p) {
    const target = p.score || 0; const from = shown[p.id] != null ? shown[p.id] : target;
    shown[p.id] = target;
    const el = row.querySelector('[data-s]');
    if (from === target) { el.textContent = target; return; }
    row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
    const t0 = performance.now();
    const step = (t) => { const k = Math.min(1, (t - t0) / 700); el.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  /* ---------- results: podium, hardest questions, exit tickets ---------- */
  function renderResults(main, list) {
    const top = list.slice(0, 3);
    const pod = (p, i) => p ? `<div class="pod p${i + 1}"><em>${['🥇', '🥈', '🥉'][i]}</em><b>${esc(p.name)}</b><span>${p.score || 0}</span></div>` : '<div></div>';
    const acc = G.questions.map((q, i) => {
      const a = list.filter((p) => p.answers && p.answers[i] != null);
      const r = a.filter((p) => p.answers[i] === 1).length;
      return { i, label: q.ctx || 'Question', pct: a.length ? Math.round((r / a.length) * 100) : null, n: a.length };
    });
    const accRows = acc.map((x) => `<div class="qacc"><b>Q${x.i + 1}</b><div><small>${esc(x.label)}</small><div class="bar2"><i style="width:${x.pct || 0}%;background:${x.pct == null ? 'var(--line)' : x.pct >= 70 ? 'var(--teal)' : x.pct >= 40 ? 'var(--orange)' : 'var(--bad)'}"></i></div></div><span>${x.pct == null ? '—' : x.pct + '%'}</span></div>`).join('');
    const hardest = acc.filter((x) => x.pct != null).sort((a, b) => a.pct - b.pct)[0];
    const streaker = list.slice().sort((a, b) => (b.best || 0) - (a.best || 0))[0];
    const tickets = list.filter((p) => p.exit).map((p) => `<div><b>${esc(p.name)}</b>${esc(p.exit)}</div>`).join('') || '<p class="lede">No exit tickets yet. They appear here when players press Send.</p>';
    main.innerHTML = `
      <section class="lb" style="display:grid;gap:18px">
        <h2 style="font-size:clamp(28px,3vw,42px);text-align:center">${list.length ? 'Champions' : 'Nobody played this round'}</h2>
        ${list.length ? `<div class="podium">${pod(top[1], 1)}${pod(top[0], 0)}${pod(top[2], 2)}</div>` : ''}
        ${streaker && (streaker.best || 0) >= 3 ? `<p class="streak-award">🔥 Longest streak: <b>${esc(streaker.name)}</b> with ${streaker.best} in a row</p>` : ''}
        <div class="insights">
          <div class="panel"><h3>How the class did</h3>${hardest ? `<p class="lede" style="font-size:16px">Hardest: <b>Q${hardest.i + 1} (${esc(hardest.label)})</b>, ${hardest.pct}% correct. Worth reviewing together.</p>` : ''}${accRows}</div>
          ${gameId === 'wrapup' ? `<div class="panel"><h3>Exit tickets</h3><button class="btn small" id="tk" style="justify-self:start">${showTickets ? 'Hide answers' : 'Show answers'}</button><div class="tickets" ${showTickets ? '' : 'hidden'}>${tickets}</div></div>` : `<div class="panel"><h3>Today's topic</h3><div class="reveal"><div class="big">${esc(G.topic || '')}</div></div><p class="lede" style="font-size:16px">${list.filter((p) => p.solved).length} of ${list.length} players cracked the topic.</p></div>`}
        </div>
      </section>`;
    const tk = $('#tk'); if (tk) tk.onclick = () => { showTickets = !showTickets; updatePlayers(true); };
    if (list.length && !main.dataset.cheered) { main.dataset.cheered = '1'; confetti(260); beep('win'); }
  }
})();
