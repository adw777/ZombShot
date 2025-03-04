import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import Stats from 'stats.js';
import { VoxelWorld } from '../world/VoxelWorld';
import { Player } from '../entities/Player';
import { Bot } from '../entities/Bot';

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: PointerLockControls;
  private stats: Stats;
  private world: VoxelWorld;
  private player: Player;
  private healthChangeCallback: ((health: number) => void) | null;
  private isGameStarted: boolean;
  private instructionsVisible: boolean;
  private instructionsDiv: HTMLDivElement | null;
  private bots: Bot[];
  private maxBots: number;
  private lastBotSpawnTime: number;
  private botSpawnInterval: number;
  private spawnRadius: number;

  constructor() {
    // Initialize scene
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.stats = new Stats();
    
    // Initialize world and player after scene is created
    this.world = new VoxelWorld(this.scene);
    this.player = new Player(this.scene, this.camera);
    
    // Initialize controls
    this.controls = new PointerLockControls(this.camera, document.body);
    
    // Initialize other properties
    this.healthChangeCallback = null;
    this.isGameStarted = false;
    this.instructionsVisible = true;
    this.instructionsDiv = null;
    this.bots = [];
    this.maxBots = 10;
    this.lastBotSpawnTime = 0;
    this.botSpawnInterval = 2000;
    this.spawnRadius = 40;

    // Event listeners
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (event.code === 'KeyI') {
      this.toggleInstructions();
    }
  }

  private toggleInstructions(): void {
    if (this.instructionsDiv) {
      this.instructionsVisible = !this.instructionsVisible;
      this.instructionsDiv.style.display = this.instructionsVisible ? 'flex' : 'none';
    }
  }

  private onPointerLockChange(): void {
    if (document.pointerLockElement) {
      this.isGameStarted = true;
      console.log('Pointer locked, game started');
    } else {
      if (this.isGameStarted) {
        console.log('Pointer unlocked, game paused');
        this.showInstructions();
      }
    }
  }

  private onPointerLockError(): void {
    console.error('Pointer lock error');
    this.showInstructions();
  }

  private showInstructions(): void {
    if (this.instructionsDiv) {
      this.instructionsDiv.style.display = this.instructionsVisible ? 'flex' : 'none';
      return;
    }

    const div = document.createElement('div');
    this.instructionsDiv = div;
    div.id = 'instructions';
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    div.style.color = '#fff';
    div.style.padding = '20px';
    div.style.borderRadius = '5px';
    div.style.textAlign = 'center';
    div.style.display = this.instructionsVisible ? 'flex' : 'none';
    div.style.flexDirection = 'column';
    div.style.gap = '10px';
    div.style.zIndex = '1000';
    div.innerHTML = `
      <h2>Game Controls</h2>
      <p>WASD - Move</p>
      <p>SPACE - Jump</p>
      <p>MOUSE - Look around</p>
      <p>LEFT CLICK - Shoot</p>
      <p>I - Toggle Instructions</p>
      <p>Click anywhere to play!</p>
    `;
    document.body.appendChild(div);

    div.addEventListener('click', () => {
      if (!document.pointerLockElement) {
        this.controls.lock();
        this.instructionsVisible = false;
        div.style.display = 'none';
      }
    });
  }

  private createHUD(): void {
    const hud = document.createElement('div');
    hud.style.position = 'fixed';
    hud.style.padding = '20px';
    hud.style.width = '100%';
    hud.style.pointerEvents = 'none';
    document.body.appendChild(hud);

    // Health bar container
    const healthContainer = document.createElement('div');
    healthContainer.style.position = 'fixed';
    healthContainer.style.bottom = '20px';
    healthContainer.style.left = '20px';
    healthContainer.style.width = '200px';
    healthContainer.style.height = '20px';
    healthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    healthContainer.style.border = '2px solid #fff';
    hud.appendChild(healthContainer);

    // Health bar
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.width = '100%';
    healthBar.style.height = '100%';
    healthBar.style.backgroundColor = '#ff0000';
    healthBar.style.transition = 'width 0.3s ease-in-out';
    healthContainer.appendChild(healthBar);

    // Score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'score';
    scoreDisplay.style.position = 'fixed';
    scoreDisplay.style.top = '20px';
    scoreDisplay.style.right = '20px';
    scoreDisplay.style.color = '#fff';
    scoreDisplay.style.fontSize = '24px';
    scoreDisplay.style.fontFamily = 'Arial, sans-serif';
    scoreDisplay.style.textShadow = '2px 2px 2px #000';
    scoreDisplay.textContent = 'Score: 0';
    hud.appendChild(scoreDisplay);

    // Update health bar when health changes
    this.player.onHealthChange((health: number) => {
      const healthBar = document.getElementById('health-bar');
      if (healthBar) {
        healthBar.style.width = `${health}%`;
      }
    });

    // Update score when it changes
    this.player.onScoreChange((score: number) => {
      const scoreDisplay = document.getElementById('score');
      if (scoreDisplay) {
        scoreDisplay.textContent = `Score: ${score}`;
      }
    });
  }

  private spawnBots(): void {
    // Clear existing bots
    this.bots.forEach(bot => {
      if (this.scene) {
        this.scene.remove(bot.getModel());
      }
    });
    this.bots = [];

    // Spawn initial bots
    for (let i = 0; i < this.maxBots / 2; i++) {
      this.spawnBot();
    }
  }

  private spawnBot(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = this.spawnRadius + (Math.random() * 20);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    const position = new THREE.Vector3(x, 2 + (Math.random() * 0.5), z);
    const bot = new Bot(position);
    bot.initialize(this.scene, this.player);
    this.bots.push(bot);
  }

  public async initialize(): Promise<void> {
    try {
      // Setup renderer
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      document.body.appendChild(this.renderer.domElement);
      
      // Setup stats
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);

      // Setup scene with dark background
      this.scene.background = new THREE.Color(0x111111);
      this.scene.fog = new THREE.FogExp2(0x111111, 0.05);
      this.setupLighting();

      // Initialize world
      await this.world.initialize();

      // Setup camera initial position
      this.camera.position.set(0, 2, 5);

      // Create HUD
      this.createHUD();

      // Spawn bots
      this.spawnBots();

      // Show initial instructions
      this.showInstructions();

    } catch (error) {
      console.error('Failed to initialize game:', error);
      throw error;
    }
  }

  private setupLighting(): void {
    // Dim ambient light for darker atmosphere
    const ambientLight = new THREE.AmbientLight(0x444444, 0.9);
    this.scene.add(ambientLight);

    // Moonlight effect
    const moonLight = new THREE.DirectionalLight(0x6666ff, 0.4);
    moonLight.position.set(50, 100, 50);
    moonLight.castShadow = true;
    
    // Adjust shadow properties
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 500;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    
    this.scene.add(moonLight);

    // Add point lights for atmosphere
    const createPointLight = (x: number, z: number) => {
      const light = new THREE.PointLight(0xff4400, 0.8, 10);
      light.position.set(x, 3, z);
      this.scene.add(light);
    };

    // Add some atmospheric lights
    createPointLight(10, 10);
    createPointLight(-15, 20);
    createPointLight(25, -10);
    createPointLight(-20, -15);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public update(): void {
    if (!this.isGameStarted) return;

    this.stats.begin();

    // Update player
    this.player.update();

    // Update world
    this.world.update(this.player);

    // Update and clean up bots
    this.bots = this.bots.filter(bot => {
      if (bot.getIsAlive()) {
        bot.update();
        return true;
      }
      return false;
    });

    // Spawn new bots if needed
    const now = Date.now();
    if (now - this.lastBotSpawnTime >= this.botSpawnInterval && this.bots.length < this.maxBots) {
      this.spawnBot();
      this.lastBotSpawnTime = now;
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  }

  public start(): void {
    this.isGameStarted = true;
    this.gameLoop();
  }

  public stop(): void {
    this.isGameStarted = false;
    document.exitPointerLock();
  }

  private gameLoop(): void {
    if (!this.isGameStarted) return;

    // Update game state
    this.update();

    // Continue game loop
    requestAnimationFrame(() => this.gameLoop());
  }

  public getPlayer(): Player {
    return this.player;
  }
} 