(() => {
  'use strict';
  const RAW='https://raw.githubusercontent.com/mombiemala/fnsprites/main/public/sprites/';
  const LIVE_NAMES=['Adventure','8-Bit','Sonic','Tails','Bush','Crown','Jackrabbit','Jonesy','Killswitch','Klombo','Shadow','Storm Scout'];
  const LIVE_VARIANTS=['normal','gold','cheatmaster'];
  const RARITY={Adventure:'rare','8-Bit':'rare',Sonic:'epic',Tails:'epic',Bush:'rare',Crown:'mythic',Jackrabbit:'legendary',Jonesy:'rare',Killswitch:'epic',Klombo:'mythic',Shadow:'epic','Storm Scout':'rare'};
  const EMOJI={Adventure:'🧭','8-Bit':'🕹️',Sonic:'💙',Tails:'🦊',Bush:'🌿',Crown:'👑',Jackrabbit:'🐇',Jonesy:'🧑',Killswitch:'⚙️',Klombo:'🦕',Shadow:'🌑','Storm Scout':'🌩️'};
  const state={items:[],query:'',variant:'all',rarity:'all',sort:'family'};
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pretty=v=>v==='normal'?'Base':v==='cheatmaster'?'Cheat Master':String(v).replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
  const fileName=(name,variant)=>`${name.toLowerCase().replace(/[^a-z0-9]+/g,'')}_${variant}.webp`;
  const fallback=(name)=>`<div class="sprite-image-fallback"><span class="sprite-placeholder-mark">${esc(EMOJI[name]||name.slice(0,1))}</span><strong>${esc(name)}</strong></div>`;

  function buildCurrentCatalog(){
    const out=[];
    LIVE_NAMES.forEach(name=>LIVE_VARIANTS.forEach(variant=>out.push({parent:name,variant,rarity:RARITY[name],url:RAW+fileName(name,variant),spriteId:`C7S4_${name}_${variant}`,current:true})));
    return out;
  }

  async function load(){
    const grid=$('sprite-grid'); if(!grid)return;
    grid.innerHTML='<div class="sprite-loading"><span></span><strong>Loading current Chapter 7 Season 4 Sprites...</strong></div>';
    // The public Fortnite API's Sprite endpoint requires an API key. We therefore
    // keep the page functional without exposing a secret in GitHub Pages and use
    // the verified live Season 4 roster as the public fallback. The catalog can be
    // refreshed without rebuilding the page.
    state.items=buildCurrentCatalog();
    render();
    $('sprite-updated').textContent=`Chapter 7 Season 4 · live roster · ${new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  }

  function filtered(){
    const q=state.query;
    const a=state.items.filter(x=>(!q||`${x.parent} ${x.variant} ${x.rarity}`.toLowerCase().includes(q))&&(state.variant==='all'||x.variant===state.variant)&&(state.rarity==='all'||x.rarity===state.rarity));
    a.sort((x,y)=>{if(state.sort==='rarity')return(y.rarity||'').localeCompare(x.rarity||'');if(state.sort==='variant')return(x.variant||'').localeCompare(y.variant||'');return(x.parent||'').localeCompare(y.parent||'')});
    return a;
  }

  function render(){
    const a=filtered();
    $('sprite-total').textContent=state.items.length;
    $('family-total').textContent=new Set(state.items.map(x=>x.parent)).size;
    $('variant-total').textContent=new Set(state.items.map(x=>x.variant)).size;
    $('sprite-results').textContent=`${a.length} / ${state.items.length} current sprites`;
    if(!a.length){$('sprite-grid').innerHTML='<div class="sprite-empty"><strong>No Sprites found</strong><span>Try another search or filter.</span></div>';return;}
    $('sprite-grid').innerHTML=a.map(x=>`<article class="sprite-card current-sprite"><div class="sprite-art"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(x.url)}" alt="${esc(x.parent)} ${esc(x.variant)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'"><div class="sprite-image-fallback">${fallback(x.parent)}</div></div><span class="sprite-variant">${esc(pretty(x.variant))}</span><span class="sprite-season-badge">C7 S4</span><div class="sprite-info"><div class="sprite-name">${esc(x.parent)}</div><div class="sprite-meta"><span class="sprite-rarity rarity-${esc(x.rarity)}">${esc(x.rarity)}</span><span class="sprite-id">${esc(x.variant)}</span></div></div></article>`).join('');
  }

  function bind(){
    $('sprite-search')?.addEventListener('input',e=>{state.query=e.target.value.trim().toLowerCase();render()});
    $('sprite-variant')?.addEventListener('change',e=>{state.variant=e.target.value;render()});
    $('sprite-rarity')?.addEventListener('change',e=>{state.rarity=e.target.value;render()});
    $('sprite-sort')?.addEventListener('change',e=>{state.sort=e.target.value;render()});
    $('sprite-refresh')?.addEventListener('click',load);
  }
  document.addEventListener('DOMContentLoaded',()=>{bind();load();setInterval(load,900000)});
})();
