/**
 * PRICING PAGE INTERACTIVE CONTROLLER - FlipPage
 */

document.addEventListener('DOMContentLoaded', () => {
  initBillingToggle();
  initFaqAccordion();
  initNav();
});

function initBillingToggle() {
  const monthlyBtn = document.getElementById('btn-monthly');
  const annualBtn = document.getElementById('btn-annual');
  const savingsIndicator = document.getElementById('annual-savings-indicator');

  if (!monthlyBtn || !annualBtn) return;

  function setBillingCycle(isAnnual) {
    // Button state
    monthlyBtn.classList.toggle('is-active', !isAnnual);
    monthlyBtn.setAttribute('aria-checked', String(!isAnnual));
    annualBtn.classList.toggle('is-active', isAnnual);
    annualBtn.setAttribute('aria-checked', String(isAnnual));

    // Savings text
    if (savingsIndicator) {
      savingsIndicator.textContent = isAnnual 
        ? 'Save more with annual billing' 
        : 'Switch to annual billing to save up to 37%';
    }

    // Toggle card views
    document.querySelectorAll('.price-annual-view').forEach(el => {
      el.hidden = !isAnnual;
    });

    document.querySelectorAll('.price-monthly-view').forEach(el => {
      el.hidden = isAnnual;
    });
  }

  monthlyBtn.addEventListener('click', () => setBillingCycle(false));
  annualBtn.addEventListener('click', () => setBillingCycle(true));
}

function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      // Close other open FAQs
      faqItems.forEach(other => {
        if (other !== item) {
          other.classList.remove('is-open');
          const btn = other.querySelector('.faq-question');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current
      item.classList.toggle('is-open', !isOpen);
      questionBtn.setAttribute('aria-expanded', String(!isOpen));
    });
  });
}

function initNav() {
  // Mobile Nav Toggle
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.contains('is-open');
      navLinks.classList.toggle('is-open', !isOpen);
      navToggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

  // Mega dropdown toggle on mobile / click
  const platformBtn = document.getElementById('platform-dropdown-btn');
  const platformMenu = document.getElementById('platform-menu');

  if (platformBtn && platformMenu) {
    platformBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = platformBtn.getAttribute('aria-expanded') === 'true';
      platformBtn.setAttribute('aria-expanded', String(!isExpanded));
      platformMenu.classList.toggle('is-open', !isExpanded);
    });

    document.addEventListener('click', (e) => {
      if (!platformMenu.contains(e.target) && !platformBtn.contains(e.target)) {
        platformBtn.setAttribute('aria-expanded', 'false');
        platformMenu.classList.remove('is-open');
      }
    });
  }
}
