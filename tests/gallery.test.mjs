import { test } from 'node:test';
import assert from 'node:assert/strict';
import { galleryProgress, galleryPosition, initArtGallery } from '../public/gallery.js';

test('the gallery reaches the last picture at the contact section and reverses with the page', () => {
  const pagePositions = [0, 250, 500, 750, 1000, 1400, 500, 0];
  const tops = pagePositions.map(scrollY => galleryPosition(galleryProgress(scrollY, 1000), 900, 4).top);
  assert.deepEqual(tops, [0, 225, 450, 675, 900, 900, 450, 0]);
});

test('overscroll and pages too short to scroll stay within the gallery', () => {
  assert.equal(galleryProgress(-120, 1000), 0);
  assert.equal(galleryProgress(1200, 1000), 1);
  assert.equal(galleryProgress(100, 0), 0);
  assert.deepEqual(galleryPosition(.5, 0, 4), { top: 0, index: 0 });
  assert.deepEqual(galleryPosition(.5, 900, 1), { top: 0, index: 0 });
});

test('the first diagram stays still until the panel sticks, then finishes at contact', () => {
  assert.equal(galleryProgress(0, 1000, 160), 0);
  assert.equal(galleryProgress(100, 1000, 160), 0);
  assert.equal(galleryProgress(160, 1000, 160), 0);
  assert.equal(galleryProgress(580, 1000, 160), .5);
  assert.equal(galleryProgress(1000, 1000, 160), 1);
  assert.equal(galleryProgress(1200, 1000, 160), 1);
  assert.equal(galleryProgress(160, 100, 160), 0);
  assert.equal(galleryProgress(160, 160, 160), 0);
});

test('reduced motion keeps automatic changes with discrete image positions', () => {
  assert.deepEqual(galleryPosition(.4, 900, 4), { top: 360, index: 1 });
  assert.deepEqual(galleryPosition(.4, 900, 4, true), { top: 300, index: 1 });
  assert.deepEqual(galleryPosition(1, 900, 4, true), { top: 900, index: 3 });
});

test('vertical page events drive the image panel automatically through contact, including reduced motion', t => {
  // This fixture supplies layout measurements, not a browser renderer. It
  // checks the page-event wiring that the earlier manual carousel got wrong.
  const originals = new Map();
  const install = (key, value) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  t.after(() => {
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });

  const events = new Map();
  const frames = [];
  const viewport = { scrollY: 0, innerHeight: 400, addEventListener: (name, callback) => events.set(name, callback) };
  const motion = { matches: false, addEventListener: (name, callback) => { motion.changed = callback; } };
  const track = { clientHeight: 300, scrollHeight: 1200, scrollTop: 0 };
  const slides = Array.from({ length: 4 }, (_, index) => ({
    dataset: { source: `/image-${index}.jpg`, sourceLabel: 'View image' }, setAttribute() {},
  }));
  const count = {};
  const sourceLabel = {};
  const source = { querySelector: () => sourceLabel };
  const contact = { getBoundingClientRect: () => ({ bottom: 1400 - viewport.scrollY }) };
  const main = { querySelector: () => contact };
  const elements = { '.art-track': track, '[data-gallery-count]': count, '[data-gallery-source]': source };
  const gallery = {
    dataset: {}, classList: { add() {} },
    parentElement: { getBoundingClientRect: () => ({ top: 200 - viewport.scrollY }) },
    querySelector: selector => elements[selector],
    querySelectorAll: selector => selector === '[data-gallery-slide]' ? slides : [],
  };
  install('window', viewport);
  install('document', { documentElement: { scrollHeight: 1800 }, querySelector: () => main });
  install('matchMedia', () => motion);
  install('getComputedStyle', () => ({ position: 'sticky', top: '40px' }));
  install('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
  const flush = () => { while (frames.length) frames.shift()(); };
  const scroll = position => { viewport.scrollY = position; events.get('scroll')(); flush(); };

  initArtGallery(gallery);
  assert.equal(track.scrollTop, 0);
  scroll(100);
  assert.equal(track.scrollTop, 0, 'the diagram stays put while the window moves into its sticky position');
  scroll(580);
  assert.equal(track.scrollTop, 450);
  events.get('resize')();
  assert.equal(track.scrollTop, 450, 'measuring while pinned preserves the original scroll start');
  scroll(1000);
  assert.equal(track.scrollTop, 900);
  assert.equal(gallery.dataset.activeIndex, '3');
  assert.equal(source.href, '/image-3.jpg');
  scroll(0);
  assert.equal(track.scrollTop, 0);

  motion.matches = true;
  motion.changed();
  flush();
  scroll(400);
  assert.equal(track.scrollTop, 300, 'automatic changes remain enabled with reduced motion');

  // Resizing the viewport updates the page-to-gallery range.
  viewport.innerHeight = 600;
  events.get('resize')();
  scroll(800);
  assert.equal(track.scrollTop, 900);
});
