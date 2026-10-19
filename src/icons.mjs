const paths = {
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  external: '<path d="M7 17 17 7M7 7h10v10"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  moon: '<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/>',
  leaf: '<path d="M19 4C9 3 3 8 5 15c2 7 13 7 14-11Z"/><path d="m4 21 11-12M9 16l-1-5m4 2h5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  rss: '<path d="M4 4a16 16 0 0 1 16 16M4 11a9 9 0 0 1 9 9"/><circle cx="5" cy="19" r="1"/>',
  github: '<path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.4c.1-1-.3-1.7-.8-2.1 2.7-.3 5.5-1.3 5.5-6A4.7 4.7 0 0 0 18.5 6a4.4 4.4 0 0 0-.1-3.7s-1-.3-3.8 1.4a13 13 0 0 0-6.8 0C5 2 4 2.3 4 2.3A4.4 4.4 0 0 0 3.9 6a4.7 4.7 0 0 0-1.2 3.3c0 4.7 2.8 5.7 5.5 6-.5.4-.9 1.2-.8 2.1v3.4"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7m0-10v.1M11 17v-7m0 3c0-4 6-4 6 0v4"/>',
  print: '<path d="M7 8V3h10v5M7 17H4V8h16v9h-3"/><path d="M7 14h10v7H7zM16 11h1"/>',
};
export function icon(name, className = '') {
  return `<svg class="icon ${className}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
}
