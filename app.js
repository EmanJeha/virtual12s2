/* Student game page. Open as index.html?game=warmup or index.html?game=wrapup.
   Each pair plays on its own device; progress is sent live to the teacher's board.
   Session 2 additions: guess / mid / hunt question types, streak bonus, 3-2-1 countdown,
   auto-next after feedback, keyboard answers (1-4 or A-D). */
(function () {
  'use strict';
  const params = new URLSearchParams(location.search);
  const gameId = params.get('game');
  const G = window.GAMES[gameId];
  const app = $('#app');

  /* ---------- no game chosen: pick one ---------- */
  if (!G) {
    const SI = window.SITE_INFO || {};
    floaters(window.GAMES.warmup.floaters || []);
    app.innerHTML = `<section class="center"><div class="card">
      <span class="pill">${esc(SI.badge || '')}</span>
      <h1 class="title wave">${SI.titleHTML || esc(SI.titleText || 'Games')}</h1>
      <p class="lede">Choose the game your teacher asked for.</p>
      <div class="pick three">
        <a class="w" href="?game=warmup"><small>${esc(SI.warmup.label)}</small><b>${esc(window.GAMES.warmup.name)}</b><span>${esc(SI.warmup.sub)}</span></a>
        <a class="r" href="?game=wrapup"><small>${esc(SI.wrapup.label)}</small><b>${esc(window.GAMES.wrapup.name)}</b><span>${esc(SI.wrapup.sub)}</span></a>
        ${SI.lab ? `<a class="l" href="lab.html"><small>${esc(SI.lab.label)}</small><b>${esc(SI.lab.name)}</b><span>${esc(SI.lab.sub)}</span></a>` : ''}
      </div></div></section>`;
    return;
  }

  document.title = G.name;
  floaters(G.floaters || []);
  const N = G.questions.length;
  const KEY = 'bs2:' + gameId;
  const AUTO_NEXT = 10; // seconds before the next question opens by itself
  let state = null, round = 1, me = null, players = {}, unsubPlayers = null, view = '';
  let tick = null, left = 0, answered = false, picks = [], cur = 0, autoT = null, hunt = null, gs = null;
  const secsFor = (q) => (q && q.seconds) || G.seconds;

  const load = () => { const s = store.get(KEY, null); me = s && s.round === round ? s : null; };
  const persist = () => { if (me) store.set(KEY, me); };
  const pref = () => LIVE.playerRef(gameId, round, me.id);
  function sync(extra) {
    persist();
    if (!LIVE.on || !me) return;
    const body = { name: me.name, score: me.score, q: me.q, total: N, correct: me.correct, answers: me.answers, done: me.done, solved: !!me.solved, streak: me.streak || 0, best: me.best || 0, online: true };
    pref().update(Object.assign(body, extra || {})).catch(() => toast('Connection problem. Your answers are saved on this device.'));
  }
  function goOnline() {
    if (!LIVE.on || !me) return;
    const r = pref().child('online'); r.set(true); r.onDisconnect().set(false);
  }

  /* ---------- connect ---------- */
  if (LIVE.on) {
    LIVE.stateRef(gameId).on('value', (snap) => {
      const st = snap.val() || { status: 'waiting', round: 1 };
      const changed = !state || st.round !== state.round;
      const wentLive = !!state && !changed && state.status === 'waiting' && st.status === 'live';
      state = st; round = st.round || 1;
      if (changed) { load(); subscribePlayers(); if (me) goOnline(); view = ''; }
      if (wentLive && me && !me.done && view === 'lobby') {
        view = 'countdown';
        countdown(() => { view = ''; route(); }, G.name);
        return;
      }
      route();
    }, () => { state = { status: 'live', round: 1 }; load(); route(); });
  } else {
    state = { status: 'live', round: 1 }; load(); route();
  }
  function subscribePlayers() {
    if (unsubPlayers) unsubPlayers();
    const ref = LIVE.playersRef(gameId, round);
    const fn = (snap) => { players = snap.val() || {}; if (view === 'lobby') paintLobbyCount(); if (view === 'results') paintRank(); };
    ref.on('value', fn); unsubPlayers = () => ref.off('value', fn);
  }

  function route() {
    if (view === 'countdown') return;
    if (!me) { if (view !== 'join') renderJoin(); else paintJoinNote(); return; }
    if (me.done) { if (view !== 'results') renderResults(); return; }
    if (state.status === 'ended') { me.done = true; me.locked = true; sync({ finishedAt: LIVE.on ? LIVE.now() : Date.now() }); renderResults(); return; }
    if (state.status === 'waiting') { if (view !== 'lobby') renderLobby(); return; }
    if (view !== 'play') { if (me.q >= N) afterLast(); else renderQ(); }
  }

  /* ---------- join ---------- */
  function joinNote() {
    if (!LIVE.on) return `<p class="banner">${LIVE.error ? esc(LIVE.error) + ' ' : ''}Practice mode: this game is not connected to the class board.</p>`;
    if (state && state.status === 'ended') return '<p class="banner">This round has ended. Wait for your teacher to start a new one.</p>';
    return '<p class="banner ok">Connected to the class board</p>';
  }
  function paintJoinNote() { const n = $('#note'); if (n) n.innerHTML = joinNote(); const b = $('#joinBtn'); if (b) b.disabled = LIVE.on && state.status === 'ended'; }
  function renderJoin() {
    view = 'join';
    app.innerHTML = `<section class="center"><div class="card">
      <span class="pill">${esc(G.badge)}</span>
      <h1 class="title wave">${G.titleHTML}</h1>
      <p class="lede">${esc(G.intro)}</p>
      <div class="rules">${G.rules.map((r) => `<span>${esc(r)}</span>`).join('')}</div>
      <form class="namefield" id="join">
        <input id="pair" maxlength="28" placeholder="Your name(s), e.g. Sara & Noura" autocomplete="off" aria-label="Your name or your pair's names">
        <button class="btn go" id="joinBtn" type="submit">Join →</button>
      </form>
      <p class="err" id="err"></p>
      <div id="note">${joinNote()}</div>
    </div></section>`;
    paintJoinNote();
    $('#join').onsubmit = (e) => {
      e.preventDefault();
      const name = $('#pair').value.trim().replace(/\s+/g, ' ');
      if (name.length < 2) { $('#err').textContent = 'Type your name first.'; $('#pair').focus(); return; }
      me = { round, id: 'p' + Math.random().toString(36).slice(2, 10), name, score: 0, q: 0, correct: 0, answers: {}, done: false, solved: false, revealed: [], streak: 0, best: 0 };
      beep('tap');
      if (LIVE.on) { sync({ joinedAt: LIVE.now() }); goOnline(); }
      persist(); view = ''; route();
    };
  }

  /* ---------- lobby ---------- */
  function renderLobby() {
    view = 'lobby';
    app.innerHTML = `<section class="center"><div class="card">
      <span class="pill">${esc(G.name)}</span>
      <p class="lede">You're in!</p>
      <div class="bigname">${esc(me.name)}</div>
      <div class="wait-dots"><i></i><i></i><i></i><i></i></div>
      <h2 style="font-size:clamp(24px,3vw,32px)">Look at your teacher’s shared screen.<br>The game starts when your teacher presses Start.</h2>
      <p class="lede" id="count"></p>
      <div class="lobby-names" id="lobbyNames"></div>
    </div></section>`;
    paintLobbyCount();
  }
  function paintLobbyCount() {
    const c = $('#count'); if (!c) return;
    const list = Object.entries(players).filter(([, p]) => p && p.name);
    const n = list.length;
    c.textContent = n + (n === 1 ? ' player has' : ' players have') + ' joined so far';
    const box = $('#lobbyNames');
    if (box) box.innerHTML = list.slice(0, 40).map(([id, p], i) => `<span style="background:${COLORS[i % COLORS.length]}" class="${id === me.id ? 'me' : ''}">${esc(p.name)}</span>`).join('');
  }

  /* ---------- status bar + mystery ---------- */
  function barHTML(noTimer) {
    const q = G.questions[Math.min(cur, N - 1)];
    return `<div class="sbar">
      <div class="who"><small>${esc(G.name)}</small><b>${esc(me.name)}</b></div>
      <div class="stat"><small>Question</small><b>${Math.min(cur + 1, N)}/${N}</b></div>
      <div class="stat"><small>Score</small><b class="score" id="score">${me.score}</b></div>
      <div class="streak ${(me.streak || 0) >= 2 ? 'on' : ''}" id="streak" title="Answers right in a row"><span>🔥</span><b>${me.streak || 0}</b></div>
      ${noTimer ? '' : `<div class="ring" id="ring"><b id="tm">${secsFor(q)}</b></div>`}
    </div>
    <div class="qbar"><i style="width:${(me.q / N) * 100}%"></i></div>`;
  }
  function paintStreak() {
    const s = $('#streak'); if (!s) return;
    s.querySelector('b').textContent = me.streak || 0;
    s.classList.toggle('on', (me.streak || 0) >= 2);
    s.animate([{ transform: 'scale(1.5) rotate(-8deg)' }, { transform: 'none' }], { duration: 500, easing: 'cubic-bezier(.2,1.4,.4,1)' });
  }
  function mysteryHTML() {
    if (!G.mystery) return '';
    const M = G.mystery; const rev = new Set(me.revealed || []);
    const tiles = M.phrase.split('').map((ch, i) => ch === ' ' ? '<span class="tile gap"></span>' : `<span class="tile ${rev.has(i) ? 'shown' : ''}" style="${rev.has(i) ? 'background:' + COLORS[i % COLORS.length] : ''}">${rev.has(i) ? ch : ''}</span>`).join('');
    return `<section class="mystery" id="mystery">
      <div class="top"><span class="lbl">${me.solved ? 'Topic cracked! +' + M.bonus : esc(M.label)}</span>
      ${me.solved ? '' : `<form class="guess" id="guessForm"><input id="guess" placeholder="Know the topic? Type it" autocomplete="off" aria-label="Guess the topic"><button class="btn small pink" type="submit">Guess</button></form>`}</div>
      <div class="tiles">${tiles}</div></section>`;
  }
  function bindMystery() {
    const f = $('#guessForm'); if (!f) return;
    $('#guess').addEventListener('focus', cancelAuto);
    f.onsubmit = (e) => {
      e.preventDefault();
      const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
      const v = $('#guess').value; if (!norm(v)) return;
      if (G.mystery.accept.some((a) => norm(a) === norm(v))) {
        me.solved = true; me.score += G.mystery.bonus;
        me.revealed = G.mystery.phrase.split('').map((c, i) => c === ' ' ? -1 : i).filter((i) => i >= 0);
        sync(); beep('win'); confetti(200); toast('You cracked it! +' + G.mystery.bonus);
        $('#mystery').outerHTML = mysteryHTML(); bumpScore();
      } else { beep('bad'); buzz(); toast('Not quite. Keep collecting letters!'); $('#guess').value = ''; }
    };
  }
  function revealLetters(n) {
    if (!G.mystery) return;
    const have = new Set(me.revealed || []); let c = 0;
    for (const i of G.mystery.order) { if (c >= n) break; if (!have.has(i)) { have.add(i); c++; } }
    me.revealed = [...have];
  }
  function bumpScore() { const el = $('#score'); if (el) { el.textContent = me.score; el.animate([{ transform: 'scale(1.5)' }, { transform: 'scale(1)' }], { duration: 450, easing: 'cubic-bezier(.2,1.4,.4,1)' }); } }

  /* ---------- code colouring ---------- */
  function hl(line) {
    const hash = line.indexOf('  #') >= 0 ? line.indexOf('  #') + 2 : (/^\s*#/.test(line) ? line.indexOf('#') : -1);
    const codePart = hash >= 0 ? line.slice(0, hash) : line;
    const comment = hash >= 0 ? line.slice(hash) : '';
    const re = /(f?"[^"]*")|\b(for|in|while|and|or|not|class|def|pass|return|if|elif|else)\b|\b(True|False|None)\b|\b(print|range|len|int|input|super)\b|\b(\d+)\b/g;
    let body = '', last = 0, m;
    while ((m = re.exec(codePart))) {
      body += esc(codePart.slice(last, m.index));
      const cls = m[1] ? 'str' : m[2] ? 'kw' : m[3] ? 'self' : m[4] ? 'fn' : 'num';
      body += `<span class="${cls}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }
    body += esc(codePart.slice(last));
    return body + (comment ? `<span class="cmt">${esc(comment)}</span>` : '');
  }
  const fmt = (v) => typeof v === 'string' ? `"${v}"` : String(v);

  /* ---------- array tiles (mid / hunt) ---------- */
  function arrHTML(list, first, last) {
    const wide = list.some((v) => String(v).length > 3);
    return `<div class="arr ${wide ? 'words' : ''}" id="arr">${list.map((v, i) => `<button class="atile ${i < first || i > last ? 'out' : ''}" data-i="${i}" style="--c:${COLORS[i % COLORS.length]}"><b>${esc(v)}</b><small>[${i}]</small></button>`).join('')}</div>`;
  }
  function paintPointers(first, last, mid) {
    $$('.atile').forEach((t) => {
      const i = +t.dataset.i;
      t.classList.toggle('out', i < first || i > last);
      const lab = [];
      if (i === first) lab.push('first'); if (i === last) lab.push('last'); if (mid != null && i === mid) lab.push('mid');
      t.dataset.ptr = lab.join(' · ');
    });
  }

  /* ---------- questions ---------- */
  function renderQ() {
    view = 'play'; answered = false; picks = []; cur = me.q; hunt = null; gs = null; cancelAuto();
    const q = G.questions[cur];
    let area = '';
    if (q.type === 'mc') area = `<div class="opts">${q.options.map((o, i) => `<button class="opt o${i}" data-i="${i}" data-k="${'ABCD'[i]}">${o}</button>`).join('')}</div>`;
    if (q.type === 'order') area = `<div class="order${q.tiles.some((t) => String(t).length > 4) ? ' wide' : ''}"><div class="slots">${q.answer.map((_, i) => `<div class="slot"><small>[${i}]</small></div>`).join('')}</div>
      <div class="pool">${q.tiles.map((t, i) => `<button class="ptile" data-t="${i}" style="background:${COLORS[i % COLORS.length]}">${esc(t)}</button>`).join('')}</div>
      <div class="acts"><button class="btn small" id="undo">Undo</button><button class="btn go small" id="check" disabled>Check answer</button></div></div>`;
    if (q.type === 'line') area = `<div class="code">${q.code.map((l, i) => `<button class="cl" data-l="${i}"><span>${i + 1}</span><span>${hl(l)}</span></button>`).join('')}</div>`;
    if (q.type === 'mid') area = `<div class="vars"><div><small>first</small><b>${q.first}</b></div><div><small>last</small><b>${q.last}</b></div><div class="ask"><small>mid</small><b>?</b></div></div>${arrHTML(q.list, q.first, q.last)}`;
    if (q.type === 'hunt') area = `<div class="vars"><div class="key"><small>key</small><b>${esc(fmt(q.key))}</b></div><div><small>first</small><b id="vf">0</b></div><div><small>last</small><b id="vl">${q.list.length - 1}</b></div><div><small>mid</small><b id="vm">?</b></div><div><small>repetitions</small><b id="vr">0</b></div></div>
      <div class="hmsg" id="hmsg">Tap the <b>middle</b> tile of the bright range.</div>${arrHTML(q.list, 0, q.list.length - 1)}`;
    if (q.type === 'guess') area = `<div class="guessgame">
      <div class="gbar"><div class="gwin" id="gwin"></div></div><div class="gcap" id="gcap"></div>
      <div class="gmsg" id="gmsg">Make your first guess!</div>
      <form class="gform" id="gform"><input id="gin" type="number" inputmode="numeric" min="${q.lo}" max="${q.hi}" placeholder="${q.lo}–${q.hi}" aria-label="Your guess" autocomplete="off"><button class="btn go" type="submit">Guess</button></form>
      <div class="ghist" id="ghist"></div>
      <div class="gleft">Guesses left: <b id="gleft">${q.max}</b></div></div>`;
    app.innerHTML = `${barHTML()}${mysteryHTML()}
      <section class="qcard">
        <div class="qhead"><span class="tag n">Question ${cur + 1} of ${N}</span>${q.ctx ? `<span class="tag ctx">${esc(q.ctx)}</span>` : ''}<span class="tag hot">${esc(q.skill)}</span></div>
        <div class="qtext">${q.q}</div>
        ${q.sub ? `<p class="qsub">${q.sub}</p>` : ''}
        ${q.scene ? `<div class="scene">${q.scene}</div>` : ''}
        ${q.show ? `<div class="code ro">${q.show.map((l, i) => `<div class="cl"><span>${i + 1}</span><span>${hl(l)}</span></div>`).join('')}</div>` : ''}
        <div id="area">${area}</div>
        <div id="fb"></div>
      </section>`;
    bindMystery();
    if (q.type === 'mc') $$('.opt').forEach((b) => b.onclick = () => answerMC(+b.dataset.i));
    if (q.type === 'order') {
      const fill = () => {
        $$('.slot').forEach((s, i) => { const t = picks[i]; s.classList.toggle('filled', t != null); s.innerHTML = (t != null ? esc(q.tiles[t]) : '') + `<small>[${i}]</small>`; });
        $$('.ptile').forEach((b) => b.classList.toggle('used', picks.includes(+b.dataset.t)));
        $('#check').disabled = picks.length !== q.answer.length;
      };
      $$('.ptile').forEach((b) => b.onclick = () => { if (answered || picks.length >= q.answer.length) return; picks.push(+b.dataset.t); beep('tap'); fill(); });
      $('#undo').onclick = () => { if (!answered) { picks.pop(); fill(); } };
      $('#check').onclick = () => {
        if (answered) return; let ok = true;
        $$('.slot').forEach((s, i) => { const g = String(q.tiles[picks[i]]) === String(q.answer[i]); s.classList.add(g ? 'ok' : 'no'); if (!g) ok = false; });
        done(ok);
      };
    }
    if (q.type === 'line') $$('.cl').forEach((b) => b.onclick = () => {
      if (answered) return; const i = +b.dataset.l;
      if (i === q.answer) b.classList.add('right'); else { b.classList.add('wrong'); document.querySelector(`.cl[data-l="${q.answer}"]`).classList.add('right'); }
      done(i === q.answer);
    });
    if (q.type === 'mid') { paintPointers(q.first, q.last, null); $$('.atile').forEach((b) => b.onclick = () => tapMid(q, +b.dataset.i)); }
    if (q.type === 'hunt') { hunt = { first: 0, last: q.list.length - 1, reps: 0, mistakes: 0, busy: false }; paintPointers(0, q.list.length - 1, null); $$('.atile').forEach((b) => b.onclick = () => tapHunt(q, +b.dataset.i)); }
    if (q.type === 'guess') setupGuess(q);
    startTimer();
  }
  function answerMC(i) {
    if (answered) return;
    const q = G.questions[cur];
    $$('.opt').forEach((o) => { const k = +o.dataset.i; if (k === q.answer) o.classList.add('right'); else if (k === i) o.classList.add('wrong'); else o.classList.add('dim'); o.disabled = true; });
    done(i === q.answer);
  }

  /* mid: tap the middle item of first..last */
  function tapMid(q, i) {
    if (answered) return;
    if (i < q.first || i > q.last) { toast('That tile is outside the range'); return; }
    const t = document.querySelector(`.atile[data-i="${i}"]`);
    if (i === q.answer) t.classList.add('found');
    else { t.classList.add('wrong'); document.querySelector(`.atile[data-i="${q.answer}"]`).classList.add('found'); }
    paintPointers(q.first, q.last, q.answer);
    const a = $('.vars .ask b'); if (a) a.textContent = q.answer;
    done(i === q.answer);
  }

  /* hunt: a full Binary Search, one tap per repetition */
  function tapHunt(q, i) {
    if (answered || !hunt || hunt.busy) return;
    const H = hunt;
    if (i < H.first || i > H.last) { toast('That part was already thrown away'); return; }
    const mid = Math.floor((H.first + H.last) / 2);
    const t = document.querySelector(`.atile[data-i="${i}"]`);
    if (i !== mid) {
      H.mistakes++; beep('bad'); buzz();
      t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake');
      $('#hmsg').innerHTML = `Not the middle. mid = (${H.first} + ${H.last}) // 2 = <b>${mid}</b>. Tap it!`;
      const m = document.querySelector(`.atile[data-i="${mid}"]`); m.classList.add('hint');
      return;
    }
    H.reps++; beep('tap');
    $$('.atile').forEach((x) => x.classList.remove('hint', 'midsel'));
    t.classList.add('midsel');
    $('#vm').textContent = mid; $('#vr').textContent = H.reps;
    paintPointers(H.first, H.last, mid);
    const v = q.list[mid];
    if (v === q.key) {
      t.classList.add('found');
      $('#hmsg').innerHTML = `${esc(fmt(q.key))} == myList[${mid}] → <b>Found at index ${mid}</b> in ${H.reps} repetition${H.reps === 1 ? '' : 's'}!`;
      done(H.mistakes === 0, H.mistakes ? `Found it, but ${H.mistakes} tap${H.mistakes === 1 ? ' was' : 's were'} not the middle` : null);
      return;
    }
    H.busy = true;
    if (q.key < v) { $('#hmsg').innerHTML = `${esc(fmt(q.key))} &lt; ${esc(fmt(v))} → drop the right half: <b>last = mid - 1 = ${mid - 1}</b>`; H.last = mid - 1; }
    else { $('#hmsg').innerHTML = `${esc(fmt(q.key))} &gt; ${esc(fmt(v))} → drop the left half: <b>first = mid + 1 = ${mid + 1}</b>`; H.first = mid + 1; }
    setTimeout(() => {
      if (answered) return;
      t.classList.remove('midsel');
      paintPointers(H.first, H.last, null);
      $('#vf').textContent = H.first; $('#vl').textContent = H.last; $('#vm').textContent = '?';
      beep(q.key < v ? 'down' : 'up');
      H.busy = false;
    }, 1100);
  }

  /* guess: higher-or-lower number game */
  function setupGuess(q) {
    const saved = me.guess && me.guess.q === cur ? me.guess : null;
    gs = saved || { q: cur, secret: q.lo + Math.floor(Math.random() * (q.hi - q.lo + 1)), lo: q.lo, hi: q.hi, n: 0, hist: [] };
    me.guess = gs; persist();
    const paint = () => {
      const span = q.hi - q.lo + 1;
      const w = $('#gwin'); w.style.left = ((gs.lo - q.lo) / span * 100) + '%'; w.style.width = ((gs.hi - gs.lo + 1) / span * 100) + '%';
      $('#gcap').innerHTML = `Still possible: <b>${gs.lo} – ${gs.hi}</b> · ${gs.hi - gs.lo + 1} number${gs.hi === gs.lo ? '' : 's'}`;
      $('#gleft').textContent = q.max - gs.n;
      $('#ghist').innerHTML = gs.hist.map((h) => `<span class="${h.d}">${h.v}${h.d === 'up' ? ' ↑' : h.d === 'down' ? ' ↓' : ' ✓'}</span>`).join('');
    };
    paint();
    const inp = $('#gin'); setTimeout(() => inp.focus({ preventScroll: true }), 50);
    $('#gform').onsubmit = (e) => {
      e.preventDefault(); if (answered) return;
      const v = parseInt(inp.value, 10); inp.value = '';
      if (isNaN(v) || v < q.lo || v > q.hi) { toast(`Pick a number from ${q.lo} to ${q.hi}`); return; }
      if (v < gs.lo || v > gs.hi) { toast(`It can't be ${v}: it must be between ${gs.lo} and ${gs.hi}`); buzz(); return; }
      gs.n++;
      const msg = $('#gmsg');
      if (v === gs.secret) {
        gs.hist.push({ v, d: 'hit' }); paint();
        msg.innerHTML = `<b>${v}</b> is right!`; msg.className = 'gmsg hit';
        persist(); done(true, `Found ${v} in ${gs.n} guess${gs.n === 1 ? '' : 'es'}!`); return;
      }
      if (v < gs.secret) { gs.lo = v + 1; gs.hist.push({ v, d: 'up' }); msg.innerHTML = 'Higher! ⬆'; msg.className = 'gmsg up'; beep('up'); }
      else { gs.hi = v - 1; gs.hist.push({ v, d: 'down' }); msg.innerHTML = 'Lower! ⬇'; msg.className = 'gmsg down'; beep('down'); }
      msg.animate([{ transform: 'scale(1.25)' }, { transform: 'none' }], { duration: 350 });
      persist(); paint();
      if (gs.n >= q.max) done(false, `Out of guesses! It was ${gs.secret}`);
    };
  }

  function startTimer() {
    clearInterval(tick);
    const q = G.questions[cur]; const S = secsFor(q); left = S;
    const paint = () => { const r = $('#ring'); if (!r) return; r.style.setProperty('--p', left / S); $('#tm').textContent = left; r.classList.toggle('low', left <= 5); };
    paint();
    tick = setInterval(() => {
      left--; paint();
      if (left > 0 && left <= 5) beep('tick');
      if (left <= 0) {
        clearInterval(tick);
        if (q.type === 'mc') $$('.opt').forEach((o) => { o.disabled = true; o.classList.add(+o.dataset.i === q.answer ? 'right' : 'dim'); });
        if (q.type === 'line') document.querySelector(`.cl[data-l="${q.answer}"]`).classList.add('right');
        if (q.type === 'mid') { const t = document.querySelector(`.atile[data-i="${q.answer}"]`); if (t) t.classList.add('found'); }
        done(false, q.type === 'guess' && gs ? `Time's up! It was ${gs.secret}` : "Time's up!");
      }
    }, 1000);
  }
  function cancelAuto() {
    clearTimeout(autoT); autoT = null;
    const n = $('#next'); if (n) n.classList.remove('auto');
    const s = $('#stay'); if (s) s.remove();
  }
  function done(ok, headline) {
    if (answered) return;
    answered = true; clearInterval(tick);
    const q = G.questions[cur];
    let pts = 0, bonus = 0;
    if (ok) {
      me.streak = (me.streak || 0) + 1; me.best = Math.max(me.best || 0, me.streak);
      pts = G.points + Math.round(50 * Math.max(0, left) / secsFor(q));
      if (me.streak >= 3) bonus = Math.min(60, (me.streak - 2) * 20);
      pts += bonus; me.score += pts; me.correct++;
      revealLetters(G.mystery ? G.mystery.perCorrect : 0);
      beep(bonus ? 'streak' : 'good'); confetti(bonus ? 180 : 110);
    } else { me.streak = 0; beep('bad'); buzz([60, 40, 60]); }
    me.answers[cur] = ok ? 1 : 0; me.q = cur + 1;
    sync();
    bumpScore(); paintStreak();
    const qb = document.querySelector('.qbar i'); if (qb) qb.style.width = (me.q / N) * 100 + '%';
    if (G.mystery) { const t = document.querySelector('#mystery .tiles'); if (t) t.outerHTML = mysteryHTML().match(/<div class="tiles">[\s\S]*?<\/div>/)[0]; }
    const praise = ['Brilliant!', 'Nailed it!', 'Spot on!', 'Sharp thinking!', 'Superb!', 'Genius move!'][cur % 6];
    const last = me.q >= N;
    $('#fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}">
      <h3>${headline ? esc(headline) + (ok ? ' +' + pts : '') : (ok ? praise + ' +' + pts : 'Not this time')}</h3>
      ${bonus ? `<div class="streakmsg">🔥 ${me.streak} in a row! +${bonus} streak bonus</div>` : ''}
      <p><b>Why?</b> ${q.why}</p>
      <div class="row"><button class="btn small ghost" id="stay" type="button">Stay here</button><button class="btn go auto" id="next" style="--d:${AUTO_NEXT}s">${last ? (G.mystery && !me.solved ? 'Final guess →' : 'See my results →') : 'Next question →'}</button></div></div>`;
    $('#next').onclick = () => { cancelAuto(); if (me.q >= N) afterLast(); else renderQ(); };
    $('#stay').onclick = cancelAuto;
    autoT = setTimeout(() => { const n = $('#next'); if (n && n.classList.contains('auto')) n.click(); }, AUTO_NEXT * 1000);
    $('#fb').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.key === 'Enter' && answered && $('#next')) { $('#next').click(); return; }
    if (view !== 'play' || answered) return;
    const q = G.questions[cur];
    const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
    if (k < 0) return;
    const btn = document.querySelector(`.opt[data-i="${k}"]`);
    if (btn && !btn.disabled) btn.click();
    else if (q && q.type === 'mc' && k < q.options.length) answerMC(k);
  });

  /* ---------- warm-up final guess ---------- */
  function afterLast() {
    if (G.mystery && !me.solved && !me.finalTried) return renderFinal();
    finish();
  }
  function renderFinal() {
    view = 'play'; clearInterval(tick); cancelAuto(); answered = true;
    const M = G.mystery;
    app.innerHTML = `${barHTML(true)}${mysteryHTML()}
      <section class="qcard">
        <div class="qhead"><span class="tag n">Final round</span><span class="tag hot">Synthesize</span><span class="tag ctx">+${M.bonus} bonus</span></div>
        <div class="qtext">${M.finalQ}</div>
        <div class="opts">${M.finalOptions.map((o, i) => `<button class="opt o${i}" data-i="${i}" data-k="${'ABCD'[i]}">${esc(o)}</button>`).join('')}</div>
        <div id="fb"></div></section>`;
    bindMystery();
    $$('.opt').forEach((b) => b.onclick = () => {
      if (me.finalTried) return;
      const i = +b.dataset.i, ok = i === M.finalAnswer;
      me.finalTried = true;
      $$('.opt').forEach((o) => { o.disabled = true; const k = +o.dataset.i; o.classList.add(k === M.finalAnswer ? 'right' : k === i ? 'wrong' : 'dim'); });
      if (ok) { me.score += M.bonus; me.solved = true; beep('win'); confetti(220); } else { beep('bad'); buzz(); }
      me.revealed = M.phrase.split('').map((c, k) => c === ' ' ? -1 : k).filter((k) => k >= 0);
      sync(); bumpScore();
      $('#mystery').outerHTML = mysteryHTML();
      $('#fb').innerHTML = `<div class="fb ${ok ? 'good' : 'bad'}"><h3>${ok ? 'Correct! +' + M.bonus : 'The topic is ' + esc(M.finalOptions[M.finalAnswer])}</h3><p>${M.finalWhy}</p><div class="row"><button class="btn go" id="next">See my results →</button></div></div>`;
      $('#next').onclick = finish;
    });
  }

  /* ---------- results ---------- */
  function finish() {
    clearInterval(tick); cancelAuto();
    me.done = true;
    sync({ finishedAt: LIVE.on ? LIVE.now() : Date.now() });
    beep('win'); confetti(260);
    renderResults();
  }
  function rankText() {
    const list = Object.entries(players).map(([id, p]) => ({ id, score: p.score || 0 }));
    if (!LIVE.on || !list.length) return '';
    list.sort((a, b) => b.score - a.score);
    const k = list.findIndex((p) => p.id === me.id);
    if (k < 0) return '';
    return `${k === 0 ? '🏆 ' : ''}#${k + 1} of ${list.length} right now`;
  }
  function paintRank() { const r = $('#rank'); if (r) r.textContent = rankText() || 'Check the shared screen!'; }
  function renderResults() {
    view = 'results'; clearInterval(tick); cancelAuto();
    const answeredCount = Object.keys(me.answers || {}).length;
    const X = G.exit || {};
    const extra = gameId === 'wrapup'
      ? `<div class="exit"><span class="pill">Exit ticket</span>
          <h2 style="font-size:clamp(22px,3vw,30px)">${esc(X.q)}</h2>
          <textarea id="exitT" placeholder="${esc(X.placeholder || '')}">${esc(me.exit || '')}</textarea>
          <button class="btn small go" id="sendExit" type="button" style="justify-self:start">${me.exit ? 'Update my answer' : 'Send my answer'}</button>
          <div class="model" id="model" ${me.exit ? '' : 'hidden'}><b>Model answer:</b> ${esc(X.model)}</div></div>
          ${G.endHTML || ''}`
      : (G.endHTML || '');
    app.innerHTML = `<section class="center"><div class="card">
      <span class="pill">${esc(G.name)}</span>
      <h1 style="font-size:clamp(30px,5vw,48px)">${me.locked && answeredCount < N ? "Time's up, " : 'Well played, '}${esc(me.name)}!</h1>
      <div class="big-score" id="bigScore">0</div>
      <p class="lede" id="rank"></p>
      <div class="res-tiles"><div><small>Correct</small><b>${me.correct}/${N}</b></div><div><small>Best streak</small><b>🔥 ${me.best || 0}</b></div><div><small>${G.mystery ? 'Topic' : 'Accuracy'}</small><b>${G.mystery ? (me.solved ? 'Cracked' : '—') : Math.round((me.correct / N) * 100) + '%'}</b></div></div>
      ${extra}
    </div></section>`;
    // count the big score up
    const el = $('#bigScore'), t0 = performance.now(), target = me.score;
    const step = (t) => { const k = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))); if (k < 1 && el.isConnected) requestAnimationFrame(step); };
    requestAnimationFrame(step);
    paintRank();
    const sb = $('#sendExit');
    if (sb) sb.onclick = () => {
      const t = $('#exitT').value.trim(); if (!t) { toast('Write your answer first'); return; }
      me.exit = t; sync({ exit: t }); $('#model').hidden = false; sb.textContent = 'Update my answer'; toast('Sent to your teacher');
    };
  }
})();
