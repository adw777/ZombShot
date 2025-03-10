import * as THREE from 'three';

interface VoxelType {
  color: THREE.Color;
  roughness: number;
}

export class Chunk {
  private voxels: Uint8Array;
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;
  private material: THREE.Material;
  private size: number;
  private x: number;
  private y: number;
  private z: number;
  private static voxelTypes: { [key: number]: VoxelType } = {
    0: { color: new THREE.Color(0x000000), roughness: 0.0 }, // Air (invisible)
    1: { color: new THREE.Color(0x707070), roughness: 0.8 }, // Stone (darker gray for spooky feel)
    2: { color: new THREE.Color(0x443322), roughness: 0.9 }, // Dirt (darker brown - more like dust)
    3: { color: new THREE.Color(0x334411), roughness: 0.8 }, // Dead grass (darker, brownish green)
    4: { color: new THREE.Color(0x221100), roughness: 0.7 }, // Dark soil/mud
    5: { color: new THREE.Color(0x554433), roughness: 0.9 }, // Dried leaves 
  };

  constructor(x: number, y: number, z: number, size: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.size = size;
    this.voxels = new Uint8Array(size * size * size);
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(x, y, z);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  public async generate(): Promise<void> {
    // Simple terrain generation
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const worldY = this.y + y;
          
          // Basic terrain height
          const height = Math.sin(this.x + x * 0.1) * Math.cos(this.z + z * 0.1) * 2;
          
          if (worldY < height) {
            // Determine type of underground material
            if (worldY === Math.floor(height) - 1) {
              // Surface layer - use dark soil or dead grass
              this.setVoxel(x, y, z, Math.random() < 0.7 ? 4 : 3);
            } else if (worldY > Math.floor(height) - 3) {
              // Near-surface layers - use dirt
              this.setVoxel(x, y, z, 2);
            } else {
              // Deep underground - use stone
              this.setVoxel(x, y, z, 1);
            }
          } else {
            this.setVoxel(x, y, z, 0); // Air
          }
        }
      }
    }

    this.updateGeometry();
  }

  public getVoxel(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return 0;
    }
    return this.voxels[this.getIndex(x, y, z)];
  }

  public setVoxel(x: number, y: number, z: number, value: number): void {
    if (x < 0 || x >= this.size || y < 0 || y >= this.size || z < 0 || z >= this.size) {
      return;
    }
    this.voxels[this.getIndex(x, y, z)] = value;
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + y * this.size + z * this.size * this.size;
  }

  public updateGeometry(): void {
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    // Define the faces of a cube
    const faces = [
      { dir: [ 1,  0,  0], corners: [[0, 1, 0], [0, 0, 0], [0, 1, 1], [0, 0, 1]] }, // right
      { dir: [-1,  0,  0], corners: [[1, 1, 1], [1, 0, 1], [1, 1, 0], [1, 0, 0]] }, // left
      { dir: [ 0,  1,  0], corners: [[0, 0, 1], [1, 0, 1], [0, 0, 0], [1, 0, 0]] }, // top
      { dir: [ 0, -1,  0], corners: [[0, 1, 0], [1, 1, 0], [0, 1, 1], [1, 1, 1]] }, // bottom
      { dir: [ 0,  0,  1], corners: [[1, 1, 0], [1, 0, 0], [0, 1, 0], [0, 0, 0]] }, // front
      { dir: [ 0,  0, -1], corners: [[0, 1, 1], [0, 0, 1], [1, 1, 1], [1, 0, 1]] }  // back
    ];

    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        for (let z = 0; z < this.size; z++) {
          const voxel = this.getVoxel(x, y, z);
          if (voxel) {
            const voxelType = Chunk.voxelTypes[voxel];
            
            // For each face of the cube
            for (const {dir, corners} of faces) {
              const neighbor = this.getVoxel(
                x + dir[0],
                y + dir[1],
                z + dir[2]
              );

              // If there's no neighbor on this side or neighbor is air
              if (!neighbor) {
                // Generate face vertices
                const ndx = positions.length / 3;
                for (const pos of corners) {
                  positions.push(x + pos[0], y + pos[1], z + pos[2]);
                  normals.push(...dir);
                  
                  // Add colors with increased variation for more natural, weathered look
                  const variation = (Math.random() * 0.2) - 0.1; // Greater variation range
                  const color = voxelType.color.clone();
                  color.multiplyScalar(1 + variation);
                  
                  // Add patchy darker spots to simulate decay/weathering on surface voxels
                  if (y === 0 && (voxel === 3 || voxel === 4) && Math.random() < 0.3) {
                    color.multiplyScalar(0.8); // Random darker patches
                  }
                  
                  colors.push(color.r, color.g, color.b);
                }

                // Generate face indices
                indices.push(
                  ndx, ndx + 1, ndx + 2,
                  ndx + 2, ndx + 1, ndx + 3,
                );
              }
            }
          }
        }
      }
    }

    // Update the geometry
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.setIndex(indices);
    
    this.geometry.computeBoundingSphere();
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.mesh);
  }

  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.mesh);
  }
}