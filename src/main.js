import "./style.css";
import * as THREE from "three";
import { initScene } from "./scene";
import { interactables } from "./controller";
import { audioEngine } from "./audio/audioEngine";
import { trackLibrary } from "./audio/trackLibrary";
import { Deck } from "./audio/deck";
import { hud } from "./hud";

const { camera, controls } = initScene();

// ================= AUDIO SYSTEM =================
let deck1 = null;
let deck2 = null;
let audioInitialized = false;
let activeDeckId = 1; // UI focus only (which deck's controls are highlighted)

// Crossfader state (controls which deck is heard)
let crossfaderValue = 0.0; // 0.0 = Deck A only, 1.0 = Deck B only, 0.5 = Equal mix

// Track ownership (each deck has its own track)
let deckATrackId = null; // Currently loaded track ID for Deck A
let deckBTrackId = null; // Currently loaded track ID for Deck B
let deckATrackName = 'No Track'; // Display name
let deckBTrackName = 'No Track'; // Display name

/**
 * Assign a track to a specific deck with smooth transition
 * @param {number} deckId - 1 (Deck A) or 2 (Deck B)
 * @param {string} trackId - Track ID from trackLibrary
 */
async function assignTrackToDeck(deckId, trackId) {
  if (!audioInitialized) return;

  const deck = deckId === 1 ? deck1 : deck2;
  if (!deck) return;

  try {
    // Get track info and buffer
    const track = trackLibrary.getTrackInfo(trackId);
    if (!track) {
      console.error(`Track ${trackId} not found`);
      return;
    }

    // Load buffer (will use cache if already loaded)
    let buffer;
    if (track.sourceType === 'preset') {
      buffer = await trackLibrary.loadPreset(trackId);
    } else {
      buffer = trackLibrary.getBuffer(trackId);
      if (!buffer) {
        console.error(`Track ${trackId} buffer not available`);
        return;
      }
    }

    // Fade out current track (if playing)
    const wasPlaying = deck.isPlaying;
    if (wasPlaying) {
      // Quick fade out (100ms)
      const now = audioEngine.getCurrentTime();
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setTargetAtTime(0, now, 0.03); // 100ms fade
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Stop current track and load new one
    deck.stop();
    deck.loadTrack(buffer);

    // Update track ownership state
    if (deckId === 1) {
      deckATrackId = trackId;
      deckATrackName = track.name;
    } else {
      deckBTrackId = trackId;
      deckBTrackName = track.name;
    }

    // Fade in new track
    if (wasPlaying) {
      deck.play();
      const now = audioEngine.getCurrentTime();
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setTargetAtTime(0.8, now, 0.03); // 100ms fade in
    }

    console.log(`📀 ${deck.name}: Loaded "${track.name}"`);
    updateTrackDisplay();
  } catch (error) {
    console.error(`Failed to load track to ${deck.name}:`, error);
  }
}

/**
 * Assign a user-uploaded file to a deck
 * @param {number} deckId - 1 or 2
 * @param {File} file - Audio file
 */
async function assignUserTrackToDeck(deckId, file) {
  if (!audioInitialized) return;

  const deck = deckId === 1 ? deck1 : deck2;
  if (!deck) return;

  try {
    // Load user track
    const { id, buffer, name } = await trackLibrary.loadFromFile(file);

    // Fade out current track
    const wasPlaying = deck.isPlaying;
    if (wasPlaying) {
      const now = audioEngine.getCurrentTime();
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setTargetAtTime(0, now, 0.03);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Stop and load
    deck.stop();
    deck.loadTrack(buffer);

    // Update state
    if (deckId === 1) {
      deckATrackId = id;
      deckATrackName = name;
    } else {
      deckBTrackId = id;
      deckBTrackName = name;
    }

    // Fade in
    if (wasPlaying) {
      deck.play();
      const now = audioEngine.getCurrentTime();
      deck.gainNode.gain.cancelScheduledValues(now);
      deck.gainNode.gain.setTargetAtTime(0.8, now, 0.03);
    }

    console.log(`📀 ${deck.name}: Loaded "${name}"`);
    updateTrackDisplay();
  } catch (error) {
    console.error(`Failed to load user track to ${deck.name}:`, error);
  }
}

/**
 * Update track display UI
 */
function updateTrackDisplay() {
  const deckAElement = document.getElementById('deck-a-track');
  const deckBElement = document.getElementById('deck-b-track');

  if (deckAElement) deckAElement.textContent = deckATrackName;
  if (deckBElement) deckBElement.textContent = deckBTrackName;
}

/**
 * Switch active deck (UI focus only - doesn't affect audio)
 * @param {number} deckId - 1 or 2
 */
function setActiveDeck(deckId) {
  if (!audioInitialized || activeDeckId === deckId) return;

  const newDeck = deckId === 1 ? deck1 : deck2;
  activeDeckId = deckId;
  console.log(`🎯 UI Focus: ${newDeck.name}`);
}

/**
 * Update crossfader position (controls mix between Deck A and Deck B)
 * @param {number} value - 0.0 (Deck A only) to 1.0 (Deck B only)
 */
function setCrossfader(value) {
  if (!audioInitialized || !deck1 || !deck2) return;

  crossfaderValue = Math.max(0, Math.min(1, value));

  const now = audioEngine.getCurrentTime();
  const smoothTime = 0.015; // 15ms smooth transition

  // Linear crossfade (can upgrade to equal-power later)
  const deckAGain = 1.0 - crossfaderValue; // 1.0 → 0.0
  const deckBGain = crossfaderValue;        // 0.0 → 1.0

  // Update deck gain nodes
  deck1.deckGainNode.gain.cancelScheduledValues(now);
  deck1.deckGainNode.gain.setTargetAtTime(deckAGain, now, smoothTime);

  deck2.deckGainNode.gain.cancelScheduledValues(now);
  deck2.deckGainNode.gain.setTargetAtTime(deckBGain, now, smoothTime);

  console.log(`🎚️  Crossfader: ${(crossfaderValue * 100).toFixed(0)}% | A: ${(deckAGain * 100).toFixed(0)}% | B: ${(deckBGain * 100).toFixed(0)}%`);
}

async function initAudio() {
  if (audioInitialized) return;

  try {
    await audioEngine.init();
    await audioEngine.resume();

    // Create decks
    deck1 = new Deck('Deck A');
    deck2 = new Deck('Deck B');

    // Load default preset track to Deck A (no track on Deck B initially)
    await assignTrackToDeck(1, 'preset_1');

    // Start Deck A
    deck1.play();

    // Initialize crossfader (default: Deck A only)
    setCrossfader(0.0);

    audioInitialized = true;

    // Create track selector UI
    createTrackSelectorUI();

    // Make global for console testing
    window.deck1 = deck1;
    window.deck2 = deck2;
    window.trackLibrary = trackLibrary;
    window.audioEngine = audioEngine;
    window.setActiveDeck = setActiveDeck;
    window.setCrossfader = setCrossfader;
    window.assignTrackToDeck = assignTrackToDeck;
    window.assignUserTrackToDeck = assignUserTrackToDeck;

    console.log('🎧 Audio system ready!');
    console.log('📀 Deck A: Playing | Deck B: No Track');
    console.log('💡 Use track selector UI or console to load tracks');
    console.log('🎚️  Keyboard: Z/X = Crossfader | Space = Play/Stop | Q/W = Volume | A/S = Filter | 1/2 = Focus deck');
  } catch (error) {
    console.error('Audio initialization failed:', error);
  }
}

/**
 * Create minimal track selector UI
 */
function createTrackSelectorUI() {
  // Create UI container
  const container = document.createElement('div');
  container.id = 'track-selector';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(20, 25, 35, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(100, 180, 255, 0.3);
    border-radius: 8px;
    padding: 15px;
    color: white;
    font-family: monospace;
    font-size: 12px;
    z-index: 1000;
    min-width: 250px;
  `;

  // Deck A section
  const deckASection = document.createElement('div');
  deckASection.innerHTML = `
    <div style="margin-bottom: 10px; border-bottom: 1px solid rgba(100,180,255,0.3); padding-bottom: 8px;">
      <strong style="color: #4af;">🎧 DECK A</strong>
      <div id="deck-a-track" style="color: #6f6; margin-top: 4px;">No Track</div>
    </div>
  `;

  // Preset buttons for Deck A
  const presetTracksA = trackLibrary.getTracks().filter(t => t.sourceType === 'preset');
  presetTracksA.forEach(track => {
    const btn = document.createElement('button');
    btn.textContent = `Load: ${track.name}`;
    btn.style.cssText = `
      display: block;
      width: 100%;
      margin: 4px 0;
      padding: 6px;
      background: rgba(70, 160, 255, 0.2);
      border: 1px solid rgba(70, 160, 255, 0.5);
      color: white;
      cursor: pointer;
      border-radius: 4px;
      font-size: 11px;
    `;
    btn.onclick = () => assignTrackToDeck(1, track.id);
    deckASection.appendChild(btn);
  });

  // File upload for Deck A
  const fileInputA = document.createElement('input');
  fileInputA.type = 'file';
  fileInputA.accept = 'audio/*';
  fileInputA.style.cssText = `
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 4px;
    font-size: 10px;
    color: white;
  `;
  fileInputA.onchange = (e) => {
    if (e.target.files[0]) {
      assignUserTrackToDeck(1, e.target.files[0]);
    }
  };
  deckASection.appendChild(fileInputA);

  // Deck B section
  const deckBSection = document.createElement('div');
  deckBSection.innerHTML = `
    <div style="margin: 15px 0 10px 0; border-bottom: 1px solid rgba(100,180,255,0.3); padding-bottom: 8px;">
      <strong style="color: #f4a;">🎧 DECK B</strong>
      <div id="deck-b-track" style="color: #6f6; margin-top: 4px;">No Track</div>
    </div>
  `;

  // Preset buttons for Deck B
  const presetTracksB = trackLibrary.getTracks().filter(t => t.sourceType === 'preset');
  presetTracksB.forEach(track => {
    const btn = document.createElement('button');
    btn.textContent = `Load: ${track.name}`;
    btn.style.cssText = `
      display: block;
      width: 100%;
      margin: 4px 0;
      padding: 6px;
      background: rgba(255, 70, 160, 0.2);
      border: 1px solid rgba(255, 70, 160, 0.5);
      color: white;
      cursor: pointer;
      border-radius: 4px;
      font-size: 11px;
    `;
    btn.onclick = () => assignTrackToDeck(2, track.id);
    deckBSection.appendChild(btn);
  });

  // File upload for Deck B
  const fileInputB = document.createElement('input');
  fileInputB.type = 'file';
  fileInputB.accept = 'audio/*';
  fileInputB.style.cssText = `
    display: block;
    width: 100%;
    margin-top: 8px;
    padding: 4px;
    font-size: 10px;
    color: white;
  `;
  fileInputB.onchange = (e) => {
    if (e.target.files[0]) {
      assignUserTrackToDeck(2, e.target.files[0]);
    }
  };
  deckBSection.appendChild(fileInputB);

  // Assemble
  container.appendChild(deckASection);
  container.appendChild(deckBSection);
  document.body.appendChild(container);

  updateTrackDisplay();
}

// ================= RAYCASTER =================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let activeObject = null;
let hoveredObject = null;
let lastAngle = 0;
let lastX = 0;
let lastY = 0;

// Store original emissive colors
const originalEmissive = new Map();

// ================= KNOB CONSTANTS =================
// Knob rotation range (270 degrees total, centered at 12 o'clock)
// Offset by -90° so bypass (0.5) points up (12 o'clock) instead of right (3 o'clock)
const KNOB_MIN_ANGLE = -Math.PI * 3 / 4 - Math.PI / 2; // -225° (7:30 position)
const KNOB_MAX_ANGLE = Math.PI * 3 / 4 - Math.PI / 2;  // +45° (1:30 position)
const KNOB_RANGE = KNOB_MAX_ANGLE - KNOB_MIN_ANGLE; // 270° (3π/2)

// ================= HUD HELPERS =================
/**
 * Show HUD for active object
 */
function showHUDForObject(object) {
  const type = object.userData.type;
  const deckId = object.userData.deckId;
  const isFocused = deckId === activeDeckId;
  const deckLabel = deckId === 1 ? 'A' : 'B';
  const focusIndicator = isFocused ? '🎯' : '○';

  let label = '';
  let value = '';

  if (type === 'jog') {
    const deck = object.userData.deckId === 1 ? deck1 : deck2;
    const trackName = deckId === 1 ? deckATrackName : deckBTrackName;
    label = `${focusIndicator} Deck ${deckLabel} - ${trackName}`;
    value = deck ? `Playback: ${deck.playbackRate.toFixed(2)}x` : 'Ready';
  } else if (type === 'knob') {
    const deck = object.userData.deckId === 1 ? deck1 : deck2;
    const controlType = object.userData.controlType;
    const trackName = deckId === 1 ? deckATrackName : deckBTrackName;

    // Label based on control type
    switch (controlType) {
      case 'filter':
        label = `${focusIndicator} Deck ${deckLabel} [${trackName}] - Filter`;
        if (deck) {
          const { type: filterType, frequency } = deck.filterState;
          const freqStr = frequency >= 1000
            ? `${(frequency / 1000).toFixed(1)} kHz`
            : `${Math.round(frequency)} Hz`;

          if (filterType === 'bypass') {
            value = 'BYPASS (OFF)';
          } else if (filterType === 'lowpass') {
            value = `Low-Pass: ${freqStr}`;
          } else {
            value = `High-Pass: ${freqStr}`;
          }
        }
        break;
      case 'eqLow':
        label = `${focusIndicator} Deck ${deckLabel} [${trackName}] - Bass`;
        if (deck) {
          const gainDB = deck.eqState.low.gain;
          value = gainDB >= 0 ? `+${gainDB.toFixed(1)} dB` : `${gainDB.toFixed(1)} dB`;
        }
        break;
      case 'eqHigh':
        label = `${focusIndicator} Deck ${deckLabel} [${trackName}] - Treble`;
        if (deck) {
          const gainDB = deck.eqState.high.gain;
          value = gainDB >= 0 ? `+${gainDB.toFixed(1)} dB` : `${gainDB.toFixed(1)} dB`;
        }
        break;
      default:
        label = `${focusIndicator} Deck ${deckLabel} [${trackName}] - Knob`;
        value = 'Ready';
    }
  } else if (type === 'fader') {
    const deck = object.userData.deckId === 1 ? deck1 : deck2;
    const trackName = deckId === 1 ? deckATrackName : deckBTrackName;
    label = `${focusIndicator} Deck ${deckLabel} - ${trackName} - Volume`;
    value = deck ? `${Math.round(deck.gainNode.gain.value * 100)}%` : 'Ready';
  } else if (type === 'crossfader') {
    const cfValue = object.userData.value;
    const deckAPercent = Math.round((1.0 - cfValue) * 100);
    const deckBPercent = Math.round(cfValue * 100);

    label = '🎚️ Crossfader';
    value = `A ← ${deckAPercent}% | ${deckBPercent}% → B`;
  }

  hud.show({
    object3D: object,
    label,
    value,
    camera
  });
}

/**
 * Update HUD value during interaction
 */
function updateHUDValue(object) {
  const type = object.userData.type;
  let value = '';

  if (type === 'jog') {
    const deck = object.userData.deckId === 1 ? deck1 : deck2;
    if (deck) {
      value = `Playback: ${deck.playbackRate.toFixed(2)}x`;
    }
  } else if (type === 'knob') {
    const deck = object.userData.deckId === 1 ? deck1 : deck2;
    const controlType = object.userData.controlType;

    if (deck) {
      switch (controlType) {
        case 'filter':
          const { type: filterType, frequency } = deck.filterState;
          const freqStr = frequency >= 1000
            ? `${(frequency / 1000).toFixed(1)} kHz`
            : `${Math.round(frequency)} Hz`;

          if (filterType === 'bypass') {
            value = 'BYPASS (OFF)';
          } else if (filterType === 'lowpass') {
            value = `Low-Pass: ${freqStr}`;
          } else {
            value = `High-Pass: ${freqStr}`;
          }
          break;
        case 'eqLow':
          const lowGainDB = deck.eqState.low.gain;
          value = lowGainDB >= 0 ? `+${lowGainDB.toFixed(1)} dB` : `${lowGainDB.toFixed(1)} dB`;
          break;
        case 'eqHigh':
          const highGainDB = deck.eqState.high.gain;
          value = highGainDB >= 0 ? `+${highGainDB.toFixed(1)} dB` : `${highGainDB.toFixed(1)} dB`;
          break;
      }
    }
  } else if (type === 'fader') {
    const deck = object.userData.deckId === 1 ? deck1 : deck2;
    if (deck) {
      value = `${Math.round(deck.gainNode.gain.value * 100)}%`;
    }
  } else if (type === 'crossfader') {
    const cfValue = object.userData.value;
    const deckAPercent = Math.round((1.0 - cfValue) * 100);
    const deckBPercent = Math.round(cfValue * 100);
    value = `A ← ${deckAPercent}% | ${deckBPercent}% → B`;
  }

  hud.update(value);
}

// Helper to get screen position of 3D object
function getScreenPosition(obj, camera) {
  const vector = new THREE.Vector3();
  obj.getWorldPosition(vector);
  vector.project(camera);

  return {
    x: (vector.x + 1) / 2 * window.innerWidth,
    y: -(vector.y - 1) / 2 * window.innerHeight
  };
}

// Mouse position
window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  // Hover detection (only when not actively controlling something)
  if (!activeObject) {
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables);

    // Clear previous hover
    if (hoveredObject && hoveredObject !== hits[0]?.object) {
      hoveredObject.material.emissive.setHex(0x000000);
      hoveredObject.material.emissiveIntensity = 0;
      document.body.style.cursor = "default";
      hoveredObject = null;
    }

    // Set new hover
    if (hits.length > 0) {
      const newHover = hits[0].object;
      if (newHover !== hoveredObject) {
        hoveredObject = newHover;

        // Store original emissive if not stored
        if (!originalEmissive.has(hoveredObject)) {
          originalEmissive.set(hoveredObject, {
            color: hoveredObject.material.emissive.getHex(),
            intensity: hoveredObject.material.emissiveIntensity || 0
          });
        }

        // Apply hover effect
        hoveredObject.material.emissive.setHex(0x2266ff);
        hoveredObject.material.emissiveIntensity = 0.3;
        document.body.style.cursor = "pointer";
      }
    }

    return;
  }

  // Active object control
  if (activeObject.userData.type === "knob" || activeObject.userData.type === "jog") {
    // Get object center in screen space
    const screenPos = getScreenPosition(activeObject, camera);

    // Calculate angle from object center to mouse
    const dx = e.clientX - screenPos.x;
    const dy = e.clientY - screenPos.y;
    const angle = Math.atan2(dy, dx);

    // Calculate angle delta
    let deltaAngle = angle - lastAngle;

    // Handle angle wrapping (when crossing from PI to -PI)
    if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
    if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

    // AUDIO: Apply to deck
    if (audioInitialized) {
      if (activeObject.userData.type === "jog") {
        // Jog: Direct rotation (no value state)
        activeObject.rotation.y -= deltaAngle;

        // Route to correct deck
        const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
        if (deck) {
          // Scratch effect
          const scratchDelta = deltaAngle / Math.PI; // -1 to 1
          deck.scratch(scratchDelta, 3.0);
        }
      } else if (activeObject.userData.type === "knob") {
        // Knob: Value-based (0-1), rotation derived from value
        const sensitivity = 0.3; // How much value changes per mouse movement
        const valueDelta = -deltaAngle * sensitivity;

        // Update value (clamped 0-1)
        activeObject.userData.value = Math.max(0, Math.min(1,
          activeObject.userData.value + valueDelta
        ));

        // Derive rotation from value (single source of truth)
        activeObject.rotation.y = KNOB_MIN_ANGLE + activeObject.userData.value * KNOB_RANGE;

        // Route to correct deck and parameter
        const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
        if (deck) {
          const controlType = activeObject.userData.controlType;
          const value = activeObject.userData.value;

          // Each knob controls its own independent parameter
          switch (controlType) {
            case 'filter':
              deck.setFilter(value);
              break;
            case 'eqLow':
              deck.setEQLow(value);
              break;
            case 'eqHigh':
              deck.setEQHigh(value);
              break;
          }
        }
      }

      // HUD: Update value
      updateHUDValue(activeObject);
    }

    lastAngle = angle;
  }

  if (activeObject.userData.type === "fader") {
    const delta = mouse.y - lastY;
    activeObject.position.z = THREE.MathUtils.clamp(
      activeObject.position.z - delta * 2,
      activeObject.userData.minZ,
      activeObject.userData.maxZ
    );

    // AUDIO: Volume control (fader controls deck's channel gain, independent of crossfader)
    if (audioInitialized) {
      const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
      if (deck) {
        const pos = activeObject.position.z;
        const { minZ, maxZ } = activeObject.userData;
        const volumeValue = (pos - minZ) / (maxZ - minZ);

        // Apply volume directly to deck's channel gain
        deck.setVolume(volumeValue);

        // HUD: Update value
        updateHUDValue(activeObject);
      }
    }

    lastY = mouse.y;
  }

  if (activeObject.userData.type === "crossfader") {
    const delta = mouse.x - lastX;
    activeObject.position.x = THREE.MathUtils.clamp(
      activeObject.position.x + delta * 2,
      activeObject.userData.minX,
      activeObject.userData.maxX
    );

    // AUDIO: Crossfader controls mix between Deck A and Deck B
    if (audioInitialized) {
      const pos = activeObject.position.x;
      const { minX, maxX } = activeObject.userData;
      const crossfaderValue = (pos - minX) / (maxX - minX); // 0.0 (left/Deck A) to 1.0 (right/Deck B)

      // Update userData value
      activeObject.userData.value = crossfaderValue;

      // Apply crossfader
      setCrossfader(crossfaderValue);

      // HUD: Update value
      updateHUDValue(activeObject);
    }

    lastX = mouse.x;
  }
});

// Mouse down
window.addEventListener("mousedown", async (e) => {
  // Initialize audio on first interaction
  if (!audioInitialized) {
    await initAudio();
  }

  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactables);

  if (hits.length) {
    activeObject = hits[0].object;
    lastX = mouse.x;
    lastY = mouse.y;

    // Clear hover state since we're now active
    hoveredObject = null;
    document.body.style.cursor = "grabbing";

    // Store original emissive if not stored
    if (!originalEmissive.has(activeObject)) {
      originalEmissive.set(activeObject, {
        color: activeObject.material.emissive.getHex(),
        intensity: activeObject.material.emissiveIntensity || 0
      });
    }

    // Apply active state effect (stronger glow)
    activeObject.material.emissive.setHex(0xff6600);
    activeObject.material.emissiveIntensity = 0.5;

    // Switch active deck on any control interaction
    if (audioInitialized && activeObject.userData.deckId) {
      setActiveDeck(activeObject.userData.deckId);
    }

    // Initialize angle for rotational controls (jog only - knob uses value)
    if (activeObject.userData.type === "jog") {
      const screenPos = getScreenPosition(activeObject, camera);
      const dx = e.clientX - screenPos.x;
      const dy = e.clientY - screenPos.y;
      lastAngle = Math.atan2(dy, dx);

      // Touch to play: if deck isn't playing, start it (like real platter touch)
      if (audioInitialized) {
        const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
        if (deck && !deck.isPlaying) {
          deck.play();
          console.log(`🎵 ${deck.name}: Started by jog touch`);
        }
      }
    } else if (activeObject.userData.type === "knob") {
      // For knob, store initial mouse angle
      const screenPos = getScreenPosition(activeObject, camera);
      const dx = e.clientX - screenPos.x;
      const dy = e.clientY - screenPos.y;
      lastAngle = Math.atan2(dy, dx);
    }

    // HUD: Show initial state
    showHUDForObject(activeObject);

    controls.enabled = false; // 🔥 kamera kilit
  }
});


// Mouse up
window.addEventListener("mouseup", () => {
  if (activeObject) {
    // AUDIO: Reset scratch when releasing jog
    if (activeObject.userData.type === "jog" && audioInitialized) {
      const deck = activeObject.userData.deckId === 1 ? deck1 : deck2;
      if (deck) {
        deck.resetPlaybackRate();
        // Update HUD one last time with normal rate
        updateHUDValue(activeObject);
      }
    }

    // HUD: Hide with delay
    hud.hide(800);

    // Restore original emissive
    const original = originalEmissive.get(activeObject);
    if (original) {
      activeObject.material.emissive.setHex(original.color);
      activeObject.material.emissiveIntensity = original.intensity;
    }

    // Check if still hovering
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactables);

    if (hits.length > 0 && hits[0].object === activeObject) {
      // Still hovering, apply hover effect
      hoveredObject = activeObject;
      hoveredObject.material.emissive.setHex(0x2266ff);
      hoveredObject.material.emissiveIntensity = 0.3;
      document.body.style.cursor = "pointer";
    } else {
      document.body.style.cursor = "default";
    }

    activeObject = null;
  }

  controls.enabled = true; // 🔥 kamera serbest
});

// ================= KEYBOARD SHORTCUTS =================
document.addEventListener('keydown', (e) => {
  if (!audioInitialized) return;

  const activeDeck = activeDeckId === 1 ? deck1 : deck2;
  if (!activeDeck) return;

  // Space: Play/Stop toggle (active deck)
  if (e.code === 'Space') {
    e.preventDefault();
    if (activeDeck.isPlaying) {
      activeDeck.stop();
      console.log(`⏸️  ${activeDeck.name} stopped`);
    } else {
      activeDeck.play();
      console.log(`▶️  ${activeDeck.name} playing`);
    }
  }

  // Q/W: Volume control (focused deck's channel fader)
  if (e.key === 'q') {
    const currentVol = activeDeck.gainNode.gain.value;
    const newVol = Math.max(0, currentVol - 0.1);
    activeDeck.setVolume(newVol);
    console.log(`🔊 ${activeDeck.name} Volume: ${(newVol * 100).toFixed(0)}%`);
  }
  if (e.key === 'w') {
    const currentVol = activeDeck.gainNode.gain.value;
    const newVol = Math.min(1, currentVol + 0.1);
    activeDeck.setVolume(newVol);
    console.log(`🔊 ${activeDeck.name} Volume: ${(newVol * 100).toFixed(0)}%`);
  }

  // Z/X: Crossfader control (mix between Deck A and Deck B)
  if (e.key === 'z') {
    const newValue = Math.max(0, crossfaderValue - 0.1);
    setCrossfader(newValue);
  }
  if (e.key === 'x') {
    const newValue = Math.min(1, crossfaderValue + 0.1);
    setCrossfader(newValue);
  }

  // A/S: Filter control (active deck)
  if (e.key === 'a') {
    activeDeck.setFilter(0.2); // Low pass
    console.log(`🎛️  ${activeDeck.name} Filter: Low`);
  }
  if (e.key === 's') {
    activeDeck.setFilter(1.0); // Full open
    console.log(`🎛️  ${activeDeck.name} Filter: Open`);
  }

  // 1/2: Switch active deck
  if (e.key === '1') {
    setActiveDeck(1);
  }
  if (e.key === '2') {
    setActiveDeck(2);
  }
});

// ================= ANIMATION LOOP (HUD UPDATE) =================
function tick() {
  requestAnimationFrame(tick);

  // Update HUD position every frame
  hud.tick();
}

// Start animation loop
tick();

