# Audio Mimarisi

## Yapı (3-Layer Architecture)

```
trackLibrary.js → Track yönetimi (preset + user upload)
    ↓
deck.js         → Deck logic (play, stop, volume, filter, scratch)
    ↓
audioEngine.js  → Low-level Audio API (AudioContext + master gain)
```

### Separation of Concerns

| Layer | Sorumluluk | Ne Bilmiyor? |
|-------|-----------|--------------|
| **TrackLibrary** | Track metadata, loading, caching | Deck state, playback |
| **Deck** | Playback, audio effects | Track source (URL/File) |
| **AudioEngine** | AudioContext, master chain | Track metadata, deck logic |

## Audio Chain

```
AudioBufferSourceNode
    ↓
GainNode (channel volume - fader)
    ↓
BiquadFilterNode (lowpass - knob)
    ↓
Master GainNode
    ↓
AudioContext.destination (speaker)
```

## Kullanım

### 1. AudioEngine'i başlat (ilk user interaction'da)

```js
import { audioEngine } from './audio/audioEngine.js';

// İlk tıklama/tuş basımında
await audioEngine.init();
```

### 2. TrackLibrary'den track yükle

```js
import { trackLibrary } from './audio/trackLibrary.js';
import { Deck } from './audio/deck.js';

const deck1 = new Deck('Deck A');

// Preset track yükle
const buffer = await trackLibrary.loadPreset('preset_1');
deck1.loadTrack(buffer);

// User file yükle
const { id, buffer } = await trackLibrary.loadFromFile(file);
deck1.loadTrack(buffer);
```

### 3. Deck kontrolleri

```js
// Play/Stop
deck1.play();
deck1.stop();

// Volume (fader) - 0.0 to 1.0
deck1.setVolume(0.8);

// Filter (knob) - 0.0 to 1.0 normalized
deck1.setFilter(0.5); // 20Hz - 20kHz log scale

// Scratch (jog wheel)
deck1.scratch(delta); // delta: -1 to 1
deck1.resetPlaybackRate(); // Normal hıza dön
```

### 4. Track Library API

```js
// Tüm track'leri listele
const tracks = trackLibrary.getTracks();
// [{ id, name, sourceType, isLoaded }, ...]

// Track info al
const info = trackLibrary.getTrackInfo('preset_1');
// { id, name, sourceType, isLoaded, duration }

// Buffer'a direkt erişim (cache'den)
const buffer = trackLibrary.getBuffer('preset_1');

// User track sil
trackLibrary.removeTrack('user_123');
```

## 3D Entegrasyonu

### Track Selection (3D UI veya Keyboard)

```js
// 3D button click: "Load Track X to Deck A"
async function loadTrackToDeck(trackId, deckNumber) {
  let buffer = trackLibrary.getBuffer(trackId);

  // Henüz cache'de yoksa yükle
  if (!buffer) {
    buffer = await trackLibrary.loadPreset(trackId);
  }

  const deck = deckNumber === 1 ? deck1 : deck2;
  deck.loadTrack(buffer);
}
```

### Control Mapping (main.js raycaster events)

```js
// Jog wheel (scratch)
if (activeObject.userData.type === "jog") {
  const delta = /* mouse delta hesapla */;
  const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
  deck.scratch(delta, 2.0);
}

// Knob (filter)
if (activeObject.userData.type === "knob") {
  const rotation = activeObject.rotation.y;
  const normalized = (rotation % (Math.PI * 2)) / (Math.PI * 2);
  const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
  deck.setFilter(normalized);
}

// Fader (volume)
if (activeObject.userData.type === "fader") {
  const pos = activeObject.position.z;
  const normalized = (pos - minZ) / (maxZ - minZ);
  const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
  deck.setVolume(normalized);
}

// Mouse up: Jog bırakınca scratch'i durdur
if (activeObject.userData.type === "jog") {
  const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
  deck.resetPlaybackRate();
}
```

## File Upload (User Tracks)

```html
<!-- HTML -->
<input type="file" accept="audio/*" id="audioFileInput">
```

```js
// JavaScript
document.getElementById('audioFileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  try {
    // TrackLibrary'ye ekle
    const { id, buffer } = await trackLibrary.loadFromFile(file);

    // Deck'e yükle ve çal
    deck1.loadTrack(buffer);
    deck1.play();

    console.log(`Loaded: ${file.name} (ID: ${id})`);
  } catch (error) {
    console.error('File upload failed:', error);
  }
});
```

## Önemli Notlar

- **AudioContext**: İlk user gesture'da init edilmeli (tarayıcı politikası)
- **AudioBufferSourceNode**: Tek kullanımlık (her play'de yeni oluşturulur)
- **Filter frequency**: Log scale (20Hz-20kHz, kulak algısı için)
- **Playback rate**: 0.25x - 4.0x arasında sınırlı (negatif rate yok)
- **Loop**: Otomatik aktif (DJ setup için)
- **Track Source**: Deck track'in nereden geldiğini bilmez (separation of concerns)
- **Cache**: TrackLibrary buffer'ları otomatik cache'ler (tekrar yükleme yok)

## Mimari Avantajlar

✅ **Modüler**: Her layer bağımsız geliştirilebilir
✅ **Test edilebilir**: Mock data ile unit test kolay
✅ **Genişletilebilir**: Yeni track source eklemek basit (URL, Spotify API, etc.)
✅ **Memory efficient**: Lazy loading + cache clearing desteği
✅ **Type-safe ready**: TypeScript'e geçiş kolay

## Gelecek Geliştirmeler

### Stage 3 (Audio Integration) ✅
- [x] TrackLibrary (preset + user upload)
- [x] Deck audio chain (gain → filter)
- [x] Scratch / filter / volume kontrolleri

### Stage 4 (Advanced Features)
- [ ] **Crossfader**: İki deck arası smooth geçiş
- [ ] **EQ**: 3-band (low/mid/high) frequency control
- [ ] **Cue Points**: Track'te marker noktalar
- [ ] **BPM Detection**: Auto tempo detection
- [ ] **Beat Sync**: İki deck'i otomatik senkronize et
- [ ] **Waveform**: Track görselleştirme
- [ ] **Playlist**: Track sırası yönetimi
- [ ] **Effects Chain**: Reverb, delay, distortion, flanger
- [ ] **Recording**: Mix kaydetme
- [ ] **MIDI Support**: Harici DJ controller desteği

### Stage 5 (Immersion)
- [ ] **MediaPipe Integration**: Kafa hareketi ile kamera
- [ ] **Gesture Control**: El hareketi ile scratch
- [ ] **VR Mode**: WebXR ile tam immersive deneyim
