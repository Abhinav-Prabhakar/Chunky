/* ============================================================
   CHUNKY — app engine
   RSVP chunk reading, comprehension quizzes, stats, themes
   ============================================================ */
'use strict';

/* ---------- tiny DOM helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ---------- state ---------- */
let settings = loadSettings();
let runs = loadJSON(LS.history, []);
if (!Array.isArray(runs)) runs = [];
let unlocked = loadJSON(LS.achievements, []);
if (!Array.isArray(unlocked)) unlocked = [];
let best = migrateBest(loadJSON(LS.best, null));
let readCounts = loadJSON(LS.read, {});
if (!readCounts || typeof readCounts !== 'object') readCounts = {};
let customSaved = loadJSON(LS.custom, { text: '', pos: 0 });
if (!customSaved || typeof customSaved !== 'object') customSaved = { text: '', pos: 0 };
let dailyState = loadJSON(LS.daily, { date: '' });
if (!dailyState || typeof dailyState !== 'object') dailyState = { date: '' };

const statsFilter = { mode: 'all', range: 'all' };
const saveSettings = () => saveJSON(LS.settings, settings);
const persistRuns = () => saveJSON(LS.history, runs);

/* ---------- audio ---------- */
let audioCtx = null;
function blip(freq, dur = 0.04, gain = 0.03, type = 'sine', when = 0) {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch { /* audio unavailable */ }
}
const sfx = {
  tick: () => blip(2100, 0.025, 0.016, 'square'),
  chime: () => { blip(660, 0.14, 0.05, 'sine'); blip(990, 0.22, 0.05, 'sine', 0.13); },
  correct: () => blip(880, 0.09, 0.05, 'sine'),
  wrong: () => blip(165, 0.16, 0.05, 'triangle'),
  unlock: () => { blip(523, 0.12, 0.05); blip(784, 0.12, 0.05, 'sine', 0.1); blip(1046, 0.2, 0.05, 'sine', 0.2); },
};

/* ---------- session state ---------- */
let session = null;
let quiz = null;
let lastPassageId = null;
let rafId = null;
let loopTimer = null;
let lastHudAt = 0;
let lastMarkIdx = -1;
let chunkEls = [];
let measureCtx = null;
let wakeLock = null;
let previewIdx = null;
let lastScrollAt = 0;
let lastTickAt = 0;

/* ============================================================
   THEME
   ============================================================ */
function setMetaTheme() {
  const meta = $('#metaTheme');
  if (!meta) return;
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (bg) meta.setAttribute('content', bg);
}

function applyAccentVars() {
  document.documentElement.style.setProperty('--main', settings.accent);
  document.documentElement.style.setProperty('--on-main', onColor(settings.accent));
  paintFavicon();
}

/* the tab icon is the logo, drawn from whatever the theme is right now */
function paintFavicon() {
  const cs = getComputedStyle(document.documentElement);
  const dim = (cs.getPropertyValue('--dim') || '').trim() || '#646669';
  const main = (cs.getPropertyValue('--main') || '').trim() || '#e2b714';
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'>`
    + `<rect x='2' y='2' width='13' height='13' rx='3.5' fill='${dim}'/>`
    + `<rect x='17' y='2' width='13' height='13' rx='3.5' fill='${dim}'/>`
    + `<rect x='2' y='17' width='13' height='13' rx='3.5' fill='${dim}'/>`
    + `<rect x='17' y='17' width='13' height='13' rx='3.5' fill='${main}'/></svg>`;
  const href = 'data:image/svg+xml,' + encodeURIComponent(svg);
  let link = document.querySelector('link[rel="icon"]');
  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    document.head.appendChild(link);
  }
  link.setAttribute('type', 'image/svg+xml');
  link.setAttribute('href', href);
  if (apple) apple.setAttribute('href', href);
}

function applyTheme(id) {
  if (!THEME_IDS.includes(id)) id = 'monkey';
  document.documentElement.setAttribute('data-theme', id);
  settings.theme = id;
  saveSettings();
  document.documentElement.style.removeProperty('--main');
  document.documentElement.style.removeProperty('--on-main');
  if (id === 'custom') applyAccentVars();
  document.documentElement.style.setProperty('--read-font', settings.fontFamily);
  setMetaTheme();
  paintFavicon();
  $$('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
}

function renderThemeGrid() {
  const cards = THEMES.map(t => {
    const on = t.id === settings.theme;
    return `
    <button class="theme-card${on ? ' active' : ''}" data-id="${t.id}" style="--t-bg:${t.bg};--t-main:${t.main};--t-text:${t.text}" aria-label="theme ${t.name}" aria-pressed="${on}">
      <span class="theme-stage"><span class="theme-word"><span>chu</span><span class="tw-pivot">n</span><span>k</span></span></span>
      <span class="theme-meta">
        <span class="theme-card-name">${t.name}</span>
        <span class="theme-dots"><i style="background:${t.bg}"></i><i style="background:${t.main}"></i><i style="background:${t.text}"></i></span>
      </span>
    </button>`;
  }).join('');
  const customOn = settings.theme === 'custom';
  const custom = `
    <button class="theme-card theme-card-custom${customOn ? ' active' : ''}" data-id="custom" style="--t-bg:#1a1a1e;--t-main:${settings.accent};--t-text:#e6e6ea" aria-label="custom accent theme" aria-pressed="${customOn}">
      <span class="theme-stage"><span class="theme-word"><span>chu</span><span class="tw-pivot">n</span><span>k</span></span></span>
      <span class="theme-meta">
        <span class="theme-card-name">custom</span>
        <span class="theme-dots"><i style="background:#1a1a1e"></i><i style="background:${settings.accent}"></i><i style="background:#e6e6ea"></i></span>
      </span>
    </button>`;
  $('#themeGrid').innerHTML = cards + custom;
  paintAccentUI();
}

function paintAccentUI() {
  const input = $('#setAccent');
  if (input) input.value = settings.accent;
  const val = $('#accentVal');
  if (val) val.textContent = settings.accent;
  $$('#accentPresets [data-accent]').forEach(b => {
    const on = b.dataset.accent.toLowerCase() === settings.accent.toLowerCase();
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
}

function applyAccent(hex) {
  if (!isHex(hex)) return;
  settings.accent = hex.toLowerCase();
  saveSettings();
  if (settings.theme !== 'custom') applyTheme('custom');
  applyAccentVars();
  renderThemeGrid();
}

/* ============================================================
   VIEWS & ROUTING
   ============================================================ */
const VIEWS = ['test', 'quiz', 'results', 'stats'];
const VIEW_HASH = { test: 'practice', quiz: 'quiz', results: 'results', stats: 'stats' };
const VIEW_NAMES = { test: 'practice', quiz: 'comprehension check', results: 'results', stats: 'statistics' };

let booting = true;
function setHash(name) {
  const h = '#' + VIEW_HASH[name];
  if (location.hash === h) return;
  try {
    /* the first route replaces instead of pushing so the back button
       doesn't have to walk through a synthetic entry. */
    if (booting || !location.hash) window.history.replaceState({ view: name }, ' ', h);
    else window.history.pushState({ view: name }, ' ', h);
  } catch { location.hash = h; }
}

function announce(name) {
  const el = $('#viewAnnounce');
  if (!el) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = VIEW_NAMES[name] || name; }, 40);
}

function switchView(name, opts = {}) {
  const target = $('#view-' + name);
  if (!target) return;
  const changed = !target.classList.contains('active');
  VIEWS.forEach(v => $('#view-' + v).classList.toggle('active', v === name));
  const onPractice = name === 'test' || name === 'quiz' || name === 'results';
  const navT = $('#navTest'), navS = $('#navStats');
  navT.classList.toggle('active', onPractice);
  navS.classList.toggle('active', name === 'stats');
  if (onPractice) navT.setAttribute('aria-current', 'page'); else navT.removeAttribute('aria-current');
  if (name === 'stats') navS.setAttribute('aria-current', 'page'); else navS.removeAttribute('aria-current');
  if (name === 'stats') renderStats();
  if (name !== 'test') exitFocus();
  if (opts.hash !== false) setHash(name);
  if (changed) announce(name);
  window.scrollTo({ top: 0 });
}

window.addEventListener('popstate', () => {
  const h = location.hash.replace(/^#/, '');
  if (h === 'stats') switchView('stats', { hash: false });
  else switchView('test', { hash: false });
});

/* ============================================================
   SESSION
   ============================================================ */
function choosePassage(length) {
  let pool = PASSAGES.filter(p => !length || p.length === length);
  const unread = pool.filter(p => !readCounts[p.id]);
  if (unread.length) pool = unread;
  if (pool.length > 1 && lastPassageId) {
    const filtered = pool.filter(p => p.id !== lastPassageId);
    if (filtered.length) pool = filtered;
  }
  return pool[Math.floor(Math.random() * pool.length)] || PASSAGES[0];
}

function todayKey() { return dayKey(new Date()); }

function newSession(opts = {}) {
  stopLoop();
  releaseWakeLock();
  previewIdx = null;
  let mode = opts.daily ? 'passage' : settings.mode;
  let passage = null, body = '', title = '', tier = null;
  const same = !!opts.same;

  if (mode === 'custom') {
    body = String(opts.text ?? customSaved.text ?? '').trim();
    if (!body) {
      if (opts.fromUser) { openCustom(); return; }
      mode = 'passage';
      settings.mode = 'passage';
      saveSettings();
    }
  }

  if (mode !== 'custom') {
    if (opts.daily) {
      const id = dailyPassageId(todayKey());
      passage = PASSAGES.find(p => p.id === id) || PASSAGES[0];
    } else {
      passage = (same && session && session.passage) ? session.passage : choosePassage(mode === 'passage' ? settings.length : null);
    }
    if (passage) {
      body = passage.text;
      title = passage.title;
      tier = passage.length;
      lastPassageId = passage.id;
    }
  } else {
    title = 'custom text';
  }

  const words = body.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return;

  const chunks = buildChunks(words, settings.chunkSize, settings.smartChunks);
  const startIdx = opts.resumePos ? clamp(Math.round(opts.resumePos), 0, chunks.length - 1) : 0;
  const countsDaily = !!opts.daily && dailyState.date !== todayKey();

  session = {
    mode,
    passage,
    passageId: passage ? passage.id : null,
    title,
    tier,
    text: body,
    daily: !!opts.daily,
    countsDaily,
    wpm: settings.wpm,
    chunkSize: settings.chunkSize,
    smart: settings.smartChunks,
    words,
    chunks,
    totalWords: words.length,
    wordOffset: chunks[startIdx] ? chunks[startIdx].start : 0,
    idx: startIdx,
    wordsRead: 0,
    status: 'idle',
    elapsedMs: 0,
    bankedMs: 0,
    startStamp: 0,
    remainingMs: 0,
    nextChunkAt: 0,
    chunkStartAt: 0,
    chunkDur: 0,
    limitMs: mode === 'time' ? settings.timeLimit * 1000 : null,
    samples: [],
    finalWpm: 0,
    finalSecs: 0,
    quizReview: null,
    peakWpm: 0,
  };

  renderPassageText();
  $('#passage').scrollTop = 0;
  lastMarkIdx = -1;
  renderChunk(startIdx, { force: true });
  updateProgress(startIdx);
  renderHUD();
  setOverlay('idle');
  updateTransport();
  switchView('test');
  const c0 = session.chunks[session.idx];
  if (c0) fitChunk(c0.text);
  refreshDailyButton();
  syncPills();
}

/* ---------- rendering the reading surface ---------- */
function renderPassageText() {
  const container = $('#passage');
  container.innerHTML = session.chunks
    .map((c, i) => `<span class="ck" data-i="${i}">${escapeHTML(c.text)} </span>`)
    .join('');
  chunkEls = $$('.ck', container);
  lastMarkIdx = -1;
}

function setChunkDisplay(pre, piv, post) {
  $('#chunkPre').textContent = pre;
  $('#chunkPivot').textContent = piv;
  $('#chunkPost').textContent = post;
}

function fitChunk(text) {
  const stage = $('#stage');
  const line = $('#rsvpLine');
  if (!stage || !line) return;
  const base = settings.fontSize;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = `500 ${base}px ${settings.fontFamily}`;
  const textWidth = measureCtx.measureText(text).width + Math.max(16, base * 0.25);
  const avail = Math.max(140, stage.clientWidth - 72);
  const scale = Math.min(1, avail / Math.max(1, textWidth));
  const size = Math.max(16, Math.floor(base * scale));
  line.style.setProperty('--fit-size', size + 'px');
}

function renderChunk(i, opts = {}) {
  if (!session) return;
  const c = session.chunks[i];
  if (!c) return;
  const p = orpIndex(c.text);
  setChunkDisplay(c.text.slice(0, p), c.text.slice(p, p + 1), c.text.slice(p + 1));
  fitChunk(c.text);
  markPassageProgress(i, opts.force);
  updateProgress(i);
}

function markPassageProgress(i, force = false) {
  if (!chunkEls.length) return;
  const cur = chunkEls[i];
  if (!cur) return;
  if (lastMarkIdx >= 0 && lastMarkIdx < i) {
    for (let k = lastMarkIdx; k < i; k++) {
      const el = chunkEls[k];
      if (el) { el.classList.remove('current'); el.classList.add('done'); }
    }
  } else if (lastMarkIdx > i) {
    for (let k = i; k <= lastMarkIdx; k++) {
      const el = chunkEls[k];
      if (el) { el.classList.remove('done', 'current'); }
    }
  } else if (lastMarkIdx === i) {
    return;
  } else if (lastMarkIdx >= 0 && chunkEls[lastMarkIdx]) {
    chunkEls[lastMarkIdx].classList.remove('current');
  }
  cur.classList.remove('done');
  cur.classList.add('current');
  lastMarkIdx = i;
  /* scrolling costs layout; at 1000+ wpm the passage box cannot keep up
     with every chunk anyway, so ease it along a few times a second. */
  const now = performance.now();
  if (settings.showPassage && (force || now - lastScrollAt > 110)) {
    lastScrollAt = now;
    const box = $('#passage');
    box.scrollTop = Math.max(0, cur.offsetTop - box.clientHeight / 2 + cur.offsetHeight / 2);
  }
}

function updateProgress(i) {
  if (!session) return;
  const pct = session.chunks.length ? clamp((i / session.chunks.length) * 100, 0, 100) : 0;
  $('#progressFill').style.width = pct.toFixed(2) + '%';
  $('#progressTrack').setAttribute('aria-valuenow', Math.round(pct));
}

function renderHUD() {
  if (!session) return;
  const total = session.chunks.length;
  const pos = Math.min(session.idx + (session.status === 'running' ? 1 : 0), total);
  $('#hudChunk').textContent = `${pos} / ${total}`;
  const secs = session.elapsedMs / 1000;
  const wpm = secs > 0.15 ? Math.round(session.wordsRead / (secs / 60)) : 0;
  $('#hudWpm').textContent = fmtInt(wpm);
  const timeEl = $('#hudTime');
  const timeLabel = $('#hudTimeLabel');
  if (session.limitMs) {
    if (timeLabel) timeLabel.textContent = ' left';
    const remain = Math.max(0, session.limitMs - session.elapsedMs);
    timeEl.textContent = fmtClock(remain / 1000);
    timeEl.style.color = remain < 10000 ? 'var(--error)' : '';
  } else {
    if (timeLabel) timeLabel.textContent = '';
    timeEl.textContent = fmtClock(secs);
    timeEl.style.color = '';
  }
}

/* ---------- overlay & transport ---------- */
function setOverlay(state) {
  const overlay = $('#stageOverlay');
  const title = $('#overlayTitle');
  const sub = $('#overlaySub');
  if (!overlay) return;
  if (state === 'hidden') { overlay.classList.add('hidden-hard'); return; }
  overlay.classList.remove('hidden-hard');
  if (!session) return;
  if (state === 'idle') {
    if (session.mode === 'zen') {
      title.innerHTML = 'press <kbd>space</kbd> to begin';
      sub.textContent = 'no timer — space steps one chunk at a time.';
    } else if (session.mode === 'time') {
      title.innerHTML = `press <kbd>space</kbd> — ${settings.timeLimit} seconds`;
      sub.textContent = 'the passage keeps coming; questions follow from what you read.';
    } else if (session.mode === 'custom') {
      title.innerHTML = 'press <kbd>space</kbd> to start';
      sub.textContent = 'your own text at full speed — no quiz.';
    } else if (session.mode === 'ramp') {
      title.innerHTML = 'press <kbd>space</kbd> to start';
      sub.textContent = 'the pace climbs as you go. stay ahead of it.';
    } else if (session.daily) {
      title.innerHTML = 'press <kbd>space</kbd> for today\'s challenge';
      sub.textContent = 'one fixed passage, fixed settings.';
    } else {
      title.innerHTML = 'press <kbd>space</kbd> to start';
      sub.textContent = 'let the words come to you.';
    }
  } else if (state === 'paused') {
    title.innerHTML = 'paused';
    sub.textContent = 'space to resume · esc to quit';
  }
}

function updateTransport(opts = {}) {
  const zen = !!session && session.mode === 'zen';
  const transport = $('#transport');
  if (transport) transport.classList.toggle('hidden', !zen);
  const target = $('#targetWpm');
  if (target) target.innerHTML = `${fmtInt(settings.wpm)}<small>wpm</small>`;
  const chunkVal = $('#targetChunk');
  if (chunkVal) chunkVal.textContent = settings.chunkSize;
  syncSpeedUI(opts);
}

function syncSpeedUI(opts = {}) {
  const range = $('#wpmRange');
  if (range) {
    if (!opts.skipRange) range.value = String(wpmToSlider(settings.wpm));
    range.style.setProperty('--fill', `${wpmToSlider(settings.wpm)}%`);
    range.setAttribute('aria-valuetext', `${fmtInt(settings.wpm)} words per minute`);
  }
  const chunkDown = $('#chunkDown');
  if (chunkDown) chunkDown.disabled = settings.chunkSize <= 1;
  const chunkUp = $('#chunkUp');
  if (chunkUp) chunkUp.disabled = settings.chunkSize >= 4;
}

/* ---------- timing ---------- */
function durationFor(chunk, idx) {
  const total = session.chunks.length;
  const wpm = effectiveWpm(session.mode, session.wpm, idx, total);
  let ms = (chunk.wordCount / wpm) * 60000;
  if (settings.punct) ms *= punctMultiplier(chunk.text, settings.punctStrength);
  if (settings.ramp && session.mode !== 'zen' && session.mode !== 'ramp') {
    const rampLen = Math.max(3, Math.floor(total * 0.25));
    const k = clamp(idx / rampLen, 0, 1);
    ms *= 1.55 - 0.55 * easeOut(k);
  }
  return clamp(ms, 12, 20000);
}

function loop() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
  if (loopTimer != null) { clearTimeout(loopTimer); loopTimer = null; }
  if (!session || session.status !== 'running') return;
  const now = performance.now();
  session.elapsedMs = session.bankedMs + (now - session.startStamp);

  if (session.limitMs && session.elapsedMs >= session.limitMs) {
    /* bank exactly at the limit so finalSecs isn't a few ms over */
    session.bankedMs = session.limitMs;
    session.startStamp = now;
    session.elapsedMs = session.limitMs;
    renderHUD();
    return finishSession();
  }

  if (session.mode !== 'zen') {
    let guard = 0;
    while (session.status === 'running' && now >= session.nextChunkAt && guard++ < 30) advanceChunk();
  }

  if (now - lastHudAt > 100) { renderHUD(); lastHudAt = now; }
  if (session.status === 'running') scheduleLoop();
}

/* rAF plus a timer fallback: some tabs throttle rAF to zero even when
   visible, and a frozen timer would look like a frozen session. */
function scheduleLoop() {
  if (rafId == null) rafId = requestAnimationFrame(loop);
  if (loopTimer == null) {
    loopTimer = setTimeout(() => {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      loop();
    }, 120);
  }
}
function startLoop() { scheduleLoop(); }
function stopLoop() {
  if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
  if (loopTimer != null) { clearTimeout(loopTimer); loopTimer = null; }
}

function startReading() {
  if (!session) return;
  if (session.status !== 'idle' && session.status !== 'paused') return;
  const resuming = session.status === 'paused';
  session.status = 'running';
  if (!resuming) {
    session.bankedMs = 0;
    session.startStamp = performance.now();
    session.elapsedMs = 0;
    session.samples = [];
    session.wordsRead = 0;
    const now = performance.now();
    session.chunkStartAt = now;
    session.chunkDur = session.mode === 'zen' ? Infinity : durationFor(session.chunks[session.idx], session.idx);
    session.nextChunkAt = session.mode === 'zen' ? Infinity : now + session.chunkDur;
    renderChunk(session.idx, { force: true });
  } else {
    const now = performance.now();
    session.startStamp = now;
    session.chunkStartAt = now;
    session.chunkDur = session.mode === 'zen' ? Infinity : Math.max(12, session.remainingMs);
    session.nextChunkAt = session.mode === 'zen' ? Infinity : now + session.chunkDur;
    if (previewIdx != null) { previewIdx = null; renderChunk(session.idx, { force: true }); }
  }
  setOverlay('hidden');
  updateTransport();
  renderHUD();
  requestWakeLock();
  startLoop();
}

function pauseReading() {
  if (!session || session.status !== 'running') return;
  session.elapsedMs = session.bankedMs + (performance.now() - session.startStamp);
  session.bankedMs = session.elapsedMs;
  session.remainingMs = session.mode === 'zen' ? Infinity : Math.max(12, session.nextChunkAt - performance.now());
  session.status = 'paused';
  stopLoop();
  releaseWakeLock();
  renderChunk(session.idx, { force: true });
  setOverlay('paused');
  updateTransport();
  renderHUD();
  if (session.mode === 'custom') saveCustom(session.text, session.idx);
}

function toggleStartPause() {
  if (!session) return;
  if (session.status === 'running') pauseReading();
  else if (session.status === 'idle' || session.status === 'paused') startReading();
}

function advanceChunk() {
  if (!session || session.status !== 'running') return;
  const c = session.chunks[session.idx];
  if (!c) return finishSession();
  session.wordsRead = Math.max(session.wordsRead, c.end - (session.wordOffset || 0));
  session.samples.push({ t: Math.max(1, Math.round(session.elapsedMs)), w: session.wordsRead });
  session.idx++;
  if (session.idx >= session.chunks.length) {
    $('#progressFill').style.width = '100%';
    $('#progressTrack').setAttribute('aria-valuenow', 100);
    return finishSession();
  }
  renderChunk(session.idx);
  const dur = durationFor(session.chunks[session.idx], session.idx);
  const now = performance.now();
  session.chunkStartAt = now;
  session.chunkDur = dur;
  /* schedule from the ideal boundary so high speeds don't drift, but never
     let a background-stalled tab dump a huge burst of chunks at once. */
  session.nextChunkAt = Math.max(now - 4, session.nextChunkAt) + dur;
  if (settings.sound && now - lastTickAt > 90) { lastTickAt = now; sfx.tick(); }
}

function zenAdvance() {
  if (!session || session.mode !== 'zen') return;
  if (session.status === 'idle' || session.status === 'paused') { startReading(); return; }
  if (session.status !== 'running') return;
  session.elapsedMs = session.bankedMs + (performance.now() - session.startStamp);
  advanceChunk();
  renderHUD();
}

function zenPrev() {
  if (!session || session.mode !== 'zen' || session.idx === 0) return;
  if (session.status === 'running') pauseReading();
  session.idx--;
  session.wordsRead = Math.max(0, session.chunks[session.idx].start - (session.wordOffset || 0));
  renderChunk(session.idx, { force: true });
  updateProgress(session.idx);
  renderHUD();
  setOverlay('hidden');
}

/* transport "next": start the clock if needed, then step forward. */
function zenNext() {
  if (!session || session.mode !== 'zen') return;
  if (session.status !== 'running') startReading();
  if (!session || session.status !== 'running') return;
  session.elapsedMs = session.bankedMs + (performance.now() - session.startStamp);
  advanceChunk();
  renderHUD();
}

function previewPrev() {
  if (!session) return;
  if (session.status === 'running') pauseReading();
  if (session.idx === 0) return;
  const target = session.idx - 1;
  previewIdx = target;
  renderChunk(target, { force: true });
  setOverlay('hidden');
}

function abortSession() {
  if (!session) return;
  stopLoop();
  releaseWakeLock();
  const text = session.mode === 'custom' ? session.text : null;
  const pos = session.mode === 'custom' ? session.idx : 0;
  if (text) saveCustom(text, pos);
  newSession({ same: true, text, resumePos: pos });
}

function restartSame() {
  const text = session && session.mode === 'custom' ? session.text : null;
  newSession({ same: true, text });
}

/* ---------- finish & quiz handoff ---------- */
function finishSession() {
  if (!session || session.status === 'done') return;
  stopLoop();
  releaseWakeLock();
  if (session.status === 'running') {
    session.elapsedMs = session.bankedMs + (performance.now() - session.startStamp);
  }
  session.status = 'done';
  const raw = session.elapsedMs / 1000;
  const secs = Math.max(session.mode === 'zen' ? 1 : 0.5, raw);
  session.finalSecs = secs;
  session.finalWpm = Math.round(session.wordsRead / (secs / 60));
  session.peakWpm = session.mode === 'ramp'
    ? Math.round(effectiveWpm('ramp', session.wpm, session.chunks.length, session.chunks.length))
    : session.finalWpm;
  updateTransport();
  const eligible = eligibleQuestions();
  if (eligible.length) startQuiz(eligible);
  else finalizeResults(null);
  sfx.chime();
}

function eligibleQuestions() {
  if (!session || !session.passage) return [];
  if (session.mode === 'time') {
    const frac = session.totalWords ? session.wordsRead / session.totalWords : 0;
    let picked = session.passage.questions.filter(q => q.at <= frac + 0.02);
    if (!picked.length) {
      const sorted = [...session.passage.questions].sort((a, b) => Math.abs(a.at - frac) - Math.abs(b.at - frac));
      picked = [sorted[0]];
    }
    return picked.slice(0, 3);
  }
  return session.passage.questions;
}

/* ============================================================
   QUIZ
   ============================================================ */
function startQuiz(items, opts = {}) {
  if (!items || !items.length) return finalizeResults(null);
  if (!session) return;
  session.status = 'quiz';
  quiz = { items, i: 0, correct: 0, locked: false, answers: [], drill: !!opts.drill };
  switchView('quiz');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const { items, i } = quiz;
  const item = items[i];
  if (!item) return finishQuiz();
  $('#quizCount').textContent = `question ${i + 1} / ${items.length}`;
  $('#quizQuestion').textContent = item.q;
  $('#quizScorePreview').textContent = quiz.correct ? `${quiz.correct} correct so far` : '';
  const why = $('#quizWhy');
  why.classList.add('hidden');
  why.innerHTML = '';
  $('#quizOptions').innerHTML = item.options.map((opt, idx) => `
    <button class="quiz-opt" data-idx="${idx}" type="button" role="radio" aria-checked="false">
      <span class="opt-key">${idx + 1}</span><span>${escapeHTML(opt)}</span>
    </button>`).join('');
  setTimeout(() => { const q = $('#quizQuestion'); if (q) q.focus({ preventScroll: true }); }, 30);
}

function answerQuiz(choice) {
  if (!quiz || quiz.locked) return;
  const { items, i } = quiz;
  const item = items[i];
  if (!item) return;
  quiz.locked = true;
  const buttons = $$('.quiz-opt', $('#quizOptions'));
  buttons.forEach(b => { b.disabled = true; b.setAttribute('aria-checked', 'false'); });
  const isCorrect = choice === item.answer;
  if (isCorrect) { quiz.correct++; sfx.correct(); } else sfx.wrong();
  quiz.answers.push({ question: item, choice, correct: isCorrect });
  buttons.forEach(b => {
    const idx = Number(b.dataset.idx);
    if (idx === item.answer) { b.classList.add('correct'); b.setAttribute('aria-checked', 'true'); }
    else if (idx === choice) b.classList.add('wrong');
  });
  $('#quizScorePreview').textContent = isCorrect ? 'correct.' : 'not quite.';
  const why = $('#quizWhy');
  why.innerHTML = `<strong>${isCorrect ? 'correct' : 'not quite'}</strong> — ${escapeHTML(item.why || '')}`;
  why.classList.remove('hidden');
  setTimeout(() => {
    if (!quiz) return;
    if (i + 1 < items.length) { quiz.i++; quiz.locked = false; renderQuizQuestion(); }
    else finishQuiz();
  }, isCorrect ? 850 : 1300);
}

function finishQuiz() {
  if (!quiz) return;
  const total = quiz.items.length;
  const correct = quiz.correct;
  const answers = quiz.answers;
  const drill = quiz.drill;
  quiz = null;
  if (drill) {
    if (session) session.status = 'done';
    switchView('results');
    return;
  }
  if (session) session.quizReview = answers;
  finalizeResults(total ? correct / total : 0);
}

/* ============================================================
   RESULTS
   ============================================================ */
function finalizeResults(comp01) {
  if (!session) return;
  const secs = session.finalSecs;
  const wpm = session.finalWpm;
  const comp = comp01 == null ? null : Math.round(comp01 * 100);
  const eff = scoreSession(wpm, comp);
  const focus = focusScore(wpm, comp);

  const entry = {
    id: uid(),
    ts: Date.now(),
    mode: session.mode,
    wpm,
    eff,
    comp,
    chunkSize: session.chunkSize,
    words: session.wordsRead,
    secs: Math.round(secs),
    title: session.title,
    passageId: session.passageId,
    tier: session.tier,
    daily: !!session.countsDaily,
    peakWpm: session.mode === 'ramp' ? session.peakWpm : undefined,
  };
  runs.push(entry);
  if (runs.length > 500) runs = runs.slice(-500);
  persistRuns();

  if (session.passageId) {
    readCounts[session.passageId] = (readCounts[session.passageId] || 0) + 1;
    saveJSON(LS.read, readCounts);
  }
  if (session.countsDaily) {
    dailyState = { date: todayKey() };
    saveJSON(LS.daily, dailyState);
  }
  if (session.mode === 'custom') saveCustom(session.text, 0);

  let isPB = false;
  if (session.mode !== 'zen') {
    const key = bestKey(session.mode, session.chunkSize);
    const prev = best.keys[key];
    if (!prev || eff > prev.score) {
      best.keys[key] = {
        score: eff,
        label: `${fmtInt(eff)} ${comp == null ? 'wpm' : 'effective wpm'}`,
        ts: Date.now(),
      };
      saveJSON(LS.best, best);
      isPB = true;
    }
  }

  const newly = checkAchievements();
  const earned = [];
  if (isPB) earned.push('new personal best for this setup');
  newly.forEach(a => earned.push(`achievement unlocked — ${a.name}`));
  if (goalJustReached(entry)) earned.push(`daily goal reached — ${fmtInt(wordsToday())} words`);
  session.earned = earned;

  paintResults({ wpm, eff, comp, focus, secs, entry, isPB });
  session.status = 'done';
  refreshDailyButton();
}

function paintResults({ wpm, eff, comp, focus, secs, entry, isPB }) {
  const modeCopy = session.daily ? 'daily challenge complete'
    : session.mode === 'zen' ? 'zen session complete'
      : session.mode === 'custom' ? 'custom text complete'
        : session.mode === 'ramp' ? 'ramp complete'
          : session.mode === 'time' ? `time — ${Math.round((session.limitMs || 0) / 1000)}s complete`
            : 'session complete';
  $('#resEyebrow').textContent = modeCopy;
  $('#resWpm').textContent = wpm;
  $('#resEff').textContent = comp == null ? '—' : eff;
  $('#resComp').textContent = comp == null ? '—' : comp + '%';
  $('#resTime').textContent = fmtClock(secs);
  $('#resWords').textContent = fmtInt(session.wordsRead);
  $('#resChunk').textContent = session.chunkSize + 'w';
  $('#resFocus').textContent = focus;
  $('#resPbBadge').classList.toggle('hidden', !isPB);
  showNote('#resAchieved', (session.earned || []).join(' · '), 'ok');
  $('#resNote').textContent = comp == null
    ? (session.mode === 'ramp'
      ? `ramp finished at ${session.peakWpm} wpm — your top speed this run. no comprehension check, so the wpm is raw.`
      : 'no comprehension check in this mode — speed is raw.')
    : (session.mode === 'ramp'
      ? `you finished at ${session.peakWpm} wpm · effective wpm = wpm × comprehension · focus score blends accuracy and speed.`
      : 'effective wpm = wpm × comprehension · focus score blends accuracy and speed.');

  const pool = runs.filter(r => r.id !== entry.id && r.mode === session.mode && r.chunkSize === session.chunkSize && r.comp != null);
  if (!pool.length) {
    $('#resCompare').textContent = 'first scored run at this mode and chunk size — this is your baseline.';
  } else {
    const med = median(pool.map(r => r.eff == null ? r.wpm : r.eff));
    const metric = comp == null ? wpm : eff;
    const diff = Math.round(metric - med);
    if (diff === 0) $('#resCompare').textContent = `right on your median (${fmtInt(med)}) for this setup.`;
    else $('#resCompare').textContent = `${diff > 0 ? 'up' : 'down'} ${fmtInt(Math.abs(diff))} vs your median (${fmtInt(med)}) for this setup.`;
  }

  renderReview();
  switchView('results');
  deferDraw(() => drawSessionChart(entry));
}

function renderReview() {
  const box = $('#resReview');
  const rev = session && session.quizReview;
  if (!rev || !rev.length) {
    box.classList.add('hidden');
    $('#resReviewList').innerHTML = '';
    $('#btnDrill').classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  box.open = false;
  $('#resReviewList').innerHTML = rev.map((a, i) => {
    const q = a.question;
    return `<div class="review-item ${a.correct ? 'ok' : 'bad'}">
      <div class="review-q"><span class="review-num">${i + 1}</span>${escapeHTML(q.q)}</div>
      <div class="review-line"><span class="review-tag">you</span>${escapeHTML(q.options[a.choice] ?? '—')}</div>
      ${a.correct ? '' : `<div class="review-line"><span class="review-tag ok">answer</span>${escapeHTML(q.options[q.answer])}</div>`}
      <div class="review-why">${escapeHTML(q.why || '')}</div>
    </div>`;
  }).join('');
  const missed = rev.filter(a => !a.correct).length;
  $('#btnDrill').classList.toggle('hidden', missed === 0);
}

/* draw after layout, but never depend on rAF alone: a backgrounded tab can
   freeze it, and a chart that never paints looks broken. */
function deferDraw(fn) {
  let done = false;
  const run = () => { if (!done) { done = true; fn(); } };
  requestAnimationFrame(run);
  setTimeout(run, 90);
}

/* ============================================================
   CHARTS
   ============================================================ */
const chartState = {};
function niceCeil(v, step) { return Math.max(step, Math.ceil(v / step) * step); }
/* Canvas can't parse var() or color-mix(), so resolve the token through a
   probe element and hand back a concrete rgb()/hex string. */
function themeColor(name) {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;color:var(' + name + ')';
  document.body.appendChild(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c || '#808080';
}
/* add an alpha channel to whatever themeColor returned */
function withAlpha(color, a) {
  const C = String(color).trim();
  if (/^#[0-9a-f]{6}$/i.test(C)) return C + Math.round(a * 255).toString(16).padStart(2, '0');
  const m = C.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const p = m[1].split(',').map(s => s.trim());
    return `rgba(${p[0]},${p[1]},${p[2]},${a})`;
  }
  return C;
}

function prepCanvas(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w < 10 || h < 10) return null;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function emptyChart(ctx, w, h, msg) {
  ctx.fillStyle = themeColor('--dim-2');
  ctx.font = '12px "Roboto Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(msg, w / 2, h / 2);
  chartState[ctx.canvas.id] = { points: [] };
}

function drawLineChart(canvas, points, opts = {}) {
  const prepped = prepCanvas(canvas);
  if (!prepped) return;
  const { ctx, w, h } = prepped;
  if (points.length < 2) {
    emptyChart(ctx, w, h, points.length ? 'one point — read a little more' : 'not enough data — read a bit more');
    return;
  }
  const maxY = niceCeil(Math.max(...points.map(p => p.y), 100), 100);
  const padL = 34, padR = 12, padT = 12, padB = 22;
  const iw = w - padL - padR, ih = h - padT - padB;
  const x = i => padL + (i / (points.length - 1)) * iw;
  const y = v => padT + ih - (v / maxY) * ih;

  ctx.font = '10px "Roboto Mono", monospace';
  for (let g = 0; g <= 3; g++) {
    const v = (maxY / 3) * g, yy = y(v);
    ctx.strokeStyle = themeColor('--panel2');
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
    ctx.fillStyle = themeColor('--dim-2');
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(v)), padL - 6, yy + 3);
  }

  const main = themeColor('--main');
  const grad = ctx.createLinearGradient(0, padT, 0, padT + ih);
  grad.addColorStop(0, withAlpha(main, 0.33));
  grad.addColorStop(1, withAlpha(main, 0));
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(x(0), y(points[0].y));
    for (let i = 1; i < points.length; i++) {
      const xc = (x(i - 1) + x(i)) / 2, yc = (y(points[i - 1].y) + y(points[i].y)) / 2;
      ctx.quadraticCurveTo(x(i - 1), y(points[i - 1].y), xc, yc);
    }
    ctx.lineTo(x(points.length - 1), y(points[points.length - 1].y));
  };
  path();
  ctx.lineTo(x(points.length - 1), padT + ih);
  ctx.lineTo(x(0), padT + ih);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  path();
  ctx.strokeStyle = main; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

  if (opts.hline != null) {
    const hy = y(opts.hline);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = themeColor('--dim-2');
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, hy); ctx.lineTo(w - padR, hy); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = themeColor('--dim-2');
    ctx.textAlign = 'right';
    ctx.font = '10px "Roboto Mono", monospace';
    ctx.fillText(`median ${Math.round(opts.hline)}`, w - padR, hy - 4);
  }

  const lx = x(points.length - 1), ly = y(points[points.length - 1].y);
  ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fillStyle = main; ctx.fill();

  chartState[canvas.id] = {
    points: points.map((p, i) => ({ x: x(i), y: y(p.y), label: p.label || `${Math.round(p.y)} wpm` })),
  };
}

function drawBarChart(canvas, values) {
  const prepped = prepCanvas(canvas);
  if (!prepped) return;
  const { ctx, w, h } = prepped;
  if (values.length < 3) { emptyChart(ctx, w, h, 'a few more sessions and a shape appears'); return; }
  const lo = Math.floor(Math.min(...values) / 50) * 50;
  const hi = Math.max(lo + 150, Math.ceil(Math.max(...values) / 50) * 50);
  const n = Math.max(3, Math.round((hi - lo) / 50));
  const buckets = new Array(n).fill(0);
  values.forEach(v => buckets[clamp(Math.floor((v - lo) / 50), 0, n - 1)]++);
  const maxC = Math.max(...buckets);
  const padL = 8, padR = 8, padT = 10, padB = 20;
  const iw = w - padL - padR, ih = h - padT - padB;
  const bw = iw / n;
  const main = themeColor('--main');
  buckets.forEach((c, i) => {
    const bh = (c / maxC) * ih;
    ctx.fillStyle = c ? main : themeColor('--panel2');
    ctx.globalAlpha = c ? 0.85 : 1;
    ctx.fillRect(padL + i * bw + 2, padT + ih - bh, Math.max(2, bw - 4), bh);
    ctx.globalAlpha = 1;
  });
  ctx.fillStyle = themeColor('--dim-2');
  ctx.font = '10px "Roboto Mono", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${lo} wpm`, padL, h - 5);
  ctx.textAlign = 'right';
  ctx.fillText(`${hi} wpm`, w - padR, h - 5);
}

function drawScatter(canvas, pts) {
  const prepped = prepCanvas(canvas);
  if (!prepped) return;
  const { ctx, w, h } = prepped;
  if (pts.length < 3) { emptyChart(ctx, w, h, 'scored sessions will land here'); return; }
  const padL = 26, padR = 10, padT = 10, padB = 22;
  const iw = w - padL - padR, ih = h - padT - padB;
  const maxX = niceCeil(Math.max(...pts.map(p => p.x), 100), 100);
  const x = v => padL + (v / maxX) * iw;
  const y = v => padT + ih - (v / 100) * ih;
  ctx.strokeStyle = themeColor('--panel2');
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + ih); ctx.lineTo(w - padR, padT + ih); ctx.stroke();
  ctx.font = '10px "Roboto Mono", monospace';
  ctx.fillStyle = themeColor('--dim-2');
  ctx.textAlign = 'right';
  ctx.fillText('100%', padL - 4, padT + 8);
  ctx.fillText('0%', padL - 4, padT + ih);
  ctx.textAlign = 'right';
  ctx.fillText(`${maxX} wpm`, w - padR, h - 5);
  const main = themeColor('--main');
  pts.forEach(p => {
    ctx.beginPath();
    ctx.arc(x(p.x), y(p.y), 3, 0, Math.PI * 2);
    ctx.fillStyle = main;
    ctx.globalAlpha = 0.75;
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawSessionChart(entry) {
  const canvas = $('#resChart');
  if (!canvas || !session) return;
  const s = session.samples;
  const pts = [];
  for (let i = 3; i < s.length; i++) {
    const dt = (s[i].t - s[i - 3].t) / 60000;
    if (dt > 0.005) pts.push({ y: Math.round((s[i].w - s[i - 3].w) / dt) });
  }
  if (pts.length < 2 && session.finalWpm > 0) {
    pts.length = 0;
    pts.push({ y: session.finalWpm }, { y: session.finalWpm });
  }
  if (!pts.length) { emptyChart(canvas.getContext('2d'), canvas.clientWidth, canvas.clientHeight, 'no samples — session was too short'); return; }
  const pool = runs.filter(r => r.id !== (entry && entry.id) && r.mode === session.mode && r.chunkSize === session.chunkSize && r.comp != null);
  const hline = pool.length ? median(pool.map(r => r.eff == null ? r.wpm : r.eff)) : null;
  drawLineChart(canvas, pts, { hline });
}

function shortDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function drawStatsCharts() {
  const list = filteredRuns();
  const last30 = list.slice(-30);
  drawLineChart($('#statsChart'), last30.map(r => ({ y: r.wpm, label: `${r.wpm} wpm · ${shortDate(r.ts)}` })));
  drawBarChart($('#distChart'), list.map(r => r.wpm));
  drawScatter($('#scatterChart'), list.filter(r => r.comp != null).map(r => ({ x: r.wpm, y: r.comp })));
  $('#statsChartText').textContent = list.length
    ? `${list.length} sessions, average ${fmtInt(list.reduce((a, r) => a + r.wpm, 0) / list.length)} words per minute.`
    : 'No sessions match this filter yet.';
}

function showChartTip(canvas, e) {
  const st = chartState[canvas.id];
  const wrap = canvas.closest('.chart-wrap');
  if (!st || !st.points || !st.points.length || !wrap) return;
  const tip = wrap.querySelector('.chart-tip');
  if (!tip) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  let best = 0, bd = Infinity;
  st.points.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = i; } });
  const p = st.points[best];
  tip.textContent = p.label;
  tip.classList.remove('hidden');
  tip.style.left = clamp(p.x, 34, rect.width - 34) + 'px';
  tip.style.top = Math.max(4, p.y - 30) + 'px';
}
function hideChartTip(canvas) {
  const wrap = canvas.closest('.chart-wrap');
  const tip = wrap && wrap.querySelector('.chart-tip');
  if (tip) tip.classList.add('hidden');
}

/* ============================================================
   STATS
   ============================================================ */
function filteredRuns() {
  let list = runs;
  if (statsFilter.mode !== 'all') list = list.filter(r => r.mode === statsFilter.mode);
  if (statsFilter.range !== 'all') {
    const cut = Date.now() - Number(statsFilter.range) * 86400000;
    list = list.filter(r => r.ts >= cut);
  }
  return list;
}

function wordsToday() {
  const k = todayKey();
  return runs.filter(r => dayKey(new Date(r.ts)) === k).reduce((a, r) => a + (r.words || 0), 0);
}

function goalJustReached(entry) {
  if (!settings.goal) return false;
  const total = wordsToday();
  return total >= settings.goal && total - (entry.words || 0) < settings.goal;
}

function renderGoal() {
  const words = wordsToday();
  const goal = settings.goal;
  const bar = $('#goalBar');
  const track = $('#goalTrack');
  if (!goal) {
    $('#goalText').textContent = 'goal off — set one in settings';
    bar.style.width = '0%';
    track.setAttribute('aria-valuenow', 0);
    return;
  }
  const pct = clamp((words / goal) * 100, 0, 100);
  $('#goalText').textContent = `${fmtInt(words)} / ${fmtInt(goal)} words${pct >= 100 ? ' · done' : ''}`;
  bar.style.width = pct.toFixed(1) + '%';
  track.setAttribute('aria-valuenow', Math.round(pct));
}

function renderChunkTable() {
  const list = filteredRuns().filter(r => r.comp != null);
  const rows = [];
  for (let size = 1; size <= 4; size++) {
    const group = list.filter(r => r.chunkSize === size);
    if (!group.length) {
      rows.push(`<tr class="${settings.chunkSize === size ? 'current' : ''}"><td>${size}w</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`);
      continue;
    }
    const wpm = group.reduce((a, r) => a + r.wpm, 0) / group.length;
    const comp = group.reduce((a, r) => a + r.comp, 0) / group.length;
    const eff = group.reduce((a, r) => a + (r.eff == null ? r.wpm : r.eff), 0) / group.length;
    rows.push(`<tr class="${settings.chunkSize === size ? 'current' : ''}"><td>${size}w</td><td>${group.length}</td><td>${fmtInt(wpm)}</td><td>${Math.round(comp)}%</td><td class="accent">${fmtInt(eff)}</td></tr>`);
  }
  $('#chunkBody').innerHTML = rows.join('');
}

function renderHeatmap() {
  const counts = {};
  runs.forEach(e => {
    const k = dayKey(new Date(e.ts));
    counts[k] = (counts[k] || 0) + 1;
  });
  const WEEKS = 26;
  const CELLS = WEEKS * 7;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const first = new Date(today);
  first.setDate(today.getDate() - (CELLS - 1));
  const leading = first.getDay();
  const hm = $('#heatmap');
  hm.innerHTML = '';

  const totalSessions = Object.values(counts).reduce((a, n) => a + n, 0);
  hm.setAttribute('role', 'img');
  hm.setAttribute('aria-label', `${totalSessions} sessions over the last ${WEEKS} weeks`);

  for (let i = 0; i < leading; i++) hm.insertAdjacentHTML('beforeend', '<span class="heat-cell l0" style="visibility:hidden"></span>');
  const monthFirsts = [];
  for (let i = 0; i < CELLS; i++) {
    const d = new Date(first);
    d.setDate(first.getDate() + i);
    if (d > today) break;
    const k = dayKey(d);
    const n = counts[k] || 0;
    const lvl = n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4;
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    hm.insertAdjacentHTML('beforeend',
      `<span class="heat-cell l${lvl}" data-day="${k}" title="${n} session${n === 1 ? '' : 's'} — ${label}" aria-label="${label}: ${n} session${n === 1 ? '' : 's'}"></span>`);
    if (d.getDate() === 1 || i === 0) monthFirsts.push({ col: Math.floor((leading + i) / 7), label: d.toLocaleDateString('en-US', { month: 'short' }) });
  }
  const months = $('#heatmapMonths');
  months.style.position = 'relative';
  months.innerHTML = monthFirsts.map(m => `<span style="position:absolute; left:calc(${m.col} * 15px)">${m.label}</span>`).join('');
}

function renderAchievements() {
  $('#achProgress').textContent = `${unlocked.length} / ${ACHIEVEMENTS.length} unlocked`;
  $('#achGrid').innerHTML = ACHIEVEMENTS.map(a => {
    const got = unlocked.includes(a.id);
    return `
    <div class="ach${got ? '' : ' locked'}">
      <div class="ach-badge">${got
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8.21 13 6 22l6-3 6 3-2.21-9"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'}
      </div>
      <div><div class="ach-name">${a.name}</div><div class="ach-desc">${a.desc}</div></div>
    </div>`;
  }).join('');
}

function renderPassages() {
  const read = PASSAGES.filter(p => readCounts[p.id]).length;
  $('#passagesProgress').textContent = `${read} / ${PASSAGES.length} read`;
  $('#passagesGrid').innerHTML = PASSAGES.map(p => {
    const n = readCounts[p.id] || 0;
    return `<span class="passage-chip${n ? ' read' : ''}" title="${escapeHTML(p.title)} — ${p.length}, ${p.difficulty}">
      <span class="passage-chip-title">${escapeHTML(p.title)}</span>
      <small>${p.length}${n ? ` · ${n}×` : ''}</small>
    </span>`;
  }).join('');
}

function relDay(ts) {
  const then = new Date(ts), now = new Date();
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d0 = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const diff = Math.round((t0 - d0) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderHistory() {
  const tbody = $('#histBody');
  const rows = filteredRuns().slice(-8).reverse();
  $('#histEmpty').classList.toggle('hidden', rows.length > 0);
  $('#histCount').textContent = rows.length ? `latest ${rows.length}` : 'nothing yet';
  tbody.innerHTML = rows.map(e => `
    <tr>
      <td>${relDay(e.ts)}</td>
      <td><span class="mode-badge mode-${e.mode}">${e.mode}${e.daily ? ' · daily' : ''}</span></td>
      <td class="hist-title">${escapeHTML(e.title || '—')}</td>
      <td>${e.wpm}</td>
      <td>${e.eff == null || e.comp == null ? '—' : e.eff}</td>
      <td>${e.comp == null ? '—' : e.comp + '%'}</td>
      <td>${e.chunkSize}w</td>
      <td>${fmtInt(e.words)}</td>
      <td><button class="row-del" type="button" data-del="${e.id}" aria-label="delete session">×</button></td>
    </tr>`).join('');
}

function renderStats() {
  const list = filteredRuns();
  const n = list.length;
  $('#statTests').textContent = fmtInt(n);
  $('#statWords').textContent = fmtInt(list.reduce((a, s) => a + (s.words || 0), 0));
  const secs = list.reduce((a, s) => a + (s.secs || 0), 0);
  $('#statTime').textContent = secs ? fmtMinutes(secs) : '0';
  $('#statAvgWpm').textContent = n ? fmtInt(list.reduce((a, s) => a + s.wpm, 0) / n) : '0';
  const scored = list.filter(s => s.comp != null);
  $('#statAvgComp').textContent = scored.length ? Math.round(scored.reduce((a, s) => a + s.comp, 0) / scored.length) + '%' : '—';
  $('#statStreak').textContent = computeStreaks(runs).cur;
  const b = bestFor(best, settings.mode, settings.chunkSize);
  $('#statsChartBest').textContent = b ? `best at ${settings.chunkSize}w ${settings.mode} — ${b.label}`
    : best.legacy ? `personal best — ${best.legacy.label}` : 'no personal best yet';
  renderGoal();
  renderChunkTable();
  renderHeatmap();
  renderAchievements();
  renderPassages();
  renderHistory();
  renderFilterUI();
  deferDraw(drawStatsCharts);
}

function renderFilterUI() {
  $$('#statsFilters [data-filter-mode]').forEach(b => {
    const on = b.dataset.filterMode === statsFilter.mode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $$('#statsFilters [data-filter-range]').forEach(b => {
    const on = b.dataset.filterRange === statsFilter.range;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
}

/* ---------- achievements ---------- */
function checkAchievements() {
  const ctx = computeStreaks(runs);
  const newly = ACHIEVEMENTS.filter(a => !unlocked.includes(a.id) && a.test(runs, ctx));
  if (newly.length) {
    unlocked = [...unlocked, ...newly.map(a => a.id)];
    saveJSON(LS.achievements, unlocked);
  }
  return newly;
}

/* small inline note, replaced in place — no floating messages */
function showNote(sel, text, kind = '') {
  const el = $(sel);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('hidden', !text);
  el.classList.toggle('is-error', kind === 'error');
  el.classList.toggle('is-ok', kind === 'ok');
}

/* ============================================================
   PANELS — drawer + modals
   ============================================================ */
const MODALS = ['modalShortcuts', 'modalCustom', 'modalConfirm'];
const DRAWER = 'drawerSettings';
let lastFocus = null;      // where focus goes back to when a modal closes
let drawerReturn = null;   // same, for the settings panel
let confirmCb = null;

function drawerEl() { return $('#' + DRAWER); }
function drawerOpen() { const d = drawerEl(); return !!d && !d.classList.contains('hidden'); }

function openModalEl() {
  return MODALS.map(id => $('#' + id)).find(m => m && !m.classList.contains('hidden')) || null;
}
function anyModalOpen() { return !!openModalEl(); }

function setBackgroundInert(on) {
  ['main', '.topbar', '#' + DRAWER].forEach(sel => {
    const el = $(sel);
    if (el) el.inert = on;
  });
}

function setDrawerExpanded(on) {
  ['#btnSettings', '#btnTheme'].forEach(sel => {
    const b = $(sel);
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
  });
}

function focusInto(panel, selector) {
  const first = panel.querySelector(selector);
  if (first) { setTimeout(() => first.focus({ preventScroll: true }), 30); return; }
  const anyFocus = panel.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (anyFocus) setTimeout(() => anyFocus.focus({ preventScroll: true }), 30);
}

function openModal(id) {
  const modal = $('#' + id);
  if (!modal) return;
  if (!anyModalOpen()) lastFocus = document.activeElement;
  MODALS.forEach(m => { const el = $('#' + m); if (el && el !== modal) el.classList.add('hidden'); });
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  setBackgroundInert(true);
  focusInto(modal);
}

/* the settings panel sits beside the page instead of over it, so it never
   blocks the reader, never traps focus and never locks the scroll. */
function openDrawer(section) {
  const drawer = drawerEl();
  if (!drawer) return;
  exitFocus();
  if (anyModalOpen()) closeModals();
  const wasOpen = drawerOpen();
  if (!wasOpen) drawerReturn = document.activeElement;
  drawer.classList.remove('hidden');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('drawer-open');
  setDrawerExpanded(true);
  renderThemeGrid();
  applySettingsToUI();
  if (section) {
    requestAnimationFrame(() => scrollDrawerTo(section));
    setActiveChip(section);
  } else if (!wasOpen) {
    const body = $('#drawerBody');
    if (body) body.scrollTop = 0;
    setActiveChip('secReading');
  }
  if (!wasOpen) focusInto(drawer, '#closeSettings');
}

function closeDrawer(opts = {}) {
  const drawer = drawerEl();
  if (!drawer || drawer.classList.contains('hidden')) return;
  drawer.classList.add('hidden');
  drawer.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('drawer-open');
  setDrawerExpanded(false);
  if (opts.restore !== false && drawerReturn) {
    try { drawerReturn.focus({ preventScroll: true }); } catch { /* gone */ }
  }
  drawerReturn = null;
}

function closeModals() {
  MODALS.forEach(id => { const m = $('#' + id); if (m) m.classList.add('hidden'); });
  document.body.classList.remove('modal-open');
  setBackgroundInert(false);
  applyFocusInert();
  if (lastFocus && typeof lastFocus.focus === 'function') {
    try { lastFocus.focus({ preventScroll: true }); } catch { /* gone */ }
  }
  lastFocus = null;
}

function scrollDrawerTo(id) {
  const body = $('#drawerBody');
  const el = $('#' + id);
  if (!body || !el) return;
  body.scrollTo({ top: Math.max(0, el.offsetTop - 8), behavior: 'smooth' });
}

function setActiveChip(id) {
  $$('#drawerNav [data-goto]').forEach(b => {
    const on = b.dataset.goto === id;
    b.classList.toggle('active', on);
    b.setAttribute('aria-current', on ? 'true' : 'false');
  });
}

function trapTab(e, modal) {
  const focusables = [...modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.offsetParent !== null);
  if (!focusables.length) return;
  const first = focusables[0], last = focusables[focusables.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

function confirmAction(title, body, okLabel, cb) {
  $('#confirmTitle').textContent = title;
  $('#confirmBody').textContent = body;
  $('#confirmOk').textContent = okLabel;
  confirmCb = cb;
  openModal('modalConfirm');
}

/* ============================================================
   SETTINGS UI
   ============================================================ */
function paintRange(input) {
  if (!input) return;
  const min = Number(input.min) || 0;
  const max = Number(input.max) || 100;
  const val = Number(input.value) || 0;
  const pct = max > min ? clamp(((val - min) / (max - min)) * 100, 0, 100) : 0;
  input.style.setProperty('--fill', pct.toFixed(1) + '%');
}

function updateGoalUI() {
  const goal = settings.goal;
  const words = wordsToday();
  const out = $('#setGoalVal');
  if (out) out.textContent = goal ? fmtInt(goal) : 'off';
  const fill = $('#setGoalFill');
  if (fill) fill.style.width = (goal ? clamp((words / goal) * 100, 0, 100) : 0).toFixed(1) + '%';
  const today = $('#setGoalToday');
  if (today) {
    today.textContent = goal
      ? `${fmtInt(words)} of ${fmtInt(goal)} words today`
      : `${fmtInt(words)} words today · goal off`;
  }
  $$('#goalPresets [data-goal]').forEach(b => {
    const on = Number(b.dataset.goal) === goal;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
}

function storageBytes() {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf('chunky.') !== 0) continue;
      total += (k.length + (localStorage.getItem(k) || '').length) * 2;
    }
  } catch { /* storage unavailable */ }
  return total;
}

function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function renderDataCells() {
  const sessions = $('#setStatSessions');
  if (!sessions) return;
  sessions.textContent = fmtInt(runs.length);
  const days = $('#setStatDays');
  if (days) days.textContent = fmtInt(new Set(runs.map(r => dayKey(new Date(r.ts)))).size);
  const size = $('#setStatSize');
  if (size) size.textContent = fmtBytes(storageBytes());
}

function applySettingsToUI() {
  document.documentElement.style.setProperty('--chunk-size', settings.fontSize + 'px');
  document.documentElement.style.setProperty('--read-font', settings.fontFamily);
  if (settings.theme === 'custom') applyAccentVars();

  const fs = $('#setFontSize');
  if (fs) { fs.value = settings.fontSize; paintRange(fs); }
  const fsVal = $('#setFontSizeVal');
  if (fsVal) fsVal.textContent = settings.fontSize;

  $$('#fontCards [data-font]').forEach(b => {
    const on = b.dataset.font === settings.fontFamily;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });

  $('#setPivot').checked = settings.pivot;
  $('#setShowPassage').checked = settings.showPassage;

  $$('#punctSeg [data-punct]').forEach(b => {
    const on = b.dataset.punct === settings.punctStrength;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });

  $('#setRamp').checked = settings.ramp;
  $('#setSmart').checked = settings.smartChunks;
  $('#setSound').checked = settings.sound;
  $('#rampRow').classList.toggle('on', settings.ramp);
  $('#smartRow').classList.toggle('on', settings.smartChunks);
  $('#soundRow').classList.toggle('on', settings.sound);

  const goal = $('#setGoal');
  if (goal) { goal.value = settings.goal; paintRange(goal); }
  updateGoalUI();
  renderDataCells();
  paintAccentUI();

  $('#setPreviewLine').classList.toggle('no-pivot', !settings.pivot);
  $('#setPreviewPassage').classList.toggle('off', !settings.showPassage);
  $('.rsvp-line').classList.toggle('no-pivot', !settings.pivot);
  $('#passage').classList.toggle('off', !settings.showPassage);
  syncPills();
  updateTransport();
  if (session) {
    const c = session.chunks[previewIdx != null ? previewIdx : session.idx];
    if (c) fitChunk(c.text);
  }
}

function syncPills(opts = {}) {
  $$('#setupBar [data-mode]').forEach(b => {
    const on = b.dataset.mode === settings.mode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $$('#setupBar [data-len]').forEach(b => {
    const on = b.dataset.len === settings.length;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $$('#setupBar [data-time]').forEach(b => {
    const on = Number(b.dataset.time) === settings.timeLimit;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $('#lenPills').classList.toggle('hidden', settings.mode !== 'passage');
  $('#timePills').classList.toggle('hidden', settings.mode !== 'time');
  $('#speedGroup').classList.toggle('hidden', settings.mode === 'zen');
  updateTransport(opts);
}

/* ---------- live speed / chunk changes ---------- */
function wpmStep(wpm) {
  if (wpm < 400) return 10;
  if (wpm < 800) return 25;
  if (wpm < 1500) return 50;
  return 100;
}

function setWpm(v, opts = {}) {
  const next = clamp(Math.round(v), WPM_MIN, WPM_MAX);
  const changed = next !== settings.wpm;
  settings.wpm = next;
  saveSettings();
  syncPills({ skipRange: !!opts.fromSlider });
  if (session) {
    session.wpm = settings.wpm;
    if (changed) {
      if (session.status === 'running') rescheduleCurrentChunk();
      else if (session.status === 'paused' && session.mode !== 'zen') {
        const oldDur = session.chunkDur > 0 && isFinite(session.chunkDur) ? session.chunkDur : session.remainingMs;
        const left = oldDur ? clamp(session.remainingMs / oldDur, 0, 1) : 1;
        const dur = durationFor(session.chunks[session.idx], session.idx);
        session.chunkDur = dur;
        session.remainingMs = dur * left;
      }
    }
  }
  renderHUD();
}

/* keep the fraction of the current chunk already shown, but rescale the
   remaining time to the new speed — changing pace mid-chunk feels instant. */
function rescheduleCurrentChunk() {
  if (!session || session.status !== 'running' || session.mode === 'zen') return;
  const now = performance.now();
  const dur = durationFor(session.chunks[session.idx], session.idx);
  const oldDur = session.chunkDur > 0 && isFinite(session.chunkDur) ? session.chunkDur : dur;
  const frac = session.chunkStartAt ? clamp((now - session.chunkStartAt) / oldDur, 0, 1) : 0;
  session.chunkDur = dur;
  session.chunkStartAt = now - dur * frac;
  session.nextChunkAt = session.chunkStartAt + dur;
  scheduleLoop();
}

function stepWpm(dir) {
  const target = clamp(settings.wpm + dir * wpmStep(settings.wpm), WPM_MIN, WPM_MAX);
  setWpm(Math.round(target / 5) * 5);
}
function setChunkSize(size) {
  const next = clamp(Math.round(size), 1, 4);
  const changed = next !== settings.chunkSize;
  settings.chunkSize = next;
  saveSettings();
  syncPills();
  if (!session || !changed) return;
  if (session.status === 'quiz' || session.status === 'done') return;
  rebuildChunks();
}
function nudgeChunk(delta) { setChunkSize(settings.chunkSize + delta); }

function toggleSmart() {
  settings.smartChunks = !settings.smartChunks;
  saveSettings();
  applySettingsToUI();
  if (session && session.status !== 'quiz' && session.status !== 'done') rebuildChunks();
}

/* Rebuild the chunk list in place: same passage, same words, same clock.
   The chunk that contains the word you were on becomes the new current
   chunk, so changing width mid-session never skips or repeats a passage. */
function rebuildChunks() {
  if (!session || !session.words || !session.words.length) return;
  const running = session.status === 'running';
  const now = performance.now();
  if (running) {
    session.elapsedMs = session.bankedMs + (now - session.startStamp);
    session.bankedMs = session.elapsedMs;
    session.startStamp = now;
  }
  const from = session.idx;
  const old = session.chunks[from];
  const cursor = old ? old.start : session.words.length;
  const chunks = buildChunks(session.words, settings.chunkSize, settings.smartChunks);
  let idx = chunks.findIndex(c => cursor >= c.start && cursor < c.end);
  if (idx < 0) idx = Math.max(0, chunks.length - 1);

  session.chunks = chunks;
  session.chunkSize = settings.chunkSize;
  session.smart = settings.smartChunks;
  session.idx = idx;
  const startWord = chunks[idx] ? chunks[idx].start : session.words.length;
  session.wordsRead = Math.max(session.wordsRead, Math.max(0, startWord - (session.wordOffset || 0)));
  session.samples.push({ t: Math.max(1, Math.round(session.elapsedMs)), w: session.wordsRead });

  previewIdx = null;
  lastMarkIdx = -1;
  renderPassageText();
  renderChunk(idx, { force: true });
  updateProgress(idx);
  renderHUD();

  if (session.mode === 'zen') {
    session.remainingMs = Infinity;
    session.chunkDur = Infinity;
  } else {
    const dur = durationFor(chunks[idx], idx);
    session.remainingMs = dur;
    session.chunkDur = dur;
    session.chunkStartAt = now;
    if (running) session.nextChunkAt = now + dur;
  }
  setOverlay(running ? 'hidden' : session.status === 'paused' ? 'paused' : 'idle');
  updateTransport();
  if (running) scheduleLoop();
}

/* ---------- custom text ---------- */
function saveCustom(text, pos) {
  customSaved = { text: String(text || ''), pos: Math.max(0, pos || 0) };
  saveJSON(LS.custom, customSaved);
}

function updateCustomCount() {
  const words = $('#customText').value.trim().split(/\s+/).filter(Boolean).length;
  $('#customCount').textContent = `${fmtInt(words)} word${words === 1 ? '' : 's'}`;
  return words;
}

function openCustom() {
  $('#customText').value = customSaved.text || '';
  updateCustomCount();
  const saved = $('#customSaved');
  if (customSaved.text && customSaved.pos > 0) {
    saved.classList.remove('hidden');
    saved.innerHTML = `<span>picked up where you left off?</span>
      <button class="btn ghost small" id="btnResumeCustom" type="button">resume</button>
      <button class="btn ghost small" id="btnRestartCustom" type="button">start over</button>`;
  } else {
    saved.classList.add('hidden');
    saved.innerHTML = '';
  }
  openModal('modalCustom');
}

function startCustomFromModal() {
  const text = $('#customText').value.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 25) {
    $('#customCount').textContent = 'need at least 25 words';
    $('#customText').focus();
    return;
  }
  const trimmed = words > 12000 ? text.split(/\s+/).slice(0, 12000).join(' ') : text;
  settings.mode = 'custom';
  saveSettings();
  saveCustom(trimmed, 0);
  closeModals();
  newSession({ text: trimmed, same: false });
}

/* ---------- daily ---------- */
function refreshDailyButton() {
  const btn = $('#btnDaily');
  if (!btn) return;
  const done = dailyState.date === todayKey();
  btn.textContent = done ? 'daily ✓' : 'daily';
  btn.classList.toggle('is-done', done);
}

function startDaily() {
  if (dailyState.date === todayKey()) {
    confirmAction('daily challenge already done', 'You finished today\'s challenge. Running it again is just practice and will not count toward the daily streak.', 'practice anyway', () => {
      closeModals();
      newSession({ daily: true });
    });
    return;
  }
  settings.mode = 'passage';
  saveSettings();
  newSession({ daily: true });
}

/* ============================================================
   EXPORT / IMPORT
   ============================================================ */
function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportData() {
  const payload = {
    app: 'chunky', version: 3, exportedAt: new Date().toISOString(),
    settings, runs, achievements: unlocked, best, read: readCounts, daily: dailyState,
  };
  download(`chunky-${todayKey()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function importPayload(data) {
  const incoming = Array.isArray(data) ? data : (data.runs || data.history || []);
  if (!Array.isArray(incoming)) throw new Error('no sessions found');
  const ids = new Set(runs.map(r => r.id));
  incoming.forEach(r => {
    if (!r || typeof r !== 'object' || typeof r.ts !== 'number' || typeof r.wpm !== 'number') return;
    const id = r.id || uid();
    if (ids.has(id)) return;
    ids.add(id);
    runs.push({ ...r, id });
  });
  runs.sort((a, b) => a.ts - b.ts);
  if (runs.length > 500) runs = runs.slice(-500);
  persistRuns();

  if (!Array.isArray(data)) {
    if (Array.isArray(data.achievements)) {
      unlocked = [...new Set([...unlocked, ...data.achievements])];
      saveJSON(LS.achievements, unlocked);
    }
    const bm = migrateBest(data.best);
    Object.entries(bm.keys).forEach(([k, v]) => {
      const cur = best.keys[k];
      if (v && typeof v.score === 'number' && (!cur || v.score > cur.score)) best.keys[k] = v;
    });
    if (!best.legacy && bm.legacy) best.legacy = bm.legacy;
    saveJSON(LS.best, best);
    if (data.read && typeof data.read === 'object') {
      Object.entries(data.read).forEach(([k, n]) => {
        readCounts[k] = Math.max(readCounts[k] || 0, Number(n) || 0);
      });
      saveJSON(LS.read, readCounts);
    }
  }
  renderStats();
}

function exportCsv() {
  const head = 'date,mode,title,wpm,effective_wpm,comprehension,chunk_size,words,seconds,daily';
  const rows = runs.map(r => [
    new Date(r.ts).toISOString(),
    r.mode,
    `"${String(r.title || '').replace(/"/g, '""')}"`,
    r.wpm,
    r.eff == null ? '' : r.eff,
    r.comp == null ? '' : r.comp,
    r.chunkSize,
    r.words,
    r.secs,
    r.daily ? 1 : 0,
  ].join(','));
  download(`chunky-${todayKey()}.csv`, [head, ...rows].join('\n'), 'text/csv');
}

function clearData() {
  confirmAction('clear everything?', 'This removes all saved sessions, achievements, personal bests and passage progress. Settings are kept. This cannot be undone.', 'clear everything', () => {
    runs = []; unlocked = []; readCounts = {}; best = { keys: {}, legacy: null }; dailyState = { date: '' };
    persistRuns();
    saveJSON(LS.achievements, unlocked);
    saveJSON(LS.read, readCounts);
    saveJSON(LS.best, best);
    saveJSON(LS.daily, dailyState);
    renderStats();
    refreshDailyButton();
  });
}

/* ============================================================
   SHORTCUTS
   ============================================================ */
const SHORTCUT_GROUPS = [
  {
    title: 'playback',
    icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 5.6v12.8L19 12z"/></svg>',
    items: [
      { keys: ['space'], label: 'start / pause', wide: true, accent: true },
      { keys: ['enter'], label: 'start reading' },
      { keys: ['r'], label: 'restart this passage' },
      { keys: ['esc'], label: 'quit session' },
    ],
  },
  {
    title: 'pace & chunk',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3l2-5 4 10 2-5h7"/></svg>',
    items: [
      { keys: ['←', '→'], label: 'slower / faster' },
      { keys: ['↑', '↓'], label: 'smaller / bigger chunks' },
      { keys: ['b'], label: 'peek previous chunk' },
      { keys: ['v'], label: 'passage under stage' },
      { keys: ['m'], label: 'smart chunks' },
    ],
  },
  {
    title: 'comprehension',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.4 12.2l2.4 2.4 4.8-5"/></svg>',
    items: [
      { keys: ['1', '2', '3', '4'], label: 'answer a question' },
      { keys: ['n', 'p'], label: 'zen next / previous' },
    ],
  },
  {
    title: 'focus',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5.6A1.6 1.6 0 0 1 5.6 4H8M16 4h2.4A1.6 1.6 0 0 1 20 5.6V8M20 16v2.4a1.6 1.6 0 0 1-1.6 1.6H16M8 20H5.6A1.6 1.6 0 0 1 4 18.4V16"/><path d="M9 12h6"/></svg>',
    items: [
      { keys: ['f'], label: 'just the words', accent: true },
      { keys: ['g'], label: 'words, progress and passage' },
      { keys: ['esc'], label: 'back to the page' },
    ],
  },
  {
    title: 'app',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h5M13 7h7M4 12h10M18 12h2M4 17h3M11 17h9"/><circle cx="11" cy="7" r="1.9"/><circle cx="16" cy="12" r="1.9"/><circle cx="9" cy="17" r="1.9"/></svg>',
    items: [
      { keys: ['s'], label: 'settings' },
      { keys: ['t'], label: 'appearance' },
      { keys: ['shift', 'f'], label: 'fullscreen' },
      { keys: ['?'], label: 'this sheet' },
    ],
  },
];

function renderShortcutList() {
  $('#shortcutList').innerHTML = SHORTCUT_GROUPS.map(g => `
    <section class="sc-group">
      <h3 class="sc-title"><span class="sc-icon" aria-hidden="true">${g.icon}</span>${g.title}</h3>
      <div class="sc-rows">${g.items.map(it => `
        <div class="sc-row">
          <span class="sc-label">${it.label}</span>
          <span class="keys">${it.keys.map(k => `<kbd class="${it.wide ? 'key-wide' : ''}${it.accent ? ' key-accent' : ''}">${k}</kbd>`).join('')}</span>
        </div>`).join('')}
      </div>
    </section>`).join('');
}

/* ============================================================
   EVENTS
   ============================================================ */
function attachEvents() {
  // top nav
  $('#logoHome').addEventListener('click', e => { e.preventDefault(); goPractice(); });
  $('#navTest').addEventListener('click', goPractice);
  $('#navStats').addEventListener('click', () => {
    if (session && session.status === 'running') pauseReading();
    switchView('stats');
  });
  $('#btnSettings').addEventListener('click', () => { if (drawerOpen()) closeDrawer(); else openDrawer(); });
  $('#btnTheme').addEventListener('click', () => openDrawer('secAppearance'));
  $('#btnShortcuts').addEventListener('click', () => openModal('modalShortcuts'));

  // panel chrome
  $('#closeSettings').addEventListener('click', () => closeDrawer());
  $('#btnCloseDrawer').addEventListener('click', () => closeDrawer());
  $('#closeShortcuts').addEventListener('click', closeModals);
  $('#closeCustom').addEventListener('click', closeModals);
  MODALS.forEach(m => {
    const el = $('#' + m);
    if (el) el.addEventListener('mousedown', e => { if (e.target.id === m) closeModals(); });
  });
  $('#confirmCancel').addEventListener('click', closeModals);
  $('#confirmOk').addEventListener('click', () => {
    const cb = confirmCb;
    confirmCb = null;
    closeModals();
    if (cb) cb();
  });

  // setup bar
  $('#setupBar').addEventListener('click', e => {
    const opt = e.target.closest('[data-mode], [data-len], [data-time]');
    if (!opt) return;
    if (opt.dataset.mode) { selectMode(opt.dataset.mode); return; }
    if (opt.dataset.len) {
      settings.length = opt.dataset.len; saveSettings(); syncPills();
      if (settings.mode === 'passage') newSession({ same: false });
      return;
    }
    if (opt.dataset.time) {
      settings.timeLimit = Number(opt.dataset.time); saveSettings(); syncPills();
      if (settings.mode === 'time') newSession({ same: true });
      return;
    }
  });

  // live speed slider and chunk stepper
  const wpmRange = $('#wpmRange');
  if (wpmRange) {
    wpmRange.addEventListener('input', e => setWpm(sliderToWpm(Number(e.target.value)), { fromSlider: true }));
  }
  $('#chunkDown').addEventListener('click', () => nudgeChunk(-1));
  $('#chunkUp').addEventListener('click', () => nudgeChunk(1));

  // stage / transport
  $('#btnPrevChunk').addEventListener('click', zenPrev);
  $('#btnNextChunk').addEventListener('click', zenNext);
  $('#btnSkipPassage').addEventListener('click', () => {
    if (session && session.mode === 'custom') openCustom();
    else newSession({ same: false });
  });
  $('#btnCustomText').addEventListener('click', openCustom);
  $('#btnDaily').addEventListener('click', startDaily);
  $('#btnFocus').addEventListener('click', () => setFocusMode(focusMode === 'deep' ? 'guide' : focusMode === 'guide' ? null : 'deep'));
  $('#focusExit').addEventListener('click', exitFocus);

  // pointer: tap to play, swipe for speed / chunk size
  const stage = $('#stage');
  let ptr = null;
  stage.addEventListener('pointerdown', e => {
    if (e.target.closest('button')) return;
    ptr = { x: e.clientX, y: e.clientY, id: e.pointerId };
  });
  stage.addEventListener('pointerup', e => {
    if (!ptr || ptr.id !== e.pointerId) { ptr = null; return; }
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    ptr = null;
    if (Math.abs(dx) < 12 && Math.abs(dy) < 12) { if (session) toggleStartPause(); return; }
    if (Math.abs(dx) > Math.abs(dy)) {
      if (session && session.mode === 'zen') { if (dx < 0) zenAdvance(); else zenPrev(); }
      else stepWpm(dx < 0 ? -1 : 1);
    } else {
      nudgeChunk(dy < 0 ? 1 : -1);
    }
  });
  stage.addEventListener('pointercancel', () => { ptr = null; });

  // quiz
  $('#quizOptions').addEventListener('click', e => {
    const btn = e.target.closest('.quiz-opt');
    if (!btn || btn.disabled) return;
    answerQuiz(Number(btn.dataset.idx));
  });

  // results
  $('#btnNewPassage').addEventListener('click', () => {
    if (settings.mode === 'custom') { settings.mode = 'passage'; saveSettings(); }
    newSession({ same: false });
  });
  $('#btnRetry').addEventListener('click', restartSame);
  $('#btnMenu').addEventListener('click', goPractice);
  $('#btnCopy').addEventListener('click', copySummary);
  $('#btnDrill').addEventListener('click', drillMissed);

  // stats
  $('#btnExport').addEventListener('click', exportData);
  $('#btnCsv').addEventListener('click', exportCsv);
  $('#btnClearHistory').addEventListener('click', clearData);
  $('#importFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importPayload(JSON.parse(String(reader.result)));
        showNote('#statsNote', '');
      } catch {
        showNote('#statsNote', 'that file could not be read as chunky data — pick a chunky json export', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });
  $('#statsFilters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter-mode], [data-filter-range]');
    if (!b) return;
    if (b.dataset.filterMode) statsFilter.mode = b.dataset.filterMode;
    if (b.dataset.filterRange) statsFilter.range = b.dataset.filterRange;
    renderStats();
  });
  $('#histBody').addEventListener('click', e => {
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    const id = btn.dataset.del;
    const entry = runs.find(r => r.id === id);
    confirmAction('delete session?', `Remove ${entry ? `${entry.mode} · ${entry.wpm} wpm · ${relDay(entry.ts)}` : 'this session'}? This cannot be undone.`, 'delete', () => {
      runs = runs.filter(r => r.id !== id);
      persistRuns();
      renderStats();
    });
  });
  // settings drawer nav
  $('#drawerNav').addEventListener('click', e => {
    const chip = e.target.closest('[data-goto]');
    if (!chip) return;
    scrollDrawerTo(chip.dataset.goto);
    setActiveChip(chip.dataset.goto);
  });

  // settings controls
  $('#setFontSize').addEventListener('input', e => {
    settings.fontSize = Number(e.target.value);
    saveSettings();
    paintRange(e.target);
    applySettingsToUI();
  });
  $('#fontCards').addEventListener('click', e => {
    const card = e.target.closest('[data-font]');
    if (!card) return;
    settings.fontFamily = card.dataset.font;
    saveSettings();
    applySettingsToUI();
    if (session) { const c = session.chunks[session.idx]; if (c) fitChunk(c.text); }
  });
  $('#setPivot').addEventListener('change', e => { settings.pivot = e.target.checked; saveSettings(); applySettingsToUI(); });
  $('#setShowPassage').addEventListener('change', e => { settings.showPassage = e.target.checked; saveSettings(); applySettingsToUI(); });
  $('#punctSeg').addEventListener('click', e => {
    const btn = e.target.closest('[data-punct]');
    if (!btn) return;
    settings.punctStrength = btn.dataset.punct;
    saveSettings();
    applySettingsToUI();
  });
  $('#setRamp').addEventListener('change', e => { settings.ramp = e.target.checked; saveSettings(); applySettingsToUI(); });
  $('#setSmart').addEventListener('change', e => {
    settings.smartChunks = e.target.checked;
    saveSettings();
    applySettingsToUI();
    if (session && session.status !== 'running' && session.status !== 'paused') {
      newSession({ same: true, text: session.mode === 'custom' ? session.text : null, resumePos: session.idx });
    }
  });
  $('#setSound').addEventListener('change', e => {
    settings.sound = e.target.checked;
    saveSettings();
    if (settings.sound) sfx.tick();
    applySettingsToUI();
  });

  const setGoalValue = value => {
    settings.goal = clamp(Number(value) || 0, 0, 5000);
    saveSettings();
    const goal = $('#setGoal');
    if (goal) { goal.value = settings.goal; paintRange(goal); }
    updateGoalUI();
    renderGoal();
  };
  $('#setGoal').addEventListener('input', e => {
    settings.goal = clamp(Number(e.target.value) || 0, 0, 5000);
    saveSettings();
    paintRange(e.target);
    updateGoalUI();
    renderGoal();
  });
  $('#goalPresets').addEventListener('click', e => {
    const chip = e.target.closest('[data-goal]');
    if (chip) setGoalValue(chip.dataset.goal);
  });

  $('#btnResetSettings').addEventListener('click', () => {
    const theme = settings.theme, accent = settings.accent;
    settings = Object.assign({}, DEFAULT_SETTINGS, { theme, accent });
    saveSettings();
    applySettingsToUI();
    renderThemeGrid();
    renderGoal();
  });

  // appearance
  $('#themeGrid').addEventListener('click', e => {
    const card = e.target.closest('.theme-card');
    if (!card) return;
    applyTheme(card.dataset.id);
    renderThemeGrid();
  });
  $('#accentPresets').addEventListener('click', e => {
    const swatch = e.target.closest('[data-accent]');
    if (swatch) applyAccent(swatch.dataset.accent);
  });
  $('#setAccent').addEventListener('input', e => applyAccent(e.target.value));

  // data
  $('#btnExportDrawer').addEventListener('click', exportData);
  renderDataCells();

  // custom text
  $('#customText').addEventListener('input', updateCustomCount);
  $('#btnStartCustom').addEventListener('click', startCustomFromModal);
  $('#customFile').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $('#customText').value = String(reader.result || '');
      updateCustomCount();
      e.target.value = '';
    };
    reader.readAsText(file);
  });
  $('#customSaved').addEventListener('click', e => {
    if (e.target.id === 'btnResumeCustom') {
      closeModals();
      settings.mode = 'custom'; saveSettings();
      newSession({ text: customSaved.text, resumePos: customSaved.pos });
    } else if (e.target.id === 'btnRestartCustom') {
      customSaved = { text: customSaved.text, pos: 0 };
      saveJSON(LS.custom, customSaved);
      $('#customSaved').classList.add('hidden');
    }
  });

  // charts
  ['resChart', 'statsChart'].forEach(id => {
    const c = $('#' + id);
    c.addEventListener('mousemove', e => showChartTip(c, e));
    c.addEventListener('mouseleave', () => hideChartTip(c));
  });

  // global
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && session && session.status === 'running') pauseReading();
  });
  window.addEventListener('blur', () => {
    if (session && session.status === 'running') pauseReading();
  });
  window.addEventListener('storage', e => {
    if (!e.key || e.key.indexOf('chunky.') !== 0) return;
    settings = loadSettings();
    runs = loadJSON(LS.history, []) || [];
    unlocked = loadJSON(LS.achievements, []) || [];
    best = migrateBest(loadJSON(LS.best, null));
    readCounts = loadJSON(LS.read, {}) || {};
    dailyState = loadJSON(LS.daily, { date: '' }) || { date: '' };
    applyTheme(settings.theme);
    applySettingsToUI();
    refreshDailyButton();
    if ($('#view-stats').classList.contains('active')) renderStats();
  });
}

function onResize() {
  if ($('#view-results').classList.contains('active') && session) drawSessionChart();
  if ($('#view-stats').classList.contains('active')) drawStatsCharts();
  if (session) { const c = session.chunks[previewIdx != null ? previewIdx : session.idx]; if (c) fitChunk(c.text); }
}

function selectMode(mode) {
  settings.mode = mode;
  saveSettings();
  syncPills();
  if (mode === 'custom') {
    if (customSaved.text) newSession({ text: customSaved.text, resumePos: customSaved.pos, fromUser: true });
    else openCustom();
    return;
  }
  newSession({ same: false });
}

function goPractice() {
  /* never silently throw away a quiz in progress */
  if (quiz) { switchView('quiz'); return; }
  if (!session || session.status === 'done') restartSame();
  switchView('test');
}

let copyTimer = null;
function flashCopy(text) {
  const btn = $('#btnCopy');
  if (!btn) return;
  if (!btn.dataset.label) btn.dataset.label = btn.textContent.trim();
  btn.textContent = text;
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { btn.textContent = btn.dataset.label; }, 1800);
}

async function copySummary() {
  if (!session) return;
  const bits = [`${session.finalWpm} wpm`];
  if (session.quizReview) {
    const correct = session.quizReview.filter(a => a.correct).length;
    bits.push(`${correct}/${session.quizReview.length} comprehension`);
  }
  bits.push(`${session.chunkSize}-word chunks`);
  if (session.title) bits.push(session.title.toLowerCase());
  const text = `${bits.join(' · ')} — chunky`;
  try {
    await navigator.clipboard.writeText(text);
    flashCopy('copied');
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flashCopy('copied'); }
    catch { flashCopy('copy blocked'); }
    ta.remove();
  }
}

function drillMissed() {
  const missed = (session && session.quizReview || []).filter(a => !a.correct).map(a => a.question);
  if (!missed.length) return;
  closeModals();
  startQuiz(missed, { drill: true });
}

/* ---------- focus mode ---------- */
/* two levels: words only, or words plus the progress bar and the passage
   sliding underneath. everything else fades but keeps its space, so the
   line you are reading never moves. */
const FOCUS_CHROME = ['.topbar', '.setup', '.transport', '.hud', '.stage-foot', '.progress-track'];
let focusMode = null; // null | 'deep' | 'guide'

function applyFocusInert() {
  const hidden = focusMode === 'deep' ? FOCUS_CHROME
    : focusMode === 'guide' ? FOCUS_CHROME.filter(sel => sel !== '.progress-track')
      : [];
  FOCUS_CHROME.forEach(sel => {
    const el = $(sel);
    if (el) el.inert = hidden.includes(sel);
  });
}

function setFocusMode(mode) {
  const next = mode === focusMode ? null : mode;
  if (next) closeDrawer({ restore: false });
  focusMode = next;
  document.body.classList.toggle('focus-deep', next === 'deep');
  document.body.classList.toggle('focus-guide', next === 'guide');
  const pill = $('#focusExit');
  if (pill) {
    pill.classList.toggle('hidden', !next);
    pill.setAttribute('aria-hidden', next ? 'false' : 'true');
  }
  applyFocusInert();
}

function exitFocus() {
  if (focusMode) setFocusMode(focusMode);
}

/* ---------- keyboard ---------- */
function onKeyDown(e) {
  if (anyModalOpen()) {
    if (e.key === 'Escape') { e.preventDefault(); closeModals(); return; }
    if (e.key === 'Tab') {
      const modal = openModalEl();
      if (modal) trapTab(e, modal);
      return;
    }
    return;
  }

  const el = e.target;
  const tag = (el.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  if (typing) {
    if (e.key === 'Enter' && el.id === 'customText' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); startCustomFromModal(); }
    return;
  }

  /* leave browser chords alone — cmd/ctrl/alt+r is reload, not restart. */
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  const testActive = $('#view-test').classList.contains('active');
  const quizActive = $('#view-quiz').classList.contains('active');
  const resultsActive = $('#view-results').classList.contains('active');

  if (e.key === 'Escape') {
    if (focusMode) { exitFocus(); return; }
    if (drawerOpen()) { closeDrawer(); return; }
    if (quiz) { quiz = null; restartSame(); return; }
    if (session && (session.status === 'running' || session.status === 'paused')) { abortSession(); return; }
    if (resultsActive) { restartSame(); return; }
    if (!testActive) { switchView('test'); return; }
    return;
  }

  if (tag === 'button' || tag === 'a') {
    if (e.key === ' ' || e.key === 'Enter') return;
  }

  if (quizActive) {
    if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); answerQuiz(Number(e.key) - 1); return; }
    return;
  }

  if (e.key === 'Tab') return;

  switch (e.key) {
    case ' ':
      if (!testActive) return;
      if (e.repeat) { e.preventDefault(); return; }
      e.preventDefault();
      if (session && session.mode === 'zen') zenAdvance();
      else toggleStartPause();
      return;
    case 'Enter':
      if (resultsActive) { e.preventDefault(); if (settings.mode === 'custom') { settings.mode = 'passage'; saveSettings(); } newSession({ same: false }); }
      else if (testActive && session && session.status === 'idle') { e.preventDefault(); startReading(); }
      return;
    case 'r':
      if (testActive) { e.preventDefault(); restartSame(); }
      return;
    case 'b':
      if (testActive) { e.preventDefault(); previewPrev(); }
      return;
    case 'n':
      if (testActive && session && session.mode === 'zen') { e.preventDefault(); zenNext(); }
      return;
    case 'p':
      if (testActive && session && session.mode === 'zen') { e.preventDefault(); zenPrev(); }
      return;
    case 'ArrowLeft': if (testActive) { e.preventDefault(); stepWpm(-1); } return;
    case 'ArrowRight': if (testActive) { e.preventDefault(); stepWpm(1); } return;
    case 'ArrowUp': if (testActive) { e.preventDefault(); nudgeChunk(-1); } return;
    case 'ArrowDown': if (testActive) { e.preventDefault(); nudgeChunk(1); } return;
    case 'v':
      settings.showPassage = !settings.showPassage; saveSettings(); applySettingsToUI();
      return;
    case 'm':
      toggleSmart();
      return;
    case 'f':
      if (testActive) { e.preventDefault(); setFocusMode('deep'); }
      return;
    case 'g':
      if (testActive) { e.preventDefault(); setFocusMode('guide'); }
      return;
    case 'F':
      /* shift+f keeps the old fullscreen behaviour */
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      else document.documentElement.requestFullscreen().catch(() => {});
      return;
    case 't':
      openDrawer('secAppearance'); return;
    case 's':
      openDrawer(); return;
    case '?':
      e.preventDefault(); openModal('modalShortcuts'); return;
  }
}

/* ---------- wake lock ---------- */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch { /* not supported or denied */ }
}
function releaseWakeLock() {
  try { if (wakeLock) wakeLock.release(); } catch { /* ignore */ }
  wakeLock = null;
}

/* ---------- service worker ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  if (!location.protocol.startsWith('http')) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

/* ---------- boot ---------- */
function init() {
  /* older builds could store runs without ids; give them one so the delete
     button and result comparisons keep working. */
  let patched = false;
  runs.forEach(r => {
    if (r && !r.id) { r.id = uid(); patched = true; }
    if (r && r.chunkSize == null) { r.chunkSize = 2; patched = true; }
  });
  if (patched) persistRuns();
  applyTheme(settings.theme);
  applySettingsToUI();
  renderThemeGrid();
  attachEvents();
  renderShortcutList();
  refreshDailyButton();
  if (settings.mode === 'custom' && !customSaved.text) {
    settings.mode = 'passage';
    saveSettings();
  }
  const bootHash = location.hash.replace(/^#/, '');
  newSession({});
  if (bootHash === 'stats') switchView('stats', { hash: false });
  booting = false;
  if (!storageOk) showNote('#storageNote', 'storage is unavailable — this session will not be saved', 'error');
  registerSW();
}

init();
