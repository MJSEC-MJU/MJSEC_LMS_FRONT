import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "https://esm.sh/three@0.160.0/examples/jsm/loaders/RGBELoader.js";

const widgetRoot = document.getElementById("qr-fab");
if (!widgetRoot) {
  console.warn("[qr-widget] #qr-fab not found.");
}

const qrcodeFactory = window.qrcode;
if (widgetRoot && typeof qrcodeFactory !== "function") {
  console.warn("[qr-widget] qrcode-generator is not loaded.");
}

if (widgetRoot && typeof qrcodeFactory === "function") {
  const DEVELOPER_FIXED_URL = "https://linktr.ee/mjsec_welcome";
  const USER_DEFAULTS = {
    cutScale: 0.45,
    border: false,
  };
  const TEXTURE_SIZE = 512;
  const REVEAL_DURATION_MS = 900;
  const AUTO_ROTATE_RESUME_DELAY_MS = 900;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(18, 1, 1, 1000);
  camera.position.set(26, -8, 26);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    logarithmicDepthBuffer: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);
  widgetRoot.appendChild(renderer.domElement);

  new RGBELoader()
    .setPath("https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/")
    .load(
      "brown_photostudio_02_2k.hdr",
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        scene.environment = texture;
      },
      undefined,
      () => {
        scene.environment = null;
      },
    );

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
  keyLight.position.set(10, 15, 12);
  scene.add(keyLight);
  scene.add(new THREE.AmbientLight(0x7fa2c7, 0.4));

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.0;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableRotate = true;
  renderer.domElement.style.touchAction = "none";

  let isActivated = false;
  let revealStartAt = 0;
  let autoRotateResumeTimer = null;
  let qrRevealTrigger = null;
  let fallbackScrollHandler = null;

  const scheduleAutoRotateResume = () => {
    if (autoRotateResumeTimer) {
      clearTimeout(autoRotateResumeTimer);
      autoRotateResumeTimer = null;
    }
    autoRotateResumeTimer = window.setTimeout(() => {
      controls.autoRotate = isActivated;
      autoRotateResumeTimer = null;
    }, AUTO_ROTATE_RESUME_DELAY_MS);
  };

  controls.addEventListener("start", () => {
    controls.autoRotate = false;
  });
  controls.addEventListener("end", () => {
    scheduleAutoRotateResume();
  });

  let currentQR = null;

  function createMaskedFineNoiseTexture(density = 1.0, qrData = null, useBorder = false) {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");

    if (!ctx) return new THREE.CanvasTexture(canvas);
    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    if (!qrData) return new THREE.CanvasTexture(canvas);

    const rawCount = qrData.getModuleCount();
    const borderOffset = useBorder ? 1 : 0;
    const totalCount = rawCount + borderOffset * 2;
    const modulePx = TEXTURE_SIZE / totalCount;

    const imageData = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.random() > 1.0 - density * 0.5) {
        const alpha = Math.random() * 150;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = alpha;
      } else {
        data[i + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "black";
    for (let r = 0; r < rawCount; r++) {
      for (let c = 0; c < rawCount; c++) {
        if (qrData.isDark(r, c)) {
          const drawC = c + borderOffset;
          const drawR = r + borderOffset;
          ctx.fillRect(drawC * modulePx, drawR * modulePx, modulePx, modulePx);
        }
      }
    }
    ctx.globalCompositeOperation = "source-over";

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  function createVeinsTexture(scale = 1.0, qrData = null, useBorder = false) {
    const canvas = document.createElement("canvas");
    canvas.width = TEXTURE_SIZE;
    canvas.height = TEXTURE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return new THREE.CanvasTexture(canvas);

    ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.miterLimit = 4;
    ctx.strokeStyle = "#FFFFFF";

    function drawCrack(x, y, angle, width, life) {
      if (life <= 0 || width < 0.2) return;

      const segmentLength = 5 + Math.random() * 15;
      const x2 = x + Math.cos(angle) * segmentLength;
      const y2 = y + Math.sin(angle) * segmentLength;

      ctx.beginPath();
      ctx.lineWidth = width;
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      const jaggedness = (Math.random() - 0.5) * 1.5;
      const newAngle = angle + jaggedness;
      const newWidth = width * 0.92;
      const newLife = life - 1;

      drawCrack(x2, y2, newAngle, newWidth, newLife);

      if (Math.random() < 0.08) {
        const splitDir = Math.random() < 0.5 ? -1 : 1;
        const splitAngle = angle + splitDir * (0.4 + Math.random() * 0.5);
        drawCrack(x2, y2, splitAngle, newWidth * 0.7, newLife * 0.7);
      }
    }

    const rootsCount = 15 * scale;
    for (let i = 0; i < rootsCount; i++) {
      const startX = Math.random() * TEXTURE_SIZE;
      const startY = Math.random() * TEXTURE_SIZE;
      const startAngle = Math.random() * Math.PI * 2;
      const startWidth = (Math.random() * 3 + 1) * scale;
      drawCrack(startX, startY, startAngle, startWidth, 50);
    }

    if (qrData) {
      const rawCount = qrData.getModuleCount();
      const borderOffset = useBorder ? 1 : 0;
      const totalCount = rawCount + borderOffset * 2;
      const modulePx = TEXTURE_SIZE / totalCount;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "black";
      for (let r = 0; r < rawCount; r++) {
        for (let c = 0; c < rawCount; c++) {
          if (qrData.isDark(r, c)) {
            const drawC = c + borderOffset;
            const drawR = r + borderOffset;
            ctx.fillRect(drawC * modulePx, drawR * modulePx, modulePx, modulePx);
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  let texFine = createMaskedFineNoiseTexture(0.5, null, USER_DEFAULTS.border);

  const qrGroup = new THREE.Group();
  qrGroup.scale.setScalar(0.02);
  scene.add(qrGroup);

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  let pointerDownX = 0;
  let pointerDownY = 0;
  let pointerIsDown = false;
  let pointerMoved = false;
  let pointerDownOnQr = false;
  const CLICK_DRAG_THRESHOLD_PX = 6;

  function isQrCubeHit(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNdc, camera);
    return raycaster.intersectObjects(qrGroup.children, true).length > 0;
  }

  const materialMetal = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    metalness: 1.0,
    roughness: 0.05,
  });

  const materialSide = new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 0.3,
    roughness: 0.8,
  });

  const materialBase = new THREE.MeshStandardMaterial({
    color: 0x050505,
    metalness: 0.1,
    roughness: 0.8,
  });

  const materialOverlayFine = new THREE.MeshBasicMaterial({
    color: 0x000000,
    alphaMap: texFine,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.NormalBlending,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const veinsMaterials = [];
  function initVeinsMaterials() {
    veinsMaterials.length = 0;
    for (let i = 0; i < 6; i++) {
      const tex = createVeinsTexture(USER_DEFAULTS.cutScale);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        alphaMap: tex,
        transparent: true,
        opacity: 1.0,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
      veinsMaterials.push(mat);
    }
  }
  initVeinsMaterials();

  const params = {
    baseSize: 5,
    layerDepth: 1.0,
    fineDensity: 0.5,
    cutScale: USER_DEFAULTS.cutScale,
    border: USER_DEFAULTS.border,
  };

  function updateFineTexture() {
    texFine = createMaskedFineNoiseTexture(params.fineDensity, currentQR, params.border);
    materialOverlayFine.alphaMap = texFine;
    materialOverlayFine.needsUpdate = true;
  }

  function updateAllVeinsTextures() {
    veinsMaterials.forEach((mat) => {
      if (mat.alphaMap) mat.alphaMap.dispose();
      mat.alphaMap = createVeinsTexture(params.cutScale, currentQR, params.border);
      mat.needsUpdate = true;
    });
  }

  function generateQR() {
    while (qrGroup.children.length > 0) {
      const obj = qrGroup.children[0];
      if (obj.geometry) obj.geometry.dispose();
      qrGroup.remove(obj);
    }

    const qr = qrcodeFactory(0, "L");
    currentQR = qr;

    try {
      qr.addData(DEVELOPER_FIXED_URL);
      qr.make();
    } catch {
      return;
    }

    updateFineTexture();
    updateAllVeinsTextures();

    const rawCount = qr.getModuleCount();
    const borderOffset = params.border ? 1 : 0;
    const totalCount = rawCount + borderOffset * 2;
    const moduleSize = params.baseSize / totalCount;

    const baseGeometry = new THREE.BoxGeometry(params.baseSize, params.baseSize, params.baseSize);
    const baseCube = new THREE.Mesh(baseGeometry, materialBase);
    qrGroup.add(baseCube);

    const baseDustGeo = new THREE.BoxGeometry(
      params.baseSize + 0.01,
      params.baseSize + 0.01,
      params.baseSize + 0.01,
    );
    const baseDust = new THREE.Mesh(baseDustGeo, materialOverlayFine);
    qrGroup.add(baseDust);

    const tileSize = moduleSize * 1.02;
    const blockGeometry = new THREE.BoxGeometry(tileSize, tileSize, params.layerDepth);
    let metalTilesCount = 0;

    for (let r = 0; r < totalCount; r++) {
      for (let c = 0; c < totalCount; c++) {
        if (
          r < borderOffset ||
          r >= totalCount - borderOffset ||
          c < borderOffset ||
          c >= totalCount - borderOffset
        ) {
          metalTilesCount++;
        } else {
          const qrR = r - borderOffset;
          const qrC = c - borderOffset;
          if (!qr.isDark(qrR, qrC)) metalTilesCount++;
        }
      }
    }

    const materialsList = [
      materialSide,
      materialSide,
      materialSide,
      materialSide,
      materialMetal,
      materialSide,
    ];

    const totalInstances = metalTilesCount * 6;
    const meshInstanced = new THREE.InstancedMesh(blockGeometry, materialsList, totalInstances);
    const dummy = new THREE.Object3D();
    let idx = 0;
    const surfaceDist = params.baseSize / 2 + params.layerDepth / 2;

    for (let face = 0; face < 6; face++) {
      for (let r = 0; r < totalCount; r++) {
        for (let c = 0; c < totalCount; c++) {
          let isMetal = false;
          if (
            r < borderOffset ||
            r >= totalCount - borderOffset ||
            c < borderOffset ||
            c >= totalCount - borderOffset
          ) {
            isMetal = true;
          } else {
            const qrR = r - borderOffset;
            const qrC = c - borderOffset;
            if (!qr.isDark(qrR, qrC)) isMetal = true;
          }

          if (isMetal) {
            const u = (c - totalCount / 2 + 0.5) * moduleSize;
            const v = -(r - totalCount / 2 + 0.5) * moduleSize;

            dummy.rotation.set(0, 0, 0);
            switch (face) {
              case 0:
                dummy.position.set(u, v, surfaceDist);
                break;
              case 1:
                dummy.position.set(-u, v, -surfaceDist);
                dummy.rotation.y = Math.PI;
                break;
              case 2:
                dummy.position.set(u, surfaceDist, -v);
                dummy.rotation.x = -Math.PI / 2;
                break;
              case 3:
                dummy.position.set(u, -surfaceDist, v);
                dummy.rotation.x = Math.PI / 2;
                break;
              case 4:
                dummy.position.set(surfaceDist, v, -u);
                dummy.rotation.y = Math.PI / 2;
                break;
              case 5:
                dummy.position.set(-surfaceDist, v, u);
                dummy.rotation.y = -Math.PI / 2;
                break;
              default:
                break;
            }

            dummy.updateMatrix();
            meshInstanced.setMatrixAt(idx++, dummy.matrix);
          }
        }
      }
    }
    qrGroup.add(meshInstanced);

    const overlayPlaneGeo = new THREE.PlaneGeometry(params.baseSize, params.baseSize);

    const dustGroup = new THREE.Group();
    const dustDist = params.baseSize / 2 + params.layerDepth + 0.005;
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(overlayPlaneGeo, materialOverlayFine);
      switch (i) {
        case 0:
          mesh.position.z = dustDist;
          break;
        case 1:
          mesh.position.z = -dustDist;
          mesh.rotation.y = Math.PI;
          break;
        case 2:
          mesh.position.y = dustDist;
          mesh.rotation.x = -Math.PI / 2;
          break;
        case 3:
          mesh.position.y = -dustDist;
          mesh.rotation.x = Math.PI / 2;
          break;
        case 4:
          mesh.position.x = dustDist;
          mesh.rotation.y = Math.PI / 2;
          break;
        case 5:
          mesh.position.x = -dustDist;
          mesh.rotation.y = -Math.PI / 2;
          break;
        default:
          break;
      }
      dustGroup.add(mesh);
    }
    qrGroup.add(dustGroup);

    const cutsGroup = new THREE.Group();
    const cutDist = params.baseSize / 2 + params.layerDepth + 0.01;
    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(overlayPlaneGeo, veinsMaterials[i]);
      switch (i) {
        case 0:
          mesh.position.z = cutDist;
          break;
        case 1:
          mesh.position.z = -cutDist;
          mesh.rotation.y = Math.PI;
          break;
        case 2:
          mesh.position.y = cutDist;
          mesh.rotation.x = -Math.PI / 2;
          break;
        case 3:
          mesh.position.y = -cutDist;
          mesh.rotation.x = Math.PI / 2;
          break;
        case 4:
          mesh.position.x = cutDist;
          mesh.rotation.y = Math.PI / 2;
          break;
        case 5:
          mesh.position.x = -cutDist;
          mesh.rotation.y = -Math.PI / 2;
          break;
        default:
          break;
      }
      cutsGroup.add(mesh);
    }
    qrGroup.add(cutsGroup);
  }

  renderer.domElement.addEventListener("pointerdown", (event) => {
    pointerIsDown = true;
    pointerMoved = false;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    pointerDownOnQr = isQrCubeHit(event.clientX, event.clientY);
  });

  renderer.domElement.addEventListener("pointermove", (event) => {
    if (pointerIsDown) {
      const dx = event.clientX - pointerDownX;
      const dy = event.clientY - pointerDownY;
      if ((dx * dx + dy * dy) > (CLICK_DRAG_THRESHOLD_PX * CLICK_DRAG_THRESHOLD_PX)) {
        pointerMoved = true;
      }
      return;
    }

    renderer.domElement.style.cursor = isQrCubeHit(event.clientX, event.clientY) ? "pointer" : "default";
  });

  renderer.domElement.addEventListener("pointerup", (event) => {
    if (!pointerIsDown) return;
    pointerIsDown = false;

    if (
      isActivated &&
      !pointerMoved &&
      pointerDownOnQr &&
      isQrCubeHit(event.clientX, event.clientY)
    ) {
      window.open(DEVELOPER_FIXED_URL, "_blank", "noopener,noreferrer");
    }
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    pointerIsDown = false;
    pointerMoved = false;
    pointerDownOnQr = false;
    renderer.domElement.style.cursor = "default";
  });

  const resize = () => {
    const width = Math.max(widgetRoot.clientWidth, 80);
    const height = Math.max(widgetRoot.clientHeight, 80);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  };

  generateQR();
  resize();

  const activateWidget = () => {
    if (isActivated) return;
    isActivated = true;
    revealStartAt = performance.now();
    controls.autoRotate = true;
    qrGroup.rotation.set(0.2, -1.0, 0.0);
    qrGroup.scale.setScalar(0.04);
    widgetRoot.classList.add("is-visible");
    widgetRoot.setAttribute("aria-hidden", "false");
  };

  const deactivateWidget = () => {
    if (!isActivated) return;
    isActivated = false;
    revealStartAt = 0;
    controls.autoRotate = false;
    if (autoRotateResumeTimer) {
      clearTimeout(autoRotateResumeTimer);
      autoRotateResumeTimer = null;
    }
    pointerIsDown = false;
    pointerMoved = false;
    pointerDownOnQr = false;
    renderer.domElement.style.cursor = "default";
    qrGroup.scale.setScalar(0.02);
    qrGroup.rotation.set(0, 0, 0);
    widgetRoot.classList.remove("is-visible");
    widgetRoot.setAttribute("aria-hidden", "true");
  };

  widgetRoot.classList.remove("is-visible");
  widgetRoot.setAttribute("aria-hidden", "true");
  controls.autoRotate = false;

  // Show the fixed QR right after the pinned image-sequence section ends.
  if (window.ScrollTrigger && typeof window.ScrollTrigger.create === "function") {
    qrRevealTrigger = window.ScrollTrigger.create({
      trigger: "#page",
      start: "top top",
      end: "+=300%",
      onLeave: activateWidget,
      onEnterBack: deactivateWidget,
    });
  } else {
    const sequenceSection = document.getElementById("page");
    if (sequenceSection) {
      fallbackScrollHandler = () => {
        const rect = sequenceSection.getBoundingClientRect();
        if (rect.bottom <= 0) {
          activateWidget();
        } else {
          deactivateWidget();
        }
      };
      fallbackScrollHandler();
      window.addEventListener("scroll", fallbackScrollHandler, { passive: true });
    }
  }

  let resizeObserver = null;
  if ("ResizeObserver" in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(widgetRoot);
  } else {
    window.addEventListener("resize", resize);
  }

  let animationId = null;
  const animate = () => {
    animationId = requestAnimationFrame(animate);
    if (isActivated && revealStartAt > 0) {
      const elapsed = performance.now() - revealStartAt;
      const progress = Math.min(elapsed / REVEAL_DURATION_MS, 1);
      const eased = easeOutCubic(progress);
      const scale = 0.04 + (0.96 * eased);
      qrGroup.scale.setScalar(scale);
      qrGroup.rotation.x *= 0.92;

      if (progress >= 1) {
        revealStartAt = 0;
        qrGroup.scale.setScalar(1);
        qrGroup.rotation.x = 0;
      }
    }

    controls.update();
    renderer.render(scene, camera);
  };

  animate();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    } else if (animationId === null) {
      animate();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
    }
    if (resizeObserver) {
      resizeObserver.disconnect();
    }
    if (qrRevealTrigger) {
      qrRevealTrigger.kill();
      qrRevealTrigger = null;
    }
    if (fallbackScrollHandler) {
      window.removeEventListener("scroll", fallbackScrollHandler);
      fallbackScrollHandler = null;
    }
    if (autoRotateResumeTimer) {
      clearTimeout(autoRotateResumeTimer);
      autoRotateResumeTimer = null;
    }
    renderer.dispose();
  });
}
