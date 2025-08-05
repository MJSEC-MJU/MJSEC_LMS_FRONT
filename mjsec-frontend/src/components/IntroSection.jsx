import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export default function IntroSection() {
  const introRef = useRef(null);

  /* ---------- 진입 애니메이션 ---------- */
  useLayoutEffect(() => {
    /** body 스크롤 잠금 (원본과 동일) */
    window.scrollTo(0, 0);
    document.body.style.overflowY = "hidden";
    document.body.style.position  = "fixed";
  }, []);

  /* ---------- GSAP 타임라인 ---------- */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      /* 0 s  ─  등장  ------------------------------------------------------ */
      tl.from(
        ".titles .title",
        {
          x: -60,
          opacity: 0,
          duration: 0.8,
          ease: "power3.inOut",
          stagger: 2,          // 2 초 간격 
        },
        0                        // ← 타임라인 시작 지점
      );

      /* 1.2 s ─  퇴장(겹쳐서 진행)  ---------------------------------------- */
      tl.to(
        ".titles .title",
        {
          x: 60,
          opacity: 0,
          duration: 0.8,
          ease: "power3.inOut",
          stagger: 2,          // 2 초 간격 
        },
        1.2                      // ← ‘절대’ 시간; 0 s + 1.2 s
      );

      /* 6 s  ─  인트로 섹션 슬라이드 아웃  --------------------------------- */
      tl.to(
        introRef.current,
        {
          y: "-100vh",
          duration: 1.5,
          ease: "power3.inOut",
          onComplete() {
            introRef.current.style.display = "none";
            document.body.style.overflowY = "auto";
            document.body.style.position  = "static";
          },
        },
        6                        // ← setTimeout(6000) 과 동일한 절대 시점
      );

      // tl.fromTo(
      //   ".main-section",
      //   { y: "100vh" },
      //   { y: 0, duration: 1.5, ease: "power3.inOut" },
      //   6.3            // 6 s + 0.3 s
      // );
    }, introRef);

    return () => ctx.revert();      // StrictMode 2회 실행 대비 클린업
  }, []);

  /* ---------- ❸ JSX ---------- */
  return (
    <div ref={introRef} className="intro-section">
      <div className="titles">
        <div className="title title-1">
          <h1>Your&nbsp;Shield</h1>
        </div>
        <div className="title title-2">
          <h1>Our&nbsp;Mission</h1>
        </div>
        <div className="title title-3">
          <h1>MJSEC</h1>
        </div>
      </div>
    </div>
  );
}