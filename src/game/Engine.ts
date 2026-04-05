import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GAME_SETTINGS } from './constants';

export class GameEngine {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: PointerLockControls;
  obstacles: THREE.Mesh[] = [];

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    this.scene.fog = new THREE.Fog(0x87ceeb, 0, 200);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    this.controls = new PointerLockControls(this.camera, document.body);

    this.initLights();
    this.initMap();

    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private initLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);
  }

  private initMap() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(GAME_SETTINGS.MAP_SIZE * 2, GAME_SETTINGS.MAP_SIZE * 2);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x44aa44 });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Grid helper
    const grid = new THREE.GridHelper(GAME_SETTINGS.MAP_SIZE * 2, 50, 0x000000, 0x000000);
    (grid.material as THREE.Material).opacity = 0.2;
    (grid.material as THREE.Material).transparent = true;
    this.scene.add(grid);

    // Obstacles
    for (let i = 0; i < 40; i++) {
      const h = Math.random() * 8 + 2;
      const boxGeometry = new THREE.BoxGeometry(4, h, 4);
      const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const box = new THREE.Mesh(boxGeometry, boxMaterial);
      
      box.position.set(
        Math.random() * GAME_SETTINGS.MAP_SIZE - GAME_SETTINGS.MAP_SIZE / 2,
        h / 2,
        Math.random() * GAME_SETTINGS.MAP_SIZE - GAME_SETTINGS.MAP_SIZE / 2
      );
      this.scene.add(box);
      this.obstacles.push(box);
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  cleanup() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    this.scene.clear();
  }
}
