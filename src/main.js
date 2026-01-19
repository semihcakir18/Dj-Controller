import "./style.css";
import * as THREE from "three";
import { initScene } from "./scene";
import { interactables } from "./controller";

const { camera, controls } = initScene();


// ================= RAYCASTER =================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let activeObject = null;
let lastAngle = 0;
let lastY = 0;

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

  if (!activeObject) return;

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
  activeObject = null;
  controls.enabled = true; // 🔥 kamera serbest
});

