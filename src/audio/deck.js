/**
 * DECK - DJ Deck simülasyonu
 *
 * Audio chain:
 * source → gain (channel volume) → filter → master gain
 *
 * Her deck bağımsız çalışır ve kendi audio parametrelerini yönetir
 */

import { audioEngine } from './audioEngine.js';

export class Deck {
  constructor(name = 'Deck') {
    this.name = name;
    this.audioBuffer = null;

    // Audio nodes (each control = separate node/param)
    this.source = null;
    this.gainNode = null;       // Channel fader (user volume control)
    this.filterNode = null;     // Bipolar filter knob
    this.eqLowNode = null;      // EQ Low knob
    this.eqMidNode = null;      // EQ Mid knob
    this.eqHighNode = null;     // EQ High knob
    this.deckGainNode = null;   // Crossfader control (managed by main.js)

    // Playback state
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;
    this.playbackRate = 1.0;

    // Independent control states (for UI feedback)
    this.filterState = {
      type: 'bypass',
      frequency: 20000,
      normalizedValue: 0.5
    };

    this.eqState = {
      low: { gain: 0, frequency: 100 },    // -12dB to +12dB
      mid: { gain: 0, frequency: 1000 },   // -12dB to +12dB
      high: { gain: 0, frequency: 10000 }  // -12dB to +12dB
    };

    this._initNodes();
  }

  /**
   * Audio node chain'i oluştur
   * Chain: source → gain (channel fader) → filter → eqLow → eqMid → eqHigh → deckGain (crossfader) → master
   */
  _initNodes() {
    const ctx = audioEngine.context;
    if (!ctx) return;

    // 1. Gain node (channel fader - user volume control)
    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = 0.8;

    // 2. Filter node (bipolar: low-pass / high-pass)
    this.filterNode = ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 20000; // Başlangıç: bypass (tam açık)
    this.filterNode.Q.value = 1.0;

    // 3. EQ Low (bass) - peaking filter
    this.eqLowNode = ctx.createBiquadFilter();
    this.eqLowNode.type = 'peaking';
    this.eqLowNode.frequency.value = 100;  // Low freq (bass)
    this.eqLowNode.Q.value = 0.7;
    this.eqLowNode.gain.value = 0; // Neutral (0dB)

    // 4. EQ Mid - peaking filter
    this.eqMidNode = ctx.createBiquadFilter();
    this.eqMidNode.type = 'peaking';
    this.eqMidNode.frequency.value = 1000; // Mid freq
    this.eqMidNode.Q.value = 0.7;
    this.eqMidNode.gain.value = 0; // Neutral (0dB)

    // 5. EQ High (treble) - peaking filter
    this.eqHighNode = ctx.createBiquadFilter();
    this.eqHighNode.type = 'peaking';
    this.eqHighNode.frequency.value = 10000; // High freq (treble)
    this.eqHighNode.Q.value = 0.7;
    this.eqHighNode.gain.value = 0; // Neutral (0dB)

    // 6. Deck gain node (crossfader control - managed by main.js)
    this.deckGainNode = ctx.createGain();
    this.deckGainNode.gain.value = 1.0; // Default: full volume (crossfader will control this)

    // Chain: gain → filter → eqLow → eqMid → eqHigh → deckGain → master
    this.gainNode.connect(this.filterNode);
    this.filterNode.connect(this.eqLowNode);
    this.eqLowNode.connect(this.eqMidNode);
    this.eqMidNode.connect(this.eqHighNode);
    this.eqHighNode.connect(this.deckGainNode);
    this.deckGainNode.connect(audioEngine.masterGain);
  }

  /**
   * Track yükle
   * @param {AudioBuffer} audioBuffer
   */
  loadTrack(audioBuffer) {
    this.stop(); // Önceki çalan varsa durdur
    this.audioBuffer = audioBuffer;
    this.pauseTime = 0;
    console.log(`${this.name}: Track loaded`);
  }

  /**
   * Play / Resume
   */
  play() {
    if (!this.audioBuffer) {
      console.warn(`${this.name}: No track loaded`);
      return;
    }

    if (this.isPlaying) return;

    // Yeni source oluştur (AudioBufferSourceNode tek kullanımlık)
    this.source = audioEngine.context.createBufferSource();
    this.source.buffer = this.audioBuffer;
    this.source.playbackRate.value = this.playbackRate;
    this.source.connect(this.gainNode);

    // Loop için (opsiyonel)
    this.source.loop = true;

    // Kaldığı yerden başlat
    this.startTime = audioEngine.getCurrentTime() - this.pauseTime;
    this.source.start(0, this.pauseTime);

    this.isPlaying = true;
    console.log(`${this.name}: Playing from ${this.pauseTime.toFixed(2)}s`);
  }

  /**
   * Stop
   */
  stop() {
    if (!this.isPlaying || !this.source) return;

    this.source.stop();
    this.source.disconnect();
    this.source = null;

    // Pause zamanını kaydet
    this.pauseTime = audioEngine.getCurrentTime() - this.startTime;

    this.isPlaying = false;
    console.log(`${this.name}: Stopped at ${this.pauseTime.toFixed(2)}s`);
  }

  /**
   * Channel volume (fader)
   * @param {number} value - 0.0 - 1.0
   * Uses smooth transition to avoid clicking/zipper noise
   */
  setVolume(value) {
    if (!this.gainNode) return;

    const clampedValue = Math.max(0, Math.min(1, value));
    const now = audioEngine.getCurrentTime();
    const smoothTime = 0.015; // 15ms smooth transition

    // Cancel any scheduled changes and smoothly transition to new value
    this.gainNode.gain.cancelScheduledValues(now);
    this.gainNode.gain.setTargetAtTime(clampedValue, now, smoothTime);
  }

  /**
   * Filter frequency (knob) - BIPOLAR
   * @param {number} normalizedValue - 0.0 - 1.0 (UI'dan gelecek)
   *
   * Bipolar mapping:
   * - 0.0 → 0.45: Low-pass (20kHz → 250Hz) - cuts highs
   * - 0.45 → 0.55: Bypass zone (filter off)
   * - 0.55 → 1.0: High-pass (20Hz → 8kHz) - cuts lows
   *
   * Uses smooth automation to prevent zipper noise
   */
  setFilter(normalizedValue) {
    if (!this.filterNode) return;

    const now = audioEngine.getCurrentTime();
    const smoothTime = 0.015; // 15ms smooth transition

    // Dead zone for bypass (centered around 0.5)
    const bypassZone = 0.05;
    const bypassCenter = 0.5;

    if (Math.abs(normalizedValue - bypassCenter) < bypassZone) {
      // BYPASS ZONE (0.45 - 0.55)
      // Set low-pass to max frequency (effectively no filtering)
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.setTargetAtTime(20000, now, smoothTime);
      this.filterNode.Q.cancelScheduledValues(now);
      this.filterNode.Q.setTargetAtTime(0.1, now, smoothTime);

      this.filterState.type = 'bypass';
      this.filterState.frequency = 20000;
    } else if (normalizedValue < bypassCenter) {
      // LOW-PASS ZONE (0.0 - 0.45)
      // Cuts high frequencies (darker sound)
      this.filterNode.type = 'lowpass';

      // Map 0.0-0.45 to 0.0-1.0
      const t = normalizedValue / (bypassCenter - bypassZone);

      // Log scale: 250Hz (dark) → 20kHz (bright)
      const minFreq = 250;
      const maxFreq = 20000;
      const frequency = minFreq * Math.pow(maxFreq / minFreq, t);

      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.setTargetAtTime(frequency, now, smoothTime);
      this.filterNode.Q.cancelScheduledValues(now);
      this.filterNode.Q.setTargetAtTime(1.0, now, smoothTime);

      this.filterState.type = 'lowpass';
      this.filterState.frequency = frequency;
    } else {
      // HIGH-PASS ZONE (0.55 - 1.0)
      // Cuts low frequencies (thinner sound)
      this.filterNode.type = 'highpass';

      // Map 0.55-1.0 to 0.0-1.0
      const t = (normalizedValue - bypassCenter - bypassZone) / (bypassCenter - bypassZone);

      // Log scale: 20Hz (full bass) → 8kHz (no bass)
      const minFreq = 20;
      const maxFreq = 8000;
      const frequency = minFreq * Math.pow(maxFreq / minFreq, t);

      this.filterNode.frequency.cancelScheduledValues(now);
      this.filterNode.frequency.setTargetAtTime(frequency, now, smoothTime);
      this.filterNode.Q.cancelScheduledValues(now);
      this.filterNode.Q.setTargetAtTime(1.0, now, smoothTime);

      this.filterState.type = 'highpass';
      this.filterState.frequency = frequency;
    }

    this.filterState.normalizedValue = normalizedValue;
  }

  /**
   * EQ Low (Bass) control
   * @param {number} normalizedValue - 0.0 - 1.0 (0.5 = neutral/0dB)
   * Maps to -12dB (0.0) → 0dB (0.5) → +12dB (1.0)
   */
  setEQLow(normalizedValue) {
    if (!this.eqLowNode) return;

    const now = audioEngine.getCurrentTime();
    const smoothTime = 0.015;

    // Map 0-1 to -12dB to +12dB (0.5 = 0dB)
    const gainDB = (normalizedValue - 0.5) * 24; // -12 to +12

    this.eqLowNode.gain.cancelScheduledValues(now);
    this.eqLowNode.gain.setTargetAtTime(gainDB, now, smoothTime);

    this.eqState.low.gain = gainDB;
  }

  /**
   * EQ Mid control
   * @param {number} normalizedValue - 0.0 - 1.0 (0.5 = neutral/0dB)
   * Maps to -12dB (0.0) → 0dB (0.5) → +12dB (1.0)
   */
  setEQMid(normalizedValue) {
    if (!this.eqMidNode) return;

    const now = audioEngine.getCurrentTime();
    const smoothTime = 0.015;

    // Map 0-1 to -12dB to +12dB (0.5 = 0dB)
    const gainDB = (normalizedValue - 0.5) * 24; // -12 to +12

    this.eqMidNode.gain.cancelScheduledValues(now);
    this.eqMidNode.gain.setTargetAtTime(gainDB, now, smoothTime);

    this.eqState.mid.gain = gainDB;
  }

  /**
   * EQ High (Treble) control
   * @param {number} normalizedValue - 0.0 - 1.0 (0.5 = neutral/0dB)
   * Maps to -12dB (0.0) → 0dB (0.5) → +12dB (1.0)
   */
  setEQHigh(normalizedValue) {
    if (!this.eqHighNode) return;

    const now = audioEngine.getCurrentTime();
    const smoothTime = 0.015;

    // Map 0-1 to -12dB to +12dB (0.5 = 0dB)
    const gainDB = (normalizedValue - 0.5) * 24; // -12 to +12

    this.eqHighNode.gain.cancelScheduledValues(now);
    this.eqHighNode.gain.setTargetAtTime(gainDB, now, smoothTime);

    this.eqState.high.gain = gainDB;
  }

  /**
   * Playback rate (scratch / pitch)
   * @param {number} rate - 0.25 - 4.0 arası (negatif yok)
   * For instant changes, use this. For smooth changes, use scratch()
   */
  setPlaybackRate(rate) {
    // Clamp: 0.25x - 4.0x arası
    this.playbackRate = Math.max(0.25, Math.min(4.0, rate));

    if (this.source && this.isPlaying) {
      const now = audioEngine.getCurrentTime();
      const smoothTime = 0.02; // 20ms - quick but smooth

      this.source.playbackRate.cancelScheduledValues(now);
      this.source.playbackRate.setTargetAtTime(this.playbackRate, now, smoothTime);
    }
  }

  /**
   * Scratch efekti için delta değer
   * @param {number} delta - Mouse drag'den gelen delta (-1 to 1)
   * Sensitivity ile scale edilebilir
   * Uses smooth automation for natural pitch bend feel
   */
  scratch(delta, sensitivity = 3.0) {
    const newRate = 1.0 + delta * sensitivity;
    const clampedRate = Math.max(0.25, Math.min(4.0, newRate));

    this.playbackRate = clampedRate;

    if (this.source && this.isPlaying) {
      const now = audioEngine.getCurrentTime();
      const smoothTime = 0.01; // 10ms - quick response but still smooth

      // Smooth transition to new playback rate
      this.source.playbackRate.cancelScheduledValues(now);
      this.source.playbackRate.setTargetAtTime(clampedRate, now, smoothTime);
    }
  }

  /**
   * Playback rate'i normale döndür (scratch bittiğinde)
   * Uses smooth ramp for natural "pitch bend back" feel
   */
  resetPlaybackRate() {
    if (!this.source || !this.isPlaying) {
      this.playbackRate = 1.0;
      return;
    }

    const now = audioEngine.getCurrentTime();
    const rampTime = 0.15; // 150ms smooth ramp back to normal

    // Cancel any scheduled changes
    this.source.playbackRate.cancelScheduledValues(now);

    // Smooth linear ramp to 1.0 (more natural than setTargetAtTime for this use case)
    this.source.playbackRate.linearRampToValueAtTime(1.0, now + rampTime);

    // Update internal state
    this.playbackRate = 1.0;
  }
}
