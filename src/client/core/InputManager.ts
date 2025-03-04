export class InputManager {
  private keys: { [key: string]: boolean };
  private mousePosition: { x: number; y: number };
  private mouseSensitivity: number;
  private isMouseLocked: boolean;

  constructor() {
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.mouseSensitivity = 0.002;
    this.isMouseLocked = false;

    // Bind methods
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handlePointerLockChange = this.handlePointerLockChange.bind(this);
  }

  public initialize(): void {
    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
    document.addEventListener('click', this.requestPointerLock.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    this.keys[event.code] = true;

    // Prevent default behavior for game controls
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    this.keys[event.code] = false;
  }

  private handleMouseMove(event: MouseEvent): void {
    if (this.isMouseLocked) {
      this.mousePosition.x += event.movementX * this.mouseSensitivity;
      this.mousePosition.y += event.movementY * this.mouseSensitivity;

      // Clamp vertical rotation
      this.mousePosition.y = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, this.mousePosition.y)
      );
    }
  }

  private handlePointerLockChange(): void {
    this.isMouseLocked = document.pointerLockElement !== null;
  }

  private requestPointerLock(): void {
    if (!this.isMouseLocked) {
      document.body.requestPointerLock();
    }
  }

  public isKeyPressed(keyCode: string): boolean {
    return this.keys[keyCode] || false;
  }

  public getMouseDelta(): { x: number; y: number } {
    const delta = { ...this.mousePosition };
    this.mousePosition.x = 0;
    this.mousePosition.y = 0;
    return delta;
  }

  public setMouseSensitivity(sensitivity: number): void {
    this.mouseSensitivity = sensitivity;
  }

  public isPointerLocked(): boolean {
    return this.isMouseLocked;
  }

  public update(): void {
    // Handle continuous input processing here
    // For example, continuous movement while keys are held down
  }

  public cleanup(): void {
    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }
} 