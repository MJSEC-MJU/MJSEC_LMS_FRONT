import { useEffect } from "react";

export default function PreFooter() {
  useEffect(() => {
    /** 마우스 좌표 → CSS 변수 */
    const container = document.getElementById("cards");
    const cards = Array.from(document.querySelectorAll(".social-card"));

    const onMove = e => {
      cards.forEach(card => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      });
    };
    container.addEventListener("mousemove", onMove);
    return () => container.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section className="pre-footer autoShow">
      <div id="cards">

        {/* Instagram */}
        <div className="social-card">
          <div className="card-content">
            <i className="fa-brands fa-instagram" />
            <h2>Instagram</h2>
            <p>@ mjsec_MJU</p>
            <a href="https://www.instagram.com/mjsec_mju/" target="_blank" rel="noreferrer">
              <i className="fa-solid fa-link" />
              <span>Follow&nbsp;me</span>
            </a>
          </div>
        </div>

        {/* GitHub */}
        <div className="social-card">
          <div className="card-content">
            <i className="fa-brands fa-github" />
            <h2>GitHub</h2>
            <p>@ MJSEC</p>
            <a href="https://github.com/MJSEC-MJU/MJSEC_LMS_FRONT/tree/main" target="_blank" rel="noreferrer">
              <i className="fa-solid fa-link" />
              <span>Follow&nbsp;me</span>
            </a>
          </div>
        </div>

        {/* Discord */}
        <div className="social-card">
          <div className="card-content">
            <i className="fa-brands fa-discord" />
            <h2>Discord</h2>
            <p>@ MJSEC</p>
            <a href="https://discord.gg/KF8H3tpSQB" target="_blank" rel="noreferrer">
              <i className="fa-solid fa-link" />
              <span>Join</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}
