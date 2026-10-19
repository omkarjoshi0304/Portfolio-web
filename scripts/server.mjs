import { createServer } from 'node:http';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { build, output } from './build.mjs';
import { securityHeaders } from './http-headers.mjs';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.woff2': 'font/woff2' };

export async function handleRequest(request, response, { directory = output } = {}) {
  for (const [name, value] of Object.entries(securityHeaders)) response.setHeader(name, value);
  response.setHeader('Cache-Control', 'no-cache');
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end('Method not allowed');
    return;
  }
  try {
    // Canonicalize the root too: macOS /var and /tmp can alias /private paths.
    const rootDirectory = await realpath(directory);
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname.includes('\0') || pathname.includes('\\') || pathname.startsWith('//')) throw new URIError('Invalid path');
    let filename = resolve(rootDirectory, `.${pathname}`);
    if (filename !== rootDirectory && !filename.startsWith(rootDirectory + sep)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const info = await stat(filename);
    if (info.isDirectory()) {
      if (!pathname.endsWith('/')) {
        response.writeHead(308, { Location: `${encodeURI(pathname)}/` }); response.end(); return;
      }
      filename = join(filename, 'index.html');
    }
    const actual = await realpath(filename);
    if (!actual.startsWith(rootDirectory + sep)) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const body = await readFile(actual);
    response.writeHead(200, { 'Content-Type': types[extname(filename)] || 'application/octet-stream', 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    if (error instanceof URIError) {
      response.writeHead(400); response.end('Invalid URL'); return;
    }
    if (error.code && !['ENOENT', 'ENOTDIR'].includes(error.code)) {
      console.error(error.message); response.writeHead(500); response.end('Server error'); return;
    }
    let body;
    try { body = await readFile(join(directory, '404.html')); }
    catch {
      // A manual rebuild can briefly remove the output directory. Keep the
      // preview process alive and let the browser retry after it completes.
      response.writeHead(503, { 'Content-Type': types['.txt'], 'Retry-After': '1' });
      response.end(request.method === 'HEAD' ? undefined : 'Site build unavailable. Please retry.');
      return;
    }
    response.writeHead(404, { 'Content-Type': types['.html'], 'Content-Length': body.length });
    response.end(request.method === 'HEAD' ? undefined : body);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const { values } = parseArgs({ options: {
    port: { type: 'string', default: process.env.PORT || '3000' },
    host: { type: 'string', default: '127.0.0.1' },
    preview: { type: 'boolean', default: false },
  } });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Use a valid port between 1 and 65535.');
  if (!values.preview) await build();
  else {
    try { await access(join(output, 'index.html')); }
    catch { throw new Error('No build found. Run npm run build before previewing.'); }
  }
  const server = createServer(handleRequest);
  server.listen(port, values.host, () => console.log(`Portfolio ready at http://${values.host}:${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit()));
}
