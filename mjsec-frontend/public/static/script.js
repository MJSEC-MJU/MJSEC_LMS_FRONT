gsap.registerPlugin(ScrollTrigger);


const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const sequenceIntroTitle = document.querySelector(".sequence-intro-title");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


window.addEventListener("resize", function () {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  currentFrameIndex = getTargetFrameIndex();
  preloadAround(currentFrameIndex);
  queueRender(true);
});


const sequenceScrollEnd = `+=300%`;
const introAnimationEndProgress = 0.6;
const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
const sequenceFrameCount = 192;
const initialPreloadCount = isMobileViewport ? 8 : 16;
const prefetchRadius = isMobileViewport ? 2 : 4;

const sequenceState = {
  progress: 0,
};

const sequenceFrames = new Map();
const sequenceLoading = new Set();
let currentFrameIndex = 0;
let renderRaf = null;
let lastRenderedFrameRef = null;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function isDrawableMedia(image) {
  return Boolean(image && image.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}

function getFrameSrc(index) {
  return `/static/images/${index + 1}.webp`;
}

function requestFrame(index) {
  if (index < 0 || index >= sequenceFrameCount) return;
  if (sequenceFrames.has(index) || sequenceLoading.has(index)) return;

  sequenceLoading.add(index);
  const img = new Image();
  img.decoding = "async";
  img.loading = "eager";
  img.src = getFrameSrc(index);

  img.onload = () => {
    sequenceLoading.delete(index);
    sequenceFrames.set(index, img);
    if (index === currentFrameIndex) queueRender(true);
  };

  img.onerror = () => {
    sequenceLoading.delete(index);
  };
}

function getClosestFrame(index) {
  if (sequenceFrames.has(index)) return sequenceFrames.get(index);

  for (let offset = 1; offset < sequenceFrameCount; offset += 1) {
    const left = index - offset;
    const right = index + offset;
    if (left >= 0 && sequenceFrames.has(left)) return sequenceFrames.get(left);
    if (right < sequenceFrameCount && sequenceFrames.has(right)) return sequenceFrames.get(right);
  }

  return null;
}

function preloadAround(index) {
  requestFrame(index);

  for (let step = 1; step <= prefetchRadius; step += 1) {
    requestFrame(index - step);
    requestFrame(index + step);
  }
}

function getTargetFrameIndex() {
  const index = Math.round(clamp01(sequenceState.progress) * (sequenceFrameCount - 1));
  return Math.max(0, Math.min(sequenceFrameCount - 1, index));
}

function queueRender(force = false) {
  if (renderRaf !== null && !force) return;
  if (renderRaf !== null) cancelAnimationFrame(renderRaf);

  renderRaf = requestAnimationFrame(() => {
    renderRaf = null;
    render(force);
  });
}

requestFrame(0);
for (let i = 1; i <= initialPreloadCount; i += 1) {
  requestFrame(i);
}

gsap.to(sequenceState, {
  progress: 1,
  ease: "none",
  scrollTrigger: {
    scrub: 0.15,
    trigger: `#page`,
    start: `top top`,
    end: sequenceScrollEnd,
    onRefresh: () => {
      currentFrameIndex = getTargetFrameIndex();
      preloadAround(currentFrameIndex);
      queueRender(true);
    },
  },
  onUpdate: () => {
    currentFrameIndex = getTargetFrameIndex();
    preloadAround(currentFrameIndex);
    queueRender();
  },
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    currentFrameIndex = getTargetFrameIndex();
    preloadAround(currentFrameIndex);
    queueRender(true);
  }
});

function render(forceFrameDraw = false) {
  const frameImage = getClosestFrame(currentFrameIndex);
  if (frameImage && isDrawableMedia(frameImage)) {
    if (forceFrameDraw || frameImage !== lastRenderedFrameRef) {
      scaleImage(frameImage, context);
      lastRenderedFrameRef = frameImage;
    }
  } else {
    context.clearRect(0, 0, canvas.width, canvas.height);
    lastRenderedFrameRef = null;
  }

  if (sequenceIntroTitle) {
    const introProgress = Math.min(clamp01(sequenceState.progress) / introAnimationEndProgress, 1);
    const easedProgress = 1 - Math.pow(1 - introProgress, 3);
    const scale = 1 - (0.98 * easedProgress);

    sequenceIntroTitle.style.opacity = String(1 - easedProgress);
    sequenceIntroTitle.style.transform = `scale(${scale})`;
    sequenceIntroTitle.style.visibility = introProgress >= 1 ? "hidden" : "visible";
  }
}

function scaleImage(img, ctx) {
  if (!isDrawableMedia(img)) return;

  var canvas = ctx.canvas;
  var sourceWidth = img.naturalWidth || img.videoWidth || img.width;
  var sourceHeight = img.naturalHeight || img.videoHeight || img.height;
  if (!sourceWidth || !sourceHeight) return;
  
  // 1. 가로 비율과 세로 비율 중 더 큰 값을 선택 (Aspect Fill/Cover 방식)
  var hRatio = canvas.width / sourceWidth;
  var vRatio = canvas.height / sourceHeight;
  var ratio = Math.max(hRatio, vRatio); 

  // 2. zoom을 1로 수정 (기존 0.3은 이미지를 30% 크기로 축소시킴)
  var zoom = 1; 
  ratio = ratio * zoom; 

  // 3. 이미지를 중앙에 배치하기 위한 계산
  var centerShift_x = (canvas.width - sourceWidth * ratio) / 2;
  var centerShift_y = (canvas.height - sourceHeight * ratio) / 2;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 4. 고해상도 대응을 위해 이미지 렌더링 최적화
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = isMobileViewport ? "medium" : "high";

  try {
    ctx.drawImage(
      img,
      0,
      0,
      sourceWidth,
      sourceHeight,
      centerShift_x,
      centerShift_y,
      sourceWidth * ratio,
      sourceHeight * ratio
    );
  } catch (err) {
    // Skip this frame if the browser has not decoded image data yet.
  }
}


ScrollTrigger.create({
  trigger:"#page",
  pin: true,
  start: `top top`,
  end: sequenceScrollEnd
});

initHamburgerMenu();
initDotNavSmoothScroll();
initSpaceApproachSection();
initMethodologyScrollTrigger();
initGallerySection();
initSequenceTimelineEffects();

function initHamburgerMenu() {
  const button = document.querySelector(".hamburger-btn");
  const overlay = document.querySelector(".hamburger-overlay");
  if (!button || !overlay) return;

  const menuLinks = Array.from(overlay.querySelectorAll(".hamburger-menu__item"));
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  let hoverAudioContext = null;
  let hoverNoiseBuffer = null;
  let lastHoverToneAt = 0;

  const ensureHoverAudio = () => {
    if (!AudioCtx) return null;
    if (!hoverAudioContext) hoverAudioContext = new AudioCtx();
    if (hoverAudioContext.state === "suspended") {
      hoverAudioContext.resume().catch(() => {});
    }
    return hoverAudioContext;
  };

  const ensureHoverNoiseBuffer = (ctx) => {
    if (hoverNoiseBuffer && hoverNoiseBuffer.sampleRate === ctx.sampleRate) {
      return hoverNoiseBuffer;
    }

    const durationSeconds = 0.08;
    const length = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const decay = 1 - (i / length);
      channel[i] = (Math.random() * 2 - 1) * decay;
    }

    hoverNoiseBuffer = buffer;
    return hoverNoiseBuffer;
  };

  const playHoverTone = () => {
    const ctx = ensureHoverAudio();
    if (!ctx) return;

    const nowMs = performance.now();
    if (nowMs - lastHoverToneAt < 70) return;
    lastHoverToneAt = nowMs;

    const now = ctx.currentTime + 0.001;
    const output = ctx.createGain();
    output.gain.value = 0.95;
    output.connect(ctx.destination);

    // Crisp metallic UI hover: high ring partials + tiny bright transient.
    const airHighpass = ctx.createBiquadFilter();
    airHighpass.type = "highpass";
    airHighpass.frequency.setValueAtTime(620, now);
    airHighpass.Q.value = 0.8;

    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.setValueAtTime(-20, now);
    limiter.knee.setValueAtTime(10, now);
    limiter.ratio.setValueAtTime(4.5, now);
    limiter.attack.setValueAtTime(0.002, now);
    limiter.release.setValueAtTime(0.05, now);

    output.gain.value = 0.72;
    output.connect(airHighpass);
    airHighpass.connect(limiter);
    limiter.connect(ctx.destination);

    const playMetalPartial = (baseFreq, modRatio, peakGain, duration) => {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const partialFilter = ctx.createBiquadFilter();
      const partialGain = ctx.createGain();

      carrier.type = "sine";
      carrier.frequency.setValueAtTime(baseFreq, now);

      modulator.type = "triangle";
      modulator.frequency.setValueAtTime(baseFreq * modRatio, now);
      modGain.gain.setValueAtTime(baseFreq * 0.22, now);
      modGain.gain.exponentialRampToValueAtTime(baseFreq * 0.03, now + duration);

      partialFilter.type = "bandpass";
      partialFilter.frequency.setValueAtTime(baseFreq * 1.18, now);
      partialFilter.Q.value = 8;

      partialGain.gain.setValueAtTime(0.0001, now);
      partialGain.gain.exponentialRampToValueAtTime(peakGain, now + 0.0035);
      partialGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(partialFilter);
      partialFilter.connect(partialGain);
      partialGain.connect(output);

      carrier.start(now);
      modulator.start(now);
      carrier.stop(now + duration + 0.01);
      modulator.stop(now + duration + 0.01);
    };

    playMetalPartial(1260, 2.37, 0.018, 0.055);
    playMetalPartial(1820, 1.71, 0.013, 0.05);
    playMetalPartial(2460, 1.43, 0.009, 0.045);

    const clickOsc = ctx.createOscillator();
    const clickFilter = ctx.createBiquadFilter();
    const clickGain = ctx.createGain();

    clickOsc.type = "triangle";
    clickOsc.frequency.setValueAtTime(3400, now);
    clickOsc.frequency.exponentialRampToValueAtTime(2100, now + 0.018);
    clickFilter.type = "highpass";
    clickFilter.frequency.setValueAtTime(1900, now);
    clickFilter.Q.value = 1.1;
    clickGain.gain.setValueAtTime(0.0001, now);
    clickGain.gain.exponentialRampToValueAtTime(0.013, now + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.024);

    clickOsc.connect(clickFilter);
    clickFilter.connect(clickGain);
    clickGain.connect(output);
    clickOsc.start(now);
    clickOsc.stop(now + 0.03);

    const noiseSource = ctx.createBufferSource();
    const noiseBand = ctx.createBiquadFilter();
    const noiseAir = ctx.createBiquadFilter();
    const noiseGain = ctx.createGain();

    noiseSource.buffer = ensureHoverNoiseBuffer(ctx);
    noiseBand.type = "bandpass";
    noiseBand.frequency.setValueAtTime(5200, now);
    noiseBand.Q.value = 4.5;
    noiseAir.type = "highpass";
    noiseAir.frequency.setValueAtTime(2400, now);
    noiseAir.Q.value = 0.8;
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.007, now + 0.002);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

    noiseSource.connect(noiseBand);
    noiseBand.connect(noiseAir);
    noiseAir.connect(noiseGain);
    noiseGain.connect(output);
    noiseSource.start(now);
    noiseSource.stop(now + 0.028);
  };

  const setMenuOpen = (isOpen) => {
    button.classList.toggle("is-open", isOpen);
    overlay.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    overlay.setAttribute("aria-hidden", String(!isOpen));
    document.body.classList.toggle("menu-open", isOpen);
  };

  window.addEventListener("pointerdown", ensureHoverAudio, { once: true, passive: true });

  button.addEventListener("click", () => {
    ensureHoverAudio();
    const nextOpen = !overlay.classList.contains("is-open");
    setMenuOpen(nextOpen);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      setMenuOpen(false);
    }
  });

  menuLinks.forEach((link) => {
    link.addEventListener("mouseenter", playHoverTone);
    link.addEventListener("focus", playHoverTone);
    link.addEventListener("click", () => {
      setMenuOpen(false);
    });
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });
}

function initDotNavSmoothScroll() {
  const nav = document.querySelector(".dot-nav");
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll(".dot-nav__item[href^=\"#\"]"));
  if (!links.length) return;

  const sections = links
    .map((link) => {
      const selector = link.getAttribute("href");
      if (!selector) return null;
      return {
        link,
        target: document.querySelector(selector),
      };
    })
    .filter((item) => item && item.target);

  if (!sections.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const easeInOutCubic = (t) => (
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  );

  let rafId = null;
  let scrollToken = 0;

  const animateScrollTo = (targetY, duration = 900) => {
    if (rafId) cancelAnimationFrame(rafId);
    scrollToken += 1;
    const currentToken = scrollToken;

    const startY = window.scrollY || window.pageYOffset;
    const distance = targetY - startY;

    if (prefersReducedMotion.matches || Math.abs(distance) < 2) {
      window.scrollTo(0, targetY);
      return;
    }

    const startTime = performance.now();

    const tick = (now) => {
      if (currentToken !== scrollToken) return;

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      window.scrollTo(0, startY + (distance * eased));

      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    rafId = requestAnimationFrame(tick);
  };

  const updateActiveNav = () => {
    const anchorLine = window.innerHeight * 0.45;
    let activeItem = null;
    let minDistance = Number.POSITIVE_INFINITY;

    sections.forEach((item) => {
      const rect = item.target.getBoundingClientRect();
      if (rect.top <= anchorLine && rect.bottom >= anchorLine) {
        activeItem = item;
      }
    });

    if (!activeItem) {
      sections.forEach((item) => {
        const top = item.target.getBoundingClientRect().top;
        const distance = Math.abs(top - anchorLine);
        if (distance < minDistance) {
          minDistance = distance;
          activeItem = item;
        }
      });
    }

    if (!activeItem) activeItem = sections[0];

    sections.forEach((item) => {
      item.link.classList.toggle("is-active", item === activeItem);
    });
  };

  sections.forEach((item) => {
    item.link.addEventListener("click", (event) => {
      event.preventDefault();

      const targetTop = window.scrollY + item.target.getBoundingClientRect().top;
      animateScrollTo(targetTop);

      if (history.replaceState) {
        history.replaceState(null, "", item.link.getAttribute("href"));
      }
    });
  });

  window.addEventListener("scroll", updateActiveNav, { passive: true });
  window.addEventListener("resize", updateActiveNav);
  updateActiveNav();
}

function initSpaceApproachSection() {
  const section = document.querySelector("#space-approach");
  const world = document.querySelector("#space-world");
  const viewport = document.querySelector("#space-viewport");

  if (!section || !world || !viewport) return;

  const Z_GAP = 600;
  const ITEM_COUNT = 15;
  const LOOP_SIZE = ITEM_COUNT * Z_GAP;
  const STAR_COUNT = 100;
  const TEXTS = ["MJ Univ", "Web / Web3", "Pwnable", "Reversing", "AI", "Digital Forensics", "LLM", "Crypto", "Network"];
  const CARD_LOGO_SRC = "/static/images/%EA%B7%B8%EB%A6%BC1.png";
  const isMobileLayout = window.matchMedia("(max-width: 768px)").matches;

  const cardSpreadX = isMobileLayout ? 0.42 : 0.8;
  const cardSpreadY = isMobileLayout ? 0.36 : 0.8;
  const textSpreadX = isMobileLayout ? 0.34 : 0.8;
  const textSpreadY = isMobileLayout ? 0.28 : 0.8;
  const cardRotationRange = isMobileLayout ? 12 : 20;
  const starSpreadRange = isMobileLayout ? 1300 : 2000;

  const items = [];
  const learnTitleEl = document.createElement("div");
  learnTitleEl.className = "space-item space-learn-title";
  learnTitleEl.textContent = "What we learn";
  world.appendChild(learnTitleEl);

  const learnTitle = {
    el: learnTitleEl,
    x: 0,
    y: isMobileLayout ? -120 : -170,
    baseZ: -220,
  };

  const makeCardMarkup = (index, title) => `
    <img class="space-card-logo" src="${CARD_LOGO_SRC}" alt="" aria-hidden="true" onerror="this.style.display='none'" />
    <div class="space-index">0${index} // ${Math.random().toFixed(4)}</div>
    <h2 class="space-title${title.length >= 14 ? " is-long" : ""}">${title}</h2>
    <p class="space-card-coord">MJSEC: [${Math.random().toFixed(0)}, ${Math.random().toFixed(0)}]</p>
  `;

  for (let i = 0; i < ITEM_COUNT; i += 1) {
    const isText = i % 3 === 0;
    const el = document.createElement("div");
    el.className = "space-item";

    if (isText) {
      const textEl = document.createElement("div");
      textEl.className = "space-big-text";
      textEl.textContent = TEXTS[i % TEXTS.length];
      el.appendChild(textEl);
    } else {
      const card = document.createElement("div");
      card.className = "space-card";
      card.innerHTML = makeCardMarkup(i, TEXTS[i % TEXTS.length]);
      el.appendChild(card);
    }

    const spreadX = isText ? textSpreadX : cardSpreadX;
    const spreadY = isText ? textSpreadY : cardSpreadY;
    const x = (Math.random() - 0.5) * window.innerWidth * spreadX;
    const y = (Math.random() - 0.5) * window.innerHeight * spreadY;
    const rotZ = (Math.random() - 0.5) * cardRotationRange;

    world.appendChild(el);
    items.push({
      el,
      x,
      y,
      rotZ,
      baseZ: -i * Z_GAP,
      type: isText ? "text" : "card",
    });
  }

  for (let i = 0; i < STAR_COUNT; i += 1) {
    const el = document.createElement("div");
    el.className = "space-particle";
    world.appendChild(el);

    items.push({
      el,
      x: (Math.random() - 0.5) * starSpreadRange,
      y: (Math.random() - 0.5) * starSpreadRange,
      rotZ: 0,
      baseZ: -(Math.random() * LOOP_SIZE),
      type: "star",
    });
  }

  let targetScroll = 0;
  let targetVelocity = 0;
  let smoothScroll = 0;
  let smoothVelocity = 0;

  const getTravelDistance = () => Math.max(section.offsetHeight - window.innerHeight, 1);

  const update = (scroll, vel) => {
    const warp = Math.min(Math.abs(vel) * 2, 400);
    viewport.style.perspective = `${800 - warp}px`;

    const tilt = vel * 0.05;
    world.style.transform = `rotateX(${-tilt}deg)`;

    const speedFactor = 2.5;
    const currentDist = scroll * speedFactor;

    let titleZ = learnTitle.baseZ + currentDist;
    let titleAlpha = 1;

    if (titleZ < -2000) {
      titleAlpha = 0;
    } else if (titleZ < -1200) {
      titleAlpha = (titleZ + 2000) / 800;
    }

    if (titleZ > 0) {
      titleAlpha = 1 - (titleZ / 260);
    }

    titleAlpha = Math.max(0, Math.min(1, titleAlpha));
    learnTitle.el.style.opacity = String(titleAlpha);

    if (titleAlpha > 0) {
      const drift = Math.sin(Date.now() * 0.0015) * 2.5;
      learnTitle.el.style.transform = `translate3d(${learnTitle.x}px, ${learnTitle.y + drift}px, ${titleZ}px)`;
    }

    items.forEach((item) => {
      let z = item.baseZ + currentDist;
      const offset = z % LOOP_SIZE;

      let vizZ = offset;
      if (vizZ > 500) vizZ -= LOOP_SIZE;
      if (vizZ < -LOOP_SIZE + 500) vizZ += LOOP_SIZE;
      while (vizZ > 500) vizZ -= LOOP_SIZE;

      let alpha = 1;
      const maxDist = -3000;
      if (vizZ < maxDist) {
        alpha = 0;
      } else if (vizZ < maxDist + 1000) {
        alpha = (vizZ - maxDist) / 1000;
      }

      if (vizZ > 0) {
        alpha = 1 - (vizZ / 400);
      }

      if (alpha < 0) alpha = 0;
      item.el.style.opacity = String(alpha);

      if (alpha <= 0) return;

      if (item.type === "star") {
        const stretch = Math.max(1, Math.min(1 + Math.abs(vel) * 0.05, 5));
        item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, ${vizZ}px) scale3d(1, ${stretch}, 1)`;
      } else {
        const floatRot = Math.sin(Date.now() * 0.001 + item.baseZ) * 5;
        item.el.style.transform = `translate3d(${item.x}px, ${item.y}px, ${vizZ}px) rotateZ(${item.rotZ + floatRot}deg)`;
      }
    });
  };

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      targetScroll = self.progress * getTravelDistance();
      targetVelocity = self.getVelocity() / 120;
    },
  });

  const animate = () => {
    smoothScroll += (targetScroll - smoothScroll) * 0.12;
    smoothVelocity += (targetVelocity - smoothVelocity) * 0.1;
    update(smoothScroll, smoothVelocity);
    requestAnimationFrame(animate);
  };

  update(0, 0);
  requestAnimationFrame(animate);
}

function initMethodologyScrollTrigger() {
  const spacer = document.querySelector("#sequence-spacer");
  const timeline = spacer?.querySelector(".process-timeline");
  if (!spacer || !timeline) return;

  const header = timeline.querySelector(".section-header");
  const connector = timeline.querySelector(".timeline-svg-connector");
  const steps = Array.from(timeline.querySelectorAll(".timeline-step"));
  const contentWrap = timeline.querySelector(".timeline-content-wrapper");
  const revealBlocks = [header, connector, contentWrap].filter(Boolean);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set([timeline, ...revealBlocks, ...steps], {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
    });
    return;
  }

  gsap.set(timeline, {
    opacity: 0,
    y: 110,
    scale: 0.94,
    filter: "blur(14px)",
    transformOrigin: "50% 70%",
  });

  if (revealBlocks.length) {
    gsap.set(revealBlocks, {
      opacity: 0,
      y: 70,
      filter: "blur(12px)",
    });
  }

  if (steps.length) {
    gsap.set(steps, {
      opacity: 0,
      y: 85,
      filter: "blur(12px)",
    });
  }

  gsap
    .timeline({
      scrollTrigger: {
        trigger: spacer,
        start: "top 88%",
        end: "bottom 12%",
        scrub: true,
      },
    })
    .to(timeline, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      ease: "none",
      duration: 0.22,
    })
    .to(header, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      ease: "none",
      duration: 0.12,
    }, "<")
    .to(connector, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      ease: "none",
      duration: 0.12,
    }, "<0.03")
    .to(steps, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      stagger: 0.06,
      ease: "none",
      duration: 0.18,
    }, "<0.04")
    .to(contentWrap, {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      ease: "none",
      duration: 0.14,
    }, "<0.03")
    .to(timeline, {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      ease: "none",
      duration: 0.24,
    })
    .to(timeline, {
      opacity: 0,
      y: -95,
      scale: 0.98,
      filter: "blur(8px)",
      ease: "none",
      duration: 0.2,
    });
}

function initGallerySection() {
  const image = document.querySelector(".content-wrap .scaler img");
  const firstSection = document.querySelector(".content-wrap main section:first-of-type");
  const layers = document.querySelectorAll(".content-wrap .grid > .layer");
  const gridImages = document.querySelectorAll(".content-wrap .grid img");

  if (!image || !firstSection || layers.length === 0) {
    return;
  }

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    gsap.set(image, { clearProps: "width,height" });
    gsap.set(layers, { opacity: 1, scale: 1, transformOrigin: "center center" });
    return;
  }

  let targetWidth = 0;
  let targetHeight = 0;
  const clamp01 = (value) => Math.min(1, Math.max(0, value));

  const measureTargetSize = () => {
    const prevWidth = image.style.width;
    const prevHeight = image.style.height;

    image.style.width = "";
    image.style.height = "";
    targetWidth = image.getBoundingClientRect().width;
    targetHeight = image.getBoundingClientRect().height;

    image.style.width = prevWidth;
    image.style.height = prevHeight;
  };

  measureTargetSize();

  const applyProgress = (progress) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const currentWidth = viewportWidth + ((targetWidth - viewportWidth) * progress);
    const currentHeight = viewportHeight + ((targetHeight - viewportHeight) * progress);

    gsap.set(image, {
      width: currentWidth,
      height: currentHeight,
    });

    layers.forEach((layer, index) => {
      const revealStart = 0.3 + (index * 0.08);
      const revealEnd = revealStart + 0.34;
      const layerProgress = clamp01((progress - revealStart) / (revealEnd - revealStart));
      gsap.set(layer, {
        opacity: layerProgress,
        scale: layerProgress,
      });
    });
  };

  let rafPending = false;
  let latestProgress = 0;
  const queueApplyProgress = (progress) => {
    latestProgress = progress;
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      applyProgress(latestProgress);
    });
  };

  gsap.set(layers, {
    opacity: 0,
    scale: 0,
    transformOrigin: "center center",
  });

  gsap.set(image, {
    width: window.innerWidth,
    height: window.innerHeight,
  });

  ScrollTrigger.create({
    trigger: firstSection,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    invalidateOnRefresh: true,
    onRefreshInit: () => {
      measureTargetSize();
      gsap.set(image, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
    },
    onUpdate: (self) => {
      queueApplyProgress(self.progress);
    },
    onRefresh: (self) => {
      queueApplyProgress(self.progress);
    },
  });

  applyProgress(0);

  gridImages.forEach((gridImage) => {
    if (!gridImage.complete) {
      gridImage.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
    }
  });
}

function initSequenceTimelineEffects() {
  const timeline = document.querySelector(".sequence-effects .process-timeline");
  if (!timeline) return;

  const steps = Array.from(timeline.querySelectorAll(".timeline-step"));
  const panels = Array.from(timeline.querySelectorAll(".timeline-panel"));
  const svg = timeline.querySelector(".timeline-svg-connector");
  const tracePath = timeline.querySelector("#timeline-trace");
  const glowPath = timeline.querySelector("#timeline-trace-glow");

  if (!steps.length || !panels.length) return;

  const scrambleChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

  let activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.getAttribute("aria-selected") === "true")
  );
  let scrambleTimer = null;
  let redrawRaf = null;

  const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

  const shouldDrawConnector = () => {
    if (!svg || !tracePath || !glowPath) return false;
    return !window.matchMedia("(max-width: 920px)").matches;
  };

  const updateGlowProgress = (index) => {
    if (!glowPath || steps.length < 2) return;

    const totalLength = glowPath.getTotalLength?.();
    if (!totalLength) return;

    const progress = index / (steps.length - 1);
    glowPath.style.strokeDasharray = String(totalLength);
    glowPath.style.strokeDashoffset = String(totalLength * (1 - progress));
  };

  const drawConnector = () => {
    if (!shouldDrawConnector()) return;

    const svgRect = svg.getBoundingClientRect();
    const points = steps
      .map((step) => step.querySelector(".module-icon-wrapper"))
      .filter(Boolean)
      .map((icon) => {
        const rect = icon.getBoundingClientRect();
        return {
          x: rect.left - svgRect.left + rect.width / 2,
          y: rect.top - svgRect.top + rect.height / 2,
        };
      });

    if (points.length < 2) return;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }

    tracePath.setAttribute("d", path);
    glowPath.setAttribute("d", path);
    updateGlowProgress(activeIndex);
  };

  const queueConnectorDraw = () => {
    if (redrawRaf) cancelAnimationFrame(redrawRaf);
    redrawRaf = requestAnimationFrame(() => {
      drawConnector();
      redrawRaf = null;
    });
  };

  const scrambleTitle = (titleEl) => {
    if (!titleEl) return;

    const finalText = titleEl.dataset.final || titleEl.textContent || "";
    titleEl.dataset.final = finalText;

    if (scrambleTimer) clearInterval(scrambleTimer);

    let iteration = 0;
    scrambleTimer = setInterval(() => {
      titleEl.textContent = finalText
        .split("")
        .map((char, idx) => {
          if (char === " ") return " ";
          if (idx < iteration) return finalText[idx];
          return scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        })
        .join("");

      iteration += 0.5;
      if (iteration >= finalText.length) {
        clearInterval(scrambleTimer);
        scrambleTimer = null;
        titleEl.textContent = finalText;
      }
    }, 24);
  };

  const activateStep = (nextIndex, options = {}) => {
    const { focus = false } = options;
    activeIndex = clampValue(nextIndex, 0, steps.length - 1);

    steps.forEach((step, idx) => {
      const isSelected = idx === activeIndex;
      step.classList.toggle("is-active", isSelected);
      step.setAttribute("aria-selected", String(isSelected));
      step.setAttribute("tabindex", isSelected ? "0" : "-1");
      if (isSelected && focus) step.focus();
    });

    panels.forEach((panel, idx) => {
      const shouldShow = idx === activeIndex;
      if (shouldShow) {
        panel.hidden = false;
        panel.classList.add("active");
        scrambleTitle(panel.querySelector(".panel-title"));
      } else {
        panel.classList.remove("active");
        panel.hidden = true;
      }
    });

    updateGlowProgress(activeIndex);
  };

  steps.forEach((step, index) => {
    step.addEventListener("click", () => activateStep(index));

    step.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

      event.preventDefault();

      if (event.key === "Home") {
        activateStep(0, { focus: true });
        return;
      }

      if (event.key === "End") {
        activateStep(steps.length - 1, { focus: true });
        return;
      }

      const offset = event.key === "ArrowRight" ? 1 : -1;
      activateStep(activeIndex + offset, { focus: true });
    });
  });

  window.addEventListener("resize", queueConnectorDraw);
  window.addEventListener("orientationchange", queueConnectorDraw);

  // Keep connector alignment stable while the section is being transformed by scroll animations.
  ScrollTrigger.create({
    trigger: timeline,
    start: "top bottom",
    end: "bottom top",
    scrub: true,
    onUpdate: queueConnectorDraw,
    onRefresh: queueConnectorDraw,
  });

  if ("ResizeObserver" in window) {
    const ro = new ResizeObserver(queueConnectorDraw);
    ro.observe(timeline);
  }

  timeline.querySelectorAll(".module-glyph").forEach((img) => {
    if (!img.complete) img.addEventListener("load", queueConnectorDraw, { once: true });
  });

  activateStep(activeIndex);
  queueConnectorDraw();
}
