import * as THREE from 'three';

declare global {
    interface Window {
        keyStates: { [key: string]: boolean };
    }
}

export class Player {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private moveSpeed: number = 0.15; // Increased for better responsiveness
    private sprintSpeed: number = 0.25;
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
    private shootCooldown: number = 200; // Reduced for better responsiveness
    private muzzleFlash: THREE.PointLight;
    private bullets: THREE.Mesh[] = [];
    private bulletSpeed: number = 1.5;
    private sounds: {
        gunshot: HTMLAudioElement;
        playerHit: HTMLAudioElement;
        victory: HTMLAudioElement;
        defeat: HTMLAudioElement;
        healthPickup: HTMLAudioElement;
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
        this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 3);

        // Create player model and components
        this.createPlayerModel();
        this.createGunModel();
        this.scene.add(this.model);

        // Initialize key states
        window.keyStates = {};

        // Initialize sounds
        this.sounds = {
            gunshot: new Audio('src/client/sounds/gun-shot-1-176892.mp3'),
            playerHit: new Audio('src/client/sounds/young-man-being-hurt-95628.mp3'),
            victory: new Audio('src/client/sounds/tvoff (mp3cut.net).mp3'),
            defeat: new Audio('src/client/sounds/notlikeus.mp3'),
            healthPickup: new Audio('src/client/sounds/one_beep-99630.mp3')
        };

        // Configure sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
        });

        // Add event listeners
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }

    private createPlayerModel(): void {
        // Create player body
        const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.25, 1.5, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a6f8c });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;

        // Create head
        const headGeometry = new THREE.SphereGeometry(0.25, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xd4b08c });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.6;

        // Create arms
        const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8);
        const armMaterial = new THREE.MeshStandardMaterial({ color: 0x4a6f8c });
        
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.35, 1.2, 0);
        leftArm.rotation.z = -Math.PI / 6;
        
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.35, 1.2, 0);
        rightArm.rotation.z = Math.PI / 6;

        // Create legs
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.7, 8);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x2c4052 });
        
        const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
        leftLeg.position.set(-0.15, 0.35, 0);
        
        const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
        rightLeg.position.set(0.15, 0.35, 0);

        this.model.add(body, head, leftArm, rightArm, leftLeg, rightLeg);
        this.model.castShadow = true;
        this.model.receiveShadow = true;
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
        
        // Add all components to the gun model
        this.gunModel.add(body, handle, barrel, this.muzzleFlash);
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

    private createBullet(): THREE.Mesh {
        const bulletGeometry = new THREE.SphereGeometry(0.05, 3, 2); // Minimal segments
        const bulletMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff9933
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Simplified bullet light
        const bulletLight = new THREE.PointLight(0xff6600, 0.5, 1);
        bullet.add(bulletLight);
        
        return bullet;
    }

    private shoot(): void {
        const now = Date.now();
        if (now - this.lastShootTime < this.shootCooldown) return;

        this.lastShootTime = now;
        this.isShooting = true;

        // Play gunshot sound
        const gunshotSound = this.sounds.gunshot.cloneNode() as HTMLAudioElement;
        gunshotSound.volume = 0.15; // Further reduced volume
        gunshotSound.play();

        // Muzzle flash effect
        this.muzzleFlash.intensity = 1.5;
        setTimeout(() => {
            this.muzzleFlash.intensity = 0;
        }, 50);

        // Create and position bullet
        const bullet = this.createBullet();
        const bulletStartPos = new THREE.Vector3();
        this.gunModel.getWorldPosition(bulletStartPos);
        bullet.position.copy(bulletStartPos);

        // Set bullet direction based on camera
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyQuaternion(this.camera.quaternion);
        
        // Store direction in bullet for update
        bullet.userData.direction = direction;
        bullet.userData.distanceTraveled = 0;
        bullet.userData.maxDistance = 40; // Further reduced max distance
        bullet.userData.startTime = now;

        this.scene.add(bullet);
        this.bullets.push(bullet);

        // Gun recoil animation
        const originalPosition = this.gunModel.position.clone();
        this.gunModel.position.z += 0.1;
        setTimeout(() => {
            this.gunModel.position.copy(originalPosition);
        }, 50);
    }

    private lastBulletUpdateTime: number = 0;
    private readonly BULLET_UPDATE_INTERVAL: number = 16; // ~60fps for bullets

    public update(): void {
        // Update player movement
        const moveDirection = new THREE.Vector3();
        
        if (window.keyStates['KeyW']) moveDirection.z -= 1;
        if (window.keyStates['KeyS']) moveDirection.z += 1;
        if (window.keyStates['KeyA']) moveDirection.x -= 1;
        if (window.keyStates['KeyD']) moveDirection.x += 1;

        if (moveDirection.length() > 0) {
            moveDirection.normalize();
        }

        moveDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        this.currentSpeed = window.keyStates['ShiftLeft'] ? this.sprintSpeed : this.moveSpeed;
        this.position.add(moveDirection.multiplyScalar(this.currentSpeed));

        // Update camera and model positions
        this.updateCameraPosition();
        this.model.position.copy(this.position);
        this.model.rotation.y = this.yaw;

        // Update bullets at fixed interval
        const now = Date.now();
        if (now - this.lastBulletUpdateTime >= this.BULLET_UPDATE_INTERVAL) {
            this.lastBulletUpdateTime = now;
            this.updateBullets(now);
        }

        // Update torch light direction
        const torchDirection = new THREE.Vector3(0, 0, -1);
        torchDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        this.torchLight.target.position.copy(this.position).add(torchDirection);
    }

    private updateBullets(now: number): void {
        const bulletSpeed = this.bulletSpeed;
        
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            const direction = bullet.userData.direction;
            
            // Calculate bullet movement with time-based interpolation
            const elapsed = now - bullet.userData.startTime;
            const movement = bulletSpeed * (elapsed / 16.67); // 60 FPS target
            
            // Move bullet
            bullet.position.add(direction.multiplyScalar(movement));
            bullet.userData.distanceTraveled += movement;

            // Check for collisions
            const raycaster = new THREE.Raycaster(bullet.position, direction);
            const intersects = raycaster.intersectObjects(this.scene.children, true);

            let hitBot = false;
            for (const intersect of intersects) {
                let currentObj: THREE.Object3D | null = intersect.object;
                while (currentObj) {
                    if (currentObj.userData && currentObj.userData.isBot) {
                        const bot = currentObj.userData.botInstance;
                        if (bot && bot.getIsAlive()) {
                            bot.takeDamage(25, intersect.point); // Fixed 25% damage
                            this.scene.remove(bullet);
                            this.bullets.splice(i, 1);
                            hitBot = true;
                            break;
                        }
                    }
                    currentObj = currentObj.parent;
                }
                if (hitBot) break;
            }

            // Remove bullet if it's traveled too far
            if (!hitBot && bullet.userData.distanceTraveled > bullet.userData.maxDistance) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
    }

    public getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    public takeDamage(amount: number): void {
        this.health = Math.max(0, this.health - 25); // 25% damage per hit
        
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

    public addHealth(amount: number): void {
        const oldHealth = this.health;
        this.health = Math.min(100, this.health + amount);
        
        if (this.health > oldHealth) {
            this.sounds.healthPickup.play();
        }
        
        if (this.healthChangeCallback) {
            this.healthChangeCallback(this.health);
        }
    }

    public getHealth(): number {
        return this.health;
    }

    public getSounds(): {
        gunshot: HTMLAudioElement;
        playerHit: HTMLAudioElement;
        victory: HTMLAudioElement;
        defeat: HTMLAudioElement;
        healthPickup: HTMLAudioElement;
    } {
        return this.sounds;
    }
}