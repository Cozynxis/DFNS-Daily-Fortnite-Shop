(() => {
  'use strict';
  const SOURCES = [
    'https://raw.githubusercontent.com/valincius/fn-sprites/main/src/sprites.json',
    'https://api-fortnite.com/api/v2/sprites'
  ];
  const state = { items: [], query: '', variant: 'all', rarity: 'all', sort: 'family' };
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>\'\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
  const pretty = v => String(v || 'base').replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  const CURRENT = new Set(['Sonic','Tails','Shadow','Jackrabbit','Klombo','8-Bit','Crown','Adventure','Bush','Jonesy','Killswitch','Storm Scout']);

  function normalize(data) {
    const raw = Array.isArray(data) ? data : (data?.data?.sprites || data?.sprites || data?.data || []);
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach(f => {
      if (f?.variants && Array.isArray(f.variants)) {
        const parent = f.displayName || f.name || f.id || 'Unknown Sprite';
        f.variants.forEach(v => out.push({
          parent,
          variant: String(v.displayName || v.name || v.variant || 'base').toLowerCase(),
          rarity: String(v.rarity || f.rarity || 'special').toLowerCase(),
          url: v.icon || v.image || v.url || f.icon || f.image || f.url || '',
          spriteId: v.id || v.variantId || f.id || ''
        }));
      } else if (f) {
        out.push({
          parent: f.displayName || f.parent || f.name || 'Unknown Sprite',
          variant: String(f.variant || f.variantName || 'base').toLowerCase(),
          rarity: String(f.rarity || 'special').toLowerCase(),
          url: f.icon || f.image || f.url || '',
          spriteId: f.id || f.spriteId || ''
        });
      }
    });
    return out.filter(x => x.parent && x.url);
  }

  async function fetchSource(url) {
    const r = await fetch(`${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return normalize(await r.json());
  }

  async function load() {
    const grid = $('sprite-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="sprite-loading"><span></span><strong>Loading current Fortnite Sprites...</strong></div>';
    let live = [];
    for (const source of SOURCES) {
      try { live = await fetchSource(source); if (live.length) break; } catch (e) { console.warn('[DFNS Sprites]', source, e); }
    }
    if (!live.length) {
      grid.innerHTML = '<div class="sprite-empty"><strong>Sprites could not be loaded.</strong><span>Please try Refresh in a moment.</span></div>';
      $('sprite-updated').textContent = 'Live source unavailable';
      return;
    }
    state.items = live;
    render();
    $('sprite-updated').textContent = `Live sprite catalog · ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  }

  function filtered() {
    const q = state.query;
    const a = state.items.filter(x =>
      (!q || `${x.parent} ${x.variant} ${x.rarity}`.toLowerCase().includes(q)) &&
      (state.variant === 'all' || x.variant.includes(state.variant)) &&
      (state.rarity === 'all' || x.rarity === state.rarity)
    );
    a.sort((x,y) => {
      if (state.sort === 'rarity') return (y.rarity||'').localeCompare(x.rarity||'');
      if (state.sort === 'variant') return (x.variant||'').localeCompare(y.variant||'');
      if (state.sort === 'id') return String(x.spriteId).localeCompare(String(y.spriteId), undefined, {numeric:true});
      return (x.parent||'').localeCompare(y.parent||'') || String(x.spriteId).localeCompare(String(y.spriteId), undefined, {numeric:true});
    });
    return a;
  }

  function render() {
    const a = filtered();
    $('sprite-total').textContent = state.items.length;
    $('family-total').textContent = new Set(state.items.map(x => x.parent)).size;
    $('variant-total').textContent = new Set(state.items.map(x => x.variant)).size;
    $('sprite-results').textContent = `${a.length} / ${state.items.length} sprites`;
    if (!a.length) {
      $('sprite-grid').innerHTML = '<div class="sprite-empty"><strong>No Sprites found</strong><span>Try another search or filter.</span></div>';
      return;
    }
    $('sprite-grid').innerHTML = a.map(x => {
      const current = CURRENT.has(x.parent);
      const image = `<img loading="lazy" referrerpolicy="no-referrer" src="${esc(x.url)}" alt="${esc(x.parent)} ${esc(x.variant)}" onerror="this.dataset.failed='1';this.parentElement.classList.add('image-error')">`;
      return `<article class="sprite-card${current ? ' current-sprite' : ''}"><div class="sprite-art">${image}<div class="sprite-image-fallback"><span>✦</span><strong>${esc(x.parent)}</strong></div></div><span class="sprite-variant">${esc(pretty(x.variant))}</span>${current ? '<span class="sprite-season-badge">CURRENT</span>' : ''}<div class="sprite-info"><div class="sprite-name" title="${esc(x.parent)}">${esc(x.parent)}</div><div class="sprite-meta"><span class="sprite-rarity rarity-${esc(x.rarity)}">${esc(x.rarity)}</span><span class="sprite-id">#${esc(x.spriteId)}</span></div></div></article>`;
    }).join('');
  }

  function bind() {
    $('sprite-search')?.addEventListener('input', e => { state.query = e.target.value.trim().toLowerCase(); render(); });
    $('sprite-variant')?.addEventListener('change', e => { state.variant = e.target.value; render(); });
    $('sprite-rarity')?.addEventListener('change', e => { state.rarity = e.target.value; render(); });
    $('sprite-sort')?.addEventListener('change', e => { state.sort = e.target.value; render(); });
    $('sprite-refresh')?.addEventListener('click', load);
  }

  document.addEventListener('DOMContentLoaded', () => {
    bind();
    load();
    setInterval(load, 900000);
  });
})();
