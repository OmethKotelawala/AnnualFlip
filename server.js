/**
 * FlipPage Full-Stack Express Server & PDF Flipbook API Engine
 * Converts public PDF URLs into interactive 3D Flipbooks with optimized web images,
 * text extraction, and Firestore metadata persistence.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseConfig } from './js/firebaseConfig.js';
import {
  validatePdfUrl,
  downloadPdfBuffer,
  convertPdfToFlipbook,
  getPageImageBuffer,
  getCachedPdfBuffer,
  memoryBooksStore,
  memorySlugIndex
} from './server/pdfConverter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Enable JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize Firestore
let db = null;
try {
  const firebaseApp = initializeApp(firebaseConfig, 'server-app');
  db = firebaseConfig?.firestoreDatabaseId ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId) : getFirestore(firebaseApp);
} catch (err) {
  console.warn('Server Firebase init notice:', err);
}

// =========================================================================
// BACKEND API ROUTES FOR PDF -> DIGITAL FLIPBOOK
// =========================================================================

/**
 * Helper: Generate unique safe slug
 */
function sanitizeSlug(rawSlug, title, bookId) {
  let base = (rawSlug || title || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  if (!base || base === '-') {
    base = `book-${bookId.slice(-6)}`;
  }
  return base;
}

/**
 * Helper: Save book record to Firestore & Memory Cache
 */
async function saveBookToStore(bookData) {
  memoryBooksStore.set(bookData.id, bookData);
  if (bookData.slug) {
    memorySlugIndex.set(bookData.slug, bookData.id);
  }

  if (db) {
    try {
      const docRef = doc(db, 'books', bookData.id);
      await setDoc(docRef, bookData, { merge: true });
    } catch (err) {
      console.warn(`Firestore save notice for book ${bookData.id}:`, err.message);
    }
  }
}

/**
 * Helper: Get book record by ID or Slug
 */
async function getBookByIdOrSlug(identifier) {
  // 1. Check memory cache by ID
  if (memoryBooksStore.has(identifier)) {
    return memoryBooksStore.get(identifier);
  }

  // 2. Check memory cache by slug
  if (memorySlugIndex.has(identifier)) {
    const id = memorySlugIndex.get(identifier);
    if (memoryBooksStore.has(id)) {
      return memoryBooksStore.get(id);
    }
  }

  // 3. Check Firestore by ID
  if (db) {
    try {
      const docRef = doc(db, 'books', identifier);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        memoryBooksStore.set(data.id, data);
        if (data.slug) memorySlugIndex.set(data.slug, data.id);
        return data;
      }
    } catch (_) {}

    // 4. Check Firestore by slug field query
    try {
      const q = query(collection(db, 'books'), where('slug', '==', identifier));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        const data = qSnap.docs[0].data();
        memoryBooksStore.set(data.id, data);
        if (data.slug) memorySlugIndex.set(data.slug, data.id);
        return data;
      }
    } catch (_) {}
  }

  return null;
}

/**
 * POST /api/import-pdf-url
 * Validates public PDF URL, downloads & caches PDF, counts pages, and returns READY status with readerUrl.
 */
app.post('/api/import-pdf-url', async (req, res) => {
  const { pdfUrl, title, slug } = req.body || {};

  if (!pdfUrl) {
    return res.status(400).json({ error: 'pdfUrl parameter is required' });
  }

  let validatedUrl;
  try {
    validatedUrl = await validatePdfUrl(pdfUrl);
  } catch (err) {
    return res.status(400).json({ error: `URL Validation Error: ${err.message}` });
  }

  const bookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const cleanTitle = (title || 'Digital Flipbook').trim();
  const cleanSlug = sanitizeSlug(slug, cleanTitle, bookId);

  const initialBook = {
    id: bookId,
    title: cleanTitle,
    slug: cleanSlug,
    sourcePdfUrl: validatedUrl,
    pdfUrl: `/api/books/${bookId}/source.pdf`,
    pageCount: 1,
    status: 'PROCESSING',
    pages: [],
    settings: {
      soundEnabled: true,
      theme: 'light',
      allowDownload: true,
      bgType: 'light',
      bgColor: '#F8FAFC',
      accentColor: '#2563EB'
    },
    readerUrl: `/read/${cleanSlug}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    console.log(`[PDF Backend] Downloading PDF for book ${bookId} from ${validatedUrl}`);
    const pdfBuffer = await downloadPdfBuffer(validatedUrl);

    console.log(`[PDF Backend] Processing pages & metadata for book ${bookId} (${pdfBuffer.length} bytes)`);
    const { pageCount, pages } = await convertPdfToFlipbook(bookId, cleanSlug, pdfBuffer);

    const completedBook = {
      ...initialBook,
      pageCount: pageCount || 1,
      pages,
      pdfUrl: `/api/books/${bookId}/source.pdf`,
      status: 'READY',
      updatedAt: new Date().toISOString()
    };

    await saveBookToStore(completedBook);
    console.log(`[PDF Backend] Successfully converted book ${bookId} (${pageCount} pages) - Status: READY`);

    return res.status(200).json({
      bookId,
      slug: cleanSlug,
      title: cleanTitle,
      pageCount,
      status: 'READY',
      pdfUrl: `/api/books/${bookId}/source.pdf`,
      readerUrl: `/read/${cleanSlug}`
    });
  } catch (err) {
    console.error(`[PDF Backend] Error processing PDF for book ${bookId}:`, err);
    return res.status(500).json({
      error: err.message || 'Failed to download and process PDF document'
    });
  }
});

/**
 * GET /api/proxy-pdf
 * Proxies remote PDF stream with SSRF protection and permissive CORS headers
 */
app.get('/api/proxy-pdf', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('URL query parameter required');
  }

  try {
    const validatedUrl = await validatePdfUrl(targetUrl);
    const pdfBuffer = await downloadPdfBuffer(validatedUrl);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(pdfBuffer);
  } catch (err) {
    res.status(400).send(`Failed to proxy PDF: ${err.message}`);
  }
});

/**
 * GET /api/books/:bookId
 * Returns full book document
 */
app.get('/api/books/:bookId', async (req, res) => {
  const book = await getBookByIdOrSlug(req.params.bookId);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }
  res.json(book);
});

/**
 * GET /api/books/:bookId/progress
 * Returns status and progress
 */
app.get('/api/books/:bookId/progress', async (req, res) => {
  const book = await getBookByIdOrSlug(req.params.bookId);
  if (!book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  res.json({
    bookId: book.id,
    slug: book.slug,
    status: book.status,
    pageCount: book.pageCount || 0,
    readerUrl: book.readerUrl,
    errorMessage: book.errorMessage || null,
    updatedAt: book.updatedAt
  });
});

/**
 * GET /api/public/books/:slug
 * Returns public flipbook manifest for frontend reader
 */
app.get('/api/public/books/:slug', async (req, res) => {
  const book = await getBookByIdOrSlug(req.params.slug);
  if (!book) {
    return res.status(404).json({ error: 'Flipbook not found' });
  }

  res.json({
    id: book.id,
    title: book.title,
    slug: book.slug,
    pageCount: book.pageCount,
    status: book.status,
    pdfUrl: `/api/books/${book.id}/source.pdf`,
    pages: book.pages || [],
    settings: book.settings || {},
    readerUrl: book.readerUrl,
    createdAt: book.createdAt
  });
});

/**
 * GET /api/books/:bookId/source.pdf
 * Serves cached original source PDF
 */
app.get('/api/books/:bookId/source.pdf', (req, res) => {
  const pdfBuffer = getCachedPdfBuffer(req.params.bookId);
  if (!pdfBuffer) {
    return res.status(404).send('PDF not found');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.send(pdfBuffer);
});

/**
 * GET /api/books/:bookId/pages/:pageNum.jpg
 * Serves converted JPEG page image
 */
app.get('/api/books/:bookId/pages/:pageNum.jpg', (req, res) => {
  const { bookId, pageNum } = req.params;
  const imageBuffer = getPageImageBuffer(bookId, pageNum);

  if (!imageBuffer) {
    return res.status(404).send('Page image not found');
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.send(imageBuffer);
});

/**
 * GET /api/public/books/:slug/pages/:pageNum.jpg
 * Serves converted JPEG page image by slug
 */
app.get('/api/public/books/:slug/pages/:pageNum.jpg', async (req, res) => {
  const book = await getBookByIdOrSlug(req.params.slug);
  if (!book) {
    return res.status(404).send('Flipbook not found');
  }

  const imageBuffer = getPageImageBuffer(book.id, req.params.pageNum);
  if (!imageBuffer) {
    return res.status(404).send('Page image not found');
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
  res.send(imageBuffer);
});

// =========================================================================
// FRONTEND PAGE ROUTING & SHORT LINKS
// =========================================================================

// Direct reader short URLs: /read/:slug and /read/:bookId
app.get(['/read/:slug', '/read/:slug/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'reader.html'));
});

// Explicit clean page handlers
app.get(['/platform', '/platform.html', '/Platform.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'Platform.html'));
});

app.get(['/workspace', '/workspace.html', '/Workspace.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'workspace.html'));
});

app.get(['/reader', '/reader.html', '/read', '/book'], (req, res) => {
  res.sendFile(path.join(__dirname, 'reader.html'));
});

app.get(['/account', '/account.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'account.html'));
});

app.get(['/pricing', '/pricing.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'pricing.html'));
});

app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Static assets
app.use(express.static(__dirname));

// Send index.html for root or unhandled routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`AnnualFlip Full-Stack Server listening on http://${HOST}:${PORT}`);
});
