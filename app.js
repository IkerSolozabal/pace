import { PRESETS, MILE_M, MAX_SPLITS, solve, splits, fmtClock, fmtSec, parseNum, toParts } from './calc.js';

const $ = (s) => document.querySelector(s);
const STORAGE_KEY = 'pace:v1';
const DEFAULTS = { mode: 'ruta', target: 'pace', lap: 400, unit: 'km', d: 10000, t: 3000, p: null };

const el = {
  body: document.body,
  modeSeg: $('#modeSeg'), targetSeg: $('#targetSeg'), lapSeg: $('#lapSeg'), unitSeg: $('#unitSeg'),
  dist: $('#dist'), distUnit: $('#distUnit'), presets: $('#presets'),
  th: $('#th'), tm: $('#tm'), ts: $('#ts'),
  pm: $('#pm'), ps: $('#ps'), paceUnit: $('#paceUnit'),
  hero: $('.hero'), heroLabel: $('#heroLabel'), heroValue: $('#heroValue'), heroUnit: $('#heroUnit'),
  stats: $('#stats'), rows: $('#rows'), splitsStep: $('#splitsStep'), splitsCount: $('#splitsCount'),
  share: $('#share'), reset: $('#reset'), toast: $('#toast'),
};
const fields = {
  distance: $('[data-field="distance"]'),
  time: $('[data-field="time"]'),
  pace: $('[data-field="pace"]'),
};

const state = { mode: DEFAULTS.mode, target: DEFAULTS.target, lap: DEFAULTS.lap, unit: DEFAULTS.unit };

/* ---------- Utilidades de formato ---------- */
const ok = (v) => Number.isFinite(v) && v > 0;
const nfCache = new Map();
function nf(v, maxDec) {
  if (!nfCache.has(maxDec)) {
    nfCache.set(maxDec, new Intl.NumberFormat('es-ES', { maximumFractionDigits: maxDec, useGrouping: false }));
  }
  return nfCache.get(maxDec).format(v);
}
const isPista = () => state.mode === 'pista';
const timeDec = () => (isPista() ? 1 : 0);
const paceDec = () => (isPista() && state.unit === 'lap' ? 1 : 0);
const lapLabel = () => `${state.lap} m`;

function distLabel(m) {
  if (m < 1000 || (isPista() && m <= 10000 && Number.isInteger(m))) return `${nf(m, 1)} m`;
  return `${nf(m / 1000, 3)} km`;
}

/* ---------- Lectura / escritura de campos ---------- */
function readDistance() {
  const v = parseNum(el.dist.value);
  if (!ok(v)) return null;
  return isPista() ? v : v * 1000;
}
function writeDistance(m) {
  el.dist.value = ok(m) ? (isPista() ? nf(m, 1) : nf(m / 1000, 4)) : '';
  autosize(el.dist);
  syncPresets(m);
}

function readClock(inputs) {
  const raw = inputs.map((i) => i.value.trim());
  if (raw.every((v) => v === '')) return null;
  const nums = raw.map((v) => (v === '' ? 0 : parseNum(v)));
  if (nums.some((x) => !Number.isFinite(x) || x < 0)) return null;
  const [h, m, s] = nums.length === 3 ? nums : [0, ...nums];
  const total = h * 3600 + m * 60 + s;
  return total > 0 ? total : null;
}
const readTime = () => readClock([el.th, el.tm, el.ts]);
function readPace() {
  const s = readClock([el.pm, el.ps]);
  if (s == null) return null;
  return state.unit === 'lap' ? (s * 1000) / state.lap : s;
}

function writeTime(s) {
  if (!ok(s)) { el.th.value = el.tm.value = el.ts.value = ''; return autosizeAll(); }
  const dec = timeDec();
  const p = toParts(s, dec);
  el.th.value = p.h ? String(p.h) : '';
  el.tm.value = p.h ? String(p.m).padStart(2, '0') : String(p.m);
  el.ts.value = fmtSec(p.s, dec);
  autosizeAll();
}
function writePace(secPerKm) {
  if (!ok(secPerKm)) { el.pm.value = el.ps.value = ''; return autosizeAll(); }
  const s = state.unit === 'lap' ? (secPerKm * state.lap) / 1000 : secPerKm;
  const dec = paceDec();
  const p = toParts(s, dec);
  el.pm.value = String(p.h * 60 + p.m);
  el.ps.value = fmtSec(p.s, dec);
  autosizeAll();
}

/* Ajusta el ancho de los inputs de reloj a su contenido (fuente monoespaciada). */
function autosize(input) {
  const len = Math.max(input.value.length, input.placeholder.length, 1);
  input.style.width = `${len + 0.3}ch`;
}
function autosizeAll() { [el.dist, el.th, el.tm, el.ts, el.pm, el.ps].forEach(autosize); }

/* ---------- Segmented controls ---------- */
function setupSeg(seg, onChange) {
  const btns = [...seg.querySelectorAll('button')];
  seg.style.setProperty('--n', btns.length);
  btns.forEach((b) => b.addEventListener('click', () => onChange(b.dataset.value)));
  seg.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = btns.findIndex((b) => b.getAttribute('aria-checked') === 'true');
    const next = btns[(i + (e.key === 'ArrowRight' ? 1 : -1) + btns.length) % btns.length];
    next.focus();
    onChange(next.dataset.value);
  });
}
function syncSeg(seg, value) {
  [...seg.querySelectorAll('button')].forEach((b, i) => {
    const on = b.dataset.value === String(value);
    b.setAttribute('aria-checked', on);
    b.tabIndex = on ? 0 : -1;
    if (on) seg.style.setProperty('--i', i);
  });
}

/* ---------- Presets ---------- */
function renderPresets() {
  const list = isPista() ? [...PRESETS.track, ...PRESETS.common] : PRESETS.common;
  el.presets.innerHTML = list
    .map((p) => `<button type="button" class="chip${/^\d+$/.test(p.label) ? ' track' : ''}" data-m="${p.m}" aria-pressed="false">${p.label}</button>`)
    .join('');
}
function syncPresets(m) {
  el.presets.querySelectorAll('.chip').forEach((c) => {
    c.setAttribute('aria-pressed', ok(m) && Math.abs(Number(c.dataset.m) - m) < 0.01);
  });
}

/* ---------- UI general ---------- */
function syncUI() {
  el.body.dataset.mode = state.mode;
  syncSeg(el.modeSeg, state.mode);
  syncSeg(el.targetSeg, state.target);
  syncSeg(el.lapSeg, state.lap);
  syncSeg(el.unitSeg, state.unit);
  el.distUnit.textContent = isPista() ? 'm' : 'km';
  el.paceUnit.textContent = state.unit === 'lap' ? `/${lapLabel()}` : '/km';
  el.splitsStep.textContent = isPista() ? `cada ${lapLabel()}` : 'cada 1 km';
  for (const [key, f] of Object.entries(fields)) {
    const isTarget = key === state.target;
    f.classList.toggle('is-target', isTarget);
    f.querySelectorAll('input').forEach((i) => {
      i.readOnly = isTarget;
      i.tabIndex = isTarget ? -1 : 0;
    });
  }
}

/* Cambia el estado manteniendo los valores en unidades canónicas (m, s, s/km). */
function withCanonical(mutate) {
  const d = readDistance(), t = readTime(), p = readPace();
  mutate();
  syncUI();
  renderPresets();
  writeDistance(d);
  writeTime(t);
  writePace(p);
  compute();
}

/* ---------- Cálculo y render ---------- */
let lastHero = '';
function compute() {
  const vals = { distanceM: readDistance(), timeS: readTime(), paceS: readPace() };
  const res = solve(state.target, vals);
  if (state.target === 'distance') writeDistance(res?.distanceM);
  else syncPresets(vals.distanceM);
  if (state.target === 'time') writeTime(res?.timeS);
  if (state.target === 'pace') writePace(res?.paceS);
  render(res);
  persist(res ?? vals);
}

function render(res) {
  const items = res ? buildItems(res) : null;
  const hero = items?.[state.target] ?? { k: { pace: 'Ritmo', time: 'Tiempo', distance: 'Distancia' }[state.target], v: '—', u: '' };
  el.heroLabel.textContent = hero.k;
  el.heroValue.textContent = hero.v;
  el.heroUnit.textContent = hero.u ?? '';
  if (hero.v !== lastHero) {
    el.hero.classList.remove('bump');
    void el.hero.offsetWidth; // reinicia la animación
    el.hero.classList.add('bump');
    lastHero = hero.v;
  }

  const order = ['pace', 'time', 'distance', 'speed', 'extra'].filter((k) => k !== state.target).slice(0, 4);
  const blank = buildItems(null);
  el.stats.innerHTML = order
    .map((k) => {
      const it = items ? items[k] : blank[k];
      return `<div class="stat"><dt>${it.k}</dt><dd>${it.v}${it.u ? `<small>${it.u}</small>` : ''}</dd></div>`;
    })
    .join('');

  renderSplits(res);
}

function buildItems(res) {
  const pista = isPista();
  const extraLabel = pista ? `Vuelta ${lapLabel()}` : 'Ritmo milla';
  if (!res) {
    return {
      pace: { k: 'Ritmo', v: '—' }, time: { k: 'Tiempo', v: '—' }, distance: { k: 'Distancia', v: '—' },
      speed: { k: 'Velocidad', v: '—' }, extra: { k: extraLabel, v: '—' },
    };
  }
  const { distanceM: d, timeS: t, paceS: p } = res;
  const dl = distLabel(d).split(' ');
  return {
    pace: { k: 'Ritmo', v: fmtClock(p, 0), u: '/km' },
    time: { k: 'Tiempo', v: fmtClock(t, timeDec()) },
    distance: { k: 'Distancia', v: dl[0], u: dl[1] },
    speed: { k: 'Velocidad', v: nf(3600 / p, 2), u: 'km/h' },
    extra: pista
      ? { k: extraLabel, v: fmtClock((p * state.lap) / 1000, 1) }
      : { k: extraLabel, v: fmtClock((p * MILE_M) / 1000, 0), u: '/mi' },
  };
}

function renderSplits(res) {
  if (!res) {
    el.splitsCount.textContent = '';
    el.rows.innerHTML = `<div class="empty">Introduce dos de los tres valores para ver los parciales.</div>`;
    return;
  }
  const { distanceM: d, timeS: t } = res;
  const step = isPista() ? state.lap : 1000;
  const dec = timeDec();
  const total = Math.ceil(d / step - 1e-9);
  const list = splits(d, t, step);
  el.splitsCount.textContent = `${total} ${total === 1 ? 'tramo' : 'tramos'}`;

  const html = list.map((r, i) => {
    const last = i === list.length - 1 && total <= MAX_SPLITS;
    const km = Math.abs(r.d % 1000) < 1e-6 || Math.abs((r.d % 1000) - 1000) < 1e-6;
    const [num, unit] = isPista() && !(km && r.d >= 1000)
      ? [nf(r.d, 1), 'm']
      : [nf(r.d / 1000, km ? 0 : 3), 'km'];
    const label = `${num}<small>${unit}</small>`;
    const cls = ['r', km ? 'km' : '', last ? 'last' : ''].join(' ').trim();
    return `<div class="${cls}" role="row" style="--p:${((r.d / d) * 100).toFixed(2)}%">` +
      `<span class="d" role="cell">${label}</span>` +
      `<span role="cell">${fmtClock(r.split, dec)}</span>` +
      // Por encima de 1 h las décimas no aportan y ensanchan la columna.
      `<span role="cell">${fmtClock(r.cum, r.cum >= 3600 ? 0 : dec)}</span></div>`;
  });
  if (total > MAX_SPLITS) html.push(`<div class="more">Mostrando los primeros ${MAX_SPLITS} tramos</div>`);
  el.rows.innerHTML = html.join('');
}

/* ---------- Persistencia (hash compartible + localStorage) ---------- */
function round(v, dec) { return ok(v) ? Number(v.toFixed(dec)) : null; }
function persist(v) {
  const params = new URLSearchParams({ m: state.mode, c: state.target });
  if (isPista()) { params.set('l', state.lap); params.set('u', state.unit); }
  const d = round(v.distanceM, 2), t = round(v.timeS, 2), p = round(v.paceS, 3);
  if (d && state.target !== 'distance') params.set('d', d);
  if (t && state.target !== 'time') params.set('t', t);
  if (p && state.target !== 'pace') params.set('p', p);
  const hash = '#' + params.toString();
  try { history.replaceState(null, '', hash); } catch { /* file:// u otros contextos */ }
  try { localStorage.setItem(STORAGE_KEY, hash); } catch { /* modo privado */ }
}

function loadState() {
  let src = location.hash.slice(1);
  if (!src) { try { src = (localStorage.getItem(STORAGE_KEY) || '').slice(1); } catch { src = ''; } }
  if (!src) return { ...DEFAULTS };
  const q = new URLSearchParams(src);
  const num = (k) => { const n = parseFloat(q.get(k)); return ok(n) ? n : null; };
  const mode = q.get('m') === 'pista' ? 'pista' : 'ruta';
  return {
    mode,
    target: ['pace', 'time', 'distance'].includes(q.get('c')) ? q.get('c') : 'pace',
    lap: q.get('l') === '200' ? 200 : 400,
    unit: mode === 'pista' && q.get('u') === 'lap' ? 'lap' : 'km',
    d: num('d'), t: num('t'), p: num('p'),
  };
}

function apply(s) {
  Object.assign(state, { mode: s.mode, target: s.target, lap: s.lap, unit: s.unit });
  syncUI();
  renderPresets();
  writeDistance(s.d);
  writeTime(s.t);
  writePace(s.p);
  compute();
}

/* ---------- Toast ---------- */
let toastTimer;
function toast(msg) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2000);
}

/* ---------- Eventos ---------- */
setupSeg(el.modeSeg, (v) => withCanonical(() => { state.mode = v; if (v === 'ruta') state.unit = 'km'; }));
setupSeg(el.lapSeg, (v) => withCanonical(() => { state.lap = Number(v); }));
setupSeg(el.unitSeg, (v) => withCanonical(() => { state.unit = v; }));
setupSeg(el.targetSeg, (v) => { state.target = v; syncUI(); compute(); });

el.presets.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  // Si estabas calculando la distancia, al elegir una prueba pasas a calcular el tiempo.
  if (state.target === 'distance') { state.target = readPace() ? 'time' : 'pace'; syncUI(); }
  writeDistance(Number(chip.dataset.m));
  compute();
});

const nextOf = new Map([[el.th, el.tm], [el.tm, el.ts], [el.pm, el.ps]]);
for (const input of [el.dist, el.th, el.tm, el.ts, el.pm, el.ps]) {
  input.addEventListener('input', (e) => {
    const allowDecimal = input === el.dist || input === el.ts || input === el.ps;
    const clean = input.value.replace(allowDecimal ? /[^\d.,]/g : /\D/g, '');
    if (clean !== input.value) input.value = clean;
    autosize(input);
    // Salto automático al siguiente campo al teclear 2 dígitos en minutos.
    const next = nextOf.get(input);
    if (next && input !== el.th && e.inputType === 'insertText' && /^\d{2}$/.test(input.value)) {
      next.focus();
    }
    compute();
  });
  // Selecciona el contenido al entrar para sobrescribir directamente (útil en móvil).
  let justFocused = false;
  input.addEventListener('focus', () => { if (!input.readOnly) { justFocused = true; input.select(); } });
  input.addEventListener('pointerup', (e) => { if (justFocused) { e.preventDefault(); input.select(); } justFocused = false; });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
}

el.share.addEventListener('click', async () => {
  const url = location.href;
  try {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ title: 'Pace — mi cálculo', url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado');
  } catch (err) {
    if (err?.name !== 'AbortError') toast('No se pudo copiar el enlace');
  }
});

el.reset.addEventListener('click', () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* nada */ }
  apply({ ...DEFAULTS, mode: state.mode });
  toast('Valores restablecidos');
});

window.addEventListener('hashchange', () => apply(loadState()));

apply(loadState());
