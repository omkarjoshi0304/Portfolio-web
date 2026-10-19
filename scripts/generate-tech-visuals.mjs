// Original, editable vector illustrations for the portfolio's engineering panel.
// Run with: node scripts/generate-tech-visuals.mjs
import { mkdir, writeFile } from 'node:fs/promises';

const destination = new URL('../public/images/', import.meta.url);
const ink = '#e7edea';
const muted = '#8d9fa7';
const outline = '#35464e';
const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const sans = '-apple-system, BlinkMacSystemFont, Segoe UI, Arial, sans-serif';
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));

function text(value, x, y, size = 22, fill = ink, options = {}) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="${options.mono ? mono : sans}" font-size="${size}" font-weight="${options.weight || 400}"${options.anchor ? ` text-anchor="${options.anchor}"` : ''}${options.spacing ? ` letter-spacing="${options.spacing}"` : ''}>${escape(value)}</text>`;
}

function rect(x, y, width, height, fill = '#1c2930', stroke = outline, radius = 14) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}"/>`;
}

function path(d, stroke, arrow = false, dashed = false) {
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${arrow ? ' marker-end="url(#arrow)"' : ''}${dashed ? ' stroke-dasharray="6 8"' : ''}/>`;
}

function circle(x, y, radius, fill, stroke = 'none') {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}" stroke="${stroke}"/>`;
}

function tags(values, accent) {
  let x = 80;
  return values.map(value => {
    const width = value.length * 10 + 34;
    const tag = rect(x, 995, width, 38, '#172329', outline, 19) + text(value, x + 17, 1019, 15, accent, { mono: true });
    x += width + 12;
    return tag;
  }).join('');
}

function panel({ number, title, subtitle, accent, description, body, topics }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1120" viewBox="0 0 960 1120" role="img" aria-labelledby="title description">
  <title id="title">${escape(title)}</title>
  <desc id="description">${escape(description)}</desc>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#5c7480" stroke-opacity=".09"/></pattern>
    <radialGradient id="glow"><stop stop-color="${accent}" stop-opacity=".09"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1L6 4L1 7" fill="none" stroke="${accent}" stroke-width="1.2"/></marker>
  </defs>
  <rect width="960" height="1120" fill="#162128"/>
  <rect width="960" height="1120" fill="url(#grid)"/>
  <ellipse cx="480" cy="600" rx="480" ry="470" fill="url(#glow)"/>
  ${text(`ENGINEERING NOTES / ${number}`, 80, 81, 16, muted, { mono: true, spacing: 2 })}
  ${path('M80 115H880', outline)}
  ${circle(869, 75, 5, accent)}
  ${text(title, 80, 193, 57, ink, { weight: 500, spacing: -1.5 })}
  ${text(subtitle, 80, 238, 23, muted)}
  ${body}
  ${path('M80 964H880', outline)}
  ${tags(topics, accent)}
  ${text('AI APPLICATIONS / PLATFORM ENGINEERING', 80, 1080, 13, muted, { mono: true, spacing: 1.5 })}
</svg>`;
}

const blue = '#a3c9df';
let retrieval = '';
for (let index = 0; index < 12; index++) {
  retrieval += circle(223 + (index % 4) * 34, 548 + Math.floor(index / 4) * 31, 5, index % 3 === 0 ? blue : '#485f6b');
}
const ai = panel({
  number: '01', title: 'AI, with context.', subtitle: 'Useful applications start with grounded answers.', accent: blue,
  description: 'An AI application diagram connecting a question to contextual retrieval, a vector store, source documents, and a grounded response.',
  topics: ['RAG', 'VECTOR SEARCH', 'LLM APPLICATIONS'],
  body: `
    ${rect(310, 319, 340, 72)}
    ${text('QUESTION + CONTEXT', 480, 363, 20, blue, { mono: true, anchor: 'middle' })}
    ${path('M480 391V435', blue, true)}
    ${rect(160, 449, 640, 266, '#1b2a33', '#527184', 18)}
    ${text('CONTEXT RETRIEVAL', 192, 488, 18, blue, { mono: true, spacing: 1 })}
    ${rect(192, 512, 174, 169, '#17252d', outline, 9)}
    ${retrieval}
    ${text('Vector store', 279, 655, 17, muted, { anchor: 'middle' })}
    ${rect(398, 512, 370, 169, '#17252d', outline, 9)}
    ${text('SOURCE DOCUMENTS', 422, 546, 15, muted, { mono: true })}
    ${path('M422 564H743', outline)}
    ${text('architecture.md', 422, 594, 20, ink, { mono: true })}
    ${text('operations.md', 422, 627, 20, ink, { mono: true })}
    ${text('troubleshooting.md', 422, 660, 20, ink, { mono: true })}
    ${path('M480 715V762', blue, true)}
    ${rect(228, 776, 504, 112, '#21353d', '#527184', 14)}
    ${circle(267, 818, 6, '#a4c4ac')}
    ${text('GROUNDED RESPONSE', 292, 825, 21, ink, { mono: true })}
    ${text('Relevant context. Traceable sources.', 263, 860, 20, muted)}
  `,
});

const amber = '#d8b38b';
const agents = panel({
  number: '02', title: 'Agents, with intent.', subtitle: 'Tools, conversation state, and human oversight.', accent: amber,
  description: 'An agent workflow connecting a user request to an orchestrator, tools, retrieval, human approval, and a validated response.',
  topics: ['TOOL USE', 'STATE', 'HUMAN OVERSIGHT'],
  body: `
    ${rect(330, 319, 300, 68)}
    ${text('USER REQUEST', 480, 361, 20, amber, { mono: true, anchor: 'middle' })}
    ${path('M480 387V438', amber, true)}
    ${rect(309, 452, 342, 109, '#332f2a', '#7e6b57', 15)}
    ${text('ORCHESTRATOR', 480, 498, 25, ink, { mono: true, anchor: 'middle' })}
    ${text('plan / state / context', 480, 534, 18, amber, { mono: true, anchor: 'middle' })}
    ${path('M480 561V599M252 614V599H708V614M480 599V614', amber, true)}
    ${[164, 392, 620].map((x, index) => `${rect(x, 629, 176, 126)}${circle(x + 88, 665, 7, index === 2 ? '#a4c4ac' : amber)}${text(['TOOLS', 'RETRIEVAL', 'APPROVAL'][index], x + 88, 709, 19, ink, { mono: true, anchor: 'middle' })}${text(['integrations', 'knowledge', 'human review'][index], x + 88, 735, 15, muted, { anchor: 'middle' })}`).join('')}
    ${path('M252 755V791H708V755M480 791V824', amber, true)}
    ${rect(269, 839, 422, 68)}
    ${text('VALIDATED RESPONSE', 480, 881, 20, amber, { mono: true, anchor: 'middle' })}
  `,
});

const mint = '#9ec5b8';
const workloads = [['API', 'AGENTS'], ['RETRIEVAL', 'VECTOR DB'], ['METRICS', 'LOGS']];
const platform = panel({
  number: '03', title: 'Platforms that last.', subtitle: 'Declarative infrastructure. Dependable workloads.', accent: mint,
  description: 'A Kubernetes platform diagram showing a control plane and three worker nodes hosting application, retrieval, and observability workloads.',
  topics: ['KUBERNETES', 'OPENSHIFT', 'OPERATORS'],
  body: `
    ${rect(230, 319, 500, 72, '#20332f', '#58766b')}
    ${text('KUBERNETES / CONTROL PLANE', 480, 363, 20, mint, { mono: true, anchor: 'middle' })}
    ${path('M480 391V433', mint, true)}
    ${rect(116, 448, 728, 419, '#19282b', '#46635c', 20)}
    ${text('WORKLOAD CLUSTER', 148, 491, 18, mint, { mono: true, spacing: 1 })}
    ${[148, 380, 612].map((x, index) => `
      ${rect(x, 518, 200, 311, '#1b2e2e', '#38534e', 10)}
      ${text(`WORKER 0${index + 1}`, x + 100, 553, 16, muted, { mono: true, anchor: 'middle' })}
      ${workloads[index].map((name, row) => `
        ${rect(x + 16, 582 + row * 110, 168, 85, '#233d37', '#456a5b', 8)}
        ${circle(x + 37, 606 + row * 110, 4, mint)}
        ${text('workload', x + 50, 611 + row * 110, 12, muted, { mono: true })}
        ${text(name, x + 100, 645 + row * 110, 16, ink, { mono: true, anchor: 'middle' })}
      `).join('')}
    `).join('')}
    ${text('SECRETS / STORAGE / NETWORKING', 480, 917, 18, muted, { mono: true, anchor: 'middle' })}
  `,
});

const lavender = '#b7bbd5';
const delivery = panel({
  number: '04', title: 'Ship. Observe. Improve.', subtitle: 'A feedback loop from commit to production.', accent: lavender,
  description: 'A delivery and observability diagram showing commit, build, test, and deployment stages linked to metrics, logs, traces, and a feedback loop.',
  topics: ['CI/CD', 'TELEMETRY', 'RELIABILITY'],
  body: `
    ${[80, 288, 496, 704].map((x, index) => `
      ${rect(x, 340, 176, 122)}
      ${text(`0${index + 1}`, x + 88, 387, 24, lavender, { mono: true, anchor: 'middle' })}
      ${text(['COMMIT', 'BUILD', 'TEST', 'DEPLOY'][index], x + 88, 429, 17, ink, { mono: true, anchor: 'middle' })}
      ${index < 3 ? path(`M${x + 176} 401H${x + 195}`, lavender, true) : ''}
    `).join('')}
    ${path('M792 462V502Q792 525 768 525H480V550', lavender, true)}
    ${rect(140, 565, 680, 320, '#1c2932', '#535b75', 17)}
    ${text('OBSERVABILITY', 175, 610, 20, lavender, { mono: true, spacing: 1 })}
    ${[650, 700, 750, 800].map(y => path(`M175 ${y}H785`, '#30424e')).join('')}
    ${path('M175 761C207 759 224 706 259 717S310 767 349 735S395 653 431 678S475 743 513 706S552 629 591 650S640 708 677 681S735 625 785 643', '#9ec5b8')}
    ${path('M175 780C226 770 260 782 305 768S383 777 431 757S521 766 570 749S653 759 700 738S752 742 785 725', lavender, false, true)}
    ${circle(188, 849, 4, '#9ec5b8')}${text('metrics', 203, 855, 16, muted, { mono: true })}
    ${circle(365, 849, 4, lavender)}${text('logs', 380, 855, 16, muted, { mono: true })}
    ${circle(511, 849, 4, '#d8b38b')}${text('traces', 526, 855, 16, muted, { mono: true })}
    ${path('M140 716H104Q68 716 68 680V503Q68 485 96 485H168V469', lavender, true, true)}
    ${text('FEEDBACK', 183, 930, 16, muted, { mono: true, spacing: 2 })}
  `,
});

await mkdir(destination, { recursive: true });
for (const [name, content] of Object.entries({ 'ai-applications': ai, 'agent-workflows': agents, 'platform-engineering': platform, 'delivery-observability': delivery })) {
  await writeFile(new URL(`${name}.svg`, destination), content.replace(/^[ \t]+$/gm, ''));
}
console.log('Created four local engineering illustrations in public/images/.');
