# Audio System - Quick Start Guide

## 1. Dosya Yapısı

```
src/audio/
├── audioEngine.js          → AudioContext + master gain
├── deck.js                 → Deck sınıfı (play/stop/effects)
├── trackLibrary.js         → Track yönetimi
├── presets.js              → Preset track listesi (config)
├── README.md               → Detaylı dokümantasyon
├── QUICKSTART.md           → Bu dosya
├── trackManager-example.js → Kullanım örnekleri
└── integration-example.js  → 3D entegrasyon örneği
```

## 2. Hızlı Test (Browser Console)

### Adım 1: Audio dosyası ekle

```bash
# public/audio klasörü oluştur
mkdir -p public/audio

# Bir test MP3 dosyası ekle
# Örnek: public/audio/sample-1.mp3
```

### Adım 2: main.js'e ekle

```js
import { audioEngine } from './audio/audioEngine.js';
import { trackLibrary } from './audio/trackLibrary.js';
import { Deck } from './audio/deck.js';

// Deck'leri global yap (test için)
window.deck1 = null;
window.deck2 = null;

// İlk tıklamada init
window.addEventListener('click', async () => {
  if (!window.deck1) {
    await audioEngine.init();
    window.deck1 = new Deck('Deck A');
    window.deck2 = new Deck('Deck B');

    // İlk track'i yükle
    const buffer = await trackLibrary.loadPreset('preset_1');
    window.deck1.loadTrack(buffer);
    window.deck1.play();

    console.log('Audio system ready!');
  }
}, { once: true });
```

### Adım 3: Browser Console'da test et

```js
// Play/Stop
deck1.play()
deck1.stop()

// Volume (0-1)
deck1.setVolume(0.5)

// Filter (0-1)
deck1.setFilter(0.3)  // Düşük frekanslara filtrele
deck1.setFilter(1.0)  // Filtre kapalı

// Scratch (delta: -1 to 1)
deck1.scratch(0.5)    // Hızlandır
deck1.scratch(-0.5)   // Yavaşlat
deck1.resetPlaybackRate()  // Normal hıza dön

// Track listesi
trackLibrary.getTracks()
```

## 3. File Upload Test

### HTML ekle (index.html)

```html
<input type="file" accept="audio/*" id="audioUpload">
<button onclick="loadUserTrack()">Load to Deck B</button>
```

### JavaScript (main.js)

```js
window.loadUserTrack = async () => {
  const fileInput = document.getElementById('audioUpload');
  const file = fileInput.files[0];

  if (!file) {
    alert('Please select a file first');
    return;
  }

  try {
    const { id, buffer } = await trackLibrary.loadFromFile(file);
    window.deck2.loadTrack(buffer);
    window.deck2.play();
    console.log(`Loaded: ${file.name}`);
  } catch (error) {
    console.error('Upload failed:', error);
  }
};
```

## 4. 3D Kontrollerle Entegrasyon

### controller.js'e deckId ekle

```js
// Jog wheel
function jog(x, deckId) {
  // ... mevcut kod ...
  j.userData = {
    type: "jog",
    deckId: deckId  // 1 veya 2
  };
}

// Kullanım
jog(-2.1, 1);  // Sol jog → Deck 1
jog(2.1, 2);   // Sağ jog → Deck 2
```

### main.js event handler'a ekle

```js
// Deck instance'ları global yap
let deck1, deck2;

// mousemove içinde
if (activeObject.userData.type === "jog") {
  const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
  const scratchDelta = deltaAngle / Math.PI; // -1 to 1
  deck.scratch(scratchDelta, 3.0);
}

// mouseup içinde
if (activeObject.userData.type === "jog") {
  const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
  deck.resetPlaybackRate();
}
```

## 5. Troubleshooting

### Audio çalışmıyor

```js
// AudioContext state kontrol et
console.log(audioEngine.context.state); // 'running' olmalı

// Manuel resume
await audioEngine.resume();
```

### Track yüklenmiyor

```js
// Track listesini kontrol et
trackLibrary.getTracks();

// Dosya yolu doğru mu?
// public/audio/sample-1.mp3 → /audio/sample-1.mp3 (URL)

// Console'da error var mı?
// Network tab'da 404 var mı?
```

### Scratch çalışmıyor

```js
// Track yüklü mü?
deck1.audioBuffer  // null olmamalı

// Playing mi?
deck1.isPlaying  // true olmalı

// Playback rate değişiyor mu?
deck1.source.playbackRate.value  // 0.25 - 4.0 arası
```

## 6. Sonraki Adımlar

- [ ] Preset track dosyalarını ekle (public/audio/)
- [ ] Deck instance'larını global export et
- [ ] Controller'a deckId ekle
- [ ] Event handler'larda audio call'ları ekle
- [ ] File upload UI ekle (opsiyonel)
- [ ] Crossfader ekle (Stage 4)
- [ ] EQ ekle (Stage 4)

## 7. Keyboard Shortcuts (Opsiyonel)

```js
document.addEventListener('keydown', (e) => {
  // Space: Deck A play/stop
  if (e.code === 'Space') {
    e.preventDefault();
    deck1.isPlaying ? deck1.stop() : deck1.play();
  }

  // 1-9: Preset track'leri yükle
  if (e.key >= '1' && e.key <= '9') {
    const tracks = trackLibrary.getTracks();
    const track = tracks[parseInt(e.key) - 1];
    if (track) {
      trackLibrary.loadPreset(track.id).then(buffer => {
        deck1.loadTrack(buffer);
        deck1.play();
      });
    }
  }

  // Q/W: Deck A volume
  if (e.key === 'q') deck1.setVolume(Math.max(0, deck1.gainNode.gain.value - 0.1));
  if (e.key === 'w') deck1.setVolume(Math.min(1, deck1.gainNode.gain.value + 0.1));

  // A/S: Deck A filter
  if (e.key === 'a') deck1.setFilter(Math.max(0, /* current - 0.1 */));
  if (e.key === 's') deck1.setFilter(Math.min(1, /* current + 0.1 */));
});
```

## 8. Debug Helpers

```js
// Audio system durumu
window.debugAudio = () => {
  console.log('=== AUDIO DEBUG ===');
  console.log('Engine:', {
    initialized: audioEngine.isInitialized,
    state: audioEngine.context?.state,
    currentTime: audioEngine.getCurrentTime()
  });
  console.log('Deck A:', {
    isPlaying: deck1.isPlaying,
    hasBuffer: !!deck1.audioBuffer,
    volume: deck1.gainNode.gain.value,
    filter: deck1.filterNode.frequency.value,
    rate: deck1.playbackRate
  });
  console.log('Tracks:', trackLibrary.getTracks());
};

// Console'da çağır
debugAudio();
```

Hazır! Sistemi test etmeye başlayabilirsin. 🎧
