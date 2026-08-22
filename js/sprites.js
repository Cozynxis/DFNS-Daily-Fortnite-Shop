(() => {
  const API = 'https://api-fortnite.com/api/v2/sprites';
  const state = { items: [], query: '', variant: 'all', rarity: 'all', sort: 'family' };
  const CURRENT = ['Sonic','Tails','Shadow','Jackrabbit','Klombo','8-Bit','Crown','Adventure','Bush','Jonesy','Killswitch','Storm Scout'];
  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const pretty = v => String(v || 'base').replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  const slug = v => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

  const fallback = () => CURRENT.flatMap((name, i) => [
    { parent:name, variant:'base', rarity:['epic','epic','epic','legendary','mythic','rare','mythic','rare','rare','rare','epic','rare'][i], url:'', spriteId:`c7s4-${slug(name)}` },
    { parent:name, variant:'gold', rarity:'special', url:'', spriteId:`c7s4-${slug(name)}-gold` },
    { parent:name, variant:'cheat master', rarity:'special', url:'', spriteId:`c7s4-${slug(name)}-cheat-master` }
  ]);

  const normalize = data => {
    const raw = Array.isArray(data) ? data : (data?.data?.sprites || data?.sprites || data?.data || []);
    if (!Array.isArray(raw)) return [];
    const out = [];
    raw.forEach(f => {
      if (f?.variants && Array.isArray(f.variants)) {
        const parent = f.displayName || f.name || f.id || 'Unknown Sprite';
        f.variants.forEach(v => out.push({
          parent, variant: String(v.displayName || v.name || v.variant || 'base').toLowerCase(),
          rarity: String(v.rarity || f.rarity || 'special').toLowerCase(),
          url: v.icon || v.image || v.url || f.icon || f.image || f.url || '', spriteId: v.id || v.variantId || f.id || ''
        }));
      } else if (f) {
        out.push({
          parent: f.displayName || f.parent || f.name || 'Unknown Sprite',
          variant: String(f.variant || f.variantName || 'base').toLowerCase(),
          rarity: String(f.rarity || 'special').toLowerCase(),
          url: f.icon || f.image || f.url || '', spriteId: f.id || f.spriteId || ''
        });
      }
    });
    return out.filter(x => x.parent);
  };

  const load = async () => {
    const grid = $('sprite-grid');
    grid.innerHTML = '<div class="sprite-loading"><span></span><strong>Loading current Season 4 Sprites...</strong></div>';
    try {
      const r = await fetch(`${API}?t=${Date.now()}`, { cache:'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const live = normalize(data);
      if (!live.length) throw new Error('Empty sprite catalog');
      state.items = live;
      render();
      $('sprite-updated').textContent = `Live API · ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    } catch (e) {
      console.warn('[DFNS Sprites] API unavailable, using current Season 4 catalog:', e);
      state.items = fallback();
      render();
      $('sprite-updated').textContent = 'Season 4 fallback catalog · API unavailable';
    }
  };

  const filtered = () => {
    const q = state.query;
    const a = state.items.filter(x =>
      (!q || `${x.parent} ${x.variant} ${x.rarity}`.toLowerCase().includes(q)) &&
      (state.variant === 'all' || x.variant.includes(state.variant)) &&
      (state.rarity === 'all' || x.rarity === state.rarity)
    );
    a.sort((x,y) => state.sort === 'rarity' ? (y.rarity||'').localeCompare(x.rarity||'') : state.sort === 'variant' ? (x.variant||'').localeCompare(y.variant||'') : (x.parent||'').localeCompare(y.parent||''));
    return a;
  };

  const render = () => {
    const a = filtered();
    $('sprite-total').textContent = state.items.length;
    $('family-total').textContent = new Set(state.items.map(x => x.parent)).size;
    $('variant-total').textContent = new Set(state.items.map(x => x.variant)).size;
    $('sprite-results').textContent = `${a.length} / ${state.items.length} entries`;
    if (!a.length) { $('sprite-grid').innerHTML = '<div class="sprite-empty"><strong>No Sprites found</strong><span>Try another filter.</span></div>'; return; }
    $('sprite-grid').innerHTML = a.map(x => {
      const isCurrent = CURRENT.some(n => n.toLowerCase() === String(x.parent).toLowerCase());
      const fallbackArt = !x.url ? `<div class="sprite-placeholder"><span>✦</span><strong>${esc(x.parent)}</strong></div>` : `<img loading="lazy" src="${esc(x.url)}" alt="${esc(x.parent)} ${esc(x.variant)}" onerror="this.parentElement.classList.add('image-error');this.remove()">`;
      return `<article class="sprite-card${isCurrent ? ' current-sprite' : ''}"><div class="sprite-art">${fallbackArt}</div><span class="sprite-variant">${esc(pretty(x.variant))}</span>${isCurrent ? '<span class="sprite-season-badge">C7 S4</span>' : ''}<div class="sprite-info"><div class="sprite-name" title="${esc(x.parent)}">${esc(x.parent)}</div><div class="sprite-meta"><span class="sprite-rarity rarity-${esc(x.rarity)}">${esc(x.rarity)}</span><span class="sprite-id">${esc(x.spriteId)}</span></div></div></article>`;
    }).join('');
  };

  const bind = () => {
    $('sprite-search').addEventListener('input', e => { state.query = e.target.value.trim().toLowerCase(); render(); });
    $('sprite-variant').addEventListener('change', e => { state.variant = e.target.value; render(); });
    $('sprite-rarity').addEventListener('change', e => { state.rarity = e.target.value; render(); });
    $('sprite-sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
    $('sprite-refresh').addEventListener('click', load);
  };
  document.addEventListener('DOMContentLoaded', () => { bind(); load(); setInterval(load, 900000); });
})();
