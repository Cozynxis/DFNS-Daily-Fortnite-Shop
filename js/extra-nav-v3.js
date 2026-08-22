document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    .dfns-extra-nav .dfns-extra-trigger.active{background:transparent;color:var(--muted)}
    .dfns-extra-nav .dfns-extra-trigger.active::after{transform:scaleX(0)}
    .sprite-season-filter{grid-column:1/-1;display:flex;gap:7px;align-items:center;margin-bottom:2px;padding:4px;border:1px solid var(--border);border-radius:12px;background:rgba(255,255,255,.025)}
    .sprite-season-filter button{border:0;border-radius:8px;padding:8px 12px;background:transparent;color:var(--muted);font-size:10px;font-weight:900;cursor:pointer;transition:.18s ease}
    .sprite-season-filter button:hover{color:var(--text);background:rgba(255,255,255,.05)}
    .sprite-season-filter button.active{color:#fff;background:linear-gradient(135deg,var(--accent),#8f74ff);box-shadow:0 7px 20px rgba(124,92,255,.2)}
    .sprite-card[hidden]{display:none!important}
    .sprite-season-badge{position:absolute;right:9px;top:9px;padding:5px 7px;border-radius:7px;background:rgba(124,92,255,.78);color:#fff;font-size:7px;font-weight:950;letter-spacing:.08em;text-transform:uppercase}
    @media(max-width:800px){.sprite-season-filter{grid-column:1/-1;overflow:auto}.sprite-season-filter button{white-space:nowrap}}
  `;
  document.head.appendChild(style);

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
    wrap.id = 'sprite-season-filter';
    wrap.innerHTML = `<button type="button" class="active" data-season="current">C7 S4 · Current</button><button type="button" data-season="all">All Seasons</button>`;
    toolbar.prepend(wrap);

    let mode = 'current';
    const apply = () => {
      grid.querySelectorAll('.sprite-card').forEach((card) => {
        const name = card.querySelector('.sprite-name')?.textContent?.trim() || '';
        const current = CURRENT_SPRITES.has(name);
        card.hidden = mode === 'current' && !current;
        let badge = card.querySelector('.sprite-season-badge');
        if (mode === 'current' && current && !badge) {
          badge = document.createElement('span');
          badge.className = 'sprite-season-badge';
          badge.textContent = 'C7 S4';
          card.appendChild(badge);
        } else if (mode === 'all' && badge) badge.remove();
      });
      const visible = [...grid.querySelectorAll('.sprite-card')].filter((card) => !card.hidden).length;
      const total = grid.querySelectorAll('.sprite-card').length;
      const results = document.querySelector('#sprite-results');
      if (results && total) results.textContent = mode === 'current' ? `${visible} current C7 S4 sprites shown` : `${total} sprites loaded`;
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
    setTimeout(apply, 400);
  };

  if (document.querySelector('.sprites-page')) {
    setupSpritesPage();
    window.setTimeout(setupSpritesPage, 1200);
  }
});
