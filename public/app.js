const themeButton = document.querySelector('[data-theme-toggle]');
if (themeButton) {
  const updateLabel = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    document.querySelector('meta[name="theme-color"]').content = dark ? '#191a18' : '#f8f6ef';
  };
  themeButton.hidden = false;
  updateLabel();
  themeButton.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('omkar-theme', theme); } catch { /* Storage is optional. */ }
    updateLabel();
  });
}

const bioSwitch = document.querySelector('.bio-switch');
if (bioSwitch) {
  bioSwitch.hidden = false;
  bioSwitch.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    const selected = button.dataset.bio;
    for (const variant of ['short', 'long']) {
      document.getElementById(`bio-${variant}`).hidden = variant !== selected;
    }
    bioSwitch.querySelectorAll('button').forEach(option => {
      const active = option === button;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-pressed', String(active));
    });
  }));
}

document.querySelectorAll('.scene-image').forEach(scene => {
  const showFallback = () => {
    scene.hidden = true;
    const frame = scene.closest('.art-frame');
    frame.querySelector('.art-fallback').hidden = false;
  };
  scene.addEventListener('error', showFallback);
  if (scene.complete && scene.naturalWidth === 0) showFallback();
});

const copyButton = document.querySelector('[data-copy-email]');
if (copyButton && navigator.clipboard?.writeText) {
  copyButton.hidden = false;
  let resetTimer;
  copyButton.addEventListener('click', async () => {
    const status = document.querySelector('.copy-status');
    clearTimeout(resetTimer);
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyEmail);
      status.textContent = 'Email address copied.';
    } catch { status.textContent = `Email: ${copyButton.dataset.copyEmail}`; }
    resetTimer = setTimeout(() => { status.textContent = ''; }, 4000);
  });
}

const search = document.querySelector('#post-search');
if (search) {
  document.querySelector('.blog-tools').hidden = false;
  const posts = [...document.querySelectorAll('[data-post]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  let selectedTag = 'All';
  function updatePosts() {
    const query = search.value.toLocaleLowerCase().trim();
    let count = 0;
    posts.forEach(post => {
      const matchesTag = selectedTag === 'All' || JSON.parse(post.dataset.tags).includes(selectedTag);
      post.hidden = !matchesTag || !post.dataset.search.includes(query);
      if (!post.hidden) count++;
    });
    document.querySelector('.no-results').hidden = count !== 0;
    document.querySelector('[data-search-status]').textContent = `${count} ${count === 1 ? 'note' : 'notes'} found.`;
  }
  search.addEventListener('input', updatePosts);
  filters.forEach(button => button.addEventListener('click', () => {
    selectedTag = button.dataset.filter;
    filters.forEach(filter => {
      filter.classList.toggle('is-active', filter === button);
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    updatePosts();
  }));
  updatePosts();
}

const printButton = document.querySelector('[data-print]');
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
}
