/* =============================================
   AnnualFlip — Main JavaScript
   ============================================= */

/* ---------- Hero: Cycling word rotator ---------- */
(function initHeroCycle() {
  const cycle = document.getElementById('hero-cycle-word');
  if (!cycle) return;

  const words = cycle.querySelectorAll('.hero-word');
  let current = 0;
  const total = words.length;

  function next() {
    words[current].classList.remove('active');
    current = (current + 1) % total;
    words[current].classList.add('active');
    // Slide the stack up to show the active word
    cycle.style.transform = `translateY(-${current * 1.15}em)`;
  }

  setInterval(next, 2400);
})();

/* ---------- Hero: Staggered section entry animations ---------- */
(function initReveal() {
  const targets = document.querySelectorAll(
    '.hero-left, .hero-right, .hero-badge, .built-for-section, .fast-work-section, .solutions-section'
  );
  if (!('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  targets.forEach(el => io.observe(el));
})();

/* ---------- Navbar scroll shadow ---------- */
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

/* ---------- Mobile nav toggle ---------- */
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.getElementById('nav-links');
if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!isExpanded));
    navLinks.classList.toggle('open');
  });

  // Close nav on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Platform mega menu click toggle (matches screenshot interaction)
  const platformBtn = document.getElementById('platform-dropdown-btn');
  const dropdownLi = platformBtn ? platformBtn.closest('.nav-item-dropdown') : null;
  if (platformBtn && dropdownLi) {
    platformBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdownLi.classList.toggle('open');
      platformBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!dropdownLi.contains(e.target)) {
        dropdownLi.classList.remove('open');
        platformBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }
}

/* ---------- Flipbook viewer (optional on page) ---------- */
const bookEl   = document.getElementById('book');
const prevBtn  = document.getElementById('prevBtn');
const nextBtn  = document.getElementById('nextBtn');
const pageLbl  = document.getElementById('pagecount');
const statusEl = document.getElementById('status');
const pdfInput = document.getElementById('pdfInput');

if (bookEl && prevBtn && nextBtn && pageLbl) {
  let pages   = [];
  let current = 0;
  let total   = 0;

  const SAMPLE = [
    { bg: 'linear-gradient(135deg,#1A3FD4,#2563EB)', text: 'FlipPage\nSample Book' },
    { bg: 'linear-gradient(135deg,#2563EB,#06B6D4)', text: 'Page 2\nClick to flip →' },
    { bg: 'linear-gradient(135deg,#06B6D4,#38BDF8)', text: 'Page 3\nUpload your PDF below' },
    { bg: 'linear-gradient(135deg,#38BDF8,#1A3FD4)', text: 'Back Cover' },
  ];

  function buildBook(items, isImage) {
    bookEl.innerHTML = '';
    pages = [];
    total = items.length;
    current = 0;

    items.forEach((item, i) => {
      const div = document.createElement('div');
      div.className = 'page';
      div.style.zIndex = total - i;

      if (isImage) {
        div.style.backgroundImage = `url(${item})`;
      } else {
        div.style.background = item.bg;
        div.style.whiteSpace  = 'pre-line';
        div.textContent       = item.text;
      }

      div.addEventListener('click', () => { if (i === current) flipNext(); });
      bookEl.appendChild(div);
      pages.push(div);
    });

    updateControls();
  }

  function flipNext() {
    if (current >= total) return;
    pages[current].classList.add('flipped');
    current++;
    updateControls();
  }

  function flipPrev() {
    if (current <= 0) return;
    current--;
    pages[current].classList.remove('flipped');
    updateControls();
  }

  function updateControls() {
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current >= total;
    pageLbl.textContent = `Page ${Math.min(current + 1, total)} of ${total}`;
  }

  prevBtn.addEventListener('click', flipPrev);
  nextBtn.addEventListener('click', flipNext);

  buildBook(SAMPLE, false);

  /* ---------- PDF upload ---------- */
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  if (pdfInput) {
    pdfInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (statusEl) statusEl.textContent = 'Rendering your PDF…';

      try {
        const buf  = await file.arrayBuffer();
        const pdf  = await pdfjsLib.getDocument({ data: buf }).promise;
        const imgs = [];

        for (let p = 1; p <= pdf.numPages; p++) {
          const page     = await pdf.getPage(p);
          const viewport = page.getViewport({ scale: 1.4 });
          const canvas   = document.createElement('canvas');
          canvas.width   = viewport.width;
          canvas.height  = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
          imgs.push(canvas.toDataURL('image/jpeg', 0.85));
        }

        buildBook(imgs, true);
        if (statusEl) statusEl.textContent = `Loaded "${file.name}" — ${imgs.length} pages.`;
      } catch {
        if (statusEl) statusEl.textContent = 'Could not read that PDF. Try a different file.';
      }
    });
  }
}
