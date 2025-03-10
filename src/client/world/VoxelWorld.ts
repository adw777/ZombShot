import * as THREE from 'three';
import { SimplexNoise } from 'three/addons/math/SimplexNoise.js';
import { Chunk } from './Chunk';
import { Player } from '../entities/Player';

interface HealthBooster {
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
  private healthBoosters: HealthBooster[] = [];
  private healthBoosterSound: HTMLAudioElement;
  private skybox: THREE.Mesh | null = null;
  private moon: THREE.Mesh | null = null;
  private stars: THREE.Points | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.chunkSize = 16; // 16x16x16 voxels per chunk
    this.renderDistance = 4; // Number of chunks to render in each direction
    this.noise = new SimplexNoise();
    this.healthBoosterSound = new Audio('/sounds/health_pickup.mp3');
    this.healthBoosterSound.volume = 0.3;
    this.initialize();
  }

  public async initialize(): Promise<void> {
    // Create night sky with stars and moon
    this.createNightSky();
    
    // Add buildings
    this.generateSpookyBuildings();

    // Add spooky elements
    this.generateSpookyElements(this.scene);

    // Setup lighting
    this.setupLighting();

    // Add bounty gold
    this.generateBountyGold(this.scene);

    this.spawnHealthBoosters();
  }

  private createNightSky(): void {
    // Create night sky dome
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    const skyMaterial = new THREE.MeshBasicMaterial({
      color: 0x000008, // Very dark blue
      side: THREE.BackSide
    });
    this.skybox = new THREE.Mesh(skyGeometry, skyMaterial);
    this.scene.add(this.skybox);

    // Add stars
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 490; // Just inside the skybox
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = radius * Math.cos(phi);
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    
    // Create varying star sizes for more realism
    const starSizes = new Float32Array(starCount);
    for (let i = 0; i < starCount; i++) {
      // Mostly small stars with a few brighter ones
      starSizes[i] = Math.random() < 0.9 ? Math.random() * 0.8 + 0.1 : Math.random() * 1.5 + 0.8;
    }
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      sizeAttenuation: false,
      vertexColors: false,
      size: 1,
      opacity: 1,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);

    // Create multiple star layers for depth
    this.createStarLayer(4000, 490, 0.05, 0.4, 0.8); // Many distant subtle stars
    this.createStarLayer(2000, 480, 0.1, 0.5, 0.9);  // Medium stars
    this.createStarLayer(500, 470, 0.2, 0.6, 0.95);  // Fewer closer stars
    this.createStarLayer(50, 460, 0.4, 0.8, 1.0);    // A few bright stars
  }
  
  private createStarLayer(count: number, radius: number, minSize: number, maxSize: number, maxOpacity: number): void {
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(count * 3);
    const starColors = new Float32Array(count * 3);
    
    // Create star positions in a hemisphere (mostly above horizon)
    for (let i = 0; i < count * 3; i += 3) {
      // Use a hemisphere distribution to concentrate stars above
      const theta = Math.random() * Math.PI * 2;
      // Use modified phi distribution to focus more stars above horizon
      const phi = Math.acos(Math.random() * 0.8 + 0.2);
      
      starPositions[i] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = radius * Math.cos(phi);
      
      // Vary star colors slightly (from blue-white to yellow-white)
      const colorVariation = Math.random();
      if (colorVariation < 0.3) {
        // Bluish stars (10%)
        starColors[i] = 0.8 + Math.random() * 0.2;      // R
        starColors[i + 1] = 0.8 + Math.random() * 0.2;  // G
        starColors[i + 2] = 1.0;                        // B
      } else if (colorVariation < 0.6) {
        // White stars (30%)
        starColors[i] = 1.0;
        starColors[i + 1] = 1.0;
        starColors[i + 2] = 1.0;
      } else if (colorVariation < 0.9) {
        // Yellowish stars (30%)
        starColors[i] = 1.0;
        starColors[i + 1] = 0.9 + Math.random() * 0.1;
        starColors[i + 2] = 0.7 + Math.random() * 0.2;
      } else {
        // Reddish stars (10%)
        starColors[i] = 1.0;
        starColors[i + 1] = 0.6 + Math.random() * 0.2;
        starColors[i + 2] = 0.6 + Math.random() * 0.2;
      }
    }
    
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
    
    // Create varying star sizes for more realism
    const starSizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Subtle size variation within the layer's range
      starSizes[i] = minSize + Math.random() * (maxSize - minSize);
    }
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));
    
    const starMaterial = new THREE.PointsMaterial({
      size: 1,
      sizeAttenuation: false,
      vertexColors: true,
      opacity: maxOpacity,
      transparent: true,
      blending: THREE.AdditiveBlending
    });
    
    const starLayer = new THREE.Points(starGeometry, starMaterial);
    
    // Add subtle twinkling animation to this layer
    if (maxSize > 0.3) {
      const animate = () => {
        const time = Date.now() * 0.0001;
        const sizes = starGeometry.getAttribute('size');
        
        for (let i = 0; i < count; i++) {
          if (Math.random() < 0.01) { // Only animate some stars each frame
            const origSize = starSizes[i];
            const twinkle = Math.sin(time + i) * 0.3 + 0.7;
            sizes.setX(i, origSize * twinkle);
          }
        }
        
        sizes.needsUpdate = true;
        requestAnimationFrame(animate);
      };
      animate();
    }
    
    this.scene.add(starLayer);
    
    // Store main layer in class property for potential updates
    if (count === 2000) {
      this.stars = starLayer;
    }
    
    // Add a moon
    const moonGeometry = new THREE.SphereGeometry(15, 32, 32);
    const moonTexture = new THREE.TextureLoader();
    const moonMaterial = new THREE.MeshBasicMaterial({
      color: 0xccccff, // Slightly blue-tinted moon
      // emissive: 0x444455,
      // emissiveIntensity: 0.2
    });
    
    this.moon = new THREE.Mesh(moonGeometry, moonMaterial);
    this.moon.position.set(180, 140, -180);
    this.scene.add(this.moon);
    
    // Add a subtle glow around the moon
    const moonGlowGeometry = new THREE.SphereGeometry(18, 32, 32);
    const moonGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaff,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    
    const moonGlow = new THREE.Mesh(moonGlowGeometry, moonGlowMaterial);
    this.moon.add(moonGlow);
    
    // Add a soft light from the moon
    const moonLight = new THREE.PointLight(0xaaaaff, 0.8, 1000);
    moonLight.position.copy(this.moon.position);
    this.scene.add(moonLight);
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

  private generateSpookyBuildings(): void {
    // Create a larger flat ground plane with spooky texture
    const groundSize = 200;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 50, 50);
    
    // Create a custom shader material for the ground with dead grass and dust
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x332211, // Dark brownish base
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true
    });
    
    // Deform the ground slightly for an uneven look
    const vertices = groundGeometry.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      // Skip the edges to keep them flat
      const x = vertices[i];
      const z = vertices[i + 2];
      
      if (Math.abs(x) < groundSize / 2 - 5 && Math.abs(z) < groundSize / 2 - 5) {
        // Add small random displacement
        vertices[i + 1] = (Math.random() * 0.6 - 0.3) * (1 - Math.abs(x) / (groundSize / 2)) * (1 - Math.abs(z) / (groundSize / 2));
      }
    }
    
    groundGeometry.computeVertexNormals();
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    
    // Add grass patches and dead vegetation
    this.addGroundDetails(ground);
    
    // Create maze-like structure with abandoned buildings
    const buildingConfigs = [];
    const mazeSize = 10; // 10x10 grid of buildings
    const spacing = 15; // Space between buildings
    const startOffset = -mazeSize * spacing / 2;
    
    // Generate maze-like pattern with more randomness
    for (let i = 0; i < mazeSize; i++) {
      for (let j = 0; j < mazeSize; j++) {
        // Skip some positions to create paths - increased randomness
        if (Math.random() > 0.65) continue;
        
        const x = startOffset + i * spacing + (Math.random() * spacing * 0.4 - spacing * 0.2);
        const z = startOffset + j * spacing + (Math.random() * spacing * 0.4 - spacing * 0.2);
        
        // More variation in building heights and dimensions
        const height = 4 + Math.random() * 7; // Heights from 4 to 11
        const width = 3 + Math.random() * 3;
        const depth = 3 + Math.random() * 3;
        
        // Random tilt for some buildings
        const tiltX = Math.random() < 0.4 ? (Math.random() * 0.2 - 0.1) : 0;
        const tiltZ = Math.random() < 0.4 ? (Math.random() * 0.2 - 0.1) : 0;
        
        buildingConfigs.push({
          position: new THREE.Vector3(x, height/2, z),
          dimensions: new THREE.Vector3(width, height, depth),
          rotation: Math.random() * Math.PI * 2,
          tilt: new THREE.Vector2(tiltX, tiltZ),
          buildingType: Math.floor(Math.random() * 3) // Different building types
        });
      }
    }
    
    // Create buildings
    buildingConfigs.forEach(config => {
      this.createAbandonedBuilding(config);
    });
  }

  private addGroundDetails(ground: THREE.Mesh): void {
    // Add patches of dead grass
    const grassCount = 300;
    const grassGeometry = new THREE.PlaneGeometry(1, 1);
    
    for (let i = 0; i < grassCount; i++) {
      const size = 0.5 + Math.random() * 2;
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      
      // Create different colored grass/vegetation patches
      const colorValue = Math.random();
      let grassColor;
      
      if (colorValue < 0.7) {
        // Dead yellowish/brownish grass (most common)
        grassColor = new THREE.Color(
          0.3 + Math.random() * 0.2,
          0.25 + Math.random() * 0.15,
          0.05 + Math.random() * 0.1
        );
      } else if (colorValue < 0.9) {
        // Dark, dying grass
        grassColor = new THREE.Color(
          0.15 + Math.random() * 0.1,
          0.2 + Math.random() * 0.1,
          0.05 + Math.random() * 0.05
        );
      } else {
        // Rare sickly green patches
        grassColor = new THREE.Color(
          0.2 + Math.random() * 0.1,
          0.3 + Math.random() * 0.2,
          0.15 + Math.random() * 0.1
        );
      }
      
      const grassMaterial = new THREE.MeshStandardMaterial({
        color: grassColor,
        roughness: 0.9,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.5
      });
      
      const grass = new THREE.Mesh(grassGeometry, grassMaterial);
      grass.position.set(x, 0.05, z);
      grass.rotation.x = -Math.PI / 2;
      grass.rotation.z = Math.random() * Math.PI;
      grass.scale.set(size, size, size);
      this.scene.add(grass);
    }
    
    // Add dusty patches
    const dustCount = 200;
    const dustGeometry = new THREE.CircleGeometry(1, 8);
    const dustMaterial = new THREE.MeshStandardMaterial({
      color: 0x665544,
      roughness: 1.0,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < dustCount; i++) {
      const size = 1 + Math.random() * 3;
      const x = (Math.random() - 0.5) * 180;
      const z = (Math.random() - 0.5) * 180;
      
      const dust = new THREE.Mesh(dustGeometry, dustMaterial);
      dust.position.set(x, 0.02, z);
      dust.rotation.x = -Math.PI / 2;
      dust.scale.set(size, size, size);
      this.scene.add(dust);
    }
  }

  private createAbandonedBuilding(config: any): void {
    // Create the main building structure
    const buildingGeometry = new THREE.BoxGeometry(
      config.dimensions.x,
      config.dimensions.y,
      config.dimensions.z
    );
    
    // Choose a weathered building material
    let buildingColor;
    switch (config.buildingType) {
      case 0: // Concrete/gray buildings
        buildingColor = new THREE.Color(
          0.2 + Math.random() * 0.1,
          0.2 + Math.random() * 0.1,
          0.2 + Math.random() * 0.1
        );
        break;
      case 1: // Brick/red buildings
        buildingColor = new THREE.Color(
          0.35 + Math.random() * 0.1,
          0.1 + Math.random() * 0.1,
          0.05 + Math.random() * 0.05
        );
        break;
      case 2: // Wooden/brown buildings
        buildingColor = new THREE.Color(
          0.25 + Math.random() * 0.1,
          0.17 + Math.random() * 0.08,
          0.1 + Math.random() * 0.05
        );
        break;
      default:
        buildingColor = new THREE.Color(0x404040);
    }
    
    const buildingMaterial = new THREE.MeshStandardMaterial({
      color: buildingColor,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.copy(config.position);
    building.rotation.y = config.rotation;
    
    // Apply tilt for dilapidated look
    building.rotation.x = config.tilt.x;
    building.rotation.z = config.tilt.y;
    
    building.castShadow = true;
    building.receiveShadow = true;
    
    // Add collision data
    building.userData.isBuilding = true;
    
    this.scene.add(building);
    
    // Add windows and doors
    this.addBuildingDetails(building, config);
    
    // Add blood stains and spooky marks
    this.addBloodStains(building, config);
    
    // Add debris around buildings
    this.addDebrisAroundBuilding(config.position, 3);
  }

  private addBuildingDetails(building: THREE.Mesh, config: any): void {
    const buildingWidth = config.dimensions.x;
    const buildingHeight = config.dimensions.y;
    const buildingDepth = config.dimensions.z;
    
    // Add broken windows
    const windowCount = Math.floor(Math.random() * 5) + 2;
    for (let i = 0; i < windowCount; i++) {
      // Pick a side of the building
      const side = Math.floor(Math.random() * 4);
      let windowX = 0, windowY = 0, windowZ = 0;
      let windowRotY = 0;
      
      // Position window on the selected side
      switch (side) {
        case 0: // Front
          windowX = (Math.random() - 0.5) * buildingWidth * 0.7;
          windowY = Math.random() * buildingHeight * 0.7 - buildingHeight * 0.2;
          windowZ = buildingDepth / 2 + 0.01;
          windowRotY = 0;
          break;
        case 1: // Back
          windowX = (Math.random() - 0.5) * buildingWidth * 0.7;
          windowY = Math.random() * buildingHeight * 0.7 - buildingHeight * 0.2;
          windowZ = -buildingDepth / 2 - 0.01;
          windowRotY = Math.PI;
          break;
        case 2: // Left
          windowX = buildingWidth / 2 + 0.01;
          windowY = Math.random() * buildingHeight * 0.7 - buildingHeight * 0.2;
          windowZ = (Math.random() - 0.5) * buildingDepth * 0.7;
          windowRotY = Math.PI / 2;
          break;
        case 3: // Right
          windowX = -buildingWidth / 2 - 0.01;
          windowY = Math.random() * buildingHeight * 0.7 - buildingHeight * 0.2;
          windowZ = (Math.random() - 0.5) * buildingDepth * 0.7;
          windowRotY = -Math.PI / 2;
          break;
      }
      
      // Create broken window
      const windowWidth = 0.5 + Math.random() * 0.5;
      const windowHeight = 0.7 + Math.random() * 0.5;
      const windowGeometry = new THREE.PlaneGeometry(windowWidth, windowHeight);
      
      // Decide if window is broken or boarded up
      const isBroken = Math.random() < 0.6;
      const windowMaterial = isBroken 
        ? new THREE.MeshBasicMaterial({ 
            color: 0x000000, 
            side: THREE.DoubleSide,
            opacity: 0.7,
            transparent: true
          })
        : new THREE.MeshStandardMaterial({ 
            color: 0x5a3a1a, 
            side: THREE.DoubleSide,
            roughness: 1.0
          });
      
      const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
      windowMesh.position.set(windowX, windowY, windowZ);
      windowMesh.rotation.y = windowRotY;
      
      // Add window to building
      building.add(windowMesh);
      
      // Add broken glass appearance for some windows
      if (isBroken && Math.random() < 0.5) {
        // Add cracks or broken appearance
        const crackGeometry = new THREE.EdgesGeometry(windowGeometry);
        const crackMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa, opacity: 0.5, transparent: true });
        const crack = new THREE.LineSegments(crackGeometry, crackMaterial);
        windowMesh.add(crack);
      }
    }
    
    // Add door on one side (usually front)
    const doorHeight = 1.5 + Math.random() * 0.5;
    const doorWidth = 0.8 + Math.random() * 0.3;
    const doorGeometry = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const doorMaterial = new THREE.MeshStandardMaterial({ 
      color: Math.random() < 0.5 ? 0x3a2a1a : 0x2a2a2a, 
      side: THREE.DoubleSide,
      roughness: 1.0
    });
    
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    // Place door at the front or another side
    const doorSide = Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 4);
    
    switch (doorSide) {
      case 0: // Front
        door.position.set(0, -buildingHeight / 2 + doorHeight / 2, buildingDepth / 2 + 0.01);
        door.rotation.y = 0;
        break;
      case 1: // Back
        door.position.set(0, -buildingHeight / 2 + doorHeight / 2, -buildingDepth / 2 - 0.01);
        door.rotation.y = Math.PI;
        break;
      case 2: // Left
        door.position.set(buildingWidth / 2 + 0.01, -buildingHeight / 2 + doorHeight / 2, 0);
        door.rotation.y = Math.PI / 2;
        break;
      case 3: // Right
        door.position.set(-buildingWidth / 2 - 0.01, -buildingHeight / 2 + doorHeight / 2, 0);
        door.rotation.y = -Math.PI / 2;
        break;
    }
    
    // Make some doors appear broken/open
    if (Math.random() < 0.3) {
      door.rotation.y += (Math.random() * 0.7 - 0.3);
    }
    
    building.add(door);
  }

  private addBloodStains(building: THREE.Mesh, config: any): void {
    const buildingWidth = config.dimensions.x;
    const buildingHeight = config.dimensions.y;
    const buildingDepth = config.dimensions.z;
    
    // Add blood stains on walls
    const stainCount = Math.floor(Math.random() * 3) + (Math.random() < 0.3 ? 2 : 0); // Some buildings have more stains
    
    for (let i = 0; i < stainCount; i++) {
      // Pick a side of the building
      const side = Math.floor(Math.random() * 4);
      let stainX = 0, stainY = 0, stainZ = 0;
      let stainRotY = 0;
      
      // Position stain on the selected side
      switch (side) {
        case 0: // Front
          stainX = (Math.random() - 0.5) * buildingWidth * 0.9;
          stainY = (Math.random() - 0.5) * buildingHeight * 0.8;
          stainZ = buildingDepth / 2 + 0.02;
          stainRotY = 0;
          break;
        case 1: // Back
          stainX = (Math.random() - 0.5) * buildingWidth * 0.9;
          stainY = (Math.random() - 0.5) * buildingHeight * 0.8;
          stainZ = -buildingDepth / 2 - 0.02;
          stainRotY = Math.PI;
          break;
        case 2: // Left
          stainX = buildingWidth / 2 + 0.02;
          stainY = (Math.random() - 0.5) * buildingHeight * 0.8;
          stainZ = (Math.random() - 0.5) * buildingDepth * 0.9;
          stainRotY = Math.PI / 2;
          break;
        case 3: // Right
          stainX = -buildingWidth / 2 - 0.02;
          stainY = (Math.random() - 0.5) * buildingHeight * 0.8;
          stainZ = (Math.random() - 0.5) * buildingDepth * 0.9;
          stainRotY = -Math.PI / 2;
          break;
      }
      
      // Create blood stain
      const stainSize = 0.5 + Math.random() * 1.5;
      let stainShape: THREE.BufferGeometry;
      
      // Different types of stains/marks
      const stainType = Math.floor(Math.random() * 4);
      
      switch (stainType) {
        case 0: // Handprint/splatter
          stainShape = new THREE.CircleGeometry(stainSize * 0.5, 8);
          break;
        case 1: // Dripping blood
          stainShape = new THREE.PlaneGeometry(stainSize * 0.4, stainSize * 1.2);
          break;
        case 2: // Pentagram or strange symbol
          stainShape = new THREE.CircleGeometry(stainSize * 0.7, 5);
          break;
        default: // Irregular splatter
          stainShape = new THREE.PlaneGeometry(stainSize, stainSize);
          break;
      }
      
      // Blood color - varies from dark red to brownish
      const bloodColor = new THREE.Color(
        0.4 + Math.random() * 0.2,
        0.05 + Math.random() * 0.1,
        0.05 + Math.random() * 0.05
      );
      
      const stainMaterial = new THREE.MeshBasicMaterial({
        color: bloodColor,
        transparent: true,
        opacity: 0.7 + Math.random() * 0.3,
        side: THREE.DoubleSide
      });
      
      const stain = new THREE.Mesh(stainShape, stainMaterial);
      stain.position.set(stainX, stainY, stainZ);
      stain.rotation.y = stainRotY;
      
      // Random rotation for more natural look
      stain.rotation.z = Math.random() * Math.PI * 2;
      
      // Add dripping effect for some stains
      if (stainType === 1) {
        const dripsCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < dripsCount; j++) {
          const dripWidth = 0.1 + Math.random() * 0.2;
          const dripHeight = 0.3 + Math.random() * 0.8;
          const dripGeometry = new THREE.PlaneGeometry(dripWidth, dripHeight);
          const dripMaterial = new THREE.MeshBasicMaterial({
            color: bloodColor,
            transparent: true,
            opacity: 0.5 + Math.random() * 0.5,
            side: THREE.DoubleSide
          });
          
          const drip = new THREE.Mesh(dripGeometry, dripMaterial);
          drip.position.y = -stainSize * 0.8 - dripHeight / 2;
          drip.position.x = (Math.random() - 0.5) * stainSize * 0.6;
          
          stain.add(drip);
        }
      }
      
      building.add(stain);
    }
    
    // Add spooky marks/writing on some buildings
    if (Math.random() < 0.25) {
      // Choose a wall for the mark
      const side = Math.floor(Math.random() * 4);
      let markX = 0, markY = 0, markZ = 0;
      let markRotY = 0;
      
      // Position mark on the selected side
      switch (side) {
        case 0: // Front
          markX = (Math.random() - 0.5) * buildingWidth * 0.6;
          markY = (Math.random() - 0.3) * buildingHeight * 0.6;
          markZ = buildingDepth / 2 + 0.02;
          markRotY = 0;
          break;
        case 1: // Back
          markX = (Math.random() - 0.5) * buildingWidth * 0.6;
          markY = (Math.random() - 0.3) * buildingHeight * 0.6;
          markZ = -buildingDepth / 2 - 0.02;
          markRotY = Math.PI;
          break;
        case 2: // Left
          markX = buildingWidth / 2 + 0.02;
          markY = (Math.random() - 0.3) * buildingHeight * 0.6;
          markZ = (Math.random() - 0.5) * buildingDepth * 0.6;
          markRotY = Math.PI / 2;
          break;
        case 3: // Right
          markX = -buildingWidth / 2 - 0.02;
          markY = (Math.random() - 0.3) * buildingHeight * 0.6;
          markZ = (Math.random() - 0.5) * buildingDepth * 0.6;
          markRotY = -Math.PI / 2;
          break;
      }
      
      // Create spooky mark
      const markSize = 1 + Math.random() * 1.5;
      const markGeometry = new THREE.CircleGeometry(markSize * 0.7, 5);
      
      // Spooky symbol color
      const markColor = Math.random() < 0.5 
        ? new THREE.Color(0x3a0a0a) // Dark red
        : new THREE.Color(0x000000); // Black
        
      const markMaterial = new THREE.MeshBasicMaterial({
        color: markColor,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      const mark = new THREE.Mesh(markGeometry, markMaterial);
      mark.position.set(markX, markY, markZ);
      mark.rotation.y = markRotY;
      mark.rotation.z = Math.random() * Math.PI * 2;
      
      building.add(mark);
    }
  }

  private addDebrisAroundBuilding(position: THREE.Vector3, radius: number): void {
    const debrisCount = Math.floor(Math.random() * 8) + 3; // More debris for abandoned feeling
    
    for (let i = 0; i < debrisCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * radius;
      
      const x = position.x + Math.cos(angle) * distance;
      const z = position.z + Math.sin(angle) * distance;
      
      // Different types of debris
      const debrisType = Math.floor(Math.random() * 4);
      let debrisGeometry: THREE.BufferGeometry;
      
      switch (debrisType) {
        case 0: // Broken planks
          debrisGeometry = new THREE.BoxGeometry(0.7 + Math.random() * 0.5, 0.1, 0.2);
          break;
        case 1: // Small rubble pile
          debrisGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 4, 4);
          break;
        case 2: // Flat debris
          debrisGeometry = new THREE.CylinderGeometry(0.3 + Math.random() * 0.3, 0.3 + Math.random() * 0.3, 0.1, 5);
          break;
        default: // Box-shaped debris
          debrisGeometry = new THREE.BoxGeometry(0.5 + Math.random() * 0.3, 0.3 + Math.random() * 0.3, 0.5 + Math.random() * 0.3);
          break;
      }
      
      // Choose material based on type
      let debrisColor;
      if (debrisType === 0) {
        // Wood color for planks
        debrisColor = new THREE.Color(
          0.25 + Math.random() * 0.1,
          0.15 + Math.random() * 0.1,
          0.05 + Math.random() * 0.05
        );
      } else {
        // Stone/concrete color for other debris
        debrisColor = new THREE.Color(
          0.2 + Math.random() * 0.15,
          0.2 + Math.random() * 0.15,
          0.2 + Math.random() * 0.15
        );
      }
      
      const debrisMaterial = new THREE.MeshStandardMaterial({
        color: debrisColor,
        roughness: 0.9,
        metalness: 0.1
      });
      
      const debris = new THREE.Mesh(debrisGeometry, debrisMaterial);
      debris.position.set(x, 0.1 + Math.random() * 0.2, z);
      debris.rotation.set(
        Math.random() * Math.PI, 
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI
      );
      debris.castShadow = true;
      debris.receiveShadow = true;
      
      this.scene.add(debris);
    }
  }

  private addSpookyDecorations(): void {
    // Add fog
    this.scene.fog = new THREE.FogExp2(0x000011, 0.015); // Darker blue fog for night

    // Add some ground debris
    for (let i = 0; i < 80; i++) { // Increased debris count
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

    // Add some floating particles for atmosphere (fog particles)
    const particleCount = 2000; // Increased particle count
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 250;
      particlePositions[i + 1] = Math.random() * 30; // Lower height for ground fog
      particlePositions[i + 2] = (Math.random() - 0.5) * 250;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x334466, // Blueish particles for night fog
      size: 0.3,
      transparent: true,
      opacity: 0.3,
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
    for (let i = 0; i < 150; i++) { // Increased debris count
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

    // Update health boosters
    this.healthBoosters.forEach(booster => {
        if (!booster.isCollected) {
            // Check for collection
            const distanceToPlayer = booster.position.distanceTo(player.getPosition());
            if (distanceToPlayer < 1.5) {
                this.collectHealthBooster(booster, player);
            }
        }
    });
    
    // Update moon and sky
    if (this.moon) {
      // Add a very slow rotation to the moon
      this.moon.rotation.y += 0.0001;
      
      // Slightly move the moon for more dynamic feeling
      const time = Date.now() * 0.0001;
      this.moon.position.x = 180 + Math.sin(time) * 5;
      this.moon.position.y = 140 + Math.cos(time * 0.5) * 3;
    }
    
    if (this.stars) {
      // Add a very slow twinkle effect to stars
      const starSizes = this.stars.geometry.getAttribute('size');
      const positions = this.stars.geometry.getAttribute('position');
      
      for (let i = 0; i < starSizes.count; i++) {
        const time = Date.now() * 0.001;
        // Use position to create varied timing for each star
        const offset = positions.getX(i) + positions.getZ(i);
        
        // Apply sine wave to create pulsing effect at different frequencies
        const pulse = 0.3 * Math.sin(time * 0.3 + offset * 0.01) + 0.7;
        
        // Only make some stars twinkle, not all
        if (i % 5 === 0) {
          starSizes.setX(i, starSizes.getX(i) * pulse);
        }
      }
      
      starSizes.needsUpdate = true;
    }
  }

  private setupLighting(): void {
    // Darker ambient light with blue tint for more spooky night atmosphere
    const ambientLight = new THREE.AmbientLight(0x334455, 0.5); // Reduced intensity
    this.scene.add(ambientLight);

    // Enhanced moonlight effect
    const moonLight = new THREE.DirectionalLight(0x8888ff, 0.6); // Reduced intensity for darker night
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
        0x770077, // Darker magenta
        0x007777, // Darker cyan
        0x770033, // Darker pink
        0x337700, // Darker chartreuse
        0x007733, // Darker green
        0x330077  // Darker violet
    ];

    // Create point lights with different colors
    const createPointLight = (x: number, z: number, color: number) => {
        const light = new THREE.PointLight(color, 1.2, 20); // Reduced intensity and range
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

    // Add thicker fog for spooky atmosphere
    this.scene.fog = new THREE.FogExp2(0x000022, 0.04); // Denser blueish fog
  }

  private generateSpookyElements(scene: THREE.Scene): void {
    // Enhanced version with more elements
    
    // Add floating ghost lights
    for (let i = 0; i < 20; i++) { // Increased count
        const ghostLight = new THREE.PointLight(0x00ffff, 0.4, 5);
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
            // Add more complex movement
            orb.position.x += Math.sin(time * 0.5) * 0.01;
            orb.position.z += Math.cos(time * 0.3) * 0.01;
            ghostLight.position.copy(orb.position);
            requestAnimationFrame(animate);
        };
        animate();

        scene.add(ghostLight);
        scene.add(orb);
    }

    // Add spooky dead trees
    for (let i = 0; i < 30; i++) { // Increased tree count
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
        
        // Add more tilt to trees for creepier effect
        trunk.rotation.x = (Math.random() - 0.5) * 0.2;
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;

        // Add more twisted branches
        for (let j = 0; j < 6; j++) { // More branches
            const branchLength = 1 + Math.random() * 2;
            const branchGeometry = new THREE.CylinderGeometry(0.08, 0.12, branchLength);
            const branch = new THREE.Mesh(branchGeometry, trunkMaterial);
            
            branch.position.y = treeHeight * (0.5 + Math.random() * 0.4);
            // More extreme branch angles
            branch.rotation.z = (Math.random() - 0.5) * Math.PI * 0.7;
            branch.rotation.y = (j / 6) * Math.PI * 2;
            
            trunk.add(branch);
            
            // Add smaller branches to main branches
            if (Math.random() < 0.6) {
                const twigLength = 0.5 + Math.random() * 0.8;
                const twigGeometry = new THREE.CylinderGeometry(0.04, 0.06, twigLength);
                const twig = new THREE.Mesh(twigGeometry, trunkMaterial);
                
                twig.position.y = branchLength * 0.5;
                twig.position.x = 0.1;
                twig.rotation.z = (Math.random() - 0.5) * Math.PI * 0.5;
                
                branch.add(twig);
            }
        }

        scene.add(trunk);
    }

    // Add gravestones
    for (let i = 0; i < 20; i++) { // Increased count
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
        // More tilt for neglected graveyard feel
        gravestone.rotation.y = Math.random() * Math.PI * 0.3 - Math.PI * 0.15;
        gravestone.rotation.x = Math.random() * Math.PI * 0.1 - Math.PI * 0.05;
        gravestone.rotation.z = Math.random() * Math.PI * 0.1 - Math.PI * 0.05;

        scene.add(gravestone);
        
        // Add a small mound of dirt in front of some gravestones
        if (Math.random() < 0.7) {
            const moundGeometry = new THREE.SphereGeometry(0.5, 8, 6);
            const moundMaterial = new THREE.MeshStandardMaterial({
                color: 0x443322,
                roughness: 1.0
            });
            
            // Cut the bottom of the sphere to make it a mound
            moundGeometry.translate(0, 0.25, 0);
            
            const mound = new THREE.Mesh(moundGeometry, moundMaterial);
            // Position just in front of the gravestone
            const angle = gravestone.rotation.y;
            mound.position.set(
                x + Math.sin(angle) * 0.5,
                0.25,
                z + Math.cos(angle) * 0.5
            );
            
            scene.add(mound);
        }
    }
    
    // Add some scattered bones
    for (let i = 0; i < 15; i++) {
        const x = (Math.random() - 0.5) * 60;
        const z = (Math.random() - 0.5) * 60;
        
        // Different bone types
        const boneType = Math.floor(Math.random() * 3);
        let boneGeometry;
        
        switch (boneType) {
            case 0: // Long bone (femur etc)
                boneGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.6 + Math.random() * 0.4, 6);
                break;
            case 1: // Skull-like shape
                boneGeometry = new THREE.SphereGeometry(0.2, 8, 6);
                break;
            case 2: // Smaller bones
                boneGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
                break;
        }
        
        const boneMaterial = new THREE.MeshStandardMaterial({
            color: 0xdddddd,
            roughness: 0.8
        });
        
        const bone = new THREE.Mesh(boneGeometry, boneMaterial);
        bone.position.set(x, 0.1, z);
        bone.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        
        scene.add(bone);
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

  private createHealthBooster(): THREE.Group {
    const booster = new THREE.Group();

    // Create the main booster body (cross shape)
    const crossGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
    const crossMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    
    const horizontalPart = new THREE.Mesh(crossGeometry, crossMaterial);
    const verticalPart = new THREE.Mesh(crossGeometry, crossMaterial);
    verticalPart.rotation.z = Math.PI / 2;

    // Add glow effect
    const glowLight = new THREE.PointLight(0xff0000, 1, 3);
    glowLight.position.set(0, 0, 0);

    booster.add(horizontalPart, verticalPart, glowLight);

    // Add floating animation
    const animate = () => {
        if (booster.parent) {
            booster.position.y += Math.sin(Date.now() * 0.003) * 0.001;
            booster.rotation.y += 0.01;
            requestAnimationFrame(animate);
        }
    };
    animate();

    return booster;
  }

  private spawnHealthBoosters(): void {
    const numberOfBoosters = 5; // Reduced number since they're rare
    const minDistance = 20; // Increased minimum distance between boosters

    for (let i = 0; i < numberOfBoosters; i++) {
        let position: THREE.Vector3;
        let isValidPosition: boolean;

        // Keep trying until we find a valid position
        do {
            isValidPosition = true;
            position = new THREE.Vector3(
                (Math.random() - 0.5) * 160, // Doubled spawn area
                1.5 + Math.random() * 2,
                (Math.random() - 0.5) * 160
            );

            // Check distance from other boosters
            for (const booster of this.healthBoosters) {
                if (position.distanceTo(booster.position) < minDistance) {
                    isValidPosition = false;
                    break;
                }
            }
        } while (!isValidPosition);

        const boosterModel = this.createHealthBooster();
        boosterModel.position.copy(position);

        const booster: HealthBooster = {
            model: boosterModel,
            position: position,
            isCollected: false
        };

        this.healthBoosters.push(booster);
        this.scene.add(boosterModel);
    }
  }

  private collectHealthBooster(booster: HealthBooster, player: Player): void {
    if (booster.isCollected) return;

    booster.isCollected = true;
    player.addHealth(50); // Add 50% health

    // Play collection sound
    const sound = this.healthBoosterSound.cloneNode() as HTMLAudioElement;
    sound.play();

    // Animate collection
    const fadeOut = () => {
        if (!booster.model) return;

        booster.model.position.y += 0.1;
        booster.model.scale.multiplyScalar(0.9);

        if (booster.model.scale.x > 0.1) {
            requestAnimationFrame(fadeOut);
        } else {
            this.scene.remove(booster.model);
        }
    };

    fadeOut();
  }
}