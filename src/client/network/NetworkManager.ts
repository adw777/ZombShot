import { io, Socket } from 'socket.io-client';
import { Player } from '../entities/Player';

interface PlayerState {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  health: number;
  weapon: string;
}

interface GameState {
  players: { [key: string]: PlayerState };
  gameTime: number;
  score: { [key: string]: number };
}

export class NetworkManager {
  private socket: Socket | null;
  private localPlayer: Player | null;
  private players: Map<string, PlayerState>;
  private updateRate: number;
  private lastUpdateTime: number;
  private gameState: GameState;
  private playerId: string;
  private roomId: string;

  constructor() {
    this.socket = null;
    this.localPlayer = null;
    this.players = new Map();
    this.updateRate = 50; // Send updates every 50ms
    this.lastUpdateTime = 0;
    this.gameState = {
      players: {},
      gameTime: 0,
      score: {},
    };
    this.playerId = '';
    this.roomId = '1234'; // Default room
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io('http://localhost:8000', {
          transports: ['websocket'],
          upgrade: false,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        this.setupEventListeners();

        this.socket.on('connect', () => {
          console.log('Connected to server');
          this.socket?.emit('join_room', { room_id: this.roomId });
        });

        this.socket.on('connection_established', (data: { sid: string }) => {
          console.log('Connection established, SID:', data.sid);
          this.playerId = data.sid;
          resolve();
        });

        this.socket.on('connect_error', (error: Error) => {
          console.error('Connection error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('Failed to connect:', error);
        reject(error);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('room_full', () => {
      console.log('Room is full, cannot join');
    });

    this.socket.on('game_state', (state: {
      room_id: string;
      player_id: string;
      players: { [key: string]: PlayerState };
      game_state: GameState;
    }) => {
      this.roomId = state.room_id;
      this.playerId = state.player_id;
      this.gameState = state.game_state;
      this.updatePlayers(state.players);
    });

    this.socket.on('player_join', ({ player }: { player: PlayerState }) => {
      if (player.id !== this.playerId) {
        this.players.set(player.id, player);
        console.log(`Player ${player.id} joined`);
      }
    });

    this.socket.on('player_leave', ({ player_id }: { player_id: string }) => {
      this.players.delete(player_id);
      console.log(`Player ${player_id} left`);
    });

    this.socket.on('player_state', ({ player }: { player: PlayerState }) => {
      if (player.id !== this.playerId) {
        this.players.set(player.id, player);
      }
    });

    this.socket.on('player_damage', ({
      target_id,
      damage,
    }: {
      target_id: string;
      damage: number;
      source_id: string;
      health: number;
    }) => {
      if (target_id === this.playerId && this.localPlayer) {
        this.localPlayer.takeDamage(damage);
      }
    });

    this.socket.on('player_kill', ({
      killer_id,
      victim_id
    }: {
      killer_id: string;
      victim_id: string;
    }) => {
      if (killer_id === this.playerId && this.localPlayer) {
        this.localPlayer.addScore(10);
      }
      console.log(`Player ${killer_id} killed player ${victim_id}`);
    });
  }

  private updatePlayers(players: { [key: string]: PlayerState }): void {
    Object.entries(players).forEach(([id, state]) => {
      if (id !== this.playerId) {
        this.players.set(id, state);
      }
    });
  }

  public setLocalPlayer(player: Player): void {
    this.localPlayer = player;
  }

  public update(): void {
    if (!this.socket || !this.localPlayer) return;

    const currentTime = Date.now();
    if (currentTime - this.lastUpdateTime >= this.updateRate) {
      const position = this.localPlayer.getPosition();
      
      if (position) {
        this.socket.emit('player_update', {
          position: {
            x: position.x,
            y: position.y,
            z: position.z,
          },
          health: 100, // We'll update this when we add health tracking
        });
      }

      this.lastUpdateTime = currentTime;
    }
  }

  public sendShot(targetId: string, damage: number): void {
    if (!this.socket) return;

    this.socket.emit('player_shot', {
      target_id: targetId,
      damage,
      source_id: this.playerId,
    });
  }

  public getPlayers(): Map<string, PlayerState> {
    return this.players;
  }

  public getGameState(): GameState {
    return this.gameState;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
} 