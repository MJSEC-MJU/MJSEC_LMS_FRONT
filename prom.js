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

// your existing typing function
function typeLine() {
  if (line < lines.length) {
    if (char < lines[line].length) {
      term.textContent += lines[line].charAt(char++);
      setTimeout(typeLine, speed);
    } else {
      term.textContent += "\n";
      line++; char = 0;
      setTimeout(typeLine, speed * 4);
    }
  } else {
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    term.appendChild(cursor);
  }
}

// set up an observer that fires once when "#term-text" enters the viewport
const observer = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      typeLine();
      obs.unobserve(entry.target);  // stop observing once triggered
    }
  });
}, {
  threshold: 0.5  // fire when 50% of the element is visible
});

observer.observe(term);
