import React, { useLayoutEffect, useRef } from "react";
import "../styles/intro-section.css";

let gsapPromise = null;

function getGsap() {
  if (window.gsap) return Promise.resolve(window.gsap);
  if (!gsapPromise) {
    gsapPromise = import("https://esm.sh/gsap@3.13.0").then((mod) => mod.default || mod.gsap);
  }
  return gsapPromise;
}

export default function IntroSection() {
  const introRef = useRef(null);

  useLayoutEffect(() => {
    const prevOverflowY = document.body.style.overflowY;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;

    window.scrollTo(0, 0);
    document.body.style.overflowY = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflowY = prevOverflowY;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
    };
  }, []);

  useLayoutEffect(() => {
    if (!introRef.current) return undefined;

    let cancelled = false;
    let cleanup = () => {};

    getGsap()
      .then((gsap) => {
        if (cancelled || !introRef.current) return;

        const ctx = gsap.context(() => {
          const tl = gsap.timeline();

          tl.from(
            ".intro-titles .intro-title",
            {
              x: -60,
              opacity: 0,
              duration: 0.8,
              ease: "power3.inOut",
              stagger: 2,
            },
            0,
          );

          tl.to(
            ".intro-titles .intro-title",
            {
              x: 60,
              opacity: 0,
              duration: 0.8,
              ease: "power3.inOut",
              stagger: 2,
            },
            1.2,
          );

          tl.to(
            introRef.current,
            {
              y: "-100vh",
              duration: 1.5,
              ease: "power3.inOut",
              onComplete: () => {
                if (!introRef.current) return;
                introRef.current.style.display = "none";
                document.body.style.overflowY = "auto";
                document.body.style.position = "static";
                document.body.style.width = "";
                if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === "function") {
                  window.ScrollTrigger.refresh();
                }
              },
            },
            6,
          );
        }, introRef);

        cleanup = () => ctx.revert();
      })
      .catch((error) => {
        console.error("[IntroSection] Failed to load GSAP.", error);
      });

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div ref={introRef} className="intro-section">
      <div className="intro-titles">
        <div className="intro-title intro-title-1">
          <h1>Your&nbsp;Shield</h1>
        </div>
        <div className="intro-title intro-title-2">
          <h1>Our&nbsp;Mission</h1>
        </div>
        <div className="intro-title intro-title-3">
          <h1>MJSEC</h1>
        </div>
      </div>
    </div>
  );
}
