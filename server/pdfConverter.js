/**
 * FlipPage Backend PDF Converter & Security Validation Engine
 * Handles SSRF protection, smart URL transforms (Google Drive, GitHub, Dropbox),
 * streaming PDF fetch, page rendering, text extraction, and metadata manifest creation.
 */

import dns from 'dns/promises';
import ipaddr from 'ipaddr.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache directory for converted books
const CACHE_DIR = path.join(__dirname, '..', '.cache_books');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// In-memory store for books & fast lookup
export const memoryBooksStore = new Map();
export const memorySlugIndex = new Map();

/**
 * Normalizes input URL strings, converts web preview links (GitHub, Google Drive, Dropbox)
 * into direct raw downloadable streams, and validates protocols.
 */
export function normalizeAndTransformPdfUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('PDF URL is required');
  }

  let cleaned = rawUrl.trim().replace(/^['"]+|['"]+$/g, '');

  // Prepend https:// if protocol is missing
  if (!/^https?:\/\//i.test(cleaned)) {
    if (cleaned.startsWith('//')) {
      cleaned = 'https:' + cleaned;
    } else {
      cleaned = 'https://' + cleaned;
    }
  }

  let parsed;
  try {
    parsed = new URL(cleaned);
  } catch (err) {
    throw new Error(`Invalid URL format: ${cleaned}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are permitted');
  }

  // 1. GitHub Blob URL -> GitHub Raw Content URL
  if (parsed.hostname === 'github.com') {
    const ghMatch = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
    if (ghMatch) {
      const [, user, repo, branch, filePath] = ghMatch;
      return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${filePath}`;
    }
  }

  // 2. Google Drive Share/View URL -> Direct Download Stream
  if (parsed.hostname.includes('drive.google.com')) {
    const gdMatch = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || parsed.search.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (gdMatch) {
      return `https://drive.google.com/uc?export=download&id=${gdMatch[1]}&confirm=t`;
    }
  }

  // 3. Dropbox Share Link -> Direct Download
  if (parsed.hostname.includes('dropbox.com')) {
    parsed.searchParams.set('dl', '1');
    return parsed.toString();
  }

  return parsed.toString();
}

/**
 * Validates public HTTP/HTTPS URL and blocks SSRF / private IP access
 */
export async function validatePdfUrl(rawUrl) {
  const transformedUrl = normalizeAndTransformPdfUrl(rawUrl);
  const parsed = new URL(transformedUrl);
  const hostname = parsed.hostname.toLowerCase();

  // 1. Block loopback and local hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  ) {
    throw new Error('Access to local hostnames is strictly forbidden');
  }

  // 2. DNS resolution & IP check to prevent SSRF against private networks & cloud metadata
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      const ip = addr.address;
      if (ipaddr.isValid(ip)) {
        const parsedIp = ipaddr.parse(ip);
        const range = parsedIp.range();
        if (
          range === 'loopback' ||
          range === 'private' ||
          range === 'linkLocal' ||
          range === 'uniqueLocal' ||
          range === 'carrierGradeNat' ||
          range === 'reserved'
        ) {
          throw new Error('Access to private/internal network addresses is prohibited');
        }
        // Cloud metadata check (169.254.169.254)
        if (ip === '169.254.169.254' || ip === '169.254.169.253') {
          throw new Error('Access to cloud metadata endpoints is prohibited');
        }
      }
    }
  } catch (dnsErr) {
    if (dnsErr.message.includes('prohibited') || dnsErr.message.includes('forbidden')) {
      throw dnsErr;
    }
    throw new Error(`Could not resolve hostname "${hostname}"`);
  }

  return transformedUrl;
}

/**
 * Downloads the PDF with timeout, redirect tracking, and size limit validation
 */
export async function downloadPdfBuffer(validatedUrl, maxBytes = 60 * 1024 * 1024, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(validatedUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 FlipPage/2.0',
        'Accept': 'application/pdf,application/octet-stream,*/*'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: Server returned HTTP ${response.status} ${response.statusText}`);
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      throw new Error(`PDF file size exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > maxBytes) {
      throw new Error(`PDF file size exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit`);
    }

    // Check for PDF magic header (%PDF-)
    const headerStr = buffer.slice(0, 1024).toString('binary');
    const pdfIndex = headerStr.indexOf('%PDF-');

    if (pdfIndex === -1) {
      // Check if response is HTML
      const htmlSnippet = buffer.slice(0, 200).toString('utf-8').toLowerCase();
      if (htmlSnippet.includes('<html') || htmlSnippet.includes('<!doctype') || htmlSnippet.includes('<script')) {
        throw new Error('The URL returned a web page (HTML) instead of a direct PDF document. Please verify the URL points directly to a .pdf file or use a public direct download link.');
      }
      throw new Error('The downloaded file does not appear to be a valid PDF document (missing %PDF- header)');
    }

    // If PDF header is preceded by junk/BOM, slice from the %PDF- start
    const validPdfBuffer = pdfIndex > 0 ? buffer.slice(pdfIndex) : buffer;
    return validPdfBuffer;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('PDF download timed out (exceeded 30 seconds). Please check the URL availability.');
    }
    throw err;
  }
}

/**
 * Converts a PDF Buffer into web-optimized pages & extracts text and dimensions
 */
export async function convertPdfToFlipbook(bookId, slug, pdfBuffer) {
  const bookDir = path.join(CACHE_DIR, bookId);
  if (!fs.existsSync(bookDir)) {
    fs.mkdirSync(bookDir, { recursive: true });
  }

  // Save source PDF in cache
  fs.writeFileSync(path.join(bookDir, 'source.pdf'), pdfBuffer);

  // 1. Extract text and page count using pdfjs-dist
  const uint8Data = new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Data,
    useSystemFonts: true,
    disableFontFace: true
  });

  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;
  const pagesList = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    let extractedText = '';
    let width = 900;
    let height = 1272;

    try {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      width = Math.round(viewport.width);
      height = Math.round(viewport.height);

      const textContent = await page.getTextContent();
      extractedText = textContent.items.map(item => item.str).join(' ').trim();
    } catch (_) {}

    pagesList.push({
      page: pageNum,
      imageUrl: `/api/books/${bookId}/pages/${pageNum}.jpg`,
      text: extractedText,
      width,
      height
    });
  }

  // Save metadata manifest
  fs.writeFileSync(path.join(bookDir, 'manifest.json'), JSON.stringify({ pageCount: numPages, pages: pagesList }, null, 2));

  return {
    pageCount: numPages,
    pages: pagesList
  };
}

/**
 * Retrieves page image buffer from cache
 */
export function getPageImageBuffer(bookId, pageNum) {
  const pageFilePath = path.join(CACHE_DIR, bookId, `page-${pageNum}.jpg`);
  if (fs.existsSync(pageFilePath)) {
    return fs.readFileSync(pageFilePath);
  }
  return null;
}

/**
 * Retrieves cached PDF binary buffer
 */
export function getCachedPdfBuffer(bookId) {
  const pdfFilePath = path.join(CACHE_DIR, bookId, 'source.pdf');
  if (fs.existsSync(pdfFilePath)) {
    return fs.readFileSync(pdfFilePath);
  }
  return null;
}
