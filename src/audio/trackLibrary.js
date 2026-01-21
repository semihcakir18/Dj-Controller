/**
 * TRACK LIBRARY - Track Yönetim Sistemi
 *
 * Sorumluluklar:
 * - Preset audio dosyalarını yönetme
 * - User-uploaded dosyaları yükleme ve decode etme
 * - AudioBuffer cache'leme
 * - Track metadata (id, name, sourceType) yönetimi
 *
 * Deck tarafı track source'u bilmez, sadece AudioBuffer alır
 */

import { audioEngine } from './audioEngine.js';
import { PRESET_TRACKS } from './presets.js';

/**
 * Track source türleri
 */
export const TrackSource = {
  PRESET: 'preset',
  USER_UPLOAD: 'user_upload'
};

/**
 * Track metadata formatı
 * @typedef {Object} Track
 * @property {string} id - Unique identifier
 * @property {string} name - Track display name
 * @property {string} sourceType - 'preset' | 'user_upload'
 * @property {string} [url] - URL (sadece preset için)
 * @property {AudioBuffer} [buffer] - Cached AudioBuffer
 * @property {boolean} isLoaded - Buffer yüklenmiş mi?
 */

class TrackLibrary {
  constructor() {
    // Track listesi: preset + user uploaded
    this.tracks = new Map();

    // Preset track'leri initialize et (buffer henüz yok)
    this._initializePresets();

    // User upload counter (unique ID için)
    this.uploadCounter = 0;
  }

  /**
   * Preset track'leri track map'e ekle
   */
  _initializePresets() {
    PRESET_TRACKS.forEach(preset => {
      this.tracks.set(preset.id, {
        ...preset,
        sourceType: TrackSource.PRESET,
        buffer: null,
        isLoaded: false
      });
    });

    console.log(`TrackLibrary: ${PRESET_TRACKS.length} preset tracks initialized`);
  }

  /**
   * Tüm track'leri al (metadata only)
   * @returns {Array<Track>}
   */
  getTracks() {
    return Array.from(this.tracks.values()).map(track => ({
      id: track.id,
      name: track.name,
      sourceType: track.sourceType,
      isLoaded: track.isLoaded
    }));
  }

  /**
   * Preset track'i yükle
   * @param {string} id - Preset track ID
   * @returns {Promise<AudioBuffer>}
   */
  async loadPreset(id) {
    const track = this.tracks.get(id);

    if (!track) {
      throw new Error(`Track not found: ${id}`);
    }

    if (track.sourceType !== TrackSource.PRESET) {
      throw new Error(`Track ${id} is not a preset`);
    }

    // Zaten yüklüyse cache'den dön
    if (track.isLoaded && track.buffer) {
      console.log(`TrackLibrary: ${track.name} loaded from cache`);
      return track.buffer;
    }

    // Audio dosyasını yükle ve decode et
    try {
      const buffer = await audioEngine.loadAudio(track.url);

      // Cache'e kaydet
      track.buffer = buffer;
      track.isLoaded = true;

      console.log(`TrackLibrary: ${track.name} loaded and cached`);
      return buffer;
    } catch (error) {
      console.error(`Failed to load preset ${id}:`, error);
      throw error;
    }
  }

  /**
   * User-uploaded dosyayı yükle
   * @param {File} file - HTML File input'tan gelen File object
   * @returns {Promise<{id: string, buffer: AudioBuffer}>}
   */
  async loadFromFile(file) {
    if (!file || !(file instanceof File)) {
      throw new Error('Invalid file object');
    }

    // Unique ID oluştur
    this.uploadCounter++;
    const id = `user_${this.uploadCounter}_${Date.now()}`;
    const name = file.name.replace(/\.[^/.]+$/, ''); // Extension'ı çıkar

    console.log(`TrackLibrary: Loading user file "${name}"...`);

    try {
      // File → ArrayBuffer → AudioBuffer
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioEngine.context.decodeAudioData(arrayBuffer);

      // Track library'ye ekle
      const track = {
        id,
        name,
        sourceType: TrackSource.USER_UPLOAD,
        buffer: audioBuffer,
        isLoaded: true
      };

      this.tracks.set(id, track);

      console.log(`TrackLibrary: User track "${name}" loaded (${audioBuffer.duration.toFixed(2)}s)`);

      return {
        id,
        name,
        buffer: audioBuffer
      };
    } catch (error) {
      console.error(`Failed to load user file "${name}":`, error);
      throw error;
    }
  }

  /**
   * Track ID'ye göre AudioBuffer al
   * @param {string} id - Track ID
   * @returns {AudioBuffer|null}
   */
  getBuffer(id) {
    const track = this.tracks.get(id);

    if (!track) {
      console.warn(`Track not found: ${id}`);
      return null;
    }

    if (!track.isLoaded || !track.buffer) {
      console.warn(`Track ${id} not loaded yet`);
      return null;
    }

    return track.buffer;
  }

  /**
   * Track silme (user-uploaded için)
   * @param {string} id - Track ID
   * @returns {boolean} - Başarılı mı?
   */
  removeTrack(id) {
    const track = this.tracks.get(id);

    if (!track) {
      return false;
    }

    // Preset track'ler silinemez
    if (track.sourceType === TrackSource.PRESET) {
      console.warn(`Cannot remove preset track: ${id}`);
      return false;
    }

    this.tracks.delete(id);
    console.log(`TrackLibrary: Removed track ${track.name}`);
    return true;
  }

  /**
   * Track metadata al
   * @param {string} id - Track ID
   * @returns {Track|null}
   */
  getTrackInfo(id) {
    const track = this.tracks.get(id);

    if (!track) {
      return null;
    }

    return {
      id: track.id,
      name: track.name,
      sourceType: track.sourceType,
      isLoaded: track.isLoaded,
      duration: track.buffer?.duration || null
    };
  }

  /**
   * Tüm cache'i temizle (memory management için)
   */
  clearCache() {
    this.tracks.forEach(track => {
      if (track.sourceType === TrackSource.PRESET) {
        // Preset'lerde sadece buffer'ı temizle, metadata kalsın
        track.buffer = null;
        track.isLoaded = false;
      } else {
        // User upload'ları tamamen sil
        this.tracks.delete(track.id);
      }
    });

    console.log('TrackLibrary: Cache cleared');
  }
}

// Singleton instance
export const trackLibrary = new TrackLibrary();
