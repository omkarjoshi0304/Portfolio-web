import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, readdir, rm, writeFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseDocument, readCollection, safeUrl } from '../src/content.mjs';
import { build as buildSite, root } from '../scripts/build.mjs';
import { handleRequest } from '../scripts/server.mjs';
import { artworks } from '../src/data/profile.mjs';

let testDirectory;
let output;
let postsDirectory;
const build = options => buildSite({ directory: output, postsDirectory, ...options });

before(async () => {
  testDirectory = await mkdtemp(join(tmpdir(), 'portfolio-site-tests-'));
  output = join(testDirectory, 'site');
  postsDirectory = join(testDirectory, 'posts');
  await cp(join(root, 'content/posts'), postsDirectory, { recursive: true });
  await build();
});
after(async () => { if (testDirectory) await rm(testDirectory, { recursive: true, force: true }); });

const document = body => `---\ntitle: Test note\nsummary: A short summary.\ndate: '2020-01-01'\ntags: [AI, Cloud]\n---\n${body}`;

test('Markdown supports articles while escaping executable HTML and unsafe URLs', () => {
  const doc = parseDocument(document('## Heading\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)\n\n![bad](data:image/svg+xml;base64,evil)\n\n[good](https://example.com/?a=1&b=2)\n\n```python\nprint("hello")\n```'), 'test-note.md');
  assert.match(doc.html, /<h2>Heading<\/h2>/);
  assert.match(doc.html, /&lt;script&gt;/);
  assert.doesNotMatch(doc.html, /<script|href="javascript:|src="data:/);
  assert.match(doc.html, /href="https:\/\/example.com\/\?a=1&amp;b=2"/);
  assert.match(doc.html, /<code class="language-python">/);
});

test('link policy rejects scripts, encoded schemes, protocol-relative URLs, and control characters', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', '//evil.example', '\\evil.example', 'https://good.example\n.evil.example', 'javascript&#58;alert(1)', 'javascript%3Aalert(1)']) assert.equal(safeUrl(value), null, value);
  for (const value of ['/images/photo.webp', '#topic', 'https://example.com/', 'mailto:hello@example.com']) assert.ok(safeUrl(value), value);
});

test('bad metadata fails early with a useful error', () => {
  assert.throws(() => parseDocument('No metadata', 'note.md'), /front matter/);
  assert.throws(() => parseDocument(document('hi').replace('title: Test note', 'title: []'), 'note.md'), /title is required/);
  assert.throws(() => parseDocument(document('hi').replace('tags: [AI, Cloud]', 'tags: AI'), 'note.md'), /list of strings/);
  assert.throws(() => parseDocument(document('hi').replace('tags: [AI, Cloud]', 'draft: "false"'), 'note.md'), /draft must be/);
  assert.throws(() => parseDocument(document('hi'), '../Bad Name.md'), /hyphenated filename/);
  assert.throws(() => parseDocument(document('hi').replace('tags: [AI, Cloud]', 'demo: javascript:alert(1)'), 'note.md'), /HTTP/);
});

test('front matter does not enable YAML merge keys or ordered-map tags', () => {
  const merged = '---\nbase: &base {title: Merged title}\n<<: *base\nsummary: A short summary\n---\nText';
  assert.throws(() => parseDocument(merged, 'merge.md'), /title is required/);
  assert.throws(() => parseDocument(document('Text').replace('tags: [AI, Cloud]', 'extra: !!omap [{a: 1}]'), 'ordered.md'), /unknown tag/);
});

test('published posts sort newest first; drafts and future posts stay private', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'portfolio-posts-'));
  try {
    await writeFile(join(directory, 'old.md'), document('Old article'));
    await writeFile(join(directory, 'new.md'), document('New article').replace('2020-01-01', '2021-01-01'));
    await writeFile(join(directory, 'draft.md'), document('Private').replace('tags: [AI, Cloud]', 'draft: true'));
    await writeFile(join(directory, 'future.md'), document('Future').replace('2020-01-01', '2999-01-01'));
    assert.deepEqual((await readCollection(directory, 'posts')).map(post => post.slug), ['new', 'old']);
    await writeFile(join(directory, 'bad-date.md'), document('Bad date').replace('2020-01-01', '2020-02-31'));
    await assert.rejects(readCollection(directory, 'posts'), /valid quoted/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('generated pages include the CV, project links, correct semantics, and no draft article', async () => {
  const homepage = await readFile(join(output, 'index.html'), 'utf8');
  assert.match(homepage, /Omkar Joshi/);
  assert.match(homepage, /Currently building/);
  assert.match(homepage, /AerialMind/);
  assert.match(homepage, /Red Hat/);
  assert.match(homepage, /width=device-width/);
  assert.equal((homepage.match(/<h1(?:\s|>)/g) || []).length, 1);
  assert.match(homepage, /Skip to content/);
  assert.match(homepage, /aria-label="Main navigation"/);
  assert.match(homepage, /aria-pressed="true"/);
  assert.equal((homepage.match(/data-gallery-slide /g) || []).length, artworks.length);
  assert.match(homepage, /src="\/gallery.js" type="module"/);
  assert.doesNotMatch(homepage, /data-gallery-follow|data-gallery-prev|data-gallery-next/);
  assert.doesNotMatch(homepage, /My first note|2026-10-18/);
  const project = await readFile(join(output, 'projects/aerialmind/index.html'), 'utf8');
  assert.match(project, /https:\/\/github.com\/omkarjoshi0304\/aerialmind/);
  const resume = await readFile(join(output, 'resume/index.html'), 'utf8');
  for (const text of ['Dublin City University', 'VCET', 'Technical skills', 'Achievements', 'Teaching Assistant']) assert.ok(resume.includes(text), text);
  await assert.rejects(readFile(join(output, 'blog/my-first-note/index.html')), /ENOENT/);
});

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(item => item.isDirectory() ? htmlFiles(join(directory, item.name)) : item.name.endsWith('.html') ? [join(directory, item.name)] : []));
  return nested.flat();
}

test('every generated internal link and asset resolves, including fragment targets', async () => {
  for (const file of await htmlFiles(output)) {
    const html = await readFile(file, 'utf8');
    for (const match of html.matchAll(/(?:href|src)="([^\"]+)"/g)) {
      const href = match[1];
      if (href.startsWith('#')) {
        assert.ok(html.includes(`id="${href.slice(1)}"`), `${file}: missing ${href}`);
      } else if (href.startsWith('/')) {
        const [pathname] = href.split('#');
        const target = join(output, pathname, pathname.endsWith('/') ? 'index.html' : '');
        await assert.doesNotReject(readFile(target), `${file}: missing ${href}`);
      }
    }
  }
});

async function request(url, method = 'GET', directory = output) {
  const result = { headers: {}, status: 200, body: undefined };
  const response = {
    setHeader(key, value) { result.headers[key.toLowerCase()] = value; },
    writeHead(status, headers = {}) { result.status = status; for (const [key, value] of Object.entries(headers)) this.setHeader(key, value); },
    end(body) { result.body = body?.toString(); },
  };
  await handleRequest({ url, method }, response, { directory });
  return result;
}

test('static handler serves pages, HEAD, assets, redirects, and a real 404', async () => {
  const home = await request('/');
  assert.equal(home.status, 200);
  assert.match(home.body, /Omkar Joshi/);
  assert.equal(home.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(home.headers['x-content-type-options'], 'nosniff');
  assert.equal((await request('/', 'HEAD')).body, undefined);
  assert.equal((await request('/styles.css')).headers['content-type'], 'text/css; charset=utf-8');
  assert.equal((await request('/projects/aerialmind')).status, 308);
  assert.equal((await request('/missing/')).status, 404);
  assert.equal((await request('/missing/', 'HEAD')).body, undefined);
  assert.equal((await request('/', 'POST')).status, 405);
  assert.equal((await request('/%E0%A4')).status, 400);
});

test('static handler does not expose source files, encoded traversal, or symlink escapes', async () => {
  assert.equal((await request('/src/data/profile.mjs')).status, 404);
  assert.equal((await request('/..%2fpackage.json')).status, 403);
  assert.equal((await request('/%00')).status, 400);
  assert.equal((await request('/%2fprojects')).status, 400);
  const link = join(output, 'outside.txt');
  try {
    await symlink(join(root, 'package.json'), link);
    assert.equal((await request('/outside.txt')).status, 403);
  } finally { await rm(link, { force: true }); }
});

test('an unavailable build returns a retry response instead of rejecting the request', async () => {
  const directory = join(testDirectory, 'not-built');
  const response = await request('/', 'GET', directory);
  assert.equal(response.status, 503);
  assert.equal(response.headers['retry-after'], '1');
  assert.match(response.body, /Site build unavailable/);
  assert.equal((await request('/', 'HEAD', directory)).body, undefined);
});

test('static hosting receives the same security policy as the local preview', async () => {
  const headersFile = await readFile(join(output, '_headers'), 'utf8');
  const response = await request('/');
  assert.ok(headersFile.startsWith('/*\n'));
  for (const name of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy']) {
    assert.ok(headersFile.includes(`  ${name}: ${response.headers[name.toLowerCase()]}\n`));
  }
  assert.match(headersFile, /script-src 'self'/);
  assert.match(headersFile, /frame-ancestors 'none'/);
  assert.doesNotMatch(headersFile, /unsafe-inline|unsafe-eval/);
});

test('deployment origin produces canonical links, a sitemap, and absolute RSS URLs', async () => {
  const previous = process.env.SITE_URL;
  try {
    process.env.SITE_URL = 'https://portfolio.example';
    await build();
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /rel="canonical" href="https:\/\/portfolio.example\/"/);
    assert.match(await readFile(join(output, 'sitemap.xml'), 'utf8'), /https:\/\/portfolio.example\/projects\/aerialmind\//);
    assert.match(await readFile(join(output, 'feed.xml'), 'utf8'), /https:\/\/portfolio.example\/feed.xml/);
    process.env.SITE_URL = 'https://portfolio.example/subdirectory';
    await assert.rejects(build(), /HTTP\(S\) origin/);
  } finally {
    if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous;
    await build();
  }
});

test('publishing a real Markdown file creates an article, archive entry, and RSS item', async () => {
  const slug = `verification-note-${process.pid}`;
  const filename = join(postsDirectory, `${slug}.md`);
  await writeFile(filename, document('## A published example\n\nThis note is only used during verification.'), { flag: 'wx' });
  try {
    await build();
    assert.match(await readFile(join(output, 'blog', slug, 'index.html'), 'utf8'), /<h2>A published example<\/h2>/);
    assert.match(await readFile(join(output, 'blog', slug, 'index.html'), 'utf8'), /property="og:type" content="article"/);
    assert.match(await readFile(join(output, 'blog', slug, 'index.html'), 'utf8'), /property="article:published_time" content="2020-01-01T12:00:00Z"/);
    assert.ok((await readFile(join(output, 'blog/index.html'), 'utf8')).includes(`/blog/${slug}/`));
    assert.ok((await readFile(join(output, 'feed.xml'), 'utf8')).includes(`/blog/${slug}/`));
    assert.match(await readFile(join(output, 'blog/index.html'), 'utf8'), /id="post-search"/);
  } finally {
    await rm(filename);
    await build();
  }
});

test('Netlify uses its main site URL and respects an explicit SITE_URL', async () => {
  const names = ['SITE_URL', 'NETLIFY', 'URL'];
  const previous = new Map(names.map(name => [name, process.env[name]]));
  try {
    delete process.env.SITE_URL;
    process.env.NETLIFY = 'true';
    process.env.URL = 'https://portfolio-demo.netlify.app';
    await build();
    assert.match(await readFile(join(output, 'feed.xml'), 'utf8'), /https:\/\/portfolio-demo.netlify.app\/feed.xml/);
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /rel="canonical" href="https:\/\/portfolio-demo.netlify.app\/"/);
    process.env.SITE_URL = 'https://portfolio.example';
    await build();
    assert.match(await readFile(join(output, 'feed.xml'), 'utf8'), /https:\/\/portfolio.example\/feed.xml/);
    delete process.env.SITE_URL;
    delete process.env.NETLIFY;
    await build();
    assert.match(await readFile(join(output, 'feed.xml'), 'utf8'), /http:\/\/localhost:3000\/feed.xml/);
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
    await build();
  }
});

test('isolated builds preserve sibling output and a bad draft preserves the last build', async () => {
  const homepage = await readFile(join(output, 'index.html'), 'utf8');
  await build({ directory: join(testDirectory, 'second-site') });
  assert.equal(await readFile(join(output, 'index.html'), 'utf8'), homepage);
  const badDraft = join(postsDirectory, 'invalid-draft.md');
  try {
    await writeFile(badDraft, 'Invalid metadata');
    await assert.rejects(build(), /front matter/);
    assert.equal(await readFile(join(output, 'index.html'), 'utf8'), homepage);
  } finally { await rm(badDraft); }
});
