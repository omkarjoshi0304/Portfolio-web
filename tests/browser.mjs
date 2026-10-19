import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, firefox, webkit } from 'playwright';
import { build, root } from '../scripts/build.mjs';
import { handleRequest } from '../scripts/server.mjs';
import { layout, blogPage, postPage } from '../src/templates.mjs';
import { parseDocument } from '../src/content.mjs';
import { artworks } from '../src/data/profile.mjs';

const origin = 'https://portfolio.test';
const artifactPath = join(root, 'test-results');
const engine = process.env.TEST_BROWSER || 'chromium';
const engines = { chromium, firefox, webkit };
if (!engines[engine]) throw new Error('TEST_BROWSER must be chromium, firefox, or webkit.');
const browserOutput = await mkdtemp(join(tmpdir(), 'portfolio-browser-tests-'));

// Fulfil requests through the actual static handler. No test server needs to
// open a port, and the pages still run at a normal secure origin in the browser.
async function fulfilLocal(route) {
  const request = route.request();
  const headers = {};
  let status = 200;
  let body;
  await handleRequest({ url: new URL(request.url()).pathname, method: request.method() }, {
    setHeader(key, value) { headers[key] = String(value); },
    writeHead(code, values = {}) { status = code; for (const [key, value] of Object.entries(values)) headers[key] = String(value); },
    end(value) { body = value; },
  }, { directory: browserOutput });
  await route.fulfill({ status, headers, body });
}

async function checkDesktopGalleryAlignment(page, width) {
  const initial = await page.evaluate(async () => {
    await document.fonts.ready;
    const panel = document.querySelector('[data-art-gallery]').getBoundingClientRect();
    return {
      top: panel.top, mainTop: document.querySelector('main').getBoundingClientRect().top,
      stickyTop: parseFloat(getComputedStyle(document.querySelector('[data-art-gallery]')).top),
    };
  });
  assert.ok(Math.abs(initial.top - initial.mainTop) < 1, `gallery starts aligned with the introduction at ${width}px`);
  assert.ok(initial.stickyTop >= 0 && initial.stickyTop <= 32, `gallery leaves only a small top inset at ${width}px`);

  // Check a small first scroll, the middle of the page, and the footer, then
  // reverse. The first diagram stays put until the window reaches its inset.
  for (const progress of [.01, .25, .5, .75, 1, .5, 0]) {
    const bounds = await page.evaluate(async fraction => {
      const contact = document.querySelector('.contact-section');
      const end = contact.getBoundingClientRect().bottom + scrollY - innerHeight;
      window.scrollTo({ top: Math.max(0, end * fraction), behavior: 'instant' });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const panel = document.querySelector('[data-art-gallery]').getBoundingClientRect();
      return {
        top: panel.top, bottom: panel.bottom, height: panel.height,
        containerBottom: document.querySelector('.page-grid').getBoundingClientRect().bottom,
        footerTop: document.querySelector('.site-footer').getBoundingClientRect().top,
        viewportHeight: innerHeight, scrollY,
        diagramProgress: Number(document.querySelector('[data-art-gallery]').dataset.scrollProgress),
      };
    }, progress);
    const expectedTop = Math.min(Math.max(initial.top - bounds.scrollY, initial.stickyTop), bounds.containerBottom - bounds.height);
    assert.ok(Math.abs(bounds.top - expectedTop) < 1, `gallery alignment at ${width}px, page progress ${progress}`);
    if (bounds.scrollY < initial.top - initial.stickyTop) {
      assert.equal(bounds.diagramProgress, 0, 'diagrams wait for the window to reach its sticky position');
    }
    assert.ok(bounds.bottom <= bounds.viewportHeight + 1, `gallery caption stays visible at ${width}px`);
    assert.ok(bounds.bottom <= bounds.footerTop, `gallery clears the footer at ${width}px`);
  }
}

let browser;
try {
  const { posts: publishedPosts } = await build({ directory: browserOutput });
  await mkdir(artifactPath, { recursive: true });
  let executablePath = process.env.CHROME_PATH;
  if (!executablePath && engine === 'chromium') {
    const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    try { await access(macChrome); executablePath = macChrome; } catch { /* Use Playwright's installed browser. */ }
  }
  browser = await engines[engine].launch({ headless: true, ...(executablePath && engine === 'chromium' ? { executablePath } : {}) });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.route(`${origin}/**`, fulfilLocal);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
    for (const path of ['/', '/projects/', '/projects/aerialmind/', '/blog/', '/resume/', ...publishedPosts.map(post => `/blog/${post.slug}/`)]) {
      await page.goto(`${origin}${path}`, { waitUntil: 'load' });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
      assert.equal(overflow, false, `${path} overflows at ${width}px`);
      assert.equal(await page.locator('h1').count(), 1);
      if (path.startsWith('/blog/') && path !== '/blog/') {
        const diagram = page.locator('.article-prose img').first();
        if (await diagram.count()) {
          assert.ok(await diagram.getAttribute('alt'), 'article images have alt text');
          await diagram.scrollIntoViewIfNeeded();
          await diagram.evaluate(image => image.decode());
          const articleImage = await diagram.boundingBox();
          assert.ok(articleImage.width <= width, `article diagram fits at ${width}px`);
        }
      }
    }
    await page.goto(origin, { waitUntil: 'load' });
    if (width > 850) await checkDesktopGalleryAlignment(page, width);
    await page.screenshot({ path: join(artifactPath, `${engine}-home-${width}.png`), fullPage: true });
  }

  await page.getByRole('button', { name: 'Long', exact: true }).click();
  assert.equal(await page.locator('#bio-long').isVisible(), true);
  assert.equal(await page.locator('#bio-short').isVisible(), false);
  await page.getByRole('button', { name: 'Short', exact: true }).click();
  assert.equal(await page.locator('#bio-short').isVisible(), true);
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await page.reload();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.screenshot({ path: join(artifactPath, `${engine}-home-light.png`), fullPage: true });
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();

  const gallery = page.locator('[data-art-gallery]');
  assert.equal(await gallery.locator('button').count(), 0, 'the page is the only gallery scroll control');

  async function scrollThroughGallery(fraction, reduced = false) {
    await page.evaluate(progress => {
      const contact = document.querySelector('.contact-section');
      const end = contact.getBoundingClientRect().bottom + window.scrollY - innerHeight;
      const gallery = document.querySelector('[data-art-gallery]');
      const style = getComputedStyle(gallery);
      const containerTop = gallery.parentElement.getBoundingClientRect().top + scrollY;
      const start = style.position === 'sticky' ? Math.max(0, containerTop - (parseFloat(style.top) || 0)) : 0;
      window.scrollTo({ top: progress === 0 ? 0 : Math.max(0, start + (end - start) * progress), behavior: 'instant' });
    }, fraction);
    await page.waitForFunction(({ progress, reduced }) => {
      const track = document.querySelector('.art-track');
      const position = reduced ? Math.round(progress * 3) / 3 : progress;
      return Math.abs(track.scrollTop - position * (track.scrollHeight - track.clientHeight)) < 3;
    }, { progress: fraction, reduced });
  }

  // Automatic updates work even with the reduced-motion context used above.
  await scrollThroughGallery(1, true);
  assert.equal(await gallery.getAttribute('data-active-index'), '3');
  await scrollThroughGallery(0, true);
  assert.equal(await gallery.getAttribute('data-active-index'), '0');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const progress of [.25, .5, .75, 1, .5, 0]) await scrollThroughGallery(progress);
  const beforeWheel = await page.evaluate(() => scrollY);
  await page.locator('.art-track').hover();
  await page.mouse.wheel(0, 400);
  await page.waitForFunction(previous => scrollY > previous, beforeWheel);
  await scrollThroughGallery(0);

  await page.getByRole('navigation').getByRole('link', { name: 'Projects', exact: true }).click();
  await page.locator('.project-row').filter({ has: page.getByRole('heading', { name: 'AerialMind', exact: true }) }).click();
  assert.equal(new URL(page.url()).pathname, '/projects/aerialmind/');
  assert.equal(await page.getByRole('link', { name: 'Source code' }).getAttribute('href'), 'https://github.com/omkarjoshi0304/aerialmind');

  await page.goto(`${origin}/blog/`);
  assert.equal(await page.locator('.writing-empty').isVisible(), publishedPosts.length === 0);
  assert.equal(await page.locator('[data-post]').count(), publishedPosts.length);
  for (const post of publishedPosts) {
    assert.equal(await page.locator(`a[href="/blog/${post.slug}/"]`).count(), 1);
  }
  assert.equal((await page.goto(`${origin}/blog/my-first-note/`)).status(), 404);

  // Virtual published posts exercise the archive without changing real content.
  const posts = [
    parseDocument("---\ntitle: Building a retrieval pipeline\nsummary: A test article about grounded answers.\ndate: '2020-01-01'\ntags: [AI]\n---\n## An example\n\n```python\nprint('hello')\n```", 'retrieval-pipeline.md'),
    parseDocument("---\ntitle: Notes on Kubernetes\nsummary: A test article about cloud systems.\ndate: '2020-01-02'\ntags: [Cloud]\n---\nA cloud note.", 'kubernetes-notes.md'),
  ];
  await context.route(`${origin}/blog/`, route => route.fulfill({ contentType: 'text/html', body: layout({ title: 'Writing', content: blogPage(posts), active: 'blog', sidebar: true }) }));
  await context.route(`${origin}/blog/retrieval-pipeline/`, route => route.fulfill({ contentType: 'text/html', body: layout({ title: posts[0].title, content: postPage(posts[0]), active: 'blog' }) }));
  await page.goto(`${origin}/blog/`);
  await page.getByRole('button', { name: 'Cloud', exact: true }).click();
  assert.equal(await page.locator('[data-post]:visible').count(), 1);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('searchbox').fill('retrieval');
  assert.equal(await page.locator('[data-post]:visible').count(), 1);
  await page.getByRole('searchbox').fill('nothing-matches');
  assert.equal(await page.locator('.no-results').isVisible(), true);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('link').filter({ has: page.getByRole('heading', { name: posts[0].title, exact: true }) }).click();
  assert.equal(await page.locator('.prose code').textContent(), "print('hello')\n");

  await page.goto(`${origin}/resume/`);
  assert.equal(await page.getByRole('button', { name: 'Print / save PDF' }).isVisible(), true);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.locator('.site-header').isVisible(), false);
  assert.equal(await page.getByRole('heading', { name: 'Experience', exact: true }).isVisible(), true);
  await page.emulateMedia({ media: 'screen' });

  // Exercise a missing artwork asset using the current configured image URL.
  await context.route(new URL(artworks[0].src, origin).href, route => route.abort());
  await page.goto(origin);
  assert.equal(await page.locator('.art-fallback').first().isVisible(), true);

  const noJsContext = await browser.newContext({ javaScriptEnabled: false });
  await noJsContext.route(`${origin}/**`, fulfilLocal);
  const noJsPage = await noJsContext.newPage();
  await noJsPage.goto(origin);
  assert.equal(await noJsPage.locator('#bio-short').isVisible(), true);
  assert.equal(await noJsPage.getByRole('navigation').isVisible(), true);
  await noJsContext.close();
  assert.deepEqual(errors, [], 'No browser JavaScript errors');
  console.log(`${engine}: responsive checks passed at 7 widths, with stable desktop gallery alignment, biography, theme persistence, automatic vertical gallery movement, reduced motion, writing filters, print styles, image fallback, and no-JavaScript access.`);
} catch (error) {
  console.error(`Browser verification could not complete: ${error.message.split('\n')[0]}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await rm(browserOutput, { recursive: true, force: true });
}
