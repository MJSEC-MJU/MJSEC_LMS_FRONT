import bgMain from "../assets/1rd-pics/bg.jpg";   

export default function MainSection() {
  return (
    <section
      className="first-page main-section"
      /* CSS‑in‑JS 로 background-image 삽입 */
      style={{ backgroundImage: `linear-gradient(to right,#2e02ee75,#7069048e), url(${bgMain})` }}
    >
      <div className="banner">
        <div className="slogan">
          <div className="slogan-text left">No Headache</div>
          <div className="slogan-text right">No Hack</div>
        </div>
        <div className="center-button">
          <button
            className="join-btn"
            onClick={() => alert("지금은 모집 기간이 아닙니다!")}
          >
            CLICK&nbsp;ME
          </button>
        </div>
      </div>
    </section>
  );
}