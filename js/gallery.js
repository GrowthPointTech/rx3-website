// Gallery lightbox
(function () {
  const grid      = document.getElementById('galleryGrid');
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lightboxImg');
  const lbCaption = document.getElementById('lightboxCaption');
  const lbClose   = document.getElementById('lightboxClose');
  const lbPrev    = document.getElementById('lightboxPrev');
  const lbNext    = document.getElementById('lightboxNext');

  if (!grid || !lightbox) return;

  const items = Array.from(grid.querySelectorAll('.gallery-item'));
  let current = 0;

  function openLightbox(index) {
    current = index;
    const img = items[index].querySelector('img');
    const cap = items[index].querySelector('.gallery-item__caption');
    lbImg.src     = img.src;
    lbImg.alt     = img.alt;
    lbCaption.textContent = cap ? cap.textContent.trim() : '';
    lightbox.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    lbClose.focus();
  }

  function closeLightbox() {
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    items[current].focus();
  }

  function showPrev() {
    openLightbox((current - 1 + items.length) % items.length);
  }

  function showNext() {
    openLightbox((current + 1) % items.length);
  }

  // Click on gallery items
  items.forEach(function (item, i) {
    item.addEventListener('click', function () { openLightbox(i); });
    item.setAttribute('tabindex', '0');
    item.setAttribute('role', 'button');
    item.setAttribute('aria-label', 'View ' + (item.querySelector('img')?.alt || 'image'));
    item.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(i); }
    });
  });

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', showPrev);
  lbNext.addEventListener('click', showNext);

  // Click outside image to close
  lightbox.addEventListener('click', function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard navigation
  document.addEventListener('keydown', function (e) {
    if (!lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   showPrev();
    if (e.key === 'ArrowRight')  showNext();
  });
})();
