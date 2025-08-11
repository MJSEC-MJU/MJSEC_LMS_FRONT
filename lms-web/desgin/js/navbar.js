// navbar.js - 동적 navbar 로딩
function loadNavbar() {
   const navbarHTML = `
      <header class="header">
         <section class="flex">
            <a href="home.html" class="logo">MJSEC</a>

            <form action="search.html" method="post" class="search-form">
               <input type="text" name="search_box" required placeholder="search group..." maxlength="100">
               <button type="submit" class="fas fa-search"></button>
            </form>

            <div class="icons">
               <div id="menu-btn" class="fas fa-bars"></div>
               <div id="search-btn" class="fas fa-search"></div>
               <div id="user-btn" class="fas fa-user"></div>
               <div id="toggle-btn" class="fas fa-sun"></div>
            </div>

            <div class="profile">
               <img src="images/pic-1.jpg" class="image" alt="">
               <h3 class="name">이름</h3>
               <p class="role">학번</p>
               <a href="profile.html" class="btn">view profile</a>
               <div class="flex-btn">
                  <a href="login.html" class="option-btn">login</a>
                  <a href="register.html" class="option-btn">register</a>
               </div>
            </div>
         </section>
      </header>   

      <div class="side-bar">
         <div id="close-btn">
            <i class="fas fa-times"></i>
         </div>

         <div class="profile">
            <img src="images/pic-1.jpg" class="image" alt="">
            <h3 class="name">이름</h3>
            <p class="role">학번</p>
            <a href="profile.html" class="btn">view profile</a>
         </div>

         <nav class="navbar">
            <a href="home.html"><i class="fas fa-home"></i><span>home</span></a>
            <a href="notification.html"><i class="fa-solid fa-bell"></i><span>notification</span></a>
            <a href="courses.html"><i class="fas fa-graduation-cap"></i><span>courses</span></a>
         </nav>
      </div>
   `;
   
   // body 시작 부분에 navbar 삽입
   document.body.insertAdjacentHTML('afterbegin', navbarHTML);
   
   // navbar 로딩 후 이벤트 리스너 등록
   initializeNavbarEvents();
}

// #region 화면 색 변환 하는 거
function initializeNavbarEvents() {
   let toggleBtn = document.getElementById('toggle-btn');
   let body = document.body;
   let darkMode = localStorage.getItem('dark-mode');

   const enableDarkMode = () => {
      toggleBtn.classList.replace('fa-sun', 'fa-moon');
      body.classList.add('dark');
      localStorage.setItem('dark-mode', 'enabled');
   }

   const disableDarkMode = () => {
      toggleBtn.classList.replace('fa-moon', 'fa-sun');
      body.classList.remove('dark');
      localStorage.setItem('dark-mode', 'disabled');
   }

   if (darkMode === 'enabled') {
      enableDarkMode();
   }

   toggleBtn.onclick = (e) => {
      darkMode = localStorage.getItem('dark-mode');
      if (darkMode === 'disabled') {
         enableDarkMode();
      } else {
         disableDarkMode();
      }
   }

   let profile = document.querySelector('.header .flex .profile');

   document.querySelector('#user-btn').onclick = () => {
      profile.classList.toggle('active');
      search.classList.remove('active');
   }

   let search = document.querySelector('.header .flex .search-form');

   document.querySelector('#search-btn').onclick = () => {
      search.classList.toggle('active');
      profile.classList.remove('active');
   }

   let sideBar = document.querySelector('.side-bar');

   document.querySelector('#menu-btn').onclick = () => {
      sideBar.classList.toggle('active');
      body.classList.toggle('active');
   }

   document.querySelector('#close-btn').onclick = () => {
      sideBar.classList.remove('active');
      body.classList.remove('active');
   }

   window.onscroll = () => {
      profile.classList.remove('active');
      search.classList.remove('active');

      if (window.innerWidth < 1200) {
         sideBar.classList.remove('active');
         body.classList.remove('active');
      }
   }
}
// #endregion

// 페이지 로딩시 빠르게 로딩시켜서 빈화면이 잠깐 번쩍 거리는 현상 없애려고 만든 코드
if (document.body) {
   loadNavbar();
} else {
   document.addEventListener('DOMContentLoaded', loadNavbar);
}
