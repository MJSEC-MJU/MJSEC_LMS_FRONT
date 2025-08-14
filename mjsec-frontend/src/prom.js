window.scrollTo(0,0)


//인트로 페이지중에는 스크롤 막기
document.body.style.overflowY = 'hidden';
document.body.style.position = 'fixed';

function preventScroll(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
}


//인트로 페이지때 스크롤 내려지면 이상해서 스크롤 못하게 막음
document.addEventListener('wheel', preventScroll, { passive: false });
document.addEventListener('touchmove', preventScroll, { passive: false });
document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'PageDown' || e.key === 'PageUp' || e.key === ' ') {
        e.preventDefault();
        return false;
    }
});

TweenMax.staggerFrom(
	".titles > div",
	0.8,{x: "-60", ease: Power3.easeInOut, opacity: "0", }, 2 );
	TweenMax.staggerTo(
	".titles > div", 0.8, { x: "60", ease: Power3.easeInOut, delay: 1.2, opacity: "0", }, 2);

setTimeout(function() {
	TweenMax.to(".intro-section", 1.5, { y: "-100vh", ease: Power3.easeInOut,
		onComplete: function() {
			document.querySelector(".intro-section").style.display = "none";
            document.body.style.overflowY = 'auto';
            document.body.style.position = 'static'; // body 고정 해제

            document.removeEventListener('wheel', preventScroll);
            document.removeEventListener('touchmove', preventScroll);
		}
	});

	if (window.innerWidth > 768) { // 데스크탑 환경에서만 애니메이션 적용
		TweenMax.fromTo(".main-section", 1.5, {y: "100vh"}, {y: "0", ease: Power3.easeInOut,delay: 0.3 });
	}
}, 6000);






window.addEventListener('load', function() {
    window.scrollTo(0, window.scrollY);
});



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
    event.preventDefault();
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
// 터미널 1용 텍스트
const lines1 = [
    "$ ls",
    "goal.txt",
    "",
    "$ cat intro.txt",
    ">>안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
    "저희 동아리는 -----------------------------",
    "-----------------------------------------"
];

// 터미널 2용 텍스트
const lines2 = [
    "$ ls",
    "intro.txt",
    "",
    "$ cat intro.txt",
    ">>안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
    "저희 동아리는 -----------------------------",
    "-----------------------------------------"
];

// 터미널 3용 텍스트
const lines3 = [
    "$ ls",
    "vision.txt",
    "",
    "$ cat intro.txt",
    ">>안녕하십니까 명지대학교 보안동아리 Mjsec입니다.",
    "저희 동아리는 -----------------------------",
    "-----------------------------------------"
];
const speed = 10;          // 한 글자당 ms
let line = 0, char = 0;
const term1 = document.getElementById("term-text1");
const term2 = document.getElementById("term-text2");
const term3 = document.getElementById("term-text3");

// 터미널 1용 타이핑 함수 (무한 반복)
function typeLine1() {
    let line = 0, char = 0;
    let isTyping = true;
    
    function type() {
        if (isTyping) {
            if (line < lines1.length) {
                if (char < lines1[line].length) {
                    term1.textContent += lines1[line].charAt(char++);
                    setTimeout(type, speed);
                } else {
                    term1.textContent += "\n";
                    line++; char = 0;
                    setTimeout(type, speed * 4);
                }
            } else {
                // 타이핑 완료 후 잠시 대기
                setTimeout(() => {
                    isTyping = false;
                    erase();
                }, 3000);
            }
        }
    }
    
    function erase() {
        if (!isTyping) {
            if (term1.textContent.length > 0) {
                term1.textContent = term1.textContent.slice(0, -1);
                setTimeout(erase, speed / 2);
            } else {
                // 지우기 완료 후 다시 타이핑 시작
                line = 0; char = 0;
                isTyping = true;
                setTimeout(type, 1000);
            }
        }
    }
    
    type();
}

// 터미널 2용 타이핑 함수 (무한 반복)
function typeLine2() {
    let line = 0, char = 0;
    let isTyping = true;
    
    function type() {
        if (isTyping) {
            if (line < lines2.length) {
                if (char < lines2[line].length) {
                    term2.textContent += lines2[line].charAt(char++);
                    setTimeout(type, speed);
                } else {
                    term2.textContent += "\n";
                    line++; char = 0;
                    setTimeout(type, speed * 4);
                }
            } else {
                // 타이핑 완료 후 잠시 대기
                setTimeout(() => {
                    isTyping = false;
                    erase();
                }, 4000);
            }
        }
    }
    
    function erase() {
        if (!isTyping) {
            if (term2.textContent.length > 0) {
                term2.textContent = term2.textContent.slice(0, -1);
                setTimeout(erase, speed / 2);
            } else {
                // 지우기 완료 후 다시 타이핑 시작
                line = 0; char = 0;
                isTyping = true;
                setTimeout(type, 1000);
            }
        }
    }
    
    type();
}

// 터미널 3용 타이핑 함수 (무한 반복)
function typeLine3() {
    let line = 0, char = 0;
    let isTyping = true;
    
    function type() {
        if (isTyping) {
            if (line < lines3.length) {
                if (char < lines3[line].length) {
                    term3.textContent += lines3[line].charAt(char++);
                    setTimeout(type, speed);
                } else {
                    term3.textContent += "\n";
                    line++; char = 0;
                    setTimeout(type, speed * 4);
                }
            } else {
                // 타이핑 완료 후 잠시 대기
                setTimeout(() => {
                    isTyping = false;
                    erase();
                }, 2000);
            }
        }
    }
    
    function erase() {
        if (!isTyping) {
            if (term3.textContent.length > 0) {
                term3.textContent = term3.textContent.slice(0, -1);
                setTimeout(erase, speed / 2);
            } else {
                // 지우기 완료 후 다시 타이핑 시작
                line = 0; char = 0;
                isTyping = true;
                setTimeout(type, 1000);
            }
        }
    }
    
    type();
}
// transup 키프레임 후에 타이핑 효과 발동 하도록
function setupTerminalAnimation(terminalElement, typingFunction) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const handleAnimationEnd = () => {
                typingFunction();
                };
                
                terminalElement.addEventListener('animationend', handleAnimationEnd, { once: true });
                
                setTimeout(() => {
                // transup 키프레임 시작 안 됏을 때
                if (!terminalElement.classList.contains('typing-started')) {
                    terminalElement.classList.add('typing-started');
                    typingFunction();
                }
                }, 500);
                
                observer.unobserve(entry.target);
            }
            });
        }, { threshold: 0.8 });
        
    observer.observe(terminalElement);
}

// 터미널별 설정
setupTerminalAnimation(term1, typeLine1);
setupTerminalAnimation(term2, typeLine2);
setupTerminalAnimation(term3, typeLine3);


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
        [90, 60, -40, 80],
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
            const cardEndX = -450;
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


//FAQ버튼 스크롤시 중간 sticky페이지 때문에 화면의 세로 길이에 따라 이동 구간이 달라져서 함수 추가
function scrollToFAQ(event) {
    event.preventDefault();
    const faqSection = document.querySelector('.FAQ-container');
    if (faqSection) {
        faqSection.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
    }
}