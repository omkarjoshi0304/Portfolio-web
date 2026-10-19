// The page is the only scroll control. Hold the first diagram until the
// window sticks, then move the filmstrip through to the contact section.
export function galleryProgress(scrollY, scrollEnd, scrollStart = 0) {
  if (scrollEnd <= scrollStart) return 0;
  return Math.max(0, Math.min(1, (scrollY - scrollStart) / (scrollEnd - scrollStart)));
}

export function galleryPosition(progress, travel, imageCount, reducedMotion = false) {
  if (imageCount <= 1 || travel <= 0) return { top: 0, index: 0 };
  const clamped = Math.max(0, Math.min(1, progress));
  const index = Math.round(clamped * (imageCount - 1));
  // Reduced motion keeps automatic image changes, with discrete positions
  // instead of continuous movement of the filmstrip.
  const position = reducedMotion ? index / (imageCount - 1) : clamped;
  return { top: position * travel, index };
}

export function initArtGallery(gallery) {
  const track = gallery.querySelector('.art-track');
  const slides = [...gallery.querySelectorAll('[data-gallery-slide]')];
  const main = document.querySelector('main');
  if (!track || !slides.length || !main) return;

  const count = gallery.querySelector('[data-gallery-count]');
  const source = gallery.querySelector('[data-gallery-source]');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const endSection = main.querySelector('.contact-section') || main;
  let scrollStart = 0;
  let scrollEnd = 0;
  let travel = 0;
  let activeIndex = -1;
  let frame = 0;

  function updateSelection(index) {
    if (index === activeIndex) return;
    activeIndex = index;
    gallery.dataset.activeIndex = String(index);
    count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    slides.forEach((slide, position) => {
      slide.dataset.active = String(position === index);
      slide.setAttribute('aria-hidden', String(position !== index));
    });
    source.href = slides[index].dataset.source;
    source.querySelector('span').textContent = slides[index].dataset.sourceLabel;
  }

  function syncToPage() {
    frame = 0;
    const progress = galleryProgress(window.scrollY, scrollEnd, scrollStart);
    const position = galleryPosition(progress, travel, slides.length, reducedMotion.matches);
    track.scrollTop = position.top;
    gallery.dataset.scrollProgress = String(progress);
    updateSelection(position.index);
  }

  function scheduleSync() {
    if (!frame) frame = requestAnimationFrame(syncToPage);
  }

  function measure() {
    const style = getComputedStyle(gallery);
    // Measure the container, whose document position stays constant while
    // the sticky window moves. Resizing halfway down must not reset the start.
    const containerTop = gallery.parentElement.getBoundingClientRect().top + window.scrollY;
    scrollStart = style.position === 'sticky' ? Math.max(0, containerTop - (parseFloat(style.top) || 0)) : 0;
    const pageEnd = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const contactEnd = endSection.getBoundingClientRect().bottom + window.scrollY - window.innerHeight;
    scrollEnd = Math.max(0, Math.min(pageEnd, contactEnd));
    travel = Math.max(0, track.scrollHeight - track.clientHeight);
    syncToPage();
  }

  window.addEventListener('scroll', scheduleSync, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('pageshow', measure);
  reducedMotion.addEventListener('change', scheduleSync);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    observer.observe(main);
    slides.forEach(slide => observer.observe(slide));
  }

  gallery.classList.add('is-enhanced');
  measure();
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-art-gallery]').forEach(initArtGallery);
}
