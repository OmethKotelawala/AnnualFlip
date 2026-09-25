/**
 * FlipPage Enterprise Workspace Interactive Flipbook Studio Controller
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration
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
const db = getFirestore(app);

// Digital Flipbook Publications Dataset
let publications = [
  {
    id: 'p1',
    title: 'Annual Sustainability Report 2026',
    slug: 'sustainability-2026',
    pages: 28,
    reads: '4,210',
    avgTime: '3m 42s',
    updated: '09:41 AM',
    status: 'live',
    tag: { label: 'Live • 14d Trial', type: 'live' },
    thumbBg: '#BBF7D0',
    thumbColor: '#166534',
    thumbEmoji: '📖',
    previewText: '28 pages • 4.2k reads • Dual spread active',
    spreads: [
      { left: 2, right: 3, title: 'Executive Summary', graphic: '📊 Key Financial Highlights' },
      { left: 4, right: 5, title: 'Environmental Footprint', graphic: '🌱 Carbon Offset Metrics' },
      { left: 6, right: 7, title: 'Social & Governance', graphic: '🤝 Global Team Initiatives' }
    ]
  },
  {
    id: 'p2',
    title: 'Spring Lookbook & Product Catalog',
    slug: 'spring-lookbook',
    pages: 44,
    reads: '12,850',
    avgTime: '5m 12s',
    updated: '09:38 AM',
    status: 'live',
    tag: { label: 'Live • Featured', type: 'live' },
    thumbBg: '#E0E7FF',
    thumbColor: '#3730A3',
    thumbEmoji: '👗',
    previewText: '44 pages • 12.8k reads • Touch zoom ready',
    spreads: [
      { left: 2, right: 3, title: 'Collection Overview', graphic: '✨ High-Res Vector Editorial' },
      { left: 4, right: 5, title: 'Apparel & Fabrics', graphic: '🎨 Spring Palette Gallery' }
    ]
  },
  {
    id: 'p3',
    title: 'Brand Architecture & Design System',
    slug: 'brand-guidelines',
    pages: 18,
    reads: '940',
    avgTime: '2m 15s',
    updated: '09:20 AM',
    status: 'locked',
    tag: { label: 'Protected • Password', type: 'locked' },
    thumbBg: '#F3E8FF',
    thumbColor: '#6B21A8',
    thumbEmoji: '🎨',
    previewText: '18 pages • 940 reads • Protected access',
    spreads: [
      { left: 2, right: 3, title: 'Typography & Colors', graphic: '📐 8pt Grid & Hierarchy' }
    ]
  },
  {
    id: 'p4',
    title: 'Executive Pitch Deck Q3',
    slug: 'executive-deck-q3',
    pages: 14,
    reads: '120',
    avgTime: '1m 45s',
    updated: 'Yesterday',
    status: 'draft',
    tag: { label: 'Draft', type: 'draft' },
    thumbBg: '#CFFAFE',
    thumbColor: '#155E75',
    thumbEmoji: '📈',
    previewText: '14 pages • 120 reads • Client review in progress',
    spreads: [
      { left: 2, right: 3, title: 'Market Opportunity', graphic: '🚀 Growth Trajectory' }
    ]
  }
];

let activePubId = 'p1';
let currentFilter = 'all';
let currentSpreadIndex = 0;

document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initAuthProfile();
  initPublicationsList();
  renderActivePublication(activePubId);
  initSearch();
  initTabs();
  init3DFlipbookControls();
  initUploadModal();
  initActions();
});

/**
 * Top bar live time updater
 */
function initClock() {
  const clockEl = document.getElementById('topbar-clock');
  function update() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[now.getDay()];
    const month = months[now.getMonth()];
    const date = now.getDate();
    
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const minutes = String(now.getMinutes()).padStart(2, '0');

    if (clockEl) {
      clockEl.innerHTML = `${day}, ${month} ${date} <strong>${hours}:${minutes} ${ampm}</strong>`;
    }
  }
  update();
  setInterval(update, 10000);
}

/**
 * Listen for user auth & brand to populate profile in sidebar & topbar
 */
function initAuthProfile() {
  const userNameEl = document.getElementById('sidebar-user-name');
  const userEmailEl = document.getElementById('sidebar-user-email');
  const avatarInitialEl = document.getElementById('sidebar-avatar-initial');
  const breadcrumbBrand = document.getElementById('breadcrumb-brand-name');
  const breadcrumbAvatar = document.getElementById('breadcrumb-brand-avatar');
  const creatorNameEl = document.getElementById('details-creator-name');
  const creatorAvatarEl = document.getElementById('details-creator-avatar');
  const sidebarPlanLabel = document.getElementById('sidebar-plan-label');

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let name = user.displayName || user.email?.split('@')[0] || 'Anjana Wickrama';
      let email = user.email || 'anjana@northbay.lk';
      let brand = 'Northbay Finance';
      let trialDays = 14;

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          if (data.brandName) brand = data.brandName;
          if (data.displayName) name = data.displayName;
          if (data.trialDays) trialDays = data.trialDays;
        }
      } catch (_) {}

      if (userNameEl) userNameEl.textContent = name;
      if (userEmailEl) userEmailEl.textContent = email;
      if (breadcrumbBrand) breadcrumbBrand.textContent = brand;
      if (breadcrumbAvatar) breadcrumbAvatar.textContent = (brand.charAt(0) || 'B').toUpperCase();
      if (creatorNameEl) creatorNameEl.textContent = `${name} (${brand})`;
      if (sidebarPlanLabel) sidebarPlanLabel.textContent = `${trialDays}-Day Pro Trial`;

      if (avatarInitialEl) {
        if (user.photoURL) {
          avatarInitialEl.innerHTML = `<img src="${user.photoURL}" alt="${escapeHtml(name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer">`;
        } else {
          avatarInitialEl.textContent = (name.charAt(0) || 'U').toUpperCase();
        }
      }

      if (creatorAvatarEl) {
        if (user.photoURL) {
          creatorAvatarEl.innerHTML = `<img src="${user.photoURL}" alt="${escapeHtml(name)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer">`;
        } else {
          creatorAvatarEl.textContent = (name.charAt(0) || 'U').toUpperCase();
        }
      }
    }
  });
}

/**
 * Render Publications List in Column 1
 */
function initPublicationsList() {
  const container = document.getElementById('pub-list-container');
  if (!container) return;

  const filtered = publications.filter(p => {
    if (currentFilter === 'live') return p.status === 'live';
    if (currentFilter === 'draft') return p.status === 'draft';
    return true;
  });

  container.innerHTML = filtered.map(item => {
    const isSelected = item.id === activePubId;
    const tagHtml = item.tag ? `<span class="pub-tag ${item.tag.type}">${escapeHtml(item.tag.label)}</span>` : '';

    return `
      <div class="pub-item ${isSelected ? 'is-selected' : ''}" data-id="${item.id}">
        <div class="pub-thumb-wrap">
          <div class="pub-thumb-box" style="background: ${item.thumbBg}; color: ${item.thumbColor};">
            ${item.thumbEmoji}
          </div>
          <span class="format-icon-badge">3D</span>
        </div>

        <div class="pub-item-content">
          <div class="pub-item-top">
            <span class="pub-item-title">${escapeHtml(item.title)}</span>
            <span class="pub-time-badge">${item.updated}</span>
          </div>
          
          <div class="pub-item-bottom">
            <p class="pub-preview-sub">${escapeHtml(item.previewText)}</p>
            ${tagHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Click to switch active flipbook
  container.querySelectorAll('.pub-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      activePubId = id;
      currentSpreadIndex = 0;
      initPublicationsList();
      renderActivePublication(id);
    });
  });
}

/**
 * Render Active Flipbook in Column 2 & Column 3
 */
function renderActivePublication(id) {
  const pub = publications.find(p => p.id === id);
  if (!pub) return;

  // Center Header
  const activeThumb = document.getElementById('active-pub-thumb');
  const activeTitle = document.getElementById('active-pub-title');
  const activeUrl = document.getElementById('active-pub-url');
  const activeTag = document.getElementById('active-tag-badge');

  if (activeThumb) {
    activeThumb.textContent = pub.thumbEmoji;
    activeThumb.style.background = pub.thumbBg;
    activeThumb.style.color = pub.thumbColor;
  }
  if (activeTitle) activeTitle.textContent = pub.title;
  if (activeUrl) activeUrl.textContent = `FlipPage.com/northbay/${pub.slug}`;
  if (activeTag) {
    activeTag.textContent = pub.tag?.label || 'Live';
    activeTag.className = `active-tag-badge ${pub.status}`;
  }

  // Right Details Panel
  const detailsThumb = document.getElementById('details-large-thumb');
  const detailsName = document.getElementById('details-pub-name');
  const detailsUrl = document.getElementById('details-pub-url');
  const detailsLabel = document.getElementById('details-label-pill');
  const metricReads = document.getElementById('metric-total-reads');
  const metricAvgTime = document.getElementById('metric-avg-time');

  if (detailsThumb) {
    detailsThumb.textContent = pub.thumbEmoji;
    detailsThumb.style.background = pub.thumbBg;
    detailsThumb.style.color = pub.thumbColor;
  }
  if (detailsName) detailsName.textContent = pub.title;
  if (detailsUrl) detailsUrl.textContent = `FlipPage.com/northbay/${pub.slug}`;
  if (detailsLabel) detailsLabel.textContent = `${pub.tag?.label || 'Live'}`;
  if (metricReads) metricReads.textContent = pub.reads;
  if (metricAvgTime) metricAvgTime.textContent = pub.avgTime;

  // Update 3D Spread Page Numbers
  updateSpreadDisplay(pub);
}

function updateSpreadDisplay(pub) {
  const scrubber = document.getElementById('page-scrubber');
  const scrubberLabel = document.getElementById('scrubber-label');
  const pageLeftNum = document.getElementById('page-left-num');
  const pageRightNum = document.getElementById('page-right-num');
  const bookShell = document.getElementById('book-spread-shell');

  const spread = pub.spreads[currentSpreadIndex] || { left: 2, right: 3 };

  if (scrubber) {
    scrubber.max = pub.pages;
    scrubber.value = spread.right;
  }
  if (scrubberLabel) {
    scrubberLabel.textContent = `${spread.left}-${spread.right} / ${pub.pages}`;
  }
  if (pageLeftNum) pageLeftNum.textContent = `Page ${spread.left}`;
  if (pageRightNum) pageRightNum.textContent = `Page ${spread.right}`;

  if (bookShell) {
    bookShell.style.transform = 'scale(0.98) rotateY(-4deg)';
    setTimeout(() => {
      bookShell.style.transform = 'scale(1) rotateY(0deg)';
    }, 180);
  }
}

/**
 * 3D Flipbook Navigation & Page Turner
 */
function init3DFlipbookControls() {
  const btnPrev = document.getElementById('btn-prev-page');
  const btnNext = document.getElementById('btn-next-page');
  const scrubber = document.getElementById('page-scrubber');
  const zoomBtn = document.getElementById('btn-zoom-in');
  const bookWrapper = document.getElementById('book-3d-wrapper');

  let isZoomed = false;

  if (btnPrev) {
    btnPrev.addEventListener('click', () => {
      const pub = publications.find(p => p.id === activePubId);
      if (pub && currentSpreadIndex > 0) {
        currentSpreadIndex--;
        updateSpreadDisplay(pub);
      }
    });
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => {
      const pub = publications.find(p => p.id === activePubId);
      if (pub && currentSpreadIndex < (pub.spreads.length - 1)) {
        currentSpreadIndex++;
        updateSpreadDisplay(pub);
      }
    });
  }

  if (scrubber) {
    scrubber.addEventListener('input', () => {
      const pub = publications.find(p => p.id === activePubId);
      if (!pub) return;
      const val = parseInt(scrubber.value, 10);
      const idx = Math.min(pub.spreads.length - 1, Math.floor((val / pub.pages) * pub.spreads.length));
      currentSpreadIndex = Math.max(0, idx);
      updateSpreadDisplay(pub);
    });
  }

  if (zoomBtn && bookWrapper) {
    zoomBtn.addEventListener('click', () => {
      isZoomed = !isZoomed;
      bookWrapper.style.transform = isZoomed ? 'scale(1.15)' : 'scale(1)';
      zoomBtn.textContent = isZoomed ? '🔍−' : '🔍+';
    });
  }
}

/**
 * Search filter for publications
 */
function initSearch() {
  const searchBox = document.getElementById('pub-search-box');
  if (!searchBox) return;

  searchBox.addEventListener('input', () => {
    const q = searchBox.value.toLowerCase().trim();
    const items = document.querySelectorAll('.pub-item');

    items.forEach(el => {
      const text = el.textContent.toLowerCase();
      el.style.display = text.includes(q) ? 'flex' : 'none';
    });
  });
}

/**
 * Filter Tabs (Recent / Live / Draft)
 */
function initTabs() {
  const tabs = document.querySelectorAll('.pub-tab-pill');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('is-active'));
      tab.classList.add('is-active');
      currentFilter = tab.dataset.tab || 'all';
      initPublicationsList();
    });
  });
}

/**
 * Upload PDF Modal Logic
 */
function initUploadModal() {
  const modal = document.getElementById('upload-modal');
  const openBtns = [
    document.getElementById('open-upload-btn'), 
    document.getElementById('btn-quick-new-pub'),
    document.getElementById('btn-empty-upload')
  ];
  const closeBtn = document.getElementById('close-modal-btn');
  const dropzone = document.getElementById('modal-dropzone');
  const fileInput = document.getElementById('pdf-file-input');

  openBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => modal?.classList.add('is-visible'));
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => modal?.classList.remove('is-visible'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('is-visible');
    });
  }

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        const file = e.target.files[0];
        const title = file.name.replace(/\.[^/.]+$/, '');
        const newPub = {
          id: `p-${Date.now()}`,
          title: title || 'New Digital Flipbook',
          slug: title.toLowerCase().replace(/\s+/g, '-'),
          pages: 16,
          reads: '1',
          avgTime: '0m 45s',
          updated: 'Just now',
          status: 'live',
          tag: { label: 'Live • New', type: 'live' },
          thumbBg: '#DBEAFE',
          thumbColor: '#1E40AF',
          thumbEmoji: '📄',
          previewText: '16 pages • Converted instantly in browser',
          spreads: [
            { left: 2, right: 3, title: title, graphic: '✨ 3D Render Ready' }
          ]
        };

        publications.unshift(newPub);
        activePubId = newPub.id;
        currentSpreadIndex = 0;
        initPublicationsList();
        renderActivePublication(activePubId);
        modal.classList.remove('is-visible');
      }
    });
  }
}

/**
 * Embed Code & Export Actions
 */
function initActions() {
  const shareBtn = document.getElementById('btn-share-link');
  const embedBtn = document.getElementById('btn-copy-embed');
  const exportBtn = document.getElementById('btn-export-pub');

  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const pub = publications.find(p => p.id === activePubId);
      if (pub && navigator.clipboard) {
        navigator.clipboard.writeText(`${window.location.origin}/index.html#${pub.slug}`);
        alert(`Public 3D Flipbook link for "${pub.title}" copied to clipboard!`);
      }
    });
  }

  if (embedBtn) {
    embedBtn.addEventListener('click', () => {
      const pub = publications.find(p => p.id === activePubId);
      if (pub && navigator.clipboard) {
        const embedCode = `<iframe src="${window.location.origin}/index.html#${pub.slug}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
        navigator.clipboard.writeText(embedCode);
        alert(`iFrame Embed Code copied to clipboard!\n\n${embedCode}`);
      }
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const pub = publications.find(p => p.id === activePubId);
      if (pub) {
        alert(`Preparing high-resolution PDF download package for "${pub.title}"...`);
      }
    });
  }
}

/**
 * Switch Accounts Popup & Auth Controller
 */
function initSwitchAccountsPopup() {
  const userTrigger = document.getElementById('sidebar-user-card');
  const popup = document.getElementById('switch-accounts-popup');
  const btnAddAccount = document.getElementById('btn-add-account');
  const btnSwitchLogout = document.getElementById('btn-switch-logout');

  const sidebarAvatar = document.getElementById('sidebar-avatar-initial');
  const sidebarName = document.getElementById('sidebar-user-name');
  const sidebarEmail = document.getElementById('sidebar-user-email');

  const switchAvatar = document.getElementById('switch-active-avatar');
  const switchName = document.getElementById('switch-active-name');
  const switchEmail = document.getElementById('switch-active-email');

  // Toggle Popup
  if (userTrigger && popup) {
    userTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = popup.hidden;
      popup.hidden = !isHidden;
      userTrigger.setAttribute('aria-expanded', String(isHidden));
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!popup.contains(e.target) && !userTrigger.contains(e.target)) {
        popup.hidden = true;
        userTrigger.setAttribute('aria-expanded', 'false');
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        popup.hidden = true;
        userTrigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Add another account
  if (btnAddAccount) {
    btnAddAccount.addEventListener('click', () => {
      window.location.href = 'account.html';
    });
  }

  // Log out
  if (btnSwitchLogout) {
    btnSwitchLogout.addEventListener('click', async () => {
      try {
        const { signOut } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
        await signOut(auth);
        localStorage.removeItem('flippage_user_photo');
        localStorage.removeItem('flippage_user_name');
        window.location.href = 'account.html';
      } catch (err) {
        console.error('Logout error:', err);
        window.location.href = 'account.html';
      }
    });
  }

  // Sync real Firebase authenticated user
  onAuthStateChanged(auth, (user) => {
    let name = 'Ometh Ranhasa';
    let email = 'omethranhasa123@gmail.com';
    let photo = localStorage.getItem('flippage_user_photo') || '';

    if (user) {
      name = user.displayName || (user.email ? user.email.split('@')[0] : name);
      email = user.email || email;
      photo = user.photoURL || user.providerData?.[0]?.photoURL || photo;
    }

    if (photo && photo.includes('googleusercontent.com')) {
      photo = photo.replace(/=s\d+(-c)?/i, '=s384-c');
    }

    if (sidebarName) sidebarName.textContent = name;
    if (sidebarEmail) sidebarEmail.textContent = email;
    if (switchName) switchName.textContent = name;
    if (switchEmail) switchEmail.textContent = email;

    const initial = (name.charAt(0) || 'O').toUpperCase();

    if (sidebarAvatar) {
      if (photo) {
        sidebarAvatar.innerHTML = `<img src="${photo}" alt="${escapeHtml(name)}" class="brand-avatar-img" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${initial}'">`;
        sidebarAvatar.style.padding = '0';
        sidebarAvatar.style.overflow = 'hidden';
      } else {
        sidebarAvatar.textContent = initial;
      }
    }

    if (switchAvatar) {
      if (photo) {
        switchAvatar.innerHTML = `<img src="${photo}" alt="${escapeHtml(name)}" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${initial}'">`;
      } else {
        switchAvatar.textContent = initial;
      }
    }
  });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initSwitchAccountsPopup();
});
