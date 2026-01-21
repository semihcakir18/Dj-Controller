/**
 * PRESET TRACKS CONFIGURATION
 *
 * Buraya yeni preset track'ler eklenebilir
 * Format: { id, name, url }
 */

export const PRESET_TRACKS = [
  {
    id: 'preset_1',
    name: 'Mist',
    url: '/audio/Mist.mp3'
  },
  {
    id: 'preset_2',
    name: 'Tutun Ve Vodka',
    url: '/audio/TutunVeVodka.mp3'
  }
];

/**
 * Gelecekte eklenebilecek metadata örneği:
 *
 * {
 *   id: 'preset_4',
 *   name: 'Tech House - Groove',
 *   url: '/audio/tech-house.mp3',
 *   bpm: 128,              // BPM detection için
 *   genre: 'Tech House',   // Filtering için
 *   duration: 240,         // Önizleme için (saniye)
 *   artist: 'DJ Name',
 *   cuePoints: [0, 32, 64, 96],  // Cue point sistemi için
 *   waveformColor: '#00ffff'      // UI için
 * }
 */
