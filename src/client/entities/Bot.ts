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
    private hitParticles: THREE.Points[] = [];

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
            attack: new Audio(''),
            death: new Audio('src/client/sounds/zombie-moan-44932.mp3')
        };

        // Configure sounds
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.4;
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
            color: 0x52c94c, //0x2a5c45, 
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
        
        // Update and remove old hit particles
        this.hitParticles = this.hitParticles.filter(particles => {
            const userData = particles.userData;
            if (userData && userData.lifetime) {
                userData.lifetime -= 1;
                
                // Scale down the particles as they age
                if (userData.lifetime < 8) {
                    particles.scale.multiplyScalar(0.4);
                }
                
                if (userData.lifetime <= 0) {
                    this.scene?.remove(particles);
                    return false;
                }
                return true;
            }
            return false;
        });
    }

    private attackPlayer(): void {
        if (this.player) {
            // Play attack sound
            const attackSound = this.sounds.attack.cloneNode() as HTMLAudioElement;
            attackSound.play();
            
            // Player now takes 10 damage per attack (10% of health)
            this.player.takeDamage(10);
        }
    }

    public takeDamage(amount: number, hitPoint?: THREE.Vector3): void {
        this.health -= amount;
        
        // Create hit effect at the impact point
        if (hitPoint && this.scene) {
            this.createHitEffect(hitPoint);
        }
        
        if (this.health <= 0 && this.isAlive) {
            this.die();
        }
    }
    
    private createHitEffect(position: THREE.Vector3): void {
        if (!this.scene) return;
        
        // Create particles for the hit effect
        const particleCount = 10;
        const particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        
        // Set up the particle colors (red/orange for blood splatter)
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position within a small radius of the hit point
            particlePositions[i3] = position.x + (Math.random() - 0.5) * 0.2;
            particlePositions[i3 + 1] = position.y + (Math.random() - 0.5) * 0.2;
            particlePositions[i3 + 2] = position.z + (Math.random() - 0.5) * 0.2;
            
            // Red/orange color for blood effect
            particleColors[i3] = 0.8 + Math.random() * 0.2; // Red
            particleColors[i3 + 1] = Math.random() * 0.3; // Green
            particleColors[i3 + 2] = Math.random() * 0.1; // Blue
        }
        
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending
        });
        
        const particles = new THREE.Points(particleGeometry, particleMaterial);
        particles.userData = { lifetime: 5 }; // Particle effect lifetime in frames
        
        this.scene.add(particles);
        this.hitParticles.push(particles);
    }

    private die(): void {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        
        // Play death sound
        const deathSound = this.sounds.death.cloneNode() as HTMLAudioElement;
        deathSound.play();

        if (this.scene) {
            // Create explosion effect
            this.createExplosionEffect();
            
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
    
    private createExplosionEffect(): void {
        if (!this.scene) return;
        
        // Create a large particle explosion
        const particleCount = 8;
        const explosionGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(particleCount * 3);
        const particleColors = new Float32Array(particleCount * 3);
        const particleSizes = new Float32Array(particleCount);
        
        // Set up the particle colors (red/yellow/orange for explosion)
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.5;
            const height = Math.random() * 0.5;
            
            // Distribute particles in a sphere around the zombie
            particlePositions[i3] = this.position.x + Math.cos(angle) * radius;
            particlePositions[i3 + 1] = this.position.y + 1 + height;
            particlePositions[i3 + 2] = this.position.z + Math.sin(angle) * radius;
            
            // Mix of red, orange, and yellow for explosion
            const colorChoice = Math.random();
            if (colorChoice < 0.4) { // Red
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 0.1 + Math.random() * 0.2;
                particleColors[i3 + 2] = 0.1;
            } else if (colorChoice < 0.7) { // Orange
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 0.4 + Math.random() * 0.3;
                particleColors[i3 + 2] = 0.1;
            } else { // Yellow
                particleColors[i3] = 1.0;
                particleColors[i3 + 1] = 0.8 + Math.random() * 0.2;
                particleColors[i3 + 2] = 0.1 + Math.random() * 0.2;
            }
            
            // Random particle sizes
            particleSizes[i] = 0.05 + Math.random() * 0.1;
        }
        
        explosionGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        explosionGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
        explosionGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));
        
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        
        const explosion = new THREE.Points(explosionGeometry, particleMaterial);
        explosion.userData = { lifetime: 3}; // Explosion effect lifetime in frames
        
        // Add a point light for the explosion flash
        const explosionLight = new THREE.PointLight(0xff5500, 3, 3);
        explosionLight.position.copy(this.position);
        explosionLight.position.y += 1;
        this.scene.add(explosionLight);
        
        // Fade out the explosion light
        const fadeLight = () => {
            explosionLight.intensity -= 0.2;
            if (explosionLight.intensity > 0) {
                requestAnimationFrame(fadeLight);
            } else {
                this.scene?.remove(explosionLight);
            }
        };
        fadeLight();
        
        this.scene.add(explosion);
        this.hitParticles.push(explosion);
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