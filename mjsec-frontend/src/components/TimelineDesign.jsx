import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import "../styles/timeline-design.css";

const THEME_PRESETS = {
  light: {
    bg: "#07090e",
    fg: "#e9eef7",
    muted: "rgba(201, 213, 232, 0.82)",
    year: "#2f3a52",
    cardBg: "rgba(14, 18, 28, 0.68)",
    cardBorder: "rgba(160, 181, 214, 0.22)",
    yearLayerOpacity: 1,
  },
  foundation: {
    bg: "#020202",
    fg: "#eaf4ff",
    muted: "rgba(207, 222, 243, 0.86)",
    year: "#979ba3",
    cardBg: "rgba(11, 17, 29, 0.74)",
    cardBorder: "rgba(143, 166, 203, 0.26)",
    yearLayerOpacity: 0.33,
  },
  achievement: {
    bg: "#090d16",
    fg: "#f2f7ff",
    muted: "rgba(198, 211, 233, 0.86)",
    year: "#1d222c",
    cardBg: "rgba(12, 21, 36, 0.72)",
    cardBorder: "rgba(129, 157, 202, 0.3)",
    yearLayerOpacity: 0.31,
  },
  growth: {
    bg: "#131414",
    fg: "#ecfff6",
    muted: "rgba(199, 231, 217, 0.86)",
    year: "#48665d",
    cardBg: "rgba(11, 31, 24, 0.68)",
    cardBorder: "rgba(121, 177, 150, 0.3)",
    yearLayerOpacity: 0.32,
  },
};

const TIMELINE_ITEMS = [
  {
    id: "FOUNDING_2024",
    year: "2024",
    theme: "foundation",
    tiles: [
      {
        type: "image",
        pos: "pos-top-left-10",
        w: "25vw",
        ratio: "16 / 9",
        src: "timeline-source/timeline-1.jpg",
        alt: "MJSEC-image",
        depth: 10,
        z: 1,
      },
      {
        type: "text",
        pos: "pos-bottom-right",
        w: "500px",
        ratio: "16 / 9",
        heading: "Club Launch and Structure",
        copy:
          "•동아리 개설\n•HSPACE x MJSEC 파트너십 체결\n•명지대 모의해킹대회 개최\n•2024 사이버시큐리티 해커톤대회 최우승상\n•화이트햇스쿨 3기 6명 합격",
        depth: 20,
        z: 4,
      },
      {
        type: "image",
        pos: "pos-bottom-left",
        w: "35vw",
        ratio: "16 / 9",
        src: "timeline-source/timeline-2.jpeg",
        alt: "MJSEC-image",
        depth: 25,
        z: 1,
      },
    ],
  },
  {
    id: "EXPANSION_2025",
    year: "2025",
    theme: "growth",
    tiles: [
      {
        type: "image",
        pos: "pos-top-left",
        w: "35vw",
        ratio: "16 / 9",
        src: "timeline-source/timeline-3.jpg",
        alt: "MJSEC-image",
        depth: 15,
        z: 1,
      },
      {
        type: "image",
        pos: "pos-bottom-right-10",
        w: "280px",
        ratio: "1 / 1",
        src: "timeline-source/timeline-4.jpeg",
        alt: "MJSEC-image",
        depth: 30,
        z: 3,
      },
      {
        type: "text",
        pos: "pos-bottom-left-10",
        w: "500px",
        ratio: "16 / 9",
        heading: "Events, Awards, and Growth",
        copy:
          "•건국대, 세종대와 MSG CTF 대회 개최\n•중앙대, 건국대(글로컬), 상명대, 순천향대와 MSG CTF 대회 개최\n•SPACE WAR (HSPACE 주관) 1위, 3위\n•BoB(Best of Best) 14기 2명 합격\n•한국디지털포렌식학회 학술대회 표창",
        depth: 25,
        z: 4,
      },
    ],
  }
];

function fallbackSvgDataUri(label = "Missing") {
  const sanitizedLabel = String(label).replace(/[<>&"]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="700">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop stop-color="#e8e8e8" offset="0"/>
          <stop stop-color="#cfcfcf" offset="1"/>
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="system-ui" font-size="34" fill="#666">
        ${sanitizedLabel}
      </text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export default function TimelineDesign() {
  const timelineRef = useRef(null);

  useEffect(() => {
    const timelineEl = timelineRef.current;
    if (!timelineEl) return;

    gsap.registerPlugin(ScrollTrigger);

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let prefersReducedMotion = reducedMotionQuery.matches;
    const mediaListeners = [];
    const handleViewportRefresh = () => ScrollTrigger.refresh();

    const handleReducedMotion = (event) => {
      prefersReducedMotion = event.matches;
    };

    if (reducedMotionQuery.addEventListener) {
      reducedMotionQuery.addEventListener("change", handleReducedMotion);
    } else {
      reducedMotionQuery.addListener(handleReducedMotion);
    }
    window.addEventListener("resize", handleViewportRefresh);
    window.addEventListener("orientationchange", handleViewportRefresh);

    const setThemeVars = (theme, animate = true) => {
      const vars = {
        "--gh-bg": theme.bg,
        "--gh-fg": theme.fg,
        "--gh-muted": theme.muted,
        "--gh-year": theme.year,
        "--gh-card-bg": theme.cardBg,
        "--gh-card-border": theme.cardBorder,
        "--gh-year-layer-opacity": String(theme.yearLayerOpacity ?? 0.4),
      };

      if (!animate || prefersReducedMotion) {
        Object.entries(vars).forEach(([key, value]) => {
          timelineEl.style.setProperty(key, value);
        });
        return;
      }

      gsap.to(timelineEl, {
        duration: 0.45,
        ease: "power2.out",
        ...vars,
      });
    };

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray(".gh-panel", timelineEl);
      const years = gsap.utils.toArray(".gh-year", timelineEl);
      if (!panels.length || !years.length) return;
      const isMobileViewport = window.matchMedia("(max-width: 900px)").matches;

      const getPanelTheme = (panelEl) => {
        const themeName = panelEl.dataset.theme;
        return THEME_PRESETS[themeName] || THEME_PRESETS.light;
      };

      const getTopImageTile = (panelEl) => {
        const imageTiles = Array.from(panelEl.querySelectorAll('.gh-tile[data-tile-type="image"]'));
        if (!imageTiles.length) return panelEl;
        return imageTiles.reduce((topTile, tile) => {
          return tile.offsetTop < topTile.offsetTop ? tile : topTile;
        }, imageTiles[0]);
      };

      const yearCharsByIndex = years.map((yearEl) => Array.from(yearEl.querySelectorAll(".gh-char")));
      let activeYearIndex = 0;

      years.forEach((yearEl, index) => {
        const chars = yearEl.querySelectorAll(".gh-char");
        gsap.set(chars, {
          yPercent: index === 0 ? 0 : 100,
          autoAlpha: index === 0 ? 1 : 0,
        });
      });

      const animateToYear = (nextIndex) => {
        if (nextIndex < 0 || nextIndex >= years.length || nextIndex === activeYearIndex) return;

        const direction = nextIndex > activeYearIndex ? 1 : -1;
        const fromChars = yearCharsByIndex[activeYearIndex];
        const toChars = yearCharsByIndex[nextIndex];

        if (prefersReducedMotion) {
          yearCharsByIndex.forEach((chars, index) => {
            gsap.set(chars, {
              yPercent: index === nextIndex ? 0 : (index < nextIndex ? -100 : 100),
              autoAlpha: index === nextIndex ? 1 : 0,
            });
          });
          activeYearIndex = nextIndex;
          return;
        }

        yearCharsByIndex.forEach((chars, index) => {
          if (index === activeYearIndex || index === nextIndex) return;
          gsap.set(chars, {
            yPercent: index < nextIndex ? -100 : 100,
            autoAlpha: 0,
          });
        });

        gsap.killTweensOf(fromChars);
        gsap.killTweensOf(toChars);

        gsap.set(toChars, {
          yPercent: direction > 0 ? 100 : -100,
          autoAlpha: 1,
        });

        gsap.to(fromChars, {
          yPercent: direction > 0 ? -100 : 100,
          autoAlpha: 0,
          duration: 0.58,
          stagger: 0.05,
          ease: "power2.out",
        });

        gsap.to(toChars, {
          yPercent: 0,
          autoAlpha: 1,
          duration: 0.58,
          stagger: 0.05,
          ease: "power2.out",
        });

        activeYearIndex = nextIndex;
      };

      timelineEl.querySelectorAll('[data-reveal="media"], [data-reveal="video"]').forEach((mediaNode) => {
        const tileTrigger = mediaNode.closest(".gh-tile") || mediaNode;

        const revealMedia = () => {
          if (prefersReducedMotion) {
            gsap.set(mediaNode, { opacity: 1, scale: 1 });
            return;
          }

          gsap.fromTo(
            mediaNode,
            { opacity: 0, scale: 1.1 },
            {
              opacity: 1,
              scale: 1,
              duration: 0.8,
              ease: "power2.out",
              scrollTrigger: {
                trigger: tileTrigger,
                start: "top 70%",
                once: true,
              },
            }
          );
        };

        if (mediaNode.tagName === "IMG") {
          if (mediaNode.complete && mediaNode.naturalWidth > 0) {
            revealMedia();
          } else {
            const onLoad = () => revealMedia();
            mediaNode.addEventListener("load", onLoad, { once: true });
            mediaListeners.push(() => mediaNode.removeEventListener("load", onLoad));
          }
          return;
        }

        if (mediaNode.readyState >= 1) {
          revealMedia();
        } else {
          const onMeta = () => revealMedia();
          mediaNode.addEventListener("loadedmetadata", onMeta, { once: true });
          mediaListeners.push(() => mediaNode.removeEventListener("loadedmetadata", onMeta));
        }
      });

      timelineEl.querySelectorAll('[data-reveal="text"]').forEach((textNode) => {
        const tileTrigger = textNode.closest(".gh-tile") || textNode;

        if (prefersReducedMotion) {
          gsap.set(textNode, { opacity: 1, y: 0 });
          return;
        }

        gsap.set(textNode, { opacity: 0, y: 24 });
        gsap.to(textNode, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: tileTrigger,
            start: "top 70%",
            once: true,
          },
        });
      });

      timelineEl.querySelectorAll('[data-reveal="video"]').forEach((videoNode) => {
        const tileTrigger = videoNode.closest(".gh-tile") || videoNode;
        ScrollTrigger.create({
          trigger: tileTrigger,
          start: "top center",
          end: "bottom top",
          onEnter: () => videoNode.play().catch(() => {}),
          onEnterBack: () => videoNode.play().catch(() => {}),
          onLeave: () => videoNode.pause(),
          onLeaveBack: () => videoNode.pause(),
        });
      });

      panels.forEach((panelEl) => {
        panelEl.querySelectorAll(".gh-tile").forEach((tileEl) => {
          const depth = Number(tileEl.dataset.depth || 18);
          const parallaxMultiplier = isMobileViewport ? 3.2 : 5;
          if (prefersReducedMotion) {
            gsap.set(tileEl, { y: 0 });
            return;
          }

          gsap.fromTo(
            tileEl,
            { y: -depth },
            {
              y: depth * parallaxMultiplier,
              ease: "none",
              scrollTrigger: {
                trigger: panelEl,
                start: "top center",
                end: "bottom center",
                scrub: true,
              },
            }
          );
        });
      });

      panels.forEach((panelEl, index) => {
        if (index === 0) return;
        const triggerTile = getTopImageTile(panelEl);
        const prevPanel = panels[index - 1];

        ScrollTrigger.create({
          trigger: triggerTile,
          start: "top center",
          invalidateOnRefresh: true,
          onEnter: () => {
            animateToYear(index);
            setThemeVars(getPanelTheme(panelEl), true);
          },
          onEnterBack: () => {
            animateToYear(index);
            setThemeVars(getPanelTheme(panelEl), true);
          },
          onLeaveBack: () => {
            animateToYear(index - 1);
            setThemeVars(getPanelTheme(prevPanel), true);
          },
        });
      });

      setThemeVars(getPanelTheme(panels[0]), false);
    }, timelineEl);

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
      mediaListeners.forEach((unbind) => unbind());

      if (reducedMotionQuery.addEventListener) {
        reducedMotionQuery.removeEventListener("change", handleReducedMotion);
      } else {
        reducedMotionQuery.removeListener(handleReducedMotion);
      }
      window.removeEventListener("resize", handleViewportRefresh);
      window.removeEventListener("orientationchange", handleViewportRefresh);
    };
  }, []);

  return (
    <section ref={timelineRef} className="gh-timeline-root" data-app="timeline">
      <ul className="gh-panels" data-panels>
        {TIMELINE_ITEMS.map((item) => (
          <li key={item.id}>
            <article className="gh-panel" data-theme={item.theme}>
              <div className="gh-panel-stage">
                {item.tiles.map((tile, index) => {
                  const className = `gh-tile gh-${tile.pos || ""}`.trim();
                  const style = {
                    "--gh-w": tile.w || "30vw",
                    "--gh-ratio": tile.ratio || "16 / 9",
                    "--gh-z": String(tile.z ?? 1),
                  };

                  if (tile.type === "text") {
                    const copyText = String(tile.copy || "").replace(/\\n/g, "\n");
                    return (
                      <div
                        key={`${item.id}-tile-${index}`}
                        className={className}
                        style={style}
                        data-depth={tile.depth ?? 0}
                        data-tile-type={tile.type}
                      >
                        <div className="gh-tile__box gh-text-only__box">
                          <div className="gh-tile__text" data-reveal="text">
                            <p>{copyText}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (tile.type === "video") {
                    const mediaType = tile.src?.endsWith(".webm") ? "video/webm" : "video/mp4";
                    return (
                      <div
                        key={`${item.id}-tile-${index}`}
                        className={className}
                        style={style}
                        data-depth={tile.depth ?? 0}
                        data-tile-type={tile.type}
                      >
                        <div className="gh-tile__box">
                          <video
                            className="gh-tile__media"
                            muted
                            loop
                            playsInline
                            autoPlay
                            preload="metadata"
                            poster={tile.poster || ""}
                            data-reveal="video"
                          >
                            <source src={tile.src || ""} type={mediaType} />
                          </video>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${item.id}-tile-${index}`}
                      className={className}
                      style={style}
                      data-depth={tile.depth ?? 0}
                      data-tile-type={tile.type}
                    >
                      <div className="gh-tile__box">
                        <img
                          className="gh-tile__media"
                          src={tile.src || ""}
                          alt={tile.alt || ""}
                          loading="lazy"
                          decoding="async"
                          data-reveal="media"
                          onError={(event) => {
                            const img = event.currentTarget;
                            if (img.dataset.fallbackApplied === "true") return;
                            img.dataset.fallbackApplied = "true";
                            img.src = fallbackSvgDataUri(tile.alt || "Image");
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div className="gh-years-layer" aria-hidden="true">
        <div className="gh-years-wrapper" data-timeline="years-wrapper">
          {TIMELINE_ITEMS.map((item) => (
            <div key={`year-${item.id}`} className="gh-year" data-timeline="year">
              {String(item.year).split("").map((ch, index) => (
                <span key={`year-${item.id}-${index}`} className="gh-char">
                  {ch}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
