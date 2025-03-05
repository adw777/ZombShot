import * as THREE from 'three';

declare global {
    interface Window {
        keyStates: { [key: string]: boolean };
    }
}

export class Player {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private moveSpeed: number = 0.1;
    private sprintSpeed: number = 0.15;
    private currentSpeed: number = this.moveSpeed;
    private position: THREE.Vector3;
    private velocity: THREE.Vector3;
    private health: number;
    private score: number;
    private healthChangeCallback: ((health: number) => void) | null;
    private scoreChangeCallback: ((score: number) => void) | null;
    private isThirdPerson: boolean = false;
    private model: THREE.Group;
    private gunModel: THREE.Group;
    private torchLight: THREE.SpotLight;
    private mouseSensitivity: number = 0.002;
    private yaw: number = 0;
    private pitch: number = 0;
    private isShooting: boolean = false;
    private lastShootTime: number = 0;
    private shootCooldown: number = 250; // milliseconds between shots
    private muzzleFlash: THREE.PointLight;
    private muzzleFlashMesh: THREE.Mesh; // Added mesh for visual effect
    private sounds: {
        gunshot: HTMLAudioElement;
        playerHit: HTMLAudioElement;
        victory: HTMLAudioElement;
        defeat: HTMLAudioElement;
    };

    constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
        this.scene = scene;
        this.camera = camera;
        this.position = new THREE.Vector3(0, 2, 0);
        this.velocity = new THREE.Vector3();
        this.health = 100;
        this.score = 0;
        this.healthChangeCallback = null;
        this.scoreChangeCallback = null;

        // Initialize model and components
        this.model = new THREE.Group();
        this.gunModel = new THREE.Group();
        this.torchLight = new THREE.SpotLight(0xffffaa, 1, 10);
        
        // Enhanced muzzle flash
        this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 3);
        
        // Create muzzle flash mesh for visual effect
        const muzzleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const muzzleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00,
            transparent: true,
            opacity: 0
        });
        this.muzzleFlashMesh = new THREE.Mesh(muzzleGeometry, muzzleMaterial);

        // Create player model and components
        this.createGunModel();
        this.createPlayerModel();
        this.scene.add(this.model);

        // Initialize key states
        window.keyStates = {};

        // Initialize sounds
        this.sounds = {
            gunshot: new Audio('src/client/sounds/gun-shot-1-176892.mp3'),
            playerHit: new Audio('src/client/sounds/young-man-being-hurt-95628.mp3'),
            victory: new Audio('src/client/sounds/tvoff (mp3cut.net).mp3'),
            defeat: new Audio('src/client/sounds/notlikeus.mp3')
        };

        // Configure sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.6;
        });

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    private createGunModel(): void {
        // Gun body
        const bodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

        // Gun handle
        const handleGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.08);
        const handleMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222222,
            metalness: 0.5,
            roughness: 0.5
        });
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.y = -0.15;
        handle.position.z = 0.05;

        // Gun barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const barrelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.2
        });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = 0.2;

        // Muzzle flash position
        this.muzzleFlash.position.set(0, 0, 0.4);
        this.muzzleFlashMesh.position.set(0, 0, 0.41);
        
        // Add all components to the gun model
        this.gunModel.add(body, handle, barrel, this.muzzleFlash, this.muzzleFlashMesh);
        this.gunModel.position.set(0.25, 1.2, -0.3);
    }

    private handleKeyDown(event: KeyboardEvent): void {
        window.keyStates[event.code] = true;
        if (event.code === 'KeyC') {
            this.toggleCameraView();
        }
    }

    private handleKeyUp(event: KeyboardEvent): void {
        window.keyStates[event.code] = false;
    }

    private handleMouseMove(event: MouseEvent): void {
        if (document.pointerLockElement) {
            this.yaw -= event.movementX * this.mouseSensitivity;
            this.pitch -= event.movementY * this.mouseSensitivity;
            
            // Clamp pitch to prevent over-rotation
            this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
            
            // Update camera rotation
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.x = this.pitch;
            this.camera.rotation.y = this.yaw;
        }
    }

    private handleMouseDown(event: MouseEvent): void {
        if (event.button === 0 && document.pointerLockElement) { // Left click
            this.shoot();
        }
    }

    private handleMouseUp(event: MouseEvent): void {
        if (event.button === 0) {
            this.isShooting = false;
        }
    }

    private createPlayerModel(): void {
        // Create player body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2266cc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        this.model.add(body);

        // Add gun model
        this.gunModel.position.set(0.25, 1.2, -0.3);
        this.model.add(this.gunModel);

        // Setup torch light
        this.torchLight.position.set(0.25, 1.2, -0.3);
        this.torchLight.target.position.set(0.25, 1.2, -1);
        this.model.add(this.torchLight);
        this.model.add(this.torchLight.target);
    }

    private toggleCameraView(): void {
        this.isThirdPerson = !this.isThirdPerson;
        this.updateCameraPosition();
    }

    private updateCameraPosition(): void {
        if (this.isThirdPerson) {
            const offset = new THREE.Vector3(0, 3, 4);
            offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
            this.camera.position.copy(this.position).add(offset);
            this.camera.lookAt(this.position);
        } else {
            this.camera.position.copy(this.position);
            this.camera.position.y += 1.6; // Eye level
        }
    }

    public update(): void {
        const moveDirection = new THREE.Vector3();
        
        if (window.keyStates['KeyW']) moveDirection.z -= 1;
        if (window.keyStates['KeyS']) moveDirection.z += 1;
        if (window.keyStates['KeyA']) moveDirection.x -= 1;
        if (window.keyStates['KeyD']) moveDirection.x += 1;

        // Normalize movement direction
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }

        // Apply camera rotation to movement
        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

        // Update sprint state
        this.currentSpeed = window.keyStates['ShiftLeft'] ? this.sprintSpeed : this.moveSpeed;

        // Apply movement
        this.position.add(moveDirection.multiplyScalar(this.currentSpeed));

        // Update camera and model positions
        this.updateCameraPosition();

        // Update player model position and rotation
        this.model.position.copy(this.position);
        this.model.rotation.y = this.yaw;

        // Update torch light direction
        const torchDirection = new THREE.Vector3(0, 0, -1);
        torchDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        this.torchLight.target.position.copy(this.position).add(torchDirection);
    }

    public getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    public takeDamage(amount: number): void {
        
        // const actualDamage = amount * 0.1; // Only 20% of damage taken
        // this.health = Math.max(0, this.health - actualDamage);

        // Now take full damage instead of 20%
        this.health = Math.max(0, this.health - amount);
        
        // Play hit sound
        if (this.sounds.playerHit.src) {
            this.sounds.playerHit.play();
        }

        if (this.healthChangeCallback) {
            this.healthChangeCallback(this.health);
        }
        if (this.health <= 0) {
            this.die();
        }
    }

    public addScore(points: number): void {
        this.score += points;
        if (this.scoreChangeCallback) {
            this.scoreChangeCallback(this.score);
        }
        if (this.score >= 150) { // Updated to 150 points to win
            this.win();
        }
    }

    private die(): void {
        this.sounds.defeat.play();
        document.exitPointerLock();
        this.showEndScreen(false);
    }

    private win(): void {
        this.sounds.victory.play();
        document.exitPointerLock();
        this.showEndScreen(true);
    }

    private showEndScreen(victory: boolean): void {
        const endScreen = document.createElement('div');
        endScreen.style.position = 'fixed';
        endScreen.style.top = '50%';
        endScreen.style.left = '50%';
        endScreen.style.transform = 'translate(-50%, -50%)';
        endScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        endScreen.style.padding = '40px';
        endScreen.style.borderRadius = '10px';
        endScreen.style.textAlign = 'center';
        endScreen.style.color = victory ? '#00ff00' : '#ff0000';
        endScreen.style.zIndex = '1000';

        const message = victory ? 'U WON IT BOSS!' : 'U LOOSE SUCKER!';
        endScreen.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">${message}</h1>
            <p style="font-size: 24px; margin-bottom: 20px;">Final Score: ${this.score}</p>
            <button onclick="location.reload()" style="
                padding: 15px 30px;
                font-size: 18px;
                background-color: ${victory ? '#00ff00' : '#ff0000'};
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;">
                Play Again
            </button>
        `;

        document.body.appendChild(endScreen);
    }

    public onHealthChange(callback: (health: number) => void): void {
        this.healthChangeCallback = callback;
    }

    public onScoreChange(callback: (score: number) => void): void {
        this.scoreChangeCallback = callback;
    }

    private shoot(): void {
        const now = Date.now();
        if (now - this.lastShootTime < this.shootCooldown) return;

        this.lastShootTime = now;
        this.isShooting = true;

        // Play gunshot sound
        const gunshotSound = this.sounds.gunshot.cloneNode() as HTMLAudioElement;
        gunshotSound.play();

        // Enhanced muzzle flash effect
        this.muzzleFlash.intensity = 3; // Brighter flash
        // this.muzzleFlashMesh.material.opacity = 1;
        this.muzzleFlashMesh.scale.set(1, 1, 0.5); // Elongated flash

        // Gun recoil animation
        const originalPosition = this.gunModel.position.clone();
        this.gunModel.position.z += 0.1;
        
        // Reset flash effect
        setTimeout(() => {
            this.muzzleFlash.intensity = 0;
            // this.muzzleFlashMesh.material.opacity = 0;
        }, 50);
        
        // Reset gun position
        setTimeout(() => {
            this.gunModel.position.copy(originalPosition);
        }, 50);

        // Raycaster for hit detection
        const raycaster = new THREE.Raycaster();
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        raycaster.set(this.camera.position, direction);

        // Get all intersected objects
        const intersects = raycaster.intersectObjects(this.scene.children, true);
        
        for (const intersect of intersects) {
            const object = intersect.object;
            // Check if we hit a bot
            let currentObj: THREE.Object3D | null = object;
            while (currentObj) {
                if (currentObj.userData.isBot) {
                    const bot = currentObj.userData.botInstance;
                    if (bot && bot.getIsAlive()) {
                        bot.takeDamage(20, intersect.point);
                        this.addScore(10); // Add 10 points for killing a zombie
                        break;
                    }
                }
                currentObj = currentObj.parent;
            }
        }
    }
}