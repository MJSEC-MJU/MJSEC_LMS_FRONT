import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

export default function StickyAlbum() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /* Lenis 부드러운 스크롤 */
    const lenis = new Lenis({ lerp: 0.1 });
    const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    ScrollTrigger.defaults({ scroller: lenis.scroll });

    /* 카드 변환 매트릭스 */
    const transforms = [
      [[0, 50, -10, 10],  [20, -10, -45, 20]],
      [[0, 10, -40, 45],  [-25, 15, -45, 30]],
      [[0, 52.5, -10, -5],[90, 60, -40, 80]],
      [[0, 50, 30, -20],  [20, -10, 60, 5]],
      [[0, 55, -15, 30],  [25, -15, 60, -15]],
    ];

    const stickySection = document.querySelector(".sticky");
    const stickyHeader  = document.querySelector(".sticky-header");
    const cards         = document.querySelectorAll(".card");
    const stickyHeight  = window.innerHeight * 6;

    ScrollTrigger.create({
      trigger: stickySection,
      start: "top top",
      end: `+=${stickyHeight}px`,
      pin: true,
      pinSpacing: true,
      onUpdate: self => {
        const progress = self.progress;
        const maxTranslate = stickyHeader.offsetWidth - window.innerWidth;
        const translateX = -progress * maxTranslate;
        gsap.set(stickyHeader, { x: translateX });

        cards.forEach((card, index) => {
          const delay = index * 0.1125;
          const cardProgress = Math.max(0, Math.min((progress - delay) * 2, 1));

          if (cardProgress > 0) {
            const cardStartX = 25;
            const cardEndX   = -450;
            const yPos   = transforms[index][0];
            const rotate = transforms[index][1];

            const cardX = gsap.utils.interpolate(cardStartX, cardEndX, cardProgress);

            const yProgress = cardProgress * 3;
            const yIdx = Math.min(Math.floor(yProgress), yPos.length - 2);
            const yInt = yProgress - yIdx;

            const cardY = gsap.utils.interpolate(yPos[yIdx],     yPos[yIdx+1], yInt);
            const cardR = gsap.utils.interpolate(rotate[yIdx], rotate[yIdx+1], yInt);

            gsap.set(card, { xPercent: cardX, yPercent: cardY, rotation: cardR, opacity: 1 });
          } else gsap.set(card, { opacity: 0 });
        });
      }
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
      lenis.destroy();
    };
  }, []);

  return (
    <section className="sticky">
      <div className="sticky-header"><h1>MJSEC&nbsp;ALBUM</h1></div>

      {/* 카드 5개 */}
      <div className="card"><div className="card-img"><img src="https://cdn.pixabay.com/photo/2024/06/21/10/50/ai-generated-8844135_960_720.png"/></div></div>
      <div className="card"><div className="card-img"><img src="https://cdn.pixabay.com/photo/2024/06/21/10/50/ai-generated-8844136_1280.png"/></div></div>
      <div className="card"><div className="card-img"><img src="" alt="" /></div></div>
      <div className="card"><div className="card-img"><img src="" alt="" /></div></div>
      <div className="card"><div className="card-img"><img src="" alt="" /></div></div>
    </section>
  );
}
