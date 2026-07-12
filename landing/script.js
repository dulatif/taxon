document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Logic
  const themeToggle = document.getElementById('theme-toggle');
  const htmlEl = document.documentElement;
  
  const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>`;
  
  const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>`;

  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    htmlEl.setAttribute('data-theme', savedTheme);
    updateIcon(savedTheme);
  } else {
    updateIcon(prefersDark ? 'dark' : 'light');
  }

  function updateIcon(theme) {
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      let currentTheme = htmlEl.getAttribute('data-theme');
      if (!currentTheme) {
        currentTheme = prefersDark ? 'dark' : 'light';
      }
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      htmlEl.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateIcon(newTheme);
    });
  }

  // Mobile Menu Toggle
  const menuToggle = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Smooth Scroll
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        if (navLinks) {
          navLinks.classList.remove('active'); // Close mobile menu if open
        }
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    });
  });

  // Scroll Animations
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Unobserve after animating once
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.fade-in-up').forEach(el => {
    observer.observe(el);
  });
});
