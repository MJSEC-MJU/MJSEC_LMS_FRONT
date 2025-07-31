
//nav바 스크립트

$(document).ready(function() {
    $('.expandHome').on('mouseover', function() {
        $('.sub-home').css('display', 'block');
    });

    $('.subnavbtn').on('mouseover', function() {
        $('.sub-home').css('display', 'none');
    });

    $('#trapezoid').on('mouseleave', function() {
        $('#trapezoid').css('margin-top', '-53px');
        $('.sub-home').css('display', 'none');
    }).on('mouseenter', function() {
        $('#trapezoid').css('margin-top', '0px');
    });
});

//nav바 스크롤 자동이동
function scrollDown(event, multiple) {
  event.preventDefault(); // a 태그 기본 이동 막기
  window.scrollTo({ top: window.innerHeight * multiple, behavior: 'smooth' });
}

//활동 페이지 스크롤 js코드

//화면 넘기기 버튼
let next = document.querySelector('.next')
let prev = document.querySelector('.prev')
next.addEventListener('click', function(){
    let items = document.querySelectorAll('.item');
    let firstItem = items[0];
    document.querySelector('.slide').appendChild(firstItem);
})

prev.addEventListener('click', function(){
    let items = document.querySelectorAll('.item');
    let lastItem = items[items.length - 1];
    document.querySelector('.slide').prepend(lastItem);
})



//모바일로 접속시 알림창
if (window.innerWidth <= 768) {
    alert("이 웹사이트는 데스크탑 환경에 최적화되어 있습니다.\nPC에서 접속해 주세요.");
}



//study now 버튼 클릭시 알림창
const contentButtons = document.querySelectorAll(".content button");

contentButtons.forEach(button => {
    button.addEventListener("click", function (e) {
        e.preventDefault();
        alert("지금은 신청 기간이 아닙니다!");
    });
});

let slide = document.querySelector('.slide');
let items = document.querySelectorAll('.item');
//화면 넘기기. 카드 클릭시.
document.querySelectorAll('.item').forEach(item => {
    item.addEventListener('click', () => {
        let slide = document.querySelector('.slide');
        let items = [...document.querySelectorAll('.item')];
        let index = items.indexOf(item);

        for (let i = 0; i < index - 1; i++) {
            slide.appendChild(slide.firstElementChild);
        }
    });
});

//소셜미디어 마우스 커서 위치
const cards = Array.from(document.querySelectorAll(".social-card"));
const cardsContainer = document.querySelector("#cards");
cardsContainer.addEventListener("mousemove", (e) => {
    for (const card of cards) {
        const rect = card.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
    }
});
//소개페이지 js
const lines = [
    "$ ls",
    "intro.txt vision.txt",
    "",
    "$ cat intro.txt",
    "안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
    "저희 동아리는 -----------------------------",
    "-----------------------------------------",
    "",
    "$ cat vision.txt",
    "저희의 목표는 ------------------------------"
];
const speed = 10;          // 한 글자당 ms
let line = 0, char = 0;
const term = document.getElementById("term-text");

function typeLine(){
    if(line < lines.length){
        if(char < lines[line].length){
        term.textContent += lines[line].charAt(char++);
        setTimeout(typeLine, speed);
        }else{
        term.textContent += "\n";
        line++; char = 0;
        setTimeout(typeLine, speed*4);
        }
    }else{
        const cursor = document.createElement("span");
        cursor.className = "cursor";
        term.appendChild(cursor);
    }
    }
window.addEventListener("DOMContentLoaded", typeLine);


//FAQ js코드
document.addEventListener("DOMContentLoaded", () => {
    const lenis = new Lenis();
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    gsap.registerPlugin(ScrollTrigger);

    const stickySection = document.querySelector(".sticky");
    const stickyHeader = document.querySelector(".sticky-header");
    const cards = document.querySelectorAll(".card");
    const stickyHeight = window.innerHeight * 6;

    const transforms = [
        [
        [0, 50, -10, 10],
        [20, -10, -45, 20],
        ],
        [
        [0, 10, -40, 45],
        [-25, 15, -45, 30],
        ],
        [
        [0, 52.5, -10, -5],
        [15, -5, -40, 60],
        ],
        [
        [0, 50, 30, -20],
        [20, -10, 60, 5],
        ],
        [
        [0, 55, -15, 30],
        [25, -15, 60, -15],
        ],
    ];



ScrollTrigger.create({
    trigger: stickySection,
    start: "top top",
    end: `+=${stickyHeight}px`,
    pin: true,
    pinSpacing: true,
        onUpdate: (self) => {
        const progress = self.progress;

        const maxTranslate = stickyHeader.offsetWidth - window.innerWidth;
        const translateX = -progress * maxTranslate;
        gsap.set(stickyHeader, { x: translateX });

        cards.forEach((card, index) => {
            const delay = index * 0.1125;
            const cardProgress = Math.max(0, Math.min((progress - delay) * 2, 1));

            if (cardProgress > 0) {
            const cardStartX = 25;
            const cardEndX = -650;
            const yPos = transforms[index][0];
            const rotations = transforms[index][1];

            const cardX = gsap.utils.interpolate(
                cardStartX,
                cardEndX,
                cardProgress
            );

            const yProgress = cardProgress * 3;
            const yIndex = Math.min(Math.floor(yProgress), yPos.length - 2);
            const yInterpolation = yProgress - yIndex;
            const cardY = gsap.utils.interpolate(
                yPos[yIndex],
                yPos[yIndex + 1],
                yInterpolation
            );

            const cardRotation = gsap.utils.interpolate(
                rotations[yIndex],
                rotations[yIndex + 1],
                yInterpolation
            );

            gsap.set(card, {
                xPercent: cardX,
                yPercent: cardY,
                rotation: cardRotation,
                opacity: 1,
            });
            } else {
            gsap.set(card, { opacity: 0 });
            }
        });
        },
    });
    });

    //타임라인 프로그레스바 화면 벗어나면 사라지게끔
if (window.innerWidth > 0) {
    ScrollTrigger.create({
        trigger: ".timeline",
        start: "top bottom",
        end: "bottom top",
    onEnter: () => {
        const progressBar = document.querySelector(".timeline-progress-bar");
        if (progressBar) {
            progressBar.style.display = "block";
        }
        },
    onLeave: () => {
        const progressBar = document.querySelector(".timeline-progress-bar");
        if (progressBar) {
            progressBar.style.display = "none";
        }
        },
        onEnterBack: () => {
        const progressBar = document.querySelector(".timeline-progress-bar");
        if (progressBar) {
            progressBar.style.display = "block";
        }
        },
        onLeaveBack: () => {
        const progressBar = document.querySelector(".timeline-progress-bar");
        if (progressBar) {
            progressBar.style.display = "none";
        }
        },
        });
    }

