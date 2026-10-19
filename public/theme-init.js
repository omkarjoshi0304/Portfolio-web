// Runs before the stylesheet to avoid a flash when a saved theme is present.
try {
  const theme = localStorage.getItem('omkar-theme');
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
} catch { /* The default dark theme also works when storage is unavailable. */ }
