// src/App.jsx
import { useRef }   from "react";
import IntroSection  from "./components/IntroSection";
import Navbar        from "./components/Navbar";
import FirstPage     from "./components/FirstPage";
import SecondPage    from "./components/SecondPage";
import ThirdPage     from "./components/ThirdPage";
import Timeline      from "./components/Timeline";
import StickyAlbum   from "./components/StickyAlbum";
import FaqSection    from "./components/FaqSection";  
import PreFooter     from "./components/PreFooter";
import Footer        from "./components/Footer";

export default function App() {
  const faqRef = useRef(null);           // FAQ 스크롤 타깃

  return (
    <>
      <IntroSection />
      <Navbar onFaqClick={() => faqRef.current?.scrollIntoView({ behavior:"smooth" })} />
      <FirstPage />
      <SecondPage />
      <ThirdPage />
      <Timeline />
      <StickyAlbum />
      <FaqSection ref={faqRef} />    
      <PreFooter />
      <Footer />
    </>
  );
}
