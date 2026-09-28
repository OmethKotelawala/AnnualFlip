/**
 * FlipPage Enterprise Workspace Interactive Studio Controller (js/workspace.js)
 * Real-time Firebase Firestore Sync, Free and Paid (👑 Yellow Crown) Tier Management,
 * PDF.js client-side page extraction, URL Flipbook import, Sharing, Embed & QR generator.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---- Global Toast Helper ----
export function showToast(msg, type = 'success') {
  const t = document.getElementById('ws-toast');
  const m = document.getElementById('ws-toast-msg');
  if (!t || !m) return;
  m.textContent = msg;
  t.style.display = 'flex';
  t.style.background = (type === 'error') ? '#EF4444' : '#0F172A';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 2800);
}
window.showToast = showToast;

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Initial Data & State
let publications = [
  {
    id: 'p1',
    title: 'Annual Sustainability Report 2026',
    slug: 'sustainability-2026',
    category: 'Annual Report',
    pages: 28,
    reads: 4210,
    shares: 340,
    avgTime: '3m 42s',
    status: 'live',
    planTier: 'paid',
    isPaid: true,
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
    category: 'Lookbook & Catalog',
    pages: 44,
    reads: 12850,
    shares: 410,
    avgTime: '5m 12s',
    status: 'live',
    planTier: 'paid',
    isPaid: true,
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
    category: 'Brand Guidelines',
    pages: 18,
    reads: 940,
    shares: 45,
    avgTime: '2m 15s',
    status: 'draft',
    planTier: 'free',
    isPaid: false,
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
    category: 'Pitch Deck',
    pages: 14,
    reads: 120,
    shares: 45,
    avgTime: '1m 45s',
    status: 'draft',
    planTier: 'free',
    isPaid: false,
    thumbBg: '#CFFAFE',
    thumbColor: '#155E75',
    thumbEmoji: '📈',
    previewText: '14 pages • 120 reads • Client review in progress',
    spreads: [
      { left: 2, right: 3, title: 'Market Opportunity', graphic: '🚀 Growth Trajectory' }
    ]
  }
];

let selectedPubId = 'p1';
let activeFilter = 'all';
let newPubTierSelected = 'free';
let urlFlipbooks = [];

// DOM Elements
const pubGrid = document.getElementById('publications-grid-container');
const searchInput = document.getElementById('search-pubs-input');
const filterPills = document.querySelectorAll('.filter-pill');

// Stat DOMs
const statTotalPubs = document.getElementById('stat-total-pubs');
const statTotalReads = document.getElementById('stat-total-reads');
const statPaidPubs = document.getElementById('stat-paid-pubs');
const statSharesCount = document.getElementById('stat-shares-count');
const pubsCountLabel = document.getElementById('pubs-count-label');

// Detail Pane DOMs
const detailTierBadge = document.getElementById('detail-tier-badge');
const detailBookThumb = document.getElementById('detail-book-thumb');
const detailBookEmoji = document.getElementById('detail-book-emoji');
const detailBookTitle = document.getElementById('detail-book-title');
const detailBookDesc = document.getElementById('detail-book-desc');
const detailOpenReaderBtn = document.getElementById('btn-detail-open-reader');
const detailShareBtn = document.getElementById('btn-detail-share');
const detailEmbedBtn = document.getElementById('btn-detail-embed');
const detailToggleTierBtn = document.getElementById('btn-detail-toggle-tier');
const detailTierBtnLabel = document.getElementById('detail-tier-btn-label');
const detailTierDesc = document.getElementById('detail-tier-description');
const detailSpecPages = document.getElementById('detail-spec-pages');
const detailSpecStatus = document.getElementById('detail-spec-status');
const detailSpecReads = document.getElementById('detail-spec-reads');
const detailSpecTime = document.getElementById('detail-spec-time');
const detailSpecUrl = document.getElementById('detail-spec-url');
const detailSpreadsList = document.getElementById('detail-spreads-list');
const btnCopyDetailUrl = document.getElementById('btn-copy-detail-url');

// Modals
const uploadModal = document.getElementById('upload-modal');
const btnOpenCreateModal = document.getElementById('btn-open-create-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const btnCancelCreate = document.getElementById('btn-cancel-create');
const createPubForm = document.getElementById('create-publication-form');
const pdfFileInput = document.getElementById('pdf-file-input');
const modalDropzone = document.getElementById('modal-dropzone');
const dropzoneLabel = document.getElementById('dropzone-label');
const dropzoneSub = document.getElementById('dropzone-sub');
const pubInputTitle = document.getElementById('pub-input-title');
const pubInputCategory = document.getElementById('pub-input-category');
const pubInputPages = document.getElementById('pub-input-pages');
const optTierFree = document.getElementById('opt-tier-free');
const optTierPaid = document.getElementById('opt-tier-paid');
const groupPassword = document.getElementById('group-password-protect');
const pubInputPassword = document.getElementById('pub-input-password');

// Share Modal DOM
const shareModal = document.getElementById('share-modal');
const closeShareModalBtn = document.getElementById('close-share-modal-btn');
const shareModalUrlInput = document.getElementById('share-modal-url-input');
const shareModalEmbedInput = document.getElementById('share-modal-embed-input');
const btnCopyModalUrl = document.getElementById('btn-copy-modal-url');
const btnCopyModalEmbed = document.getElementById('btn-copy-modal-embed');
const shareModalWa = document.getElementById('share-modal-wa');
const shareModalTw = document.getElementById('share-modal-tw');
const shareModalLi = document.getElementById('share-modal-li');

// Preview Tab Elements
const previewSelector = document.getElementById('preview-pub-selector');
const previewFrame = document.getElementById('preview-reader-frame');
const previewPlaceholder = document.getElementById('preview-placeholder');
const previewOpenBtn = document.getElementById('preview-open-reader-btn');

// ============ REAL-TIME FIRESTORE SYNC ============
function initFirestoreSync() {
  const pubCollectionRef = collection(db, 'publications');
  
  onSnapshot(pubCollectionRef, (snapshot) => {
    if (!snapshot.empty) {
      const liveList = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        liveList.push({
          id: docSnap.id,
          title: d.title || 'Digital Flipbook',
          slug: d.slug || docSnap.id,
          category: d.category || 'Annual Report',
          pages: d.pages || 20,
          reads: d.reads || 0,
          shares: d.shares || 0,
          avgTime: d.avgTime || '2m 10s',
          status: d.status || 'live',
          planTier: d.planTier || (d.isPaid ? 'paid' : 'free'),
          isPaid: Boolean(d.isPaid || d.planTier === 'paid'),
          thumbBg: d.thumbBg || '#EFF6FF',
          thumbColor: d.thumbColor || '#1E40AF',
          thumbEmoji: d.thumbEmoji || '📖',
          previewText: d.previewText || `${d.pages || 20} pages • Dual spread active`,
          spreads: d.spreads || []
        });
      });

      publications = liveList;
      renderPublications();
      renderStats();
      updateShareAndPreviewSelectors();
      if (!publications.find(p => p.id === selectedPubId) && publications.length > 0) {
        selectedPubId = publications[0].id;
      }
      renderDetailPane();
    } else {
      seedInitialPublications();
    }
  }, (err) => {
    console.warn('Firestore publications sync warning:', err);
    renderPublications();
    renderStats();
    updateShareAndPreviewSelectors();
  });
}

async function seedInitialPublications() {
  if (!auth.currentUser) return;
  try {
    for (const pub of publications) {
      const ref = doc(db, 'publications', pub.id);
      await setDoc(ref, {
        ...pub,
        ownerId: auth.currentUser.uid,
        ownerEmail: auth.currentUser.email || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Initial seeding notice:', err);
  }
}

// ============ RENDER WORKSPACE FEED ============
function renderPublications() {
  if (!pubGrid) return;
  pubGrid.innerHTML = '';

  const query = (searchInput?.value || '').toLowerCase().trim();
  
  const filtered = publications.filter(p => {
    if (activeFilter === 'paid' && !p.isPaid && p.planTier !== 'paid') return false;
    if (activeFilter === 'free' && (p.isPaid || p.planTier === 'paid')) return false;
    if (activeFilter === 'live' && p.status !== 'live') return false;
    if (activeFilter === 'draft' && p.status !== 'draft') return false;

    if (query) {
      const matchTitle = (p.title || '').toLowerCase().includes(query);
      const matchCategory = (p.category || '').toLowerCase().includes(query);
      return matchTitle || matchCategory;
    }
    return true;
  });

  if (pubsCountLabel) {
    pubsCountLabel.textContent = `${filtered.length} of ${publications.length}`;
  }

  if (filtered.length === 0) {
    pubGrid.innerHTML = `
      <div style="grid-column: 1/-1; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px; padding:40px 20px; text-align:center;">
        <div style="font-size:2rem; margin-bottom:8px;">🔍</div>
        <h4 style="margin:0 0 6px; font-size:1.1rem; color:#0F172A;">No publications found</h4>
        <p style="margin:0; font-size:0.85rem; color:#64748B;">Try adjusting your search query or filter pill.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(pub => {
    const isSelected = pub.id === selectedPubId;
    const isPaid = Boolean(pub.isPaid || pub.planTier === 'paid');

    const card = document.createElement('div');
    card.className = `pub-card ${isSelected ? 'is-selected' : ''}`;
    card.dataset.id = pub.id;

    card.innerHTML = `
      <div class="pub-card-cover" style="background:${pub.thumbBg || '#EFF6FF'}; color:${pub.thumbColor || '#1E40AF'};">
        <span style="position:relative; z-index:1;">${pub.thumbEmoji || '📖'}</span>
        <div class="pub-card-cover-shimmer"></div>
        <span class="pub-card-status-dot ${pub.status === 'live' ? 'live' : 'draft'}"></span>
        <span class="pub-card-pages-badge">${pub.pages || 20}p</span>
      </div>

      <div class="pub-card-body">
        <div class="pub-card-tags">
          ${isPaid 
            ? `<span class="crown-badge"><img src="src/svg/crown.svg" class="crown-svg-icon" alt="Crown">PRO</span>` 
            : `<span class="crown-badge free"><img src="src/svg/free.svg" class="free-svg-icon" alt="Free">FREE</span>`}
          <span class="category-tag">${escapeHtml(pub.category || 'Report')}</span>
        </div>
        <h4 class="pub-card-title">${escapeHtml(pub.title)}</h4>
        <div class="pub-card-meta">
          <span>👁️ ${(pub.reads || 0).toLocaleString()} reads</span>
          <span>•</span>
          <span>🔗 ${(pub.shares || 0)} shares</span>
        </div>
        <div class="pub-card-progress">
          <div class="pub-card-progress-bar" style="width: ${Math.min(100, Math.max(15, (pub.reads || 0) / 150))}%"></div>
        </div>
      </div>

      <div class="pub-card-actions">
        <div class="pub-action-btn-group">
          <a href="reader.html?id=${encodeURIComponent(pub.id)}" target="_blank" class="pub-btn primary" title="Open in 3D Reader" onclick="event.stopPropagation();">
            <span>📖 Read</span>
          </a>
          <button type="button" class="pub-btn btn-share-pub" data-id="${pub.id}" title="Share & Embed link" onclick="event.stopPropagation();">
            <span>🔗 Share</span>
          </button>
        </div>

        <div class="pub-action-btn-group">
          <button type="button" class="tier-toggle-btn ${isPaid ? 'is-paid' : 'is-free'} btn-quick-toggle-tier" data-id="${pub.id}" title="Toggle Free vs Pro Crown Tier" onclick="event.stopPropagation();">
            <span class="crown-icon">${isPaid ? '👑' : '📄'}</span>
            <span>${isPaid ? 'Pro' : 'Free'}</span>
          </button>
          
          <button type="button" class="pub-icon-btn danger btn-delete-pub" data-id="${pub.id}" title="Delete Publication" onclick="event.stopPropagation();">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      selectedPubId = pub.id;
      renderPublications();
      renderDetailPane();
    });

    pubGrid.appendChild(card);
  });

  // Wire inner buttons
  document.querySelectorAll('.btn-share-pub').forEach(btn => {
    btn.addEventListener('click', () => openShareModal(btn.dataset.id));
  });

  document.querySelectorAll('.btn-quick-toggle-tier').forEach(btn => {
    btn.addEventListener('click', () => togglePublicationTier(btn.dataset.id));
  });

  document.querySelectorAll('.btn-delete-pub').forEach(btn => {
    btn.addEventListener('click', () => deletePublication(btn.dataset.id));
  });
}

function renderStats() {
  const totalPubs = publications.length;
  let totalReads = 0;
  let totalPaid = 0;
  let totalShares = 0;

  publications.forEach(p => {
    totalReads += (p.reads || 0);
    totalShares += (p.shares || 0);
    if (p.isPaid || p.planTier === 'paid') totalPaid++;
  });

  if (statTotalPubs) statTotalPubs.textContent = totalPubs;
  if (statTotalReads) statTotalReads.textContent = totalReads > 1000 ? `${(totalReads / 1000).toFixed(1)}k` : totalReads;
  if (statPaidPubs) statPaidPubs.textContent = totalPaid;
  if (statSharesCount) statSharesCount.textContent = totalShares;
}

function renderDetailPane() {
  const pub = publications.find(p => p.id === selectedPubId) || publications[0];
  const noPubState = document.getElementById('detail-no-pub-state');
  const paneContent = document.getElementById('detail-pane-content');

  if (!pub) {
    if (noPubState) noPubState.style.display = 'flex';
    if (paneContent) paneContent.style.display = 'none';
    return;
  }

  if (noPubState) noPubState.style.display = 'none';
  if (paneContent) paneContent.style.display = 'block';

  const isPaid = Boolean(pub.isPaid || pub.planTier === 'paid');

  if (detailTierBadge) {
    detailTierBadge.className = `crown-badge ${isPaid ? '' : 'free'}`;
    detailTierBadge.innerHTML = isPaid 
      ? `<img src="src/svg/crown.svg" class="crown-svg-icon" alt="Pro Crown">PRO TIER` 
      : `<img src="src/svg/free.svg" class="free-svg-icon" alt="Free Tier">FREE TIER`;
  }

  if (detailBookThumb) {
    detailBookThumb.style.background = pub.thumbBg || '#EFF6FF';
    detailBookThumb.style.color = pub.thumbColor || '#1E40AF';
  }
  if (detailBookEmoji) detailBookEmoji.textContent = pub.thumbEmoji || '📖';
  if (detailBookTitle) detailBookTitle.textContent = pub.title;
  if (detailBookDesc) detailBookDesc.textContent = `${pub.pages || 20} pages • ${(pub.reads || 0).toLocaleString()} direct reads • Dual spread interactive 3D physics active.`;

  if (detailOpenReaderBtn) detailOpenReaderBtn.href = `reader.html?id=${encodeURIComponent(pub.id)}`;
  
  if (detailToggleTierBtn) {
    detailToggleTierBtn.className = `tier-toggle-btn ${isPaid ? 'is-paid' : 'is-free'}`;
    if (detailTierBtnLabel) detailTierBtnLabel.textContent = isPaid ? 'Pro Active' : 'Switch to Pro';
  }

  if (detailTierDesc) {
    detailTierDesc.textContent = isPaid ? '👑 Pro HD Vector rendering & Zero Watermarks' : 'Standard Free Tier • FlipPage watermark active';
  }

  if (detailSpecPages) detailSpecPages.textContent = `${pub.pages || 20} Pages`;
  if (detailSpecStatus) detailSpecStatus.textContent = pub.status === 'live' ? '● Live' : '○ Draft';
  if (detailSpecReads) detailSpecReads.textContent = (pub.reads || 0).toLocaleString();
  if (detailSpecTime) detailSpecTime.textContent = pub.avgTime || '2m 30s';
  if (detailSpecUrl) detailSpecUrl.textContent = `${window.location.origin}/reader.html?id=${pub.id}`;

  if (detailSpreadsList) {
    detailSpreadsList.innerHTML = '';
    const spreads = pub.spreads && pub.spreads.length > 0 ? pub.spreads : [
      { left: 2, right: 3, title: 'Executive Overview', graphic: '📊 Key Performance Metrics' },
      { left: 4, right: 5, title: 'Strategic Roadmap', graphic: '🌱 Carbon Offset & Net Zero' }
    ];

    spreads.forEach(s => {
      const row = document.createElement('div');
      row.className = 'detail-spread-row';
      row.innerHTML = `
        <span style="font-weight:700; color:#334155;">Spreads ${s.left}-${s.right || s.left + 1}</span>
        <span style="color:#64748B;">${escapeHtml(s.title || s.graphic || 'Content Page')}</span>
      `;
      detailSpreadsList.appendChild(row);
    });
  }
}

// ============ TIER TOGGLE ============
async function togglePublicationTier(pubId) {
  const pub = publications.find(p => p.id === pubId);
  if (!pub) return;

  const nextIsPaid = !Boolean(pub.isPaid || pub.planTier === 'paid');
  const nextTier = nextIsPaid ? 'paid' : 'free';

  pub.isPaid = nextIsPaid;
  pub.planTier = nextTier;
  renderPublications();
  renderStats();
  renderDetailPane();

  showToast(nextIsPaid ? `👑 Upgraded "${pub.title}" to Pro Tier!` : `Switched "${pub.title}" to Free Tier`);

  try {
    const docRef = doc(db, 'publications', pubId);
    await updateDoc(docRef, {
      isPaid: nextIsPaid,
      planTier: nextTier,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Tier update note:', err);
  }
}

// ============ DELETE PUBLICATION ============
async function deletePublication(pubId) {
  const pub = publications.find(p => p.id === pubId);
  if (!pub) return;

  if (!confirm(`Are you sure you want to delete "${pub.title}"?`)) return;

  publications = publications.filter(p => p.id !== pubId);
  if (selectedPubId === pubId && publications.length > 0) {
    selectedPubId = publications[0].id;
  }
  renderPublications();
  renderStats();
  renderDetailPane();
  updateShareAndPreviewSelectors();

  showToast(`Deleted "${pub.title}"`);

  try {
    const docRef = doc(db, 'publications', pubId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Delete publication error:', err);
  }
}

// ============ SHARE & EMBED MODAL ============
export function openShareModal(pubId) {
  const pub = publications.find(p => p.id === (pubId || selectedPubId)) || publications[0];
  if (!pub) return;

  const directUrl = `${window.location.origin}/reader.html?id=${encodeURIComponent(pub.id)}`;
  const embedCode = `<iframe src="${directUrl}" width="100%" height="600" frameborder="0" allowfullscreen allow="clipboard-read; clipboard-write"></iframe>`;

  if (shareModalUrlInput) shareModalUrlInput.value = directUrl;
  if (shareModalEmbedInput) shareModalEmbedInput.value = embedCode;

  const encUrl = encodeURIComponent(directUrl);
  const encTxt = encodeURIComponent(`Read "${pub.title}" interactive 3D digital flipbook on FlipPage!`);

  if (shareModalWa) shareModalWa.href = `https://api.whatsapp.com/send?text=${encTxt}%20${encUrl}`;
  if (shareModalTw) shareModalTw.href = `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTxt}`;
  if (shareModalLi) shareModalLi.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`;

  if (shareModal) {
    shareModal.hidden = false;
    shareModal.removeAttribute('hidden');
    shareModal.style.display = 'flex';
  }
}

export function closeShareModal() {
  if (shareModal) {
    shareModal.hidden = true;
    shareModal.setAttribute('hidden', '');
    shareModal.style.display = 'none';
  }
}

// ============ UPDATE SELECTORS ============
function updateShareAndPreviewSelectors() {
  const shareSel = document.getElementById('share-pub-selector');
  const previewSel = document.getElementById('preview-pub-selector');

  [shareSel, previewSel].forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">Select a flipbook...</option>';

    publications.forEach(p => {
      const opt = new Option(`${p.thumbEmoji || '📖'} ${p.title}`, p.id);
      opt.dataset.readerUrl = `reader.html?id=${encodeURIComponent(p.id)}`;
      sel.appendChild(opt);
    });

    urlFlipbooks.forEach(fb => {
      const urlKey = 'url-' + btoa(fb.url).slice(0, 12);
      const opt = new Option(`📎 ${fb.title}`, urlKey);
      opt.dataset.readerUrl = `reader.html?url=${encodeURIComponent(fb.url)}&title=${encodeURIComponent(fb.title)}`;
      sel.appendChild(opt);
    });

    if (currentVal) sel.value = currentVal;
  });
}

// ============ URL FLIPBOOKS IMPORT ============
function initUrlFlipbooks() {
  const pdfUrlInput = document.getElementById('pdf-url-input');
  const btnFetchPdfUrl = document.getElementById('btn-fetch-pdf-url');
  const urlFlipbooksGrid = document.getElementById('url-flipbooks-grid');
  const urlCountLabel = document.getElementById('url-count-label');

  try {
    urlFlipbooks = JSON.parse(localStorage.getItem('fp_url_flipbooks') || '[]');
  } catch(e) {
    urlFlipbooks = [];
  }

  function renderUrlFlipbooks() {
    if (!urlFlipbooksGrid) return;
    if (urlCountLabel) urlCountLabel.textContent = `${urlFlipbooks.length} flipbook${urlFlipbooks.length !== 1 ? 's' : ''}`;

    if (urlFlipbooks.length === 0) {
      urlFlipbooksGrid.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1;">
          <div class="empty-state-icon">🔗</div>
          <h4 class="empty-state-title">No URL Flipbooks Yet</h4>
          <p class="empty-state-sub">Paste a PDF URL above to instantly create a 3D flipbook without uploading files.</p>
        </div>
      `;
      return;
    }

    urlFlipbooksGrid.innerHTML = '';
    urlFlipbooks.forEach((fb, idx) => {
      const card = document.createElement('div');
      card.className = 'pdf-url-card';
      card.innerHTML = `
        <div class="pdf-url-preview">
          <span style="position:relative; z-index:1;">📄</span>
          <div class="pub-card-pages-badge">${fb.pages || '?'} pages</div>
        </div>
        <div class="pdf-url-body">
          <div class="pub-card-tags" style="margin-bottom:5px;">
            <span class="crown-badge free">FREE</span>
            <span class="category-tag">${escapeHtml(fb.category || 'PDF')}</span>
          </div>
          <h4 class="pub-card-title" style="font-size:0.82rem;">${escapeHtml(fb.title)}</h4>
          <a class="pdf-url-link" href="${fb.url}" target="_blank" title="${fb.url}">${fb.url.length > 45 ? fb.url.substring(0, 45) + '...' : fb.url}</a>
          <div class="pub-card-actions" style="padding:8px 0 0; border:none; background:none; gap:6px;">
            <a href="reader.html?url=${encodeURIComponent(fb.url)}&title=${encodeURIComponent(fb.title)}" target="_blank" class="pub-btn primary" style="font-size:0.74rem;">📖 Open Reader</a>
            <button class="pub-btn btn-copy-raw-url" data-url="${fb.url}" style="font-size:0.74rem;">🔗 Copy URL</button>
            <button class="pub-btn danger btn-del-url-fb" data-idx="${idx}" style="font-size:0.74rem;">🗑️</button>
          </div>
        </div>
      `;
      urlFlipbooksGrid.appendChild(card);
    });

    urlFlipbooksGrid.querySelectorAll('.btn-copy-raw-url').forEach(b => {
      b.addEventListener('click', () => {
        navigator.clipboard.writeText(b.dataset.url);
        showToast('URL copied!');
      });
    });

    urlFlipbooksGrid.querySelectorAll('.btn-del-url-fb').forEach(b => {
      b.addEventListener('click', () => {
        const i = parseInt(b.dataset.idx, 10);
        urlFlipbooks.splice(i, 1);
        localStorage.setItem('fp_url_flipbooks', JSON.stringify(urlFlipbooks));
        renderUrlFlipbooks();
        updateShareAndPreviewSelectors();
        showToast('Flipbook removed');
      });
    });
  }

  renderUrlFlipbooks();

  if (btnFetchPdfUrl && pdfUrlInput) {
    btnFetchPdfUrl.addEventListener('click', async () => {
      let rawUrl = pdfUrlInput.value.trim();
      if (!rawUrl) {
        showToast('Please enter a PDF URL', 'error');
        return;
      }

      // Google Drive link converter
      const gdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
      if (gdMatch) rawUrl = `https://drive.google.com/uc?export=download&id=${gdMatch[1]}`;

      btnFetchPdfUrl.textContent = 'Processing...';
      btnFetchPdfUrl.disabled = true;

      try {
        let pageCount = 0;
        if (typeof pdfjsLib !== 'undefined') {
          try {
            const loadingTask = pdfjsLib.getDocument({ url: rawUrl, withCredentials: false });
            const pdfDoc = await loadingTask.promise;
            pageCount = pdfDoc.numPages;
          } catch(e) {
            pageCount = 0;
          }
        }

        const title = rawUrl.split('/').pop().replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') || 'PDF Flipbook';
        const fb = { url: rawUrl, title, category: 'PDF Document', pages: pageCount, createdAt: new Date().toISOString() };

        urlFlipbooks.unshift(fb);
        localStorage.setItem('fp_url_flipbooks', JSON.stringify(urlFlipbooks));
        renderUrlFlipbooks();
        updateShareAndPreviewSelectors();
        pdfUrlInput.value = '';
        showToast(`✅ Flipbook created from URL! ${pageCount > 0 ? `(${pageCount} pages)` : ''}`);
      } catch(err) {
        showToast('Could not load PDF from that URL. Ensure it is public and directly accessible.', 'error');
      } finally {
        btnFetchPdfUrl.textContent = 'Create Flipbook';
        btnFetchPdfUrl.disabled = false;
      }
    });
  }

  // Modal Validate URL Button
  const btnModalValidateUrl = document.getElementById('btn-modal-validate-url');
  const modalPdfUrl = document.getElementById('modal-pdf-url');
  if (btnModalValidateUrl && modalPdfUrl) {
    btnModalValidateUrl.addEventListener('click', async () => {
      const url = modalPdfUrl.value.trim();
      if (!url) { showToast('Please enter a PDF URL', 'error'); return; }
      btnModalValidateUrl.textContent = 'Checking...';
      try {
        if (typeof pdfjsLib !== 'undefined') {
          const pdf = await pdfjsLib.getDocument({ url }).promise;
          const titleEl = document.getElementById('pub-input-title');
          const pagesEl = document.getElementById('pub-input-pages');
          if (pagesEl) pagesEl.value = pdf.numPages;
          if (titleEl && !titleEl.value) titleEl.value = url.split('/').pop().replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
          showToast(`✅ Valid PDF! ${pdf.numPages} pages detected.`);
        }
      } catch(e) {
        showToast('Could not validate PDF URL. It may not be accessible.', 'error');
      }
      btnModalValidateUrl.textContent = 'Validate';
    });
  }
}

// ============ CREATE FLIPBOOK MODAL ============
function initCreateModal() {
  if (btnOpenCreateModal) {
    btnOpenCreateModal.addEventListener('click', () => {
      if (uploadModal) {
        uploadModal.hidden = false;
        uploadModal.removeAttribute('hidden');
        uploadModal.style.display = 'flex';
      }
      if (pubInputTitle) pubInputTitle.focus();
    });
  }

  const hideUploadModal = () => {
    if (uploadModal) {
      uploadModal.hidden = true;
      uploadModal.setAttribute('hidden', '');
      uploadModal.style.display = 'none';
    }
  };

  if (closeModalBtn) closeModalBtn.addEventListener('click', hideUploadModal);
  if (btnCancelCreate) btnCancelCreate.addEventListener('click', hideUploadModal);

  if (optTierFree && optTierPaid) {
    optTierFree.addEventListener('click', () => {
      newPubTierSelected = 'free';
      optTierFree.classList.add('is-selected');
      optTierPaid.classList.remove('is-selected');
      if (groupPassword) groupPassword.style.display = 'none';
    });

    optTierPaid.addEventListener('click', () => {
      newPubTierSelected = 'paid';
      optTierPaid.classList.add('is-selected');
      optTierFree.classList.remove('is-selected');
      if (groupPassword) groupPassword.style.display = 'block';
    });
  }

  if (modalDropzone && pdfFileInput) {
    modalDropzone.addEventListener('click', () => pdfFileInput.click());

    modalDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      modalDropzone.style.borderColor = '#2563EB';
      modalDropzone.style.background = '#EFF6FF';
    });

    modalDropzone.addEventListener('dragleave', () => {
      modalDropzone.style.borderColor = '#E2E8F0';
      modalDropzone.style.background = '#F8FAFC';
    });

    modalDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      modalDropzone.style.borderColor = '#E2E8F0';
      modalDropzone.style.background = '#F8FAFC';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processUploadedPdf(e.dataTransfer.files[0]);
      }
    });

    pdfFileInput.addEventListener('change', () => {
      if (pdfFileInput.files && pdfFileInput.files[0]) {
        processUploadedPdf(pdfFileInput.files[0]);
      }
    });
  }

  if (createPubForm) {
    createPubForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = pubInputTitle.value.trim();
      const category = pubInputCategory?.value || 'General Report';
      const pages = parseInt(pubInputPages?.value, 10) || 20;
      const password = pubInputPassword ? pubInputPassword.value.trim() : '';

      if (!title) {
        showToast('Please enter a publication title', 'error');
        return;
      }

      const newId = `pub-${Date.now()}`;
      const isPaid = newPubTierSelected === 'paid';

      const newPublication = {
        id: newId,
        title: title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: category,
        pages: pages,
        reads: 0,
        shares: 0,
        avgTime: '0m',
        status: 'live',
        planTier: newPubTierSelected,
        isPaid: isPaid,
        isPasswordProtected: Boolean(password),
        password: password,
        thumbBg: isPaid ? '#FEF3C7' : '#EFF6FF',
        thumbColor: isPaid ? '#92400E' : '#1E40AF',
        thumbEmoji: isPaid ? '👑' : '📖',
        previewText: `${pages} pages • New 3D Flipbook`,
        spreads: [
          { left: 2, right: 3, title: 'Executive Summary', graphic: '📊 Key Highlights' },
          { left: 4, right: 5, title: 'Strategic Roadmap', graphic: '🌱 Progress Metrics' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      publications.unshift(newPublication);
      selectedPubId = newId;
      renderPublications();
      renderStats();
      renderDetailPane();
      updateShareAndPreviewSelectors();

      hideUploadModal();
      createPubForm.reset();
      showToast(isPaid ? `👑 Created Pro Flipbook "${title}"!` : `Created Flipbook "${title}"!`);

      try {
        const docRef = doc(db, 'publications', newId);
        await setDoc(docRef, {
          ...newPublication,
          ownerId: auth.currentUser?.uid || 'guest-user',
          ownerEmail: auth.currentUser?.email || ''
        });
      } catch (err) {
        console.warn('Create publication note:', err);
      }
    });
  }
}

async function processUploadedPdf(file) {
  if (!file || file.type !== 'application/pdf') {
    showToast('Please select a valid PDF file', 'error');
    return;
  }

  if (dropzoneLabel) dropzoneLabel.textContent = `Processing: ${file.name}...`;
  if (pubInputTitle && !pubInputTitle.value) {
    pubInputTitle.value = file.name.replace(/\.[^/.]+$/, "");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    if (typeof pdfjsLib !== 'undefined') {
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = doc.numPages;
      if (pubInputPages) pubInputPages.value = numPages;
      if (dropzoneLabel) dropzoneLabel.textContent = `✓ Loaded: ${file.name} (${numPages} pages)`;
      if (dropzoneSub) dropzoneSub.textContent = 'Ready to publish with 3D page curls and dual spread';
      showToast(`Detected ${numPages} pages in ${file.name}`);
    }
  } catch (err) {
    console.warn('PDF parsing notice:', err);
    if (dropzoneLabel) dropzoneLabel.textContent = `✓ Selected: ${file.name}`;
  }
}

// ============ SHARE & PREVIEW PANEL LOGIC ============
function initShareAndPreviewPanels() {
  // Share modal handlers
  if (closeShareModalBtn) {
    closeShareModalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeShareModal();
    });
  }

  if (shareModal) {
    shareModal.addEventListener('click', (e) => {
      if (e.target === shareModal) closeShareModal();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && shareModal && !shareModal.hidden) {
      closeShareModal();
    }
  });

  if (btnCopyModalUrl) {
    btnCopyModalUrl.addEventListener('click', () => {
      if (shareModalUrlInput?.value) {
        navigator.clipboard.writeText(shareModalUrlInput.value);
        showToast('Link copied!');
      }
    });
  }

  if (btnCopyModalEmbed) {
    btnCopyModalEmbed.addEventListener('click', () => {
      if (shareModalEmbedInput?.value) {
        navigator.clipboard.writeText(shareModalEmbedInput.value);
        showToast('Embed code copied!');
      }
    });
  }

  if (detailShareBtn) {
    detailShareBtn.addEventListener('click', () => openShareModal(selectedPubId));
  }

  if (detailEmbedBtn) {
    detailEmbedBtn.addEventListener('click', () => openShareModal(selectedPubId));
  }

  if (detailToggleTierBtn) {
    detailToggleTierBtn.addEventListener('click', () => togglePublicationTier(selectedPubId));
  }

  if (btnCopyDetailUrl) {
    btnCopyDetailUrl.addEventListener('click', () => {
      const url = detailSpecUrl?.textContent;
      if (url && url !== '—') {
        navigator.clipboard.writeText(url);
        showToast('URL copied!');
      }
    });
  }

  // Preview Panel Selector
  if (previewSelector) {
    previewSelector.addEventListener('change', () => {
      const selected = previewSelector.options[previewSelector.selectedIndex];
      const readerUrl = selected?.dataset?.readerUrl;
      if (readerUrl && selected.value) {
        if (previewFrame) { previewFrame.src = readerUrl; previewFrame.style.display = 'block'; }
        if (previewPlaceholder) previewPlaceholder.style.display = 'none';
        if (previewOpenBtn) previewOpenBtn.href = readerUrl;
      } else {
        if (previewFrame) previewFrame.style.display = 'none';
        if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
      }
    });
  }

  // Share Panel Selector
  const sharePubSelector = document.getElementById('share-pub-selector');
  if (sharePubSelector) {
    sharePubSelector.addEventListener('change', () => {
      const selected = sharePubSelector.options[sharePubSelector.selectedIndex];
      const readerUrl = selected?.dataset?.readerUrl;
      const shareUrlBox = document.getElementById('share-url-box');
      const shareUrlDisplay = document.getElementById('share-url-display');
      const shareEmbedCode = document.getElementById('share-embed-code');
      
      if (!sharePubSelector.value || !readerUrl) {
        if (shareUrlBox) shareUrlBox.style.display = 'none';
        return;
      }

      const fullUrl = readerUrl.startsWith('http') ? readerUrl : `${window.location.origin}/${readerUrl}`;
      if (shareUrlDisplay) shareUrlDisplay.textContent = fullUrl;
      if (shareUrlBox) shareUrlBox.style.display = 'flex';
      if (shareEmbedCode) shareEmbedCode.value = `<iframe src="${fullUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
    });
  }

  // Share Panel Copy buttons
  const btnCopyShareUrl = document.getElementById('btn-copy-share-url');
  if (btnCopyShareUrl) {
    btnCopyShareUrl.addEventListener('click', () => {
      const url = document.getElementById('share-url-display')?.textContent;
      if (url) { navigator.clipboard.writeText(url); showToast('Share link copied!'); }
    });
  }

  const btnCopyEmbedCode = document.getElementById('btn-copy-embed-code');
  if (btnCopyEmbedCode) {
    btnCopyEmbedCode.addEventListener('click', () => {
      const code = document.getElementById('share-embed-code')?.value;
      if (code) { navigator.clipboard.writeText(code); showToast('Embed code copied!'); }
    });
  }

  // Social share triggers
  const getSocialShareUrl = () => document.getElementById('share-url-display')?.textContent || window.location.href;
  document.getElementById('social-wa')?.addEventListener('click', () => { window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this interactive flipbook: ' + getSocialShareUrl())}`, '_blank'); });
  document.getElementById('social-tw')?.addEventListener('click', () => { window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getSocialShareUrl())}&text=${encodeURIComponent('Check out this interactive 3D flipbook on FlipPage!')}`, '_blank'); });
  document.getElementById('social-li')?.addEventListener('click', () => { window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getSocialShareUrl())}`, '_blank'); });
  document.getElementById('social-email')?.addEventListener('click', () => { window.location.href = `mailto:?subject=Check out this Flipbook&body=I wanted to share this interactive digital flipbook with you: ${getSocialShareUrl()}`; });
  document.getElementById('social-fb')?.addEventListener('click', () => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getSocialShareUrl())}`, '_blank'); });
  document.getElementById('social-copy')?.addEventListener('click', () => { navigator.clipboard.writeText(getSocialShareUrl()); showToast('Link copied!'); });

  // QR Code generator
  document.getElementById('btn-generate-qr')?.addEventListener('click', () => {
    const url = getSocialShareUrl();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(url)}`;
    const qrPlaceholder = document.getElementById('qr-placeholder');
    if (qrPlaceholder) {
      qrPlaceholder.innerHTML = `<img src="${qrUrl}" alt="QR Code" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
      showToast('QR code generated!');
    }
  });
}

// ============ AUTH STATE ============
function initAuthState() {
  onAuthStateChanged(auth, (user) => {
    const nameEl = document.getElementById('sidebar-user-name');
    const emailEl = document.getElementById('sidebar-user-email');
    const avatarEl = document.getElementById('sidebar-avatar-initial');
    const logoutBtn = document.getElementById('btn-switch-logout');
    const loginBtn = document.getElementById('btn-switch-login');

    if (user) {
      if (nameEl) nameEl.textContent = user.displayName || user.email?.split('@')[0] || 'User';
      if (emailEl) { emailEl.textContent = user.email || ''; emailEl.style.color = '#64748B'; emailEl.style.fontWeight = '500'; }
      if (avatarEl) {
        avatarEl.style.background = '#2563EB';
        avatarEl.innerHTML = `<span style="color:#fff; font-weight:700; font-size:1rem;">${(user.displayName || user.email || 'U').charAt(0).toUpperCase()}</span>`;
      }
      if (logoutBtn) logoutBtn.style.display = 'flex';
      if (loginBtn) loginBtn.style.display = 'none';

      if (logoutBtn && !logoutBtn._hasListener) {
        logoutBtn._hasListener = true;
        logoutBtn.addEventListener('click', async () => {
          await signOut(auth);
          showToast('Signed out successfully');
        });
      }

      const swName = document.getElementById('switch-active-name');
      const swEmail = document.getElementById('switch-active-email');
      if (swName) swName.textContent = user.displayName || user.email?.split('@')[0] || 'User';
      if (swEmail) swEmail.textContent = user.email || 'Signed in';
    } else {
      if (nameEl) nameEl.textContent = 'Guest User';
      if (emailEl) { emailEl.textContent = 'Click to Sign In'; emailEl.style.color = '#2563EB'; emailEl.style.fontWeight = '600'; }
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'flex';
    }
  });
}

// ============ SEARCH & FILTERS ============
function initSearchAndFilters() {
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderPublications();
    });
  }

  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('is-active'));
      pill.classList.add('is-active');
      activeFilter = pill.dataset.filter || 'all';
      renderPublications();
    });
  });
}

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
  renderPublications();
  renderStats();
  renderDetailPane();
  initSearchAndFilters();
  initCreateModal();
  initUrlFlipbooks();
  initShareAndPreviewPanels();
  initAuthState();
  initFirestoreSync();
});
