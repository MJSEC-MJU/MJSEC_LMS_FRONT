// src/App.jsx
import { useRef }   from "react";
import IntroSection  from "./components/IntroSection";
import Navbar        from "./components/NavBar";
import FirstPage     from "./components/FirstPage";
import SecondPage    from "./components/SecondPage";
import ThirdPage     from "./components/ThirdPage";
import Timeline      from "./components/TimeLine";
import StickyAlbum   from "./components/StickyAlbum";
import FaqSection    from "./components/FaqSection";  
import PreFooter     from "./components/PreFooter";
import Footer        from "./components/Footer";

export default function App() {
  const faqRef = useRef(null);           // FAQ 스크롤 타깃S
  const faqRef = useRef(null);           // FAQ 스크롤 타깃
  const mainRef = useRef(null);          // 메인 스크롤 타깃
  const introRef = useRef(null);         // 인트로 스크롤 타깃
  const activityRef = useRef(null);      // 활동 스크롤 타깃

  return (
    <>
      <IntroSection />
      <Navbar 
        onFaqClick={() => faqRef.current?.scrollIntoView({ behavior:"smooth" })}
        onMainClick={() => mainRef.current?.scrollIntoView({ behavior:"smooth" })}
        onIntroClick={() => introRef.current?.scrollIntoView({ behavior:"smooth" })}
        onActivityClick={() => activityRef.current?.scrollIntoView({ behavior:"smooth" })}
      />
      <div ref={mainRef}>
        <FirstPage />
      </div>
      <div ref={introRef}>
        <SecondPage />
      </div>
      <div ref={activityRef}>
        <ThirdPage />
      </div>
      <Timeline />
      <StickyAlbum />
      <FaqSection ref={faqRef} />    
      <PreFooter />
      <Footer />
    </>
  );
}