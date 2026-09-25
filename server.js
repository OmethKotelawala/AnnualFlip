import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Explicit clean route handlers
app.get(['/workspace', '/workspace.html', '/Workspace.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'Workspace.html'));
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

// Serve all static files from root directory
app.use(express.static(__dirname));

// Send index.html for any unhandled routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`AnnualFlip server listening on http://${HOST}:${PORT}`);
});
