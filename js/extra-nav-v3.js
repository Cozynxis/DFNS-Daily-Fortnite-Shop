document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dfns-extra-nav').forEach((root) => {
    const button = root.querySelector('.dfns-extra-trigger');
    const menu = root.querySelector('.dfns-extra-menu');
    if (!button || !menu) return;

    const links = [
      { href: 'countdown.html', icon: '◷', title: 'Countdown', description: 'Season & mode countdowns' },
      { href: 'map.html', icon: '▧', title: 'Map', description: 'Live BR & OG maps' }
    ];

    links.forEach(({ href, icon, title, description }) => {
      if (menu.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement('a');
      link.href = href;
      link.innerHTML = `<span class="dfns-menu-icon">${icon}</span><span><strong>${title}</strong><small>${description}</small></span>`;
      menu.appendChild(link);
    });

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = root.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
  });

  document.addEventListener('click', (event) => {
    document.querySelectorAll('.dfns-extra-nav.open').forEach((root) => {
      if (!root.contains(event.target)) {
        root.classList.remove('open');
        root.querySelector('.dfns-extra-trigger')?.setAttribute('aria-expanded', 'false');
      }
    });
  });
});
