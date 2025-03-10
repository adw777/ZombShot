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
  private currentWave: number;
  private totalWaves: number;
  private zombiesPerWave: number[];
  private zombiesKilled: number;
  private waveInProgress: boolean;
  private gameWon: boolean;
  private gameLost: boolean;
  private waveStatusDiv: HTMLDivElement | null;
  private scoreDiv: HTMLDivElement | null;

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

    // Initialize wave system
    this.currentWave = 1;
    this.totalWaves = 3;
    this.zombiesPerWave = [10, 5, 3];
    this.zombiesKilled = 0;
    this.waveInProgress = false;
    this.gameWon = false;
    this.gameLost = false;
    this.waveStatusDiv = null;
    this.scoreDiv = null;

    // Event listeners
    document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this));
    document.addEventListener('pointerlockerror', this.onPointerLockError.bind(this));
    document.addEventListener('keydown', this.handleKeyPress.bind(this));
  }

  private handleKeyPress(event: KeyboardEvent): void {
    if (event.code === 'KeyI') {
      this.toggleInstructions();
      if (this.isGameStarted) {
        // Pause/unpause the game
        this.isGameStarted = !this.instructionsVisible;
      }
    }
  }

  private toggleInstructions(): void {
    if (!this.instructionsDiv) {
      this.createInstructions();
    }
    this.instructionsVisible = !this.instructionsVisible;
    if (this.instructionsDiv) {
      this.instructionsDiv.style.display = this.instructionsVisible ? 'flex' : 'none';
    }
  }

  private createInstructions(): void {
    const div = document.createElement('div');
    this.instructionsDiv = div;
    div.id = 'instructions';
    div.style.position = 'fixed';
    div.style.top = '50%';
    div.style.left = '50%';
    div.style.transform = 'translate(-50%, -50%)';
    div.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    div.style.color = 'white';
    div.style.padding = '20px';
    div.style.borderRadius = '10px';
    div.style.fontFamily = 'Arial, sans-serif';
    div.style.fontSize = '18px';
    div.style.textAlign = 'center';
    div.style.maxWidth = '600px';
    div.style.display = this.instructionsVisible ? 'flex' : 'none';
    div.style.flexDirection = 'column';
    div.style.gap = '10px';

    const title = document.createElement('h2');
    title.textContent = 'Game Instructions';
    title.style.marginBottom = '15px';
    div.appendChild(title);

    const instructions = [
      'WASD - Move',
      'Mouse - Look around',
      'Left Click - Shoot',
      'Shift - Sprint',
      'I - Toggle Instructions/Pause Game',
      '',
      'Survive three waves of zombies:',
      'Wave 1: 10 zombies',
      'Wave 2: 5 zombies',
      'Wave 3: 3 larger, tougher zombies',
      '',
      'Each zombie kill gives you 20 points.',
      'Collect health boosters to survive longer.',
      'You must defeat all waves to win!'
    ];

    instructions.forEach(text => {
      if (text === '') {
        const spacer = document.createElement('div');
        spacer.style.height = '10px';
        div.appendChild(spacer);
      } else {
        const p = document.createElement('p');
        p.textContent = text;
        p.style.margin = '0';
        div.appendChild(p);
      }
    });

    const continueText = document.createElement('p');
    continueText.textContent = 'Press I to continue';
    continueText.style.marginTop = '20px';
    continueText.style.color = '#ffff00';
    div.appendChild(continueText);

    document.body.appendChild(div);
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
    // Create wave status display
    const waveDiv = document.createElement('div');
    this.waveStatusDiv = waveDiv;
    waveDiv.style.position = 'fixed';
    waveDiv.style.top = '20px';
    waveDiv.style.left = '20px';
    waveDiv.style.color = 'white';
    waveDiv.style.fontFamily = 'Arial, sans-serif';
    waveDiv.style.fontSize = '20px';
    waveDiv.style.textShadow = '2px 2px 2px black';
    document.body.appendChild(waveDiv);

    // Create score display
    const scoreDiv = document.createElement('div');
    this.scoreDiv = scoreDiv;
    scoreDiv.style.position = 'fixed';
    scoreDiv.style.top = '50px';
    scoreDiv.style.left = '20px';
    scoreDiv.style.color = 'white';
    scoreDiv.style.fontFamily = 'Arial, sans-serif';
    scoreDiv.style.fontSize = '20px';
    scoreDiv.style.textShadow = '2px 2px 2px black';
    document.body.appendChild(scoreDiv);

    // Create health bar container
    const healthContainer = document.createElement('div');
    healthContainer.style.position = 'fixed';
    healthContainer.style.bottom = '20px';
    healthContainer.style.left = '20px';
    healthContainer.style.width = '200px';
    healthContainer.style.height = '20px';
    healthContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    healthContainer.style.border = '2px solid #fff';
    document.body.appendChild(healthContainer);

    // Create health bar
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.style.width = '100%';
    healthBar.style.height = '100%';
    healthBar.style.backgroundColor = '#ff0000';
    healthBar.style.transition = 'width 0.3s ease-in-out';
    healthContainer.appendChild(healthBar);

    // Update health bar when health changes
    this.player.onHealthChange((health: number) => {
      const healthBar = document.getElementById('health-bar');
      if (healthBar) {
        healthBar.style.width = `${health}%`;
      }
    });

    this.updateHUD();
  }

  private updateHUD(): void {
    if (this.waveStatusDiv) {
      this.waveStatusDiv.textContent = `Wave: ${this.currentWave}/${this.totalWaves}`;
    }
    if (this.scoreDiv) {
      this.scoreDiv.textContent = `Zombies Killed: ${this.zombiesKilled}`;
    }
  }

  private spawnBots(): void {
    // Clear existing bots
    this.bots.forEach(bot => {
      if (this.scene) {
        this.scene.remove(bot.getModel());
      }
    });
    this.bots = [];

    // Start wave
    this.waveInProgress = true;
    this.startWave();
  }

  private startWave(): void {
    const zombiesToSpawn = this.zombiesPerWave[this.currentWave - 1];
    
    // Spawn initial zombies for the wave
    for (let i = 0; i < zombiesToSpawn; i++) {
      this.spawnBot();
    }
  }

  private spawnBot(): void {
    const angle = Math.random() * Math.PI * 2;
    const radius = this.spawnRadius + (Math.random() * 10); // Reduced random range
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    
    const position = new THREE.Vector3(x, 2, z); // Removed random Y variation
    const bot = new Bot(position, this.currentWave);
    bot.initialize(this.scene, this.player);
    this.bots.push(bot);
  }

  private setupLighting(): void {
    // Single ambient light for better performance
    const ambientLight = new THREE.AmbientLight(0x808080, 1.0);
    this.scene.add(ambientLight);
  }

  public async initialize(): Promise<void> {
    try {
      // Setup renderer with minimal settings
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(1.0); // Force 1.0 for maximum performance
      this.renderer.shadowMap.enabled = false; // Disable shadows completely
      document.body.appendChild(this.renderer.domElement);
      
      // Setup stats
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);

      // Setup scene with minimal settings
      this.scene.background = new THREE.Color(0x111111);
      this.scene.fog = new THREE.FogExp2(0x111111, 0.02); // Further reduced fog
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

  private lastUpdateTime: number = 0;
  private readonly UPDATE_INTERVAL: number = 32; // ~30fps for bot updates

  public update(): void {
    if (!this.isGameStarted || this.gameWon || this.gameLost) return;

    this.stats.begin();

    // Update player every frame for responsive controls
    this.player.update();

    // Update world
    this.world.update(this.player);

    // Update bots at a lower frequency
    const now = Date.now();
    if (now - this.lastUpdateTime >= this.UPDATE_INTERVAL) {
      this.lastUpdateTime = now;

      const playerPos = this.player.getPosition();
      const previousBotCount = this.bots.length;
      const aliveBots: Bot[] = [];
      const deadBots: Bot[] = [];

      // Update bots with distance-based culling
      for (let i = 0; i < this.bots.length; i++) {
        const bot = this.bots[i];
        if (bot.getIsAlive()) {
          const distanceToPlayer = bot.getPosition().distanceTo(playerPos);
          if (distanceToPlayer < 30) { // Reduced update distance
            bot.update();
          }
          aliveBots.push(bot);
        } else {
          deadBots.push(bot);
        }
      }

      // Remove dead bots
      for (const bot of deadBots) {
        this.scene.remove(bot.getModel());
      }

      // Update bots array
      this.bots = aliveBots;

      // Handle zombie kills
      const newlyKilledZombies = previousBotCount - this.bots.length;
      if (newlyKilledZombies > 0) {
        this.zombiesKilled += newlyKilledZombies;
        this.updateHUD();

        // Check wave completion
        if (this.bots.length === 0 && this.waveInProgress) {
          this.waveInProgress = false;
          
          if (this.currentWave < this.totalWaves) {
            this.currentWave++;
            setTimeout(() => this.startWave(), 3000);
          } else {
            this.gameWon = true;
            this.showGameEndMessage(true);
          }
        }
      }
    }

    // Check for game over
    if (this.player.getHealth() <= 0 && !this.gameLost) {
      this.gameLost = true;
      this.showGameEndMessage(false);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.stats.end();
  }

  private showGameEndMessage(won: boolean): void {
    const messageDiv = document.createElement('div');
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    messageDiv.style.color = 'white';
    messageDiv.style.padding = '20px';
    messageDiv.style.borderRadius = '10px';
    messageDiv.style.fontFamily = 'Arial, sans-serif';
    messageDiv.style.fontSize = '24px';
    messageDiv.style.textAlign = 'center';

    if (won) {
      messageDiv.textContent = `Victory! You've defeated all ${this.zombiesKilled} zombies across ${this.totalWaves} waves!`;
      // Play victory sound
      const victorySound = this.player.getSounds().victory.cloneNode() as HTMLAudioElement;
      victorySound.play();
    } else {
      messageDiv.textContent = `Game Over! You were overwhelmed by the zombies. Zombies killed: ${this.zombiesKilled}`;
      // Play defeat sound
      const defeatSound = this.player.getSounds().defeat.cloneNode() as HTMLAudioElement;
      defeatSound.play();
    }

    document.body.appendChild(messageDiv);
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
