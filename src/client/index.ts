import { Game } from './core/Game';
import { NetworkManager } from './network/NetworkManager';
import { InputManager } from './core/InputManager';
import { UIManager } from './ui/UIManager';

class VoxelFPS {
  private game: Game;
  private networkManager: NetworkManager;
  private inputManager: InputManager;
  private uiManager: UIManager;

  constructor() {
    this.game = new Game();
    this.networkManager = new NetworkManager();
    this.inputManager = new InputManager();
    this.uiManager = new UIManager();

    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Initialize core systems
      await this.game.initialize();
      
      // Connect network manager to game
      await this.networkManager.connect();
      this.networkManager.setLocalPlayer(this.game.getPlayer());
      
      // Initialize input and UI
      this.inputManager.initialize();
      this.uiManager.initialize();

      // Connect UI to game state
      this.game.getPlayer().onHealthChange((health: number) => {
        this.uiManager.updateHealth(health);
      });

      // Start the game loop
      this.gameLoop();

      // Hide loading screen
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.style.display = 'none';
      }

      // Update loading progress
      const loadingProgress = document.getElementById('loading-progress');
      if (loadingProgress) {
        loadingProgress.style.width = '100%';
      }

      // Handle pointer lock changes
      document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement) {
          this.game.start();
        } else {
          this.game.stop();
        }
      });

      // Handle start button click
      const startButton = document.getElementById('start-button');
      if (startButton) {
        startButton.style.display = 'block';
        startButton.onclick = () => {
          const loadingScreen = document.getElementById('loading-screen');
          if (loadingScreen) {
            loadingScreen.style.display = 'none';
          }
          document.body.requestPointerLock();
        };
      }
    } catch (error: unknown) {
      console.error('Failed to initialize game:', error);
      // Show error message to user
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        loadingScreen.innerHTML = `
          <h1>Error</h1>
          <p>Failed to initialize game. Please refresh the page.</p>
          <p>${errorMessage}</p>
        `;
      }
    }
  }

  private gameLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update game state
      this.game.update();
      
      // Handle network updates
      this.networkManager.update();
      
      // Update UI
      this.uiManager.update();
    };

    animate();
  }
}

// Start the game when the DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new VoxelFPS();
}); 


