document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.dfns-extra-nav').forEach((root) => {
    const button = root.querySelector('.dfns-extra-trigger');
    const menu = root.querySelector('.dfns-extra-menu');
    if (!button || !menu) return;
    button.classList.remove('active');
    const links = [
      { href: 'countdown.html', icon: '◷', title: 'Countdown', description: 'Season & mode countdowns' },
      { href: 'map.html', icon: '▧', title: 'Map', description: 'Live BR & OG maps' },
      { href: 'sprites.html', icon: '✦', title: 'Sprites', description: 'Current Fortnite sprites' }
    ];
    links.forEach(({ href, icon, title, description }) => {
      if (menu.querySelector(`a[href="${href}"]`)) return;
      const link = document.createElement('a');
      link.href = href;
      link.innerHTML = `<span class="dfns-menu-icon">${icon}</span><span><strong>${title}</strong><small>${description}</small></span>`;
      menu.appendChild(link);
    });
    const current = location.pathname.split('/').pop().toLowerCase() || 'index.html';
    menu.querySelectorAll('a').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === current);
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

  // The sprite catalog currently tracked by Fortnite.GG for Chapter 7 Season 4.
  // Keep this list here so the DFNS page immediately highlights the newest season
  // while still allowing users to browse the full historical catalog.
  const CURRENT_SPRITES = new Set([
    'Jackrabbit','Shadow','Bush','Tails','Killswitch','Adventure','Klombo',
    'Jonesy','Sonic','Crown','8-Bit','Storm Scout','John Wick'
  ]);

  const setupSpritesPage = () => {
    const grid = document.querySelector('#sprite-grid');
    const toolbar = document.querySelector('.sprites-toolbar');
    if (!grid || !toolbar || document.querySelector('#sprite-season-filter')) return;

    const wrap = document.createElement('div');
    wrap.className = 'sprite-season-filter';
    wrap.innerHTML = `
      <button type="button" class="active" data-season="current">C7 S4 · Current</button>
      <button type="button" data-season="all">All Seasons</button>
    `;
    toolbar.prepend(wrap);
    wrap.id = 'sprite-season-filter';

    let mode = 'current';
    const apply = () => {
      grid.querySelectorAll('.sprite-card').forEach((card) => {
        const name = card.querySelector('.sprite-name')?.textContent?.trim() || '';
        card.hidden = mode === 'current' && !CURRENT_SPRITES.has(name);
      });
      const visible = [...grid.querySelectorAll('.sprite-card')].filter((card) => !card.hidden).length;
      const total = grid.querySelectorAll('.sprite-card').length;
      const results = document.querySelector('#sprite-results');
      if (results && total) results.textContent = `${visible} current sprites shown · ${total} loaded`;
    };
    wrap.addEventListener('click', (event) => {
      const btn = event.target.closest('button');
      if (!btn) return;
      mode = btn.dataset.season;
      wrap.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
      apply();
    });

    const observer = new MutationObserver(() => window.requestAnimationFrame(apply));
    observer.observe(grid, { childList: true, subtree: true });
    setTimeout(apply, 350);
  };

  if (document.querySelector('.sprites-page')) {
    setupSpritesPage();
    window.setTimeout(setupSpritesPage, 1000);
  }
});
