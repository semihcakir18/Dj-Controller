/**
 * ENTEGRASYON ÖRNEĞİ - main.js'e eklenecek kodlar
 *
 * Bu dosya direkt çalışmaz, sadece referans amaçlı
 * main.js'deki ilgili yerlere kopyalanmalı
 */

import { audioEngine } from './audio/audioEngine.js';
import { Deck } from './audio/deck.js';

// ================= AUDIO SETUP =================
let deck1 = null;
let deck2 = null;
let audioInitialized = false;

/**
 * İlk tıklamada audio'yu başlat
 */
async function initAudio() {
  if (audioInitialized) return;

  await audioEngine.init();
  await audioEngine.resume();

  // Deck'leri oluştur
  deck1 = new Deck('Deck A');
  deck2 = new Deck('Deck B');

  // Örnek: Track yükle
  try {
    const buffer = await audioEngine.loadAudio('/audio/sample-track.mp3');
    deck1.loadTrack(buffer);
    deck1.play();
  } catch (error) {
    console.warn('Audio yüklenemedi:', error);
  }

  audioInitialized = true;
  console.log('Audio initialized!');
}

// ================= MOUSE EVENT'LERE EKLEME =================

// mousedown event'ine ekle:
window.addEventListener("mousedown", async (e) => {
  // İlk tıklamada audio'yu başlat
  if (!audioInitialized) {
    await initAudio();
  }

  // ... mevcut raycaster kodu ...
});

// mousemove event'ine ekle (active object kontrolü içinde):
window.addEventListener("mousemove", (e) => {
  // ... mevcut mouse position update ...

  if (!activeObject || !audioInitialized) return;

  // JOG WHEEL → SCRATCH
  if (activeObject.userData.type === "jog") {
    // Mevcut rotation mantığı...
    // activeObject.rotation.y -= deltaAngle;

    // Audio: Scratch efekti
    // deltaAngle değerini normalize et (-1 to 1)
    const scratchDelta = deltaAngle / Math.PI; // -1 to 1 range

    // Hangi deck'e bağlı olduğunu belirle (userData'dan)
    const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
    if (deck) {
      deck.scratch(scratchDelta, 3.0); // sensitivity = 3.0
    }
  }

  // KNOB → FILTER
  if (activeObject.userData.type === "knob") {
    // Mevcut rotation mantığı...
    // activeObject.rotation.y += delta;

    // Audio: Filter frequency
    // Rotation'ı 0-1 range'e normalize et
    const rotation = activeObject.rotation.y;
    const normalized = ((rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const filterValue = normalized / (Math.PI * 2);

    // Hangi deck'e bağlı (userData'dan)
    const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
    if (deck) {
      deck.setFilter(filterValue);
    }
  }

  // FADER → VOLUME
  if (activeObject.userData.type === "fader") {
    // Mevcut position mantığı...
    // activeObject.position.z = clamp(...)

    // Audio: Volume
    const pos = activeObject.position.z;
    const { minZ, maxZ } = activeObject.userData;
    const volumeValue = (pos - minZ) / (maxZ - minZ);

    // Hangi deck'e bağlı
    const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
    if (deck) {
      deck.setVolume(volumeValue);
    }
  }
});

// mouseup event'ine ekle:
window.addEventListener("mouseup", () => {
  // Jog wheel bırakıldığında scratch'i durdur
  if (activeObject && activeObject.userData.type === "jog") {
    const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
    if (deck) {
      deck.resetPlaybackRate(); // Normal hıza dön (1.0x)
    }
  }

  // ... mevcut cleanup kodu ...
});

// ================= CONTROLLER.JS'E EKLEME =================
/*
Her jog/knob/fader oluştururken userData'ya deckId ekle:

function jog(x, deckId) {
  // ... mevcut kod ...
  j.userData = {
    type: "jog",
    deckId: deckId  // 1 veya 2
  };
}

function knob(x, z, deckId) {
  // ... mevcut kod ...
  k.userData = {
    type: "knob",
    value: 0,
    deckId: deckId
  };
}

function fader(x, deckId) {
  // ... mevcut kod ...
  handle.userData = {
    type: "fader",
    minZ: 0.3,
    maxZ: 1.5,
    deckId: deckId
  };
}

// Kullanım:
jog(-2.1, 1);  // Sol jog → Deck 1
jog(2.1, 2);   // Sağ jog → Deck 2
*/
