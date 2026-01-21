import * as THREE from "three";

export const interactables = [];

// Knob rotation constants (270° range, centered at 12 o'clock)
// Offset by -90° so bypass (0.5) points up (12 o'clock) instead of right (3 o'clock)
const KNOB_MIN_ANGLE = -Math.PI * 3 / 4 - Math.PI / 2; // -225° (7:30 position)
const KNOB_RANGE = Math.PI * 3 / 2; // 270°

/**
 * ARCHITECTURE PATTERN FOR INTERACTABLES:
 *
 * Each interactable (jog, knob, fader, etc.) MUST have its own material instance.
 * This is critical because:
 * - Materials have mutable state (emissive, color, etc.)
 * - Hover/active effects modify material properties
 * - Shared materials would cause all instances to change together
 *
 * Pattern to follow:
 * 1. Textures CAN be shared (they're read-only) - create once, reuse
 * 2. Materials MUST be unique - create new instance for each object
 * 3. Each creation function (jog, knob, fader) should be self-contained
 *
 * Example:
 * function newControl(x) {
 *   const material = new THREE.MeshStandardMaterial({ ... }); // Unique material
 *   const mesh = new THREE.Mesh(geometry, material);
 *   mesh.userData.type = "controlType";
 *   interactables.push(mesh);
 *   group.add(mesh);
 * }
 */

// Create texture for jog with asymmetric marker (colorful stripe)
function createJogTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Base radial gradient
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 20,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "#444");
  gradient.addColorStop(0.4, "#222");
  gradient.addColorStop(1, "#111");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Add colorful marker stripe (bright cyan)
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = "#00ffff";
  ctx.fillRect(-20, -size / 2, 40, size * 0.7);
  ctx.restore();

  // Add accent dots for more visual interest
  ctx.fillStyle = "#ff00ff";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2 - size * 0.35, 15, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create texture for knob with pointer indicator
function createKnobTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Base gradient
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 10,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, "#555");
  gradient.addColorStop(0.7, "#2a2a2a");
  gradient.addColorStop(1, "#111");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Bright pointer indicator (orange/yellow)
  ctx.save();
  ctx.translate(size / 2, size / 2);
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath();
  ctx.moveTo(0, -size / 2 + 20);
  ctx.lineTo(-15, -size / 2 + 60);
  ctx.lineTo(15, -size / 2 + 60);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Center dot
  ctx.fillStyle = "#ffaa00";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 12, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}


export function createDJController() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1b1e24,
    roughness: 0.9,
  });

  // Create textures once (can be shared - textures are immutable)
  const jogTexture = createJogTexture();
  const knobTexture = createKnobTexture();




  // ================= BASE =================
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.4, 3.5),
    bodyMat
  );
  group.add(base);

  const surfaceY = 0.2; // üst yüzey referansı (base height 0.4 / 2 = 0.2)

  // ================= JOG =================
  /**
   * Create a jog wheel control
   * @param {number} x - X position
   * @param {number} deckId - Which deck (1 or 2)
   */
  function jog(x, deckId) {
  const jogHeight = 0.15; // Taller for visibility

  // Create unique material for each jog
  const jogMaterial = new THREE.MeshStandardMaterial({
    map: jogTexture.clone(),
    roughness: 0.4,
    metalness: 0.6,
  });

  const j = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, jogHeight, 48),
    jogMaterial
  );

  // No rotation - cylinder stands vertically
  // Position so bottom sits on surface
  j.position.set(x, surfaceY + jogHeight / 2, -0.6);

  j.userData = {
    type: "jog",
    deckId: deckId
  };
  interactables.push(j);
  group.add(j);
}



  jog(-2.1, 1); // Left jog - Deck 1
  jog(2.1, 2);  // Right jog - Deck 2

  // ================= KNOB =================
  /**
   * Create a knob control
   * @param {number} x - X position
   * @param {number} z - Z position
   * @param {string} controlType - What this knob controls ('filter', 'eqLow', 'eqHigh')
   * @param {number} deckId - Which deck (1 or 2)
   */
  function knob(x, z, controlType, deckId) {
    const knobHeight = 0.25; // Taller for better visibility and grip

    // Create unique material for each knob
    const knobMaterial = new THREE.MeshStandardMaterial({
      map: knobTexture.clone(),
      roughness: 0.6,
      metalness: 0.3,
    });

    const k = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, knobHeight, 20),
  knobMaterial
);


    // No rotation - cylinder stands vertically like real knobs
    // Position so bottom sits on surface
    k.position.set(x, surfaceY + knobHeight / 2, z);

    // Knob state: value drives rotation (not the other way around)
    // Each knob has its own independent control type
    k.userData = {
      type: "knob",
      controlType: controlType,  // 'filter', 'eqLow', 'eqHigh'
      deckId: deckId,             // 1 or 2
      value: 0.5, // Start at neutral/bypass position (centered)
    };

    // Set initial rotation from value
    k.rotation.y = KNOB_MIN_ANGLE + k.userData.value * KNOB_RANGE;

    interactables.push(k);
    group.add(k);
  }

  // Left deck (Deck 1) knobs
  knob(-1.2, -0.2, 'filter', 1);  // Front: Bipolar filter
  knob(-1.2, 0.05, 'eqLow', 1);   // Middle: EQ Low (bass)
  knob(-1.2, 0.3, 'eqHigh', 1);   // Back: EQ High (treble)

  // Right deck (Deck 2) knobs
  knob(1.2, -0.2, 'filter', 2);
  knob(1.2, 0.05, 'eqLow', 2);
  knob(1.2, 0.3, 'eqHigh', 2);

  // ================= FADER =================
  /**
   * Create a fader control (channel volume)
   * @param {number} x - X position
   * @param {number} deckId - Which deck (1 or 2)
   */
  function fader(x, deckId) {
    // Track material (non-interactable, can be shared per fader)
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.7,
      metalness: 0.3,
    });

    const track = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.05, 1.3),
      trackMat
    );
    track.position.set(x, surfaceY - 0.02, 0.9);
    group.add(track);

    // Handle material - unique for each fader handle (interactable)
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x777777,
      roughness: 0.5,
      metalness: 0.6,
    });

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.18),
      handleMat
    );
    handle.position.set(x, surfaceY + 0.02, 0.9);

    handle.userData = {
      type: "fader",
      controlType: "volume", // Channel volume control
      deckId: deckId,        // 1 or 2
      minZ: 0.3,
      maxZ: 1.5,
    };

    interactables.push(handle);
    group.add(handle);
  }

  // Left fader (Deck 1) - Channel volume
  fader(-0.5, 1);
  // Right fader (Deck 2) - Channel volume
  fader(0.5, 2);

  // ================= CROSSFADER =================
  /**
   * Create horizontal crossfader slider (center position, controls mix between decks)
   */
  function crossfader() {
    // Track material (non-interactable)
    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.7,
      metalness: 0.3,
    });

    // Horizontal rail
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.05, 0.15),
      trackMat
    );
    track.position.set(0, surfaceY - 0.02, 1.8);
    group.add(track);

    // Handle material - unique for crossfader handle (interactable)
    const handleMat = new THREE.MeshStandardMaterial({
      color: 0xff6600, // Orange color to distinguish from channel faders
      roughness: 0.5,
      metalness: 0.6,
    });

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.28),
      handleMat
    );

    // Start position: full left (Deck A only, crossfaderValue = 0.0)
    const minX = -0.9;
    const maxX = 0.9;
    const startX = minX; // Full left = Deck A only

    handle.position.set(startX, surfaceY + 0.02, 1.8);

    handle.userData = {
      type: "crossfader",
      minX: minX,
      maxX: maxX,
      value: 0.0, // Start at 0.0 (Deck A only)
    };

    interactables.push(handle);
    group.add(handle);
  }

  crossfader();

  return group;
}
