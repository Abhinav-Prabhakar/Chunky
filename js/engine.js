/* ============================================================
   CHUNKY — shared engine
   Pure helpers, storage, chunking, scoring, achievements.
   No DOM access lives here so the logic stays testable.
   ============================================================ */
'use strict';

/* ---------- tiny helpers ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* Reading speed lives on a log scale: 80 wpm to 3000 wpm is a 37× range,
   and a linear slider would bunch every useful practice pace into the first
   eighth of the track. The slider is 0…100; these two convert both ways. */
const WPM_MIN = 80;
const WPM_MAX = 3000;
const WPM_LOG_RANGE = Math.log(WPM_MAX / WPM_MIN);
const wpmToSlider = wpm => Math.round(
  100 * Math.log(clamp(Number(wpm) || WPM_MIN, WPM_MIN, WPM_MAX) / WPM_MIN) / WPM_LOG_RANGE
);
const sliderToWpm = pos => Math.round(
  WPM_MIN * Math.pow(WPM_MAX / WPM_MIN, clamp(Number(pos) || 0, 0, 100) / 100)
);
const pad2 = n => String(n).padStart(2, '0');
const fmtInt = n => Math.round(n).toLocaleString('en-US');
const fmtClock = totalSecs => {
  const s = Math.max(0, Math.floor(totalSecs));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};
const fmtMinutes = secs => {
  const m = Math.round(secs / 60);
  if (m < 60) return fmtInt(m);
  const h = Math.floor(m / 60);
  return h + 'h ' + (m % 60) + 'm';
};
const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const easeOut = k => 1 - Math.pow(1 - k, 2);
const median = arr => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const escapeHTML = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hashString = s => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const isHex = v => /^#[0-9a-f]{6}$/i.test(String(v || ''));
const onColor = hex => {
  if (!isHex(hex)) return '#101010';
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return L > 0.42 ? '#101010' : '#ffffff';
};

/* ---------- persistence ---------- */
const LS = {
  settings: 'chunky.settings',
  history: 'chunky.history',
  achievements: 'chunky.achievements',
  best: 'chunky.best',
  read: 'chunky.read',
  custom: 'chunky.custom',
  daily: 'chunky.daily',
};
let storageOk = true;
const loadJSON = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    storageOk = false;
    return fallback;
  }
};
const saveJSON = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; }
  catch { storageOk = false; return false; }
};

/* ---------- settings ---------- */
const DEFAULT_SETTINGS = {
  v: 3,
  theme: 'monkey',
  accent: '#e2b714',
  fontSize: 64,
  fontFamily: "'Roboto Mono', monospace",
  pivot: true,
  showPassage: true,
  context: true,
  punct: true,
  punctStrength: 'normal',
  ramp: true,
  sound: false,
  smartChunks: true,
  goal: 500,
  mode: 'passage',
  chunkSize: 2,
  wpm: 300,
  length: 'medium',
  timeLimit: 60,
};

function loadSettings() {
  const raw = loadJSON(LS.settings, {}) || {};
  const s = Object.assign({}, DEFAULT_SETTINGS, raw);
  if (!THEME_IDS.includes(s.theme)) s.theme = 'monkey';
  if (!isHex(s.accent)) s.accent = DEFAULT_SETTINGS.accent;
  if (!PUNCT_MULT[s.punctStrength]) s.punctStrength = 'normal';
  s.fontSize = clamp(Number(s.fontSize) || 64, 36, 128);
  s.chunkSize = clamp(Number(s.chunkSize) || 2, 1, 4);
  s.wpm = clamp(Number(s.wpm) || 300, WPM_MIN, WPM_MAX);
  s.goal = clamp(Number(s.goal) || 0, 0, 5000);
  s.v = 3;
  return s;
}

/* ---------- themes ---------- */
const THEMES = [
  { id: 'monkey',    name: 'monkeytype', bg: '#323437', main: '#e2b714', text: '#d1d0c5' },
  { id: 'nord',      name: 'nord',       bg: '#2e3440', main: '#88c0d0', text: '#d8dee9' },
  { id: 'gruvbox',   name: 'gruvbox',    bg: '#282828', main: '#fabd2f', text: '#ebdbb2' },
  { id: 'dracula',   name: 'dracula',    bg: '#282a36', main: '#bd93f9', text: '#f8f8f2' },
  { id: 'catppuccin',name: 'catppuccin', bg: '#1e1e2e', main: '#cba6f7', text: '#cdd6f4' },
  { id: 'monokai',   name: 'monokai',    bg: '#272822', main: '#a6e22e', text: '#f8f8f2' },
  { id: 'solarized', name: 'solarized',  bg: '#002b36', main: '#b58900', text: '#eee8d5' },
  { id: 'midnight',  name: 'midnight',   bg: '#0f172a', main: '#38bdf8', text: '#e2e8f0' },
  { id: 'rosepine',  name: 'rosé pine',  bg: '#191724', main: '#ebbcba', text: '#e0def4' },
  { id: 'forest',    name: 'forest',     bg: '#0d1f16', main: '#8fd3a0', text: '#dce8dd' },
  { id: 'daybreak',  name: 'daybreak',   bg: '#f5f2ea', main: '#c2410c', text: '#3a3833' },
  { id: 'paper',     name: 'paper',      bg: '#f8f8f6', main: '#2563eb', text: '#1f2937' },
];
const THEME_IDS = [...THEMES.map(t => t.id), 'custom'];

/* ---------- chunking ---------- */
/* Words that read badly at the end of a chunk. */
const STICKY = new Set((
  'a an the of in on at to for from by with and or but as is are was were be been ' +
  'that this these those my your his her its our their not no so if then than into ' +
  'over under about after before between during through without within up out off per via'
).split(' '));

const makeChunk = (words, start, end) => ({
  start,
  end,
  text: words.slice(start, end).join(' '),
  wordCount: end - start,
});

const stripWord = w => w.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');

/**
 * Fixed-width chunks, optionally nudged so they don't break on function words.
 * Keeps chunk sizes small and phrases readable at the same time.
 */
function buildChunks(words, size, smart = false) {
  const out = [];
  const n = words.length;
  if (!n) return out;
  if (!smart || size <= 1) {
    for (let i = 0; i < n; i += size) out.push(makeChunk(words, i, Math.min(n, i + size)));
    return out;
  }
  let i = 0;
  while (i < n) {
    let take = Math.min(size, n - i);
    if (i + take < n && take > 1) {
      const last = stripWord(words[i + take - 1]);
      const lastRaw = words[i + take - 1];
      // don't strand a function word at the end of a chunk — but never shrink
      // a chunk to a single word just to do it (that reads worse than "of the")
      if (take > 2 && STICKY.has(last) && !/[.,;:!?…—–-]$/.test(lastRaw)) take -= 1;
      // and don't finish on an opening quote or bracket
      if (/^["'“”‘’(\[]/.test(words[i + take])) take = Math.max(1, take - 1);
    }
    out.push(makeChunk(words, i, i + take));
    i += take;
  }
  return out;
}

/** Precompute sentence spans and attach each chunk to its sentence. */
function annotateSentences(words, chunks) {
  const sentences = [];
  let start = 0;
  words.forEach((w, i) => {
    if (/[.!?…]["'”’)\]]?$/.test(w) || i === words.length - 1) {
      sentences.push({ start, end: i });
      start = i + 1;
    }
  });
  if (!sentences.length) sentences.push({ start: 0, end: Math.max(0, words.length - 1) });
  chunks.forEach(c => {
    c.sentence = sentences.findIndex(s => c.start >= s.start && c.start <= s.end);
    if (c.sentence < 0) c.sentence = sentences.length - 1;
  });
  return sentences;
}

/** Optimal recognition point, in characters. */
function orpIndex(text) {
  const n = text.length;
  if (n <= 3) return 0;
  if (n <= 6) return 1;
  if (n <= 10) return 2;
  if (n <= 14) return 3;
  if (n <= 20) return 4;
  if (n <= 28) return 5;
  return 6;
}

/* ---------- pacing ---------- */
const PUNCT_MULT = {
  gentle:     { sentence: 1.6, comma: 1.18, dash: 1.08 },
  normal:     { sentence: 2.05, comma: 1.38, dash: 1.18 },
  aggressive: { sentence: 2.6, comma: 1.75, dash: 1.3 },
};

function punctMultiplier(text, strength) {
  const m = PUNCT_MULT[strength] || PUNCT_MULT.normal;
  if (/[.!?…]+["'”’)\]]?$/.test(text)) return m.sentence;
  if (/[,;:]["'”’)\]]?$/.test(text)) return m.comma;
  if (/[—–-]["'”’)\]]?$/.test(text)) return m.dash;
  return 1;
}

/** Ramp mode climbs 60% over the passage; every other mode holds steady. */
function effectiveWpm(mode, baseWpm, idx, total) {
  if (mode !== 'ramp' || !total) return baseWpm;
  return baseWpm * (1 + 0.6 * clamp(idx / total, 0, 1));
}

/* ---------- scoring ---------- */
const scoreSession = (wpm, comp) => (comp == null ? wpm : Math.round(wpm * (comp / 100)));
const focusScore = (wpm, comp) => (comp == null
  ? clamp(Math.round(wpm / 6), 0, 100)
  : clamp(Math.round(comp * 0.7 + (Math.min(wpm, 600) / 600) * 30), 0, 100));

/* ---------- streaks (DST-safe) ---------- */
function computeStreaks(hist) {
  const set = new Set(hist.map(e => dayKey(new Date(e.ts))));
  const days = [...set].sort();
  let cur = 0;
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (set.has(dayKey(d))) { cur++; d.setDate(d.getDate() - 1); }
  let bestRun = 0, run = 0, prev = null;
  for (const ds of days) {
    const t = Date.parse(ds + 'T12:00:00');
    run = (prev != null && Math.round((t - prev) / 86400000) === 1) ? run + 1 : 1;
    if (run > bestRun) bestRun = run;
    prev = t;
  }
  return { cur, bestRun, days };
}

/* ---------- records ---------- */
const bestKey = (mode, chunkSize) => `${mode}:${chunkSize}`;

function migrateBest(raw) {
  if (raw && typeof raw === 'object' && raw.keys && typeof raw.keys === 'object') return { keys: raw.keys, legacy: raw.legacy || null };
  if (raw && typeof raw === 'object' && Number(raw.score) > 0) {
    return { keys: {}, legacy: { score: Number(raw.score), label: String(raw.label || raw.score) } };
  }
  return { keys: {}, legacy: null };
}
function bestFor(best, mode, chunkSize) {
  return best.keys[bestKey(mode, chunkSize)] || null;
}

/* ---------- daily challenge ---------- */
function dailyPassageId(dateStr) {
  return PASSAGES[hashString(dateStr) % PASSAGES.length].id;
}

/* ---------- achievements ---------- */
const ACHIEVEMENTS = [
  { id: 'first',    name: 'first chunk',   desc: 'finish your first session',              test: h => h.length >= 1 },
  { id: 'ten',      name: 'warming up',    desc: 'finish 10 sessions',                     test: h => h.length >= 10 },
  { id: 'fifty',    name: 'chunk machine', desc: 'finish 50 sessions',                     test: h => h.length >= 50 },
  { id: 'streak7',  name: 'on a roll',     desc: 'read 7 days in a row',                   test: (h, c) => c.bestRun >= 7 },
  { id: 'streak30', name: 'unstoppable',   desc: 'read 30 days in a row',                  test: (h, c) => c.bestRun >= 30 },
  { id: 'speed400', name: 'speed demon',   desc: '400+ wpm with comprehension measured',   test: h => h.some(s => s.wpm >= 400 && s.comp != null) },
  { id: 'warp600',  name: 'warp factor',   desc: '600+ wpm with comprehension measured',   test: h => h.some(s => s.wpm >= 600 && s.comp != null) },
  { id: 'warp1200', name: 'ludicrous speed', desc: '1,200+ wpm with comprehension measured', test: h => h.some(s => s.wpm >= 1200 && s.comp != null) },
  { id: 'warp2500', name: 'overdrive',     desc: '2,500+ wpm with comprehension measured',  test: h => h.some(s => s.wpm >= 2500 && s.comp != null) },
  { id: 'perfect',  name: 'razor sharp',   desc: '100% comprehension in a scored session', test: h => h.some(s => s.comp === 100) },
  { id: 'scholar',  name: 'scholar',       desc: '10 perfect-comprehension sessions',      test: h => h.filter(s => s.comp === 100).length >= 10 },
  { id: 'marathon', name: 'marathoner',    desc: 'read 25,000 words in total',             test: h => h.reduce((a, s) => a + (s.words || 0), 0) >= 25000 },
  { id: 'zen10',    name: 'zen master',    desc: 'finish 10 zen sessions',                 test: h => h.filter(s => s.mode === 'zen').length >= 10 },
  { id: 'eff500',   name: 'full focus',    desc: '500+ effective wpm in one session',      test: h => h.some(s => (s.eff || 0) >= 500 && s.comp != null) },
  { id: 'chunky',   name: 'four wide',     desc: '12 scored sessions at 4-word chunks',    test: h => h.filter(s => s.chunkSize === 4 && s.comp != null).length >= 12 },
  { id: 'daily7',   name: 'ritual',        desc: 'complete 7 daily challenges',            test: h => new Set(h.filter(s => s.daily).map(s => dayKey(new Date(s.ts)))).size >= 7 },
];
