/**
 * SW-4 | Space Habitat Layout Creator - Node.js Server & REST API
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const { db, seedDatabaseIfEmpty } = require('./src/db');
const { runValidation } = require('./src/validation');

// Auto-seed database on first startup
seedDatabaseIfEmpty(runValidation);

const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

function serveStaticFile(reqPath, res) {
  let safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safePath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS & Options
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    // 1. API: Validate Layout
    if (pathname === '/api/layouts/validate' && req.method === 'POST') {
      const body = await parseRequestBody(req);
      const validation = runValidation(
        body.crewSize || 4,
        body.missionLengthDays || 30,
        body.habitatShape || 'cylinder',
        body.zones || []
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(validation));
      return;
    }

    // 2. API: Save Layout
    if (pathname === '/api/layouts' && req.method === 'POST') {
      const body = await parseRequestBody(req);
      const validation = runValidation(
        body.crewSize || 4,
        body.missionLengthDays || 30,
        body.habitatShape || 'cylinder',
        body.zones || []
      );

      const newLayout = {
        id: 'layout_' + Date.now(),
        name: body.name || `Design ${new Date().toLocaleTimeString()}`,
        crewSize: body.crewSize || 4,
        missionLengthDays: body.missionLengthDays || 30,
        habitatShape: body.habitatShape || 'cylinder',
        zones: body.zones || [],
        score: validation.score,
        metrics: validation,
        createdAt: new Date().toISOString()
      };

      db.insert(newLayout);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newLayout));
      return;
    }

    // 3. API: Fetch All Saved Layouts
    if (pathname === '/api/layouts' && req.method === 'GET') {
      const all = db.getAll();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(all));
      return;
    }

    // 4. API: Fetch Specific Layout
    if (pathname.startsWith('/api/layouts/') && req.method === 'GET') {
      const id = pathname.replace('/api/layouts/', '');
      const layout = db.getById(id);
      if (!layout) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Layout not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(layout));
      return;
    }

    // 5. API: Delete Specific Layout
    if (pathname.startsWith('/api/layouts/') && req.method === 'DELETE') {
      const id = pathname.replace('/api/layouts/', '');
      db.delete(id);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: id }));
      return;
    }

    // 6. Serve Static Frontend Files
    if (req.method === 'GET') {
      serveStaticFile(pathname, res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Route not found' }));
  } catch (err) {
    console.error('[SERVER ERROR]', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('===============================================================');
  console.log(`🚀 [SW-4] Space Habitat Layout Creator & Habitability Engine`);
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🛰️ Open http://localhost:${PORT} in your web browser`);
  console.log('===============================================================');
});
