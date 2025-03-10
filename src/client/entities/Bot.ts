import * as THREE from 'three';
import { Player } from './Player';

export class Bot {
    private position: THREE.Vector3;
    private model: THREE.Group;
    private player: Player | null;
    private scene: THREE.Scene | null;
    private health: number;
    private maxHealth: number;
    private isAlive: boolean;
    private moveSpeed: number;
    private sounds: {
        growl: HTMLAudioElement;
        attack: HTMLAudioElement;
        death: HTMLAudioElement;
    };
    private lastGrowlTime: number = 0;
    private growlInterval: number = 5000; // 5 seconds between growls
    private lastAttackTime: number = 0;
    private attackCooldown: number = 1000; // 1 second between attacks
    private hitParticles: THREE.Points[] = [];
    private static particleGeometry: THREE.BufferGeometry | null = null;
    private static particleMaterial: THREE.PointsMaterial | null = null;
    private healthBar: THREE.Mesh | null = null;
    private healthBarBackground: THREE.Mesh | null = null;
    private wave: number;
    private damageMultiplier: number;
    private sizeMultiplier: number;
    private camera: THREE.Camera | null = null;
    private lastUpdateTime: number = 0;
    private readonly UPDATE_INTERVAL: number = 32; // Update at ~30fps instead of every frame

    constructor(position: THREE.Vector3, wave: number = 1) {
        this.position = position;
        this.model = new THREE.Group();
        this.player = null;
        this.scene = null;
        this.wave = wave;
        this.maxHealth = wave === 3 ? 200 : 100; // Wave 3 zombies have more health
        this.health = this.maxHealth;
        this.isAlive = true;
        this.moveSpeed = 0.05;
        this.damageMultiplier = wave === 3 ? 0.2 : 0.5; // Wave 3 zombies take less damage
        this.sizeMultiplier = wave === 3 ? 1.5 : 1.0; // Wave 3 zombies are larger

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

        // Initialize shared particle resources
        if (!Bot.particleGeometry || !Bot.particleMaterial) {
            Bot.initializeParticleResources();
        }

        // Create health bar
        this.createHealthBar();
    }

    private createHealthBar(): void {
        // Create background bar (red)
        const backgroundGeometry = new THREE.PlaneGeometry(1, 0.1);
        const backgroundMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        
        // Create foreground bar (green)
        const foregroundGeometry = new THREE.PlaneGeometry(1, 0.1);
        const foregroundMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        this.healthBar = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
        
        // Position health bars above the bot
        this.healthBarBackground.position.y = 2.5;
        this.healthBar.position.y = 2.5;
        
        // Add to model
        this.model.add(this.healthBarBackground);
        this.model.add(this.healthBar);
    }

    private updateHealthBar(): void {
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.scale.x = Math.max(0, healthPercent);
            // Center the health bar
            this.healthBar.position.x = -0.5 * (1 - healthPercent);
        }
    }

    private static initializeParticleResources(): void {
        // Minimal particle system
        Bot.particleGeometry = new THREE.BufferGeometry();
        const particlePositions = new Float32Array(6); // Only 2 particles
        const particleColors = new Float32Array(6);
        
        for (let i = 0; i < 2; i++) {
            const i3 = i * 3;
            particleColors[i3] = 1.0; // Red
            particleColors[i3 + 1] = 0.2; // Green
            particleColors[i3 + 2] = 0.0; // Blue
        }
        
        Bot.particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        Bot.particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));

        Bot.particleMaterial = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    public initialize(scene: THREE.Scene, player: Player): void {
        this.scene = scene;
        this.player = player;
        this.camera = scene.children.find(child => child instanceof THREE.Camera) as THREE.Camera || null;
        this.createModel();
        scene.add(this.model);

        // Set bot reference in the model for raycasting
        this.model.userData.isBot = true;
        this.model.userData.botInstance = this;
    }

    private createModel(): void {
        // Extremely simplified geometry
        const bodyGeometry = new THREE.CylinderGeometry(
            0.3 * this.sizeMultiplier, 
            0.3 * this.sizeMultiplier, 
            1.5 * this.sizeMultiplier, 
            3 // Minimum segments
        );
        const bodyMaterial = new THREE.MeshBasicMaterial({ // Changed to Basic material
            color: this.wave === 3 ? 0x8B0000 : 0x2a5c45
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.75 * this.sizeMultiplier;
        body.castShadow = false; // Disable shadows completely
        body.receiveShadow = false;

        // Simplified head
        const headGeometry = new THREE.SphereGeometry(
            0.25 * this.sizeMultiplier, 
            3, // Minimum segments
            3
        );
        const headMaterial = new THREE.MeshBasicMaterial({ 
            color: this.wave === 3 ? 0x8B0000 : 0x2a5c45
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 1.7 * this.sizeMultiplier;
        head.castShadow = false;
        head.receiveShadow = false;

        // Simplified eyes
        const eyeGeometry = new THREE.SphereGeometry(0.05 * this.sizeMultiplier, 2, 2);
        const eyeMaterial = new THREE.MeshBasicMaterial({ 
            color: this.wave === 3 ? 0xff0000 : 0xcc0000
        });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(
            -0.1 * this.sizeMultiplier, 
            1.7 * this.sizeMultiplier, 
            0.2 * this.sizeMultiplier
        );

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(
            0.1 * this.sizeMultiplier, 
            1.7 * this.sizeMultiplier, 
            0.2 * this.sizeMultiplier
        );

        // Simplified health bar
        const healthBarGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            depthTest: false,
            transparent: true,
            opacity: 0.8
        });
        this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        
        const healthBarBackgroundGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarBackgroundMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000,
            depthTest: false,
            transparent: true,
            opacity: 0.6
        });
        this.healthBarBackground = new THREE.Mesh(healthBarBackgroundGeometry, healthBarBackgroundMaterial);
        
        this.healthBarBackground.position.y = 2.5;
        this.healthBar.position.y = 2.5;
        
        this.model.add(body, head, leftEye, rightEye, this.healthBarBackground, this.healthBar);
        this.model.position.copy(this.position);
    }

    public update(): void {
        if (!this.isAlive || !this.player || !this.scene) return;

        const now = Date.now();
        if (now - this.lastUpdateTime < this.UPDATE_INTERVAL) return;
        this.lastUpdateTime = now;

        // Update health bar to face camera
        if (this.healthBar && this.healthBarBackground && this.camera) {
            const cameraPos = this.camera.position;
            const direction = new THREE.Vector3().subVectors(cameraPos, this.model.position).normalize();
            this.healthBar.lookAt(cameraPos);
            this.healthBarBackground.lookAt(cameraPos);
        }

        // Get direction to player
        const playerPos = this.player.getPosition();
        const direction = new THREE.Vector3()
            .subVectors(playerPos, this.position)
            .normalize();

        // Move towards player
        this.position.addScaledVector(direction, this.moveSpeed);
        this.model.position.copy(this.position);

        // Look at player
        this.model.lookAt(playerPos);

        // Play growl sound at intervals
        if (now - this.lastGrowlTime >= this.growlInterval) {
            const distanceToPlayer = this.position.distanceTo(playerPos);
            if (distanceToPlayer < 20) {
                const growlSound = this.sounds.growl.cloneNode() as HTMLAudioElement;
                growlSound.volume = Math.min(0.2, 0.3 / (distanceToPlayer / 10)); // Reduced volume
                growlSound.play();
                this.lastGrowlTime = now;
            }
        }

        // Check for collision with player
        const distanceToPlayer = this.position.distanceTo(playerPos);
        if (distanceToPlayer < 1.5 && now - this.lastAttackTime >= this.attackCooldown) {
            this.attackPlayer();
            this.lastAttackTime = now;
        }

        // Update hit particles with improved performance
        for (let i = this.hitParticles.length - 1; i >= 0; i--) {
            const particles = this.hitParticles[i];
            const userData = particles.userData;
            if (userData && userData.lifetime) {
                userData.lifetime -= 1;
                particles.position.y += 0.02;
                
                if (userData.lifetime <= 0) {
                    this.scene.remove(particles);
                    this.hitParticles.splice(i, 1);
                }
            }
        }
    }

    private attackPlayer(): void {
        if (this.player) {
            // Play attack sound
            const attackSound = this.sounds.attack.cloneNode() as HTMLAudioElement;
            attackSound.volume = 0.3;
            attackSound.play();
            
            this.player.takeDamage(25); // 25% damage per hit
        }
    }

    public takeDamage(amount: number, hitPoint?: THREE.Vector3): void {
        const actualDamage = 25; // Fixed 25% damage per hit
        this.health -= actualDamage;
        
        // Update health bar
        this.updateHealthBar();
        
        // Create hit effect at the impact point
        if (hitPoint && this.scene && Bot.particleGeometry && Bot.particleMaterial) {
            this.createHitEffect(hitPoint);
        }
        
        if (this.health <= 0 && this.isAlive) {
            this.die();
        }
    }

    private createHitEffect(position: THREE.Vector3): void {
        if (!this.scene || !Bot.particleGeometry || !Bot.particleMaterial) return;
        
        // Clone the shared geometry for this hit effect
        const particleGeometry = Bot.particleGeometry.clone();
        const positions = particleGeometry.attributes.position.array as Float32Array;
        
        // Update particle positions
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] = position.x + (Math.random() - 0.5) * 0.2;
            positions[i + 1] = position.y + (Math.random() - 0.5) * 0.2;
            positions[i + 2] = position.z + (Math.random() - 0.5) * 0.2;
        }
        
        particleGeometry.attributes.position.needsUpdate = true;
        
        const particles = new THREE.Points(particleGeometry, Bot.particleMaterial);
        particles.userData = { lifetime: 20 }; // Increased lifetime for better effect
        
        this.scene.add(particles);
        this.hitParticles.push(particles);
    }

    private die(): void {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        
        // Play death sound
        const deathSound = this.sounds.death.cloneNode() as HTMLAudioElement;
        deathSound.volume = 0.3;
        deathSound.play();

        if (this.scene) {
            // Create death effect with explosion animation
            this.createDeathEffect();
            
            // Remove from scene after death animation
            setTimeout(() => {
                if (this.scene && this.model) {
                    this.scene.remove(this.model);
                }
            }, 1000);
        }

        if (this.player) {
            this.player.addScore(20);
        }
    }

    private createDeathEffect(): void {
        if (!this.scene || !this.model) return;

        // Simplified death effect
        const particleCount = 6; // Reduced particles
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const velocities: THREE.Vector3[] = [];

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 0.5;

            positions[i3] = Math.cos(angle) * radius;
            positions[i3 + 1] = Math.random() * 2;
            positions[i3 + 2] = Math.sin(angle) * radius;

            colors[i3] = 1.0; // Red
            colors[i3 + 1] = 0.2; // Green
            colors[i3 + 2] = 0; // Blue

            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 0.2,
                Math.random() * 0.2,
                (Math.random() - 0.5) * 0.2
            ));
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            depthWrite: false
        });

        const particles = new THREE.Points(geometry, material);
        particles.position.copy(this.model.position);
        this.scene.add(particles);

        // Simplified animation
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed > 500) { // Reduced animation time
                this.scene?.remove(particles);
                return;
            }

            const positions = geometry.attributes.position.array as Float32Array;
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                positions[i3] += velocities[i].x;
                positions[i3 + 1] += velocities[i].y;
                positions[i3 + 2] += velocities[i].z;
                velocities[i].y -= 0.01;
            }
            geometry.attributes.position.needsUpdate = true;
            material.opacity = 1 - (elapsed / 500);

            requestAnimationFrame(animate);
        };
        animate();
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