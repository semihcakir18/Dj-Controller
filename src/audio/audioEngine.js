/**
 * AUDIO ENGINE - Global AudioContext ve Master Chain
 *
 * Sorumluluklar:
 * - Tek bir AudioContext yönetimi
 * - Master gain (ana volume)
 * - Audio dosyası yükleme ve decode
 * - Decks için merkezi API
 */

class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.isInitialized = false;
  }

  /**
   * AudioContext'i başlat
   * Not: Tarayıcı politikası gereği ilk user interaction'da çağrılmalı
   */
  async init() {
    if (this.isInitialized) return;

    this.context = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain node
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.7; // Varsayılan master volume
    this.masterGain.connect(this.context.destination);

    this.isInitialized = true;
    console.log('AudioEngine initialized:', this.context.state);
  }

  /**
   * AudioContext'i resume et (tarayıcı suspend ederse)
   */
  async resume() {
    if (this.context && this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  /**
   * Audio dosyası yükle ve decode et
   * @param {string} url - Audio dosya yolu
   * @returns {Promise<AudioBuffer>}
   */
  async loadAudio(url) {
    if (!this.isInitialized) {
      throw new Error('AudioEngine not initialized. Call init() first.');
    }

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.context.decodeAudioData(arrayBuffer);

    console.log(`Loaded: ${url} (${audioBuffer.duration.toFixed(2)}s)`);
    return audioBuffer;
  }

  /**
   * Master volume set et
   * @param {number} value - 0.0 - 1.0 arası
   */
  setMasterVolume(value) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, value));
    }
  }

  /**
   * Audio context'in current time'ı
   */
  getCurrentTime() {
    return this.context?.currentTime || 0;
  }
}

// Singleton instance
export const audioEngine = new AudioEngine();
