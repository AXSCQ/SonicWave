# 🌊 SonicWave
**Canvas-Based Audio Waveform & Spectrum Visualization Library**

![npm bundle size](https://img.shields.io/bundlephobia/minzip/sonicwave)
![npm version](https://img.shields.io/npm/v/sonicwave)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

**SonicWave** is a zero-dependency JavaScript library for rendering beautiful **audio waveform visualizations**, **interactive equalizer bars**, and **frequency spectrum displays** using the HTML5 Canvas API. A lightweight, modern alternative to WaveSurfer.js.

Use it standalone or pair it with [SonicMotion](https://www.npmjs.com/package/sonicmotion) to create real-time audio-reactive Canvas visuals driven by live music stem analysis.

---

## ✨ Features

- 🎵 **Waveform Renderer**: Draw audio waveforms from `AudioBuffer` or real-time frequency data — replaces WaveSurfer.js.
- 🎚️ **Equalizer Bars**: Animated, color-coded frequency bars for bass, mid and treble ranges.
- 📊 **Spectrum Display**: Full frequency spectrum visualization with configurable colors and bar counts.
- 🎨 **Fully Customizable**: Colors, bar counts, smoothing, gradients and canvas size — all configurable.
- ⚡ **Zero Dependencies**: Pure Canvas API, no external libraries required.
- 🔗 **SonicMotion Compatible**: Feed real-time stem data directly into any SonicWave renderer.

---

## 💻 Installation

```bash
npm install sonicwave
```

```javascript
import SonicWave from 'sonicwave';
```

---

## 🚀 Quick Start

### Equalizer Bars

```html
<canvas id="eq-canvas"></canvas>
```

```javascript
import SonicWave from 'sonicwave';

const eq = SonicWave.createEqualizer({
    canvas: document.getElementById('eq-canvas'),
    bars: 32,
    color: '#7928ca',
    backgroundColor: '#0a0a0a'
});

// Feed real-time data from SonicMotion
sonic.onFrame((data) => {
    eq.update(data.bass.bands);  // { bass, mid, treble }
});
```

### Frequency Spectrum

```html
<canvas id="spectrum-canvas"></canvas>
```

```javascript
const spectrum = SonicWave.createSpectrum({
    canvas: document.getElementById('spectrum-canvas'),
    barCount: 64,
    colors: {
        bass: '#ff0080',
        mid: '#7928ca',
        treble: '#00d4ff'
    }
});

sonic.onFrame((data) => {
    spectrum.update(data);
});
```

### Waveform Renderer (Static)

```javascript
const waveform = SonicWave.createWaveform({
    container: document.getElementById('waveform'), // the canvas is created inside
    waveColor: '#4fa4e0',
    progressColor: '#0ec3f0',
    height: 48
});

// Option A: fetch + decode the audio and extract peaks
await waveform.load('/audio/master.mp3');

// Option B: precomputed amplitudes (e.g. an offline energy envelope),
// no second download/decode of the audio
waveform.setPeaks(envelope, durationSeconds);

// Follow playback and let the user jump around
waveform.setTime(audio.currentTime);
waveform.enableSeek((progress) => { audio.currentTime = progress * audio.duration; });
```

---

## ⚙️ Configuration Options

### `createEqualizer(config)`

| Option | Default | Description |
|---|---|---|
| `canvas` | required | HTMLCanvasElement to render on |
| `bars` | `32` | Number of equalizer bars |
| `color` | `'#7928ca'` | Bar fill color (or gradient array) |
| `backgroundColor` | `'#000'` | Canvas background |
| `gap` | `2` | Pixel gap between bars |
| `smoothing` | `0.8` | Smoothing factor (0–1) |
| `mirror` | `false` | Mirror bars from center |

### `createSpectrum(config)`

| Option | Default | Description |
|---|---|---|
| `canvas` | required | HTMLCanvasElement to render on |
| `barCount` | `64` | Number of frequency bars |
| `colors` | `{ bass, mid, treble }` | Color per frequency band |
| `backgroundColor` | `'#000'` | Canvas background |
| `smoothing` | `0.75` | Smoothing factor (0–1) |

### `createWaveform(config)`

| Option | Default | Description |
|---|---|---|
| `canvas` | required | HTMLCanvasElement to render on |
| `color` | `'#00d4ff'` | Waveform stroke color |
| `backgroundColor` | `'#000'` | Canvas background |
| `lineWidth` | `2` | Waveform stroke width |

---

## 🔌 JavaScript API

```javascript
// Equalizer
const eq = SonicWave.createEqualizer(config);
eq.update(bandsData)  // { bass, mid, treble } values 0–1
eq.resize()           // Call on window resize
eq.destroy()          // Clean up canvas

// Spectrum
const spectrum = SonicWave.createSpectrum(config);
spectrum.update(frameData)  // Full frame data object
spectrum.resize()
spectrum.destroy()

// Waveform
const waveform = SonicWave.createWaveform(config);
await waveform.load(urlOrArrayBuffer)  // Fetch/decode audio and extract peaks
waveform.setPeaks(values, duration)    // Use precomputed amplitudes instead
waveform.setProgress(0.5)              // 0–1
waveform.setTime(seconds)              // needs a known duration
waveform.enableSeek(progress => {})    // click-to-seek
waveform.destroy()
```

---

## 🎵 Works Best With

- **[sonicmotion](https://www.npmjs.com/package/sonicmotion)** — Audio stem analysis and DOM animation engine
- **[sonicfx](https://www.npmjs.com/package/sonicfx)** — Advanced audio-reactive visual effects
- **[sonicscroll](https://www.npmjs.com/package/sonicscroll)** — Scroll-triggered animations with audio-aware mode

---

## 📄 License

MIT © 2025 axscq
