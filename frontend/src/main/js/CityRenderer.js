import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const SKY_COLOR = 0x08111f;

class CityRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectionChange = options.onSelectionChange ?? (() => {});
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, 80, 240);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    this.cityGroup = new THREE.Group();
    this.pickableMeshes = [];
    this.activeHighlight = null;
    this.lockedSelectionMesh = null;
    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();

    this.initializeRenderer();
    this.initializeScene();
    this.attachInteractionHandlers();
    this.onWindowResize();
    this.animate();
  }

  initializeRenderer() {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }

  initializeScene() {
    this.scene.add(this.cityGroup);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(45, 65, 35);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -90;
    keyLight.shadow.camera.right = 90;
    keyLight.shadow.camera.top = 90;
    keyLight.shadow.camera.bottom = -90;
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
    rimLight.position.set(-50, 30, -40);
    this.scene.add(rimLight);


    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.target.set(0, 4, 0);
    this.resetCamera();
  }

  attachInteractionHandlers() {
    window.addEventListener('resize', () => this.onWindowResize());

    this.renderer.domElement.addEventListener('pointermove', event => {
      this.updatePointer(event);
      this.updateHoverSelection(false);
    });

    this.renderer.domElement.addEventListener('click', event => {
      this.updatePointer(event);
      this.updateHoverSelection(true);
    });
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateHoverSelection(lockSelection) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickableMeshes, false)[0];
    const hitMesh = hit?.object ?? null;

    for (const mesh of this.pickableMeshes) {
      mesh.scale.set(1, 1, 1);
    }

    if (lockSelection) {
      if (!hitMesh) {
        this.lockedSelectionMesh = null;
        this.onSelectionChange(null);
        return;
      }

      this.lockedSelectionMesh = hitMesh;
      hitMesh.scale.set(1.04, 1.02, 1.04);
      this.onSelectionChange(hitMesh.userData.selection);
      return;
    }

    if (this.lockedSelectionMesh) {
      this.lockedSelectionMesh.scale.set(1.04, 1.02, 1.04);
      return;
    }

    if (!hitMesh) {
      this.onSelectionChange(null);
      return;
    }

    hitMesh.scale.set(1.04, 1.02, 1.04);
    this.onSelectionChange(hitMesh.userData.selection);
  }

  render(cityscape) {
    this.clear();

    for (const plateau of cityscape.plateaus ?? []) {
      this.cityGroup.add(this.createPlateau(plateau));
    }

    for (const building of cityscape.buildings ?? []) {
      this.cityGroup.add(this.createBuilding(building));
    }

    this.focusCity();
  }

  createPlateau(plateau) {
    const baseEmissiveHex = 0x000000;
    const highlightEmissiveHex = new THREE.Color(plateau.color).multiplyScalar(0.25).getHex();

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(plateau.dimensions.width, plateau.dimensions.height, plateau.dimensions.depth),
      new THREE.MeshStandardMaterial({
        color: plateau.color,
        metalness: 0.08,
        roughness: 0.9,
        transparent: true,
        opacity: 0.95
      })
    );

    mesh.position.set(plateau.position.x, plateau.position.y, plateau.position.z);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    mesh.userData.typeKey = 'PLATEAU';
    mesh.userData.originalOpacity = 0.95;
    mesh.userData.originalTransparent = true;
    mesh.userData.originalEmissiveHex = baseEmissiveHex;
    mesh.userData.highlightEmissiveHex = highlightEmissiveHex;
    mesh.userData.selection = {
      kind: 'Package plateau',
      name: plateau.name,
      buildingCount: plateau.buildingCount,
      averageHeight: plateau.averageHeight.toFixed(2)
    };
    this.pickableMeshes.push(mesh);
    return mesh;
  }

  createBuilding(building) {
    const baseEmissiveHex = new THREE.Color(building.color).multiplyScalar(0.08).getHex();
    const highlightEmissiveHex = new THREE.Color(building.color).multiplyScalar(0.45).getHex();

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(building.dimensions.width, building.dimensions.height, building.dimensions.depth),
      new THREE.MeshStandardMaterial({
        color: building.color,
        metalness: 0.3,
        roughness: 0.65,
        emissive: new THREE.Color(building.color).multiplyScalar(0.08)
      })
    );

    mesh.position.set(building.position.x, building.position.y, building.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.typeKey = building.type;
    mesh.userData.originalOpacity = 1.0;
    mesh.userData.originalTransparent = false;
    mesh.userData.originalEmissiveHex = baseEmissiveHex;
    mesh.userData.highlightEmissiveHex = highlightEmissiveHex;
    mesh.userData.selection = {
      kind: 'Building',
      name: building.name,
      fullName: building.fullName,
      packageName: building.packageName,
      type: building.type,
      methods: building.metrics.methodCount,
      fields: building.metrics.fieldCount,
      constructors: building.metrics.constructorCount,
      linesOfCode: building.metrics.linesOfCode,
      complexity: building.metrics.complexity.toFixed(2),
      cyclomatic: building.metrics.cyclomatic.toFixed(2)
    };
    this.pickableMeshes.push(mesh);
    return mesh;
  }

  focusCity() {
    const box = new THREE.Box3().setFromObject(this.cityGroup);
    if (box.isEmpty()) {
      this.resetCamera();
      return;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size   = box.getSize(new THREE.Vector3());

    // Use the horizontal footprint (x/z), not the full 3-D diagonal.
    // For a flat city, building height is tiny compared to the floor plan;
    // using maxDim would push the camera hundreds of extra units back and
    // put the whole scene behind the fog wall.
    const hDim     = Math.max(size.x, size.z);
    const distance = Math.max(24, hDim * 1.3);

    this.camera.position.set(
      center.x + distance * 0.8,
      center.y + distance * 0.8,
      center.z + distance * 0.8
    );

    // Scale fog so it starts well beyond the city footprint and fades
    // gently toward the horizon — not a hard grey wall at 240 units.
    this.scene.fog.near = distance * 1.5;
    this.scene.fog.far  = distance * 4.0;

    // Bump the camera far plane so nothing gets clipped on large projects.
    this.camera.far = Math.max(1000, distance * 8);
    this.camera.updateProjectionMatrix();


    this.controls.target.copy(center);
    this.controls.update();
  }

  resetCamera() {
    this.camera.position.set(40, 42, 40);
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();
    // Restore default fog for empty / just-reset state.
    if (this.scene.fog) {
      this.scene.fog.near = 80;
      this.scene.fog.far  = 240;
    }
    this.controls?.target.set(0, 4, 0);
    this.controls?.update();
  }

  reset() {
    this.clear();
    this.resetCamera();
  }

  /**
   * Highlights all meshes whose typeKey matches and dims everything else.
   * Calling with the same type again clears the filter (toggle).
   */
  highlightByType(typeKey) {
    if (this.activeHighlight === typeKey) {
      this.clearHighlight();
      return;
    }
    this.activeHighlight = typeKey;

    for (const mesh of this.pickableMeshes) {
      const isMatch = mesh.userData.typeKey === typeKey;
      mesh.material.transparent = true;

      if (isMatch) {
        mesh.material.opacity = 1.0;
        mesh.material.emissive.setHex(mesh.userData.highlightEmissiveHex);
      } else {
        mesh.material.opacity = 0.12;
        mesh.material.emissive.setHex(0x000000);
      }
      mesh.material.needsUpdate = true;
    }
  }

  clearHighlight() {
    this.activeHighlight = null;
    for (const mesh of this.pickableMeshes) {
      mesh.material.transparent = mesh.userData.originalTransparent;
      mesh.material.opacity = mesh.userData.originalOpacity;
      mesh.material.emissive.setHex(mesh.userData.originalEmissiveHex);
      mesh.material.needsUpdate = true;
    }
  }

  clear() {
    while (this.cityGroup.children.length > 0) {
      const child = this.cityGroup.children.pop();
      child.geometry.dispose();
      child.material.dispose();
      this.cityGroup.remove(child);
    }
    this.pickableMeshes = [];
    this.activeHighlight = null;
    this.lockedSelectionMesh = null;
    this.onSelectionChange(null);
  }

  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

export default CityRenderer;

