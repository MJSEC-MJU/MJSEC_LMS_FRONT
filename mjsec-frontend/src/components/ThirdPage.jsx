import { useEffect, useRef } from "react";

import picReverse  from "../assets/3rd-pics/new-pic2.png";
import picWeb      from "../assets/3rd-pics/pic1.png";
import picPwn      from "../assets/3rd-pics/new-pic3.png";
import picForensic from "../assets/3rd-pics/new-pic4.png";
import picApp      from "../assets/3rd-pics/new-pic6.png";

export default function ThirdPage() {
  const slideRef = useRef(null);

  useEffect(() => {
    const slide = slideRef.current;
    if (!slide) return;

    /* ↔ 버튼 */
    const next = () => slide.appendChild(slide.firstElementChild);
    const prev = () => slide.prepend(slide.lastElementChild);

    document.querySelector(".next")?.addEventListener("click", next);
    document.querySelector(".prev")?.addEventListener("click", prev);

    /* 카드 클릭 → 맨 앞으로 */
    slide.querySelectorAll(".item").forEach(item => {
      item.addEventListener("click", () => {
        const items = [...slide.children];
        const idx = items.indexOf(item);
        for (let i = 0; i < idx - 1; i++) slide.appendChild(slide.firstElementChild);
      });
    });



    /* 클린업 */
    return () => {
      document.querySelector(".next")?.removeEventListener("click", next);
      document.querySelector(".prev")?.removeEventListener("click", prev);
    };
  }, []);

  return (
    <section className="third-page fadeup1">
      <div className="container">
        <div className="slide" ref={slideRef}>
          {/* 1) Reversing */}
          <div className="item" style={{ backgroundImage: `url(${picReverse})` }}>
            <div className="content">
              <div className="name">Reversing</div>
              <div className="des">
                소프트웨어의 내부 동작 원리를 분석해 문제를 파악하거나 보안 취약점을
                찾고, 복구하거나 대응하기 위한 목적입니다.
              </div>
            </div>
          </div>

          {/* 2) Web Hacking */}
          <div className="item" style={{ backgroundImage: `url(${picWeb})` }}>
            <div className="content">
              <div className="name">
                Web<br />Hacking
              </div>
              <div className="des">
                웹사이트나 웹 서비스를 공격해 취약점을 찾아내고, 이를 통해 보안을
                강화하거나 침해 시도를 탐지하는 목적입니다.
              </div>
            </div>
          </div>

          {/* 3) Pwnable */}
          <div className="item" style={{ backgroundImage: `url(${picPwn})` }}>
            <div className="content">
              <div className="name">Pwnable</div>
              <div className="des">
                시스템 취약점을 이용해 권한을 획득하거나 제어권을 얻어 보안 약점을
                실질적으로 증명하는 데 목적이 있습니다.
              </div>
            </div>
          </div>

          {/* 4) Digital Forensic */}
          <div className="item" style={{ backgroundImage: `url(${picForensic})` }}>
            <div className="content">
              <div className="name">Digital&nbsp;<br></br>Forensic</div>
              <div className="des">
                해킹이나 사고 발생 후 디지털 증거를 분석해 경위와 원인을 밝혀 법적
                증거나 보안 강화에 활용하는 것이 목적입니다.
              </div>
            </div>
          </div>

          {/* 5) App Hacking */}
          <div className="item" style={{ backgroundImage: `url(${picApp})` }}>
            <div className="content">
              <div className="name">App&nbsp;Hacking</div>
              <div className="des">
                앱 해킹은 모바일 앱의 내부 동작 원리를 분석해 보안 취약점을 찾아내고,
                이를 악용하거나 방어하기 위한 목적입니다.
              </div>
            </div>
          </div>
        </div>

        {/* ← / → 버튼 */}
        <div className="button">
          <button className="prev">
            <i className="fa-solid fa-arrow-left" />
          </button>
          <button className="next">
            <i className="fa-solid fa-arrow-right" />
          </button>
        </div>
      </div>
    </section>
  );
}