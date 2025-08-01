import { useRef } from "react";

export default function Navbar({ onFaqClick }) {
  const trapRef = useRef(null);
  const subRef  = useRef(null);

  /** 메뉴에 마우스를 올렸을 때 서브메뉴 보이기 */
  const showSub = () => (subRef.current.style.display = "block");
  const hideSub = () => (subRef.current.style.display = "none");

  /** 페이지 고정 높이(n * vh)로 스크롤 */
  const scrollDown = n => () =>
    window.scrollTo({ top: window.innerHeight * n, behavior: "smooth" });

  /** 메뉴 한 개를 렌더링하는 작은 컴포넌트 */
  const Item = ({ text, onClick, className, spanRef }) => (
    <a
      href="#"
      ref={spanRef}
      className={className}
      onMouseEnter={showSub}
      onClick={e => {
        e.preventDefault();
        onClick();
      }}
    >
      {/* 왼쪽 빈 span – 모서리 선용 */}
      <span></span>
      {/* 실제 텍스트 넣는 span */}
      <span>{text}</span>
      {/* 오른쪽 빈 span – 모서리 선용 */}
      <span></span>
    </a>
  );

  return (
    <nav className="navbar">
      <div
        id="trapezoid"
        ref={trapRef}
        onMouseEnter={() => (trapRef.current.style.marginTop = "0")}
        onMouseLeave={() => {
          trapRef.current.style.marginTop = "-53px";
          hideSub();
        }}
      >
        <Item
          text="메인"
          className="sub-home"
          spanRef={subRef}
          onClick={scrollDown(0)}
        />
        <Item text="소개"  className="expandHome" onClick={scrollDown(1)} />
        <Item text="활동"  className="expandHome" onClick={scrollDown(2)} />
        <Item text="FAQ"   className="expandHome" onClick={onFaqClick} />
        <Item
          text="LMS"
          className="expandHome"
          onClick={() => alert("LMS페이지에 대한 접근 권한이 없습니다.")}
        />
      </div>
    </nav>
  );
}