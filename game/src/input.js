// Rustline — input.js
// Status keyboard + mouse drag orbit + klik. Edge-triggered "pressed" untuk
// aksi sekali tekan (E, F, R, P, M, H, Space lompat).

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // ditekan sejak frame terakhir dibaca
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = false;
    this.clicked = false; // klik kiri sejak frame terakhir
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.enabled = true;
    this._onKeyDown = (e) => {
      if (!this.enabled) return;
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.code);
    };
    this._onMouseDown = (e) => {
      if (!this.enabled) return;
      this.mouseDown = true;
      this.dragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      if (e.button === 0) this.clicked = true;
    };
    this._onMouseUp = () => {
      this.mouseDown = false;
      this.dragging = false;
    };
    this._onMouseMove = (e) => {
      if (!this.dragging) return;
      this.mouseDX += e.clientX - this.lastX;
      this.mouseDY += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    };
    this._onBlur = () => {
      this.keys.clear();
      this.mouseDown = false;
      this.dragging = false;
    };
  }

  attach(target) {
    target = target || window;
    target.addEventListener('keydown', this._onKeyDown);
    target.addEventListener('keyup', this._onKeyUp);
    target.addEventListener('mousedown', this._onMouseDown);
    target.addEventListener('mouseup', this._onMouseUp);
    target.addEventListener('mousemove', this._onMouseMove);
    target.addEventListener('blur', this._onBlur);
  }

  detach(target) {
    target = target || window;
    target.removeEventListener('keydown', this._onKeyDown);
    target.removeEventListener('keyup', this._onKeyUp);
    target.removeEventListener('mousedown', this._onMouseDown);
    target.removeEventListener('mouseup', this._onMouseUp);
    target.removeEventListener('mousemove', this._onMouseMove);
    target.removeEventListener('blur', this._onBlur);
  }

  down(code) {
    return this.keys.has(code);
  }

  // true sekali saja pada frame setelah tombol ditekan
  wasPressed(code) {
    return this.pressed.has(code);
  }

  // WASD / panah sebagai vektor -1..1 (x = kanan, y = maju)
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y += 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y -= 1;
    return { x, y };
  }

  // delta mouse sejak frame lalu, lalu nol-kan
  consumeMouse() {
    const dx = this.mouseDX;
    const dy = this.mouseDY;
    this.mouseDX = 0;
    this.mouseDY = 0;
    return { dx, dy };
  }

  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }

  // dipanggil di akhir tiap frame
  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }

  clearAll() {
    this.keys.clear();
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.clicked = false;
  }
}
