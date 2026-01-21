/**
 * TRACK MANAGER USAGE EXAMPLES
 *
 * TrackLibrary'nin nasıl kullanılacağını gösteren örnekler
 * Bu dosya direkt çalışmaz, referans amaçlıdır
 */

import { audioEngine } from './audio/audioEngine.js';
import { trackLibrary, TrackSource } from './audio/trackLibrary.js';
import { Deck } from './audio/deck.js';

// ================= SETUP =================

let deck1 = null;
let deck2 = null;

async function initAudioSystem() {
  // 1. AudioEngine'i başlat
  await audioEngine.init();

  // 2. Deck'leri oluştur
  deck1 = new Deck('Deck A');
  deck2 = new Deck('Deck B');

  console.log('Audio system ready');
}

// ================= PRESET TRACK LOADING =================

async function loadPresetToDeck(presetId, deckNumber) {
  try {
    // TrackLibrary'den preset'i yükle
    const buffer = await trackLibrary.loadPreset(presetId);

    // İlgili deck'e yükle
    const deck = deckNumber === 1 ? deck1 : deck2;
    deck.loadTrack(buffer);

    console.log(`Preset ${presetId} loaded to Deck ${deckNumber}`);
  } catch (error) {
    console.error('Failed to load preset:', error);
  }
}

// Örnek: İlk preset'i Deck A'ya yükle
async function loadDefaultPreset() {
  await loadPresetToDeck('preset_1', 1);
  deck1.play();
}

// ================= USER FILE UPLOAD =================

/**
 * HTML file input handler
 * <input type="file" accept="audio/*" id="fileInput">
 */
function setupFileUpload() {
  const fileInput = document.getElementById('fileInput');

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // User file'ı yükle ve library'ye ekle
      const { id, buffer } = await trackLibrary.loadFromFile(file);

      console.log(`User track loaded: ${id}`);

      // Otomatik olarak Deck B'ye yükle
      deck2.loadTrack(buffer);
      deck2.play();

      // UI güncelleme (örnek)
      updateTrackList();
    } catch (error) {
      console.error('File upload failed:', error);
      alert('Failed to load audio file. Please check the format.');
    }
  });
}

// ================= TRACK LIST UI (ÖRNEK) =================

/**
 * Track listesini göster
 * Gerçek implementasyon UI framework'üne bağlı
 */
function updateTrackList() {
  const tracks = trackLibrary.getTracks();

  console.log('=== TRACK LIBRARY ===');
  tracks.forEach(track => {
    console.log(`[${track.sourceType}] ${track.name} (${track.isLoaded ? 'loaded' : 'not loaded'})`);
  });

  // DOM manipulation örneği:
  /*
  const listEl = document.getElementById('trackList');
  listEl.innerHTML = tracks.map(track => `
    <div class="track-item" data-id="${track.id}">
      <span>${track.name}</span>
      <button onclick="loadToDeck('${track.id}', 1)">→ Deck A</button>
      <button onclick="loadToDeck('${track.id}', 2)">→ Deck B</button>
      ${track.sourceType === 'user_upload' ?
        `<button onclick="removeTrack('${track.id}')">✕</button>` : ''}
    </div>
  `).join('');
  */
}

// ================= TRACK INFO =================

function showTrackInfo(trackId) {
  const info = trackLibrary.getTrackInfo(trackId);

  if (!info) {
    console.log('Track not found');
    return;
  }

  console.log('Track Info:', {
    name: info.name,
    source: info.sourceType,
    loaded: info.isLoaded,
    duration: info.duration ? `${info.duration.toFixed(2)}s` : 'N/A'
  });
}

// ================= INTEGRATION WITH 3D CONTROLS =================

/**
 * 3D UI button: "Load to Deck A" click handler
 */
async function on3DButtonClick_LoadToDeckA(trackId) {
  // TrackLibrary'den buffer al
  let buffer = trackLibrary.getBuffer(trackId);

  // Eğer henüz yüklenmemişse, önce yükle
  if (!buffer) {
    buffer = await trackLibrary.loadPreset(trackId);
  }

  // Deck'e yükle
  deck1.loadTrack(buffer);
  deck1.play();
}

/**
 * Keyboard shortcut örneği
 * 1-9: Preset track'leri hızlı yükle
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', async (e) => {
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      const tracks = trackLibrary.getTracks();

      if (tracks[index]) {
        await loadPresetToDeck(tracks[index].id, 1);
        deck1.play();
      }
    }

    // Space: Play/Stop Deck A
    if (e.code === 'Space') {
      e.preventDefault();
      if (deck1.isPlaying) {
        deck1.stop();
      } else {
        deck1.play();
      }
    }
  });
}

// ================= CLEANUP =================

/**
 * Memory cleanup (SPA unmount gibi durumlarda)
 */
function cleanup() {
  deck1?.stop();
  deck2?.stop();
  trackLibrary.clearCache();
}

// ================= INITIALIZATION =================

async function init() {
  // 1. Audio system başlat
  await initAudioSystem();

  // 2. File upload setup
  setupFileUpload();

  // 3. Keyboard shortcuts
  setupKeyboardShortcuts();

  // 4. İlk preset'i yükle
  await loadDefaultPreset();

  // 5. Track list'i göster
  updateTrackList();
}

// İlk user gesture'da başlat
document.addEventListener('click', () => {
  init();
}, { once: true });

// ================= EXPORT FOR GLOBAL USE =================

// main.js'den erişim için
export {
  deck1,
  deck2,
  loadPresetToDeck,
  updateTrackList,
  showTrackInfo
};
