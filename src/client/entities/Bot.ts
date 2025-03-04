import * as THREE from 'three';
import { Player } from './Player';

export class Bot {
    private position: THREE.Vector3;
    private model: THREE.Group;
    private player: Player | null;
    private scene: THREE.Scene | null;
    private health: number;
    private isAlive: boolean;
    private moveSpeed: number;
    private sounds: {
        growl: HTMLAudioElement;
        attack: HTMLAudioElement;
        death: HTMLAudioElement;
    };
    private lastGrowlTime: number = 0;
    private growlInterval: number = 5000; // 5 seconds between growls

    constructor(position: THREE.Vector3) {
        this.position = position;
        this.model = new THREE.Group();
        this.player = null;
        this.scene = null;
        this.health = 100;
        this.isAlive = true;
        this.moveSpeed = 0.05;

        // Initialize sounds
        this.sounds = {
            growl: new Audio('src/client/sounds/monster-growling-in-echo-192405.mp3'),
            attack: new Audio('src/client/sounds/zombie-attack-6419.mp3'),
            death: new Audio('src/client/sounds/zombie-moan-44932.mp3')
        };

        // Configure sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
        });
    }

    public initialize(scene: THREE.Scene, player: Player): void {
        this.scene = scene;
        this.player = player;
        this.createModel();
        scene.add(this.model);

        // Set bot reference in the model for raycasting
        this.model.userData.isBot = true;
        this.model.userData.botInstance = this;
    }

    private createModel(): void {
        // Create bot body
        const bodyGeometry = new THREE.BoxGeometry(0.5, 1.5, 0.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a5c45,
            roughness: 0.8,
            metalness: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75;
        body.castShadow = true;
        body.receiveShadow = true;

        // Create bot head
        const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x2a5c45,
            roughness: 0.7,
            metalness: 0.3
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.7;
        head.castShadow = true;

        // Add glowing eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05);
        const eyeMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.1, 1.7, 0.2);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.1, 1.7, 0.2);

        this.model.add(body, head, leftEye, rightEye);
        this.model.position.copy(this.position);
    }

    public update(): void {
        if (!this.isAlive || !this.player || !this.scene) return;

        // Get direction to player
        const playerPos = this.player.getPosition();
        const direction = new THREE.Vector3()
            .subVectors(playerPos, this.position)
            .normalize();

        // Move towards player
        this.position.add(direction.multiplyScalar(this.moveSpeed));
        this.model.position.copy(this.position);

        // Look at player
        this.model.lookAt(playerPos);

        // Play growl sound at intervals
        const now = Date.now();
        if (now - this.lastGrowlTime >= this.growlInterval) {
            const growlSound = this.sounds.growl.cloneNode() as HTMLAudioElement;
            growlSound.volume = Math.min(1.0, 0.3 / (this.position.distanceTo(playerPos) / 10));
            growlSound.play();
            this.lastGrowlTime = now;
        }

        // Check for collision with player
        const distanceToPlayer = this.position.distanceTo(playerPos);
        if (distanceToPlayer < 1) {
            this.attackPlayer();
        }
    }

    private attackPlayer(): void {
        if (this.player) {
            // Play attack sound
            const attackSound = this.sounds.attack.cloneNode() as HTMLAudioElement;
            attackSound.play();
            
            this.player.takeDamage(10); // Player will only take 20% of this (2 damage)
        }
    }

    public takeDamage(amount: number): void {
        this.health -= amount;
        if (this.health <= 0 && this.isAlive) {
            this.die();
        }
    }

    private die(): void {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        
        // Play death sound
        const deathSound = this.sounds.death.cloneNode() as HTMLAudioElement;
        deathSound.play();

        if (this.scene) {
            // Fade out effect
            const fadeOut = () => {
                if (!this.model) return;
                
                this.model.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const material = child.material as THREE.MeshStandardMaterial;
                        material.transparent = true;
                        material.opacity -= 0.1;
                    }
                });

                if (this.model.position.y > 0) {
                    this.model.position.y -= 0.1;
                    requestAnimationFrame(fadeOut);
                } else {
                    this.scene?.remove(this.model);
                }
            };

            fadeOut();
        }

        if (this.player) {
            this.player.addScore(10);
        }
    }

    public getModel(): THREE.Group {
        return this.model;
    }

    public getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    public getIsAlive(): boolean {
        return this.isAlive;
    }
} 