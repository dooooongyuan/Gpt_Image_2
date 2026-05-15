const http = require('http');
const https = require('https');

const PORT = 7070;
const TARGET = 'dm-fox.rjj.cc';

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Serve static files
  if (req.method === 'GET' && req.url === '/') {
    const fs = require('fs');
    const path = require('path');
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // Proxy API requests
  if (req.url.startsWith('/codex/')) {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const buf = Buffer.concat(body);
      const headers = {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Content-Length': buf.length,
        'Authorization': req.headers['authorization'] || '',
      };

      const options = {
        hostname: TARGET,
        port: 443,
        path: req.url,
        method: req.method,
        headers,
      };

      const proxy = https.request(options, proxyRes => {
        res.writeHead(proxyRes.statusCode, { 'Content-Type': proxyRes.headers['content-type'] || 'application/json' });
        proxyRes.pipe(res);
      });

      proxy.on('error', err => {
        res.writeHead(502);
        res.end(JSON.stringify({ error: { message: err.message } }));
      });

      proxy.end(buf);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n  Local server running at:\n`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log(`  Proxy: /codex/* → https://${TARGET}/codex/*\n`);
});
