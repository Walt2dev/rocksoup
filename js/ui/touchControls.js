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
      <div class="touch-rotate">
        <button type="button" class="touch-mini" data-touch-action="rotate-left" aria-label="Girar a la izquierda">↶</button>
        <button type="button" class="touch-mini" data-touch-action="rotate-right" aria-label="Girar a la derecha">↷</button>
      </div>
      <div class="touch-joystick" data-touch-joystick>
        <div class="touch-joystick-ring"></div>
        <div class="touch-joystick-knob"></div>
      </div>
      <div class="touch-action-pad">
        <button type="button" class="touch-action touch-attack" data-touch-action="attack">Atacar</button>
        <button type="button" class="touch-action" data-touch-action="jump">Saltar</button>
        <button type="button" class="touch-action" data-touch-action="place">Colocar</button>
        <button type="button" class="touch-action" data-touch-action="use">Usar</button>
        <button type="button" class="touch-action" data-touch-action="craft">Crafteo</button>
        <button type="button" class="touch-action" data-touch-action="recipes">Libro</button>
        <button type="button" class="touch-action" data-touch-action="menu">Menú</button>
        <button type="button" class="touch-action" data-touch-action="center">Centrar</button>
        <button type="button" class="touch-action touch-idle-worker" data-touch-action="idle-worker">Duendes</button>
      </div>
      <div class="touch-zoom">
        <button type="button" class="touch-mini" data-touch-action="zoom-in">+</button>
        <button type="button" class="touch-mini" data-touch-action="zoom-out">−</button>
      </div>
    `;

    root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-touch-action]");
      if (!button) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      this.handleAction(button.dataset.touchAction);
    });

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

  handleAction(action) {
    if (action === "attack") {
      this.game.attack();
    } else if (action === "jump") {
      this.game.jump();
    } else if (action === "place") {
      this.game.handlePlaceSelected();
    } else if (action === "use") {
      this.game.useSelectedItem();
    } else if (action === "craft") {
      this.game.toggleCrafting();
    } else if (action === "recipes") {
      this.game.toggleRecipeBook();
    } else if (action === "menu") {
      this.game.handleMenuRequest();
    } else if (action === "center") {
      this.game.recenterCamera();
    } else if (action === "rotate-left") {
      this.game.rotateCamera(-1);
    } else if (action === "rotate-right") {
      this.game.rotateCamera(1);
    } else if (action === "idle-worker") {
      this.game.handleIdleWorkerRequest();
    } else if (action === "zoom-in") {
      this.game.camera.zoomAt(
        this.game.camera.width / 2,
        this.game.camera.height / 2,
        1.2,
      );
    } else if (action === "zoom-out") {
      this.game.camera.zoomAt(
        this.game.camera.width / 2,
        this.game.camera.height / 2,
        0.84,
      );
    }
  }

  setIdleWorkerCount(count) {
    const button = this.root?.querySelector("[data-touch-action='idle-worker']");
    if (!button) {
      return;
    }

    button.textContent = count > 0 ? `Duendes ${count}` : "Duendes";
    button.classList.toggle("is-active", count > 0);
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
