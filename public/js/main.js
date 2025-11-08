// public/js/main.js

// 1) Chặn mọi <a href="#"> khiến nhảy /#
(function stopHashAnchors() {
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href="#"]');
    if (a) { e.preventDefault(); e.stopPropagation(); }
  }, true);
})();

// 2) Khởi tạo dropdown Bootstrap nếu nút tồn tại
(function initDropdown() {
  document.addEventListener('DOMContentLoaded', function () {
    if (!window.bootstrap) return;
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
      try { new bootstrap.Dropdown(el, { autoClose: 'outside' }); } catch (_) {}
    });
  });
})();

// 3) Diệt các overlay trang trí có thể che click (an toàn)
(function killOverlays() {
  const killers = [
    '.hero-blob', '.decor-blob', '.mask-overlay',
    '.home-hero::before', '.home-hero::after'
  ];
  const style = document.createElement('style');
  style.textContent = `
    .hero-blob, .decor-blob, .mask-overlay { pointer-events: none !important; }
    .home-hero::before, .home-hero::after { pointer-events: none !important; }
  `;
  document.head.appendChild(style);
})();
