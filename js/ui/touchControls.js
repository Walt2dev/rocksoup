const JOYSTICK_RADIUS = 44;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.enabled = false;
    this.root = null;
    this.attached = false;
    this.joystickPointer = null;

    this.handleJoystickDown = this.handleJoystickDown.bind(this);
    this.handleJoystickMove = this.handleJoystickMove.bind(this);
    this.handleJoystickUp = this.handleJoystickUp.bind(this);
  }

  attach() {
    if (this.attached) {
      return;
    }

    this.attached = true;
    this.enabled = true;
    document.body.classList.add("touch-enabled");

    const root = document.createElement("div");
    root.className = "touch-controls";
    root.innerHTML = `
      <div class="touch-joystick" data-touch-joystick>
        <div class="touch-joystick-ring"></div>
        <div class="touch-joystick-knob"></div>
      </div>
    `;

    const joystick = root.querySelector("[data-touch-joystick]");
    joystick.addEventListener("pointerdown", this.handleJoystickDown);
    joystick.addEventListener("pointermove", this.handleJoystickMove);
    joystick.addEventListener("pointerup", this.handleJoystickUp);
    joystick.addEventListener("pointercancel", this.handleJoystickUp);

    this.root = root;
    this.game.canvas.parentElement.append(root);
  }

  handleJoystickDown(event) {
    event.preventDefault();
    event.stopPropagation();
    const joystick = this.root?.querySelector("[data-touch-joystick]");
    if (!joystick) {
      return;
    }
    this.joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    this.updateJoystick(event);
  }

  handleJoystickMove(event) {
    if (event.pointerId !== this.joystickPointer) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.updateJoystick(event);
  }

  handleJoystickUp(event) {
    if (event.pointerId !== this.joystickPointer) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.joystickPointer = null;
    this.game.input.setTouchMovement(0, 0);
    const knob = this.root?.querySelector(".touch-joystick-knob");
    if (knob) {
      knob.style.transform = "translate(-50%, -50%)";
    }
  }

  updateJoystick(event) {
    const joystick = this.root?.querySelector("[data-touch-joystick]");
    const knob = this.root?.querySelector(".touch-joystick-knob");
    if (!joystick || !knob) {
      return;
    }

    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    const radius = Math.min(JOYSTICK_RADIUS, rect.width / 2);
    const limit = Math.max(1, distance);

    if (distance > radius) {
      dx = (dx / limit) * radius;
      dy = (dy / limit) * radius;
    }

    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    this.game.input.setTouchMovement(dx / radius, dy / radius);
  }

  setIdleWorkerCount() {
    // El contador de duendes ahora vive en el menú de HUD.
  }

  destroy() {
    if (!this.attached) {
      return;
    }

    this.attached = false;
    this.game.input.setTouchMovement(0, 0);
    document.body.classList.remove("touch-enabled");
    this.root?.remove();
    this.root = null;
    this.joystickPointer = null;
  }
}
