import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

// 타임라인 데이터 배열 - 여기서 쉽게 관리할 수 있습니다
const timelineData = [
  {
    id: 1,
    when: "2024 2nd sem",
    text: "•동아리 개설\n•HSPACE x MJSEC 파트너십 체결\n•명지대 모의해킹대회 개최\n•2024 사이버시큐리티 해커톤대회 최우승상",
    image: "/timeline-source/pic1.jpg"
  },
  {
    id: 2,
    when: "2024 winter",
    text: "•화이트햇스쿨 3기 6명 합격",
    image: "/timeline-source/pic2.jpg"
  },
  {
    id: 3,
    when: "2025 1st sem",
    text: "•건국대, 세종대와 MSG CTF 대회 개최\n-개인: 1등, 대학별: 1등\n•SPACE WAR (HSPACE 주관) 1위, 3위",
    image: "/timeline-source/pic3.jpg"
  },
  {
    id: 4,
    when: "2025 summer",
    text: "•BoB(Best of Best) 14기 2명 합격\n (보안제품개발, 보안컨설팅)\n•랜섬웨어 개발\n•한국디지털포렌식학회 학술대회 표창",
    image: "/timeline-source/pic4.jpg"
  }
];

export default function Timeline() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    /* 진행 바 show/hide */
    const bar = document.querySelector(".timeline-progress-bar");
    ScrollTrigger.create({
      trigger: ".timeline",
      start: "top bottom",
      end: "bottom top",
      onEnter:   () => { bar && (bar.style.display = "block"); },
      onLeave:   () => { bar && (bar.style.display = "none");  },
      onEnterBack: () => { bar && (bar.style.display = "block"); },
      onLeaveBack: () => { bar && (bar.style.display = "none"); },
    });

    return () => ScrollTrigger.getAll().forEach(t => t.kill());
  }, [timelineData.length]); // timelineData.length가 변경될 때마다 재실행

  return (
    <div className="timeline">
      <div className="timeline-title"><h2>Found&nbsp;In&nbsp;2024</h2></div>

      <div className="section-timeline">
        <div className="timeline-list">
          <div className="timeline-progress"><div className="timeline-progress-bar" /></div>

          {/* 동적으로 타임라인 아이템들을 렌더링 */}
          {timelineData.map((item) => (
            <div key={item.id} className="timeline-item">
              <div className="timeline_left fadeup">
                <div className="timeline-when">{item.when.replace(/\s/g, '\u00A0')}</div>
              </div>
              <div className="timeline_centre"><div className="timeline_circle" /></div>
              <div className="timeline_right fadeup">
                <div className="timeline-text">
                  {item.text.split('\n').map((line, index) => (
                    <span key={index}>
                      {line.replace(/\s/g, '\u00A0')}
                      {index < item.text.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </div>
                <div className="timeline-image">
                  <img src={item.image} width="480" alt={`Timeline ${item.id}`} />
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}