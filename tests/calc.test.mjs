import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, splits, fmtClock, parseNum, toParts } from '../calc.js';

test('ritmo a partir de distancia y tiempo', () => {
  const r = solve('pace', { distanceM: 10000, timeS: 3000 });
  assert.equal(r.paceS, 300);
});

test('tiempo a partir de distancia y ritmo (maratón a 4:15/km)', () => {
  const r = solve('time', { distanceM: 42195, paceS: 255 });
  assert.equal(fmtClock(r.timeS), '2:59:20');
});

test('distancia a partir de tiempo y ritmo', () => {
  const r = solve('distance', { timeS: 3600, paceS: 240 });
  assert.equal(r.distanceM, 15000);
});

test('faltan datos -> null', () => {
  assert.equal(solve('pace', { distanceM: 10000 }), null);
  assert.equal(solve('time', { distanceM: 0, paceS: 300 }), null);
});

test('parciales cada km con último tramo parcial', () => {
  const rows = splits(21097.5, 21097.5 * 0.3, 1000);
  assert.equal(rows.length, 22);
  assert.equal(rows[0].d, 1000);
  assert.ok(Math.abs(rows[0].split - 300) < 1e-9);
  assert.equal(rows.at(-1).d, 21097.5);
  assert.ok(Math.abs(rows.at(-1).split - 29.25) < 1e-9);
});

test('parciales cada 400 m en 5000 m', () => {
  const rows = splits(5000, 1200, 400);
  assert.equal(rows.length, 13);
  assert.ok(Math.abs(rows[0].split - 96) < 1e-9);
  assert.equal(rows.at(-1).d, 5000);
});

test('formato de reloj con acarreo', () => {
  assert.equal(fmtClock(59.6), '1:00');
  assert.equal(fmtClock(3599.5), '1:00:00');
  assert.equal(fmtClock(88.46, 1), '1:28.5');
  assert.equal(fmtClock(90, 1), '1:30');
  assert.deepEqual(toParts(299.96, 1), { h: 0, m: 5, s: 0 });
});

test('parseNum acepta coma y punto', () => {
  assert.equal(parseNum('21,0975'), 21.0975);
  assert.equal(parseNum('42.195'), 42.195);
  assert.ok(Number.isNaN(parseNum('abc')));
  assert.ok(Number.isNaN(parseNum('')));
});
