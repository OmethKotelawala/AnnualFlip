/**
 * FlipPage Full-Stack Express Server & PDF Flipbook API Engine
 * Converts public PDF URLs into interactive 3D Flipbooks with optimized web images,
 * text extraction, and Firestore metadata persistence.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

// Enable JSON & URL encoded parsing with large payload capacity for PDF base64 / binary
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Serve static assets first so /css, /js, /scr, /Icons are never captured by wildcard or slug routes
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Route fallback for .min.css and .min.js aliases
app.get('/css/style.min.css', (req, res) => res.sendFile(path.join(__dirname, 'css', 'style.css')));
app.get('/css/wig.min.css', (req, res) => res.sendFile(path.join(__dirname, 'css', 'reader.css')));
app.get('/js/script.min.js', (req, res) => res.sendFile(path.join(__dirname, 'js', 'script.js')));
app.get('/js/wig.min.js', (req, res) => res.sendFile(path.join(__dirname, 'js', 'reader.js')));

// Initialize Firestore
let db = null;
try {
  const firebaseApp = initializeApp(firebaseConfig, 'server-app');
  db = firebaseConfig?.firestoreDatabaseId ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId) : getFirestore(firebaseApp);
} catch (err) {
  console.warn('Server Firebase init notice:', err);
}

// Cache directory
const CACHE_DIR = path.join(__dirname, '.cache_books');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// =========================================================================
// BACKEND API ROUTES (AUTHOR DASHBOARD & FLIPBOOK VIEWER SPEC)
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
  if (!identifier) return null;

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
 * POST /api/auth/login
 * Authors / Users authentication session sync
 */
app.post('/api/auth/login', async (req, res) => {
  const { uid, name, email, avatar, companyName, role, plan } = req.body || {};

  if (!uid || !email) {
    return res.status(400).json({ error: 'uid and email are required for login sync' });
  }

  const userData = {
    id: uid,
    uid,
    name: name || (email ? email.split('@')[0] : 'Author'),
    displayName: name || (email ? email.split('@')[0] : 'Author'),
    email,
    avatar: avatar || null,
    photoURL: avatar || null,
    companyName: companyName || '',
    role: role || 'user',
    plan: plan || 'PRO',
    created_at: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, userData, { merge: true });
    } catch (err) {
      console.warn('Firestore user save notice:', err.message);
    }
  }

  res.status(200).json({
    success: true,
    user: userData
  });
});

/**
 * GET /api/books
 * Lists all books for the author dashboard (optionally filtered by ?user_id=...)
 */
app.get('/api/books', async (req, res) => {
  const { user_id } = req.query;
  const results = [];

  if (db) {
    try {
      let q = collection(db, 'books');
      if (user_id) {
        q = query(collection(db, 'books'), where('user_id', '==', user_id));
      }
      const qSnap = await getDocs(q);
      qSnap.forEach(docSnap => {
        results.push(docSnap.data());
      });
    } catch (err) {
      console.warn('Firestore get books notice:', err.message);
    }
  }

  // If Firestore empty or fallback, return in-memory store items
  if (results.length === 0) {
    for (const book of memoryBooksStore.values()) {
      if (!user_id || book.user_id === user_id) {
        results.push(book);
      }
    }
  }

  res.status(200).json(results);
});

/**
 * POST /api/books
 * Creates or updates book data in database
 */
app.post('/api/books', async (req, res) => {
  const { user_id, title, slug, pdf_url, cover_url, description, status, pageCount, settings } = req.body || {};

  const bookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const cleanTitle = (title || 'Digital Flipbook').trim();
  const cleanSlug = sanitizeSlug(slug, cleanTitle, bookId);

  const bookData = {
    id: bookId,
    user_id: user_id || 'anonymous',
    title: cleanTitle,
    slug: cleanSlug,
    pdf_url: pdf_url || `/api/books/${bookId}/source.pdf`,
    pdfUrl: pdf_url || `/api/books/${bookId}/source.pdf`,
    cover_url: cover_url || null,
    description: description || '',
    status: status || 'live',
    views: 0,
    pageCount: pageCount || 1,
    settings: settings || {
      soundEnabled: true,
      theme: 'light',
      allowDownload: true,
      bgType: 'light',
      bgColor: '#F8FAFC',
      accentColor: '#2563EB'
    },
    readerUrl: `/b/${cleanSlug}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await saveBookToStore(bookData);

  res.status(201).json({
    success: true,
    book: bookData,
    readerUrl: `/b/${cleanSlug}`
  });
});

/**
 * DELETE /api/books/:id
 * Deletes book from database and object storage cache
 */
app.delete('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  const book = await getBookByIdOrSlug(id);
  const actualId = book ? book.id : id;

  memoryBooksStore.delete(actualId);
  if (book && book.slug) memorySlugIndex.delete(book.slug);

  if (db) {
    try {
      const docRef = doc(db, 'books', actualId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn('Firestore delete notice:', err.message);
    }
  }

  // Remove cached files
  try {
    const bookDir = path.join(CACHE_DIR, actualId);
    if (fs.existsSync(bookDir)) {
      fs.rmSync(bookDir, { recursive: true, force: true });
    }
  } catch (_) {}

  res.status(200).json({
    success: true,
    message: `Book ${actualId} deleted successfully`
  });
});

/**
 * POST /api/upload
 * Accepts PDF upload (Buffer, binary, or Base64 data URL), stores in Object Storage cache, extracts metadata, saves to database
 */
app.post('/api/upload', async (req, res) => {
  try {
    let pdfBuffer;
    const { fileData, fileName, title, slug, user_id, description } = req.body || {};

    if (fileData) {
      // Base64 Data URL format: "data:application/pdf;base64,JVBERi0x..."
      const base64Data = fileData.replace(/^data:application\/pdf;base64,/, '').replace(/^data:[^;]+;base64,/, '');
      pdfBuffer = Buffer.from(base64Data, 'base64');
    } else if (Buffer.isBuffer(req.body)) {
      pdfBuffer = req.body;
    } else {
      return res.status(400).json({ error: 'No PDF file data provided in request' });
    }

    if (!pdfBuffer || pdfBuffer.length < 10) {
      return res.status(400).json({ error: 'Invalid or empty PDF file payload' });
    }

    const bookId = `book-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const cleanTitle = (title || fileName || 'Uploaded Flipbook').replace(/\.pdf$/i, '').trim();
    const cleanSlug = sanitizeSlug(slug, cleanTitle, bookId);

    const { pageCount, pages } = await convertPdfToFlipbook(bookId, cleanSlug, pdfBuffer);

    const bookData = {
      id: bookId,
      user_id: user_id || 'anonymous',
      title: cleanTitle,
      slug: cleanSlug,
      pdf_url: `/api/books/${bookId}/source.pdf`,
      pdfUrl: `/api/books/${bookId}/source.pdf`,
      cover_url: pages[0] ? pages[0].imageUrl : null,
      description: description || '',
      status: 'live',
      views: 0,
      pageCount: pageCount || 1,
      pages,
      settings: {
        soundEnabled: true,
        theme: 'light',
        allowDownload: true,
        bgType: 'light',
        bgColor: '#F8FAFC',
        accentColor: '#2563EB'
      },
      readerUrl: `/b/${cleanSlug}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await saveBookToStore(bookData);

    return res.status(201).json({
      success: true,
      bookId,
      slug: cleanSlug,
      title: cleanTitle,
      pageCount,
      pdf_url: `/api/books/${bookId}/source.pdf`,
      readerUrl: `/b/${cleanSlug}`,
      book: bookData
    });
  } catch (err) {
    console.error('[PDF Upload Engine Error]:', err);
    return res.status(500).json({ error: err.message || 'PDF upload and processing failed' });
  }
});

/**
 * POST /api/import-pdf-url
 * Validates public PDF URL, downloads & caches PDF, counts pages, and returns READY status with readerUrl.
 */
app.post('/api/import-pdf-url', async (req, res) => {
  const { pdfUrl, title, slug, user_id } = req.body || {};

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
    user_id: user_id || 'anonymous',
    title: cleanTitle,
    slug: cleanSlug,
    sourcePdfUrl: validatedUrl,
    pdf_url: `/api/books/${bookId}/source.pdf`,
    pdfUrl: `/api/books/${bookId}/source.pdf`,
    cover_url: null,
    description: '',
    pageCount: 1,
    status: 'live',
    views: 0,
    pages: [],
    settings: {
      soundEnabled: true,
      theme: 'light',
      allowDownload: true,
      bgType: 'light',
      bgColor: '#F8FAFC',
      accentColor: '#2563EB'
    },
    readerUrl: `/b/${cleanSlug}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
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
      cover_url: pages[0] ? pages[0].imageUrl : null,
      pdf_url: `/api/books/${bookId}/source.pdf`,
      pdfUrl: `/api/books/${bookId}/source.pdf`,
      status: 'live',
      updated_at: new Date().toISOString()
    };

    await saveBookToStore(completedBook);
    console.log(`[PDF Backend] Successfully converted book ${bookId} (${pageCount} pages) - Status: READY`);

    return res.status(200).json({
      success: true,
      bookId,
      slug: cleanSlug,
      title: cleanTitle,
      pageCount,
      status: 'READY',
      pdf_url: `/api/books/${bookId}/source.pdf`,
      pdfUrl: `/api/books/${bookId}/source.pdf`,
      readerUrl: `/b/${cleanSlug}`,
      book: completedBook
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
    readerUrl: book.readerUrl || `/b/${book.slug}`,
    errorMessage: book.errorMessage || null,
    updatedAt: book.updatedAt || book.updated_at
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
    pdf_url: book.pdf_url || `/api/books/${book.id}/source.pdf`,
    pdfUrl: book.pdf_url || `/api/books/${book.id}/source.pdf`,
    pages: book.pages || [],
    settings: book.settings || {},
    readerUrl: book.readerUrl || `/b/${book.slug}`,
    createdAt: book.createdAt || book.created_at
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
// FRONTEND ROUTING & SHORT LINKS (/dashboard, /b/:slug, /view/:id)
// =========================================================================

// Author Dashboard SPA: /dashboard and /workspace
app.get(['/dashboard', '/dashboard/', '/workspace', '/workspace.html', '/Workspace.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'workspace.html'));
});

// Reader short links: /b/:slug, /view/:id, /read/:slug
app.get(['/b/:slug', '/b/:slug/', '/view/:id', '/view/:id/', '/read/:slug', '/read/:slug/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'reader.html'));
});

// Explicit clean page handlers
app.get(['/platform', '/platform.html', '/Platform.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'Platform.html'));
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
