/**
 * HUD SYSTEM - World-space to Screen-space UI Overlay
 *
 * Sorumluluklar:
 * - 3D objelerinin üzerinde dinamik HUD gösterme
 * - World position → Screen position projection
 * - Fade in/out animasyonları
 * - Auto-hide timer yönetimi
 *
 * API:
 * - show({ object3D, label, value, camera })
 * - update(value)
 * - hide()
 */

import * as THREE from 'three';

class HUD {
  constructor() {
    this.container = null;
    this.labelElement = null;
    this.valueElement = null;

    this.activeObject = null;
    this.camera = null;
    this.isVisible = false;
    this.hideTimeout = null;

    // Projection helper
    this.screenPosition = new THREE.Vector3();

    this._createDOMElements();
  }

  /**
   * HTML elements oluştur
   */
  _createDOMElements() {
    // HUD container
    this.container = document.createElement('div');
    this.container.className = 'hud-overlay';
    this.container.innerHTML = `
      <div class="hud-label"></div>
      <div class="hud-value"></div>
    `;

    this.labelElement = this.container.querySelector('.hud-label');
    this.valueElement = this.container.querySelector('.hud-value');

    document.body.appendChild(this.container);
  }

  /**
   * HUD'u göster (fade-in animation)
   * @param {Object} options
   * @param {THREE.Object3D} options.object3D - 3D obje (pozisyon referansı)
   * @param {string} options.label - Control adı (örn: "Jog Wheel")
   * @param {string} options.value - Mevcut değer (örn: "1.2x")
   * @param {THREE.Camera} options.camera - Scene kamerası
   */
  show({ object3D, label, value, camera }) {
    // Clear any pending hide timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.activeObject = object3D;
    this.camera = camera;

    // Update content
    this.labelElement.textContent = label;
    this.valueElement.textContent = value;

    // Update position
    this._updatePosition();

    // Show with fade-in
    if (!this.isVisible) {
      this.container.classList.remove('hud-hiding');
      this.container.classList.add('hud-visible');
      this.isVisible = true;
    }
  }

  /**
   * Sadece değeri güncelle (position da güncellenir)
   * @param {string} value - Yeni değer
   */
  update(value) {
    if (!this.isVisible || !this.activeObject) return;

    this.valueElement.textContent = value;
    this._updatePosition();
  }

  /**
   * HUD'u gizle (delay ile)
   * @param {number} delay - Gecikme süresi (ms), default 800ms
   */
  hide(delay = 800) {
    if (!this.isVisible) return;

    // Clear any existing timeout
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }

    // Set hide timeout
    this.hideTimeout = setTimeout(() => {
      this.container.classList.remove('hud-visible');
      this.container.classList.add('hud-hiding');

      // Reset state after animation
      setTimeout(() => {
        this.isVisible = false;
        this.activeObject = null;
        this.camera = null;
        this.container.classList.remove('hud-hiding');
      }, 300); // CSS transition duration
    }, delay);
  }

  /**
   * HUD'u hemen gizle (delay yok)
   */
  hideImmediate() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    this.container.classList.remove('hud-visible');
    this.isVisible = false;
    this.activeObject = null;
    this.camera = null;
  }

  /**
   * Screen position'ı güncelle (her frame çağrılmalı)
   */
  _updatePosition() {
    if (!this.activeObject || !this.camera) return;

    // Get world position of object
    this.activeObject.getWorldPosition(this.screenPosition);

    // Add offset above object (Y+)
    this.screenPosition.y += 0.5;

    // Project to screen space
    this.screenPosition.project(this.camera);

    // Convert to pixel coordinates
    const x = (this.screenPosition.x * 0.5 + 0.5) * window.innerWidth;
    const y = (this.screenPosition.y * -0.5 + 0.5) * window.innerHeight;

    // Apply position (centered)
    this.container.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
  }

  /**
   * Animation loop'tan çağrılacak (position sürekli güncelleme)
   */
  tick() {
    if (this.isVisible && this.activeObject) {
      this._updatePosition();
    }
  }
}

// Singleton instance
export const hud = new HUD();
