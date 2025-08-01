import logo from "../assets/1rd-pics/mockup-logo.png";

export default function Footer() {
  return (
    <footer>
      <div className="footer-text">
        <div className="club-name">
          {/* 문자열이 아니라 변수 logo 를 그대로 사용 */}
          <img src={logo} style={{ width: "50px" }} alt="MJSEC 로고" />
          <h1>MJSEC</h1>
        </div>

        <div
          className="footer-location"
          style={{ display: "inline-block", color: "#646363", fontSize: "0.87rem" }}
        >
          경기도 용인시 처인구 명지로 116
        </div>

        <div className="mem-info">
          <div className="president-info">
            <div className="president-name">회장&nbsp;이윤태</div>
            <div className="president-num">num&nbsp;:&nbsp;010‑9755‑3453</div>
            <div className="president-email">email&nbsp;:&nbsp;yoont1016@gmail.com</div>
          </div>

          <div className="subpresident-info">
            <div className="president-name">부회장&nbsp;최윤호</div>
            <div className="president-num">num&nbsp;:&nbsp;010‑3023‑4192</div>
            <div className="president-email">email&nbsp;:&nbsp;gdool88@gmail.com</div>
          </div>
        </div>

        <div className="copyright">Copyright&nbsp;&copy;&nbsp;MJSEC</div>
      </div>
    </footer>
  );
}
