/**
 * SonicWave — Canvas-based audio waveform and spectrum visualization.
 * 
 * Zero-dependency replacement for WaveSurfer.js with additional
 * equalizer bars and spectrum display visualizations.
 * 
 * @version 1.1.0
 */

import { WaveformRenderer } from './waveform-renderer.js';
import { EqualizerBars } from './equalizer-bars.js';
import { SpectrumDisplay } from './spectrum-display.js';

const SonicWave = {
    /**
     * Create a waveform renderer (replaces WaveSurfer.js)
     * @param {object} config - See WaveformRenderer constructor
     */
    createWaveform(config) {
        return new WaveformRenderer(config);
    },

    /**
     * Create interactive equalizer bars
     * @param {object} config - See EqualizerBars constructor
     */
    createEqualizer(config) {
        return new EqualizerBars(config);
    },

    /**
     * Create a frequency spectrum display
     * @param {object} config - See SpectrumDisplay constructor
     */
    createSpectrum(config) {
        return new SpectrumDisplay(config);
    },

    WaveformRenderer,
    EqualizerBars,
    SpectrumDisplay,
    version: '1.1.0'
};

export default SonicWave;
export { SonicWave, WaveformRenderer, EqualizerBars, SpectrumDisplay };
