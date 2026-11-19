/**
 * Three.js 3D Viewport Engines: Hero Scene & Interior CAD Walkthrough
 */

// --- HERO SCENE ---
let heroScene, heroCamera, heroRenderer, heroHabitatGroup;

function initHero3DScene() {
  const container = document.getElementById('hero-canvas-container');
  if (!container) return;

  heroScene = new THREE.Scene();
  heroCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  heroCamera.position.set(0, 15, 38);

  heroRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  heroRenderer.setSize(container.clientWidth, container.clientHeight);
  heroRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(heroRenderer.domElement);

  // Deep Space Starfield
  const starsGeometry = new THREE.BufferGeometry();
  const starCount = 1800;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 400;
  }
  starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsMaterial = new THREE.PointsMaterial({ color: 0x94a3b8, size: 1.2, transparent: true, opacity: 0.8 });
  const starfield = new THREE.Points(starsGeometry, starsMaterial);
  heroScene.add(starfield);

  // Modular Space Station Group
  heroHabitatGroup = new THREE.Group();

  // Translucent Main Pressure Hull
  const hullGeo = new THREE.CylinderGeometry(5, 5, 22, 32, 1, true);
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.85,
    roughness: 0.2,
    transparent: true,
    opacity: 0.35
  });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.rotation.z = Math.PI / 2;
  heroHabitatGroup.add(hull);

  // Artificial Gravity Torus Ring
  const torusGeo = new THREE.TorusGeometry(8.5, 0.8, 16, 64);
  const torusMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.25 });
  const torus = new THREE.Mesh(torusGeo, torusMat);
  heroHabitatGroup.add(torus);

  // Solar Array Panels
  const panelMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.95 });
  for (const s of [-1, 1]) {
    const panelGeo = new THREE.BoxGeometry(14, 0.2, 4);
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(s * 15, 0, 0);
    heroHabitatGroup.add(panel);
  }

  heroScene.add(heroHabitatGroup);

  // Lighting
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
  sunLight.position.set(30, 40, 20);
  heroScene.add(sunLight);

  const cyanRim = new THREE.PointLight(0x00f2fe, 3, 50);
  cyanRim.position.set(-15, -10, 10);
  heroScene.add(cyanRim);

  heroScene.add(new THREE.AmbientLight(0x1e293b, 1.2));

  function animateHero() {
    requestAnimationFrame(animateHero);
    if (heroHabitatGroup) {
      heroHabitatGroup.rotation.y += 0.003;
      heroHabitatGroup.rotation.x += 0.001;
    }
    heroRenderer.render(heroScene, heroCamera);
  }
  animateHero();

  window.addEventListener('resize', () => {
    if (!container) return;
    heroCamera.aspect = container.clientWidth / container.clientHeight;
    heroCamera.updateProjectionMatrix();
    heroRenderer.setSize(container.clientWidth, container.clientHeight);
  });
}

function launchDesignerWithFlyIn(onComplete) {
  if (!heroCamera) {
    if (onComplete) onComplete();
    return;
  }
  const targetZ = 16;
  const initialZ = heroCamera.position.z;
  const startTime = performance.now();
  const duration = 800;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    // Smooth ease-out
    const ease = 1 - Math.pow(1 - progress, 3);
    heroCamera.position.z = initialZ - (initialZ - targetZ) * ease;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(step);
}

// --- 3D INTERIOR CAD WALKTHROUGH SCENE ---
let walkScene, walkCamera, walkRenderer, walkControls;
let interiorModulesGroup, hullGroup, overlaysGroup;

function initWalkthrough3DScene() {
  const container = document.getElementById('r3f-3d-canvas');
  if (!container) return;

  walkScene = new THREE.Scene();
  walkScene.background = new THREE.Color(0x070B14);

  walkCamera = new THREE.PerspectiveCamera(45, (container.clientWidth || 600) / (container.clientHeight || 500), 0.1, 1000);
  walkCamera.position.set(0, 28, 38);

  walkRenderer = new THREE.WebGLRenderer({ antialias: true });
  walkRenderer.setSize(container.clientWidth || 600, container.clientHeight || 500);
  walkRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(walkRenderer.domElement);

  walkControls = new THREE.OrbitControls(walkCamera, walkRenderer.domElement);
  walkControls.enableDamping = true;
  walkControls.dampingFactor = 0.05;
  walkControls.maxDistance = 120;
  walkControls.minDistance = 5;

  // Lights
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(20, 40, 20);
  walkScene.add(dirLight);

  const ambLight = new THREE.AmbientLight(0x334155, 1.6);
  walkScene.add(ambLight);

  // Deck Floor Grid Helper
  const gridHelper = new THREE.GridHelper(GRID_COLS * 2.5, GRID_COLS, 0x00f2fe, 0x1e293b);
  gridHelper.position.y = -0.01;
  walkScene.add(gridHelper);

  interiorModulesGroup = new THREE.Group();
  hullGroup = new THREE.Group();
  overlaysGroup = new THREE.Group();
  walkScene.add(interiorModulesGroup);
  walkScene.add(hullGroup);
  walkScene.add(overlaysGroup);

  function animateWalk() {
    requestAnimationFrame(animateWalk);
    walkControls.update();

    // Pulse 3D Acoustic Rings
    overlaysGroup.children.forEach(c => {
      if (c.userData && c.userData.isAcousticRing) {
        c.scale.x += 0.015;
        c.scale.z += 0.015;
        c.material.opacity -= 0.008;
        if (c.material.opacity <= 0) {
          c.scale.set(1, 1, 1);
          c.material.opacity = 0.65;
        }
      }
    });

    walkRenderer.render(walkScene, walkCamera);
  }
  animateWalk();
}

function reset3DCamera() {
  if (!walkCamera || !walkControls) return;
  walkCamera.position.set(0, 28, 38);
  walkControls.target.set(0, 0, 0);
  walkControls.update();
}

function rebuild3DHull(shape) {
  if (!hullGroup) return;
  while (hullGroup.children.length > 0) {
    hullGroup.remove(hullGroup.children[0]);
  }

  const mat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.8,
    roughness: 0.2,
    transparent: true,
    opacity: 0.16,
    wireframe: true
  });

  if (shape === 'cylinder') {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 42, 32, 1, true), mat);
    cyl.rotation.z = Math.PI / 2;
    cyl.position.y = 3;
    hullGroup.add(cyl);
  } else if (shape === 'dome') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.position.y = 0;
    hullGroup.add(dome);
  } else if (shape === 'torus') {
    const torus = new THREE.Mesh(new THREE.TorusGeometry(22, 4.5, 16, 64), mat);
    torus.rotation.x = Math.PI / 2;
    hullGroup.add(torus);
  } else {
    // Modular Grid Box
    const box = new THREE.Mesh(new THREE.BoxGeometry(44, 10, 28), mat);
    box.position.y = 5;
    hullGroup.add(box);
  }
}

function update3DModules(zones, zonesConfig, showAcoustic, showEgress, validation) {
  if (!interiorModulesGroup || !overlaysGroup) return;

  while (interiorModulesGroup.children.length > 0) {
    interiorModulesGroup.remove(interiorModulesGroup.children[0]);
  }
  while (overlaysGroup.children.length > 0) {
    overlaysGroup.remove(overlaysGroup.children[0]);
  }

  const offsetX = -(GRID_COLS * 2.5) / 2 + 1.25;
  const offsetZ = -(GRID_ROWS * 2.5) / 2 + 1.25;

  zones.forEach(z => {
    const posX = z.x * 2.5 + offsetX;
    const posZ = z.y * 2.5 + offsetZ;

    let color = 0x475569;
    let height = 2.4;

    if (zonesConfig[z.type]) {
      color = parseInt(zonesConfig[z.type].color.replace('#', '0x'), 16);
    } else if (z.type === 'airlock') {
      color = 0x84cc16;
      height = 3.2; // Taller airlock hatch
    } else if (z.type === 'corridor') {
      color = 0x334155;
      height = 0.4; // Flat walkway
    }

    const geo = new THREE.BoxGeometry(2.3, height, 2.3);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.65,
      roughness: 0.3
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(posX, height / 2, posZ);
    interiorModulesGroup.add(mesh);

    // 3D Acoustic Wavefront Overlay
    if (showAcoustic && (z.type === 'exercise' || z.type === 'work')) {
      const ringGeo = new THREE.RingGeometry(1.5, 2.5, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: z.type === 'exercise' ? 0xf97316 : 0x8b5cf6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(posX, 0.1, posZ);
      ring.userData = { isAcousticRing: true };
      overlaysGroup.add(ring);
    }
  });

  // 3D Emergency Egress Laser Lines
  if (showEgress && validation && validation.egressPaths) {
    Object.values(validation.egressPaths).forEach(item => {
      if (item.path && item.path.length > 1) {
        const points = item.path.map(p => new THREE.Vector3(p.x * 2.5 + offsetX, 1.2, p.y * 2.5 + offsetZ));
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const lineMat = new THREE.LineBasicMaterial({
          color: item.blocked ? 0xef4444 : 0x00ffaa,
          linewidth: 3
        });
        const line = new THREE.Line(lineGeo, lineMat);
        overlaysGroup.add(line);
      }
    });
  }
}

function resize3DViewports() {
  const container = document.getElementById('r3f-3d-canvas');
  if (walkCamera && walkRenderer && container) {
    walkCamera.aspect = container.clientWidth / container.clientHeight;
    walkCamera.updateProjectionMatrix();
    walkRenderer.setSize(container.clientWidth, container.clientHeight);
  }
}
