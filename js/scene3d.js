/**
 * SCENE3D.JS — Paper-Craft Packing Studio
 * Three.js (r160) tactile 3D visualization.
 * Warm kraft paper box, folding cards, terracotta ribbon, soft shadows.
 * Zero neon, zero bloom, zero floating particles, zero dark void.
 */

export class PaperCraftStudio {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationFrameId = null;

    // Studio Groups & Meshes
    this.boxGroup = null;
    this.leftFlap = null;
    this.rightFlap = null;
    this.paperCards = [];
    this.ribbonH = null;
    this.ribbonV = null;
    this.shippingTag = null;

    // Interaction & Animation Timeline State
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.progress = 0; // 0 to 1
    this.isDisposed = false;

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onResize = this.onResize.bind(this);
    this.animate = this.animate.bind(this);
  }

  isWebGLAvailable() {
    try {
      const canvas = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && 
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  init() {
    if (!this.container || !this.isWebGLAvailable() || typeof THREE === 'undefined') {
      return false;
    }

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // Scene with warm paper background and subtle depth fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xF4EFE6);
    this.scene.fog = new THREE.FogExp2(0xF4EFE6, 0.035);

    // Camera with editorial lens perspective
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    this.camera.position.set(0, 3.2, 7.0);
    this.camera.lookAt(0, 0.7, 0);

    // Soft Shadow Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.SRGBColorSpace) {
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    this.container.appendChild(this.renderer.domElement);

    // Studio Lighting (Warm daylight & soft bounce)
    this.setupLighting();

    // Floor (Warm unprinted paper surface)
    this.setupFloor();

    // Studio Craft Box & Objects
    this.setupCraftBox();
    this.setupFloatingCards();

    // Event Listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('touchmove', this.onTouchMove, { passive: true });

    // Start loop
    this.animate();
    return true;
  }

  setupLighting() {
    // Ambient light: warm diffuse paper studio
    const ambientLight = new THREE.AmbientLight(0xFFFBF2, 1.1);
    this.scene.add(ambientLight);

    // Key Light: warm morning sun angle
    const keyLight = new THREE.DirectionalLight(0xFFF1DE, 1.8);
    keyLight.position.set(4, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0004;
    this.scene.add(keyLight);

    // Fill Light: soft paper reflection
    const fillLight = new THREE.DirectionalLight(0xEAE3D6, 0.8);
    fillLight.position.set(-5, 3, -3);
    this.scene.add(fillLight);
  }

  setupFloor() {
    const floorGeo = new THREE.PlaneGeometry(35, 35);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xF4EFE6,
      roughness: 0.96,
      metalness: 0.02
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Fine grid floor guide (1px hairline aesthetic)
    const gridHelper = new THREE.GridHelper(16, 16, 0xD8D0C2, 0xE7E0D4);
    gridHelper.position.y = 0.002;
    this.scene.add(gridHelper);
  }

  setupCraftBox() {
    this.boxGroup = new THREE.Group();
    this.boxGroup.position.set(0, 0, 0);

    const kraftMat = new THREE.MeshStandardMaterial({
      color: 0xCBB59D,
      roughness: 0.88,
      metalness: 0.05
    });

    const kraftInnerMat = new THREE.MeshStandardMaterial({
      color: 0xB8A086,
      roughness: 0.92,
      side: THREE.DoubleSide
    });

    const boxWidth = 2.4;
    const boxHeight = 1.35;
    const boxDepth = 1.8;

    // Main Box Base
    const baseGeo = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
    const baseMesh = new THREE.Mesh(baseGeo, kraftMat);
    baseMesh.position.y = boxHeight / 2;
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    this.boxGroup.add(baseMesh);

    // Left Folding Flap
    const flapWidth = boxWidth / 2 + 0.02;
    const flapGeo = new THREE.PlaneGeometry(flapWidth, boxDepth);
    flapGeo.translate(flapWidth / 2, 0, 0); // Hinge anchor at left

    this.leftFlap = new THREE.Mesh(flapGeo, kraftInnerMat);
    this.leftFlap.position.set(-boxWidth / 2, boxHeight, 0);
    this.leftFlap.rotation.z = Math.PI * 0.45; // Start open
    this.leftFlap.rotation.x = -Math.PI / 2;
    this.leftFlap.castShadow = true;
    this.boxGroup.add(this.leftFlap);

    // Right Folding Flap
    const rightFlapGeo = new THREE.PlaneGeometry(flapWidth, boxDepth);
    rightFlapGeo.translate(-flapWidth / 2, 0, 0); // Hinge anchor at right

    this.rightFlap = new THREE.Mesh(rightFlapGeo, kraftInnerMat);
    this.rightFlap.position.set(boxWidth / 2, boxHeight, 0);
    this.rightFlap.rotation.z = -Math.PI * 0.45; // Start open
    this.rightFlap.rotation.x = -Math.PI / 2;
    this.rightFlap.castShadow = true;
    this.boxGroup.add(this.rightFlap);

    // Terracotta Ribbons (Initially hidden / scale 0)
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xB5472B,
      roughness: 0.75,
      metalness: 0.1
    });

    const ribHGeo = new THREE.BoxGeometry(boxWidth + 0.04, 0.02, 0.16);
    this.ribbonH = new THREE.Mesh(ribHGeo, ribbonMat);
    this.ribbonH.position.set(0, boxHeight + 0.02, 0);
    this.ribbonH.scale.set(0, 1, 1);
    this.boxGroup.add(this.ribbonH);

    const ribVGeo = new THREE.BoxGeometry(0.16, 0.02, boxDepth + 0.04);
    this.ribbonV = new THREE.Mesh(ribVGeo, ribbonMat);
    this.ribbonV.position.set(0, boxHeight + 0.02, 0);
    this.ribbonV.scale.set(1, 1, 0);
    this.boxGroup.add(this.ribbonV);

    // Shipping Tag (settles on top)
    const tagGeo = new THREE.BoxGeometry(0.55, 0.015, 0.4);
    const tagMat = new THREE.MeshStandardMaterial({
      color: 0xFDFBF7,
      roughness: 0.9,
      metalness: 0.0
    });
    this.shippingTag = new THREE.Mesh(tagGeo, tagMat);
    this.shippingTag.position.set(0.3, boxHeight + 1.2, 0.2);
    this.shippingTag.rotation.set(0.2, 0.15, 0);
    this.shippingTag.visible = false;
    this.boxGroup.add(this.shippingTag);

    this.scene.add(this.boxGroup);
  }

  setupFloatingCards() {
    // 3 Curated flat paper cards drifting gently into the box
    const cardData = [
      { color: 0xFDFBF7, w: 0.8, h: 0.6, startPos: [-0.6, 3.8, 0.1], rotSpeed: 0.01 },
      { color: 0xEAE3D6, w: 0.7, h: 0.5, startPos: [0.5, 4.4, -0.2], rotSpeed: -0.012 },
      { color: 0x5A6351, w: 0.6, h: 0.4, startPos: [0.0, 5.0, 0.2], rotSpeed: 0.008 }
    ];

    cardData.forEach((data, index) => {
      const geo = new THREE.BoxGeometry(data.w, 0.01, data.h);
      const mat = new THREE.MeshStandardMaterial({
        color: data.color,
        roughness: 0.85
      });
      const card = new THREE.Mesh(geo, mat);
      card.position.set(...data.startPos);
      card.castShadow = true;
      card.userData = {
        startY: data.startPos[1],
        targetY: 0.5 + (index * 0.04),
        rotSpeed: data.rotSpeed,
        delayProgress: index * 0.12
      };
      this.paperCards.push(card);
      this.scene.add(card);
    });
  }

  updateProgress(percentage) {
    this.progress = Math.min(100, Math.max(0, percentage)) / 100;
  }

  onMouseMove(e) {
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;
    this.mouse.targetX = (e.clientX - halfX) / halfX;
    this.mouse.targetY = (e.clientY - halfY) / halfY;
  }

  onTouchMove(e) {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    const halfX = window.innerWidth / 2;
    const halfY = window.innerHeight / 2;
    this.mouse.targetX = (touch.clientX - halfX) / halfX;
    this.mouse.targetY = (touch.clientY - halfY) / halfY;
  }

  onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    if (this.isDisposed) return;
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Smooth Parallax Interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.04;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.04;

    this.camera.position.x = this.mouse.x * 0.7;
    this.camera.position.y = 3.2 - (this.mouse.y * 0.4);
    this.camera.lookAt(0, 0.7, 0);

    // Box Gentle Idle Sway
    if (this.boxGroup) {
      this.boxGroup.rotation.y = Math.sin(Date.now() * 0.0008) * 0.05 + (this.mouse.x * 0.1);
    }

    // Timeline Phase 1 (0 to 45%): Paper cards drop gently into box
    this.paperCards.forEach(card => {
      const u = card.userData;
      if (this.progress > u.delayProgress) {
        const fallT = Math.min(1, (this.progress - u.delayProgress) / 0.35);
        card.position.y = u.startY + (u.targetY - u.startY) * fallT;
        card.rotation.y += u.rotSpeed;
        card.rotation.z = Math.sin(Date.now() * 0.003) * 0.08 * (1 - fallT);
      }
    });

    // Timeline Phase 2 (45% to 75%): Box flaps close shut
    if (this.leftFlap && this.rightFlap) {
      if (this.progress >= 0.45) {
        const closeT = Math.min(1, (this.progress - 0.45) / 0.25);
        // Fold flat
        this.leftFlap.rotation.z = (Math.PI * 0.45) * (1 - closeT);
        this.rightFlap.rotation.z = (-Math.PI * 0.45) * (1 - closeT);
      }
    }

    // Timeline Phase 3 (75% to 92%): Terracotta ribbon binds box
    if (this.ribbonH && this.ribbonV) {
      if (this.progress >= 0.75) {
        const ribbonT = Math.min(1, (this.progress - 0.75) / 0.15);
        this.ribbonH.scale.x = ribbonT;
        this.ribbonV.scale.z = ribbonT;
      }
    }

    // Timeline Phase 4 (90% to 100%): Shipping Tag drops, tactile bounce
    if (this.shippingTag) {
      if (this.progress >= 0.88) {
        this.shippingTag.visible = true;
        const tagT = Math.min(1, (this.progress - 0.88) / 0.10);
        this.shippingTag.position.y = 1.35 + 0.03 + (1 - tagT) * 0.8;
      }
    }

    // Final Tactile Bounce when fully sealed (>= 96%)
    if (this.progress >= 0.96 && this.boxGroup) {
      const bounceT = (this.progress - 0.96) / 0.04;
      const bounceOffset = Math.sin(bounceT * Math.PI) * -0.06;
      this.boxGroup.position.y = bounceOffset;
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.isDisposed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('touchmove', this.onTouchMove);

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}
