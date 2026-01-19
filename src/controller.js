import * as THREE from "three";

export const interactables = [];

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

  const jogMaterial = new THREE.MeshStandardMaterial({
  map: createJogTexture(),
  roughness: 0.4,
  metalness: 0.6,
});
const knobMaterial = new THREE.MeshStandardMaterial({
  map: createKnobTexture(),
  roughness: 0.6,
  metalness: 0.3,
});
const metalMat = new THREE.MeshStandardMaterial({
  color: 0x777777,
});




  // ================= BASE =================
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(7, 0.4, 3.5),
    bodyMat
  );
  group.add(base);

  const surfaceY = 0.2; // üst yüzey referansı (base height 0.4 / 2 = 0.2)

  // ================= JOG =================
  function jog(x) {
  const jogHeight = 0.15; // Taller for visibility
  const j = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, jogHeight, 48),
    jogMaterial
  );

  // No rotation - cylinder stands vertically
  // Position so bottom sits on surface
  j.position.set(x, surfaceY + jogHeight / 2, -0.6);

  j.userData.type = "jog";
  interactables.push(j);
  group.add(j);
}



  jog(-2.1);
  jog(2.1);

  // ================= KNOB =================
  function knob(x, z) {
    const knobHeight = 0.25; // Taller for better visibility and grip
    const k = new THREE.Mesh(
  new THREE.CylinderGeometry(0.12, 0.12, knobHeight, 20),
  knobMaterial
);


    // No rotation - cylinder stands vertically like real knobs
    // Position so bottom sits on surface
    k.position.set(x, surfaceY + knobHeight / 2, z);

    k.userData = {
      type: "knob",
      value: 0,
    };

    interactables.push(k);
    group.add(k);
  }

  [-0.2, 0.05, 0.3].forEach((z) => {
    knob(-1.2, z);
    knob(1.2, z);
  });

  // ================= FADER =================
  function fader(x) {
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

    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.08, 0.18),
      metalMat
    );
    handle.position.set(x, surfaceY + 0.02, 0.9);

    handle.userData = {
      type: "fader",
      minZ: 0.3,
      maxZ: 1.5,
    };

    interactables.push(handle);
    group.add(handle);
  }

  fader(-0.5);
  fader(0.5);

  return group;
}
