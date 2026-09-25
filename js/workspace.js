/**
 * FlipPage Workspace Interactive Controller
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyC7EHsN6CiX5JlbRiLFo_f_-OfWIj4VIIo",
  authDomain: "flippage-e7f06.firebaseapp.com",
  projectId: "flippage-e7f06",
  storageBucket: "flippage-e7f06.firebasestorage.app",
  messagingSenderId: "1090051466641",
  appId: "1:1090051466641:web:237cbd139ca71cd186a630",
  measurementId: "G-BNY548FEEM"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initial publications data
let publications = [
  {
    id: 'pub-1',
    title: 'Annual Sustainability Report 2026',
    pages: 28,
    views: '4.2k',
    status: 'live',
    updated: '2 hours ago'
  },
  {
    id: 'pub-2',
    title: 'Spring Lookbook & Product Catalog',
    pages: 44,
    views: '12.8k',
    status: 'live',
    updated: 'Yesterday'
  },
  {
    id: 'pub-3',
    title: 'Brand Architecture & Design System',
    pages: 18,
    views: '940',
    status: 'locked',
    updated: '3 days ago'
  },
  {
    id: 'pub-4',
    title: 'Executive Pitch Deck Q3',
    pages: 14,
    views: '120',
    status: 'draft',
    updated: '5 days ago'
  }
];

document.addEventListener('DOMContentLoaded', () => {
  initAuthListener();
  initSearchAndFilters();
  initUploadModal();
  initNav();
  renderPublications(publications);
});

/**
 * Real-time Firebase Auth Status
 */
function initAuthListener() {
  const userGreeting = document.getElementById('user-greeting');
  const userSubtitle = document.getElementById('user-subtitle');
  const navUserSection = document.getElementById('nav-user-section');

  onAuthStateChanged(auth, (user) => {
    if (user) {
      const name = user.displayName || user.email?.split('@')[0] || 'Creator';
      const email = (user.email || '').toLowerCase();
      const isAdmin = email === 'omethranhasacz@gmail.com';

      if (userGreeting) userGreeting.textContent = `Welcome back, ${name}! 👋`;
      if (userSubtitle) userSubtitle.textContent = isAdmin 
        ? `Administrator session active • Manage user 14-day trials in Admin Portal.` 
        : `14-Day Free Trial Active • Enjoy unlimited client-side 3D flipbook creation.`;

      if (navUserSection) {
        navUserSection.innerHTML = `
          ${isAdmin ? '<a class="nav-user-chip" style="background: rgba(139, 92, 246, 0.15); border-color: #C4B5FD; color: #7C3AED;" href="admin.html">👑 Admin Portal</a>' : ''}
          <a class="nav-user-chip" href="account.html" title="Account settings">
            <span class="nav-user-avatar">${(name.charAt(0) || 'U').toUpperCase()}</span>
            <span>${name}</span>
          </a>
        `;
      }
    } else {
      if (userGreeting) userGreeting.textContent = `Your FlipPage Workspace`;
      if (userSubtitle) userSubtitle.textContent = `Sign in to sync publications across devices and unlock custom domains.`;
      
      if (navUserSection) {
        navUserSection.innerHTML = `
          <a class="nav-signin" href="account.html">Sign in</a>
          <a class="nav-getstarted" href="account.html">Create account</a>
        `;
      }
    }
  });
}

/**
 * Filter & Search Publications
 */
function initSearchAndFilters() {
  const searchInput = document.getElementById('pub-search-input');
  const filterPills = document.querySelectorAll('.filter-pill');

  let activeFilter = 'all';

  function applyFilter() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    
    const filtered = publications.filter(pub => {
      const matchesQuery = pub.title.toLowerCase().includes(query);
      const matchesFilter = activeFilter === 'all' || pub.status === activeFilter;
      return matchesQuery && matchesFilter;
    });

    renderPublications(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilter);
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      activeFilter = pill.dataset.filter || 'all';
      applyFilter();
    });
  });
}

/**
 * Render Publications to DOM
 */
function renderPublications(items) {
  const grid = document.getElementById('publications-grid');
  const countEl = document.getElementById('stat-total-pubs');
  if (countEl) countEl.textContent = publications.length;

  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 60px 20px; text-align: center; background: #FFF; border: 1.5px dashed #CBD5E1; border-radius: 18px;">
        <h3 style="margin: 0 0 8px; font-size: 1.2rem; color: #0F172A;">No publications found</h3>
        <p style="margin: 0 0 20px; color: #64748B; font-size: 0.92rem;">Try a different search query or upload a new PDF document.</p>
        <button class="btn-upload-primary" id="empty-state-upload" type="button">Upload PDF Now</button>
      </div>
    `;
    const btn = document.getElementById('empty-state-upload');
    if (btn) btn.addEventListener('click', openUploadModal);
    return;
  }

  grid.innerHTML = items.map(pub => {
    const statusLabel = pub.status === 'live' ? 'Live' : pub.status === 'locked' ? 'Protected' : 'Draft';
    return `
      <article class="pub-card" data-id="${pub.id}">
        <div class="pub-preview-wrap">
          <span class="pub-badge-status ${pub.status}">${statusLabel}</span>
          
          <div class="pub-preview-canvas-mock">
            <div class="mock-line-title"></div>
            <div class="mock-line"></div>
            <div class="mock-line short"></div>
            <div class="mock-art-block">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
              </svg>
            </div>
          </div>

          <a href="index.html#fast-work" class="pub-quick-preview-btn" title="Open 3D Viewer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Preview</span>
          </a>
        </div>

        <div class="pub-body">
          <h3 class="pub-title">${escapeHtml(pub.title)}</h3>
          
          <div class="pub-meta-row">
            <span class="pub-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              ${pub.pages} pages
            </span>
            <span class="pub-meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              ${pub.views} reads
            </span>
            <span>${pub.updated}</span>
          </div>

          <div class="pub-actions-row">
            <a href="index.html#fast-work" class="pub-btn-open">
              <span>Open in 3D Reader</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <button class="pub-btn-icon btn-share-pub" type="button" title="Share link" data-id="${pub.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
            <button class="pub-btn-icon btn-delete-pub" type="button" title="Delete" data-id="${pub.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join('');

  // Wire action buttons
  document.querySelectorAll('.btn-share-pub').forEach(btn => {
    btn.addEventListener('click', () => {
      const pubId = btn.dataset.id;
      const pub = publications.find(p => p.id === pubId);
      if (pub && navigator.clipboard) {
        navigator.clipboard.writeText(`${window.location.origin}/index.html#pub-${pubId}`);
        alert(`Link for "${pub.title}" copied to clipboard!`);
      }
    });
  });

  document.querySelectorAll('.btn-delete-pub').forEach(btn => {
    btn.addEventListener('click', () => {
      const pubId = btn.dataset.id;
      if (confirm('Are you sure you want to delete this publication?')) {
        publications = publications.filter(p => p.id !== pubId);
        renderPublications(publications);
      }
    });
  });
}

/**
 * Upload PDF Modal Logic
 */
function initUploadModal() {
  const modalOverlay = document.getElementById('upload-modal');
  const openBtns = [document.getElementById('open-upload-modal-btn'), document.getElementById('new-doc-btn')];
  const closeBtn = document.getElementById('close-modal-btn');
  const dropzone = document.getElementById('modal-dropzone');
  const fileInput = document.getElementById('pdf-file-input');

  openBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', openUploadModal);
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closeUploadModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeUploadModal();
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-active');
    });

    ['dragleave', 'dragend'].forEach(type => {
      dropzone.addEventListener(type, () => dropzone.classList.remove('drag-active'));
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-active');
      if (e.dataTransfer.files?.length) {
        handleFileSelected(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        handleFileSelected(e.target.files[0]);
      }
    });
  }
}

function openUploadModal() {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.add('is-visible');
}

function closeUploadModal() {
  const modal = document.getElementById('upload-modal');
  if (modal) modal.classList.remove('is-visible');
}

function handleFileSelected(file) {
  if (!file) return;

  const title = file.name.replace(/\.[^/.]+$/, '');
  const newPub = {
    id: `pub-${Date.now()}`,
    title: title || 'New Publication',
    pages: Math.floor(Math.random() * 20) + 6,
    views: '1',
    status: 'live',
    updated: 'Just now'
  };

  publications.unshift(newPub);
  renderPublications(publications);
  closeUploadModal();
}

/**
 * Navbar Mega Dropdown & Mobile Handlers
 */
function initNav() {
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.contains('is-open');
      navLinks.classList.toggle('is-open', !isOpen);
      navToggle.setAttribute('aria-expanded', String(!isOpen));
    });
  }

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

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
