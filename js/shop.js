/* DFNS — Daily Fortnite Shop */
"use strict";

const DFNSShop = {
  items: [], filtered: [],
  async init() {
    this.grid = document.querySelector("#shop-items, #featured-items, [data-shop-items]");
    this.search = document.querySelector("#shop-search-input, .shop-search-input, [data-shop-search]");
    this.count = document.querySelector("#visible-item-count");
    this.bind(); await this.load();
  },
  bind() { this.search?.addEventListener("input", () => this.render()); },
  async load() {
    if (!this.grid) return;
    this.grid.innerHTML = '<div class="shop-loading-state">Loading today\'s Item Shop…</div>';
    try {
      const r = await fetch("https://fortnite-api.com/v2/shop", {headers:{Accept:"application/json"},cache:"no-store"});
      if (!r.ok) throw new Error(`API error ${r.status}`);
      const json = await r.json(), entries = Array.isArray(json.data?.entries) ? json.data.entries : [], seen = new Set();
      this.items = [];
      for (const entry of entries) for (const item of (entry.brItems || [])) {
        if (!item?.id || seen.has(item.id)) continue; seen.add(item.id);
        this.items.push({id:item.id,name:item.name||"Unknown Item",type:item.type?.displayValue||"Cosmetic",rarity:item.rarity?.displayValue||"Unknown",image:item.images?.featured||item.images?.icon||"",price:Number(entry.finalPrice??entry.regularPrice??0)});
      }
      this.render();
    } catch(e) { console.error(e); this.grid.innerHTML=`<div class="shop-api-error"><strong>Couldn't load today's Item Shop.</strong><span>${this.escape(e.message)}</span><button type="button" onclick="DFNSShop.load()">Retry</button></div>`; }
  },
  render() {
    const q=(this.search?.value||"").trim().toLowerCase();
    this.filtered=this.items.filter(i=>!q||`${i.name} ${i.type} ${i.rarity}`.toLowerCase().includes(q));
    if(this.count) this.count.textContent=this.filtered.length;
    if(!this.filtered.length){this.grid.innerHTML='<div class="shop-empty-state"><strong>No items found</strong><span>Try another search.</span></div>';return;}
    this.grid.innerHTML=this.filtered.map(i=>`<article class="shop-card rarity-${this.slug(i.rarity)}"><a href="item.html?id=${encodeURIComponent(i.id)}" class="shop-card-link"><div class="shop-card-image-wrapper">${i.image?`<img class="shop-card-image" src="${this.attr(i.image)}" alt="${this.attr(i.name)}" loading="lazy">`:''}<span class="shop-card-rarity">${this.escape(i.rarity)}</span></div><div class="shop-card-content"><h3 class="shop-card-name">${this.escape(i.name)}</h3><div class="shop-card-meta"><span>${this.escape(i.type)}</span><strong>V ${i.price.toLocaleString()}</strong></div></div></a><button type="button" class="shop-card-favorite" data-favorite-id="${this.attr(i.id)}">♡</button></article>`).join("");
  },
  slug(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,"-");},
  escape(v){const d=document.createElement("div");d.textContent=v??"";return d.innerHTML;},
  attr(v){return this.escape(v).replace(/"/g,"&quot;");}
};
document.addEventListener("DOMContentLoaded",()=>DFNSShop.init());
window.DFNSShop=DFNSShop;
