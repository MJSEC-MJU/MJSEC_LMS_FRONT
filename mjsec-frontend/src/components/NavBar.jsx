import { useRef, useState } from "react";

export default function Navbar({ onFaqClick, onMainClick, onIntroClick, onActivityClick }) {
  const trapRef = useRef(null);
  const subRef = useRef(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const showSub = () => (subRef.current.style.display = "block");
  const hideSub = () => (subRef.current.style.display = "none");

  const scrollDown = n => () =>
    window.scrollTo({ top: window.innerHeight * n, behavior: "smooth" });

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleMobileMenuClick = (onClick) => {
    console.log("Mobile menu clicked"); // 디버깅용
    setIsMenuOpen(false);
    if (onClick && typeof onClick === 'function') {
      onClick();
    }
  };

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
      <span></span>
      <span>{text}</span>
      <span></span>
    </a>
  );

  return (
    <>
      <div className="hamburger" onClick={toggleMenu}>
        <span></span>
        <span></span>
        <span></span>
      </div>

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
            onClick={onMainClick}
          />
          <Item text="소개" className="expandHome" onClick={onIntroClick} />
          <Item text="활동" className="expandHome" onClick={onActivityClick} />
          <Item text="FAQ" className="expandHome" onClick={onFaqClick} />
          <Item
            text="LMS"
            className="expandHome"
            onClick={() => alert("LMS페이지에 대한 접근 권한이 없습니다.")}
          />
        </div>
      </nav>

      <div className={`mobile-menu ${isMenuOpen === true ? 'active' : ''}`}>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleMobileMenuClick(onMainClick);
        }}>메인</a>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleMobileMenuClick(onIntroClick);
        }}>소개</a>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleMobileMenuClick(onActivityClick);
        }}>활동</a>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleMobileMenuClick(onFaqClick);
        }}>FAQ</a>
        <a href="#" onClick={(e) => {
          e.preventDefault();
          handleMobileMenuClick(() => alert("LMS페이지에 대한 접근 권한이 없습니다."));
        }}>LMS</a>
      </div>
    </>
  );
}