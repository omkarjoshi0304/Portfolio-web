import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readCollection, escapeHtml as e } from '../src/content.mjs';
import { profile } from '../src/data/profile.mjs';
import { layout, home, projectsPage, blogPage, projectPage, postPage, resumePage, notFoundPage } from '../src/templates.mjs';
import { securityHeaders } from './http-headers.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const output = join(root, 'dist');

// Verification can build into temporary directories without changing the
// developer's preview or writing fixture posts into the watched content tree.
export async function build({ directory = output, postsDirectory = join(root, 'content/posts') } = {}) {
  const configuredUrl = process.env.SITE_URL || (process.env.NETLIFY === 'true' ? process.env.URL : '') || '';
  if (configuredUrl && (!/^https?:\/\//.test(configuredUrl) || new URL(configuredUrl).pathname !== '/')) {
    throw new Error('SITE_URL must be an HTTP(S) origin, for example https://example.com.');
  }
  const siteUrl = configuredUrl ? new URL(configuredUrl).origin : '';
  const feedBase = siteUrl || 'http://localhost:3000';
  const [projects, posts] = await Promise.all([
    readCollection(join(root, 'content/projects'), 'projects'),
    readCollection(postsDirectory, 'posts'),
  ]);
  if (!projects.some(project => project.slug === 'aerialmind')) throw new Error('The homepage requires the AerialMind project.');
  // Read and validate content first, so a bad draft cannot erase the last build.
  await rm(directory, { recursive: true, force: true });
  await mkdir(directory, { recursive: true });
  await cp(join(root, 'public'), directory, { recursive: true });
  await writeFile(join(directory, '_headers'), `/*\n${Object.entries(securityHeaders).map(([name, value]) => `  ${name}: ${value}`).join('\n')}\n`);

  const page = async (path, title, content, options = {}) => {
    const target = path.endsWith('.html') ? join(directory, path) : join(directory, path, 'index.html');
    await mkdir(resolve(target, '..'), { recursive: true });
    await writeFile(target, layout({ title, content, path: `/${path}`, siteUrl, ...options }));
  };
  await page('', profile.name, home(projects, posts), { active: 'home', sidebar: true });
  await page('projects/', 'Projects', projectsPage(projects), { active: 'projects', sidebar: true });
  await page('blog/', 'Notes & writing', blogPage(posts), { active: 'blog', sidebar: true });
  await page('resume/', 'Résumé', resumePage(projects), { bodyClass: 'resume-page' });
  for (const project of projects) await page(`projects/${project.slug}/`, project.title, projectPage(project), { active: 'projects', description: project.summary });
  for (const post of posts) await page(`blog/${post.slug}/`, post.title, postPage(post), { active: 'blog', description: post.summary, publishedDate: post.date });
  await page('404.html', 'Page not found', notFoundPage());

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>Omkar Joshi — Notes &amp; writing</title><link>${e(feedBase)}/blog/</link>
<description>Notes on AI systems, cloud infrastructure, and building software.</description><language>en-ie</language>
<atom:link href="${e(feedBase)}/feed.xml" rel="self" type="application/rss+xml"/>
${posts.map(post => `<item><title>${e(post.title)}</title><link>${e(feedBase)}/blog/${post.slug}/</link><guid>${e(feedBase)}/blog/${post.slug}/</guid><description>${e(post.summary)}</description><pubDate>${new Date(`${post.date}T12:00:00Z`).toUTCString()}</pubDate></item>`).join('\n')}
</channel></rss>`;
  await writeFile(join(directory, 'feed.xml'), feed);
  const paths = ['', 'projects/', 'blog/', 'resume/', ...projects.map(p => `projects/${p.slug}/`), ...posts.map(p => `blog/${p.slug}/`)];
  if (siteUrl) await writeFile(join(directory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(path => `<url><loc>${e(siteUrl)}/${path}</loc></url>`).join('')}</urlset>`);
  await writeFile(join(directory, 'robots.txt'), `User-agent: *\nAllow: /\n${siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
  console.log(`Built ${paths.length + 1} pages · ${posts.length} published posts → ${directory === output ? 'dist/' : directory}`);
  return { projects, posts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  build().catch(error => { console.error(error.message); process.exitCode = 1; });
}
