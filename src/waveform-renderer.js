/**
 * WaveformRenderer — Canvas-based audio waveform visualization.
 * Replaces WaveSurfer.js with a zero-dependency implementation.
 * Extracted/improved from AstroPrueba AudioVisualizer.astro WaveSurfer usage.
 */
import { createHiDPICanvas, fitCanvasToContainer, roundedRect } from './utils/canvas-helpers.js';

// Resolution kept from a decoded file: enough for any width, re-bucketed on resize.
const RAW_BUCKETS = 4000;

export class WaveformRenderer {
    /**
     * @param {object} config
     * @param {HTMLElement|string} config.container - Container element or selector
     * @param {string} [config.waveColor='#4fa4e0'] - Unplayed waveform color
     * @param {string} [config.progressColor='#0ec3f0'] - Played waveform color
     * @param {string} [config.cursorColor='#ffffff'] - Cursor line color
     * @param {number} [config.cursorWidth=1] - Cursor width in px
     * @param {number} [config.height=48] - Waveform height
     * @param {number} [config.barWidth=2] - Bar width in px
     * @param {number} [config.barGap=1] - Gap between bars in px
     * @param {number} [config.barRadius=1] - Bar corner radius
     * @param {boolean} [config.normalize=true] - Normalize waveform amplitude
     * @param {boolean} [config.responsive=true] - Auto-resize on container change
     */
    constructor(config = {}) {
        this._container = typeof config.container === 'string'
            ? document.querySelector(config.container)
            : config.container;

        if (!this._container) throw new Error('SonicWave: Container not found');

        this._waveColor = config.waveColor || '#4fa4e0';
        this._progressColor = config.progressColor || '#0ec3f0';
        this._cursorColor = config.cursorColor || '#ffffff';
        this._cursorWidth = config.cursorWidth ?? 1;
        this._barWidth = config.barWidth ?? 2;
        this._barGap = config.barGap ?? 1;
        this._barRadius = config.barRadius ?? 1;
        this._normalize = config.normalize ?? true;
        this._responsive = config.responsive ?? true;

        this._peaks = null;
        this._rawValues = null;  // values given to setPeaks(), re-bucketed on resize
        this._progress = 0;  // 0 to 1
        this._duration = 0;
        this._isReady = false;

        // Create canvas
        const rect = this._container.getBoundingClientRect();
        this._fixedHeight = config.height || 0;
        const h = config.height || rect.height || 48;
        const { canvas, ctx } = createHiDPICanvas(this._container, rect.width, h);
        this._canvas = canvas;
        this._ctx = ctx;
        this._width = rect.width;
        this._height = h;

        this._canvas.style.display = 'block';

        // Resize observer
        if (this._responsive && typeof ResizeObserver !== 'undefined') {
            this._resizeObserver = new ResizeObserver(() => {
                const dim = fitCanvasToContainer(this._canvas, this._fixedHeight);
                if (dim) {
                    this._width = dim.width;
                    this._height = dim.height;
                    // peaks are re-bucketed for the new width (created inside
                    // a hidden container, width was 0 and they collapsed)
                    if (this._rawValues) this._resamplePeaks();
                    this._draw();
                }
            });
            this._resizeObserver.observe(this._container);
        }
    }

    /**
     * Load audio and extract waveform peaks
     * @param {string|ArrayBuffer} source - Audio URL or ArrayBuffer
     */
    async load(source) {
        let arrayBuffer;

        if (typeof source === 'string') {
            const response = await fetch(source);
            arrayBuffer = await response.arrayBuffer();
        } else {
            arrayBuffer = source;
        }

        // decoding does not need an audio output: an offline context avoids
        // opening (and holding) a hardware AudioContext
        const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
        const decoder = Offline ? new Offline(1, 1, 44100) : new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await decoder.decodeAudioData(arrayBuffer);
        if (!Offline) await decoder.close();

        this._duration = audioBuffer.duration;
        // keep a high-resolution envelope (max |sample| of every channel) and
        // bucket it to the bars that fit now — and again on every resize
        this._rawValues = this._extractPeaks(audioBuffer);
        this._resamplePeaks();
        this._isReady = true;
        this._draw();
    }

    /** Max absolute sample of all channels in RAW_BUCKETS buckets. */
    _extractPeaks(audioBuffer) {
        const len = audioBuffer.length;
        const buckets = Math.max(1, Math.min(RAW_BUCKETS, len));
        const peaks = new Float32Array(buckets);
        for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
            const data = audioBuffer.getChannelData(c);
            for (let i = 0; i < buckets; i++) {
                const start = Math.floor((i * len) / buckets);
                const end = Math.floor(((i + 1) * len) / buckets);
                let max = peaks[i];
                for (let j = start; j < end; j++) {
                    const a = data[j] < 0 ? -data[j] : data[j];
                    if (a > max) max = a;
                }
                peaks[i] = max;
            }
        }
        return peaks;
    }

    /**
     * Use precomputed amplitude values instead of decoding audio (e.g. an
     * energy envelope from an offline analysis). Values are resampled to the
     * number of bars that fit the canvas (max per bucket).
     * @param {ArrayLike<number>} values - Amplitudes (any scale; normalized if `normalize`)
     * @param {number} [duration=0] - Duration in seconds, enables setTime()
     */
    setPeaks(values, duration = 0) {
        this._rawValues = values;
        this._duration = duration;
        this._resamplePeaks();
        this._isReady = true;
        this._draw();
        return this;
    }

    /** Buckets the values given to setPeaks() into the bars that fit now. */
    _resamplePeaks() {
        const values = this._rawValues;
        const step = this._barWidth + this._barGap;
        const totalBars = Math.max(1, Math.floor(this._width / step));
        const peaks = new Float32Array(totalBars);
        let maxPeak = 0;
        for (let i = 0; i < totalBars; i++) {
            const a = Math.floor((i * values.length) / totalBars);
            const b = Math.max(a + 1, Math.floor(((i + 1) * values.length) / totalBars));
            let m = 0;
            for (let j = a; j < b && j < values.length; j++) if (values[j] > m) m = values[j];
            peaks[i] = m;
            if (m > maxPeak) maxPeak = m;
        }
        if (this._normalize && maxPeak > 0) {
            for (let i = 0; i < peaks.length; i++) peaks[i] /= maxPeak;
        }
        this._peaks = peaks;
    }

    /**
     * Set playback progress (0 to 1)
     */
    setProgress(progress) {
        this._progress = Math.max(0, Math.min(1, progress));
        this._draw();
    }

    /**
     * Set time in seconds (requires duration to be known)
     */
    setTime(time) {
        if (this._duration > 0) {
            this.setProgress(time / this._duration);
        }
    }

    /**
     * Draw the waveform
     */
    _draw() {
        if (!this._peaks) return;

        const ctx = this._ctx;
        const w = this._width;
        const h = this._height;
        const peaks = this._peaks;
        const barW = this._barWidth;
        const gap = this._barGap;
        const step = barW + gap;
        const progressX = this._progress * w;

        ctx.clearRect(0, 0, w, h);

        for (let i = 0; i < peaks.length; i++) {
            const x = i * step;
            const barH = Math.max(2, peaks[i] * (h * 0.9));
            const y = (h - barH) / 2;

            // Determine color: played or unplayed
            ctx.fillStyle = x < progressX ? this._progressColor : this._waveColor;

            if (this._barRadius > 0) {
                roundedRect(ctx, x, y, barW, barH, this._barRadius);
                ctx.fill();
            } else {
                ctx.fillRect(x, y, barW, barH);
            }
        }

        // Draw cursor
        if (this._cursorWidth > 0 && this._progress > 0) {
            ctx.fillStyle = this._cursorColor;
            ctx.fillRect(progressX - this._cursorWidth / 2, 0, this._cursorWidth, h);
        }
    }

    /**
     * Enable click-to-seek on the waveform
     * @param {Function} onSeek - Callback with progress value (0-1)
     */
    enableSeek(onSeek) {
        this._canvas.style.cursor = 'pointer';
        this._canvas.addEventListener('click', (e) => {
            const rect = this._canvas.getBoundingClientRect();
            if (!rect.width) return;
            const progress = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            this.setProgress(progress);
            if (onSeek) onSeek(progress);
        });
        return this;
    }

    get isReady() { return this._isReady; }
    get duration() { return this._duration; }
    get progress() { return this._progress; }

    destroy() {
        if (this._resizeObserver) this._resizeObserver.disconnect();
        if (this._canvas && this._canvas.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }
    }
}
