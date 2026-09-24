/* =============================================
   AnnualFlip — Main JavaScript
   ============================================= */

/* ---------- Navbar scroll shadow ---------- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

/* ---------- Scatter grid icons ---------- */
(function buildGridIcons() {
  const symbols = [
    '⊞','⊠','⊡','▣','▤','▥','▦','▧','▨','▩',
    '☷','☰','☱','☲','☴','☵','☶','☳','⊟','⊞',
    '◈','◉','◎','⊕','⊗','⊘','⊙','⊛','⊜','⊝',
  ];
  const container = document.querySelector('.grid-icons');
  const count = 48;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'grid-icon';
    el.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    el.style.left = `${Math.random() * 100}%`;
    el.style.top  = `${Math.random() * 100}%`;
    el.style.opacity = (0.2 + Math.random() * 0.35).toFixed(2);
    el.style.fontSize = `${10 + Math.floor(Math.random() * 10)}px`;
    container.appendChild(el);
  }
})();

/* ---------- Ticker duplication ---------- */
(function duplicateTicker() {
  const inner = document.querySelector('.ticker-inner');
  if (!inner) return;
  const clone = inner.cloneNode(true);
  inner.parentElement.appendChild(clone);
})();

/* ---------- Flipbook viewer ---------- */
const bookEl   = document.getElementById('book');
const prevBtn  = document.getElementById('prevBtn');
const nextBtn  = document.getElementById('nextBtn');
const pageLbl  = document.getElementById('pagecount');
const statusEl = document.getElementById('status');

let pages   = [];
let current = 0;
let total   = 0;

const SAMPLE = [
  { bg: 'linear-gradient(135deg,#1A3FD4,#2563EB)', text: 'AnnualFlip\nSample Book' },
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
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

document.getElementById('pdfInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  statusEl.textContent = 'Rendering your PDF…';

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
    statusEl.textContent = `Loaded "${file.name}" — ${imgs.length} pages.`;
  } catch {
    statusEl.textContent = 'Could not read that PDF. Try a different file.';
  }
});
