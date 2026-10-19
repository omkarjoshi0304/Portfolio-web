import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { Marked } from 'marked';
import { load, JSON_SCHEMA } from 'js-yaml';

export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

export function safeUrl(value) {
  if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  try {
    const url = new URL(value);
    return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

// Markdown is authored locally. Escape raw HTML and allow only ordinary links
// so a pasted article cannot introduce executable HTML into a generated page.
const markdown = new Marked({
  gfm: true,
  renderer: {
    html({ text }) { return escapeHtml(text); },
    link({ href, title, tokens }) {
      const label = this.parser.parseInline(tokens);
      const url = safeUrl(href);
      return url ? `<a href="${escapeHtml(url)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${label}</a>` : label;
    },
    image({ href, text }) {
      const url = safeUrl(href);
      if (!url || url.startsWith('mailto:')) return escapeHtml(text);
      return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy" decoding="async">`;
    },
    heading({ depth, tokens }) {
      const level = Math.max(2, depth);
      return `<h${level}>${this.parser.parseInline(tokens)}</h${level}>`;
    },
  },
});

export function parseDocument(source, filename = 'document.md') {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`${filename}: expected YAML front matter between --- lines.`);
  const metadata = load(match[1], { schema: JSON_SCHEMA });
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error(`${filename}: invalid metadata.`);
  for (const field of ['title', 'summary']) {
    if (typeof metadata[field] !== 'string' || !metadata[field].trim()) throw new Error(`${filename}: ${field} is required.`);
  }
  if (metadata.tags !== undefined && (!Array.isArray(metadata.tags) || metadata.tags.some(tag => typeof tag !== 'string'))) {
    throw new Error(`${filename}: tags must be a list of strings.`);
  }
  if (metadata.draft !== undefined && typeof metadata.draft !== 'boolean') throw new Error(`${filename}: draft must be true or false.`);
  for (const field of ['repository', 'demo', 'video']) {
    if (metadata[field] && !/^https?:\/\//.test(safeUrl(metadata[field]) || '')) throw new Error(`${filename}: ${field} must be an HTTP(S) URL.`);
  }
  const slug = basename(filename, '.md');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${filename}: use a lowercase, hyphenated filename.`);
  return { ...metadata, slug, tags: metadata.tags || [], body: match[2], html: markdown.parse(match[2]), readingTime: Math.max(1, Math.ceil(match[2].split(/\s+/).length / 220)) };
}

export async function readCollection(directory, type) {
  const entries = await readdir(directory);
  const documents = await Promise.all(entries.filter(file => file.endsWith('.md')).map(async file => {
    const doc = parseDocument(await readFile(join(directory, file), 'utf8'), file);
    if (type === 'posts') {
      if (typeof doc.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(doc.date) || !Number.isFinite(Date.parse(doc.date)) || new Date(doc.date).toISOString().slice(0, 10) !== doc.date) {
        throw new Error(`${file}: date must be a valid quoted YYYY-MM-DD string.`);
      }
    }
    return doc;
  }));
  const today = new Date().toISOString().slice(0, 10);
  return documents.filter(doc => doc.draft !== true && (type !== 'posts' || doc.date <= today))
    .sort(type === 'posts' ? (a, b) => b.date.localeCompare(a.date) : (a, b) => (a.order || 99) - (b.order || 99));
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}
