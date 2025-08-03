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
    const lines1 = [
      "$ ls","goal.txt","",
      "$ cat goal.txt",
      ">>안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
      "저희 동아리는 -----------------------------","-----------------------------------------"
    ];
    const lines2 = [
      "$ ls","intro.txt","",
      "$ cat intro.txt",
      ">>안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
      "저희 동아리는 -----------------------------","-----------------------------------------"
    ];
    const lines3 = [
      "$ ls","vision.txt","",
      "$ cat vision.txt",
      ">>안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
      "저희 동아리는 -----------------------------","-----------------------------------------"
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
    <section className="second-page">
      <div className="second-page-bg">

        <div className="mac-terminal transup">
          <div className="term-head"><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></div>
          <pre id="term-text1" ref={term1}/>
        </div>

        <div className="mac-terminal2 transup">
          <div className="term-head"><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></div>
          <pre id="term-text2" ref={term2}/>
        </div>

        <div className="mac-terminal3 transup">
          <div className="term-head"><span className="traffic red"/><span className="traffic yellow"/><span className="traffic green"/></div>
          <pre id="term-text3" ref={term3}/>
        </div>

      </div>
    </section>
  );
}
