import * as THREE from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { Chunk } from './Chunk';
import { Player } from '../entities/Player';

interface Coin {
    model: THREE.Group;
    position: THREE.Vector3;
    isCollected: boolean;
}

export class VoxelWorld {
  private chunks: Map<string, Chunk>;
  private chunkSize: number;
  private renderDistance: number;
  private noise: SimplexNoise;
  private scene: THREE.Scene;
  private coins: Coin[] = [];
  private coinSound: HTMLAudioElement;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkSize = 16; // 16x16x16 voxels per chunk
    this.renderDistance = 4; // Number of chunks to render in each direction
    this.noise = new SimplexNoise();
    this.coinSound = new Audio('/sounds/coin_collect.mp3');
    this.coinSound.volume = 0.3;
    this.initialize();
  }

  public async initialize(): Promise<void> {
    // Add buildings
    this.generateBuildings();

    // Add spooky elements
    this.generateSpookyElements(this.scene);

    // Setup lighting
    this.setupLighting();

    // Add bounty gold
    this.generateBountyGold(this.scene);

    this.spawnCoins();
  }

  private async generateChunk(chunkX: number, chunkY: number, chunkZ: number, scene: THREE.Scene): Promise<void> {
    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;
    
    if (!this.chunks.has(chunkKey)) {
      const chunk = new Chunk(
        chunkX * this.chunkSize,
        chunkY * this.chunkSize,
        chunkZ * this.chunkSize,
        this.chunkSize
      );
      
      // Generate terrain with grass
      for (let x = 0; x < this.chunkSize; x++) {
        for (let z = 0; z < this.chunkSize; z++) {
          const worldX = chunkX * this.chunkSize + x;
          const worldZ = chunkZ * this.chunkSize + z;
          
          // Generate base terrain height using Simplex noise
          const frequency = 0.05;
          const height = Math.floor(
            (this.noise.noise(worldX * frequency, worldZ * frequency) + 1) * 4
          );

          // Create terrain layers
          for (let y = 0; y < this.chunkSize; y++) {
            const worldY = chunkY * this.chunkSize + y;
            
            if (worldY < height - 1) {
              // Underground (dirt)
              chunk.setVoxel(x, y, z, 2);
            } else if (worldY === height - 1) {
              // Surface layer (grass)
              chunk.setVoxel(x, y, z, 3);
            } else {
              // Air
              chunk.setVoxel(x, y, z, 0);
            }
          }
        }
      }
      
      chunk.updateGeometry();
      chunk.addToScene(scene);
      this.chunks.set(chunkKey, chunk);
    }
  }

  private generateBuildings(): void {
    // Create a larger flat ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.8,
        metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Create maze-like structure with buildings
    const buildingConfigs = [];
    const mazeSize = 10; // 10x10 grid of buildings
    const spacing = 15; // Space between buildings
    const startOffset = -mazeSize * spacing / 2;

    // Generate maze-like pattern
    for (let i = 0; i < mazeSize; i++) {
        for (let j = 0; j < mazeSize; j++) {
            // Skip some positions to create paths
            if (Math.random() > 0.7) continue;

            const x = startOffset + i * spacing;
            const z = startOffset + j * spacing;
            const height = 5 + Math.random() * 5; // Random height between 5-10
            const width = 3 + Math.random() * 2;
            const depth = 3 + Math.random() * 2;

            buildingConfigs.push({
                position: new THREE.Vector3(x, height/2, z),
                dimensions: new THREE.Vector3(width, height, depth),
                rotation: Math.random() * Math.PI * 2
            });
        }
    }

    // Create buildings
    buildingConfigs.forEach(config => {
        const buildingGeometry = new THREE.BoxGeometry(
            config.dimensions.x,
            config.dimensions.y,
            config.dimensions.z
        );
        const buildingMaterial = new THREE.MeshStandardMaterial({
            color: 0x404040,
            roughness: 0.7,
            metalness: 0.2
        });
        const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
        
        building.position.copy(config.position);
        building.rotation.y = config.rotation;
        building.castShadow = true;
        building.receiveShadow = true;

        // Add collision data
        building.userData.isBuilding = true;
        
        this.scene.add(building);

        // Add random debris around buildings
        this.addDebrisAroundBuilding(config.position, 2);
    });
  }

  private addDebrisAroundBuilding(position: THREE.Vector3, radius: number): void {
    const debrisCount = Math.floor(Math.random() * 5) + 2;
    
    for (let i = 0; i < debrisCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        
        const x = position.x + Math.cos(angle) * distance;
        const z = position.z + Math.sin(angle) * distance;
        
        const debrisGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const debrisMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.9
        });
        
        const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
        debris.position.set(x, 0.25, z);
        debris.rotation.y = Math.random() * Math.PI * 2;
        debris.castShadow = true;
        debris.receiveShadow = true;
        
        this.scene.add(debris);
    }
  }

  private addSpookyDecorations(): void {
    // Add fog
    this.scene.fog = new THREE.FogExp2(0x000000, 0.01);

    // Add some ground debris
    for (let i = 0; i < 50; i++) {
        const size = Math.random() * 0.5 + 0.2;
        const geometry = new THREE.BoxGeometry(size, size, size);
        const material = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 1,
            metalness: 0
        });
        const debris = new THREE.Mesh(geometry, material);
        
        // Random position within the game area
        debris.position.x = (Math.random() - 0.5) * 180;
        debris.position.y = size / 2;
        debris.position.z = (Math.random() - 0.5) * 180;
        
        // Random rotation
        debris.rotation.y = Math.random() * Math.PI * 2;
        
        this.scene.add(debris);
    }

    // Add some floating particles for atmosphere
    const particleCount = 1000;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i] = (Math.random() - 0.5) * 200;
        particlePositions[i + 1] = Math.random() * 50;
        particlePositions[i + 2] = (Math.random() - 0.5) * 200;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        color: 0x666666,
        size: 0.1,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
  }

  private generateDebris(scene: THREE.Scene): void {
    const debrisGeometry = new THREE.BoxGeometry(1, 1, 1);
    const debrisMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 1,
      metalness: 0
    });

    // Add random debris around buildings
    for (let i = 0; i < 100; i++) {
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      
      // Random position within the world
      debris.position.set(
        (Math.random() - 0.5) * 100,
        1,
        (Math.random() - 0.5) * 100
      );

      // Random scale for variety
      const scale = 0.2 + Math.random() * 0.8;
      debris.scale.set(scale, scale, scale);

      // Random rotation
      debris.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      debris.castShadow = true;
      debris.receiveShadow = true;
      scene.add(debris);
    }
  }

  private generateTorches(scene: THREE.Scene): void {
    const torchPositions = [
      { x: 15, z: 15 },
      { x: -20, z: 25 },
      { x: 30, z: -15 },
      { x: -25, z: -20 },
      { x: 35, z: 35 },
      { x: -40, z: -40 },
      { x: 0, z: 30 },
      { x: 30, z: 0 },
      { x: -30, z: 0 },
      { x: 0, z: -30 }
    ];

    torchPositions.forEach(pos => {
      this.createTorch(pos.x, pos.z, scene);
    });
  }

  private createTorch(x: number, z: number, scene: THREE.Scene): void {
    // Create torch pole
    const poleGeometry = new THREE.BoxGeometry(0.2, 2, 0.2);
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2700,
      roughness: 1,
      metalness: 0
    });
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.set(x, 1, z);
    scene.add(pole);

    // Create torch head
    const headGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 1,
      metalness: 0,
      emissive: 0xff4400,
      emissiveIntensity: 0.5
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(x, 2.2, z);
    scene.add(head);

    // Add flickering point light
    const light = new THREE.PointLight(0xff4400, 2, 15);
    light.position.set(x, 2.2, z);
    scene.add(light);

    // Add flickering animation
    const intensity = light.intensity;
    const flicker = () => {
      light.intensity = intensity * (0.9 + Math.random() * 0.2);
      requestAnimationFrame(flicker);
    };
    flicker();
  }

  public getVoxel(x: number, y: number, z: number): number {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkY = Math.floor(y / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;

    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return 0;

    const localX = x - chunkX * this.chunkSize;
    const localY = y - chunkY * this.chunkSize;
    const localZ = z - chunkZ * this.chunkSize;

    return chunk.getVoxel(localX, localY, localZ);
  }

  public setVoxel(x: number, y: number, z: number, value: number): void {
    const chunkX = Math.floor(x / this.chunkSize);
    const chunkY = Math.floor(y / this.chunkSize);
    const chunkZ = Math.floor(z / this.chunkSize);
    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;

    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return;

    const localX = x - chunkX * this.chunkSize;
    const localY = y - chunkY * this.chunkSize;
    const localZ = z - chunkZ * this.chunkSize;

    chunk.setVoxel(localX, localY, localZ, value);
    chunk.updateGeometry();
  }

  public update(player: Player): void {
    // Update chunks based on player position
    // This will be implemented later for dynamic chunk loading

    // Update coins
    this.coins.forEach(coin => {
        if (!coin.isCollected) {
            // Rotate the coin
            coin.model.rotation.y += 0.02;

            // Check for collection
            const distanceToPlayer = coin.position.distanceTo(player.getPosition());
            if (distanceToPlayer < 1.5) {
                this.collectCoin(coin, player);
            }
        }
    });
  }

  private setupLighting(): void {
    // Brighter ambient light with blue tint for enhanced night atmosphere
    const ambientLight = new THREE.AmbientLight(0x6666ff, 0.9); // Increased intensity
    this.scene.add(ambientLight);

    // Enhanced moonlight effect
    const moonLight = new THREE.DirectionalLight(0x8888ff, 0.8); // Increased intensity
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

    // Add fluorescent point lights for atmosphere
    const colors = [
        0xff00ff, // Magenta
        0x00ffff, // Cyan
        0xff1493, // Deep Pink
        0x7fff00, // Chartreuse
        0x00ff7f, // Spring Green
        0x9400d3  // Violet
    ];

    // Create point lights with different colors
    const createPointLight = (x: number, z: number, color: number) => {
        const light = new THREE.PointLight(color, 1.5, 25); // Increased intensity and range
        light.position.set(x, 3, z);
        
        // Add slight oscillation to the light intensity
        const baseIntensity = light.intensity;
        const animate = () => {
            light.intensity = baseIntensity * (0.8 + Math.sin(Date.now() * 0.002) * 0.2);
            requestAnimationFrame(animate);
        };
        animate();
        
        this.scene.add(light);
    };

    // Add fluorescent lights around the map
    colors.forEach((color, i) => {
        const angle = (i / colors.length) * Math.PI * 2;
        const radius = 25;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        createPointLight(x, z, color);
    });

    // Add fog for spooky atmosphere
    this.scene.fog = new THREE.FogExp2(0x000033, 0.03); // Blueish fog
  }

  private generateSpookyElements(scene: THREE.Scene): void {
    // Add floating ghost lights
    for (let i = 0; i < 15; i++) {
        const ghostLight = new THREE.PointLight(0x00ffff, 0.5, 5);
        const x = (Math.random() - 0.5) * 100;
        const y = 2 + Math.random() * 3;
        const z = (Math.random() - 0.5) * 100;
        ghostLight.position.set(x, y, z);

        // Add ghostly orb mesh
        const orbGeometry = new THREE.SphereGeometry(0.2);
        const orbMaterial = new THREE.MeshStandardMaterial({
            emissive: 0x00ffff,
            emissiveIntensity: 1,
            transparent: true,
            opacity: 0.6
        });
        const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        orb.position.copy(ghostLight.position);
        
        // Animate ghost light
        const startY = y;
        const animate = () => {
            const time = Date.now() * 0.001;
            orb.position.y = startY + Math.sin(time) * 0.5;
            ghostLight.position.copy(orb.position);
            requestAnimationFrame(animate);
        };
        animate();

        scene.add(ghostLight);
        scene.add(orb);
    }

    // Add spooky trees
    for (let i = 0; i < 20; i++) {
        const treeHeight = 5 + Math.random() * 5;
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, treeHeight);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1a0f00,
            roughness: 0.9
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

        const x = (Math.random() - 0.5) * 80;
        const z = (Math.random() - 0.5) * 80;
        trunk.position.set(x, treeHeight / 2, z);

        // Add twisted branches
        for (let j = 0; j < 4; j++) {
            const branchLength = 1 + Math.random() * 2;
            const branchGeometry = new THREE.CylinderGeometry(0.1, 0.15, branchLength);
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
            
            branch.position.y = treeHeight * (0.6 + Math.random() * 0.3);
            branch.rotation.z = (Math.random() - 0.5) * Math.PI * 0.5;
            branch.rotation.y = (j / 4) * Math.PI * 2;
            
            trunk.add(branch);
        }

        scene.add(trunk);
    }

    // Add gravestones
    for (let i = 0; i < 12; i++) {
        const height = 1 + Math.random() * 0.5;
        const geometry = new THREE.BoxGeometry(0.8, height, 0.2);
        const material = new THREE.MeshStandardMaterial({
            color: 0x666666,
            roughness: 0.9
        });
        const gravestone = new THREE.Mesh(geometry, material);

        const x = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 60;
        gravestone.position.set(x, height / 2, z);
        gravestone.rotation.y = Math.random() * Math.PI * 0.2;
        gravestone.rotation.x = Math.random() * Math.PI * 0.05;

        scene.add(gravestone);
    }
  }

  private generateBountyGold(scene: THREE.Scene): void {
    const goldGeometry = new THREE.SphereGeometry(0.3);
    const goldMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1,
        roughness: 0.1,
        emissive: 0xffd700,
        emissiveIntensity: 0.2
    });

    // Add floating gold spheres
    for (let i = 0; i < 5; i++) { // Only 5 rare gold spheres
        const gold = new THREE.Mesh(goldGeometry, goldMaterial);
        
        // Position randomly but away from spawn point
        let x, z;
        do {
            x = (Math.random() - 0.5) * 80;
            z = (Math.random() - 0.5) * 80;
        } while (Math.sqrt(x * x + z * z) < 20); // Keep away from spawn

        gold.position.set(x, 2 + Math.random() * 2, z);
        gold.userData.isBountyGold = true; // Mark for collision detection

        // Add floating animation
        const startY = gold.position.y;
        const animate = () => {
            const time = Date.now() * 0.001;
            gold.position.y = startY + Math.sin(time * 2) * 0.3;
            gold.rotation.y += 0.02;
            requestAnimationFrame(animate);
        };
        animate();

        // Add point light to make it glow
        const goldLight = new THREE.PointLight(0xffd700, 1, 3);
        goldLight.position.copy(gold.position);
        
        scene.add(gold);
        scene.add(goldLight);
    }
  }

  private createCoin(): THREE.Group {
    const coin = new THREE.Group();

    // Create the main coin body
    const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 32);
    const coinMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 1,
        roughness: 0.3,
        emissive: 0xffd700,
        emissiveIntensity: 0.2
    });
    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    coinMesh.rotation.x = Math.PI / 2;

    // Add details to the coin
    const detailGeometry = new THREE.TorusGeometry(0.25, 0.03, 16, 32);
    const detailMesh = new THREE.Mesh(detailGeometry, coinMaterial);
    detailMesh.rotation.x = Math.PI / 2;

    coin.add(coinMesh, detailMesh);

    // Add a point light to make it glow
    const light = new THREE.PointLight(0xffd700, 0.5, 3);
    light.position.set(0, 0, 0);
    coin.add(light);

    return coin;
  }

  private spawnCoins(): void {
    const numberOfCoins = 20;
    const minDistance = 5;

    for (let i = 0; i < numberOfCoins; i++) {
        let position: THREE.Vector3;
        let isValidPosition: boolean;

        // Keep trying until we find a valid position
        do {
            isValidPosition = true;
            position = new THREE.Vector3(
                (Math.random() - 0.5) * 80,
                1.5 + Math.random() * 2,
                (Math.random() - 0.5) * 80
            );

            // Check distance from other coins
            for (const coin of this.coins) {
                if (position.distanceTo(coin.position) < minDistance) {
                    isValidPosition = false;
                    break;
                }
            }
        } while (!isValidPosition);

        const coinModel = this.createCoin();
        coinModel.position.copy(position);

        const coin: Coin = {
            model: coinModel,
            position: position,
            isCollected: false
        };

        this.coins.push(coin);
        this.scene.add(coinModel);
    }
  }

  private collectCoin(coin: Coin, player: Player): void {
    if (coin.isCollected) return;

    coin.isCollected = true;
    player.addScore(20);

    // Play collection sound
    const sound = this.coinSound.cloneNode() as HTMLAudioElement;
    sound.play();

    // Animate coin collection
    const fadeOut = () => {
        if (!coin.model) return;

        coin.model.position.y += 0.1;
        coin.model.scale.multiplyScalar(0.9);

        if (coin.model.scale.x > 0.1) {
            requestAnimationFrame(fadeOut);
        } else {
            this.scene.remove(coin.model);
        }
    };

    fadeOut();
  }
} 