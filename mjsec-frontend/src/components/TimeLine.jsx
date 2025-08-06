import { useEffect } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

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
  }, []);

  return (
    <div className="timeline">
      <div className="timeline-title"><h2>Found&nbsp;In&nbsp;2024</h2></div>

      <div className="section-timeline">
        <div className="timeline-list">
          <div className="timeline-progress"><div className="timeline-progress-bar" /></div>

          {/* 1st Item */}
          <div className="timeline-item">
            <div className="timeline_left fadeup"><div className="timeline-when">2024&nbsp;2nd&nbsp;sem</div></div>
            <div className="timeline_centre"><div className="timeline_circle" /></div>
            <div className="timeline_right fadeup">
              <div className="timeline-text">&bull;동아리&nbsp;개설<br />&bull;HSPACE&nbsp;x&nbsp;MJSEC&nbsp;파트너십&nbsp;체결<br />&bull;명지대&nbsp;모의해킹대회&nbsp;개최<br />&bull;선박해커톤&nbsp;우승</div>
              <div className="timeline-image"><img src="/timeline-source/pic1.jpg" width="480" /></div>
            </div>
          </div>

          {/* 2nd Item */}
          <div className="timeline-item">
            <div className="timeline_left fadeup"><div className="timeline-when">2024&nbsp;winter</div></div>
            <div className="timeline_centre"><div className="timeline_circle" /></div>
            <div className="timeline_right fadeup">
              <div className="timeline-text">&bull;화이트햇스쿨&nbsp;3기&nbsp;6명&nbsp;합격</div>
              <div className="timeline-image"><img src="/timeline-source/pic2.jpg" width="480" /></div>
            </div>
          </div>

          {/* 3rd Item */}
          <div className="timeline-item">
            <div className="timeline_left fadeup"><div className="timeline-when">2025&nbsp;1st&nbsp;sem</div></div>
            <div className="timeline_centre"><div className="timeline_circle" /></div>
            <div className="timeline_right fadeup">
              <div className="timeline-text">&bull;건국대,&nbsp;세종대와&nbsp;MSG&nbsp;CTF&nbsp;대회&nbsp;개최<br />-개인: 1등, 대학별: 1등<br />&bull;SPACE&nbsp;WAR&nbsp;(HSPACE&nbsp;주관)&nbsp;1위,&nbsp;3위</div>
              <div className="timeline-image"><img src="/timeline-source/pic3.jpg" width="480"  /></div>
            </div>
          </div>

          {/* 4th Item */}
          <div className="timeline-item">
            <div className="timeline_left fadeup"><div className="timeline-when">2025&nbsp;summer</div></div>
            <div className="timeline_centre"><div className="timeline_circle" /></div>
            <div className="timeline_right fadeup">
              <div className="timeline-text">&bull;BoB(Best&nbsp;of&nbsp;Best)&nbsp;14기&nbsp;2명&nbsp;합격(보안제품개발,&nbsp;보안컨설팅)<br />&bull;랜섬웨어&nbsp;개발<br />&bull;한국디지털포렌식학회&nbsp;학술대회&nbsp;표창</div>
              <div className="timeline-image"><img src="/timeline-source/pic4.jpg" width="480" /></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}