const MOVE_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
]);

const DRAG_THRESHOLD = 4;
const CLICK_DURATION = 500;

export class GameInput {
  constructor(canvas, camera, {
    onMenu,
    onRecenter,
    onClick,
    onRightClick,
    onCameraPan,
    onCraft,
    onRecipes,
    onQuest,
    onBirds,
    onMap,
    onPlace,
    onHotbar,
    onUseSelected,
    onDropSelected,
    onAttack,
    onHover,
    onHoverEnd,
    onDragStart,
    onDragMove,
    onDragEnd,
    onRotateLeft,
    onRotateRight,
    onJump,
    onGameMode,
    onFief,
  } = {}) {
    this.canvas = canvas;
    this.camera = camera;
    this.onMenu = onMenu;
    this.onRecenter = onRecenter;
    this.onClick = onClick;
    this.onRightClick = onRightClick;
    this.onCameraPan = onCameraPan;
    this.onCraft = onCraft;
    this.onRecipes = onRecipes;
    this.onQuest = onQuest;
    this.onBirds = onBirds;
    this.onMap = onMap;
    this.onPlace = onPlace;
    this.onHotbar = onHotbar;
    this.onUseSelected = onUseSelected;
    this.onDropSelected = onDropSelected;
    this.onAttack = onAttack;
    this.onHover = onHover;
    this.onHoverEnd = onHoverEnd;
    this.onDragStart = onDragStart;
    this.onDragMove = onDragMove;
    this.onDragEnd = onDragEnd;
    this.onRotateLeft = onRotateLeft;
    this.onRotateRight = onRotateRight;
    this.onJump = onJump;
    this.onGameMode = onGameMode;
    this.onFief = onFief;
    this.keys = new Set();
    this.touchX = 0;
    this.touchY = 0;
    this.attached = false;
    this.pointerDown = false;
    this.dragging = false;
    this.dragPaints = false;
    this.pointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.downTime = 0;

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerMove = this.handlePointerMove.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerCancel = this.handlePointerCancel.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
    this.handleContextMenu = this.handleContextMenu.bind(this);
  }

  attach() {
    if (this.attached) {
      return;
    }

    this.attached = true;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.addEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);
  }

  detach() {
    if (!this.attached) {
      return;
    }

    this.attached = false;
    this.keys.clear();
    this.touchX = 0;
    this.touchY = 0;
    this.resetPointer();
    this.onHoverEnd?.();
    this.canvas.classList.remove("is-dragging");
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerCancel);
    this.canvas.removeEventListener("pointerleave", this.handlePointerLeave);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }

  setTouchMovement(x, y) {
    this.touchX = Math.max(-1, Math.min(1, x));
    this.touchY = Math.max(-1, Math.min(1, y));
  }

  movement() {
    let x = this.touchX;
    let y = this.touchY;

    if (this.keys.has("ArrowLeft") || this.keys.has("KeyA")) {
      x -= 1;
    }
    if (this.keys.has("ArrowRight") || this.keys.has("KeyD")) {
      x += 1;
    }
    if (this.keys.has("ArrowUp") || this.keys.has("KeyW")) {
      y -= 1;
    }
    if (this.keys.has("ArrowDown") || this.keys.has("KeyS")) {
      y += 1;
    }

    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }

    return { x, y };
  }

  handleKeyDown(event) {
    const targetTag = event.target?.tagName;
    if (targetTag === "INPUT" || targetTag === "TEXTAREA") {
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      this.onMenu?.();
      return;
    }

    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) {
        this.onJump?.();
      }
      return;
    }

    if (event.code === "Home") {
      event.preventDefault();
      this.onRecenter?.();
      return;
    }

    if (event.code === "KeyC") {
      event.preventDefault();
      this.onCraft?.();
      return;
    }

    if (event.code === "KeyL") {
      event.preventDefault();
      this.onRecipes?.();
      return;
    }

    if (event.code === "KeyJ") {
      event.preventDefault();
      this.onQuest?.();
      return;
    }

    if (event.code === "KeyK") {
      event.preventDefault();
      if (!event.repeat) {
        this.onBirds?.();
      }
      return;
    }

    if (event.code === "KeyG") {
      event.preventDefault();
      if (!event.repeat) {
        this.onMap?.();
      }
      return;
    }

    if (event.code === "KeyF") {
      event.preventDefault();
      this.onPlace?.();
      return;
    }

    const hotbarMatch = /^(?:Digit|Numpad)([1-9])$/.exec(event.code);
    if (hotbarMatch) {
      event.preventDefault();
      this.onHotbar?.(Number(hotbarMatch[1]));
      return;
    }

    if (event.code === "KeyE") {
      event.preventDefault();
      if (event.shiftKey) {
        this.onUseSelected?.();
      } else if (!event.repeat) {
        this.onRotateRight?.();
      }
      return;
    }

    if (event.code === "KeyQ") {
      event.preventDefault();
      if (event.shiftKey) {
        this.onDropSelected?.(event.ctrlKey);
      } else if (!event.repeat) {
        this.onRotateLeft?.();
      }
      return;
    }

    if (event.code === "KeyR") {
      event.preventDefault();
      this.onAttack?.();
      return;
    }

    if (event.code === "KeyM") {
      event.preventDefault();
      if (!event.repeat) {
        this.onGameMode?.();
      }
      return;
    }

    if (event.code === "KeyV") {
      event.preventDefault();
      if (!event.repeat) {
        this.onFief?.();
      }
      return;
    }

    if (!MOVE_KEYS.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.keys.add(event.code);
  }

  handleKeyUp(event) {
    if (MOVE_KEYS.has(event.code)) {
      event.preventDefault();
      this.keys.delete(event.code);
    }
  }

  handleBlur() {
    this.keys.clear();
    this.touchX = 0;
    this.touchY = 0;
    this.resetPointer();
    this.onHoverEnd?.();
    this.canvas.classList.remove("is-dragging");
  }

  handlePointerDown(event) {
    if (event.button === 2) {
      this.emitRightClick(event);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    this.pointerDown = true;
    this.dragging = false;
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.downTime = performance.now();
    this.canvas.setPointerCapture(event.pointerId);
  }

  handlePointerMove(event) {
    if (!this.pointerDown || event.pointerId !== this.pointerId) {
      if (event.pointerType !== "touch") {
        this.emitHover(event);
      }
      return;
    }

    const deltaX = event.clientX - this.lastX;
    const deltaY = event.clientY - this.lastY;
    const distance = Math.hypot(event.clientX - this.startX, event.clientY - this.startY);

    if (!this.dragging && distance > DRAG_THRESHOLD) {
      this.dragging = true;
      const rect = this.canvas.getBoundingClientRect();
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      this.dragPaints = this.onDragStart?.(localX, localY, event) === true;

      if (this.dragPaints) {
        this.onHoverEnd?.();
      } else {
        this.onCameraPan?.();
        this.canvas.classList.add("is-dragging");
      }
    }

    if (this.dragging) {
      if (this.dragPaints) {
        const rect = this.canvas.getBoundingClientRect();
        this.onDragMove?.(
          event.clientX - rect.left,
          event.clientY - rect.top,
          event,
        );
      } else {
        this.camera.panScreen(deltaX, deltaY);
      }
    } else if (event.pointerType !== "touch") {
      this.emitHover(event);
    }

    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  handlePointerUp(event) {
    if (!this.pointerDown || event.pointerId !== this.pointerId) {
      return;
    }

    const duration = performance.now() - this.downTime;
    const distance = Math.hypot(event.clientX - this.startX, event.clientY - this.startY);
    const shouldClick = !this.dragging && duration <= CLICK_DURATION && distance <= DRAG_THRESHOLD;
    const wasDragging = this.dragging;
    const dragPaints = this.dragPaints;
    const rect = this.canvas.getBoundingClientRect();

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.resetPointer();
    this.canvas.classList.remove("is-dragging");

    if (wasDragging && dragPaints) {
      this.onDragEnd?.(
        event.clientX - rect.left,
        event.clientY - rect.top,
        event,
      );
    }

    if (shouldClick) {
      this.emitClick(event);
    }
  }

  handlePointerCancel(event) {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    this.resetPointer();
    this.onHoverEnd?.();
    this.canvas.classList.remove("is-dragging");
  }

  handlePointerLeave() {
    if (this.pointerDown || this.dragging) {
      return;
    }

    this.onHoverEnd?.();
  }

  handleWheel(event) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    const factor = Math.exp(-delta * 0.0012);

    this.camera.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
  }

  handleContextMenu(event) {
    event.preventDefault();
  }

  emitHover(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.onHover?.(event.clientX - rect.left, event.clientY - rect.top);
  }

  emitClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.onClick?.(
      event.clientX - rect.left,
      event.clientY - rect.top,
      event.shiftKey === true,
    );
  }

  emitRightClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.onRightClick?.(event.clientX - rect.left, event.clientY - rect.top);
  }

  resetPointer() {
    this.pointerDown = false;
    this.dragging = false;
    this.dragPaints = false;
    this.pointerId = null;
  }
}
