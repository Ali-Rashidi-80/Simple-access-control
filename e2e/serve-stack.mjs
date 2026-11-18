import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../web/out');
const PORT = Number.parseInt(process.env.PORT || '15173', 10);
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';
const BACKEND_PORT = Number.parseInt(process.env.BACKEND_PORT || '18000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const COLLIDING_UI_ROUTES = new Set(['/users', '/logs', '/settings', '/profile']);
const PROXY_PREFIXES = ['/api/', '/auth/', '/users/', '/logs/', '/settings/', '/profile/', '/uploads/'];

function stripTrailingSlash(p) {
  if (p.length > 1 && p.endsWith('/')) {
    return p.slice(0, -1);
  }
  return p;
}

function safeStaticPath(relPath) {
  const cleaned = relPath.replace(/^\/+/, '');
  const resolved = path.resolve(OUT_DIR, cleaned);
  if (resolved !== OUT_DIR && !resolved.startsWith(OUT_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  fs.createReadStream(filePath).pipe(res);
}

function shouldServeStatic(req, pathname) {
  // Next.js App Router RSC payloads and static route files inside colliding prefixes.
  if (/^\/(users|logs|settings|profile)\/index\.(html|txt)$/.test(pathname)) {
    return true;
  }
  // Browser top-level navigation / page refresh to /users, /logs, /settings, /profile.
  const baseRoute = stripTrailingSlash(pathname);
  const accept = (req.headers.accept || '').toLowerCase();
  if (req.method === 'GET' && COLLIDING_UI_ROUTES.has(baseRoute) && accept.includes('text/html')) {
    return true;
  }
  return false;
}

function shouldProxy(req, pathname) {
  if (shouldServeStatic(req, pathname)) {
    return false;
  }
  if (pathname === '/health' || pathname === '/api') {
    return true;
  }
  if (PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  const baseRoute = stripTrailingSlash(pathname);
  if (COLLIDING_UI_ROUTES.has(baseRoute) || baseRoute === '/auth' || baseRoute === '/uploads') {
    return true;
  }
  return false;
}

function proxyHttp(req, res, pathname, search) {
  const targetPath = pathname === '/api' ? `/${search}` : `${pathname}${search}`;
  const headers = { ...req.headers };
  headers['x-forwarded-host'] = req.headers.host || `127.0.0.1:${PORT}`;
  headers['x-forwarded-proto'] = 'http';
  headers['x-real-ip'] = req.socket.remoteAddress || '127.0.0.1';

  const upstreamReq = http.request(
    {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      method: req.method,
      path: targetPath,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstreamReq.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ detail: `Bad Gateway: ${err.message}` }));
  });

  req.pipe(upstreamReq);
}

function serveStatic(res, pathname) {
  let candidate = null;
  if (pathname === '/') {
    candidate = safeStaticPath('index.html');
  } else {
    const direct = safeStaticPath(pathname);
    if (direct && fs.existsSync(direct) && fs.statSync(direct).isFile()) {
      candidate = direct;
    } else {
      const routeIndex = safeStaticPath(path.posix.join(stripTrailingSlash(pathname), 'index.html'));
      if (routeIndex && fs.existsSync(routeIndex) && fs.statSync(routeIndex).isFile()) {
        candidate = routeIndex;
      }
    }
  }

  if (candidate) {
    serveFile(res, candidate, 200);
    return;
  }

  const notFoundPage = safeStaticPath('404/index.html');
  if (notFoundPage && fs.existsSync(notFoundPage)) {
    serveFile(res, notFoundPage, 404);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);
  // Serve-stack own health check so Playwright webServer readiness doesn't depend on backend
  if (pathname === '/__serve_health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"status":"ok"}');
    return;
  }
  if (shouldProxy(req, pathname)) {
    proxyHttp(req, res, pathname, url.search);
    return;
  }
  serveStatic(res, pathname);
});

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (!url.pathname.startsWith('/ws')) {
    socket.destroy();
    return;
  }

  const upstream = net.connect(BACKEND_PORT, BACKEND_HOST, () => {
    const lines = [`${req.method} ${req.url} HTTP/${req.httpVersion}`];
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      lines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`);
    }
    lines.push('', '');
    upstream.write(lines.join('\r\n'));
    if (head && head.length > 0) {
      upstream.write(head);
    }
    upstream.pipe(socket);
    socket.pipe(upstream);
  });

  const cleanup = () => {
    if (!socket.destroyed) socket.destroy();
    if (!upstream.destroyed) upstream.destroy();
  };
  upstream.on('error', cleanup);
  socket.on('error', cleanup);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`E2E static + proxy server listening on http://127.0.0.1:${PORT} -> ${BACKEND_HOST}:${BACKEND_PORT}`);
});
