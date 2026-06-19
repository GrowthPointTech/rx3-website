// Nav — scroll behavior + mobile toggle
(function () {
  const nav       = document.getElementById('nav');
  const toggle    = document.getElementById('navToggle');
  const mobile    = document.getElementById('navMobile');
  if (!nav) return;

  // Scroll: add is-scrolled when past threshold
  const SCROLL_THRESHOLD = 60;
  function onScroll() {
    if (window.scrollY > SCROLL_THRESHOLD) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run on load

  // Mobile toggle
  if (!toggle || !mobile) return;
  toggle.addEventListener('click', function () {
    const isOpen = mobile.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  // Close mobile nav when a link is clicked
  mobile.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobile.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobile.classList.contains('is-open')) {
      mobile.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      toggle.focus();
    }
  });
})();
