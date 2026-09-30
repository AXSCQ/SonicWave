// node --test — SonicWave con un canvas simulado.
import test from 'node:test';
import assert from 'node:assert/strict';

const ctx2d = () => new Proxy({}, { get: (t, k) => (k in t ? t[k] : () => {}), set: (t, k, v) => { t[k] = v; return true; } });
globalThis.window = { devicePixelRatio: 1 };
globalThis.document = {
    createElement: () => ({ style: {}, getContext: ctx2d, addEventListener() {}, getBoundingClientRect: () => ({ left: 0, width: 300 }) }),
    querySelector: () => null,
};
const container = (width, height = 40) => ({ getBoundingClientRect: () => ({ width, height }), appendChild(c) { c.parentElement = this; } });

const { WaveformRenderer } = await import('../src/sonicwave.js');
const { binRanges } = await import('../src/utils/canvas-helpers.js');

test('binRanges log: cada barra tiene al menos un bin y cubren todo sin huecos', () => {
    const r = binRanges(1024, 32, 'log');
    assert.equal(r.length, 32);
    assert.equal(r[0][0], 1);
    assert.equal(r.at(-1)[1], 1024);
    for (const [a, b] of r) assert.ok(b > a);
    // las primeras barras (graves) tienen pocos bins; las últimas, muchos
    assert.ok(r[0][1] - r[0][0] < r.at(-1)[1] - r.at(-1)[0]);
});

test('binRanges con menos bins que barras no divide por cero', () => {
    const r = binRanges(8, 32, 'linear');
    assert.equal(r.length, 32);
    for (const [a, b] of r) assert.ok(b > a);
});

test('forma de onda creada oculta (ancho 0) se reparte bien al aparecer', () => {
    const w = new WaveformRenderer({ container: container(0), responsive: false, height: 40 });
    w.setPeaks(Array.from({ length: 1000 }, (_, i) => (i % 100) / 100), 100);
    assert.equal(w._peaks.length, 1);            // oculta: una barra
    w._width = 300; w._resamplePeaks();          // lo que hace el ResizeObserver
    assert.equal(w._peaks.length, 100);          // 300 px / (2 + 1)
    assert.ok(Math.max(...w._peaks) <= 1);
});

test('setTime usa la duración y el avance queda entre 0 y 1', () => {
    const w = new WaveformRenderer({ container: container(300), responsive: false });
    w.setPeaks([0.1, 0.5, 1], 200);
    w.setTime(50);
    assert.equal(w.progress, 0.25);
    w.setTime(999);
    assert.equal(w.progress, 1);
});
