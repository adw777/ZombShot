import * as THREE from 'three';

export class PlayerModel {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private gunModel: THREE.Group = new THREE.Group();
    private torchLight: THREE.SpotLight = new THREE.SpotLight();
    private feet: THREE.Group = new THREE.Group();
    private isThirdPerson: boolean = false;
    private thirdPersonCamera: THREE.Camera;
    private thirdPersonDistance: number = 5;

    constructor(scene: THREE.Scene, camera: THREE.Camera) {
        this.scene = scene;
        this.camera = camera;
        this.thirdPersonCamera = camera.clone();
        this.initialize();
    }

    private initialize(): void {
        this.createGunModel();
        this.createTorchLight();
        this.createFeet();
        this.setupThirdPersonCamera();
    }

    private createGunModel(): void {
        this.gunModel = new THREE.Group();

        // Create gun body
        const gunBody = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.4),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        gunBody.position.z = -0.2;

        // Create gun handle
        const gunHandle = new THREE.Mesh(
            new THREE.BoxGeometry(0.08, 0.2, 0.08),
            new THREE.MeshStandardMaterial({ color: 0x4a4a4a })
        );
        gunHandle.position.y = -0.15;
        gunHandle.position.z = -0.1;

        // Create torch attachment
        const torchBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8),
            new THREE.MeshStandardMaterial({ color: 0x666666 })
        );
        torchBody.rotation.x = Math.PI / 2;
        torchBody.position.y = 0.05;
        torchBody.position.z = -0.15;

        this.gunModel.add(gunBody, gunHandle, torchBody);
        
        // Position the gun model in view
        this.gunModel.position.set(0.3, -0.2, -0.5);
        this.scene.add(this.gunModel);
    }

    private createTorchLight(): void {
        // Create spotlight for torch
        this.torchLight = new THREE.SpotLight(0xffffaa, 2);
        this.torchLight.angle = Math.PI / 6;
        this.torchLight.penumbra = 0.3;
        this.torchLight.decay = 1;
        this.torchLight.distance = 15;

        // Add torch light to gun model
        this.gunModel.add(this.torchLight);
        this.torchLight.position.set(0, 0.05, -0.15);
        this.torchLight.target.position.set(0, 0.05, -1);
        this.gunModel.add(this.torchLight.target);
    }

    private createFeet(): void {
        this.feet = new THREE.Group();

        // Create left foot
        const leftFoot = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.1, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        leftFoot.position.x = -0.1;

        // Create right foot
        const rightFoot = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.1, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        rightFoot.position.x = 0.1;

        this.feet.add(leftFoot, rightFoot);
        this.scene.add(this.feet);
    }

    private setupThirdPersonCamera(): void {
        this.thirdPersonCamera = this.camera.clone();
        this.thirdPersonCamera.position.set(0, 3, this.thirdPersonDistance);
    }

    public update(position: THREE.Vector3, rotation: THREE.Euler): void {
        // Update gun position and rotation
        if (!this.isThirdPerson) {
            this.gunModel.position.copy(position);
            this.gunModel.position.y -= 0.2;
            this.gunModel.rotation.copy(rotation);
        } else {
            this.gunModel.position.copy(position);
            this.gunModel.rotation.copy(rotation);
        }

        // Update feet position
        this.feet.position.copy(position);
        this.feet.position.y = 0.05;
        this.feet.rotation.y = rotation.y;

        // Update third person camera if active
        if (this.isThirdPerson) {
            const cameraOffset = new THREE.Vector3(
                0,
                3,
                this.thirdPersonDistance
            );
            cameraOffset.applyEuler(rotation);
            this.thirdPersonCamera.position.copy(position).add(cameraOffset);
            this.thirdPersonCamera.lookAt(position);
        }
    }

    public toggleView(): void {
        this.isThirdPerson = !this.isThirdPerson;
        if (this.isThirdPerson) {
            this.scene.remove(this.gunModel);
        } else {
            this.scene.add(this.gunModel);
        }
    }

    public getActiveCamera(): THREE.Camera {
        return this.isThirdPerson ? this.thirdPersonCamera : this.camera;
    }

    public animateShoot(): void {
        const recoilAmount = 0.05;
        const recoilDuration = 100;

        // Store original position
        const originalPosition = this.gunModel.position.clone();

        // Apply recoil
        this.gunModel.position.z += recoilAmount;

        // Reset position after duration
        setTimeout(() => {
            this.gunModel.position.copy(originalPosition);
        }, recoilDuration);
    }
} 