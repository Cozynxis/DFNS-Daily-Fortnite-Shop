(() => {
  const API = 'https://fortnite-api.com/v1/map';
  const OG_IMAGE = 'https://www.pcgamesn.com/wp-content/uploads/2019/05/fortnite-season-9-map-1-900x882.jpg';
  const OG_POIS = [
    'Junk Junction','Haunted Hills','Pleasant Park','Snobby Shores','Neo Tilted','Loot Lake','Lazy Lagoon','Pressure Plant','Sunny Steps','Lonely Lodge','Mega Mall','Dusty Divot','Shifty Shafts','Salty Springs','Polar Peak','Frosty Flights','Happy Hamlet','Lucky Landing','Fatal Fields','Paradise Palms'
  ];

  const state = { mode:'br', br:null, zoom:1, panX:0, panY:0, dragging:false, lastX:0, lastY:0 };
  const els = {};
  const $ = id => document.getElementById(id);

  function cache(){
    ['map-image','poi-layer','poi-list','poi-count','poi-search','map-name','map-subtitle','map-updated','map-loading','map-refresh','official-map-link','zoom-in','zoom-out','zoom-reset'].forEach(id => els[id]=$(id));
  }

  function setUpdated(text){ if(els['map-updated']) els['map-updated'].textContent=text; }
  function niceTime(){ return new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date()); }

  function applyTransform(){
    const transform = `translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;
    els['map-image'].style.transform=transform;
    els['poi-layer'].style.transform=transform;
  }

  function resetView(){ state.zoom=1; state.panX=0; state.panY=0; applyTransform(); }
  function zoomBy(delta){ state.zoom=Math.max(.85,Math.min(3,state.zoom+delta)); applyTransform(); }

  function mapPoint(poi){
    // Fortnite-API coordinates cover roughly a 240k x 240k square.
    const x=Math.max(-120000,Math.min(120000,Number(poi.location?.x||0)));
    const y=Math.max(-120000,Math.min(120000,Number(poi.location?.y||0)));
    return { left:((x+120000)/240000)*100, top:((y+120000)/240000)*100 };
  }

  function renderList(pois){
    const query=(els['poi-search'].value||'').trim().toLowerCase();
    const filtered=pois.filter(p => p.name.toLowerCase().includes(query));
    els['poi-count'].textContent=filtered.length;
    els['poi-list'].innerHTML=filtered.map((p,i)=>`<button class="poi-row" type="button" data-poi-index="${i}"><span><strong>${escapeHtml(p.name)}</strong></span><small>POI</small></button>`).join('') || '<div class="poi-row"><span><strong>No locations found</strong></span></div>';
  }

  function renderMarkers(pois){
    els['poi-layer'].innerHTML=pois.map(p=>{
      const pos=mapPoint(p);
      return `<span class="map-poi" style="left:${pos.left}%;top:${pos.top}%"><span class="map-poi-dot"></span>${escapeHtml(p.name)}</span>`;
    }).join('');
  }

  function escapeHtml(value){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

  function setMapImage(src, alt){
    els['map-image'].src=src;
    els['map-image'].alt=alt;
    els['map-image'].onload=()=>{ els['map-loading'].style.display='none'; resetView(); };
    els['map-image'].onerror=()=>{ els['map-loading'].innerHTML='<strong>Map image could not be loaded.</strong><small style="opacity:.5">Try refresh</small>'; };
  }

  function useOG(){
    state.mode='og';
    els['map-name'].textContent='Fortnite OG — Chapter 1 Season 9';
    els['map-subtitle'].textContent='The futuristic OG Season 9 island with its classic named locations.';
    els['official-map-link'].href='https://fortnite.gg/?map=og';
    setMapImage(OG_IMAGE,'Fortnite OG Chapter 1 Season 9 map');
    const pois=OG_POIS.map(name=>({name,location:{x:0,y:0}}));
    // The reference image already contains the POI labels, so the sidebar is the authoritative list here.
    els['poi-layer'].innerHTML='';
    renderList(pois);
    setUpdated('OG reference · '+niceTime());
  }

  async function loadBR(force=false){
    state.mode='br';
    els['map-name'].textContent='Battle Royale — Chapter 7 Season 4';
    els['map-subtitle'].textContent='Current island map with named locations from live Fortnite map data.';
    els['official-map-link'].href='https://fortnite.gg/';
    els['map-loading'].style.display='grid';
    els['map-loading'].innerHTML='<span></span><strong>Loading live island...</strong>';
    try{
      const url=force ? `${API}?t=${Date.now()}` : API;
      const response=await fetch(url,{cache:'no-store'});
      if(!response.ok) throw new Error('Map request failed');
      const json=await response.json();
      state.br=json.data;
      const pois=(json.data?.pois||[]).filter(p=>p?.name && String(p.id||'').includes('.POI.Generic.')).sort((a,b)=>a.name.localeCompare(b.name));
      setMapImage(json.data.images.pois,'Current Fortnite Battle Royale map with POI names');
      renderMarkers(pois);
      renderList(pois);
      setUpdated('Updated '+niceTime());
    }catch(error){
      console.error('[DFNS Map]',error);
      els['map-loading'].innerHTML='<strong>Live map data unavailable</strong><small style="opacity:.5">Try refresh</small>';
      // Keep the last successful image/list if available.
      if(state.br?.images?.pois){ setMapImage(state.br.images.pois,'Current Fortnite Battle Royale map'); }
    }
  }

  function switchMode(mode){
    document.querySelectorAll('.map-mode-tab').forEach(button=>{
      const active=button.dataset.mapMode===mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',String(active));
    });
    resetView();
    if(mode==='og') useOG(); else loadBR();
  }

  function bind(){
    document.querySelectorAll('.map-mode-tab').forEach(button=>button.addEventListener('click',()=>switchMode(button.dataset.mapMode)));
    els['map-refresh'].addEventListener('click',()=>state.mode==='br'?loadBR(true):useOG());
    els['poi-search'].addEventListener('input',()=>{
      if(state.mode==='br' && state.br) renderList((state.br.pois||[]).filter(p=>p?.name && String(p.id||'').includes('.POI.Generic.')).sort((a,b)=>a.name.localeCompare(b.name)));
      else renderList(OG_POIS.map(name=>({name,location:{x:0,y:0}})));
    });
    els['zoom-in'].addEventListener('click',()=>zoomBy(.2));
    els['zoom-out'].addEventListener('click',()=>zoomBy(-.2));
    els['zoom-reset'].addEventListener('click',resetView);

    const stage=$('map-stage');
    stage.addEventListener('wheel',e=>{e.preventDefault();zoomBy(e.deltaY<0?.12:-.12)},{passive:false});
    stage.addEventListener('pointerdown',e=>{state.dragging=true;state.lastX=e.clientX;state.lastY=e.clientY;stage.setPointerCapture(e.pointerId);stage.classList.add('dragging')});
    stage.addEventListener('pointermove',e=>{if(!state.dragging)return;state.panX+=e.clientX-state.lastX;state.panY+=e.clientY-state.lastY;state.lastX=e.clientX;state.lastY=e.clientY;applyTransform()});
    const end=()=>{state.dragging=false;stage.classList.remove('dragging')};
    stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);stage.addEventListener('pointerleave',end);
  }

  document.addEventListener('DOMContentLoaded',()=>{
    cache(); bind(); switchMode('br');
    setInterval(()=>{if(state.mode==='br') loadBR(true)},5*60*1000);
  });
})();
