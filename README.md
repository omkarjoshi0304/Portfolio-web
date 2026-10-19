# Omkar Joshi — portfolio & writing

A responsive, editorial portfolio with an engineering illustration gallery, experience,
personal projects, a Markdown blog, and a print-friendly résumé. Built as static
HTML with ordinary CSS and JavaScript; Node.js handles the build, not the browser.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. Source changes restart the development server;
refresh the browser to see them. To use another port or expose it on your LAN:

```sh
npm run dev -- --host 0.0.0.0 --port 3001
```

## Edit your content

- `src/data/profile.mjs` — bio-related profile data, experience, education,
  skills, achievements, social links, and the ordered artwork collection.
- `src/templates.mjs` — homepage introduction and shared page layouts.
- `content/projects/*.md` — project summaries and full project pages.
- `content/posts/*.md` — blog posts with YAML metadata.
- `public/styles.css` — colours, typography, layout, and responsive rules.
- `public/images/` — put locally hosted artwork and article images here.

### Publish a post

Copy `content/posts/my-first-note.md` to a lowercase, hyphenated filename, such
as `what-i-learned-building-aerialmind.md`. Edit its metadata and write below
the second `---`:

```markdown
---
title: What I learned building AerialMind
summary: A short preview of the article.
date: '2026-10-18'
tags: [Robotics, Engineering]
draft: false
---

## Start with the problem

Your article goes here.
```

Dates must be quoted `YYYY-MM-DD` strings. Drafts and future-dated posts stay
out of pages and RSS. Future posts appear when the site is rebuilt on or after
their date. Posts support headings, code blocks, lists, links, tables, images,
and blockquotes. Raw HTML is escaped; this deliberately avoids executing HTML
copied from another editor. Use absolute HTTPS links or root-relative paths.

Add an image to `public/images/` and reference it in a post:

```markdown
![A description of what the image shows](/images/my-diagram.webp)
```

When posts exist, the blog archive automatically provides search and topic
filters. There is no browser publishing dashboard in this version; publishing
means editing Markdown, committing it, and rebuilding/deploying the site.

### Add a project demo

Project metadata supports optional `repository`, `demo`, and `video` fields.
Use full HTTP(S) URLs. A `demo` adds a live-demo link; a `video` embeds a
controlled video player. There are no invented demo URLs. For example:

```yaml
repository: https://github.com/your-handle/your-project
demo: https://your-live-demo.example
video: https://your-video-host.example/demo.mp4
```

The `status: Building` label identifies projects in progress. The homepage
currently highlights AerialMind. Change its description in its Markdown file
and the short homepage card text in `src/templates.mjs` as the project develops.

## Engineering illustrations

The right panel contains four original, locally hosted SVG diagrams:

- `public/images/ai-applications.svg` — grounded AI application architecture.
- `public/images/agent-workflows.svg` — orchestration, tools, and human oversight.
- `public/images/platform-engineering.svg` — a Kubernetes platform and workloads.
- `public/images/delivery-observability.svg` — delivery, telemetry, and feedback.

These are illustrative engineering concepts, not screenshots of production
systems or measured performance. They use no external image hosts or fonts.
To edit and regenerate the assets, update `scripts/generate-tech-visuals.mjs`
and run:

```sh
node scripts/generate-tech-visuals.mjs
```

The gallery fills the right column in a tall window aligned with the start of
the introduction. On desktop, it moves up with the introduction until it reaches
a small 24px sticky inset. The first diagram stays still during this movement;
once the window is pinned, the diagrams follow page progress. This avoids a
large empty header gap and simultaneous window and diagram movement. It
releases at the bottom of the content to leave the footer clear; short desktop
windows let the panel scroll with the page. The diagrams form a
continuous vertical strip. It becomes a compact sticky panel on smaller
screens. On short landscape screens it returns to the normal page flow to
leave room for reading. As you scroll the website vertically, the diagrams
move vertically inside the panel. The first appears at the top of the page
and the last is reached when the contact section is fully in view. Scrolling
back up reverses the movement.

There is no independent carousel or manual browsing mode. Page scrolling is
the only control. With reduced motion, the same page progress changes images
at discrete positions instead of continuously moving the filmstrip. Without
JavaScript the images appear as a regular vertical stack.

To add or reorder images, edit the `artworks` array in `src/data/profile.mjs`.
Each item has a `title`, root-relative `src`, intrinsic `width` and `height`,
descriptive `alt`, and an optional `source` URL. Images fit inside a consistent
frame without cropping; changing dimensions does not require changing CSS.

## Build & deploy

```sh
SITE_URL=https://your-domain.example npm run build
npm run preview
```

Upload **`dist/`** to a static host. Use `npm ci && npm run build` as the build
command and `dist` as the publish directory. Set `SITE_URL` to your real origin
in the host's environment to produce canonical links, an absolute RSS feed,
and a sitemap. Without it, the site works locally, RSS uses localhost, and
canonical links and the sitemap are omitted. Root-domain deployments are
supported; hosting under a subdirectory needs a base-path change.

Serve `404.html` as the custom error document. The supplied Node preview server
does this automatically. `/resume/` includes a **Print / save PDF** button.

Each build generates `dist/_headers` with the same security policy as the
preview server. Netlify and Cloudflare Pages support this file. Other hosts,
including Vercel, need equivalent host-specific configuration. Verify the
response headers and a real 404 response on the deployed preview.

### Netlify

For the simplest first upload, build locally and upload the **`dist` folder**
using [Netlify Drop](https://app.netlify.com/drop). Manual uploads do not run a
build. Once you know the assigned site address, rebuild with that address in
`SITE_URL` and upload the updated folder so RSS and canonical links use it:

```sh
SITE_URL=https://YOUR_SITE.netlify.app npm run build
```

For automatic updates, connect the repository to Netlify. `netlify.toml`
sets the Node version, build command, and publish directory. Netlify builds
use its main site `URL` automatically; setting `SITE_URL` overrides it, for
example when moving to a custom domain. Do not add a catch-all redirect to
`index.html`: this site has real HTML pages and a dedicated `404.html`.

## Verify

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Tests build into temporary directories and use temporary post fixtures, so
they do not replace the local preview or trigger its content watcher.
The browser checks cover phone, tablet, desktop, and wide desktop layouts,
including published articles and their architecture diagram;
desktop gallery alignment from the first scroll through to the footer;
biography/theme controls; automatic vertical gallery movement through contact;
reduced motion; drafts and a temporary published post; blog
search; and the print layout. Screenshots are written to `test-results/`.
Set `CHROME_PATH` to a locally installed Chrome binary to avoid downloading
Chromium, or `TEST_BROWSER=webkit` after installing Playwright WebKit.
The image fallback is checked by deliberately blocking the first gallery asset.

See `PRE_HOSTING_REVIEW.md` for the latest review findings, completed checks,
and checks that still require a browser, network access, or the selected host.

## Content decisions to revisit

- The newer CV is the primary source. The VCET data science internship uses
  June–July 2022; the earlier CV lists a different MMRDA internship in 2021.
- The bio describes a software engineer at Red Hat, rather than a current
  master's student, because the supplied education dates end in 2025.
- Teaching Assistant experience is retained from the first CV.
- Project summaries are based on the supplied CV, not a repository audit.
  Quantitative performance and security claims are omitted from the site copy.
- The included example article is a draft. Add your own posts before publishing.
- The supplied LinkedIn handle is used. Live demos are displayed only after
  their URLs are provided.
