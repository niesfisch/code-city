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
    this.selectionMarker = null;
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

    this.resetMeshScales();

    if (lockSelection) {
      if (!hitMesh) {
        this.clearSelectedMesh();
        return;
      }

      this.selectMesh(hitMesh);
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

  resetMeshScales() {
    for (const mesh of this.pickableMeshes) {
      mesh.scale.set(1, 1, 1);
    }
  }

  selectMesh(mesh, options = {}) {
    const { focusCamera = false } = options;

    this.resetMeshScales();

    if (!mesh) {
      this.clearSelectedMesh();
      return;
    }

    this.lockedSelectionMesh = mesh;
    mesh.scale.set(1.04, 1.02, 1.04);
    this.updateSelectionMarker(mesh);
    this.onSelectionChange(mesh.userData.selection);

    if (focusCamera) {
      this.focusOnMesh(mesh);
    }
  }

  clearSelectedMesh() {
    this.lockedSelectionMesh = null;
    this.clearSelectionMarker();
    this.resetMeshScales();
    this.onSelectionChange(null);
  }

  updateSelectionMarker(mesh) {
    this.clearSelectionMarker();

    if (!mesh || mesh.userData.typeKey === 'PLATEAU') {
      return;
    }

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    const markerHeight = Math.max(6, Math.min(14, size.y * 0.45 + 3));
    const marker = this.createSelectionMarker(markerHeight);
    marker.position.set(center.x, box.max.y + 0.4, center.z);

    this.selectionMarker = marker;
    this.scene.add(marker);
  }

  createSelectionMarker(lineHeight) {
    const group = new THREE.Group();

    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xfbbf24,
      dashSize: 0.8,
      gapSize: 0.45,
      transparent: true,
      opacity: 0.95,
      depthTest: false
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, lineHeight, 0)
    ]);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    line.renderOrder = 1000;
    group.add(line);

    const orbMaterial = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.98,
      depthTest: false
    });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.52, 18, 18), orbMaterial);
    orb.position.set(0, lineHeight + 0.55, 0);
    orb.renderOrder = 1001;
    group.add(orb);

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.55,
      depthTest: false
    });
    const halo = new THREE.Mesh(new THREE.SphereGeometry(0.82, 18, 18), haloMaterial);
    halo.position.copy(orb.position);
    halo.renderOrder = 999;
    group.add(halo);

    group.userData.orb = orb;
    group.userData.halo = halo;
    return group;
  }

  clearSelectionMarker() {
    if (!this.selectionMarker) {
      return;
    }

    this.selectionMarker.traverse(child => {
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    });
    this.scene.remove(this.selectionMarker);
    this.selectionMarker = null;
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
    mesh.userData.rawMetrics = building.metrics;
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
      cyclomatic: building.metrics.cyclomatic.toFixed(2),
      maxMethodParameters: building.metrics.maxMethodParameters,
      staticMethodCount: building.metrics.staticMethodCount,
      innerTypeCount: building.metrics.innerTypeCount,
      commentLineCount: building.metrics.commentLineCount
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
    this.clearSelectionMarker();
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

    if (this.selectionMarker) {
      const t = performance.now() * 0.004;
      const pulse = 1 + Math.sin(t) * 0.09;
      this.selectionMarker.userData.orb.scale.setScalar(pulse);
      this.selectionMarker.userData.halo.scale.setScalar(1.05 + Math.sin(t) * 0.12);
      this.selectionMarker.userData.halo.material.opacity = 0.45 + ((Math.sin(t) + 1) * 0.08);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Search for buildings by name (case-insensitive partial match).
   * Returns matching building meshes with their selection data.
   */
  searchByName(query) {
    if (!query || !query.trim()) {
      return [];
    }
    const q = query.toLowerCase();
    return this.pickableMeshes
      .filter(mesh => mesh.userData.typeKey !== 'PLATEAU')
      .filter(mesh => {
        const name = mesh.userData.selection.name || '';
        const fullName = mesh.userData.selection.fullName || '';
        return name.toLowerCase().includes(q) || fullName.toLowerCase().includes(q);
      })
      .map(mesh => ({
        mesh,
        name: mesh.userData.selection.name,
        fullName: mesh.userData.selection.fullName,
        packageName: mesh.userData.selection.packageName,
        type: mesh.userData.selection.type
      }));
  }

  /**
   * Highlight all matching buildings and dim everything else.
   * Calling with empty array clears the search highlight.
   */
  highlightSearchResults(matchingMeshes) {
    if (!matchingMeshes || matchingMeshes.length === 0) {
      this.clearSearchHighlight();
      return;
    }

    const matchSet = new Set(matchingMeshes);

    for (const mesh of this.pickableMeshes) {
      mesh.material.transparent = true;

      if (matchSet.has(mesh)) {
        mesh.material.opacity = 1.0;
        mesh.material.emissive.setHex(mesh.userData.highlightEmissiveHex);
      } else {
        mesh.material.opacity = 0.12;
        mesh.material.emissive.setHex(0x000000);
      }
      mesh.material.needsUpdate = true;
    }
  }

  /**
   * Clear search highlighting and restore normal rendering.
   */
  clearSearchHighlight() {
    for (const mesh of this.pickableMeshes) {
      mesh.material.transparent = mesh.userData.originalTransparent;
      mesh.material.opacity = mesh.userData.originalOpacity;
      mesh.material.emissive.setHex(mesh.userData.originalEmissiveHex);
      mesh.material.needsUpdate = true;
    }
  }

  /**
   * Focus the camera on a specific mesh, with smooth zoom.
   */
  focusOnMesh(mesh) {
    if (!mesh) return;

    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Frame the object with some padding
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180); // convert vertical fov to radians
    let distance = maxDim / 2 / Math.tan(fov / 2);
    distance *= 1.8; // zoom out a bit more for context

    // Smoothly animate to the new position
    const startPos = this.camera.position.clone();
    const endPos = new THREE.Vector3(
      center.x + distance * 0.7,
      center.y + distance * 0.7,
      center.z + distance * 0.7
    );

    let progress = 0;
    const duration = 600; // ms
    const startTime = Date.now();

    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(1, elapsed / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      this.camera.position.lerpVectors(startPos, endPos, eased);
      this.controls.target.lerpVectors(this.controls.target, center, eased);
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      }
    };
    animateCamera();
  }

  /**
   * Filter building meshes by a predicate against their raw metrics.
   * Returns an array of { mesh, name, fullName, packageName, type, rawMetrics }.
   */
  filterBuildings(predicateFn) {
    return this.pickableMeshes
      .filter(mesh => mesh.userData.typeKey !== 'PLATEAU')
      .filter(mesh => {
        const raw = mesh.userData.rawMetrics;
        return raw != null && predicateFn(raw);
      })
      .map(mesh => ({
        mesh,
        name: mesh.userData.selection.name,
        fullName: mesh.userData.selection.fullName,
        packageName: mesh.userData.selection.packageName,
        type: mesh.userData.selection.type,
        rawMetrics: mesh.userData.rawMetrics
      }));
  }

  /**
   * Highlight buildings matching a metric filter and dim everything else.
   * Empty array clears the filter.
   */
  highlightByMetricFilter(matchingMeshes) {
    if (!matchingMeshes || matchingMeshes.length === 0) {
      this.clearMetricFilter();
      return;
    }
    const matchSet = new Set(matchingMeshes);
    for (const mesh of this.pickableMeshes) {
      mesh.material.transparent = true;
      if (matchSet.has(mesh)) {
        mesh.material.opacity = 1.0;
        mesh.material.emissive.setHex(mesh.userData.highlightEmissiveHex);
      } else {
        mesh.material.opacity = 0.12;
        mesh.material.emissive.setHex(0x000000);
      }
      mesh.material.needsUpdate = true;
    }
  }

  /** Restore all materials to their original state (clears any overlay). */
  clearMetricFilter() {
    for (const mesh of this.pickableMeshes) {
      mesh.material.transparent = mesh.userData.originalTransparent;
      mesh.material.opacity = mesh.userData.originalOpacity;
      mesh.material.emissive.setHex(mesh.userData.originalEmissiveHex);
      mesh.material.needsUpdate = true;
    }
  }

}

export default CityRenderer;

