// Local dev server — serves static files with no-cache headers on port 3000
const http = require('http');
const fs   = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.json': 'application/json',
};

http.createServer(function (req, res) {
  let urlPath = req.url.split('?')[0];
  let filePath = path.join(__dirname, urlPath);

  if (filePath.endsWith('/') || !path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, function (err, data) {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type':  MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma':        'no-cache',
    });
    res.end(data);
  });
}).listen(3000, function () {
  console.log('Chisel & Groove dev server running at http://localhost:3000 (no-cache)');
});
