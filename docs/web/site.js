// Shared behaviour for docs/web pages: light/dark toggle + current-page nav mark.
(() => {
  const root = document.documentElement;
  try { const t = localStorage.getItem('ugt-theme'); if (t) root.dataset.theme = t; } catch {}
  document.addEventListener('DOMContentLoaded', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a.link').forEach((a) => {
      if (a.getAttribute('href') === page) a.setAttribute('aria-current', 'page');
    });
    const btn = document.querySelector('.theme-btn');
    if (!btn) return;
    const dark = () => root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const label = () => { btn.textContent = dark() ? '☀ สว่าง' : '☾ มืด'; };
    label();
    btn.addEventListener('click', () => {
      root.dataset.theme = dark() ? 'light' : 'dark';
      try { localStorage.setItem('ugt-theme', root.dataset.theme); } catch {}
      label();
      document.dispatchEvent(new CustomEvent('ugt-theme', { detail: root.dataset.theme }));
    });
  });
})();
