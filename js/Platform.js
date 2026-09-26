/* =============================================
   Platform.js — FlipPage Platform Page Logic
   ============================================= */

'use strict';

/* ============================================================
   1. FEATURE TABS — Switch between panels
   ============================================================ */
(function initPlatformTabs() {
  const tabBtns   = document.querySelectorAll('.pf-tab-btn');
  const tabPanels = document.querySelectorAll('.pf-tab-panel');

  if (!tabBtns.length) return;

  function activateTab(target) {
    tabBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === target);
      btn.setAttribute('aria-selected', btn.dataset.tab === target ? 'true' : 'false');
    });
    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === target);
    });
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });
})();


/* ============================================================
   2. SCROLL REVEAL — Animate elements on scroll
   ============================================================ */
(function initScrollReveal() {
  const revealEls = document.querySelectorAll('.pf-reveal');
  if (!revealEls.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: '0px 0px -60px 0px' }
  );

  revealEls.forEach(el => io.observe(el));
})();


/* ============================================================
   3. STATS COUNTER — Animate numbers up on scroll
   ============================================================ */
(function initStatsCounter() {
  const statNums = document.querySelectorAll('.pf-stat-num[data-count]');
  if (!statNums.length) return;

  function animateCount(el) {
    const target  = parseFloat(el.dataset.count);
    const suffix  = el.dataset.suffix || '';
    const prefix  = el.dataset.prefix || '';
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 1800;
    const startTime = performance.now();

    function tick(now) {
      const elapsed = Math.min(now - startTime, duration);
      const progress = elapsed / duration;
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.5 }
  );

  statNums.forEach(el => io.observe(el));
})();


/* ============================================================
   4. PLATFORM HERO VISUAL — Subtle parallax on mouse move
   ============================================================ */
(function initHeroParallax() {
  const visual = document.querySelector('.platform-hero-visual');
  if (!visual) return;

  let rafId;
  document.addEventListener('mousemove', (e) => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const rect = document.body.getBoundingClientRect();
      const cx   = rect.width  / 2;
      const cy   = rect.height / 2;
      const dx   = (e.clientX - cx) / cx;
      const dy   = (e.clientY - cy) / cy;
      const img  = visual.querySelector('.platform-hero-img');
      if (img) {
        img.style.transform = `translate(${dx * -6}px, ${dy * -6}px)`;
      }
    });
  });
})();


/* ============================================================
   5. SMOOTH ANCHOR LINKS — Enhanced scroll for in-page links
   ============================================================ */
(function initSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', function(e) {
      const id = this.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navbar = document.getElementById('navbar');
      const offset = navbar ? navbar.offsetHeight + 16 : 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ============================================================
   6. PLATFORM FEATURE ROWS — Staggered reveal on scroll
   ============================================================ */
(function initFeatureRowReveal() {
  const featureRows = document.querySelectorAll('.pf-feature-inner');
  if (!featureRows.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const children = entry.target.querySelectorAll('.pf-feature-content, .pf-feature-visual');
          children.forEach((child, i) => {
            child.style.transitionDelay = `${i * 0.12}s`;
            child.classList.add('visible');
          });
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  featureRows.forEach(row => {
    row.querySelectorAll('.pf-feature-content, .pf-feature-visual')
       .forEach(el => el.classList.add('pf-reveal'));
    io.observe(row);
  });
})();
