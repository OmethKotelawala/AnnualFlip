/**
 * FlipPage Enterprise Workspace Interactive Flipbook Studio Controller
 * Real-time Firebase Firestore Sync, Free and Paid (👑 Yellow Crown) Tier Management,
 * PDF.js client-side page extraction, sharing & embed generator.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Configuration from provisioned project
const firebaseConfig = {
  projectId: "gen-lang-client-0435835472",
  appId: "1:772093074138:web:42bda395d4aed6154023e3",
  apiKey: "AIzaSyCf6Fp-qy8fkkDGOGKiouF1n64tgSNfAzY",
  authDomain: "gen-lang-client-0435835472.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-annualflip-d5e05e1e-4c28-4cf6-b18c-1e967bd5cdc9",
  storageBucket: "gen-lang-client-0435835472.firebasestorage.app",
  messagingSenderId: "772093074138"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Standard Error Handler per Firebase Skill
function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  showToast(error?.message || 'Database error occurred');
}

// Initial In-Memory / Fallback Data
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
    planTier: 'paid', // 'paid' | 'free'
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

// Pre-built templates
const TEMPLATES_CATALOG = [
  {
    id: 't-annual',
    title: 'Corporate Annual ESG Report',
    category: 'Annual Report',
    pages: 32,
    emoji: '📊',
    bg: '#DCFCE7',
    color: '#15803D',
    planTier: 'paid',
    desc: 'Executive summary, sustainability metrics, balance sheets & typography.'
  },
  {
    id: 't-lookbook',
    title: 'Luxury Fashion & Apparel Lookbook',
    category: 'Lookbook & Catalog',
    pages: 40,
    emoji: '✨',
    bg: '#FEE2E2',
    color: '#B91C1C',
    planTier: 'paid',
    desc: 'Full-bleed high-definition photography spreads & product cards.'
  },
  {
    id: 't-brochure',
    title: 'Modern Architecture Brochure',
    category: 'Brochure',
    pages: 16,
    emoji: '🏛️',
    bg: '#FEF3C7',
    color: '#B45309',
    planTier: 'free',
    desc: 'Tri-fold and multi-page property brochures with high vector clarity.'
  },
  {
    id: 't-pitch',
    title: 'Series A Investor Pitch Deck',
    category: 'Pitch Deck',
    pages: 18,
    emoji: '🚀',
    bg: '#E0E7FF',
    color: '#4338CA',
    planTier: 'free',
    desc: 'Problem, solution, market size TAM, unit economics, and team.'
  }
];

let selectedPubId = 'p1';
let activeFilter = 'all';
let currentTab = 'pubs'; // 'pubs' | 'collections' | 'users' | 'reported' | 'calls' | 'activity' | 'usage' | 'lab'
let activeFirebaseUser = null;
let newPubTierSelected = 'free'; // 'free' | 'paid'

// DOM Elements
const pubGrid = document.getElementById('publications-grid-container');
const collectionsGrid = document.getElementById('collections-grid-container');
const templatesGrid = document.getElementById('templates-grid-container');
const searchInput = document.getElementById('search-pubs-input');
const filterPills = document.querySelectorAll('.filter-pill');

// Stat DOMs
const statTotalPubs = document.getElementById('stat-total-pubs');
const statTotalReads = document.getElementById('stat-total-reads');
const statPaidPubs = document.getElementById('stat-paid-pubs');
const statSharesCount = document.getElementById('stat-shares-count');

// Detail Pane DOMs
const detailTierBadge = document.getElementById('detail-tier-badge');
const detailBookThumb = document.getElementById('detail-book-thumb');
const detailBookEmoji = document.getElementById('detail-book-emoji');
const detailBookTitle = document.getElementById('detail-book-title');
const detailBookDesc = document.getElementById('detail-book-desc');
const detailOpenReaderBtn = document.getElementById('btn-detail-open-reader');
const detailShareBtn = document.getElementById('btn-detail-share');
const detailToggleTierBtn = document.getElementById('btn-detail-toggle-tier');
const detailTierBtnLabel = document.getElementById('detail-tier-btn-label');
const detailTierDesc = document.getElementById('detail-tier-description');
const detailSpecPages = document.getElementById('detail-spec-pages');
const detailSpecStatus = document.getElementById('detail-spec-status');
const detailSpecReads = document.getElementById('detail-spec-reads');
const detailSpecTime = document.getElementById('detail-spec-time');
const detailSpecUrl = document.getElementById('detail-spec-url');
const detailSpreadsList = document.getElementById('detail-spreads-list');

// Navigation Tabs
const navTabChat = document.getElementById('nav-tab-chat');
const navTabPubs = document.getElementById('nav-tab-pubs');
const navTabCollections = document.getElementById('nav-tab-collections');
const navTabUsers = document.getElementById('nav-tab-users');
const navTabReported = document.getElementById('nav-tab-reported');
const navTabCalls = document.getElementById('nav-tab-calls');
const navTabActivity = document.getElementById('nav-tab-activity');
const navTabUsage = document.getElementById('nav-tab-usage');
const navTabLab = document.getElementById('nav-tab-lab');
const navTabTemplates = document.getElementById('nav-tab-templates');
const navTabAnalytics = document.getElementById('nav-tab-analytics');
const currentViewTitle = document.getElementById('current-view-title');

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

// Pro Plan Modal DOM
const proModal = document.getElementById('pro-modal');
const navBtnUpgradePlan = document.getElementById('nav-btn-upgrade-plan');
const closeProModalBtn = document.getElementById('close-pro-modal-btn');
const btnCloseProModal = document.getElementById('btn-close-pro-modal');
const btnActivateProWorkspace = document.getElementById('btn-activate-pro-workspace');

// User / Account DOMs
const sidebarUserCard = document.getElementById('sidebar-user-card');
const switchPopup = document.getElementById('switch-accounts-popup');
const sidebarName = document.getElementById('sidebar-user-name');
const sidebarEmail = document.getElementById('sidebar-user-email');
const sidebarAvatar = document.getElementById('sidebar-avatar-initial');
const switchName = document.getElementById('switch-active-name');
const switchEmail = document.getElementById('switch-active-email');
const switchAvatar = document.getElementById('switch-active-avatar');
const btnSwitchLogout = document.getElementById('btn-switch-logout');

// Toast DOM
const wsToast = document.getElementById('ws-toast');
const wsToastMsg = document.getElementById('ws-toast-msg');

function showToast(msg) {
  if (!wsToast) return;
  if (wsToastMsg) wsToastMsg.textContent = msg;
  wsToast.style.display = 'flex';
  setTimeout(() => {
    wsToast.style.display = 'none';
  }, 2600);
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

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

      // Merge / overwrite with Firestore source of truth
      publications = liveList;
      renderPublications();
      renderStats();
      if (!publications.find(p => p.id === selectedPubId) && publications.length > 0) {
        selectedPubId = publications[0].id;
      }
      renderDetailPane();
    } else {
      // Seed default publications if collection is empty
      seedInitialPublications();
    }
  }, (err) => {
    handleFirestoreError(err, 'list', 'publications');
  });
}

async function seedInitialPublications() {
  try {
    for (const pub of publications) {
      const ref = doc(db, 'publications', pub.id);
      await setDoc(ref, {
        ...pub,
        ownerId: auth.currentUser?.uid || 'demo-admin',
        ownerEmail: auth.currentUser?.email || 'paneljoker145@gmail.com',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Initial seeding fallback:', err);
  }
}

// ============ RENDER WORKSPACE FEED ============
function renderPublications() {
  if (!pubGrid) return;
  pubGrid.innerHTML = '';

  const query = (searchInput?.value || '').toLowerCase().trim();
  
  const filtered = publications.filter(p => {
    // Filter pill logic
    if (activeFilter === 'paid' && !p.isPaid && p.planTier !== 'paid') return false;
    if (activeFilter === 'free' && (p.isPaid || p.planTier === 'paid')) return false;
    if (activeFilter === 'live' && p.status !== 'live') return false;
    if (activeFilter === 'draft' && p.status !== 'draft') return false;

    // Search query logic
    if (query) {
      const matchTitle = (p.title || '').toLowerCase().includes(query);
      const matchCategory = (p.category || '').toLowerCase().includes(query);
      return matchTitle || matchCategory;
    }
    return true;
  });

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
      <div class="pub-card-top">
        <div class="pub-thumb-cover" style="background:${pub.thumbBg || '#EFF6FF'}; color:${pub.thumbColor || '#1E40AF'};">
          <span>${pub.thumbEmoji || '📖'}</span>
        </div>
        <div class="pub-card-info">
          <div class="pub-card-tags">
            ${isPaid 
              ? `<span class="crown-badge"><span class="crown-icon">👑</span>PRO</span>` 
              : `<span class="crown-badge free">FREE</span>`}
            <span style="font-size:0.72rem; color:#64748B; background:#F1F5F9; padding:2px 6px; border-radius:4px; font-weight:600;">${escapeHtml(pub.category || 'Report')}</span>
          </div>
          <h4 class="pub-card-title">${escapeHtml(pub.title)}</h4>
          <div class="pub-card-meta">
            <span>📄 ${pub.pages || 20}p</span>
            <span>•</span>
            <span>👁️ ${pub.reads || 0} reads</span>
          </div>
        </div>
      </div>

      <div class="pub-card-actions">
        <div class="pub-action-btn-group">
          <a href="reader.html?id=${encodeURIComponent(pub.id)}" target="_blank" class="pub-btn primary" title="Open in 3D Reader" onclick="event.stopPropagation();">
            <span>📖 Read</span>
          </a>
          <button type="button" class="pub-btn btn-share-pub" data-id="${pub.id}" title="Share &amp; Embed link" onclick="event.stopPropagation();">
            <span>🔗 Share</span>
          </button>
        </div>

        <div class="pub-action-btn-group">
          <button type="button" class="tier-toggle-btn ${isPaid ? 'is-paid' : 'is-free'} btn-quick-toggle-tier" data-id="${pub.id}" title="Toggle Free vs Paid Crown Tier" onclick="event.stopPropagation();">
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
    btn.addEventListener('click', () => {
      openShareModal(btn.dataset.id);
    });
  });

  document.querySelectorAll('.btn-quick-toggle-tier').forEach(btn => {
    btn.addEventListener('click', () => {
      togglePublicationTier(btn.dataset.id);
    });
  });

  document.querySelectorAll('.btn-delete-pub').forEach(btn => {
    btn.addEventListener('click', () => {
      deletePublication(btn.dataset.id);
    });
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
  if (!pub) return;

  const isPaid = Boolean(pub.isPaid || pub.planTier === 'paid');

  if (detailTierBadge) {
    detailTierBadge.className = `crown-badge ${isPaid ? '' : 'free'}`;
    detailTierBadge.innerHTML = isPaid ? `<span class="crown-icon">👑</span>PRO TIER` : `FREE TIER`;
  }

  if (detailBookThumb) {
    detailBookThumb.style.background = pub.thumbBg || '#EFF6FF';
    detailBookThumb.style.color = pub.thumbColor || '#1E40AF';
  }
  if (detailBookEmoji) detailBookEmoji.textContent = pub.thumbEmoji || '📖';
  if (detailBookTitle) detailBookTitle.textContent = pub.title;
  if (detailBookDesc) detailBookDesc.textContent = `${pub.pages || 20} pages • ${pub.reads || 0} direct reads • Dual spread interactive 3D physics active.`;

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
  if (detailSpecUrl) detailSpecUrl.textContent = `flippage.io/read?id=${pub.id}`;

  if (detailSpreadsList) {
    detailSpreadsList.innerHTML = '';
    const spreads = pub.spreads && pub.spreads.length > 0 ? pub.spreads : [
      { left: 2, right: 3, title: 'Executive Overview', graphic: '📊 Key Performance Metrics' },
      { left: 4, right: 5, title: 'Strategic Roadmap', graphic: '🌱 Carbon Offset & Net Zero' }
    ];

    spreads.forEach(s => {
      const row = document.createElement('div');
      row.style.cssText = "display:flex; align-items:center; justify-content:space-between; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:8px; padding:8px 10px; font-size:0.78rem;";
      row.innerHTML = `
        <span style="font-weight:700; color:#334155;">Spreads ${s.left}-${s.right || s.left + 1}</span>
        <span style="color:#64748B;">${escapeHtml(s.title || s.graphic || 'Content Page')}</span>
      `;
      detailSpreadsList.appendChild(row);
    });
  }
}

// ============ TIER TOGGLE (FREE ↔ 👑 PAID) ============
async function togglePublicationTier(pubId) {
  const pub = publications.find(p => p.id === pubId);
  if (!pub) return;

  const nextIsPaid = !Boolean(pub.isPaid || pub.planTier === 'paid');
  const nextTier = nextIsPaid ? 'paid' : 'free';

  // Optimistic local update
  pub.isPaid = nextIsPaid;
  pub.planTier = nextTier;
  renderPublications();
  renderStats();
  renderDetailPane();

  showToast(nextIsPaid ? `👑 Upgraded "${pub.title}" to Pro Tier!` : `Switched "${pub.title}" to Free Tier`);

  // Firestore sync
  try {
    const docRef = doc(db, 'publications', pubId);
    await updateDoc(docRef, {
      isPaid: nextIsPaid,
      planTier: nextTier,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    handleFirestoreError(err, 'update', `publications/${pubId}`);
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

  showToast(`Deleted "${pub.title}"`);

  try {
    const docRef = doc(db, 'publications', pubId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, 'delete', `publications/${pubId}`);
  }
}

// ============ SHARE & EMBED MODAL ============
function openShareModal(pubId) {
  const pub = publications.find(p => p.id === (pubId || selectedPubId)) || publications[0];
  if (!pub) return;

  const baseUrl = window.location.origin;
  const directUrl = `${baseUrl}/reader.html?id=${encodeURIComponent(pub.id)}`;
  const embedCode = `<iframe src="${directUrl}" width="100%" height="600" frameborder="0" allowfullscreen allow="clipboard-read; clipboard-write"></iframe>`;

  if (shareModalUrlInput) shareModalUrlInput.value = directUrl;
  if (shareModalEmbedInput) shareModalEmbedInput.value = embedCode;

  const encUrl = encodeURIComponent(directUrl);
  const encTxt = encodeURIComponent(`Read "${pub.title}" interactive 3D digital flipbook on FlipPage!`);

  if (shareModalWa) shareModalWa.href = `https://api.whatsapp.com/send?text=${encTxt}%20${encUrl}`;
  if (shareModalTw) shareModalTw.href = `https://twitter.com/intent/tweet?url=${encUrl}&text=${encTxt}`;
  if (shareModalLi) shareModalLi.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`;

  if (shareModal) shareModal.hidden = false;
}

function closeShareModal() {
  if (shareModal) shareModal.hidden = true;
}

// ============ CREATE NEW PUBLICATION ============
function initCreateModal() {
  if (btnOpenCreateModal) {
    btnOpenCreateModal.addEventListener('click', () => {
      if (uploadModal) uploadModal.hidden = false;
      if (pubInputTitle) pubInputTitle.focus();
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      if (uploadModal) uploadModal.hidden = true;
    });
  }

  if (btnCancelCreate) {
    btnCancelCreate.addEventListener('click', () => {
      if (uploadModal) uploadModal.hidden = true;
    });
  }

  // Tier Selection
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

  // Dropzone file handling & PDF.js page counting
  if (modalDropzone && pdfFileInput) {
    modalDropzone.addEventListener('click', () => pdfFileInput.click());

    modalDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      modalDropzone.style.borderColor = '#2563EB';
      modalDropzone.style.background = '#EFF6FF';
    });

    modalDropzone.addEventListener('dragleave', () => {
      modalDropzone.style.borderColor = '#CBD5E1';
      modalDropzone.style.background = '#F8FAFC';
    });

    modalDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      modalDropzone.style.borderColor = '#CBD5E1';
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

  // Form Submit
  if (createPubForm) {
    createPubForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = pubInputTitle.value.trim();
      const category = pubInputCategory.value;
      const pages = parseInt(pubInputPages.value, 10) || 20;
      const password = pubInputPassword ? pubInputPassword.value.trim() : '';

      if (!title) {
        showToast('Please enter a publication title');
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

      // Optimistic insert
      publications.unshift(newPublication);
      selectedPubId = newId;
      renderPublications();
      renderStats();
      renderDetailPane();

      if (uploadModal) uploadModal.hidden = true;
      createPubForm.reset();
      showToast(isPaid ? `👑 Created Pro Flipbook "${title}"!` : `Created Flipbook "${title}"!`);

      // Firestore save
      try {
        const docRef = doc(db, 'publications', newId);
        await setDoc(docRef, {
          ...newPublication,
          ownerId: auth.currentUser?.uid || 'user-101',
          ownerEmail: auth.currentUser?.email || 'user@flippage.com'
        });
      } catch (err) {
        handleFirestoreError(err, 'create', `publications/${newId}`);
      }
    });
  }
}

async function processUploadedPdf(file) {
  if (!file || file.type !== 'application/pdf') {
    showToast('Please select a valid PDF file');
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

// ============ TEMPLATES CLONING ============
function initTemplatesTab() {
  if (!templatesGrid) return;
  templatesGrid.innerHTML = '';

  TEMPLATES_CATALOG.forEach(t => {
    const card = document.createElement('div');
    card.className = 'pub-card';
    card.innerHTML = `
      <div class="pub-card-top">
        <div class="pub-thumb-cover" style="background:${t.bg}; color:${t.color};">
          <span>${t.emoji}</span>
        </div>
        <div class="pub-card-info">
          <div class="pub-card-tags">
            ${t.planTier === 'paid' 
              ? `<span class="crown-badge"><span class="crown-icon">👑</span>PRO</span>` 
              : `<span class="crown-badge free">FREE</span>`}
            <span style="font-size:0.72rem; color:#64748B; background:#F1F5F9; padding:2px 6px; border-radius:4px; font-weight:600;">${t.category}</span>
          </div>
          <h4 class="pub-card-title">${t.title}</h4>
          <p style="font-size:0.78rem; color:#64748B; margin:4px 0 0; line-height:1.4;">${t.desc}</p>
        </div>
      </div>

      <div class="pub-card-actions">
        <span style="font-size:0.76rem; font-weight:700; color:#0F172A;">${t.pages} Pre-built Pages</span>
        <button type="button" class="btn-new-pub btn-clone-template" data-id="${t.id}" style="padding:6px 14px; font-size:0.78rem;">
          <span>Use Template</span>
        </button>
      </div>
    `;

    templatesGrid.appendChild(card);
  });

  document.querySelectorAll('.btn-clone-template').forEach(btn => {
    btn.addEventListener('click', () => {
      const template = TEMPLATES_CATALOG.find(t => t.id === btn.dataset.id);
      if (!template) return;

      const newId = `pub-t-${Date.now()}`;
      const isPaid = template.planTier === 'paid';
      const cloned = {
        id: newId,
        title: template.title,
        slug: template.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        category: template.category,
        pages: template.pages,
        reads: 0,
        shares: 0,
        avgTime: '0m',
        status: 'live',
        planTier: template.planTier,
        isPaid: isPaid,
        thumbBg: template.bg,
        thumbColor: template.color,
        thumbEmoji: template.emoji,
        previewText: `${template.pages} pages • Cloned from ${template.category} template`,
        spreads: [
          { left: 2, right: 3, title: 'Executive Summary', graphic: '📊 Key Financial Highlights' },
          { left: 4, right: 5, title: 'Growth Strategies', graphic: '🌱 Sustainable Milestones' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      publications.unshift(cloned);
      selectedPubId = newId;
      switchTab('pubs');
      showToast(`Cloned template "${template.title}" into your workspace!`);

      // Firestore save
      try {
        const docRef = doc(db, 'publications', newId);
        setDoc(docRef, {
          ...cloned,
          ownerId: auth.currentUser?.uid || 'user-101',
          ownerEmail: auth.currentUser?.email || 'user@flippage.com'
        });
      } catch (err) {
        handleFirestoreError(err, 'create', `publications/${newId}`);
      }
    });
  });
}

// ============ TAB SWITCHER ============
function switchTab(tab) {
  currentTab = tab;
  
  const tabViewChat = document.getElementById('tab-view-chat');
  const tabViewPubs = document.getElementById('tab-view-pubs');
  const tabViewCollections = document.getElementById('tab-view-collections');
  const tabViewUsers = document.getElementById('tab-view-users');
  const tabViewReported = document.getElementById('tab-view-reported');
  const tabViewCalls = document.getElementById('tab-view-calls');
  const tabViewActivity = document.getElementById('tab-view-activity');
  const tabViewUsage = document.getElementById('tab-view-usage');
  const tabViewLab = document.getElementById('tab-view-lab');
  const tabViewTemplates = document.getElementById('tab-view-templates');
  const tabViewAnalytics = document.getElementById('tab-view-analytics');

  const allNavTabs = [
    navTabChat, 
    navTabPubs, 
    navTabCollections, 
    navTabUsers, 
    navTabReported, 
    navTabCalls, 
    navTabActivity, 
    navTabUsage, 
    navTabLab, 
    navTabTemplates, 
    navTabAnalytics
  ];

  allNavTabs.forEach(btn => {
    if (btn) btn.classList.remove('is-active');
  });

  if (tabViewChat) tabViewChat.style.display = (tab === 'chat') ? 'block' : 'none';
  if (tabViewPubs) tabViewPubs.style.display = (tab === 'pubs') ? 'block' : 'none';
  if (tabViewCollections) tabViewCollections.style.display = (tab === 'collections') ? 'block' : 'none';
  if (tabViewUsers) tabViewUsers.style.display = (tab === 'users') ? 'block' : 'none';
  if (tabViewReported) tabViewReported.style.display = (tab === 'reported') ? 'block' : 'none';
  if (tabViewCalls) tabViewCalls.style.display = (tab === 'calls') ? 'block' : 'none';
  if (tabViewActivity) tabViewActivity.style.display = (tab === 'activity') ? 'block' : 'none';
  if (tabViewUsage) tabViewUsage.style.display = (tab === 'usage') ? 'block' : 'none';
  if (tabViewLab) tabViewLab.style.display = (tab === 'lab') ? 'block' : 'none';
  if (tabViewTemplates) tabViewTemplates.style.display = (tab === 'templates') ? 'block' : 'none';
  if (tabViewAnalytics) tabViewAnalytics.style.display = (tab === 'analytics') ? 'block' : 'none';

  if (tab === 'chat') {
    if (navTabChat) navTabChat.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Workspace Chat';
  } else if (tab === 'pubs') {
    if (navTabPubs) navTabPubs.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Digital Flipbooks';
    renderPublications();
  } else if (tab === 'collections') {
    if (navTabCollections) navTabCollections.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Digital Bookshelf';
    renderBookshelfHub();
  } else if (tab === 'users') {
    if (navTabUsers) navTabUsers.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Users & Roles';
  } else if (tab === 'reported') {
    if (navTabReported) navTabReported.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Reported Content';
  } else if (tab === 'calls') {
    if (navTabCalls) navTabCalls.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Call Logs';
  } else if (tab === 'activity') {
    if (navTabActivity) navTabActivity.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Activity Logs';
  } else if (tab === 'usage') {
    if (navTabUsage) navTabUsage.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Plan & Usage';
  } else if (tab === 'lab') {
    if (navTabLab) navTabLab.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = '3D Shader Lab';
  } else if (tab === 'templates') {
    if (navTabTemplates) navTabTemplates.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Templates Gallery';
    initTemplatesTab();
  } else if (tab === 'analytics') {
    if (navTabAnalytics) navTabAnalytics.classList.add('is-active');
    if (currentViewTitle) currentViewTitle.textContent = 'Reader Insights';
  }
}

// ============ WORKSPACE CHAT & FLOATING ASSISTANT WIDGET ============
function initWorkspaceChat() {
  const chatForm = document.getElementById('workspace-chat-form');
  const chatInput = document.getElementById('workspace-chat-input');
  const chatStream = document.getElementById('workspace-chat-stream');
  const quickPillsStack = document.getElementById('widget-quick-pills');

  // Floating Drawer elements
  const btnFloatingLauncher = document.getElementById('btn-floating-ai-launcher');
  const floatingDrawer = document.getElementById('floating-ai-drawer');
  const btnCloseFloating = document.getElementById('btn-close-floating-drawer');
  const floatingForm = document.getElementById('floating-chat-form');
  const floatingInput = document.getElementById('floating-chat-input');
  const floatingStream = document.getElementById('floating-chat-stream');
  const floatingPillsStack = document.getElementById('floating-quick-pills');

  // Helper to format current time e.g. "11:08 AM"
  function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Toggle Floating Drawer
  if (btnFloatingLauncher && floatingDrawer) {
    btnFloatingLauncher.addEventListener('click', (e) => {
      e.stopPropagation();
      floatingDrawer.classList.toggle('is-open');
    });
  }

  if (btnCloseFloating && floatingDrawer) {
    btnCloseFloating.addEventListener('click', () => {
      floatingDrawer.classList.remove('is-open');
    });
  }

  document.addEventListener('click', (e) => {
    if (floatingDrawer && floatingDrawer.classList.contains('is-open')) {
      if (!floatingDrawer.contains(e.target) && btnFloatingLauncher && !btnFloatingLauncher.contains(e.target)) {
        floatingDrawer.classList.remove('is-open');
      }
    }
  });

  function appendMessageToStream(stream, text, isUser = true) {
    if (!stream) return;
    const msgDiv = document.createElement('div');
    const timeStr = getFormattedTime();

    if (isUser) {
      msgDiv.className = 'ai-user-bubble';
      msgDiv.textContent = text;
    } else {
      msgDiv.className = 'ai-bot-bubble';
      msgDiv.innerHTML = `
        <span class="greeting-body">${escapeHtml(text)}</span>
        <span class="bubble-time">${timeStr}</span>
      `;
    }
    
    stream.appendChild(msgDiv);
    stream.scrollTop = stream.scrollHeight;
  }

  function generateAssistantResponse(query, targetStream) {
    const q = query.toLowerCase();
    
    // Simulate typing delay
    setTimeout(() => {
      let reply = "";
      if (q.includes('service') || q.includes('offer')) {
        reply = "We offer interactive 3D digital flipbook conversion from PDF, vector rendering, customizable branding, audio page turns, embed widgets, and reader insights analytics!";
      } else if (q.includes('support') || q.includes('contact')) {
        reply = "You can reach our dedicated FlipPage support team 24/7 at support@flippage.io or message us directly through this Virtual Assistant.";
      } else if (q.includes('cost') || q.includes('price') || q.includes('plan')) {
        reply = "We have a Free Tier with basic 3D publishing, and a Pro Tier ($19/mo) with zero watermarks, HD vector rendering, password protection, and custom sub-domains. You currently have 14 days left on your Pro trial!";
      } else if (q.includes('upload') || q.includes('pdf') || q.includes('create')) {
        reply = "To create a 3D flipbook, click '+ New Flipbook' in the top right or drop your PDF document into the creation modal. It compiles into interactive double-sided spreads instantly.";
      } else if (q.includes('summary') || q.includes('reads')) {
        reply = `📊 Reader Insights: Across your ${publications.length} active publications, you have 18,100 reads with an average reading duration of 3m 42s.`;
      } else {
        reply = `Thanks for asking about "${query}". I'm ready to help you optimize your flipbooks, customize your 3D physics settings, or launch reader presentations.`;
      }

      appendMessageToStream(targetStream || chatStream, reply, false);
      if (targetStream !== floatingStream && floatingStream) {
        appendMessageToStream(floatingStream, reply, false);
      }
    }, 450);
  }

  // Handle Tab View Chat Form
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = chatInput.value.trim();
      if (!val) return;
      
      // Hide initial pills once custom conversation starts
      if (quickPillsStack) quickPillsStack.style.display = 'none';
      
      appendMessageToStream(chatStream, val, true);
      chatInput.value = '';
      generateAssistantResponse(val, chatStream);
    });
  }

  // Handle Tab Quick Action Pills
  document.querySelectorAll('.chat-prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (!prompt) return;
      if (quickPillsStack) quickPillsStack.style.display = 'none';
      appendMessageToStream(chatStream, prompt, true);
      generateAssistantResponse(prompt, chatStream);
    });
  });

  // Handle Floating Drawer Chat Form
  if (floatingForm && floatingInput) {
    floatingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = floatingInput.value.trim();
      if (!val) return;
      if (floatingPillsStack) floatingPillsStack.style.display = 'none';
      appendMessageToStream(floatingStream, val, true);
      floatingInput.value = '';
      generateAssistantResponse(val, floatingStream);
    });
  }

  // Handle Floating Quick Action Pills
  document.querySelectorAll('.floating-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const prompt = chip.dataset.prompt;
      if (!prompt) return;
      if (floatingPillsStack) floatingPillsStack.style.display = 'none';
      appendMessageToStream(floatingStream, prompt, true);
      generateAssistantResponse(prompt, floatingStream);
    });
  });
}

function renderBookshelfHub() {
  if (!collectionsGrid) return;
  collectionsGrid.innerHTML = '';

  publications.forEach(pub => {
    const card = document.createElement('div');
    card.className = 'pub-card';
    card.innerHTML = `
      <div class="pub-card-top">
        <div class="pub-thumb-cover" style="background:${pub.thumbBg || '#EFF6FF'}; color:${pub.thumbColor || '#1E40AF'};">
          <span>${pub.thumbEmoji || '📖'}</span>
        </div>
        <div class="pub-card-info">
          <div class="pub-card-tags">
            ${pub.isPaid ? `<span class="crown-badge"><span class="crown-icon">👑</span>PRO</span>` : `<span class="crown-badge free">FREE</span>`}
          </div>
          <h4 class="pub-card-title">${escapeHtml(pub.title)}</h4>
          <span style="font-size:0.75rem; color:#64748B;">${pub.pages || 20} Pages • ${pub.reads || 0} Reads</span>
        </div>
      </div>
      <div class="pub-card-actions">
        <a href="reader.html?id=${encodeURIComponent(pub.id)}" target="_blank" class="pub-btn primary" style="width:100%; justify-content:center;">
          <span>📖 Open Book</span>
        </a>
      </div>
    `;
    collectionsGrid.appendChild(card);
  });
}

// ============ CLOCK & AUTH LISTENERS ============
function initClock() {
  const clock = document.getElementById('topbar-clock');
  function update() {
    if (!clock) return;
    const now = new Date();
    const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    clock.innerHTML = now.toLocaleDateString('en-US', options);
  }
  update();
  setInterval(update, 30000);
}

function initAuth() {
  const btnSwitchLogin = document.getElementById('btn-switch-login');
  const topbarSigninBtn = document.getElementById('topbar-signin-btn');
  const topbarSigninText = document.getElementById('topbar-signin-text');
  const authGateOverlay = document.getElementById('auth-gate-overlay');
  const authGateGoogleBtn = document.getElementById('auth-gate-google-btn');
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  // Handle Google sign in directly on the auth gate if clicked
  if (authGateGoogleBtn) {
    authGateGoogleBtn.addEventListener('click', async () => {
      try {
        authGateGoogleBtn.disabled = true;
        authGateGoogleBtn.innerHTML = '<span>Signing in with Google...</span>';
        await signInWithPopup(auth, googleProvider);
      } catch (err) {
        console.error('Gate Google Sign-In Error:', err);
        authGateGoogleBtn.disabled = false;
        authGateGoogleBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
          <span>Continue with Google</span>
        `;
      }
    });
  }

  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is Authenticated: Unlock Workspace
      if (authGateOverlay) authGateOverlay.style.display = 'none';
      activeFirebaseUser = user;
      const name = user.displayName || (user.email ? user.email.split('@')[0] : 'Workspace Member');
      const email = user.email || '';
      let photo = user.photoURL || '';

      if (photo && photo.includes('googleusercontent.com')) {
        photo = photo.replace(/=s\d+(-c)?/i, '=s384-c');
      }

      if (sidebarName) sidebarName.textContent = name;
      if (sidebarEmail) {
        sidebarEmail.textContent = email;
        sidebarEmail.style.color = '#8896A6';
        sidebarEmail.style.fontWeight = '400';
      }
      if (switchName) switchName.textContent = name;
      if (switchEmail) switchEmail.textContent = email;

      const initial = (name.charAt(0) || 'U').toUpperCase();

      if (sidebarAvatar) {
        sidebarAvatar.style.background = '#2563EB';
        if (photo) {
          sidebarAvatar.innerHTML = `<img src="${photo}" alt="${escapeHtml(name)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.parentElement.textContent='${initial}';">`;
          sidebarAvatar.style.padding = '0';
        } else {
          sidebarAvatar.textContent = initial;
        }
      }

      if (switchAvatar) {
        if (photo) {
          switchAvatar.innerHTML = `<img src="${photo}" alt="${escapeHtml(name)}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;" onerror="this.parentElement.textContent='${initial}';">`;
        } else {
          switchAvatar.textContent = initial;
        }
      }

      if (topbarSigninBtn && topbarSigninText) {
        topbarSigninText.textContent = name;
        topbarSigninBtn.title = `Connected as ${email}`;
      }

      if (btnSwitchLogout) btnSwitchLogout.style.display = 'flex';
      if (btnSwitchLogin) {
        btnSwitchLogin.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
          </svg>
          <span>Switch / Add Account</span>
        `;
      }
    } else {
      // User is Unauthenticated: Lock Workspace and Prompt/Redirect to Account page
      activeFirebaseUser = null;
      if (authGateOverlay) authGateOverlay.style.display = 'flex';

      // Auto-redirect to account page with auth=required parameter
      setTimeout(() => {
        if (!auth.currentUser) {
          window.location.replace('account.html?auth=required');
        }
      }, 700);

      if (sidebarName) sidebarName.textContent = 'Guest User';
      if (sidebarEmail) {
        sidebarEmail.textContent = 'Click to Sign In';
        sidebarEmail.style.color = '#2563EB';
        sidebarEmail.style.fontWeight = '600';
      }
      if (sidebarAvatar) {
        sidebarAvatar.style.background = '#64748B';
        sidebarAvatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      }
      if (switchName) switchName.textContent = 'Guest User';
      if (switchEmail) switchEmail.textContent = 'Signed out • Local mode';
      if (switchAvatar) {
        switchAvatar.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      }

      if (topbarSigninBtn && topbarSigninText) {
        topbarSigninText.textContent = 'Sign In / Connect';
        topbarSigninBtn.title = 'Sign in with your Google or Email account';
      }

      if (btnSwitchLogout) btnSwitchLogout.style.display = 'none';
      if (btnSwitchLogin) {
        btnSwitchLogin.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
            <polyline points="10 17 15 12 10 7"/>
            <line x1="15" y1="12" x2="3" y2="12"/>
          </svg>
          <span>Sign in / Create Account</span>
        `;
      }
    }
  });

  if (sidebarUserCard && switchPopup) {
    sidebarUserCard.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = switchPopup.hidden;
      switchPopup.hidden = !isHidden;
    });

    document.addEventListener('click', (e) => {
      if (!switchPopup.contains(e.target) && !sidebarUserCard.contains(e.target)) {
        switchPopup.hidden = true;
      }
    });
  }

  if (btnSwitchLogout) {
    btnSwitchLogout.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'account.html';
    });
  }
}

// ============ PRO MODAL & GENERAL LISTENERS ============
function initProModal() {
  if (navBtnUpgradePlan && proModal) {
    navBtnUpgradePlan.addEventListener('click', () => {
      proModal.hidden = false;
    });
  }

  if (closeProModalBtn) closeProModalBtn.addEventListener('click', () => { if (proModal) proModal.hidden = true; });
  if (btnCloseProModal) btnCloseProModal.addEventListener('click', () => { if (proModal) proModal.hidden = true; });

  if (btnActivateProWorkspace) {
    btnActivateProWorkspace.addEventListener('click', () => {
      publications.forEach(p => {
        p.isPaid = true;
        p.planTier = 'paid';
      });
      renderPublications();
      renderStats();
      renderDetailPane();
      if (proModal) proModal.hidden = true;
      showToast('👑 Activated FlipPage Pro with Yellow Crown across workspace!');
    });
  }
}

function initSearchAndFilter() {
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

  if (navTabChat) {
    navTabChat.addEventListener('click', () => {
      const floatingDrawer = document.getElementById('floating-ai-drawer');
      if (floatingDrawer) {
        floatingDrawer.classList.toggle('is-open');
        const input = document.getElementById('floating-chat-input');
        if (input) input.focus();
      }
    });
  }
  if (navTabPubs) navTabPubs.addEventListener('click', () => switchTab('pubs'));
  if (navTabCollections) navTabCollections.addEventListener('click', () => switchTab('collections'));
  if (navTabUsers) navTabUsers.addEventListener('click', () => switchTab('users'));
  if (navTabReported) navTabReported.addEventListener('click', () => switchTab('reported'));
  if (navTabCalls) navTabCalls.addEventListener('click', () => switchTab('calls'));
  if (navTabActivity) navTabActivity.addEventListener('click', () => switchTab('activity'));
  if (navTabUsage) navTabUsage.addEventListener('click', () => switchTab('usage'));
  if (navTabLab) navTabLab.addEventListener('click', () => switchTab('lab'));
  if (navTabTemplates) navTabTemplates.addEventListener('click', () => switchTab('templates'));
  if (navTabAnalytics) navTabAnalytics.addEventListener('click', () => switchTab('analytics'));

  if (detailShareBtn) {
    detailShareBtn.addEventListener('click', () => openShareModal(selectedPubId));
  }

  if (detailToggleTierBtn) {
    detailToggleTierBtn.addEventListener('click', () => togglePublicationTier(selectedPubId));
  }

  // Share Modal copy buttons
  if (closeShareModalBtn) closeShareModalBtn.addEventListener('click', closeShareModal);
  if (btnCopyModalUrl && shareModalUrlInput) {
    btnCopyModalUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(shareModalUrlInput.value);
      showToast('Reader URL copied to clipboard!');
    });
  }
  if (btnCopyModalEmbed && shareModalEmbedInput) {
    btnCopyModalEmbed.addEventListener('click', () => {
      navigator.clipboard.writeText(shareModalEmbedInput.value);
      showToast('iFrame embed code copied!');
    });
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initAuth();
  initSearchAndFilter();
  initWorkspaceChat();
  initCreateModal();
  initProModal();
  renderPublications();
  renderStats();
  renderDetailPane();
  initFirestoreSync();
});
