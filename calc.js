// Lógica pura de cálculo de ritmos. Sin dependencias del DOM para poder testearla.
// Unidades internas: distancia en metros, tiempo en segundos, ritmo en segundos por km.

export const MILE_M = 1609.344;

export const PRESETS = {
  common: [
    { id: '5k', label: '5K', m: 5000 },
    { id: '10k', label: '10K', m: 10000 },
    { id: 'half', label: 'Media', m: 21097.5 },
    { id: 'marathon', label: 'Maratón', m: 42195 },
  ],
  track: [
    { id: '400', label: '400', m: 400 },
    { id: '800', label: '800', m: 800 },
    { id: '1500', label: '1500', m: 1500 },
    { id: '3000', label: '3000', m: 3000 },
  ],
};

export const MAX_SPLITS = 1000;

const ok = (v) => Number.isFinite(v) && v > 0;

export const paceFrom = (distanceM, timeS) => timeS / (distanceM / 1000);
export const timeFrom = (distanceM, paceS) => (paceS * distanceM) / 1000;
export const distanceFrom = (timeS, paceS) => (timeS / paceS) * 1000;

/**
 * Calcula la magnitud `target` a partir de las otras dos.
 * @param {'pace'|'time'|'distance'} target
 * @param {{distanceM?:number, timeS?:number, paceS?:number}} v
 * @returns {{distanceM:number, timeS:number, paceS:number} | null}
 */
export function solve(target, { distanceM, timeS, paceS }) {
  switch (target) {
    case 'pace':
      return ok(distanceM) && ok(timeS) ? { distanceM, timeS, paceS: paceFrom(distanceM, timeS) } : null;
    case 'time':
      return ok(distanceM) && ok(paceS) ? { distanceM, paceS, timeS: timeFrom(distanceM, paceS) } : null;
    case 'distance':
      return ok(timeS) && ok(paceS) ? { timeS, paceS, distanceM: distanceFrom(timeS, paceS) } : null;
    default:
      return null;
  }
}

/**
 * Parciales a ritmo constante cada `stepM` metros. El último puede ser parcial.
 * @returns {{d:number, split:number, cum:number}[]}
 */
export function splits(distanceM, timeS, stepM, max = MAX_SPLITS) {
  if (!ok(distanceM) || !ok(timeS) || !ok(stepM)) return [];
  const n = Math.min(Math.ceil(distanceM / stepM - 1e-9), max);
  const rows = [];
  let prev = 0;
  for (let i = 1; i <= n; i++) {
    const d = Math.min(i * stepM, distanceM);
    const cum = (timeS * d) / distanceM;
    rows.push({ d, split: cum - prev, cum });
    prev = cum;
  }
  return rows;
}

/** Acepta "21,0975" o "21.0975". Devuelve NaN si no es un número. */
export function parseNum(str) {
  if (typeof str === 'number') return str;
  const s = String(str ?? '').trim().replace(',', '.');
  if (s === '' || !/^\d*\.?\d*$/.test(s)) return NaN;
  return parseFloat(s);
}

/** Descompone segundos en h/m/s redondeando a `dec` decimales (con acarreo correcto). */
export function toParts(seconds, dec = 0) {
  const f = 10 ** dec;
  let t = Math.round(seconds * f) / f;
  const h = Math.floor(t / 3600);
  t -= h * 3600;
  const m = Math.floor(t / 60);
  const s = Math.round((t - m * 60) * f) / f;
  return { h, m, s };
}

/** Segundos con dos dígitos enteros: 5 -> "05", 8.5 -> "08.5". Quita ".0". */
export function fmtSec(s, dec = 0) {
  let str = s.toFixed(dec);
  if (dec && /\.0+$/.test(str)) str = str.replace(/\.0+$/, '');
  const [int, frac] = str.split('.');
  return int.padStart(2, '0') + (frac ? '.' + frac : '');
}

/** Formatea como h:mm:ss o m:ss (con `dec` decimales opcionales en los segundos). */
export function fmtClock(seconds, dec = 0) {
  if (!Number.isFinite(seconds)) return '—';
  const { h, m, s } = toParts(seconds, dec);
  const ss = fmtSec(s, dec);
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}
