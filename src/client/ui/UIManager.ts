export class UIManager {
  private container: HTMLDivElement;
  private healthBar: HTMLDivElement;
  private ammoCounter: HTMLDivElement;
  private scoreBoard: HTMLDivElement;
  private crosshair: HTMLDivElement;
  private killFeed: HTMLDivElement;

  constructor() {
    this.container = document.createElement('div');
    this.healthBar = document.createElement('div');
    this.ammoCounter = document.createElement('div');
    this.scoreBoard = document.createElement('div');
    this.crosshair = document.createElement('div');
    this.killFeed = document.createElement('div');
  }

  public initialize(): void {
    this.setupContainer();
    this.setupHealthBar();
    this.setupAmmoCounter();
    this.setupScoreBoard();
    this.setupCrosshair();
    this.setupKillFeed();

    document.body.appendChild(this.container);
  }

  private setupContainer(): void {
    this.container.style.position = 'fixed';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.width = '100%';
    this.container.style.height = '100%';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '1000';
  }

  private setupHealthBar(): void {
    this.healthBar.className = 'health-bar';
    this.healthBar.style.position = 'absolute';
    this.healthBar.style.bottom = '20px';
    this.healthBar.style.left = '20px';
    this.healthBar.style.width = '200px';
    this.healthBar.style.height = '20px';
    this.healthBar.style.backgroundColor = '#333';
    this.healthBar.style.border = '2px solid #fff';
    this.healthBar.style.borderRadius = '10px';
    this.healthBar.style.overflow = 'hidden';

    const healthFill = document.createElement('div');
    healthFill.style.width = '100%';
    healthFill.style.height = '100%';
    healthFill.style.backgroundColor = '#ff0000';
    healthFill.style.transition = 'width 0.3s ease-in-out';

    this.healthBar.appendChild(healthFill);
    this.container.appendChild(this.healthBar);
  }

  private setupAmmoCounter(): void {
    this.ammoCounter.className = 'ammo-counter';
    this.ammoCounter.style.position = 'absolute';
    this.ammoCounter.style.bottom = '20px';
    this.ammoCounter.style.right = '20px';
    this.ammoCounter.style.color = '#fff';
    this.ammoCounter.style.fontSize = '24px';
    this.ammoCounter.style.fontFamily = 'Arial, sans-serif';
    this.ammoCounter.textContent = '30/30';

    this.container.appendChild(this.ammoCounter);
  }

  private setupScoreBoard(): void {
    this.scoreBoard.className = 'score-board';
    this.scoreBoard.style.position = 'absolute';
    this.scoreBoard.style.top = '20px';
    this.scoreBoard.style.right = '20px';
    this.scoreBoard.style.color = '#fff';
    this.scoreBoard.style.fontSize = '18px';
    this.scoreBoard.style.fontFamily = 'Arial, sans-serif';
    this.scoreBoard.style.display = 'none';

    this.container.appendChild(this.scoreBoard);

    // Toggle scoreboard on Tab key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        this.scoreBoard.style.display = 'block';
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.key === 'Tab') {
        this.scoreBoard.style.display = 'none';
      }
    });
  }

  private setupCrosshair(): void {
    this.crosshair.className = 'crosshair';
    this.crosshair.style.position = 'absolute';
    this.crosshair.style.top = '50%';
    this.crosshair.style.left = '50%';
    this.crosshair.style.width = '10px';
    this.crosshair.style.height = '10px';
    this.crosshair.style.transform = 'translate(-50%, -50%)';
    this.crosshair.style.backgroundColor = '#fff';
    this.crosshair.style.borderRadius = '50%';

    this.container.appendChild(this.crosshair);
  }

  private setupKillFeed(): void {
    this.killFeed.className = 'kill-feed';
    this.killFeed.style.position = 'absolute';
    this.killFeed.style.top = '20px';
    this.killFeed.style.left = '20px';
    this.killFeed.style.color = '#fff';
    this.killFeed.style.fontSize = '16px';
    this.killFeed.style.fontFamily = 'Arial, sans-serif';

    this.container.appendChild(this.killFeed);
  }

  public updateHealth(health: number): void {
    const healthFill = this.healthBar.firstChild as HTMLDivElement;
    healthFill.style.width = `${health}%`;
    healthFill.style.backgroundColor = health > 20 ? '#ff0000' : '#ff6b6b';
  }

  public updateAmmo(current: number, max: number): void {
    this.ammoCounter.textContent = `${current}/${max}`;
  }

  public updateScoreboard(players: Array<{ name: string; score: number; ping: number }>): void {
    this.scoreBoard.innerHTML = '';
    const table = document.createElement('table');
    table.style.width = '300px';
    table.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    table.style.borderCollapse = 'collapse';

    // Header
    const header = table.createTHead();
    const headerRow = header.insertRow();
    ['Player', 'Score', 'Ping'].forEach(text => {
      const th = document.createElement('th');
      th.style.padding = '5px 10px';
      th.style.borderBottom = '1px solid #fff';
      th.textContent = text;
      headerRow.appendChild(th);
    });

    // Player rows
    players.forEach(player => {
      const row = table.insertRow();
      Object.values(player).forEach(value => {
        const cell = row.insertCell();
        cell.style.padding = '5px 10px';
        cell.textContent = value.toString();
      });
    });

    this.scoreBoard.appendChild(table);
  }

  public addKillFeedEntry(killer: string, victim: string, weapon: string): void {
    const entry = document.createElement('div');
    entry.style.marginBottom = '5px';
    entry.style.animation = 'fadeOut 5s forwards';
    entry.innerHTML = `${killer} <span style="color: #ff0000">killed</span> ${victim} with ${weapon}`;

    this.killFeed.insertBefore(entry, this.killFeed.firstChild);

    // Remove entry after animation
    setTimeout(() => {
      entry.remove();
    }, 5000);
  }

  public update(): void {
    // Update any dynamic UI elements here
  }
} 