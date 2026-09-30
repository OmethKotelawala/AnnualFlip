/**
 * FlipPage Studio Interactive Controller (js/workspace.js)
 * Real-time Firebase Firestore Sync, PDF Uploading, IndexedDB Storage,
 * Custom Reader URL generation, live preview synchronization & sharing.
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";
import { savePdfDocument } from "./pdfStorage.js";

// Initialize Firebase with unified session
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = firebaseConfig && firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app);

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
}

// PDF.js worker setup
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
}

// Toast helper
export function showToast(msg, type = 'success') {
  const t = document.getElementById('ws-toast');
  const m = document.getElementById('ws-toast-msg');
  if (!t || !m) return;
  m.textContent = msg;
  t.style.display = 'flex';
  t.style.background = (type === 'error') ? '#EF4444' : '#0F172A';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.display = 'none'; }, 2600);
}
window.showToast = showToast;

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// In-Memory Publications
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
    likes: 12,
    likedBy: [],
    pdf_url: '/api/books/book-1790682481123-4fq4ex/source.pdf',
    themeColors: '--ws-accent: #2563EB; --canvas-bg: #F8FAFC; --tb-bg: rgba(255, 255, 255, 0.95); --page-bg: #FFFFFF;'
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
    likes: 28,
    likedBy: [],
    pdf_url: 'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf',
    themeColors: '--ws-accent: #0284C7; --canvas-bg: #0C4A6E; --tb-bg: rgba(15, 23, 42, 0.95); --page-bg: #FFFFFF;'
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
    status: 'live',
    planTier: 'free',
    isPaid: false,
    likes: 5,
    likedBy: [],
    pdf_url: 'https://www.w3.org/WAI/WCAG21/wcag21.pdf',
    themeColors: '--ws-accent: #7C3AED; --canvas-bg: #4C1D95; --tb-bg: rgba(255, 255, 255, 0.95); --page-bg: #FFFFFF;'
  }
];

let selectedPubId = 'p1';
let urlFlipbooks = [];
let userLikedPubIds = new Set();
let currentPubFilter = 'all'; // 'all' | 'liked'
let includeUsernameInShare = true;
let enableReaderReactions = true;
let currentUserProfile = null;

// Real-Time Firestore Sync
function initFirestoreSync() {
  try {
    const pubColRef = collection(db, 'publications');
    onSnapshot(pubColRef, (snap) => {
      if (!snap.empty) {
        const liveList = [];
        snap.forEach(d => {
          const data = d.data();
          liveList.push({ id: d.id, ...data, pdf_url: data.pdf_url || data.pdfUrl || '' });
        });
        if (liveList.length > 0) {
          publications = liveList;
        }
      }
      updateLikedCountsAndFilter();
      populatePublicationSelector();
      updateActivePublicationDisplay();
      renderProfileLikedFilesList();
    }, (err) => {
      console.warn("Firestore publications sync notice:", err?.message || err);
      updateLikedCountsAndFilter();
      populatePublicationSelector();
      updateActivePublicationDisplay();
    });
  } catch (err) {
    console.warn("Firestore sync initialization fallback:", err);
    updateLikedCountsAndFilter();
    populatePublicationSelector();
    updateActivePublicationDisplay();
  }
}

function updateLikedCountsAndFilter() {
  const allCountEl = document.getElementById('count-all-pubs');
  const likedCountEl = document.getElementById('count-liked-pubs');
  const profileLikedBadge = document.getElementById('profile-liked-count-badge');

  const totalAll = publications.length + (currentPubFilter !== 'liked' ? urlFlipbooks.length : 0);
  const totalLiked = publications.filter(p => userLikedPubIds.has(p.id)).length;

  if (allCountEl) allCountEl.textContent = totalAll;
  if (likedCountEl) likedCountEl.textContent = totalLiked;
  if (profileLikedBadge) profileLikedBadge.textContent = `${totalLiked} Liked`;
}

function populatePublicationSelector() {
  const selector = document.getElementById('preview-pub-selector');
  if (!selector) return;

  const currentVal = selector.value;
  selector.innerHTML = '';

  let filteredList = publications;
  if (currentPubFilter === 'liked') {
    filteredList = publications.filter(p => userLikedPubIds.has(p.id));
  }

  if (filteredList.length === 0) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = currentPubFilter === 'liked' ? '⚠️ No liked flipbooks found' : 'No publications available';
    selector.appendChild(opt);
    return;
  }

  filteredList.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    const isLiked = userLikedPubIds.has(p.id);
    const likeCount = p.likes || 0;
    opt.textContent = `${isLiked ? '❤️ ' : '📖 '}${p.title} (${p.pages || 20}p)${likeCount > 0 ? ` [${likeCount} likes]` : ''}`;
    selector.appendChild(opt);
  });

  if (currentPubFilter !== 'liked') {
    urlFlipbooks.forEach(u => {
      const opt = document.createElement('option');
      opt.value = 'url-' + btoa(u.url).slice(0, 10);
      opt.dataset.url = u.url;
      opt.textContent = `🔗 ${u.title}`;
      selector.appendChild(opt);
    });
  }

  if (currentVal && Array.from(selector.options).some(o => o.value === currentVal)) {
    selector.value = currentVal;
  } else if (filteredList.length > 0) {
    selector.value = filteredList[0].id;
    selectedPubId = filteredList[0].id;
  }
}

export function getCustomReaderUrl(pub) {
  if (!pub) return `${window.location.origin}/reader.html`;
  
  const rawUsername = currentUserProfile?.username || (currentUserProfile?.email ? currentUserProfile.email.split('@')[0] : 'publisher');
  const cleanUsername = rawUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  let url = `${window.location.origin}/reader.html?id=${encodeURIComponent(pub.id)}`;
  if (pub.slug) url += `&slug=${encodeURIComponent(pub.slug)}`;
  if (includeUsernameInShare && cleanUsername) {
    url += `&user=${encodeURIComponent(cleanUsername)}`;
  }
  if (!enableReaderReactions) {
    url += `&reactions=0`;
  }

  if (pub.url) {
    url = `${window.location.origin}/reader.html?url=${encodeURIComponent(pub.url)}&title=${encodeURIComponent(pub.title)}`;
    if (includeUsernameInShare && cleanUsername) {
      url += `&user=${encodeURIComponent(cleanUsername)}`;
    }
  }

  return url;
}

function updateLikeButtonUI(pub) {
  const btnLike = document.getElementById('btn-toggle-like-pub');
  const likeIcon = btnLike?.querySelector('.like-heart-icon');
  const likeText = document.getElementById('pub-like-text');
  const likeCountEl = document.getElementById('pub-like-count');

  if (!btnLike || !pub) return;

  const isLiked = userLikedPubIds.has(pub.id);
  const likesCount = pub.likes || 0;

  btnLike.classList.toggle('is-liked', isLiked);
  if (likeIcon) likeIcon.textContent = isLiked ? '❤️' : '🤍';
  if (likeText) likeText.textContent = isLiked ? 'Liked' : 'Like';
  if (likeCountEl) likeCountEl.textContent = likesCount;
}

function updateActivePublicationDisplay() {
  const pub = publications.find(p => p.id === selectedPubId) || publications[0];
  if (!pub) return;

  // 1. Left pane details
  const titleInput = document.getElementById('detail-book-title');
  if (titleInput) titleInput.value = pub.title;

  const slugInput = document.getElementById('detail-book-slug');
  if (slugInput) slugInput.value = pub.slug || '';

  // PDF URI (pdf_url)
  const pdfUriInput = document.getElementById('detail-pdf-uri');
  const pdfSourceUri = pub.pdf_url || pub.pdfUrl || (pub.id ? `/api/books/${pub.id}/source.pdf` : '');
  if (pdfUriInput) pdfUriInput.value = pdfSourceUri;

  const readerUrl = getCustomReaderUrl(pub);
  const urlInput = document.getElementById('detail-spec-url');
  if (urlInput) urlInput.value = readerUrl;

  const shareUrlDisplay = document.getElementById('share-url-display');
  if (shareUrlDisplay) shareUrlDisplay.value = readerUrl;

  const embedInput = document.getElementById('share-embed-code');
  if (embedInput) embedInput.value = `<iframe src="${readerUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;

  const specPages = document.getElementById('detail-spec-pages');
  if (specPages) specPages.textContent = `${pub.pages || 20} Pages`;

  const specStatus = document.getElementById('detail-spec-status');
  if (specStatus) specStatus.textContent = pub.status === 'live' ? '● Live' : '○ Draft';

  const specReads = document.getElementById('detail-spec-reads');
  if (specReads) specReads.textContent = (pub.reads || 0).toLocaleString();

  const specTime = document.getElementById('detail-spec-time');
  if (specTime) specTime.textContent = pub.avgTime || '3m 15s';

  const detailOpenBtn = document.getElementById('btn-detail-open-reader');
  if (detailOpenBtn) detailOpenBtn.href = readerUrl;

  // Update like button for active publication
  updateLikeButtonUI(pub);

  // Theme Colors string box
  const themeBox = document.getElementById('theme-colors-string-box');
  if (themeBox) {
    const currentTheme = pub.themeColors || '--ws-accent: #2563EB; --canvas-bg: #F8FAFC; --tb-bg: rgba(255, 255, 255, 0.95); --page-bg: #FFFFFF;';
    themeBox.textContent = currentTheme;
  }

  // Update username preview tag in Share panel
  const shareUserTag = document.getElementById('share-username-preview-tag');
  if (shareUserTag) {
    const rawUsername = currentUserProfile?.username || (currentUserProfile?.email ? currentUserProfile.email.split('@')[0] : 'username');
    shareUserTag.textContent = rawUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  }

  // 2. Right pane Live Preview stage iframe
  const previewFrame = document.getElementById('preview-reader-frame');
  if (previewFrame) {
    const targetSrc = readerUrl;
    if (previewFrame.dataset.currentPubId !== pub.id || !previewFrame.src) {
      previewFrame.dataset.currentPubId = pub.id;
      previewFrame.src = targetSrc;
    }
  }
}

// Like / Dislike Toggle Handler
async function toggleLikePublication(pubId) {
  const pub = publications.find(p => p.id === pubId);
  if (!pub) return;

  const user = auth.currentUser;
  const isCurrentlyLiked = userLikedPubIds.has(pubId);

  if (isCurrentlyLiked) {
    userLikedPubIds.delete(pubId);
    pub.likes = Math.max(0, (pub.likes || 1) - 1);
    showToast(`Removed "${pub.title}" from Liked files`, 'info');
  } else {
    userLikedPubIds.add(pubId);
    pub.likes = (pub.likes || 0) + 1;
    showToast(`❤️ Liked "${pub.title}"! Saved to favorites.`);
  }

  // Update like button UI, counters, selector, and Profile liked files list
  updateLikeButtonUI(pub);
  updateLikedCountsAndFilter();
  populatePublicationSelector();
  renderProfileLikedFilesList();

  // Save to Firestore
  if (user && db) {
    try {
      // 1. Update user profile's likedPublications array
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        likedPublications: Array.from(userLikedPubIds)
      }).catch(() => {});

      // 2. Update publication's likes count and likedBy list
      const pubDocRef = doc(db, 'publications', pubId);
      const likedByArray = Array.isArray(pub.likedBy) ? [...pub.likedBy] : [];
      if (!isCurrentlyLiked && !likedByArray.includes(user.uid)) {
        likedByArray.push(user.uid);
      } else if (isCurrentlyLiked) {
        const idx = likedByArray.indexOf(user.uid);
        if (idx !== -1) likedByArray.splice(idx, 1);
      }
      await updateDoc(pubDocRef, {
        likes: pub.likes,
        likedBy: likedByArray
      }).catch(() => {});
    } catch (err) {
      handleFirestoreError(err, 'update', `users/${user.uid}`);
    }
  }
}

// Render real liked files list in Profile tab
function renderProfileLikedFilesList() {
  const container = document.getElementById('profile-liked-files-list');
  if (!container) return;

  const likedPubs = publications.filter(p => userLikedPubIds.has(p.id));

  if (likedPubs.length === 0) {
    container.innerHTML = `<div style="font-size:0.78rem; color:#94A3B8; text-align:center; padding:12px;">No liked flipbooks yet. Click the ❤️ icon on any publication to save it here!</div>`;
    return;
  }

  container.innerHTML = '';
  likedPubs.forEach(p => {
    const item = document.createElement('div');
    item.className = 'liked-file-item';
    item.innerHTML = `
      <div style="min-width:0; flex:1; margin-right:8px;">
        <strong style="display:block; font-size:0.82rem; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">❤️ ${escapeHtml(p.title)}</strong>
        <span style="font-size:0.70rem; color:#64748B;">${p.pages || 20} pages • ${p.likes || 1} likes • ${p.category || 'Flipbook'}</span>
      </div>
      <div style="display:flex; gap:6px; flex-shrink:0;">
        <button type="button" class="preview-nav-btn btn-open-liked-pub" data-id="${p.id}" style="padding:4px 8px; font-size:0.72rem;">Preview</button>
        <a href="${getCustomReaderUrl(p)}" target="_blank" class="btn-new-pub" style="padding:4px 8px; font-size:0.72rem; text-decoration:none;">Reader ↗</a>
      </div>
    `;

    item.querySelector('.btn-open-liked-pub')?.addEventListener('click', () => {
      selectedPubId = p.id;
      if (typeof window.switchTab === 'function') window.switchTab('nav-tab-preview');
      populatePublicationSelector();
      updateActivePublicationDisplay();
    });

    container.appendChild(item);
  });
}

// Selector & Slug Save Events
function initSelectorEvents() {
  const selector = document.getElementById('preview-pub-selector');
  if (selector) {
    selector.addEventListener('change', () => {
      const val = selector.value;
      if (!val) return;
      if (val.startsWith('url-')) {
        const selectedOpt = selector.options[selector.selectedIndex];
        const rawUrl = selectedOpt?.dataset?.url;
        if (rawUrl) {
          const previewFrame = document.getElementById('preview-reader-frame');
          if (previewFrame) previewFrame.src = `reader.html?url=${encodeURIComponent(rawUrl)}`;
        }
      } else {
        selectedPubId = val;
        updateActivePublicationDisplay();
      }
    });
  }

  // Publication Filter Buttons: All vs Liked Files
  const btnFilterAll = document.getElementById('filter-btn-all');
  const btnFilterLiked = document.getElementById('filter-btn-liked');

  if (btnFilterAll) {
    btnFilterAll.addEventListener('click', () => {
      currentPubFilter = 'all';
      btnFilterAll.classList.add('is-active');
      btnFilterLiked?.classList.remove('is-active-liked', 'is-active');
      populatePublicationSelector();
      updateActivePublicationDisplay();
    });
  }

  if (btnFilterLiked) {
    btnFilterLiked.addEventListener('click', () => {
      currentPubFilter = 'liked';
      btnFilterLiked.classList.add('is-active-liked');
      btnFilterAll?.classList.remove('is-active');
      populatePublicationSelector();
      updateActivePublicationDisplay();
    });
  }

  // Toggle Like / Favorite Button on active publication
  const btnToggleLike = document.getElementById('btn-toggle-like-pub');
  if (btnToggleLike) {
    btnToggleLike.addEventListener('click', () => {
      if (selectedPubId) {
        toggleLikePublication(selectedPubId);
      }
    });
  }

  // Save Custom Slug
  const btnSaveSlug = document.getElementById('btn-save-custom-slug');
  const slugInput = document.getElementById('detail-book-slug');
  if (btnSaveSlug && slugInput) {
    btnSaveSlug.addEventListener('click', async () => {
      const pub = publications.find(p => p.id === selectedPubId);
      if (!pub) return;
      const cleanSlug = slugInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      pub.slug = cleanSlug;
      slugInput.value = cleanSlug;
      updateActivePublicationDisplay();
      showToast(`✨ Saved Custom Reader Slug: "${cleanSlug}"`);

      try {
        const docRef = doc(db, 'publications', selectedPubId);
        await updateDoc(docRef, { slug: cleanSlug });
      } catch (_) {}
    });
  }

  // Copy PDF URI button
  const btnCopyPdfUri = document.getElementById('btn-copy-pdf-uri');
  if (btnCopyPdfUri) {
    btnCopyPdfUri.addEventListener('click', () => {
      const uri = document.getElementById('detail-pdf-uri')?.value;
      if (uri) {
        navigator.clipboard.writeText(uri);
        showToast('PDF URI (pdf_url) copied to clipboard!');
      }
    });
  }

  // Copy Theme Colors String button
  const btnCopyThemeString = document.getElementById('btn-copy-theme-string');
  if (btnCopyThemeString) {
    btnCopyThemeString.addEventListener('click', () => {
      const str = document.getElementById('theme-colors-string-box')?.textContent;
      if (str) {
        navigator.clipboard.writeText(str);
        showToast('Theme colors CSS variables string copied!');
      }
    });
  }

  // Share Panel: Username URL Toggle
  const toggleIncludeUser = document.getElementById('toggle-include-username');
  if (toggleIncludeUser) {
    toggleIncludeUser.addEventListener('click', () => {
      includeUsernameInShare = toggleIncludeUser.classList.contains('on');
      updateActivePublicationDisplay();
      showToast(includeUsernameInShare ? 'Branded Username included in share link' : 'Standard clean link enabled');
    });
  }

  // Share Panel: Reader Reaction Bar Toggle
  const toggleReactions = document.getElementById('toggle-reader-reactions');
  if (toggleReactions) {
    toggleReactions.addEventListener('click', () => {
      enableReaderReactions = toggleReactions.classList.contains('on');
      updateActivePublicationDisplay();
      showToast(enableReaderReactions ? 'Reader Likes & Reaction Bar enabled' : 'Reader Reaction Bar hidden');
    });
  }

  // Listen to live theme customization changes to save themeColors in publication doc
  window.addEventListener('workspace:theme-changed', async (e) => {
    const detail = e.detail;
    if (detail && detail.themeColors && selectedPubId) {
      const pub = publications.find(p => p.id === selectedPubId);
      if (pub) {
        pub.themeColors = detail.themeColors;
        try {
          const docRef = doc(db, 'publications', selectedPubId);
          await updateDoc(docRef, { themeColors: detail.themeColors }).catch(() => {});
        } catch (_) {}
      }
    }
  });

  // Copy URL buttons
  const btnCopyDetail = document.getElementById('btn-copy-detail-url');
  if (btnCopyDetail) {
    btnCopyDetail.addEventListener('click', () => {
      const url = document.getElementById('detail-spec-url')?.value;
      if (url) {
        navigator.clipboard.writeText(url);
        showToast('Custom Reader URL copied to clipboard!');
      }
    });
  }

  const btnCopyShare = document.getElementById('btn-copy-share-url');
  if (btnCopyShare) {
    btnCopyShare.addEventListener('click', () => {
      const url = document.getElementById('share-url-display')?.value;
      if (url) {
        navigator.clipboard.writeText(url);
        showToast('Custom share link copied!');
      }
    });
  }

  const btnCopyEmbed = document.getElementById('btn-copy-embed-code');
  if (btnCopyEmbed) {
    btnCopyEmbed.addEventListener('click', () => {
      const code = document.getElementById('share-embed-code')?.value;
      if (code) {
        navigator.clipboard.writeText(code);
        showToast('iFrame embed code copied!');
      }
    });
  }

  // Share button in actions card -> switches to Share tab
  const btnDetailShare = document.getElementById('btn-detail-share');
  if (btnDetailShare) {
    btnDetailShare.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') {
        window.switchTab('nav-tab-share-social');
      }
    });
  }

  // Social sharing links
  function getShareUrl() {
    return document.getElementById('share-url-display')?.value || window.location.href;
  }
  document.getElementById('social-wa')?.addEventListener('click', () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('Check out this 3D Flipbook: ' + getShareUrl())}`, '_blank');
  });
  document.getElementById('social-tw')?.addEventListener('click', () => {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(getShareUrl())}&text=${encodeURIComponent('Check out this interactive 3D Flipbook on FlipPage!')}`, '_blank');
  });
  document.getElementById('social-li')?.addEventListener('click', () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`, '_blank');
  });
  document.getElementById('social-email')?.addEventListener('click', () => {
    window.location.href = `mailto:?subject=Interactive Flipbook&body=${encodeURIComponent(getShareUrl())}`;
  });

  // Toggle tier button
  const btnToggleTier = document.getElementById('btn-quick-toggle-tier');
  if (btnToggleTier) {
    btnToggleTier.addEventListener('click', async () => {
      const pub = publications.find(p => p.id === selectedPubId);
      if (!pub) return;
      pub.isPaid = !pub.isPaid;
      pub.planTier = pub.isPaid ? 'paid' : 'free';
      showToast(pub.isPaid ? '👑 Upgraded publication to Pro Tier!' : 'Switched publication to Free Tier');
      try {
        const docRef = doc(db, 'publications', selectedPubId);
        await updateDoc(docRef, { planTier: pub.planTier, isPaid: pub.isPaid });
      } catch (_) {}
    });
  }
}

// ============ HIGH PERFORMANCE PDF UPLOAD PROCESSING ============
export async function processAndUploadPdfFile(file, customTitle = '', customCategory = 'Digital Flipbook', customSlug = '') {
  if (!file) return null;
  
  showToast('📄 Parsing & Uploading PDF...', 'info');

  try {
    const arrayBuffer = await file.arrayBuffer();
    let numPages = 20;

    // Use PDF.js to extract exact page count
    if (typeof pdfjsLib !== "undefined") {
      try {
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        numPages = pdf.numPages;
      } catch (e) {
        console.warn("PDF.js count warning:", e);
      }
    }

    const title = customTitle.trim() || file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') || 'My PDF Flipbook';
    const slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-') || title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30);
    const newId = `pub-${Date.now()}`;

    // 1. Save binary in IndexedDB
    await savePdfDocument(newId, arrayBuffer, { title, pages: numPages, slug });

    // 2. Create publication metadata
    const newPub = {
      id: newId,
      title,
      slug,
      category: customCategory,
      pages: numPages,
      reads: 0,
      shares: 0,
      avgTime: '0m',
      status: 'live',
      planTier: 'paid',
      isPaid: true,
      hasStoredPdf: true,
      createdAt: new Date().toISOString()
    };

    // 3. Add to local publications state
    publications.unshift(newPub);
    selectedPubId = newId;
    populatePublicationSelector();
    updateActivePublicationDisplay();

    // 4. Update preview reader frame to load newly uploaded PDF
    const previewFrame = document.getElementById('preview-reader-frame');
    if (previewFrame) {
      previewFrame.src = `reader.html?id=${encodeURIComponent(newId)}`;
    }

    // 5. Sync metadata to Firestore
    try {
      const docRef = doc(db, 'publications', newId);
      await setDoc(docRef, newPub);
    } catch (_) {}

    showToast(`✅ Uploaded "${title}" (${numPages} pages)! Custom Reader URL ready.`);
    return newPub;
  } catch (err) {
    console.error("PDF upload error:", err);
    showToast('Failed to process PDF file. Please try another.', 'error');
    return null;
  }
}

// Quick PDF Drag and Drop in Panel-Preview
function initQuickDropzone() {
  const dropzone = document.getElementById('quick-pdf-dropzone');
  const fileInput = document.getElementById('quick-pdf-file-input');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    if (fileInput.files && fileInput.files[0]) {
      await processAndUploadPdfFile(fileInput.files[0]);
      fileInput.value = '';
    }
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#2563EB';
    dropzone.style.background = '#EFF6FF';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#CBD5E1';
    dropzone.style.background = '#F8FAFC';
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#CBD5E1';
    dropzone.style.background = '#F8FAFC';
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processAndUploadPdfFile(e.dataTransfer.files[0]);
    }
  });
}

// URL Flipbook conversion
function initUrlImports() {
  const pdfUrlInput = document.getElementById('pdf-url-input');
  const btnFetchUrl = document.getElementById('btn-fetch-pdf-url');
  const listGrid = document.getElementById('url-flipbooks-grid');

  try {
    urlFlipbooks = JSON.parse(localStorage.getItem('fp_url_flipbooks') || '[]');
  } catch(e) {
    urlFlipbooks = [];
  }

  function renderUrlList() {
    if (!listGrid) return;
    if (urlFlipbooks.length === 0) {
      listGrid.innerHTML = `<div style="font-size:0.75rem; color:#94A3B8; text-align:center; padding:12px;">No URL flipbooks yet. Paste a PDF link above.</div>`;
      return;
    }
    listGrid.innerHTML = '';
    urlFlipbooks.forEach((fb, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:8px 10px; font-size:0.78rem; gap:6px;';
      const cleanSlug = fb.slug || (fb.bookId ? fb.bookId : '');
      const readerLink = fb.readerUrl || (cleanSlug ? `reader.html?slug=${encodeURIComponent(cleanSlug)}` : `reader.html?url=${encodeURIComponent(fb.url)}`);

      row.innerHTML = `
        <div style="min-width:0; flex:1; margin-right:8px;">
          <div style="font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(fb.title || 'Digital Flipbook')}</div>
          <div style="font-size:0.69rem; color:#64748B;">${fb.pages ? `${fb.pages} pages • ` : ''}${fb.url.length > 35 ? fb.url.slice(0, 35) + '...' : fb.url}</div>
        </div>
        <div style="display:flex; gap:4px; flex-shrink:0;">
          <button type="button" class="btn-new-pub btn-load-url-preview" data-idx="${idx}" style="padding:4px 9px; font-size:0.70rem;">Preview</button>
          <a href="${readerLink}" target="_blank" class="preview-nav-btn" style="padding:4px 8px; font-size:0.70rem; text-decoration:none; display:inline-flex; align-items:center;">Open ↗</a>
          <button type="button" class="preview-nav-btn btn-del-url" data-idx="${idx}" style="padding:4px 6px;">🗑️</button>
        </div>
      `;
      listGrid.appendChild(row);
    });

    listGrid.querySelectorAll('.btn-load-url-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx, 10);
        const item = urlFlipbooks[i];
        if (item) {
          if (item.bookId) {
            selectedPubId = item.bookId;
            populatePublicationSelector();
            updateActivePublicationDisplay();
          }
          const previewFrame = document.getElementById('preview-reader-frame');
          if (previewFrame) {
            const urlToLoad = item.slug ? `reader.html?slug=${encodeURIComponent(item.slug)}&t=${Date.now()}` : `reader.html?url=${encodeURIComponent(item.url)}`;
            previewFrame.src = urlToLoad;
          }
          showToast(`📖 Loaded "${item.title}" into live preview!`);
        }
      });
    });

    listGrid.querySelectorAll('.btn-del-url').forEach(btn => {
      btn.addEventListener('click', () => {
        const i = parseInt(btn.dataset.idx, 10);
        urlFlipbooks.splice(i, 1);
        localStorage.setItem('fp_url_flipbooks', JSON.stringify(urlFlipbooks));
        renderUrlList();
        populatePublicationSelector();
        showToast('URL flipbook removed');
      });
    });
  }

  renderUrlList();

  if (btnFetchUrl && pdfUrlInput) {
    btnFetchUrl.addEventListener('click', async () => {
      let rawUrl = pdfUrlInput.value.trim().replace(/^['"]+|['"]+$/g, '');
      if (!rawUrl) {
        showToast('Please enter a valid PDF URL', 'error');
        pdfUrlInput.focus();
        return;
      }

      // Auto-prefix https:// if protocol omitted
      if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = rawUrl.startsWith('//') ? 'https:' + rawUrl : 'https://' + rawUrl;
      }

      const inferredTitle = rawUrl.split('/').pop().replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') || 'PDF Flipbook';
      const inferredSlug = inferredTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30) || `book-${Date.now().toString().slice(-6)}`;

      btnFetchUrl.innerHTML = `<span class="spinner-icon">⚡</span> <span>Converting &amp; Loading PDF...</span>`;
      btnFetchUrl.disabled = true;
      showToast('🚀 Downloading & Converting PDF into 3D Flipbook...', 'info');

      try {
        const response = await fetch('/api/import-pdf-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfUrl: rawUrl,
            title: inferredTitle,
            slug: inferredSlug
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Server conversion failed');
        }

        const bookId = data.bookId;
        const cleanSlug = data.slug || inferredSlug;
        const pageCount = data.pageCount || 1;
        const readerUrl = data.readerUrl || `/read/${cleanSlug}`;

        const newPub = {
          id: bookId,
          title: data.title || inferredTitle,
          slug: cleanSlug,
          category: 'URL Import',
          pages: pageCount,
          reads: 0,
          shares: 0,
          avgTime: '0m',
          status: 'live',
          planTier: 'paid',
          isPaid: true,
          pdfUrl: data.pdfUrl || `/api/books/${bookId}/source.pdf`,
          readerUrl,
          createdAt: new Date().toISOString()
        };

        // Add to publications list
        publications.unshift(newPub);
        selectedPubId = bookId;
        populatePublicationSelector();
        updateActivePublicationDisplay();

        // Save URL flipbook item
        const newFb = { 
          url: rawUrl, 
          title: data.title || inferredTitle, 
          slug: cleanSlug, 
          bookId, 
          pages: pageCount,
          readerUrl, 
          createdAt: new Date().toISOString() 
        };
        urlFlipbooks.unshift(newFb);
        localStorage.setItem('fp_url_flipbooks', JSON.stringify(urlFlipbooks));
        renderUrlList();
        pdfUrlInput.value = '';

        // Immediately update preview iframe to live reader
        const previewFrame = document.getElementById('preview-reader-frame');
        if (previewFrame) {
          previewFrame.src = `reader.html?slug=${encodeURIComponent(cleanSlug)}&t=${Date.now()}`;
        }

        // Sync metadata to Firestore
        try {
          const docRef = doc(db, 'publications', bookId);
          await setDoc(docRef, newPub);
        } catch (_) {}

        showToast(`✅ Converted & Loaded "${inferredTitle}" (${pageCount} pages)!`);
      } catch(err) {
        console.error('Import PDF URL error:', err);
        showToast(`Failed: ${err.message}`, 'error');
      } finally {
        btnFetchUrl.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="btn-convert-icon" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          <span id="btn-fetch-pdf-url-text">Convert &amp; Render Flipbook</span>
        `;
        btnFetchUrl.disabled = false;
      }
    });
  }
}

// Create New Publication Form Modal
function initCreateModalForm() {
  const form = document.getElementById('create-pub-form');
  const modal = document.getElementById('upload-modal');
  const titleInput = document.getElementById('pub-input-title');
  const slugInput = document.getElementById('pub-input-slug');
  const catInput = document.getElementById('pub-input-category');
  const fileInput = document.getElementById('pdf-file-input');
  const fileChosenText = document.getElementById('modal-file-chosen-name');

  if (fileInput && fileChosenText) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        fileChosenText.textContent = `Selected: ${fileInput.files[0].name}`;
        if (!titleInput.value) {
          titleInput.value = fileInput.files[0].name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
        }
      }
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = titleInput.value.trim();
      const slug = slugInput ? slugInput.value.trim() : '';
      const category = catInput.value;
      const file = fileInput?.files?.[0];

      if (!title) return;

      if (modal) modal.hidden = true;

      if (file) {
        await processAndUploadPdfFile(file, title, category, slug);
      } else {
        const newId = `pub-${Date.now()}`;
        const newPub = {
          id: newId,
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30),
          category,
          pages: 24,
          reads: 0,
          shares: 0,
          avgTime: '0m',
          status: 'live',
          planTier: 'paid',
          isPaid: true,
          createdAt: new Date().toISOString()
        };

        publications.unshift(newPub);
        selectedPubId = newId;
        populatePublicationSelector();
        updateActivePublicationDisplay();
        showToast(`✨ Created 3D Flipbook "${title}"!`);

        try {
          const docRef = doc(db, 'publications', newId);
          await setDoc(docRef, newPub);
        } catch(_) {}
      }

      form.reset();
      if (fileChosenText) fileChosenText.textContent = 'Click or Drag PDF file here';
    });
  }
}

// ============ USER AUTH & PROFILE SYNCHRONIZATION ============
function initAuth() {
  const nameEl = document.getElementById('sidebar-user-name');
  const emailEl = document.getElementById('sidebar-user-email');
  const avatarEl = document.getElementById('sidebar-avatar-initial');
  const userCardBtn = document.getElementById('sidebar-user-card');

  const profileNameInput = document.getElementById('profile-user-display-name');
  const profileUsernameInput = document.getElementById('profile-user-username');
  const profileEmailInput = document.getElementById('profile-user-email');
  const profileCompanyInput = document.getElementById('profile-user-company');
  const profileRoleInput = document.getElementById('profile-user-role');
  const profileBioInput = document.getElementById('profile-user-bio');
  const btnSaveProfile = document.getElementById('btn-save-user-profile');
  const btnSignOut = document.getElementById('btn-workspace-signout');

  // Sanitize username without spaces on input
  if (profileUsernameInput) {
    profileUsernameInput.addEventListener('input', () => {
      const clean = profileUsernameInput.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
      profileUsernameInput.value = clean;
      if (currentUserProfile) {
        currentUserProfile.username = clean;
        updateActivePublicationDisplay();
      }
    });
  }

  // 1. Make sidebar user card clickable -> opens Profile Tab
  if (userCardBtn) {
    userCardBtn.addEventListener('click', () => {
      if (typeof window.switchTab === 'function') {
        window.switchTab('nav-tab-profile');
        showToast('👤 Opened Publisher Profile settings');
      }
    });
  }

  // Helper: Apply profile data to UI
  function applyProfileToUI(profile) {
    currentUserProfile = profile;
    const displayName = profile.displayName || profile.name || (profile.email ? profile.email.split('@')[0] : 'Member');
    const username = profile.username || (profile.email ? profile.email.split('@')[0] : 'user');
    const email = profile.email || '';
    const company = profile.companyName || profile.brandName || `${displayName}'s Studio`;
    const role = profile.role === 'admin' ? 'Workspace Administrator' : (profile.role || 'Executive Publisher');
    const bio = profile.bio || 'Publishing interactive 3D digital magazines, annual reports and lookbooks.';
    const initial = (displayName || email || 'U').charAt(0).toUpperCase();

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) {
      if (profile.photoURL) {
        avatarEl.innerHTML = `<img src="${profile.photoURL}" alt="${escapeHtml(displayName)}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.parentElement.textContent='${initial}';">`;
      } else {
        avatarEl.textContent = initial;
      }
    }

    if (profileNameInput) profileNameInput.value = displayName;
    if (profileUsernameInput) profileUsernameInput.value = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (profileEmailInput) profileEmailInput.value = email;
    if (profileCompanyInput) profileCompanyInput.value = profile.companyName || '';
    if (profileRoleInput) profileRoleInput.value = role;
    if (profileBioInput) profileBioInput.value = bio;

    const brandEl = document.getElementById('breadcrumb-brand-name');
    if (brandEl) brandEl.textContent = company;

    // Refresh like counts and profile liked files list
    updateLikedCountsAndFilter();
    renderProfileLikedFilesList();
  }

  // Check stored local profile first for instantaneous rendering
  try {
    const cachedProfile = localStorage.getItem('fp_user_profile');
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      if (Array.isArray(parsed.likedPublications)) {
        userLikedPubIds = new Set(parsed.likedPublications);
      }
      applyProfileToUI(parsed);
    }
  } catch (_) {}

  // 2. Real Firebase Auth & Firestore synchronization — REQUIRES ALL USERS TO BE SIGNED IN
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // User is NOT signed in -> Redirect to account.html to create an account or sign in
      console.warn('[FlipPage Workspace] Unauthenticated access — redirecting to account.html');
      try { localStorage.removeItem('fp_user_profile'); } catch (_) {}
      window.location.replace('account.html?auth=required');
      return;
    }

    const defaultUsername = (user.email ? user.email.split('@')[0] : 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '');

    let currentProfile = {
      uid: user.uid,
      displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Member'),
      username: defaultUsername,
      email: user.email || '',
      photoURL: user.photoURL || '',
      role: 'Executive Publisher',
      companyName: '',
      bio: 'Publishing interactive 3D digital magazines, annual reports and lookbooks.',
      plan: 'PRO',
      isPaid: true,
      likedPublications: []
    };

    // Fetch Firestore user document
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists()) {
        const uData = userSnap.data();
        // If company is not configured yet, direct them to account.html onboarding step
        if (!uData.companyName && !uData.brandName) {
          window.location.replace('account.html?setup=required');
          return;
        }

        if (Array.isArray(uData.likedPublications)) {
          userLikedPubIds = new Set(uData.likedPublications);
        }

        currentProfile = { ...currentProfile, ...uData };
      } else {
        // User doc not present in Firestore -> Redirect to account.html to complete setup
        window.location.replace('account.html?setup=required');
        return;
      }
    } catch (err) {
      handleFirestoreError(err, 'get', `users/${user.uid}`);
    }

    applyProfileToUI(currentProfile);
    populatePublicationSelector();
    updateActivePublicationDisplay();

    try {
      localStorage.setItem('fp_user_profile', JSON.stringify(currentProfile));
    } catch (_) {}
  });

  // 3. Save profile button handler
  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        window.location.href = 'account.html?auth=required';
        return;
      }

      const updatedDisplayName = profileNameInput?.value.trim() || currentUser.displayName || 'Member';
      const rawUser = profileUsernameInput?.value.trim() || (currentUser.email ? currentUser.email.split('@')[0] : 'user');
      const cleanUsername = rawUser.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');
      const updatedCompany = profileCompanyInput?.value.trim() || '';
      const updatedRole = profileRoleInput?.value.trim() || 'Executive Publisher';
      const updatedBio = profileBioInput?.value.trim() || '';

      const updatedPayload = {
        displayName: updatedDisplayName,
        username: cleanUsername,
        companyName: updatedCompany,
        brandName: updatedCompany,
        role: updatedRole,
        bio: updatedBio,
        likedPublications: Array.from(userLikedPubIds),
        updatedAt: new Date().toISOString()
      };

      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, updatedPayload, { merge: true });

        const cached = JSON.parse(localStorage.getItem('fp_user_profile') || '{}');
        const merged = { ...cached, ...updatedPayload };
        applyProfileToUI(merged);
        updateActivePublicationDisplay();
        localStorage.setItem('fp_user_profile', JSON.stringify(merged));

        showToast('✅ Publisher Profile & Username saved and synchronized to Firestore!');
      } catch (err) {
        handleFirestoreError(err, 'write', `users/${currentUser.uid}`);
        showToast('Failed to save profile changes.', 'error');
      }
    });
  }

  // 4. Sign Out & Reconnect Handler
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      try {
        localStorage.removeItem('fp_user_profile');
        await signOut(auth);
        showToast('Signed out. Redirecting to sign in...');
        setTimeout(() => {
          window.location.href = 'account.html';
        }, 300);
      } catch (err) {
        console.error('Sign out error:', err);
        window.location.href = 'account.html';
      }
    });
  }
}

// Initialize studio on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initFirestoreSync();
  initSelectorEvents();
  initQuickDropzone();
  initUrlImports();
  initCreateModalForm();
  initAuth();
});
