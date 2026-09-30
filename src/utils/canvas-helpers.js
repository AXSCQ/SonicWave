/**
 * Canvas helper utilities for SonicWave
 */

/**
 * Create a high-DPI canvas with proper resolution
 */
export function createHiDPICanvas(container, width, height) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    if (container) container.appendChild(canvas);
    return { canvas, ctx, dpr };
}

/**
 * Resize a canvas to fit its container.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [fixedHeight] - keep this height (px) instead of the container's
 * @returns {{width, height, dpr}|undefined} undefined when the container has no size (hidden)
 */
export function fitCanvasToContainer(canvas, fixedHeight) {
    const container = canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = fixedHeight || rect.height;
    // a hidden container measures 0: keep the last size instead of a 0×0 canvas
    if (!width || !height) return;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { width, height, dpr };
}

/**
 * Map FFT bins to `count` bars. With `scale: 'log'` each bar covers the same
 * musical width (octaves), as the ear hears it; 'linear' gives each bar the
 * same number of bins (two thirds of the bars end up showing treble).
 * @returns {Array<[number, number]>} [firstBin, lastBinExclusive] per bar, never empty
 */
export function binRanges(binCount, count, scale = 'log') {
    const out = [];
    if (!binCount || !count) return out;
    if (scale === 'linear') {
        for (let i = 0; i < count; i++) {
            const a = Math.floor((i * binCount) / count);
            out.push([a, Math.max(a + 1, Math.floor(((i + 1) * binCount) / count))]);
        }
        return out;
    }
    // log: from bin 1 (skip DC) to the last bin
    const lo = 1, hi = binCount;
    for (let i = 0; i < count; i++) {
        const a = Math.floor(lo * Math.pow(hi / lo, i / count));
        const b = Math.floor(lo * Math.pow(hi / lo, (i + 1) / count));
        out.push([Math.min(a, binCount - 1), Math.min(binCount, Math.max(a + 1, b))]);
    }
    return out;
}

/**
 * Draw rounded rect helper
 */
export function roundedRect(ctx, x, y, w, h, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
