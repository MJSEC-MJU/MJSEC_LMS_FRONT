import { useEffect, useRef } from "react";

const speed = 10;                         // ms per char

/** 공통 타이핑 제너레이터 */
const makeTyper = (el, lines, waitMs) => {
  const type = () => {
    let line = 0, char = 0, typing = true;
    const tick = () => {
      if (!typing) return;
      if (line < lines.length) {
        if (char < lines[line].length) {
          el.textContent += lines[line][char++];
          setTimeout(tick, speed);
        } else {
          el.textContent += "\n";
          line++; char = 0;
          setTimeout(tick, speed * 4);
        }
      } else {
        typing = false;
        setTimeout(erase, waitMs);
      }
    };
    const erase = () => {
      if (el.textContent.length) {
        el.textContent = el.textContent.slice(0, -1);
        setTimeout(erase, speed / 2);
      } else {
        typing = true; line = 0; char = 0;
        setTimeout(tick, 1000);
      }
    };
    tick();
  };
  return type;
};

export default function SecondPage() {
  const term1 = useRef(null);
  const term2 = useRef(null);
  const term3 = useRef(null);

  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    
    const lines1 = isMobile ? [
      "$ ls","intro.txt","",
      "$ cat intro.txt",
      ">>MJSEC은 2024년에 창설된",
      "명지대학교 유일 해킹/보안 동아리 입니다."
    ] : [
      "$ ls","intro.txt","",
      "$ cat intro.txt",
      ">>MJSEC은 2024년에 창설된 명지대학교 유일 해킹/보안 동아리 입니다.",
      "저희 동아리는 보안에 관심 있는 학생들이 모여 함께 배우고 성장하는, 즐겁고 진취적인 보안동아리입니다!"
    ];
    
    const lines2 = isMobile ? [
      "$ ls","goal.txt","",
      "$ cat goal.txt",
      ">>저희는 사이버 보안 전문 인재를 양성하며, 보안에 관심 있는 학생들이 모여 함께 배우고 성장하는, 즐겁고 진취적인 보안동아리입니다!"
    ] : [
      "$ ls","goal.txt","",
      "$ cat goal.txt",
      ">>MJSEC은 끊임없이 진화하는 디지털 세계에서 앞서가는 사이버 보안 전문 인재로 성장하고자 합니다.",
      "해킹과 보안에 대한 체계적인 학습을 통해 기술적 실력과 윤리 의식을 함께 갖춘 인재 양성을 지향합니다.",
      "그리고 기초부터 고급까지 보안 지식을 함께 공부하고, 실전 대회 참가 및 주최 경험을 통해 실력을 키워갑니다"
    ];
    
    const lines3 = isMobile ? [
      "$ ls","vision.txt","",
      "$ cat vision.txt",
      ">>현재 보안 기업과의 파트너십 그리고",
      "타 대학 보안 동아리와의 협업을 통해 더 나은 보안 미래를 꿈꿉니다."
    ] : [
      "$ ls","vision.txt","",
      "$ cat vision.txt",
      ">>여러 해킹 대회에서 우승을 하며 우수한 성과를 내고 있습니다.",
      "또한 부원들과의 프로젝트를 통해 한층 더 높은 목표를 향해 나아가고 있습니다.",
    ];

    /** transup 애니메이션이 시작되고 뷰포트에 80 % 노출됐을 때만 실행 */
    const setup = (el, fn) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          const run = () => fn();
          el.addEventListener("animationend", run, { once: true });

          // 만약 CSS 애니메이션이 이미 끝난 상태라면 강제 실행
          setTimeout(() => {
            if (!el.classList.contains("typing-started")) {
              el.classList.add("typing-started");
              fn();
            }
          }, 500);
          observer.disconnect();
        },
        { threshold: 0.8 }
      );
      observer.observe(el);
    };

    setup(term1.current, makeTyper(term1.current, lines1, 3000));
    setup(term2.current, makeTyper(term2.current, lines2, 4000));
    setup(term3.current, makeTyper(term3.current, lines3, 2000));
  }, []);

  return (
    <section className="second-page" style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
      <div className="second-page-bg" style={{ overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>

        <div className="mac-terminal transup">
          <div className="term-head"><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></div>
          <pre id="term-text1" ref={term1} style={{ overflowX: 'hidden', wordWrap: 'break-word', overflowWrap: 'break-word' }}/>
        </div>

        <div className="mac-terminal2 transup">
          <div className="term-head"><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></div>
          <pre id="term-text2" ref={term2} style={{ overflowX: 'hidden', wordWrap: 'break-word', overflowWrap: 'break-word' }}/>
        </div>

        <div className="mac-terminal3 transup">
          <div className="term-head"><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></div>
          <pre id="term-text3" ref={term3} style={{ overflowX: 'hidden', wordWrap: 'break-word', overflowWrap: 'break-word' }}/>
        </div>

      </div>
    </section>
  );
}