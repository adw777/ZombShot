import * as THREE from 'three';
import { Player } from './entities/Player';
import { Bot } from './entities/Bot';
import { VoxelWorld } from './world/VoxelWorld';

export class Game {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private player: Player;
    private world: VoxelWorld;
    private bots: Bot[];
    private isGameRunning: boolean = false;

    constructor() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        
        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // Initialize player
        this.player = new Player(this.scene, this.camera);
        
        // Initialize world
        this.world = new VoxelWorld(this.scene);
        
        // Initialize bots array
        this.bots = [];

        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    private handleResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    public async start(): Promise<void> {
        this.isGameRunning = true;
        
        // Lock pointer for FPS controls
        this.renderer.domElement.requestPointerLock();

        // Start game loop
        this.gameLoop();
    }

    private gameLoop(): void {
        if (!this.isGameRunning) return;

        // Update player
        this.player.update();

        // Update bots
        this.bots.forEach(bot => bot.update());

        // Update world
        this.world.update();

        // Render scene
        this.renderer.render(this.scene, this.camera);

        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    }

    public stop(): void {
        this.isGameRunning = false;
        document.exitPointerLock();
    }

    public spawnBot(position: THREE.Vector3): void {
        const bot = new Bot(position);
        bot.initialize(this.scene, this.player);
        this.bots.push(bot);
    }

    public removeBot(bot: Bot): void {
        const index = this.bots.indexOf(bot);
        if (index > -1) {
            this.bots.splice(index, 1);
        }
    }
} 