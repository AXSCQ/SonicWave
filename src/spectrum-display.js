/**
 * SpectrumDisplay — Real-time frequency spectrum visualization.
 * Canvas-based audio spectrum analyzer with multiple display modes.
 */
import { createHiDPICanvas, fitCanvasToContainer, roundedRect } from './utils/canvas-helpers.js';

export class SpectrumDisplay {
    /**
     * @param {object} config
     * @param {HTMLElement|string} config.container - Container element or selector
     * @param {string} [config.mode='bars'] - 'bars' | 'line' | 'mirror'
     * @param {string} [config.colorLow='#3B82F6'] - Color for low frequencies
     * @param {string} [config.colorMid='#8B5CF6'] - Color for mid frequencies
     * @param {string} [config.colorHigh='#EF4444'] - Color for high frequencies
     * @param {number} [config.barWidth=3] - Width of spectrum bars
     * @param {number} [config.barGap=1] - Gap between bars
     * @param {number} [config.smoothing=0.7] - Visual smoothing factor (0-1)
     * @param {boolean} [config.responsive=true] - Auto-resize
     */
    constructor(config = {}) {
        this._container = typeof config.container === 'string'
            ? document.querySelector(config.container)
            : config.container;

        if (!this._container) throw new Error('SonicWave: Spectrum container not found');

        this._mode = config.mode || 'bars';
        this._colorLow = config.colorLow || '#3B82F6';
        this._colorMid = config.colorMid || '#8B5CF6';
        this._colorHigh = config.colorHigh || '#EF4444';
        this._barWidth = config.barWidth ?? 3;
        this._barGap = config.barGap ?? 1;
        this._smoothing = config.smoothing ?? 0.7;

        const rect = this._container.getBoundingClientRect();
        const { canvas, ctx } = createHiDPICanvas(this._container, rect.width, rect.height || 120);
        this._canvas = canvas;
        this._ctx = ctx;
        this._width = rect.width;
        this._height = rect.height || 120;

        this._canvas.style.display = 'block';

        /** @type {Float32Array|null} */
        this._smoothedData = null;
        this._rafId = null;
        this._running = false;

        // Responsive
        if (config.responsive !== false && typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => {
                const dim = fitCanvasToContainer(this._canvas);
                if (dim) {
                    this._width = dim.width;
                    this._height = dim.height;
                }
            });
            this._resizeObserver.observe(this._container);
        }
    }

    /**
     * Update with frequency data and draw
     * @param {Uint8Array} frequencyData - Raw frequency data from analyser
     */
    update(frequencyData) {
        if (!frequencyData) return;

        // Apply smoothing
        if (!this._smoothedData || this._smoothedData.length !== frequencyData.length) {
            this._smoothedData = new Float32Array(frequencyData.length);
        }

        for (let i = 0; i < frequencyData.length; i++) {
            const newVal = frequencyData[i] / 255;
            this._smoothedData[i] = this._smoothedData[i] * this._smoothing + newVal * (1 - this._smoothing);
        }

        this._draw();
    }

    _draw() {
        if (!this._smoothedData) return;
        const ctx = this._ctx;
        ctx.clearRect(0, 0, this._width, this._height);

        switch (this._mode) {
            case 'bars': this._drawBars(); break;
            case 'line': this._drawLine(); break;
            case 'mirror': this._drawMirror(); break;
        }
    }

    _getColorForBin(index, total) {
        const pos = index / total;
        if (pos < 0.33) return this._colorLow;
        if (pos < 0.66) return this._colorMid;
        return this._colorHigh;
    }

    _drawBars() {
        const ctx = this._ctx;
        const data = this._smoothedData;
        const step = this._barWidth + this._barGap;
        const numBars = Math.min(data.length, Math.floor(this._width / step));
        const binsPerBar = Math.floor(data.length / numBars);

        for (let i = 0; i < numBars; i++) {
            // Average bins for this bar
            let sum = 0;
            const start = i * binsPerBar;
            for (let j = 0; j < binsPerBar; j++) {
                sum += data[start + j] || 0;
            }
            const avg = sum / binsPerBar;

            const barH = Math.max(1, avg * this._height * 0.95);
            const x = i * step;
            const y = this._height - barH;

            ctx.fillStyle = this._getColorForBin(i, numBars);
            roundedRect(ctx, x, y, this._barWidth, barH, 1);
            ctx.fill();
        }
    }

    _drawLine() {
        const ctx = this._ctx;
        const data = this._smoothedData;
        const sliceWidth = this._width / data.length;

        ctx.beginPath();
        ctx.strokeStyle = this._colorMid;
        ctx.lineWidth = 2;

        for (let i = 0; i < data.length; i++) {
            const x = i * sliceWidth;
            const y = (1 - data[i]) * this._height;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }

        ctx.stroke();
    }

    _drawMirror() {
        const ctx = this._ctx;
        const data = this._smoothedData;
        const step = this._barWidth + this._barGap;
        const numBars = Math.min(data.length, Math.floor(this._width / step));
        const binsPerBar = Math.floor(data.length / numBars);
        const center = this._height / 2;

        for (let i = 0; i < numBars; i++) {
            let sum = 0;
            const start = i * binsPerBar;
            for (let j = 0; j < binsPerBar; j++) {
                sum += data[start + j] || 0;
            }
            const avg = sum / binsPerBar;

            const barH = Math.max(1, avg * center * 0.9);
            const x = i * step;

            ctx.fillStyle = this._getColorForBin(i, numBars);
            // Top half
            ctx.fillRect(x, center - barH, this._barWidth, barH);
            // Bottom half (mirrored)
            ctx.fillRect(x, center, this._barWidth, barH);
        }
    }

    /**
     * Set display mode
     */
    setMode(mode) {
        this._mode = mode;
    }

    destroy() {
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this._canvas && this._canvas.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }
    }
}
