import React, { useEffect, useMemo, useState } from "react";
import TimelineDesign from "./components/TimelineDesign.jsx";
import IntroSection from "./components/IntroSection.jsx";

const scriptLoadPromises = new Map();
const INTRO_PREF_KEY = "mjsec:intro";
const GALLERY_LAYERS = [
  [
    "/static/images/image-12.webp",
    "/static/images/image-2.webp",
    "/static/images/image-3.webp",
    "/static/images/image-4.webp",
    "/static/images/image-5.webp",
    "/static/images/image-6.webp",
  ],
  [
    "/static/images/image-7.webp",
    "/static/images/image-8.webp",
    "/static/images/image-9.webp",
    "/static/images/image-10.webp",
    "/static/images/image-11.webp",
    "/static/images/image-13.webp",
  ],
  [
    "/static/images/image-14.webp",
    "/static/images/image-15.webp",
  ],
];
const GALLERY_HERO_IMAGE = "/static/images/image-1.webp";

function isMobileViewportClient() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function getClientDeviceProfile() {
  if (typeof window === "undefined") {
    return {
      isMobileViewport: false,
      prefersReducedMotion: false,
      saveDataEnabled: false,
      hardwareThreads: 0,
      deviceMemoryGb: 0,
    };
  }

  const networkInfo = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  return {
    isMobileViewport: isMobileViewportClient(),
    prefersReducedMotion: window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
    saveDataEnabled: Boolean(networkInfo?.saveData),
    hardwareThreads: Number(navigator.hardwareConcurrency || 0),
    deviceMemoryGb: Number(navigator.deviceMemory || 0),
  };
}

function shouldEnableQrWidget() {
  const profile = getClientDeviceProfile();
  if (profile.isMobileViewport || profile.prefersReducedMotion || profile.saveDataEnabled) return false;
  if (profile.deviceMemoryGb > 0 && profile.deviceMemoryGb < 8) return false;
  if (profile.hardwareThreads > 0 && profile.hardwareThreads < 8) return false;
  return true;
}

function readIntroPreference() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const queryValue = (params.get("intro") || "").toLowerCase();
  if (queryValue === "on" || queryValue === "off") {
    window.localStorage.setItem(INTRO_PREF_KEY, queryValue);
    return queryValue === "on";
  }

  const storedValue = (window.localStorage.getItem(INTRO_PREF_KEY) || "").toLowerCase();
  if (storedValue === "on") return true;
  if (storedValue === "off") return false;
  return null;
}

function getIntroEnabled() {
  if (!import.meta.env.DEV) return true;

  const preferred = readIntroPreference();
  if (preferred !== null) return preferred;

  const envValue = String(import.meta.env.VITE_DEV_INTRO || "").toLowerCase();
  return envValue === "1" || envValue === "true" || envValue === "on";
}

function findExistingScript(src) {
  const absoluteSrc = new URL(src, window.location.href).href;
  return Array.from(document.scripts).find((script) => (
    script.dataset.reactSrc === src
    || script.getAttribute("src") === src
    || script.src === absoluteSrc
  ));
}

function loadScript({ src, type = "text/javascript", attrs = {} }) {
  if (scriptLoadPromises.has(src)) {
    return scriptLoadPromises.get(src);
  }

  const promise = new Promise((resolve, reject) => {
    const existing = findExistingScript(src);
    if (existing) {
      if (existing.dataset.reactLoaded === "true") {
        resolve(existing);
      } else {
        existing.addEventListener("load", () => resolve(existing), { once: true });
        existing.addEventListener("error", () => reject(new Error(`[App] Failed to load: ${src}`)), { once: true });
      }
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.type = type;
    script.async = false;
    script.dataset.reactSrc = src;

    Object.entries(attrs).forEach(([key, value]) => {
      script.setAttribute(key, value);
    });

    script.addEventListener("load", () => {
      script.dataset.reactLoaded = "true";
      resolve(script);
    }, { once: true });

    script.addEventListener("error", () => {
      reject(new Error(`[App] Failed to load: ${src}`));
    }, { once: true });

    document.body.appendChild(script);
  });

  scriptLoadPromises.set(src, promise);
  return promise;
}

function loadDesktopQrWidget() {
  const start = async () => {
    try {
      await loadScript({ src: "https://unpkg.com/qrcode-generator@1.4.4/qrcode.js" });
      await loadScript({ src: "/static/qr-widget.js?v=20260410a", type: "module" });
    } catch (error) {
      console.error("[App] Failed to initialize QR widget.", error);
    }
  };

  if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      start();
    }, { timeout: 2500 });
    return;
  }

  setTimeout(() => {
    start();
  }, 1200);
}

async function bootstrapLegacyScripts() {
  await loadScript({
    src: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js",
    attrs: {
      integrity: "sha512-16esztaSRplJROstbIIdwX3N97V1+pZvV33ABoG1H2OyTttBxEGkTsoIVsiP1iaTtM8b3+hu2kB6pQ4Clr5yug==",
      crossorigin: "anonymous",
      referrerpolicy: "no-referrer"
    }
  });

  await loadScript({
    src: "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js",
    attrs: {
      integrity: "sha512-Ic9xkERjyZ1xgJ5svx3y0u3xrvfT/uPkV99LBwe68xjy/mGtO+4eURHZBW2xW4SZbFrF1Tf090XqB+EVgXnVjw==",
      crossorigin: "anonymous",
      referrerpolicy: "no-referrer"
    }
  });

  await loadScript({ src: "/static/script-video.js?v=20260410a" });

  if (shouldEnableQrWidget()) {
    loadDesktopQrWidget();
  }
}

function GalleryImage({ src, alt = "", loading = "lazy", fetchPriority = "low" }) {
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
    />
  );
}

export default function App() {
  const introEnabled = useMemo(() => getIntroEnabled(), []);
  const isMobileViewport = useMemo(() => isMobileViewportClient(), []);
  const [isMobileSocialMenuOpen, setIsMobileSocialMenuOpen] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        if (window.__mjsecLegacyBooted) return;
        window.__mjsecLegacyBooted = true;
        await bootstrapLegacyScripts();
      } catch (error) {
        console.error("[App] Failed to initialize scripts.", error);
      }
    };

    run();
  }, []);

  const handleDiscordClick = (event) => {
    event.preventDefault();
    if (isMobileViewport) {
      setIsMobileSocialMenuOpen(false);
    }
    window.alert("현재 이 기능은 중단되었습니다");
  };

  const handleFooterSocialNavigate = () => {
    if (isMobileViewport) {
      setIsMobileSocialMenuOpen(false);
    }
  };

  return (
    <>
      {introEnabled ? <IntroSection /> : null}
      <nav className="dot-nav" aria-label="Section navigation">
              <a className="dot-nav__item is-active" href="#page" aria-label="Go to sequence"></a>
              <a className="dot-nav__item" href="#space-approach" aria-label="Go to cards"></a>
              <a className="dot-nav__item" href="#sequence-spacer" aria-label="Go to timeline"></a>
              <a className="dot-nav__item" href="#gallery-start" aria-label="Go to gallery"></a>
              <a className="dot-nav__item" href="#gallery-fullscreen" aria-label="Go to fullscreen image"></a>
              <a className="dot-nav__item" href="#page-end" aria-label="Go to bottom"></a>
          </nav>
          <button className="hamburger-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="fullscreen-menu">
              <span></span>
              <span></span>
              <span></span>
          </button>
          <div className="hamburger-overlay" id="fullscreen-menu" aria-hidden="true">
              <nav className="hamburger-menu" aria-label="Quick menu">
                  <a className="hamburger-menu__item" href="https://linktr.ee/mjsec_welcome">Apply</a>
                  <a className="hamburger-menu__item" href="https://mjsec.kr/lms">LMS</a>
                  <a className="hamburger-menu__item" href="https://wiki.mjsec.kr/">WIKI</a>
              </nav>
          </div>
          <div id="main">
              <div id="page">
                  <canvas></canvas>
                  <div className="sequence-mobile-poster" aria-hidden="true">
                      <div className="sequence-mobile-poster__bg"></div>
                  </div>
                  <div className="sequence-intro-title" aria-hidden="true">MJSEC</div>
              </div>
                  <section id="space-approach" className="space-approach" aria-label="Immersive cards section">
                      <div className="space-viewport" id="space-viewport">
                          <div className="space-world" id="space-world"></div>
                          <div className="space-depth-mask"></div>
                          <div className="space-noise"></div>
                      </div>
                      <div className="space-scroll-proxy" aria-hidden="true"></div>
                  </section>
                  <div id="sequence-spacer" className="sequence-spacer">
                      <div className="sequence-effects">
                          <section className="process-timeline" aria-labelledby="process-title">
                              <div className="section-header">
                                  <h2 id="process-title" className="heading-2">
                                      <span className="heading-highlight">MEMBER LEVEL</span>
                                      <span className="heading-accent-word">Who You Are?</span>
                                  </h2>
                              </div>
                              <div className="timeline-wrapper">
                                  <svg className="timeline-svg-connector" aria-hidden="true">
                                      <path id="timeline-trace" fill="none"></path>
                                      <path id="timeline-trace-glow" fill="none" strokeLinecap="round"></path>
                                  </svg>
                                  <div className="timeline-steps" role="tablist" aria-label="CL level progression">
                                      <button className="timeline-step" role="tab" id="tab-step1" aria-controls="panel-step1" aria-selected="true">
                                          <div className="module-icon-wrapper">
                                              <div className="module-plate">
                                                  <img className="module-glyph" src="/static/icons/cl1.svg" alt="CL1 starter icon" />
                                              </div>
                                          </div>
                                          <div className="step-meta">
                                              <span className="step-index">Level 1 //</span>
                                              <div className="step-label">
                                                  <span className="label-bracket bracket-left">[</span>
                                                  <span className="label-text">CL 1</span>
                                                  <span className="label-bracket bracket-right">]</span>
                                              </div>
                                          </div>
                                      </button>
                                      <button className="timeline-step" role="tab" id="tab-step2" aria-controls="panel-step2" aria-selected="false">
                                          <div className="module-icon-wrapper">
                                              <div className="module-plate">
                                                  <img className="module-glyph" src="/static/icons/cl2.svg" alt="CL2 growth icon" />
                                              </div>
                                          </div>
                                          <div className="step-meta">
                                              <span className="step-index">Level 2 //</span>
                                              <div className="step-label">
                                                  <span className="label-bracket bracket-left">[</span>
                                                  <span className="label-text">CL 2</span>
                                                  <span className="label-bracket bracket-right">]</span>
                                              </div>
                                          </div>
                                      </button>
                                      <button className="timeline-step" role="tab" id="tab-step3" aria-controls="panel-step3" aria-selected="false">
                                          <div className="module-icon-wrapper">
                                              <div className="module-plate">
                                                  <img className="module-glyph" src="/static/icons/cl3.svg" alt="CL3 advanced icon" />
                                              </div>
                                          </div>
                                          <div className="step-meta">
                                              <span className="step-index">Level 3 //</span>
                                              <div className="step-label">
                                                  <span className="label-bracket bracket-left">[</span>
                                                  <span className="label-text">CL 3</span>
                                                  <span className="label-bracket bracket-right">]</span>
                                              </div>
                                          </div>
                                      </button>
                                      <button className="timeline-step" role="tab" id="tab-step4" aria-controls="panel-step4" aria-selected="false">
                                          <div className="module-icon-wrapper">
                                              <div className="module-plate">
                                                  <img className="module-glyph" src="/static/icons/cl4.svg" alt="CL4 expert icon" />
                                              </div>
                                          </div>
                                          <div className="step-meta">
                                              <span className="step-index">Level 4 //</span>
                                              <div className="step-label">
                                                  <span className="label-bracket bracket-left">[</span>
                                                  <span className="label-text">CL 4</span>
                                                  <span className="label-bracket bracket-right">]</span>
                                              </div>
                                          </div>
                                      </button>
                                  </div>
                              </div>
                              <div className="timeline-content-wrapper">
                                  <div className="timeline-panel active" role="tabpanel" id="panel-step1" aria-labelledby="tab-step1">
                                      <h3 className="panel-title">CL1 - New Comer</h3>
                                      <p className="panel-body">
                                          해킹 및 보안 전반의 기초 역량 함양 및 세부 전공 분야 탐색 단계
                                      </p>
                                  </div>
                                  <div className="timeline-panel" role="tabpanel" id="panel-step2" aria-labelledby="tab-step2" hidden>
                                      <h3 className="panel-title">CL2 - Core</h3>
                                      <p className="panel-body">
                                          설정된 전문 분야의 심화 프로젝트 수행 및 기술 세미나를 통한 실무 역량 강화
                                      </p>
                                  </div>
                                  <div className="timeline-panel" role="tabpanel" id="panel-step3" aria-labelledby="tab-step3" hidden>
                                      <h3 className="panel-title">CL3 - Mentor</h3>
                                      <p className="panel-body">
                                          탁월한 기술력을 바탕으로 교육 커리큘럼을 설계하고 후배 기수에게 지식을 전수하는 단계
                                      </p>
                                  </div>
                                  <div className="timeline-panel" role="tabpanel" id="panel-step4" aria-labelledby="tab-step4" hidden>
                                      <h3 className="panel-title">CL4 - Executive</h3>
                                      <p className="panel-body">
                                          동아리 운영 전략 수립, 조직 관리 및 거버넌스 구축을 통한 지속 가능한 성장을 도모하는 단계
                                      </p>
                                  </div>
                              </div>
                          </section>
                      </div>
                  </div>
      
                  <div id="gallery-start" className="content-wrap">
                      <TimelineDesign />
                      <main>
                          <section id="gallery-fullscreen" className="gallery-scroll-stage">
                              <div className="content">
                                  <div className="grid">
                                      {GALLERY_LAYERS.map((layer, layerIndex) => (
                                        <div className="layer" key={`gallery-layer-${layerIndex + 1}`}>
                                          {layer.map((src, imageIndex) => (
                                            <div key={src}>
                                              <GalleryImage
                                                src={src}
                                                alt=""
                                                loading={layerIndex === 0 && imageIndex === 0 ? "eager" : "lazy"}
                                                fetchPriority={layerIndex === 0 && imageIndex === 0 ? "auto" : "low"}
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      ))}
                                      <div className="scaler">
                                          <GalleryImage
                                            src={GALLERY_HERO_IMAGE}
                                            alt=""
                                            loading="eager"
                                            fetchPriority="high"
                                          />
                                      </div>
                                  </div>
                              </div>
                          </section>
                      </main>
                  </div>
                  <section id="post-sequence-space" className="post-sequence-space" aria-label="Footer zone">
                      <div className="post-sequence-upper" aria-label="Upper 70 percent area">
                          <svg className="social-svg-container" aria-hidden="true">
                              <defs>
                                  <filter id="social-warp-1" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
                                      <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
                                      <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
                                          <animate attributeName="dy" values="700;0" dur="6s" repeatCount="indefinite" calcMode="linear" />
                                      </feOffset>
                                      <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
                                      <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
                                          <animate attributeName="dy" values="0;-700" dur="6s" repeatCount="indefinite" calcMode="linear" />
                                      </feOffset>
                                      <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise3" seed="2" />
                                      <feOffset in="noise3" dx="0" dy="0" result="offsetNoise3">
                                          <animate attributeName="dx" values="490;0" dur="6s" repeatCount="indefinite" calcMode="linear" />
                                      </feOffset>
                                      <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise4" seed="2" />
                                      <feOffset in="noise4" dx="0" dy="0" result="offsetNoise4">
                                          <animate attributeName="dx" values="0;-490" dur="6s" repeatCount="indefinite" calcMode="linear" />
                                      </feOffset>
                                      <feComposite in="offsetNoise1" in2="offsetNoise2" result="part1" />
                                      <feComposite in="offsetNoise3" in2="offsetNoise4" result="part2" />
                                      <feBlend in="part1" in2="part2" mode="color-dodge" result="combinedNoise" />
                                      <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="30" xChannelSelector="R" yChannelSelector="B" />
                                  </filter>
                                  <filter id="social-warp-2" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
                                      <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="7" />
                                      <feColorMatrix type="hueRotate" result="pt1">
                                          <animate attributeName="values" values="0;360;" dur=".6s" repeatCount="indefinite" calcMode="paced" />
                                      </feColorMatrix>
                                      <feComposite />
                                      <feTurbulence type="turbulence" baseFrequency="0.03" numOctaves="7" seed="5" />
                                      <feColorMatrix type="hueRotate" result="pt2">
                                          <animate attributeName="values" values="0;333;199;286;64;168;256;157;360;" dur="5s" repeatCount="indefinite" calcMode="paced" />
                                      </feColorMatrix>
                                      <feBlend in="pt1" in2="pt2" mode="normal" result="combinedNoise" />
                                      <feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="B" />
                                  </filter>
                                  <filter id="social-warp-3" colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
                                      <feTurbulence type="turbulence" baseFrequency="0.018" numOctaves="9" result="noiseA" seed="11" />
                                      <feOffset in="noiseA" dx="0" dy="0" result="offsetNoiseA">
                                          <animate attributeName="dy" values="580;0" dur="5.4s" repeatCount="indefinite" calcMode="linear" />
                                      </feOffset>
                                      <feTurbulence type="turbulence" baseFrequency="0.023" numOctaves="8" result="noiseB" seed="13" />
                                      <feOffset in="noiseB" dx="0" dy="0" result="offsetNoiseB">
                                          <animate attributeName="dx" values="0;-460" dur="5.4s" repeatCount="indefinite" calcMode="linear" />
                                      </feOffset>
                                      <feBlend in="offsetNoiseA" in2="offsetNoiseB" mode="screen" result="combinedNoise" />
                                      <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="28" xChannelSelector="R" yChannelSelector="B" />
                                  </filter>
                              </defs>
                          </svg>
                          <div className="qna-grid" aria-label="QnA preview cards">
                              <article className="social-card-container qna-neon-card" data-variant="github" tabIndex="0" aria-label="Q1 카드">
                                  <div className="social-inner-container">
                                      <div className="social-border-outer">
                                          <div className="social-main-card"></div>
                                      </div>
                                      <div className="social-glow-layer-1"></div>
                                      <div className="social-glow-layer-2"></div>
                                  </div>
                                  <div className="social-overlay-1"></div>
                                  <div className="social-overlay-2"></div>
                                  <div className="social-background-glow"></div>
                                  <div className="social-content-container social-content-face social-content-face--front">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">QnA</div>
                                          <p className="social-title">Q1</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">지원 절차와 선발 기준은 어떻게 되나요?</p>
                                      </div>
                                  </div>
                                  <div className="social-content-container social-content-face social-content-face--back" aria-hidden="true">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">Answer</div>
                                          <p className="social-title">A1</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">입단 테스트 문제를 통하여 지원 후, 면접을 통하여 기술 수준보다 학습 의지와 꾸준함을 중심으로 선발합니다.</p>
                                      </div>
                                  </div>
                              </article>
                              <article className="social-card-container qna-neon-card" data-variant="instagram" tabIndex="0" aria-label="Q2 카드">
                                  <div className="social-inner-container">
                                      <div className="social-border-outer">
                                          <div className="social-main-card"></div>
                                      </div>
                                      <div className="social-glow-layer-1"></div>
                                      <div className="social-glow-layer-2"></div>
                                  </div>
                                  <div className="social-overlay-1"></div>
                                  <div className="social-overlay-2"></div>
                                  <div className="social-background-glow"></div>
                                  <div className="social-content-container social-content-face social-content-face--front">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">QnA</div>
                                          <p className="social-title">Q2</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">정기 세미나와 스터디는 주 몇 회 진행되나요?</p>
                                      </div>
                                  </div>
                                  <div className="social-content-container social-content-face social-content-face--back" aria-hidden="true">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">Answer</div>
                                          <p className="social-title">A2</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">정기 세미나는 주 1회 기준으로 운영되고, 분야별 스터디는 팀 일정에 맞춰 주 1~2회 유동적으로 진행됩니다.</p>
                                      </div>
                                  </div>
                              </article>
                              <article className="social-card-container qna-neon-card" data-variant="discord" tabIndex="0" aria-label="Q3 카드">
                                  <div className="social-inner-container">
                                      <div className="social-border-outer">
                                          <div className="social-main-card"></div>
                                      </div>
                                      <div className="social-glow-layer-1"></div>
                                      <div className="social-glow-layer-2"></div>
                                  </div>
                                  <div className="social-overlay-1"></div>
                                  <div className="social-overlay-2"></div>
                                  <div className="social-background-glow"></div>
                                  <div className="social-content-container social-content-face social-content-face--front">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">QnA</div>
                                          <p className="social-title">Q3</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">프로젝트는 팀 단위인가요, 개인 단위인가요?</p>
                                      </div>
                                  </div>
                                  <div className="social-content-container social-content-face social-content-face--back" aria-hidden="true">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">Answer</div>
                                          <p className="social-title">A3</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">프로젝트는 개인 또는 팀 단위로 모두 가능합니다. 다만 주제 규모와 목표에 따라 팀 프로젝트를 권장하며, 역할 분담과 일정 관리를 통해 협업 역량도 함께 기를 수 있습니다.</p>
                                      </div>
                                  </div>
                              </article>
                              <article className="social-card-container qna-neon-card" data-variant="apply" tabIndex="0" aria-label="Q4 카드">
                                  <div className="social-inner-container">
                                      <div className="social-border-outer">
                                          <div className="social-main-card"></div>
                                      </div>
                                      <div className="social-glow-layer-1"></div>
                                      <div className="social-glow-layer-2"></div>
                                  </div>
                                  <div className="social-overlay-1"></div>
                                  <div className="social-overlay-2"></div>
                                  <div className="social-background-glow"></div>
                                  <div className="social-content-container social-content-face social-content-face--front">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">QnA</div>
                                          <p className="social-title">Q4</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">초보자도 활동을 시작할 수 있을까요?</p>
                                      </div>
                                  </div>
                                  <div className="social-content-container social-content-face social-content-face--back" aria-hidden="true">
                                      <div className="social-content-top">
                                          <div className="social-scrollbar-glass">Answer</div>
                                          <p className="social-title">A4</p>
                                      </div>
                                      <hr className="social-divider" />
                                      <div className="social-content-bottom">
                                          <p className="social-description">기초 트랙과 멘토링이 준비되어 있어 비전공자나 초보자도 단계별로 학습하며 충분히 활동할 수 있습니다.</p>
                                      </div>
                                  </div>
                              </article>
                          </div>
                      </div>
                      <footer className="site-footer" aria-label="Club footer information">
                          <div className="site-footer__inner">
                              <div className="site-footer__brand">
                                  <div className="site-footer__logo-frame">
                                      <img className="site-footer__logo" src="/static/images/그림1.png" alt="동아리 로고" />
                                  </div>
                                  <div className="site-footer__brand-copy">
                                      <h2 className="site-footer__club-name">MJSEC</h2>
                                      <p className="site-footer__address">주소: 경기도 용인시 처인구 명지로 116</p>
                                  </div>
                              </div>
                              <div className="site-footer__leaders">
                                  <article className="site-footer__leader">
                                      <h3>president</h3>
                                      <p>name: 이윤태</p>
                                      <p>num: 010-9755-3453</p>
                                      <p className="site-footer__email">email: yoont1016@gmail.com</p>
                                  </article>
                                  <article className="site-footer__leader">
                                      <h3>vice</h3>
                                      <p>name: 최윤호</p>
                                      <p>num: 010‑3023‑4192</p>
                                      <p className="site-footer__email">email: gdool88@gmail.com</p>
                                  </article>
                              </div>
                              <div
                                  className={`site-footer__social${isMobileSocialMenuOpen ? " is-mobile-open" : ""}`}
                                  aria-label="Social media links"
                              >
                                  <button
                                      type="button"
                                      className={`site-footer__social-toggle${isMobileSocialMenuOpen ? " is-open" : ""}`}
                                      aria-label={isMobileSocialMenuOpen ? "Close social links" : "Open social links"}
                                      aria-expanded={isMobileSocialMenuOpen}
                                      onClick={() => setIsMobileSocialMenuOpen((prev) => !prev)}
                                  >
                                      <i className="fas fa-share-alt" aria-hidden="true"></i>
                                  </button>
                                  <div
                                      className="site-footer__social-item"
                                      style={{ "--mobile-social-x": "-78px", "--mobile-social-y": "-8px" }}
                                  >
                                      <a
                                          className="site-footer__social-pill site-footer__social-pill--github"
                                          href="https://github.com/MJSEC-MJU"
                                          aria-label="GitHub"
                                          onClick={handleFooterSocialNavigate}
                                      >
                                          <span className="site-footer__social-icon"><i className="fab fa-github"></i></span>
                                          <span className="site-footer__social-text">GitHub</span>
                                      </a>
                                  </div>
                                  <div
                                      className="site-footer__social-item"
                                      style={{ "--mobile-social-x": "-54px", "--mobile-social-y": "-64px" }}
                                  >
                                      <a
                                          className="site-footer__social-pill site-footer__social-pill--instagram"
                                          href="https://www.instagram.com/mjsec_mju/"
                                          aria-label="Instagram"
                                          onClick={handleFooterSocialNavigate}
                                      >
                                          <span className="site-footer__social-icon"><i className="fab fa-instagram"></i></span>
                                          <span className="site-footer__social-text">Instagram</span>
                                      </a>
                                  </div>
                                  <div
                                      className="site-footer__social-item"
                                      style={{ "--mobile-social-x": "0px", "--mobile-social-y": "-88px" }}
                                  >
                                      <a
                                          className="site-footer__social-pill site-footer__social-pill--discord"
                                          href="#"
                                          aria-label="Discord"
                                          onClick={handleDiscordClick}
                                      >
                                          <span className="site-footer__social-icon"><i className="fab fa-discord"></i></span>
                                          <span className="site-footer__social-text">Discord</span>
                                      </a>
                                  </div>
                              </div>
                          </div>
                          <p className="site-footer__copyright">Copyright © 2026 MJSEC. All rights reserved.</p>
                      </footer>
                  </section>
                  <div id="page-end"></div>
      
          </div>
          {!isMobileViewport ? (
            <div id="qr-fab" className="qr-fab" aria-label="Quick link widget"></div>
          ) : null}
    </>
  );
}


