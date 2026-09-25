/**
 * FlipPage Digital 3D Flipbook Reader Controller
 * Supports realistic 3D page flip physics, Zoom (1x to 4x), Pan mode,
 * Free and Paid (👑 Yellow Crown) tier rendering, sharing, and Firestore sync.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  increment 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Load Firebase Config
let app = null;
let db = null;

try {
  const firebaseConfig = {
    projectId: "gen-lang-client-0435835472",
    appId: "1:772093074138:web:42bda395d4aed6154023e3",
    apiKey: "AIzaSyCf6Fp-qy8fkkDGOGKiouF1n64tgSNfAzY",
    authDomain: "gen-lang-client-0435835472.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-annualflip-d5e05e1e-4c28-4cf6-b18c-1e967bd5cdc9",
    storageBucket: "gen-lang-client-0435835472.firebasestorage.app",
    messagingSenderId: "772093074138"
  };
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn("Firebase reader init fallback:", e);
}

// Global Config
if (typeof pdfjsLib !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
}

let currentBookData = {
  id: 'p1',
  title: 'Annual Sustainability Report 2026',
  pages: 28,
  planTier: 'paid', // 'free' | 'paid'
  isPaid: true,
  pdfUrl: '',
  pdfData: null,
  spreads: []
};

// Built-in Sample Flipbooks
const DEFAULT_PUBLICATIONS = {
  'p1': {
    id: 'p1',
    title: 'Annual Sustainability Report 2026',
    pages: 28,
    planTier: 'paid',
    isPaid: true,
    tag: { label: 'Live • 14d Trial', type: 'live' },
    thumbBg: '#BBF7D0',
    thumbColor: '#166534',
    thumbEmoji: '📖',
    spreads: [
      { left: 1, title: 'Annual Sustainability Report 2026', subtitle: 'Leading Environmental, Social & Governance Progress', type: 'cover', bg: '#064E3B', color: '#FFFFFF' },
      { left: 2, right: 3, title: 'Executive Message & 2026 Highlights', graphic: '📊 Key Financial & Carbon Offset Metrics', type: 'inner' },
      { left: 4, right: 5, title: 'Clean Energy & Net Zero Roadmap', graphic: '🌱 82% Renewable Transition by Q4', type: 'inner' },
      { left: 6, right: 7, title: 'Global Diversity, Equity & Governance', graphic: '🤝 Global Team & Community Engagement', type: 'inner' },
      { left: 8, right: 9, title: 'Sustainable Supply Chain Operations', graphic: '📦 100% Recyclable Packaging Milestone', type: 'inner' },
      { left: 10, right: 11, title: 'Audited Impact Statements & Closing', graphic: '📋 Verified Third-Party ESG Audit', type: 'back' }
    ]
  },
  'p2': {
    id: 'p2',
    title: 'Spring Lookbook & Product Catalog',
    pages: 44,
    planTier: 'paid',
    isPaid: true,
    tag: { label: 'Live • Featured', type: 'live' },
    thumbBg: '#E0E7FF',
    thumbColor: '#3730A3',
    thumbEmoji: '👗',
    spreads: [
      { left: 1, title: 'Spring Lookbook 2026', subtitle: 'Modern Editorial & Apparel Collection', type: 'cover', bg: '#312E81', color: '#FFFFFF' },
      { left: 2, right: 3, title: 'Linen & Silk Editorial Showcase', graphic: '✨ High-Resolution Vector Fashion Spread', type: 'inner' },
      { left: 4, right: 5, title: 'Color Palette & Seasonal Accents', graphic: '🎨 Spring Botanical Palette Gallery', type: 'inner' }
    ]
  },
  'p3': {
    id: 'p3',
    title: 'Brand Architecture & Design System',
    pages: 18,
    planTier: 'free',
    isPaid: false,
    tag: { label: 'Free Tier', type: 'free' },
    thumbBg: '#F3E8FF',
    thumbColor: '#6B21A8',
    thumbEmoji: '🎨',
    spreads: [
      { left: 1, title: 'Brand Architecture & Design System', subtitle: 'Core Guidelines & Typography Standards', type: 'cover', bg: '#581C87', color: '#FFFFFF' },
      { left: 2, right: 3, title: 'Typography Hierarchy & Color Tokens', graphic: '📐 8pt Baseline Grid & Harmony Scale', type: 'inner' }
    ]
  },
  'p4': {
    id: 'p4',
    title: 'Executive Pitch Deck Q3',
    pages: 14,
    planTier: 'free',
    isPaid: false,
    tag: { label: 'Free Tier', type: 'free' },
    thumbBg: '#CFFAFE',
    thumbColor: '#155E75',
    thumbEmoji: '📈',
    spreads: [
      { left: 1, title: 'Executive Pitch Deck Q3', subtitle: 'Strategic Growth, Series B & TAM Expansion', type: 'cover', bg: '#0E7490', color: '#FFFFFF' },
      { left: 2, right: 3, title: 'Market Opportunity & Unit Economics', graphic: '🚀 3.8x YoY ARR Acceleration', type: 'inner' }
    ]
  }
};

// ============ STATE ============
let pdfDoc = null;
let pageFlip = null;
let totalPages = 28;
let rendered = new Set();
let rendering = new Set();
let pageEls = [];
let pageAspect = 0.707;
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanMode = false;
let soundEnabled = true;
let audioCtx = null;
let thumbCanvases = {};

const els = {};
[
  "topbar", "stage", "book", "bookWrapper", "navLeft", "navRight",
  "btnCornerFirst", "btnCornerLast", "toolbar",
  "zoomToolbar", "btnZoomOut", "zoomSlider", "zoomBadge", "btnZoomIn",
  "btnZoomReset", "btnZoomNavLeft", "btnZoomNavRight", "btnZoomPan", "btnZoomClose",
  "btnToolbarZoom", "btnThumbnails", "btnSound", "btnShare", "btnTopShare", "btnFullscreen", "btnTopFullscreen",
  "btnUpgradePrompt", "iconSoundOn", "iconSoundOff",
  "pageIndicatorText", "pageSlider",
  "thumbDrawer", "thumbDrawerClose", "thumbGrid", "thumbCount",
  "jumpDialog", "jumpForm", "dialogTotal", "dialogPageInput", "btnDialogClose",
  "shareModal", "btnShareModalClose", "shareUrlInput", "btnCopyShareUrl", "shareEmbedInput", "btnCopyEmbed",
  "shareWaBtn", "shareTwBtn", "shareLiBtn",
  "toast", "toastMsg", "loader", "loaderTxt", "loaderSub", "errBox", "errMsg", "errUrl",
  "bookTitleText", "bookTierBadge"
].forEach(function (id) {
  const domId = id === "bookWrapper" ? "book-wrapper" : id;
  els[id] = document.getElementById(domId);
});

// ============ SOUND SYNTHESIZER ============
function playPageTurnSound() {
  if (!soundEnabled) return;
  try {
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const duration = 0.22;
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      data[i] = (b0 + b1 + b2) * 0.26;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(500, now + duration);
    filter.Q.setValueAtTime(2.0, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(now);
  } catch (_) {}
}

function showToast(msg) {
  if (!els.toast) return;
  if (els.toastMsg) els.toastMsg.textContent = msg;
  els.toast.classList.remove("hide");
  setTimeout(() => {
    els.toast.classList.add("hide");
  }, 2400);
}

function showError(msg, url = '') {
  if (els.errMsg) els.errMsg.textContent = msg;
  if (els.errUrl) els.errUrl.textContent = url || window.location.href;
  if (els.errBox) els.errBox.style.display = "flex";
  if (els.loader) els.loader.classList.add("hide");
}

// ============ BUILD DOM PAGES ============
function buildPages(n) {
  if (!els.book) return;
  els.book.innerHTML = '';
  pageEls = [];
  rendered.clear();
  rendering.clear();

  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    const isFirst = i === 0;
    const isLast = i === n - 1;
    const isStandalone = isFirst || isLast;
    const isLeftPage = (i % 2 === 1);
    
    const div = document.createElement("div");
    div.className = "pf-page " + (isStandalone ? "cover" : "inner " + (isLeftPage ? "page-left" : "page-right"));
    if (isStandalone) div.setAttribute("data-density", "hard");

    const surface = document.createElement("div");
    surface.className = "surface";

    const ph = document.createElement("div");
    ph.className = "ph";
    ph.innerHTML = `<div class="spinner"></div><div class="label">Page ${i + 1}</div>`;
    surface.appendChild(ph);

    div.appendChild(surface);
    frag.appendChild(div);
    pageEls[i] = surface;
  }
  els.book.appendChild(frag);
}

// ============ RENDER ARTISTIC SPREADS / PDF ============
function renderPageContent(index) {
  if (rendered.has(index) || rendering.has(index)) return Promise.resolve();
  if (index < 0 || index >= totalPages) return Promise.resolve();
  rendering.add(index);

  // If we have a real PDF loaded
  if (pdfDoc) {
    const scale = currentBookData.isPaid ? 2.8 : 2.0;
    return pdfDoc.getPage(index + 1).then(page => {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      return page.render({ canvasContext: ctx, viewport }).promise.then(() => {
        const surface = pageEls[index];
        if (surface) {
          surface.innerHTML = "";
          surface.appendChild(canvas);
          
          // If Free tier, add sleek watermark badge
          if (!currentBookData.isPaid) {
            const wm = document.createElement("div");
            wm.style.cssText = "position:absolute; bottom:12px; right:14px; font-size:11px; font-weight:600; color:rgba(0,0,0,0.35); pointer-events:none; letter-spacing:0.4px;";
            wm.textContent = "Created with FlipPage • Free";
            surface.appendChild(wm);
          }
        }
        rendered.add(index);
        rendering.delete(index);
      });
    }).catch(err => {
      rendering.delete(index);
      console.warn("Failed to render page", index + 1, err);
    });
  }

  // Generate crisp vector editorial canvas spread
  return new Promise((resolve) => {
    const surface = pageEls[index];
    if (!surface) {
      rendering.delete(index);
      return resolve();
    }

    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1272; // Standard A4 ratio
    const ctx = canvas.getContext("2d");

    const isFirst = index === 0;
    const isLast = index === totalPages - 1;
    const pageNum = index + 1;

    // Background
    if (isFirst) {
      // Cover Page
      const grad = ctx.createLinearGradient(0, 0, 900, 1272);
      grad.addColorStop(0, '#0F172A');
      grad.addColorStop(1, '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 900, 1272);

      // Decorative Accent Glow
      const glow = ctx.createRadialGradient(450, 400, 50, 450, 400, 400);
      glow.addColorStop(0, currentBookData.isPaid ? 'rgba(245, 158, 11, 0.25)' : 'rgba(37, 99, 235, 0.25)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 900, 800);

      // Gold crown badge for paid
      if (currentBookData.isPaid) {
        ctx.fillStyle = '#F59E0B';
        ctx.font = 'bold 36px Inter, sans-serif';
        ctx.fillText('👑 PRO PUBLICATION', 70, 140);
      }

      // Title
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 54px Inter, sans-serif';
      wrapText(ctx, currentBookData.title, 70, 240, 760, 68);

      // Subtitle
      ctx.fillStyle = '#94A3B8';
      ctx.font = '24px Inter, sans-serif';
      ctx.fillText('FlipPage Interactive 3D Digital Edition', 70, 460);

      // Footer
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillText(`TOTAL PAGES: ${totalPages}  •  CLIENT-SIDE 3D PHYSICS`, 70, 1180);

    } else if (isLast) {
      // Back Cover
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 900, 1272);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 38px Inter, sans-serif';
      ctx.fillText('FlipPage Digital Studio', 70, 580);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '22px Inter, sans-serif';
      ctx.fillText('Thank you for reading this digital publication.', 70, 640);
      ctx.fillText('Turn any PDF into an engaging 3D flipbook.', 70, 680);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillText('flippage.io  •  Realistic 3D Web Reader', 70, 1180);

    } else {
      // Inner Editorial Page
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 900, 1272);

      // Top running header
      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(currentBookData.title.toUpperCase(), 70, 70);

      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(70, 90);
      ctx.lineTo(830, 90);
      ctx.stroke();

      // Section Title
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 36px Inter, sans-serif';
      ctx.fillText(`Section ${Math.ceil(pageNum / 2)}: Strategic Growth & Metrics`, 70, 160);

      // Decorative Data Graphic Card
      ctx.fillStyle = (pageNum % 2 === 0) ? '#F8FAFC' : '#EFF6FF';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      roundRect(ctx, 70, 210, 760, 480, 12);
      ctx.fill();
      ctx.stroke();

      // Graphic mock data
      ctx.fillStyle = (pageNum % 2 === 0) ? '#1E293B' : '#1E40AF';
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText(`📊 High-Resolution Insight Block #${pageNum}`, 100, 270);

      ctx.fillStyle = '#475569';
      ctx.font = '18px Inter, sans-serif';
      wrapText(ctx, "This interactive digital flipbook features client-side hardware-accelerated vector typography, dual-page spreads, realistic page curl physics, and customizable free or paid tiers.", 100, 330, 700, 32);

      // Metric indicators
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillText(`+${pageNum * 12 + 45}%`, 100, 520);
      ctx.fillStyle = '#64748B';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Reader Engagement Growth', 100, 560);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.fillText(`${(pageNum * 0.8 + 2.4).toFixed(1)}m`, 420, 520);
      ctx.fillStyle = '#64748B';
      ctx.font = '16px Inter, sans-serif';
      ctx.fillText('Average Read Duration', 420, 560);

      // Secondary Text Block
      ctx.fillStyle = '#334155';
      ctx.font = '18px Inter, sans-serif';
      wrapText(ctx, "Users can effortlessly share direct links, embed the flipbook inside any website or LMS, zoom smoothly up to 4x with pan drag gestures, and toggle page turn audio.", 70, 750, 760, 32);

      // Bottom Page Number
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 16px Inter, sans-serif';
      if (index % 2 === 1) {
        ctx.fillText(String(pageNum), 70, 1210);
      } else {
        ctx.fillText(String(pageNum), 810, 1210);
      }
    }

    surface.innerHTML = "";
    surface.appendChild(canvas);
    rendered.add(index);
    rendering.delete(index);
    resolve();
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function renderAround(centerIndex) {
  const jobs = [];
  for (let d = -3; d <= 4; d++) {
    jobs.push(renderPageContent(centerIndex + d));
  }
  return Promise.all(jobs);
}

// ============ POSITION CENTERING ============
function updatePosition(targetPageIndex) {
  if (!pageFlip && typeof targetPageIndex !== "number") return;
  const cur = (typeof targetPageIndex === "number") ? targetPageIndex : pageFlip.getCurrentPageIndex();
  let shift = 0;
  if (cur <= 0) {
    shift = -25;
  } else if (cur >= totalPages - 1) {
    shift = 25;
  } else {
    shift = 0;
  }

  if (els.bookWrapper) {
    els.bookWrapper.style.transform = `translateX(${shift}%) translate(${panX}px, ${panY}px) scale(${zoom})`;
    els.bookWrapper.classList.toggle("is-first-page", cur <= 0);
    els.bookWrapper.classList.toggle("is-last-page", cur >= totalPages - 1);
    els.bookWrapper.classList.toggle("is-spread", cur > 0 && cur < totalPages - 1);
  }
}

// ============ INDICATOR & FORMATTING ============
function getPageText(cur, total) {
  if (cur <= 0) return `1/${total}`;
  if (cur >= total - 1) return `${total}/${total}`;
  const left = cur + 1;
  const right = Math.min(total, cur + 2);
  return `${left}-${right}/${total}`;
}

function updateIndicator() {
  const cur = pageFlip ? pageFlip.getCurrentPageIndex() : 0;
  const text = getPageText(cur, totalPages);

  if (els.pageIndicatorText) els.pageIndicatorText.textContent = text;
  if (els.pageSlider) els.pageSlider.value = cur + 1;

  const isFirst = cur <= 0;
  const isLast = cur >= totalPages - 1;
  if (els.navLeft) els.navLeft.classList.toggle("disabled", isFirst);
  if (els.btnCornerFirst) els.btnCornerFirst.classList.toggle("disabled", isFirst);
  if (els.navRight) els.navRight.classList.toggle("disabled", isLast);
  if (els.btnCornerLast) els.btnCornerLast.classList.toggle("disabled", isLast);

  const isSpread = (cur > 0 && cur < totalPages - 1);
  if (els.book) els.book.classList.toggle("spread-view", isSpread);

  const targetHash = `#p=${cur + 1}`;
  if (window.location.hash !== targetHash) {
    try { window.history.replaceState(null, "", targetHash); } catch (_) {}
  }

  updatePosition(cur);
}

// ============ NAVIGATION ============
function goTo(index, immediate) {
  index = Math.max(0, Math.min(totalPages - 1, index));
  renderAround(index);
  updatePosition(index);
  if (pageFlip) {
    if ((immediate || isPanMode) && pageFlip.turnToPage) {
      pageFlip.turnToPage(index);
    } else {
      pageFlip.flip(index);
    }
  }
  updateIndicator();
}

function stepPrev() {
  if (!pageFlip) return;
  const cur = pageFlip.getCurrentPageIndex();
  const target = (cur <= 2) ? 0 : (cur - 2);
  if (isPanMode) {
    goTo(target, true);
  } else {
    updatePosition(target);
    pageFlip.flipPrev();
  }
}

function stepNext() {
  if (!pageFlip) return;
  const cur = pageFlip.getCurrentPageIndex();
  let target;
  if (cur === 0) target = 1;
  else if (cur >= totalPages - 3) target = totalPages - 1;
  else target = cur + 2;

  if (isPanMode) {
    goTo(target, true);
  } else {
    updatePosition(target);
    pageFlip.flipNext();
  }
}

function clampPan() {
  if (!els.stage) return;
  const stageW = els.stage.clientWidth || window.innerWidth;
  const stageH = els.stage.clientHeight || window.innerHeight;
  const maxPanX = Math.max(0, (stageW * (zoom - 1)) / 2 + 150);
  const maxPanY = Math.max(0, (stageH * (zoom - 1)) / 2 + 150);
  panX = Math.max(-maxPanX, Math.min(maxPanX, panX));
  panY = Math.max(-maxPanY, Math.min(maxPanY, panY));
}

function setPanMode(enabled, quiet) {
  if (typeof enabled === "boolean") {
    isPanMode = enabled;
  } else {
    isPanMode = !isPanMode;
  }

  if (els.btnZoomPan) {
    els.btnZoomPan.classList.toggle("active", isPanMode);
    els.btnZoomPan.setAttribute("aria-pressed", isPanMode ? "true" : "false");
  }

  document.body.classList.toggle("no-flip-mode", isPanMode);
  if (els.stage) {
    els.stage.classList.toggle("is-pan-mode", isPanMode);
    els.stage.classList.toggle("is-zoomed", zoom > 1);
  }

  if (els.bookWrapper) {
    if (isPanMode || zoom > 1) {
      els.bookWrapper.style.transition = "none";
    }
  }

  if (pageFlip && pageFlip.getSettings) {
    const s = pageFlip.getSettings();
    if (s) {
      s.useMouseEvents = !isPanMode;
      s.flippingTime = isPanMode ? 0 : 950;
    }
  }

  if (!quiet) {
    showToast(isPanMode ? "Pan mode: Drag to move page" : "Flip mode: Page turn active");
  }
}

function setZoom(z, skipPanSync) {
  zoom = Math.max(1, Math.min(4, Math.round(z * 100) / 100));
  
  if (zoom === 1) {
    panX = 0;
    panY = 0;
    if (!skipPanSync && isPanMode) {
      setPanMode(false, true);
    }
  } else {
    if (!skipPanSync && !isPanMode) {
      setPanMode(true, true);
    }
    clampPan();
  }

  if (els.zoomSlider) {
    els.zoomSlider.value = zoom;
    const pct = ((zoom - 1) / 3) * 100;
    els.zoomSlider.style.setProperty("--zoom-percent", pct + "%");
    els.zoomSlider.style.setProperty("--zoom-badge-left", `calc(${pct}% * 0.88 + 6px)`);
  }
  if (els.zoomBadge) {
    els.zoomBadge.textContent = zoom === 1 ? "1x" : zoom.toFixed(1) + "x";
  }
  if (els.stage) {
    els.stage.classList.toggle("is-zoomed", zoom > 1);
    els.stage.classList.toggle("is-pan-mode", isPanMode || zoom > 1);
  }
  if (els.btnZoomPan) {
    els.btnZoomPan.classList.toggle("active", isPanMode || zoom > 1);
  }
  if (els.bookWrapper) {
    els.bookWrapper.style.transition = (zoom > 1 || isPanMode) ? "none" : "";
  }
  updatePosition();
}

function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) {
      const req = (document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen || function () { });
      req.call(document.documentElement);
    } else {
      const exit = (document.exitFullscreen || document.webkitExitFullscreen || function () { });
      exit.call(document);
    }
  } catch (_) {}
}

// ============ THUMBNAILS DRAWER ============
function initThumbnails() {
  if (!els.thumbGrid || els.thumbGrid.children.length > 0) return;
  
  if (els.thumbCount) els.thumbCount.textContent = totalPages;

  for (let i = 0; i < totalPages; i++) {
    const item = document.createElement("div");
    item.className = "thumb-item";
    item.dataset.page = i;

    const cv = document.createElement("canvas");
    cv.width = 96;
    cv.height = 138;
    item.appendChild(cv);

    const badge = document.createElement("div");
    badge.className = "thumb-badge";
    badge.textContent = i + 1;
    item.appendChild(badge);

    item.addEventListener("click", () => {
      goTo(i);
      if (els.thumbDrawer) els.thumbDrawer.classList.add("hide");
    });

    els.thumbGrid.appendChild(item);
    thumbCanvases[i] = { element: item, canvas: cv, rendered: false };
  }

  renderVisibleThumbs();
  els.thumbGrid.addEventListener("scroll", renderVisibleThumbs);
}

function renderVisibleThumbs() {
  if (!els.thumbGrid) return;
  const gridRect = els.thumbGrid.getBoundingClientRect();
  
  for (let i = 0; i < totalPages; i++) {
    const t = thumbCanvases[i];
    if (t && !t.rendered) {
      const rect = t.element.getBoundingClientRect();
      if (rect.right >= gridRect.left - 200 && rect.left <= gridRect.right + 200) {
        t.rendered = true;
        
        if (pdfDoc) {
          pdfDoc.getPage(i + 1).then(page => {
            const vp = page.getViewport({ scale: 0.2 });
            const ctx = t.canvas.getContext("2d");
            page.render({ canvasContext: ctx, viewport: vp });
          }).catch(() => {});
        } else {
          // Render miniature canvas preview
          const ctx = t.canvas.getContext("2d");
          ctx.fillStyle = (i === 0 || i === totalPages - 1) ? '#0F172A' : '#FFFFFF';
          ctx.fillRect(0, 0, 96, 138);
          ctx.fillStyle = (i === 0 || i === totalPages - 1) ? '#FFFFFF' : '#334155';
          ctx.font = 'bold 10px sans-serif';
          ctx.fillText(`Page ${i + 1}`, 10, 20);
        }
      }
    }
  }
}

// ============ SHARING MODAL CONTROLLER ============
function openShareModal() {
  const currentUrl = window.location.href;
  const embedCode = `<iframe src="${currentUrl}" width="100%" height="600" frameborder="0" allowfullscreen allow="clipboard-read; clipboard-write"></iframe>`;

  if (els.shareUrlInput) els.shareUrlInput.value = currentUrl;
  if (els.shareEmbedInput) els.shareEmbedInput.value = embedCode;

  const encodedUrl = encodeURIComponent(currentUrl);
  const encodedTitle = encodeURIComponent(`Read "${currentBookData.title}" interactive 3D digital flipbook on FlipPage!`);

  if (els.shareWaBtn) els.shareWaBtn.href = `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`;
  if (els.shareTwBtn) els.shareTwBtn.href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
  if (els.shareLiBtn) els.shareLiBtn.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  if (els.shareModal) els.shareModal.classList.remove("hide");
}

function closeShareModal() {
  if (els.shareModal) els.shareModal.classList.add("hide");
}

// ============ SIZE COMPUTATION ============
function computeBookSize() {
  const stageW = (els.stage && els.stage.clientWidth) ? els.stage.clientWidth : window.innerWidth;
  const stageH = (els.stage && els.stage.clientHeight) ? els.stage.clientHeight : (window.innerHeight - 96);

  const availH = Math.max(340, stageH - 24);
  const sideMargin = (stageW > 1200) ? 120 : ((stageW > 700) ? 80 : 20);
  const availW = Math.max(340, stageW - sideMargin);

  const spreadAspect = 2 * (pageAspect || 0.707);
  let singleH = availH;
  let spreadW = singleH * spreadAspect;

  if (spreadW > availW) {
    spreadW = availW;
    singleH = spreadW / spreadAspect;
  }

  const singleW = spreadW / 2;

  return {
    width: Math.round(singleW),
    height: Math.round(singleH),
    spreadWidth: Math.round(spreadW)
  };
}

// ============ WIRE EVENT HANDLERS ============
function wireControls() {
  if (els.navLeft) els.navLeft.addEventListener("click", stepPrev);
  if (els.navRight) els.navRight.addEventListener("click", stepNext);
  if (els.btnCornerFirst) els.btnCornerFirst.addEventListener("click", () => goTo(0));
  if (els.btnCornerLast) els.btnCornerLast.addEventListener("click", () => goTo(totalPages - 1));

  if (els.pageSlider) {
    els.pageSlider.addEventListener("input", (e) => {
      const targetPage = parseInt(e.target.value, 10) - 1;
      goTo(targetPage);
    });
  }

  if (els.pageIndicatorText) {
    els.pageIndicatorText.addEventListener("click", () => {
      if (els.jumpDialog) {
        if (els.dialogPageInput) els.dialogPageInput.value = (pageFlip ? pageFlip.getCurrentPageIndex() + 1 : 1);
        els.jumpDialog.showModal();
      }
    });
  }

  // Zoom controls
  if (els.btnToolbarZoom) {
    els.btnToolbarZoom.addEventListener("click", () => {
      if (!els.zoomToolbar) return;
      const isHidden = els.zoomToolbar.classList.contains("hide");
      if (isHidden) {
        els.zoomToolbar.classList.remove("hide");
        els.btnToolbarZoom.classList.add("active");
        showToast("Zoom controls opened");
      } else {
        els.zoomToolbar.classList.add("hide");
        els.btnToolbarZoom.classList.remove("active");
        setZoom(1);
      }
    });
  }

  if (els.btnZoomIn) els.btnZoomIn.addEventListener("click", () => setZoom(zoom + 0.25));
  if (els.btnZoomOut) els.btnZoomOut.addEventListener("click", () => setZoom(zoom - 0.25));
  if (els.btnZoomReset) els.btnZoomReset.addEventListener("click", () => setZoom(1));
  if (els.btnZoomNavLeft) els.btnZoomNavLeft.addEventListener("click", stepPrev);
  if (els.btnZoomNavRight) els.btnZoomNavRight.addEventListener("click", stepNext);
  if (els.btnZoomPan) els.btnZoomPan.addEventListener("click", () => setPanMode());
  if (els.btnZoomClose) {
    els.btnZoomClose.addEventListener("click", () => {
      if (els.zoomToolbar) els.zoomToolbar.classList.add("hide");
      if (els.btnToolbarZoom) els.btnToolbarZoom.classList.remove("active");
      setZoom(1);
    });
  }

  if (els.zoomSlider) {
    els.zoomSlider.addEventListener("input", (e) => {
      setZoom(parseFloat(e.target.value));
    });
  }

  // Drag Panning & Mobile Touch
  let isDragging = false;
  let startX = 0, startY = 0;
  let origPanX = 0, origPanY = 0;
  let isPinching = false;
  let initialPinchDist = 0;
  let initialPinchZoom = 1;
  let pinchMidX = 0, pinchMidY = 0;
  let lastTapTime = 0;

  function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  if (els.stage) {
    els.stage.addEventListener("mousedown", (e) => {
      if (!isPanMode) return;
      if (e.target.closest("#zoomToolbar") || e.target.closest("#toolbar") || e.target.closest(".nav-arrow") || e.target.closest("#thumbDrawer") || e.target.closest(".reader-modal")) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origPanX = panX;
      origPanY = panY;
      els.stage.classList.add("is-dragging");
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      panX = origPanX + (e.clientX - startX);
      panY = origPanY + (e.clientY - startY);
      updatePosition();
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        if (els.stage) els.stage.classList.remove("is-dragging");
      }
    });

    // Touch events for mobile
    els.stage.addEventListener("touchstart", (e) => {
      if (e.target.closest("#zoomToolbar") || e.target.closest("#toolbar") || e.target.closest(".nav-arrow") || e.target.closest("#thumbDrawer")) return;

      if (e.touches.length === 2) {
        isPinching = true;
        isDragging = false;
        initialPinchDist = getTouchDist(e.touches[0], e.touches[1]);
        initialPinchZoom = zoom;
        origPanX = panX;
        origPanY = panY;
        pinchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapTime < 300) {
          if (zoom > 1) {
            setZoom(1);
            showToast("Zoom reset (1x)");
          } else {
            setZoom(2.0);
            showToast("Zoomed in (2x)");
          }
          lastTapTime = 0;
          if (e.cancelable) e.preventDefault();
          return;
        }
        lastTapTime = now;

        if (isPanMode) {
          isDragging = true;
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          origPanX = panX;
          origPanY = panY;
          els.stage.classList.add("is-dragging");
        }
      }
    }, { passive: false });

    window.addEventListener("touchmove", (e) => {
      if (isPinching && e.touches.length === 2) {
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        if (initialPinchDist > 10) {
          const factor = dist / initialPinchDist;
          setZoom(Math.max(1, Math.min(4, initialPinchZoom * factor)));
          const curMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const curMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          panX = origPanX + (curMidX - pinchMidX);
          panY = origPanY + (curMidY - pinchMidY);
          updatePosition();
        }
        if (e.cancelable) e.preventDefault();
        return;
      }

      if (isDragging && e.touches.length === 1) {
        panX = origPanX + (e.touches[0].clientX - startX);
        panY = origPanY + (e.touches[0].clientY - startY);
        updatePosition();
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    window.addEventListener("touchend", () => {
      isPinching = false;
      isDragging = false;
      if (els.stage) els.stage.classList.remove("is-dragging");
    });
  }

  // Fullscreen
  if (els.btnFullscreen) els.btnFullscreen.addEventListener("click", toggleFullscreen);
  if (els.btnTopFullscreen) els.btnTopFullscreen.addEventListener("click", toggleFullscreen);

  // Jump Dialog
  if (els.jumpForm) {
    els.jumpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const val = parseInt(els.dialogPageInput.value, 10);
      if (!isNaN(val) && val >= 1 && val <= totalPages) {
        goTo(val - 1);
      }
      els.jumpDialog.close();
    });
  }
  if (els.btnDialogClose) {
    els.btnDialogClose.addEventListener("click", () => els.jumpDialog.close());
  }

  // Thumbnails Drawer
  if (els.btnThumbnails) {
    els.btnThumbnails.addEventListener("click", () => {
      if (!els.thumbDrawer) return;
      const isHidden = els.thumbDrawer.classList.contains("hide");
      if (isHidden) {
        initThumbnails();
        els.thumbDrawer.classList.remove("hide");
        renderVisibleThumbs();
      } else {
        els.thumbDrawer.classList.add("hide");
      }
    });
  }
  if (els.thumbDrawerClose) {
    els.thumbDrawerClose.addEventListener("click", () => {
      if (els.thumbDrawer) els.thumbDrawer.classList.add("hide");
    });
  }

  // Sound
  if (els.btnSound) {
    els.btnSound.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      if (els.iconSoundOn) els.iconSoundOn.classList.toggle("hide", !soundEnabled);
      if (els.iconSoundOff) els.iconSoundOff.classList.toggle("hide", soundEnabled);
      showToast(soundEnabled ? "Sound enabled" : "Sound muted");
    });
  }

  // Share
  if (els.btnShare) els.btnShare.addEventListener("click", openShareModal);
  if (els.btnTopShare) els.btnTopShare.addEventListener("click", openShareModal);
  if (els.btnShareModalClose) els.btnShareModalClose.addEventListener("click", closeShareModal);

  if (els.btnCopyShareUrl) {
    els.btnCopyShareUrl.addEventListener("click", () => {
      if (els.shareUrlInput) {
        navigator.clipboard.writeText(els.shareUrlInput.value);
        showToast("Share link copied to clipboard!");
      }
    });
  }

  if (els.btnCopyEmbed) {
    els.btnCopyEmbed.addEventListener("click", () => {
      if (els.shareEmbedInput) {
        navigator.clipboard.writeText(els.shareEmbedInput.value);
        showToast("iFrame embed snippet copied!");
      }
    });
  }

  // Keyboard
  document.addEventListener("keydown", (e) => {
    if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
    if (e.key === "ArrowLeft") stepPrev();
    if (e.key === "ArrowRight") stepNext();
    if (e.key === "Home") goTo(0);
    if (e.key === "End") goTo(totalPages - 1);
    if (e.key === "f" || e.key === "F") toggleFullscreen();
  });

  // Resize handler
  let resizeDebounce = null;
  window.addEventListener("resize", () => {
    if (!pageFlip || !els.stage || !els.book) return;
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      const newSize = computeBookSize();
      if (els.bookWrapper) {
        els.bookWrapper.style.width = `${newSize.spreadWidth}px`;
        els.bookWrapper.style.height = `${newSize.height}px`;
      }
      els.book.style.width = `${newSize.spreadWidth}px`;
      els.book.style.height = `${newSize.height}px`;

      const s = pageFlip.getSettings ? pageFlip.getSettings() : null;
      if (s) {
        s.width = newSize.width;
        s.height = newSize.height;
      }
      if (pageFlip.update) pageFlip.update();
      updatePosition();
    }, 100);
  });
}

// ============ LOAD PUBLICATION METADATA & INIT ============
async function loadPublicationAndInit() {
  const urlParams = new URLSearchParams(window.location.search);
  const pubId = urlParams.get('id') || 'p1';
  const customPdfUrl = urlParams.get('pdf');

  // Load from Firestore or default publications catalogue
  if (pubId && db) {
    try {
      const docRef = doc(db, 'publications', pubId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        currentBookData = {
          id: pubId,
          title: data.title || 'Digital Flipbook',
          pages: data.pages || 20,
          planTier: data.planTier || (data.isPaid ? 'paid' : 'free'),
          isPaid: Boolean(data.isPaid || data.planTier === 'paid'),
          pdfUrl: data.pdfUrl || '',
          pdfData: data.pdfData || null,
          spreads: data.spreads || []
        };

        // Increment read view count in Firestore
        try {
          updateDoc(docRef, { reads: increment(1) });
        } catch (_) {}
      } else if (DEFAULT_PUBLICATIONS[pubId]) {
        currentBookData = DEFAULT_PUBLICATIONS[pubId];
      }
    } catch (err) {
      console.warn("Firestore book load notice, using catalog:", err);
      if (DEFAULT_PUBLICATIONS[pubId]) currentBookData = DEFAULT_PUBLICATIONS[pubId];
    }
  } else if (DEFAULT_PUBLICATIONS[pubId]) {
    currentBookData = DEFAULT_PUBLICATIONS[pubId];
  }

  if (customPdfUrl) {
    currentBookData.pdfUrl = customPdfUrl;
  }

  totalPages = currentBookData.pages || 28;

  // Update UI Elements
  if (els.bookTitleText) els.bookTitleText.textContent = currentBookData.title;
  document.title = `${currentBookData.title} — FlipPage 3D Flipbook`;

  if (els.bookTierBadge) {
    if (currentBookData.isPaid) {
      els.bookTierBadge.className = "tier-badge paid";
      els.bookTierBadge.innerHTML = `<span>👑</span><span>PRO</span>`;
    } else {
      els.bookTierBadge.className = "tier-badge free";
      els.bookTierBadge.innerHTML = `<span>FREE</span>`;
    }
  }

  if (els.dialogTotal) els.dialogTotal.textContent = totalPages;
  if (els.dialogPageInput) els.dialogPageInput.max = totalPages;
  if (els.pageSlider) els.pageSlider.max = totalPages;

  // Build Pages
  buildPages(totalPages);

  const size = computeBookSize();
  if (els.bookWrapper) {
    els.bookWrapper.style.width = `${size.spreadWidth}px`;
    els.bookWrapper.style.height = `${size.height}px`;
  }
  els.book.style.width = `${size.spreadWidth}px`;
  els.book.style.height = `${size.height}px`;

  if (typeof St === "undefined" || !St.PageFlip) {
    showError("The 3D page flip engine is loading... please refresh.");
    return;
  }

  pageFlip = new St.PageFlip(els.book, {
    width: size.width,
    height: size.height,
    size: "stretch",
    minWidth: 160,
    maxWidth: 3000,
    minHeight: 220,
    maxHeight: 3000,
    maxShadowOpacity: 0.20,
    showCover: true,
    usePortrait: false,
    drawShadow: true,
    mobileScrollSupport: false,
    flippingTime: 950,
    useMouseEvents: true,
    startZIndex: 0,
    autoSize: true
  });

  pageFlip.loadFromHTML(document.querySelectorAll(".pf-page"));

  // Events
  pageFlip.on("flip", (e) => {
    playPageTurnSound();
    updateIndicator();
    renderAround(e.data);
  });

  pageFlip.on("changeState", (e) => {
    updateIndicator();
    if (e && (e.data === "flipping" || e.data === "user_fold")) {
      els.book.classList.add("is-flipping");
    } else {
      els.book.classList.remove("is-flipping");
    }
  });

  // Check URL initial page
  let initialIndex = 0;
  const hashMatch = window.location.hash.match(/#p=(\d+)/);
  if (hashMatch && hashMatch[1]) {
    const pNum = parseInt(hashMatch[1], 10);
    if (!isNaN(pNum) && pNum >= 1 && pNum <= totalPages) {
      initialIndex = pNum - 1;
    }
  }

  updatePosition(initialIndex);
  if (initialIndex > 0 && pageFlip.turnToPage) {
    pageFlip.turnToPage(initialIndex);
  }

  await renderAround(initialIndex);
  updateIndicator();

  if (els.loader) els.loader.classList.add("hide");
}

// Initial Boot
document.addEventListener("DOMContentLoaded", () => {
  wireControls();
  loadPublicationAndInit();
});
