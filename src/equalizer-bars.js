/**
 * EqualizerBars — Interactive equalizer bar visualization.
 * Extracted and improved from AstroPrueba SoundWaves.astro
 * 
 * Features:
 * - Mouse-reactive bar heights
 * - Idle sinusoidal animation
 * - GPU-optimized with scaleY transforms
 * - Audio-reactive mode (integrates with SonicMotion data)
 */
import { createHiDPICanvas } from './utils/canvas-helpers.js';

export class EqualizerBars {
    /**
     * @param {object} config
     * @param {HTMLElement|string} config.container - Container element or selector
     * @param {number} [config.barCount=32] - Number of bars
     * @param {number} [config.maxHeight=100] - Max bar height in px
     * @param {string} [config.colorFrom='#3B82F6'] - Gradient start color
     * @param {string} [config.colorTo='#8B5CF6'] - Gradient end color
     * @param {number} [config.barWidth=12] - Bar width in px
     * @param {number} [config.barGap=2] - Gap between bars in px
     * @param {number} [config.barRadius=2] - Bar corner radius
     * @param {boolean} [config.mouseReactive=true] - React to mouse position
     * @param {boolean} [config.autoShow=false] - Auto-show/hide based on mouse position
     * @param {string} [config.position='bottom'] - 'bottom' | 'top'
     */
    constructor(config = {}) {
        this._container = typeof config.container === 'string'
            ? document.querySelector(config.container)
            : config.container;

        if (!this._container) throw new Error('SonicWave: Equalizer container not found');

        this._barCount = config.barCount ?? 32;
        this._maxHeight = config.maxHeight ?? 100;
        this._colorFrom = config.colorFrom || '#3B82F6';
        this._colorTo = config.colorTo || '#8B5CF6';
        this._barWidth = config.barWidth ?? 12;
        this._barGap = config.barGap ?? 2;
        this._barRadius = config.barRadius ?? 2;
        this._mouseReactive = config.mouseReactive ?? true;
        this._autoShow = config.autoShow ?? false;
        this._position = config.position || 'bottom';

        this._bars = [];
        this._mousePosition = { x: 0, y: 0 };
        this._isVisible = !this._autoShow;
        this._isActive = false;
        this._hideTimeout = null;
        this._rafId = null;
        this._frameCount = 0;

        /** @type {Float32Array|null} - External audio data for reactive mode */
        this._audioData = null;

        this._init();
    }

    _init() {
        // Create bar elements inside the container
        const barsWrapper = document.createElement('div');
        barsWrapper.style.cssText = `
            display: flex;
            align-items: ${this._position === 'bottom' ? 'flex-end' : 'flex-start'};
            justify-content: center;
            height: 100%;
            width: 100%;
            gap: ${this._barGap}px;
        `;

        for (let i = 0; i < this._barCount; i++) {
            const bar = document.createElement('div');
            const baseHeight = 5 + Math.random() * 15;

            bar.style.cssText = `
                width: ${this._barWidth}px;
                height: 5px;
                background: linear-gradient(to top, ${this._colorFrom}, ${this._colorTo});
                border-radius: ${this._barRadius}px ${this._barRadius}px 0 0;
                transform-origin: ${this._position === 'bottom' ? 'bottom' : 'top'};
                transform: scaleY(${baseHeight / 5});
                will-change: transform;
                transition: opacity 0.2s;
            `;

            barsWrapper.appendChild(bar);
            this._bars.push({
                element: bar,
                height: baseHeight,
                targetHeight: baseHeight,
                baseHeight,
                phase: Math.random() * Math.PI * 2
            });
        }

        this._container.appendChild(barsWrapper);

        if (!this._isVisible) {
            this._container.style.opacity = '0';
            this._container.style.transition = 'opacity 0.5s';
        }

        // Mouse events
        if (this._mouseReactive) {
            let lastMoveTime = 0;
            document.addEventListener('mousemove', (e) => {
                const now = Date.now();
                if (now - lastMoveTime >= 16) {
                    lastMoveTime = now;
                    this._handleMouseMove(e);
                }
            });
        }

        // Start animation
        this._animate();
    }

    _handleMouseMove(event) {
        this._mousePosition = { x: event.clientX, y: event.clientY };

        // Auto show/hide
        if (this._autoShow) {
            const threshold = 150;
            const nearBottom = window.innerHeight - this._mousePosition.y < threshold;
            const nearTop = this._mousePosition.y < threshold;
            const shouldShow = this._position === 'bottom' ? nearBottom : nearTop;

            if (shouldShow) {
                if (!this._isVisible) {
                    this._container.style.opacity = '1';
                    this._isVisible = true;
                }
                this._isActive = true;
                this._updateBarsFromMouse();

                if (this._hideTimeout) clearTimeout(this._hideTimeout);
                this._hideTimeout = setTimeout(() => {
                    this._isActive = false;
                    setTimeout(() => {
                        if (!this._isActive) {
                            this._container.style.opacity = '0';
                            this._isVisible = false;
                        }
                    }, 1500);
                }, 2000);
            }
        } else {
            this._isActive = true;
            this._updateBarsFromMouse();
            if (this._hideTimeout) clearTimeout(this._hideTimeout);
            this._hideTimeout = setTimeout(() => { this._isActive = false; }, 1000);
        }
    }

    _updateBarsFromMouse() {
        if (!this._isActive) return;

        const rect = this._container.getBoundingClientRect();
        const mouseX = this._mousePosition.x - rect.left;

        this._bars.forEach((bar, index) => {
            const barX = (rect.width / this._barCount) * index + (rect.width / this._barCount / 2);
            const distance = Math.abs(mouseX - barX);
            const maxDistance = 200;

            if (distance < maxDistance) {
                const factor = Math.pow(1 - (distance / maxDistance), 2);
                bar.targetHeight = Math.max(5, factor * this._maxHeight);
            } else {
                bar.targetHeight = bar.baseHeight;
            }
        });
    }

    /**
     * Set audio frequency data for reactive mode
     * @param {Uint8Array|Float32Array} frequencyData
     */
    setAudioData(frequencyData) {
        this._audioData = frequencyData;
        this._isActive = true;

        // Map frequency bins to bars
        const binsPerBar = Math.floor(frequencyData.length / this._barCount);

        for (let i = 0; i < this._barCount; i++) {
            let sum = 0;
            const start = i * binsPerBar;
            for (let j = 0; j < binsPerBar && (start + j) < frequencyData.length; j++) {
                sum += frequencyData[start + j];
            }
            const avg = sum / binsPerBar / 255;
            this._bars[i].targetHeight = Math.max(5, avg * this._maxHeight);
        }
    }

    _animate() {
        this._rafId = requestAnimationFrame(() => this._animate());

        this._frameCount++;
        if (this._frameCount % 2 !== 0) return;

        if (!this._isActive && this._isVisible) {
            this._animateIdle();
        } else {
            this._bars.forEach(bar => {
                if (Math.abs(bar.height - bar.targetHeight) > 0.5) {
                    bar.height += (bar.targetHeight - bar.height) * 0.2;
                    bar.element.style.transform = `scaleY(${bar.height / 5})`;
                    const opacity = Math.min(1, bar.height / 50);
                    bar.element.style.opacity = (0.7 + opacity * 0.3).toString();
                }
            });
        }
    }

    _animateIdle() {
        const time = Date.now() / 1000;

        this._bars.forEach((bar, index) => {
            const normalized = index / this._barCount;
            const wave1 = Math.sin(time * 2 + bar.phase + normalized * Math.PI * 2) * 0.5 + 0.5;
            const wave2 = Math.sin(time * 1.5 + bar.phase + normalized * Math.PI * 3) * 0.5 + 0.5;
            const height = bar.baseHeight + wave1 * wave2 * 15;

            bar.element.style.transform = `scaleY(${height / 5})`;
            bar.element.style.opacity = (0.6 + wave1 * 0.2).toString();
        });
    }

    /**
     * Update color scheme
     */
    setColors(from, to) {
        this._colorFrom = from;
        this._colorTo = to;
        this._bars.forEach(bar => {
            bar.element.style.background = `linear-gradient(to top, ${from}, ${to})`;
        });
    }

    destroy() {
        if (this._rafId) cancelAnimationFrame(this._rafId);
        if (this._hideTimeout) clearTimeout(this._hideTimeout);
        this._container.innerHTML = '';
    }
}
