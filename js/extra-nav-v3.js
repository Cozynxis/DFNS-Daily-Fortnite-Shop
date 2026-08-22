document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dfns-extra-nav').forEach(root => {
    const button = root.querySelector('.dfns-extra-trigger');
    const menu = root.querySelector('.dfns-extra-menu');
    if (!button || !menu) return;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      const open = root.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      root.classList.remove('open');
      button.setAttribute('aria-expanded', 'false');
    }));
  });
  document.addEventListener('click', event => {
    document.querySelectorAll('.dfns-extra-nav.open').forEach(root => {
      if (!root.contains(event.target)) {
        root.classList.remove('open');
        root.querySelector('.dfns-extra-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
  });
});
