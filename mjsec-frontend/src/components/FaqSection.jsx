import { forwardRef, useId } from "react";

/** Q&A 데이터 */
const items = [
  {
    q: "동아리에서 무엇을 배우나요?",
    a: "우리 동아리는 해킹과 정보보안을 배우는 곳이에요. 웹해킹, 리버싱(프로그램 구조 분석), 디지털 포렌식(디지털 증거 분석), 포너블(시스템 취약점 찾아내기), 앱 해킹 등 다양한 분야에서 실제로 어떻게 해킹이 이루어지는지 배우고, 이를 통해 어떻게 시스템을 안전하게 보호할 수 있는지 연구합니다. 단순히 나쁜 짓을 하는 게 아니라, 시스템의 약점을 찾아내고 보완하는 '화이트 해커'가 되는 것을 목표로 해요."
  },
  {
    q: "지원 자격은 어떻게 되나요?",
    a: "동아리 입단 문제를 푼 후에 해킹에 대한 열정과 끈기만 가지고 계시다면 누구든지 가능합니다!"
  },
  {
    q: "해킹 외의 다른 것도 배우나요?",
    a: "저희는 해킹 외에도 Python, C, JAVA와 같은 프로그래밍 언어도 멘토링 활동을 진행하고 있습니다. 외에도 방학에는 부원들끼리 여러가지 프로젝트를 진행하여 경험을 쌓기도 합니다!"
  },
  {
    q: "다른 문의사항이 있어요",
    a: "하단 연락처로 언제든 편하게 연락해 주세요."
  }
];


export default forwardRef(function FaqSection(_, ref) {
  const baseId = useId();                      // 고유 id prefix

  return (
    <div className="FAQ-container" ref={ref}>
      {items.map((it, i) => {
        const id = `${baseId}-faq-${i}`;       // ex) :r0-faq-0
        return (
          <div key={id} className="FAQ-box autoShow">
            {/* ① 체크박스 — CSS가 상태를 감지 */}
            <input type="checkbox" id={id} name={`readmore${i}`} />

            {/* ② 콘텐츠 래퍼 */}
            <div className="FAQ-content">
              <h1>{it.q}</h1>

              <div className="FAQ-des">{it.a}</div>

              {/* ③ 토글 버튼(라벨) */}
              <div className="FAQ-button">
                <label
                  htmlFor={id}
                  data-more="READ ANSWER"
                  data-less="HIDE ANSWER"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});
