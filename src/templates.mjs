import { profile, artworks } from './data/profile.mjs';
import { escapeHtml as e, formatDate } from './content.mjs';
import { icon } from './icons.mjs';

const external = (url, label, cls = '') => `<a class="${cls}" href="${e(url)}" target="_blank" rel="noopener noreferrer">${label}${icon('external')}</a>`;
const tags = values => `<div class="tags">${values.map(tag => `<span>${e(tag)}</span>`).join('')}</div>`;

function header(active) {
  return `<header class="site-header">
    <a class="wordmark" href="/" aria-label="Omkar Joshi, home">omkar<span class="wordmark-dot">.</span></a>
    <nav class="primary-nav" aria-label="Main navigation">
      ${[['/', 'Home', 'home'], ['/projects/', 'Projects', 'projects'], ['/blog/', 'Writing', 'blog']].map(([href, label, id]) => `<a href="${href}"${active === id ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
    </nav>
    <button class="theme-toggle icon-button" type="button" aria-label="Switch to light theme" data-theme-toggle hidden>${icon('sun', 'sun-icon')}${icon('moon', 'moon-icon')}</button>
  </header>`;
}

function artPanel() {
  const first = artworks[0];
  return `<aside class="art-sidebar" data-art-gallery aria-label="AI and platform engineering illustrations">
    <div class="art-track" role="group" aria-label="Engineering diagrams follow the page as you scroll down.">
      ${artworks.map((artwork, index) => `
        <figure class="art-slide" data-gallery-slide data-source="${e(artwork.source || artwork.src)}" data-source-label="${artwork.source ? 'Source' : 'Open diagram'}" role="group" aria-label="${index + 1} of ${artworks.length}: ${e(artwork.title)}">
          <div class="art-frame">
            <div class="art-fallback" hidden><span>${icon('code')}</span><p>AI &amp; platform<br>engineering.</p><small>Please refresh to reload the artwork.</small></div>
            <img class="scene-image" src="${e(artwork.src)}" alt="${e(artwork.alt)}" width="${artwork.width}" height="${artwork.height}" loading="${index === 0 ? 'eager' : 'lazy'}"${index === 0 ? ' fetchpriority="high"' : ''} decoding="async" draggable="false">
          </div>
        </figure>`).join('')}
    </div>
    <div class="gallery-caption">
      <span class="gallery-count" data-gallery-count aria-hidden="true">01 / ${String(artworks.length).padStart(2, '0')}</span>
      <a data-gallery-source href="${e(first.source || first.src)}" target="_blank" rel="noopener noreferrer"><span>${first.source ? 'Source' : 'Open diagram'}</span> ${icon('external')}</a>
    </div>
  </aside>`;
}

function footer() {
  return `<footer class="site-footer"><span>© ${new Date().getUTCFullYear()} Omkar Joshi</span><span>Built with care, in Dublin. ${icon('leaf')}</span><a href="/feed.xml" aria-label="RSS feed">RSS ${icon('rss')}</a></footer>`;
}

export function layout({ title, description = profile.description, content, active = '', sidebar = false, bodyClass = '', path = '/', siteUrl = '', publishedDate = '' }) {
  const canonical = siteUrl ? `<link rel="canonical" href="${e(new URL(path, siteUrl).href)}"><meta property="og:url" content="${e(new URL(path, siteUrl).href)}">` : '';
  return `<!doctype html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${e(title === profile.name ? `${profile.name} — Software Engineer` : `${title} — ${profile.name}`)}</title>
  <meta name="description" content="${e(description)}"><meta name="theme-color" content="#191a18">
  <meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(description)}"><meta property="og:type" content="${publishedDate ? 'article' : 'website'}">
  ${publishedDate ? `<meta name="author" content="${e(profile.name)}"><meta property="article:published_time" content="${e(publishedDate)}T12:00:00Z">` : ''}
  ${canonical}
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="Omkar Joshi — Writing" href="/feed.xml">
  <script src="/theme-init.js"></script>
  <link rel="stylesheet" href="/styles.css"><script src="/app.js" defer></script>${sidebar ? '<script src="/gallery.js" type="module"></script>' : ''}
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-shell">${header(active)}
    <div class="${sidebar ? 'page-grid' : 'single-column'}"><main id="main" tabindex="-1">${content}</main>${sidebar ? artPanel() : ''}</div>
    ${footer()}
  </div>
</body></html>`;
}

export function projectRow(project, index) {
  return `<a class="project-row" href="/projects/${e(project.slug)}/"><span class="project-number">0${index + 1}</span><div><div class="project-row-heading"><h3>${e(project.title)}</h3>${project.status === 'Building' ? '<span class="mini-status"><span></span> In progress</span>' : ''}</div><p>${e(project.summary)}</p>${tags(project.tags)}</div>${icon('external', 'row-arrow')}</a>`;
}

export function postRows(posts) {
  if (!posts.length) return `<div class="writing-empty"><span class="writing-asterisk">✳</span><div><h3>A few thoughts are taking shape.</h3><p>Notes on AI, cloud infrastructure, and the things I learn along the way. First post coming soon.</p></div></div>`;
  return `<div class="post-list">${posts.map(post => `<a class="post-row" href="/blog/${e(post.slug)}/"><div><h3>${e(post.title)}</h3><p>${e(post.summary)}</p></div><span><time datetime="${post.date}">${formatDate(post.date)}</time>${icon('external')}</span></a>`).join('')}</div>`;
}

export function home(projects, posts) {
  const current = projects.find(project => project.slug === 'aerialmind');
  return `<section class="intro" aria-labelledby="intro-heading">
    <p class="eyebrow"><span class="location-dot"></span> DUBLIN, IRELAND <span class="eyebrow-divider">/</span> SOFTWARE ENGINEER</p>
    <h1 id="intro-heading">Omkar Joshi<span class="accent">.</span></h1>
    <p class="intro-subtitle">An engineer. A builder. Always curious.</p>
    <div class="bio-header"><h2 class="section-label">A LITTLE ABOUT ME</h2><div class="bio-switch" role="group" aria-label="Biography length" hidden><button type="button" class="is-active" aria-pressed="true" data-bio="short">Short</button><button type="button" aria-pressed="false" data-bio="long">Long</button></div></div>
    <div class="bio-copy" id="bio-short"><p>I’m a software engineer at <a href="https://www.redhat.com/" target="_blank" rel="noopener noreferrer">Red Hat</a>, building secure AI systems and cloud infrastructure. I like turning complicated problems into things that feel simple.</p><p>Most days, you’ll find me working with Python, Go, and C++ — somewhere between retrieval pipelines, AI agents, and Kubernetes. Outside work, I build side projects and explore better ways to develop AI applications and run them reliably.</p></div>
    <div class="bio-copy" id="bio-long" hidden><p>I’m a software engineer at <a href="https://www.redhat.com/" target="_blank" rel="noopener noreferrer">Red Hat</a> in Dublin, working on OpenStack Lightspeed. I build secure AI systems — from grounded retrieval and multi-turn agents to evaluation pipelines and the Kubernetes infrastructure behind them.</p><p>My tools of choice are Python, Go, and C++. I care about software that is understandable, dependable, and useful to the people using it. Before joining Red Hat, I studied Electronics and Computer Engineering at Dublin City University and helped teach engineering labs.</p><p>Outside work, I’m exploring robotics through AerialMind and building platform tools like DeployGuard. I’m interested in AI applications that solve practical problems and the engineering that makes them dependable. This site is a home for what I build and what I learn along the way.</p></div>
    <div class="social-links">${external(profile.github, `${icon('github')} GitHub`)}${external(profile.linkedin, `${icon('linkedin')} LinkedIn`)}<a href="mailto:${profile.email}">${icon('mail')} Say hello ${icon('external')}</a></div>
  </section>

  <section class="current-section" aria-labelledby="current-heading"><div class="section-heading"><h2 id="current-heading">Currently building</h2><span class="section-aside">AFTER HOURS</span></div>
    <a class="current-project" href="/projects/${current.slug}/"><div class="current-project-top"><span class="build-status"><span class="status-dot"></span> A WORK IN PROGRESS</span>${icon('external')}</div><h3>AerialMind <span>↗</span></h3><p>A little curiosity. A lot of moving parts. Exploring reliable drone autonomy with human oversight.</p><div class="current-project-bottom">${tags(current.tags)}<span class="follow-build">Follow the build ${icon('arrow')}</span></div></a>
  </section>

  <section class="home-section" aria-labelledby="experience-heading"><div class="section-heading"><h2 id="experience-heading">Experience</h2><a class="small-link" href="/resume/">View résumé ${icon('external')}</a></div>
    <div class="experience-list">${profile.experience.slice(0, 3).map(job => `<article class="experience-item"><div class="timeline-marker${job.current ? ' is-current' : ''}"></div><div class="experience-meta"><h3>${e(job.company)}${job.current ? '<span class="current-pill">NOW</span>' : ''}</h3><span>${e(job.period)}</span></div><p class="job-role">${e(job.role)}</p><p class="job-description">${e(job.description)}</p></article>`).join('')}</div>
  </section>

  <section class="home-section" aria-labelledby="projects-heading"><div class="section-heading"><h2 id="projects-heading">Things I’ve built</h2><a class="small-link" href="/projects/">All projects ${icon('arrow')}</a></div><div class="project-list">${projects.filter(project => project.featured && project.slug !== 'aerialmind').map(projectRow).join('')}</div></section>

  <section class="home-section" aria-labelledby="writing-heading"><div class="section-heading"><h2 id="writing-heading">Notes & writing</h2><a class="small-link" href="/blog/">All writing ${icon('arrow')}</a></div>${postRows(posts.slice(0, 3))}</section>

  <section class="home-section education-section" aria-labelledby="education-heading"><div class="section-heading"><h2 id="education-heading">A little background</h2></div>${profile.education.map(item => `<div class="education-item"><div><h3>${e(item.school)}</h3><p>${e(item.degree)}</p></div><span>${e(item.period)}</span></div>`).join('')}<p class="background-note">From Mumbai to Dublin. Still learning, still building.</p></section>

  <section class="contact-section" aria-labelledby="contact-heading"><span class="section-label">LET’S CONNECT</span><h2 id="contact-heading">Have something in mind?</h2><p>A project, an interesting problem, or just a hello —<br>I’d love to hear from you.</p><div class="contact-actions"><a class="email-link" href="mailto:${profile.email}">${profile.email} ${icon('external')}</a><button class="icon-button copy-email" data-copy-email="${profile.email}" aria-label="Copy email address" hidden>${icon('copy')}</button></div><p class="copy-status" role="status" aria-live="polite"></p></section>`;
}

export function projectsPage(projects) {
  return `<div class="page-intro"><p class="eyebrow">A COLLECTION OF EXPERIMENTS</p><h1>Things I’ve built<span class="accent">.</span></h1><p>Side projects, practical tools, and a few ideas that wouldn’t leave me alone. A small look at how I think and what I make.</p></div><div class="project-list archive-projects">${projects.map(projectRow).join('')}</div><p class="archive-note">More experiments live on ${external(profile.github, 'GitHub')}. Project pages include source and demo links whenever they’re available.</p>`;
}

export function blogPage(posts) {
  const allTags = [...new Set(posts.flatMap(post => post.tags))];
  return `<div class="page-intro"><p class="eyebrow">LEARNING IN PUBLIC</p><h1>Notes & writing<span class="accent">.</span></h1><p>Things I’m learning about AI systems, cloud infrastructure, and building software. Written to make sense of them, shared in case they help you too.</p></div>${posts.length ? `<div class="blog-tools" hidden><label class="search-label" for="post-search">Find a note</label><input id="post-search" type="search" placeholder="Search titles, topics, or keywords…" autocomplete="off"><div class="filter-list" role="group" aria-label="Filter posts by topic"><button class="filter-button is-active" data-filter="All" aria-pressed="true">All</button>${allTags.map(tag => `<button class="filter-button" data-filter="${e(tag)}" aria-pressed="false">${e(tag)}</button>`).join('')}</div><p class="sr-only" data-search-status role="status"></p></div><div class="searchable-posts">${posts.map(post => `<div data-post data-tags="${e(JSON.stringify(post.tags))}" data-search="${e(`${post.title} ${post.summary} ${post.tags.join(' ')}`.toLowerCase())}">${postRows([post])}</div>`).join('')}</div><p class="no-results" hidden>No notes match that search. Try another topic.</p>` : postRows(posts)}<a class="rss-link" href="/feed.xml">${icon('rss')} Follow along with RSS ${icon('arrow')}</a>`;
}

export function projectPage(project) {
  return `<a class="back-link" href="/projects/">${icon('back')} All projects</a><div class="page-intro detail-intro"><p class="eyebrow">${e(project.category || 'PROJECT')}${project.status === 'Building' ? ' <span class="eyebrow-divider">/</span> IN PROGRESS' : ''}</p><h1>${e(project.title)}<span class="accent">.</span></h1><p>${e(project.summary)}</p>${tags(project.tags)}<div class="project-actions">${project.repository ? external(project.repository, `${icon('github')} Source code`, 'button-link') : ''}${project.demo ? external(project.demo, 'Open live demo', 'button-link button-primary') : ''}</div></div>${project.video ? `<video class="project-video" controls preload="metadata" aria-label="${e(project.title)} demonstration"><source src="${e(project.video)}">Your browser does not support embedded video. <a href="${e(project.video)}">Open the demo video</a>.</video>` : ''}<article class="prose">${project.html}</article><div class="detail-footer"><a href="/projects/">${icon('back')} Back to all projects</a><a href="mailto:${profile.email}">Talk about this project ${icon('external')}</a></div>`;
}

export function postPage(post) {
  return `<a class="back-link" href="/blog/">${icon('back')} All writing</a><article><header class="page-intro detail-intro"><p class="eyebrow"><time datetime="${post.date}">${formatDate(post.date)}</time><span class="eyebrow-divider">/</span>${post.readingTime} MIN READ</p><h1>${e(post.title)}</h1><p>${e(post.summary)}</p>${tags(post.tags)}</header><div class="prose article-prose">${post.html}</div></article><div class="detail-footer"><a href="/blog/">${icon('back')} Back to writing</a><a href="mailto:${profile.email}">Have a thought? Say hello ${icon('external')}</a></div>`;
}

export function resumePage(projects = []) {
  const experience = profile.experience.map(job => `
    <article class="resume-job">
      <div class="resume-line"><h3>${e(job.role)}</h3><span>${e(job.period)}</span></div>
      <p class="resume-company">${e(job.company)}</p>
      <p>${e(job.description)}</p>
      ${job.details.length ? `<ul>${job.details.map(detail => `<li>${e(detail)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');

  const selectedProjects = projects.slice(0, 2).map(project => `
    <article class="resume-job">
      <h3><a href="/projects/${e(project.slug)}/">${e(project.title)}</a></h3>
      <p>${e(project.summary)}</p>
      ${tags(project.tags)}
      ${project.repository ? `<p><a href="${e(project.repository)}">${e(project.repository)}</a></p>` : ''}
    </article>`).join('');

  const education = profile.education.map(item => `
    <article class="resume-job">
      <div class="resume-line"><h3>${e(item.degree)}</h3><span>${e(item.period)}</span></div>
      <p>${e(item.school)} · ${e(item.location)}</p>
    </article>`).join('');

  const community = profile.community.map(item => `
    <article class="resume-job">
      <div class="resume-line"><h3>${e(item.role)}</h3><span>${e(item.period)}</span></div>
      <p class="resume-company">${e(item.organization)}</p>
      <p>${e(item.description)}</p>
    </article>`).join('');

  return `
    <div class="resume-toolbar">
      <a class="back-link" href="/">${icon('back')} Back home</a>
      <button class="button-link" data-print hidden>${icon('print')} Print / save PDF</button>
    </div>
    <header class="page-intro resume-intro">
      <p class="eyebrow">EXPERIENCE & BACKGROUND</p>
      <h1>Omkar Joshi<span class="accent">.</span></h1>
      <p>Software Engineer · ${profile.location}</p>
      <div class="resume-contact">
        <a href="mailto:${profile.email}">${profile.email}</a>
        <a href="${profile.linkedin}">LinkedIn</a>
        <a href="${profile.github}">GitHub</a>
      </div>
    </header>
    <div class="resume-content">
      <section>
        <h2>Profile</h2>
        <p>Software engineer specializing in Go, C++, and Python, building enterprise AI systems and cloud platforms. Currently working on secure AI for OpenStack at Red Hat, with a focus on grounded retrieval, responsible AI, and maintainable infrastructure.</p>
      </section>
      <section><h2>Experience</h2>${experience}</section>
      <section><h2>Selected projects</h2>${selectedProjects}</section>
      <section><h2>Education</h2>${education}</section>
      <section>
        <h2>Technical skills</h2>
        <dl class="skills-list">${profile.skills.map(group => `<div><dt>${e(group.name)}</dt><dd>${e(group.items)}</dd></div>`).join('')}</dl>
      </section>
      <section><h2>Leadership & community</h2>${community}</section>
      <section>
        <h2>Training & certifications</h2>
        <ul>${profile.certifications.map(item => `<li>${e(item)}</li>`).join('')}</ul>
      </section>
      <section>
        <h2>Achievements</h2>
        <ul>${profile.achievements.map(item => `<li>${e(item)}</li>`).join('')}</ul>
      </section>
    </div>`;
}

export function notFoundPage() {
  return `<div class="page-intro not-found"><p class="eyebrow">404 / A SMALL DETOUR</p><h1>A little off the path<span class="accent">.</span></h1><p>This page isn’t here. Let’s get you back to somewhere familiar.</p><a class="button-link" href="/">${icon('back')} Back home</a></div>`;
}
