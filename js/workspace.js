/**
 * FlipPage Studio Interactive Controller (js/workspace.js)
 * Real-time Firebase Firestore Sync, PDF Uploading, IndexedDB Storage,
 * Custom Reader URL generation, live preview synchronization & sharing.
 */
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";
import { savePdfDocument } from "./pdfStorage.js";

// Initialize Firebase with unified session
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
    isPaid: true
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
    isPaid: true
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
    isPaid: false
  }
];

let selectedPubId = 'p1';
let urlFlipbooks = [];

// Real-Time Firestore Sync
function initFirestoreSync() {
  try {
    const pubColRef = collection(db, 'publications');
    onSnapshot(pubColRef, (snap) => {
      if (!snap.empty) {
        const liveList = [];
        snap.forEach(d => {
          liveList.push({ id: d.id, ...d.data() });
        });
        if (liveList.length > 0) {
          publications = liveList;
        }
      }
      populatePublicationSelector();
      updateActivePublicationDisplay();
    }, (err) => {
      console.warn("Firestore publications sync notice:", err?.message || err);
      populatePublicationSelector();
      updateActivePublicationDisplay();
    });
  } catch (err) {
    console.warn("Firestore sync initialization fallback:", err);
    populatePublicationSelector();
    updateActivePublicationDisplay();
  }
}

function populatePublicationSelector() {
  const selector = document.getElementById('preview-pub-selector');
  if (!selector) return;

  const currentVal = selector.value;
  selector.innerHTML = '';

  publications.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `📖 ${p.title} (${p.pages || 20}p)`;
    selector.appendChild(opt);
  });

  urlFlipbooks.forEach(u => {
    const opt = document.createElement('option');
    opt.value = 'url-' + btoa(u.url).slice(0, 10);
    opt.dataset.url = u.url;
    opt.textContent = `🔗 ${u.title}`;
    selector.appendChild(opt);
  });

  if (currentVal && Array.from(selector.options).some(o => o.value === currentVal)) {
    selector.value = currentVal;
  } else if (publications.length > 0) {
    selector.value = publications[0].id;
    selectedPubId = publications[0].id;
  }
}

export function getCustomReaderUrl(pub) {
  if (!pub) return `${window.location.origin}/reader.html`;
  if (pub.url) return `${window.location.origin}/reader.html?url=${encodeURIComponent(pub.url)}&title=${encodeURIComponent(pub.title)}`;
  const slugParam = pub.slug ? `&slug=${encodeURIComponent(pub.slug)}` : '';
  return `${window.location.origin}/reader.html?id=${encodeURIComponent(pub.id)}${slugParam}`;
}

function updateActivePublicationDisplay() {
  const pub = publications.find(p => p.id === selectedPubId) || publications[0];
  if (!pub) return;

  // 1. Left pane details
  const titleInput = document.getElementById('detail-book-title');
  if (titleInput) titleInput.value = pub.title;

  const slugInput = document.getElementById('detail-book-slug');
  if (slugInput) slugInput.value = pub.slug || '';

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

  // 2. Right pane Live Preview stage iframe
  const previewFrame = document.getElementById('preview-reader-frame');
  if (previewFrame) {
    const targetSrc = readerUrl;
    if (!previewFrame.src.includes(encodeURIComponent(pub.id)) && !previewFrame.src.includes(encodeURIComponent(pub.slug || ''))) {
      previewFrame.src = targetSrc;
    }
  }
}

// Selector & Slug Save Events
function initSelectorEvents() {
  const selector = document.getElementById('preview-pub-selector');
  if (selector) {
    selector.addEventListener('change', () => {
      const val = selector.value;
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
      row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:8px; padding:8px 10px; font-size:0.78rem;';
      row.innerHTML = `
        <div style="min-width:0; flex:1; margin-right:8px;">
          <div style="font-weight:700; color:#0F172A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(fb.title)}</div>
          <div style="font-size:0.69rem; color:#64748B;">${fb.pages ? `${fb.pages} pages • ` : ''}${fb.url.length > 35 ? fb.url.slice(0, 35) + '...' : fb.url}</div>
        </div>
        <div style="display:flex; gap:4px;">
          <a href="reader.html?url=${encodeURIComponent(fb.url)}&title=${encodeURIComponent(fb.title)}" target="_blank" class="btn-new-pub" style="padding:4px 8px; font-size:0.70rem;">Open</a>
          <button type="button" class="preview-nav-btn btn-del-url" data-idx="${idx}" style="padding:4px 6px;">🗑️</button>
        </div>
      `;
      listGrid.appendChild(row);
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
        return;
      }

      // Auto-prefix https:// if protocol omitted
      if (!/^https?:\/\//i.test(rawUrl)) {
        rawUrl = rawUrl.startsWith('//') ? 'https:' + rawUrl : 'https://' + rawUrl;
      }

      const inferredTitle = rawUrl.split('/').pop().replace(/\.pdf$/i, '').replace(/[-_]/g, ' ') || 'PDF Flipbook';
      const inferredSlug = inferredTitle.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 30);

      btnFetchUrl.textContent = '⚡ Converting on Backend...';
      btnFetchUrl.disabled = true;
      showToast('🚀 Backend conversion started...', 'info');

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
        const readerUrl = data.readerUrl || `/read/${cleanSlug}`;

        const newPub = {
          id: bookId,
          title: inferredTitle,
          slug: cleanSlug,
          category: 'URL Import',
          pages: 0,
          reads: 0,
          shares: 0,
          avgTime: '0m',
          status: 'PROCESSING',
          planTier: 'paid',
          isPaid: true,
          readerUrl,
          createdAt: new Date().toISOString()
        };

        publications.unshift(newPub);
        selectedPubId = bookId;
        populatePublicationSelector();
        updateActivePublicationDisplay();

        const newFb = { url: rawUrl, title: inferredTitle, slug: cleanSlug, bookId, readerUrl, createdAt: new Date().toISOString() };
        urlFlipbooks.unshift(newFb);
        localStorage.setItem('fp_url_flipbooks', JSON.stringify(urlFlipbooks));
        renderUrlList();
        pdfUrlInput.value = '';

        // Immediately update preview iframe to live reader
        const previewFrame = document.getElementById('preview-reader-frame');
        if (previewFrame) {
          previewFrame.src = `reader.html?slug=${encodeURIComponent(cleanSlug)}`;
        }

        showToast(`✨ Backend converting "${inferredTitle}"! Reader URL: ${readerUrl}`);

        // Poll progress in background to update page count once READY
        (async () => {
          for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const pRes = await fetch(`/api/books/${encodeURIComponent(bookId)}/progress`);
              if (pRes.ok) {
                const pData = await pRes.json();
                if (pData.status === 'READY') {
                  newPub.status = 'live';
                  newPub.pages = pData.pageCount;
                  updateActivePublicationDisplay();
                  showToast(`✅ Converted "${inferredTitle}" (${pData.pageCount} pages)!`);
                  break;
                } else if (pData.status === 'FAILED') {
                  showToast(`❌ Conversion failed: ${pData.errorMessage}`, 'error');
                  break;
                }
              }
            } catch (_) {}
          }
        })();

      } catch(err) {
        console.error('Import PDF URL error:', err);
        showToast(`Failed: ${err.message}`, 'error');
      } finally {
        btnFetchUrl.textContent = 'Convert to Flipbook';
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
  const profileEmailInput = document.getElementById('profile-user-email');
  const profileRoleInput = document.getElementById('profile-user-role');
  const profileBioInput = document.getElementById('profile-user-bio');
  const btnSaveProfile = document.getElementById('btn-save-user-profile');

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
    const displayName = profile.displayName || profile.name || 'Publisher Admin';
    const email = profile.email || 'omethranhasacz@gmail.com';
    const role = profile.role || 'Executive Publisher & Administrator';
    const bio = profile.bio || 'Publishing interactive 3D digital magazines, annual reports and lookbooks.';
    const initial = (displayName || email || 'P').charAt(0).toUpperCase();

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatarEl) avatarEl.textContent = initial;

    if (profileNameInput) profileNameInput.value = displayName;
    if (profileEmailInput) profileEmailInput.value = email;
    if (profileRoleInput) profileRoleInput.value = role;
    if (profileBioInput) profileBioInput.value = bio;

    const brandEl = document.getElementById('breadcrumb-brand-name');
    if (brandEl) brandEl.textContent = profile.brandName || `${displayName}'s Studio`;
  }

  // Check stored local profile first for instantaneous rendering
  try {
    const cachedProfile = localStorage.getItem('fp_user_profile');
    if (cachedProfile) {
      applyProfileToUI(JSON.parse(cachedProfile));
    }
  } catch (_) {}

  // 2. Real Firebase Auth & Firestore synchronization
  onAuthStateChanged(auth, async (user) => {
    let currentProfile = {
      displayName: 'Publisher Admin',
      email: 'omethranhasacz@gmail.com',
      role: 'Executive Publisher & Administrator',
      bio: 'Publishing interactive 3D digital magazines, annual reports and lookbooks.',
      plan: 'PRO',
      isPaid: true
    };

    if (user) {
      currentProfile.uid = user.uid;
      currentProfile.email = user.email || currentProfile.email;
      currentProfile.displayName = user.displayName || (user.email ? user.email.split('@')[0] : currentProfile.displayName);

      // Fetch Firestore user doc
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          currentProfile = { ...currentProfile, ...uData };
        } else {
          // Initialize user doc in Firestore
          await setDoc(userDocRef, {
            uid: user.uid,
            email: currentProfile.email,
            displayName: currentProfile.displayName,
            role: 'user',
            plan: 'PRO',
            isPaid: true,
            createdAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.warn('Firestore user fetch notice:', err);
      }
    }

    applyProfileToUI(currentProfile);
    try {
      localStorage.setItem('fp_user_profile', JSON.stringify(currentProfile));
    } catch (_) {}
  });

  // 3. Save profile button handler
  if (btnSaveProfile) {
    btnSaveProfile.addEventListener('click', async () => {
      const updatedProfile = {
        displayName: profileNameInput?.value.trim() || 'Publisher Admin',
        email: profileEmailInput?.value.trim() || 'omethranhasacz@gmail.com',
        role: profileRoleInput?.value.trim() || 'Executive Publisher & Administrator',
        bio: profileBioInput?.value.trim() || '',
        updatedAt: new Date().toISOString()
      };

      applyProfileToUI(updatedProfile);
      try {
        localStorage.setItem('fp_user_profile', JSON.stringify(updatedProfile));
      } catch (_) {}

      // Save to Firestore if user logged in
      const currentUser = auth.currentUser;
      if (currentUser && db) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, updatedProfile, { merge: true });
        } catch (err) {
          console.warn('Firestore profile update notice:', err);
        }
      }

      showToast('✅ Publisher Profile saved and synchronized!');
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
