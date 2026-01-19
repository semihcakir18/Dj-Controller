import "./style.css";
import * as THREE from "three";
import { initScene } from "./scene";
import { interactables } from "./controller";

const { camera, controls } = initScene();


// ================= RAYCASTER =================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let activeObject = null;
let hoveredObject = null;
let lastAngle = 0;
let lastY = 0;

// Store original emissive colors
const originalEmissive = new Map();

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

    // Apply rotation
    activeObject.rotation.y -= deltaAngle;

    lastAngle = angle;
  }

  if (activeObject.userData.type === "fader") {
    const delta = mouse.y - lastY;
    activeObject.position.z = THREE.MathUtils.clamp(
      activeObject.position.z - delta * 2,
      activeObject.userData.minZ,
      activeObject.userData.maxZ
    );
    lastY = mouse.y;
  }
});

// Mouse down
window.addEventListener("mousedown", (e) => {
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(interactables);

  if (hits.length) {
    activeObject = hits[0].object;
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

    // Initialize angle for rotational controls
    if (activeObject.userData.type === "knob" || activeObject.userData.type === "jog") {
      const screenPos = getScreenPosition(activeObject, camera);
      const dx = e.clientX - screenPos.x;
      const dy = e.clientY - screenPos.y;
      lastAngle = Math.atan2(dy, dx);
    }

    controls.enabled = false; // 🔥 kamera kilit
  }
});


// Mouse up
window.addEventListener("mouseup", () => {
  if (activeObject) {
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

