import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const SKY_COLOR = 0x08111f;

class CityRenderer {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.onSelectionChange = options.onSelectionChange ?? (() => {});
    this.onHoverChange = options.onHoverChange ?? (() => {});
    this.onTourStateChange = options.onTourStateChange ?? (() => {});
    this.onTourBuildingFocus = options.onTourBuildingFocus ?? (() => {});
    this.onDependencyOverlayChange = options.onDependencyOverlayChange ?? (() => {});
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SKY_COLOR);
    this.scene.fog = new THREE.Fog(SKY_COLOR, 80, 240);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    this.cityGroup = new THREE.Group();
    this.dependencyGroup = new THREE.Group();
    this.packageDependencyGroup = new THREE.Group();
    this.localDependencyGroup = new THREE.Group();
    this.pickableMeshes = [];
    this.buildingMeshByFullName = new Map();
    this.packageMeshByName = new Map();
     this.dependencyData = { packageEdges: [], typeEdges: [] };
     this.dependencyOverlayEnabled = false;
     this.showPackageDependencyArches = true;
     this.showTypeDependencyArches = true;
     this.activeHighlight = null;
     this.lockedSelectionMesh = null;
     this.lastSelectedBuildingMesh = null; // Track building for arch visibility
     this.selectionMarker = null;
     this.archMetadata = new Map(); // Map arch line objects to metadata
     this.pointerPosition = { x: 0, y: 0 };
     this.mouse = new THREE.Vector2();
     this.raycaster = new THREE.Raycaster();
     this.cameraAnimationToken = 0;
     this.activeTourToken = 0;
     this.isTourRunning = false;

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

    // Allow the canvas to receive keyboard focus for navigation shortcuts.
    this.renderer.domElement.tabIndex = 0;
    this.renderer.domElement.setAttribute('aria-label', '3D city viewport');
  }

  initializeScene() {
    this.scene.add(this.cityGroup);
    this.dependencyGroup.add(this.packageDependencyGroup);
    this.dependencyGroup.add(this.localDependencyGroup);
    this.scene.add(this.dependencyGroup);

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

    this.renderer.domElement.addEventListener('pointerleave', () => {
      this.onHoverChange(null);
      if (!this.lockedSelectionMesh) {
        this.onSelectionChange(null);
      }
    });

    this.renderer.domElement.addEventListener('click', event => {
      this.updatePointer(event);
      this.updateHoverSelection(true);
    });

    this.renderer.domElement.addEventListener('dblclick', event => {
      this.updatePointer(event);
      this.focusPickedMesh();
    });

    this.renderer.domElement.addEventListener('pointerdown', () => {
      this.stopFlythroughTour({ preserveSelection: true });
      this.renderer.domElement.focus();
    });

    this.renderer.domElement.addEventListener('wheel', () => {
      this.stopFlythroughTour({ preserveSelection: true });
    }, { passive: true });

    this.renderer.domElement.addEventListener('keydown', event => {
      this.handleKeyboardNavigation(event);
    });
  }

  updatePointer(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerPosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateHoverSelection(lockSelection) {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Check for building/plateau hits first
    const hit = this.raycaster.intersectObjects(this.pickableMeshes, false)[0];
    const hitMesh = hit?.object ?? null;

    // Check for arch hits (lines)
    const allArches = [
      ...this.packageDependencyGroup.children,
      ...this.localDependencyGroup.children
    ];
    const archHits = this.raycaster.intersectObjects(allArches, false);
    const archHit = archHits.length > 0 ? archHits[0].object : null;

    // If we hit an arch, show arch tooltip
    if (archHit && this.archMetadata.has(archHit)) {
      const archData = this.archMetadata.get(archHit);
      this.onHoverChange({
        point: this.pointerPosition,
        data: archData,
        isArch: true,
        mesh: archHit
      });
      return;
    }

    this.resetMeshScales();

    if (lockSelection) {
      if (!hitMesh) {
        this.onHoverChange(null);
        this.clearSelectedMesh();
        return;
      }

      this.emitHover(hitMesh);
      this.selectMesh(hitMesh);
      return;
    }

    if (this.lockedSelectionMesh) {
      this.emitHover(hitMesh);
      this.lockedSelectionMesh.scale.set(1.04, 1.02, 1.04);
      return;
    }

    if (!hitMesh) {
      this.onHoverChange(null);
      this.onSelectionChange(null);
      return;
    }

    hitMesh.scale.set(1.04, 1.02, 1.04);
    this.emitHover(hitMesh);
    this.onSelectionChange(hitMesh.userData.selection);
  }

  emitHover(mesh) {
    if (!mesh) {
      this.onHoverChange(null);
      return;
    }

    this.onHoverChange({
      point: this.pointerPosition,
      data: mesh.userData.hoverData ?? null,
      selection: mesh.userData.selection ?? null,
      mesh: mesh
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setTourRunning(isRunning) {
    if (this.isTourRunning === isRunning) {
      return;
    }

    this.isTourRunning = isRunning;
    this.onTourStateChange(isRunning);
  }

  cancelCameraAnimation() {
    this.cameraAnimationToken += 1;
  }

  animateCameraTo(position, target, options = {}) {
    const { duration = 900 } = options;
    this.cancelCameraAnimation();
    const token = this.cameraAnimationToken;

    const startPosition = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const endPosition = position.clone();
    const endTarget = target.clone();

    return new Promise(resolve => {
      const startTime = performance.now();

      const step = now => {
        if (token !== this.cameraAnimationToken) {
          resolve(false);
          return;
        }

        const progress = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);

        this.camera.position.lerpVectors(startPosition, endPosition, eased);
        this.controls.target.lerpVectors(startTarget, endTarget, eased);
        this.controls.update();

        if (progress < 1) {
          requestAnimationFrame(step);
          return;
        }

        resolve(true);
      };

      requestAnimationFrame(step);
    });
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

    // Track building selections separately for arch visibility
    if (mesh.userData.typeKey !== 'PLATEAU') {
      this.lastSelectedBuildingMesh = mesh;
    }

    mesh.scale.set(1.04, 1.02, 1.04);
    this.updateSelectionMarker(mesh);
    this.onSelectionChange(mesh.userData.selection);
    this.applyDependencyOverlay();

    if (focusCamera) {
      this.focusOnMesh(mesh);
    }
  }

  clearSelectedMesh() {
    this.lockedSelectionMesh = null;
    this.lastSelectedBuildingMesh = null; // Clear building tracking on escape
    this.clearSelectionMarker();
    this.resetMeshScales();
    this.onHoverChange(null);
    this.onSelectionChange(null);
    this.applyDependencyOverlay();
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
    this.dependencyData = cityscape.dependencies ?? { packageEdges: [], typeEdges: [] };

    for (const plateau of cityscape.plateaus ?? []) {
      const plateauMesh = this.createPlateau(plateau);
      this.cityGroup.add(plateauMesh);
      this.packageMeshByName.set(plateau.name, plateauMesh);
    }

    for (const building of cityscape.buildings ?? []) {
      const buildingMesh = this.createBuilding(building);
      this.cityGroup.add(buildingMesh);
      this.buildingMeshByFullName.set(building.fullName, buildingMesh);
    }

    this.applyDependencyOverlay();
    this.focusCity();
  }

  setDependencyOverlayEnabled(enabled) {
    this.setDependencyOverlayOptions({ enabled });
  }

  setDependencyOverlayOptions(options = {}) {
    if (Object.prototype.hasOwnProperty.call(options, 'enabled')) {
      this.dependencyOverlayEnabled = Boolean(options.enabled);
    }
    if (Object.prototype.hasOwnProperty.call(options, 'showPackageEdges')) {
      this.showPackageDependencyArches = Boolean(options.showPackageEdges);
    }
    if (Object.prototype.hasOwnProperty.call(options, 'showTypeEdges')) {
      this.showTypeDependencyArches = Boolean(options.showTypeEdges);
    }
    this.applyDependencyOverlay();
  }

  applyDependencyOverlay() {
    this.clearDependencyGroup(this.packageDependencyGroup);
    this.clearDependencyGroup(this.localDependencyGroup);

    if (!this.dependencyOverlayEnabled) {
      return;
    }

    if (this.showPackageDependencyArches) {
      this.renderPackageDependencyHighways();
    }
    if (this.showTypeDependencyArches) {
      this.renderLocalDependencyStreets();
    }

    this.onDependencyOverlayChange(this.getDependencyOverlayRenderState());
  }

  getDependencyOverlayRenderState() {
    return {
      enabled: this.dependencyOverlayEnabled,
      showPackageEdges: this.showPackageDependencyArches,
      showTypeEdges: this.showTypeDependencyArches,
      renderedPackageArches: this.packageDependencyGroup.children.length,
      renderedTypeArches: this.localDependencyGroup.children.length
    };
  }

  renderPackageDependencyHighways() {
    const packageEdges = [...(this.dependencyData?.packageEdges ?? [])]
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 220);

    for (const edge of packageEdges) {
      const sourceMesh = this.packageMeshByName.get(edge.source);
      const targetMesh = this.packageMeshByName.get(edge.target);
      if (!sourceMesh || !targetMesh) {
        continue;
      }

      const source = this.getMeshTopCenter(sourceMesh);
      const target = this.getMeshTopCenter(targetMesh);
      const complexity = edge.complexity ?? 0;
      const color = this.dependencyColorForComplexity(complexity, false);
      const opacity = THREE.MathUtils.clamp(0.12 + Math.log1p(edge.weight ?? 1) * 0.22, 0.18, 0.72);
      const arcHeightFactor = THREE.MathUtils.clamp(0.22 + Math.log1p(edge.weight ?? 1) * 0.06, 0.22, 0.55);
      const arch = this.createDependencyArch(source, target, {
        color,
        opacity,
        arcHeightFactor,
        segments: 26,
        renderOrder: 18,
        sourceName: edge.source,
        targetName: edge.target,
        weight: edge.weight ?? 1,
        type: 'package-dependency'
      });

      this.packageDependencyGroup.add(arch);
    }
  }

  renderLocalDependencyStreets() {
    // Use the last selected building for arch visibility
    // This allows arches to persist even when clicking on a plateau
    const buildingMesh = this.lastSelectedBuildingMesh;
    if (!buildingMesh) {
      return;
    }

    const typeEdges = this.dependencyData?.typeEdges ?? [];
    const selectedType = buildingMesh.userData.selection?.fullName ?? null;

    if (!selectedType) {
      return;
    }

    let localEdges;
    localEdges = typeEdges
      .filter(edge => edge.source === selectedType || edge.target === selectedType)
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
      .slice(0, 120);

    for (const edge of localEdges) {
      const sourceMesh = this.buildingMeshByFullName.get(edge.source);
      const targetMesh = this.buildingMeshByFullName.get(edge.target);
      if (!sourceMesh || !targetMesh) {
        continue;
      }

       const source = this.getMeshTopCenter(sourceMesh);
       const target = this.getMeshTopCenter(targetMesh);

       const isOutgoing = edge.source === selectedType;
       const color = isOutgoing ? 0x38bdf8 : 0xf59e0b;
       const relationType = isOutgoing ? 'imports' : 'imported-by';

       const arch = this.createDependencyArch(source, target, {
         color,
         opacity: 0.92,
         arcHeightFactor: 0.2,
         segments: 18,
         renderOrder: 24,
         sourceName: edge.source,
         targetName: edge.target,
         weight: edge.weight ?? 1,
         type: relationType
       });
       this.localDependencyGroup.add(arch);
    }
  }

  createDependencyArch(source, target, options = {}) {
    const {
      color = 0x60a5fa,
      opacity = 0.6,
      arcHeightFactor = 0.3,
      segments = 20,
      renderOrder = 20,
      sourceName = 'Unknown',
      targetName = 'Unknown',
      weight = 1,
      type = 'dependency'
    } = options;

    const distance = source.distanceTo(target);
    const arcHeight = THREE.MathUtils.clamp(distance * arcHeightFactor, 1.8, 36);
    const mid = source.clone().add(target).multiplyScalar(0.5);
    mid.y += arcHeight;

    const curve = new THREE.QuadraticBezierCurve3(source, mid, target);
    const points = curve.getPoints(segments);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = renderOrder;

    // Store metadata for hover tooltips
    this.archMetadata.set(line, {
      sourceName,
      targetName,
      weight,
      type
    });

    return line;
  }

  getMeshTopCenter(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    return new THREE.Vector3(center.x, box.max.y + 0.15, center.z);
  }

  dependencyColorForComplexity(complexity, localMode) {
    const t = THREE.MathUtils.clamp(Math.log1p(Math.max(0, complexity)) / Math.log1p(20), 0, 1);
    if (localMode) {
      return new THREE.Color().setHSL(0.53 - t * 0.32, 0.82, 0.58).getHex();
    }
    return new THREE.Color().setHSL(0.61 - t * 0.46, 0.74, 0.56).getHex();
  }

  clearDependencyGroup(group) {
    while (group.children.length > 0) {
      const child = group.children.pop();
      // Remove arch metadata
      this.archMetadata.delete(child);
      child.geometry?.dispose?.();
      child.material?.dispose?.();
      group.remove(child);
    }
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
    mesh.userData.hoverData = {
      packageName: plateau.name,
      name: this.getPlateauDisplayName(plateau.name),
      type: 'Package plateau'
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
      fileName: building.sourceFileName,
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
    mesh.userData.hoverData = {
      packageName: building.packageName,
      name: building.name,
      type: this.formatTypeLabel(building.type)
    };
    this.pickableMeshes.push(mesh);
    return mesh;
  }

  getPlateauDisplayName(packageName) {
    if (!packageName || packageName === '(default)') {
      return '(default package)';
    }

    const segments = packageName.split('.').filter(Boolean);
    return segments.at(-1) ?? packageName;
  }

  formatTypeLabel(typeKey) {
    const labels = {
      CLASS: 'Class (Java)',
      ABSTRACT: 'Abstract class (Java)',
      INTERFACE: 'Interface (Java)',
      RECORD: 'Record (Java)',
      ENUM: 'Enum (Java)',
      KOTLIN_CLASS: 'Class (Kotlin)',
      KOTLIN_INTERFACE: 'Interface (Kotlin)',
      KOTLIN_OBJECT: 'Object (Kotlin)',
      KOTLIN_DATA_CLASS: 'Data class (Kotlin)',
      PLATEAU: 'Package plateau'
    };

    return labels[typeKey] ?? typeKey;
  }

  getCityOverviewState() {
    const box = new THREE.Box3().setFromObject(this.cityGroup);
    if (box.isEmpty()) {
      return null;
    }

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const hDim = Math.max(size.x, size.z);
    const distance = Math.max(24, hDim * 1.3);

    return {
      center,
      distance,
      position: new THREE.Vector3(
        center.x + distance * 0.8,
        center.y + distance * 0.8,
        center.z + distance * 0.8
      ),
      fogNear: distance * 1.5,
      fogFar: distance * 4.0,
      farPlane: Math.max(1000, distance * 8)
    };
  }

  getMeshTourState(mesh, index = 0, angleOffset = 0) {
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = Math.max(10, maxDim * 2.6 + 8);
    const angle = ((index % 2 === 0) ? 1 : -1) * (Math.PI / 4 + angleOffset);

    return {
      target: center.clone().add(new THREE.Vector3(0, Math.max(1.5, size.y * 0.18), 0)),
      position: new THREE.Vector3(
        center.x + Math.cos(angle) * distance,
        center.y + Math.max(distance * 0.55, size.y + 3),
        center.z + Math.sin(angle) * distance
      )
    };
  }

  getTallestBuildingMeshes(limit = 6) {
    return this.pickableMeshes
      .filter(mesh => mesh.userData.typeKey !== 'PLATEAU')
      .map(mesh => {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        return { mesh, height: size.y };
      })
      .sort((left, right) => right.height - left.height)
      .slice(0, limit)
      .map(entry => entry.mesh);
  }

  /**
   * Returns building meshes that are currently visually highlighted (not dimmed).
   * Falls back to tallest buildings when no filter is active.
   */
  getTourCandidates(limit = 8) {
    const buildings = this.pickableMeshes.filter(m => m.userData.typeKey !== 'PLATEAU');
    const dimThreshold = 0.35;
    const hasFilter = buildings.some(m => m.material.opacity < dimThreshold);

    if (hasFilter) {
      const highlighted = buildings
        .filter(m => m.material.opacity > dimThreshold)
        .map(mesh => {
          const box = new THREE.Box3().setFromObject(mesh);
          return { mesh, height: box.getSize(new THREE.Vector3()).y };
        })
        .sort((a, b) => b.height - a.height)
        .slice(0, limit)
        .map(e => e.mesh);
      if (highlighted.length > 0) {
        return highlighted;
      }
    }

    return this.getTallestBuildingMeshes(limit);
  }

  /**
   * Returns the count of currently highlighted buildings when a filter is active.
   * Returns null when no filter is active (so the button shows the generic label).
   */
  getFilteredTourCandidateCount() {
    const buildings = this.pickableMeshes.filter(m => m.userData.typeKey !== 'PLATEAU');
    const dimThreshold = 0.35;
    const hasFilter = buildings.some(m => m.material.opacity < dimThreshold);
    if (!hasFilter) {
      return null;
    }
    return buildings.filter(m => m.material.opacity > dimThreshold).length;
  }

  async startFlythroughTour(options = {}) {
    const { speedMultiplier = 1.0 } = options;
    const scale = s => Math.round(s * speedMultiplier);

    const tallestMeshes = this.getTourCandidates();
    if (tallestMeshes.length === 0) {
      return false;
    }

    this.stopFlythroughTour({ preserveSelection: true });
    const tourToken = ++this.activeTourToken;
    this.setTourRunning(true);

    try {
      const overview = this.getCityOverviewState();
      if (!overview) {
        return false;
      }

      this.scene.fog.near = overview.fogNear;
      this.scene.fog.far = overview.fogFar;
      this.camera.far = overview.farPlane;
      this.camera.updateProjectionMatrix();

      const started = await this.animateCameraTo(overview.position, overview.center, { duration: scale(1100) });
      if (!started || tourToken !== this.activeTourToken) {
        return false;
      }

      await this.sleep(scale(350));
      if (tourToken !== this.activeTourToken) {
        return false;
      }

      for (let index = 0; index < tallestMeshes.length; index += 1) {
        const mesh = tallestMeshes[index];
        this.selectMesh(mesh);
        this.onTourBuildingFocus(mesh.userData.selection ?? null);

        const firstStop = this.getMeshTourState(mesh, index, 0);
        const secondStop = this.getMeshTourState(mesh, index, 0.5);

        const reachedFirst = await this.animateCameraTo(firstStop.position, firstStop.target, { duration: scale(950) });
        if (!reachedFirst || tourToken !== this.activeTourToken) {
          return false;
        }

        await this.sleep(scale(450));
        if (tourToken !== this.activeTourToken) {
          return false;
        }

        const reachedSecond = await this.animateCameraTo(secondStop.position, secondStop.target, { duration: scale(850) });
        if (!reachedSecond || tourToken !== this.activeTourToken) {
          return false;
        }

        await this.sleep(scale(300));
        if (tourToken !== this.activeTourToken) {
          return false;
        }
      }

      this.clearSelectedMesh();
      this.onTourBuildingFocus(null);
      await this.animateCameraTo(overview.position, overview.center, { duration: scale(1200) });
      return true;
    } finally {
      if (tourToken === this.activeTourToken) {
        this.setTourRunning(false);
      }
    }
  }

  stopFlythroughTour(options = {}) {
    const { preserveSelection = true } = options;

    this.activeTourToken += 1;
    this.cancelCameraAnimation();
    this.setTourRunning(false);
    this.onTourBuildingFocus(null);

    if (!preserveSelection) {
      this.clearSelectedMesh();
    }
  }

  focusCity() {
    const overview = this.getCityOverviewState();
    if (!overview) {
      this.resetCamera();
      return;
    }

    this.stopFlythroughTour({ preserveSelection: true });
    this.camera.position.copy(overview.position);
    this.scene.fog.near = overview.fogNear;
    this.scene.fog.far  = overview.fogFar;
    this.camera.far = overview.farPlane;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(overview.center);
    this.controls.update();
  }

  resetCamera() {
    this.cancelCameraAnimation();
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
    this.stopFlythroughTour({ preserveSelection: false });
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
    this.stopFlythroughTour({ preserveSelection: false });
    this.clearSelectionMarker();
    this.clearDependencyGroup(this.packageDependencyGroup);
    this.clearDependencyGroup(this.localDependencyGroup);
    while (this.cityGroup.children.length > 0) {
      const child = this.cityGroup.children.pop();
      child.geometry.dispose();
      child.material.dispose();
      this.cityGroup.remove(child);
    }
    this.pickableMeshes = [];
    this.buildingMeshByFullName.clear();
    this.packageMeshByName.clear();
    this.dependencyData = { packageEdges: [], typeEdges: [] };
    this.dependencyOverlayEnabled = false;
    this.showPackageDependencyArches = true;
    this.showTypeDependencyArches = true;
    this.activeHighlight = null;
    this.lockedSelectionMesh = null;
    this.lastSelectedBuildingMesh = null; // Track building for arch visibility
    this.onHoverChange(null);
    this.onSelectionChange(null);
    this.onDependencyOverlayChange(this.getDependencyOverlayRenderState());
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

    this.stopFlythroughTour({ preserveSelection: true });
    const focusState = this.getMeshTourState(mesh, 0, 0.18);
    this.animateCameraTo(focusState.position, focusState.target, { duration: 700 });
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

  handleKeyboardNavigation(event) {
    const key = event.key.toLowerCase();

    // Handle Escape separately before controls check since it should work anytime
    if (key === 'escape') {
      this.clearSelectedMesh();
      event.preventDefault();
      return;
    }

    if (!this.controls) {
      return;
    }

    const panStep = event.shiftKey ? 4 : 2;
    const rotateStep = THREE.MathUtils.degToRad(6);
    let handled = true;

    switch (key) {
      case 'arrowup':
      case 'w':
        this.panBy(0, -panStep);
        break;
      case 'arrowdown':
      case 's':
        this.panBy(0, panStep);
        break;
      case 'arrowleft':
      case 'a':
        this.panBy(-panStep, 0);
        break;
      case 'arrowright':
      case 'd':
        this.panBy(panStep, 0);
        break;
      case 'q':
        this.controls.rotateLeft(rotateStep);
        break;
      case 'e':
        this.controls.rotateLeft(-rotateStep);
        break;
      case '+':
      case '=':
        this.zoomByFactor(0.9);
        break;
      case '-':
      case '_':
        this.zoomByFactor(1.1);
        break;
      case 'r':
      case '0':
        this.resetCamera();
        break;
      case 'f':
        this.focusCity();
        break;
      default:
        handled = false;
    }

    if (!handled) {
      return;
    }

    this.stopFlythroughTour({ preserveSelection: true });
    event.preventDefault();
    this.controls.update();
  }

  panBy(dx, dz) {
    const delta = new THREE.Vector3(dx, 0, dz);
    this.camera.position.add(delta);
    this.controls.target.add(delta);
  }

  zoomByFactor(factor) {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const currentDistance = offset.length();
    const nextDistance = THREE.MathUtils.clamp(currentDistance * factor, 8, 1200);
    offset.setLength(nextDistance);
    this.camera.position.copy(this.controls.target.clone().add(offset));
  }

  focusPickedMesh() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickableMeshes, false)[0];
    const hitMesh = hit?.object ?? null;
    if (!hitMesh) {
      return;
    }

    this.selectMesh(hitMesh, { focusCamera: true });
  }

}

export default CityRenderer;

