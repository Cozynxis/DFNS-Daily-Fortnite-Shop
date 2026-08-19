/* DFNS — Daily Fortnite Shop */
"use strict";

const API = "https://fortnite-api.com/v2/shop";
const state = { items: [], search: "", category: "all", rarity: "all", price: "all", sort: "default" };
const esc = v => { const d = document.createElement("div"); d.textContent = v ?? ""; return d.innerHTML; };
const image = c => c?.images?.featured || c?.images?.icon || c?.images?.full_background || "";
const type = c => c?.type?.displayValue || c?.type?.value || "Cosmetic";
const rarity = c => c?.rarity?.displayValue || c?.rarity?.value || "Unknown";

function normalize(data) {
  const out = [], seen = new Set();
  for (const entry of data?.entries || []) {
    for (const c of entry?.brItems || []) {
      if (!c?.id || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push({ id:c.id, name:c.name||c.displayName||"Unknown Item", type:type(c), rarity:rarity(c), image:image(c), price:Number(entry.finalPrice ?? entry.regularPrice ?? 0), section:String(entry.section?.name||"Daily").toLowerCase() });
    }
  }
  return out;
}

function matches(item) {
  if (state.category !== "all") {
    const t = item.type.toLowerCase();
    const ok = state.category === "outfit" ? (t.includes("outfit") || t.includes("skin")) : state.category === "backbling" ? (t.includes("back")) : t.includes(state.category);
    if (!ok) return false;
  }
  if (state.rarity !== "all" && !item.rarity.toLowerCase().includes(state.rarity)) return false;
  if (state.price !== "all" && (state.price === "free" ? item.price !== 0 : item.price >= Number(state.price))) return false;
  if (state.search && !`${item.name} ${item.type} ${item.rarity}`.toLowerCase().includes(state.search)) return false;
  return true;
}

function card(item) {
  const favorite = window.DFNS?.favorites?.has?.(item.id) || false;
  return `<article class="shop-card"><a class="shop-card-link" href="item.html?id=${encodeURIComponent(item.id)}"><div class="shop-card-image-wrapper">${item.image ? `<img class="shop-card-image" src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy">` : `<div class="shop-card-image-placeholder">No image</div>`}<span class="shop-card-rarity">${esc(item.rarity)}</span></div><div class="shop-card-content"><h3 class="shop-card-name">${esc(item.name)}</h3><div class="shop-card-meta"><span class="shop-card-type">${esc(item.type)}</span><span class="shop-card-price"><span class="vbucks-icon">V</span> ${item.price.toLocaleString()}</span></div></div></a><button class="shop-card-favorite ${favorite ? "active" : ""}" type="button" data-favorite-id="${esc(item.id)}" aria-label="${favorite ? "Remove" : "Add"} favorite">${favorite ? "♥" : "♡"}</button></article>`;
}

function render() {
  let items = state.items.filter(matches);
  if (state.sort === "price-low") items.sort((a,b)=>a.price-b.price);
  if (state.sort === "price-high") items.sort((a,b)=>b.price-a.price);
  if (state.sort === "name-asc") items.sort((a,b)=>a.name.localeCompare(b.name));
  if (state.sort === "name-desc") items.sort((a,b)=>b.name.localeCompare(a.name));

  const featured = items.filter(i=>i.section.includes("featured"));
  const daily = items.filter(i=>!i.section.includes("featured"));
  const featuredItems = featured.length ? featured : items.slice(0, Math.min(12, items.length));
  const f=document.querySelector("#featured-items"), d=document.querySelector("#daily-items");
  const empty=`<div class="shop-empty-state"><strong>No items found</strong><span>Try another filter or search.</span></div>`;
  if(f) f.innerHTML=featuredItems.map(card).join("")||empty;
  if(d) d.innerHTML=daily.map(card).join("")||empty;
  document.querySelector("#visible-item-count")?.replaceChildren(document.createTextNode(items.length.toLocaleString()));
  document.querySelector("#shop-item-count")?.replaceChildren(document.createTextNode(items.length.toLocaleString()));
  document.querySelector("#featured-count")?.replaceChildren(document.createTextNode(featuredItems.length.toLocaleString()));
  document.querySelector("#daily-count")?.replaceChildren(document.createTextNode(daily.length.toLocaleString()));
  document.querySelector("#active-filter-summary")?.replaceChildren(document.createTextNode(state.search || state.category !== "all" || state.rarity !== "all" || state.price !== "all" ? "Filters active" : "All Items"));
}

async function load() {
  try {
    const response = await fetch(API,{headers:{Accept:"application/json"},cache:"no-store"});
    if(!response.ok) throw Error(`Fortnite API returned ${response.status}`);
    const json=await response.json(); state.items=normalize(json.data);
    if(!state.items.length) throw Error("No shop items were returned.");
    const date=document.querySelector("#shop-date");
    if(date) date.textContent=new Date(json.data?.date||Date.now()).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
    render();
  } catch(error) {
    console.error("DFNS shop:",error);
    document.querySelectorAll(".shop-grid").forEach(grid=>grid.innerHTML=`<div class="shop-api-error"><strong>Unable to load today's shop.</strong><span>${esc(error.message)}</span><button type="button" onclick="location.reload()">Retry</button></div>`);
  }
}

document.addEventListener("click",event=>{
  const button=event.target.closest("[data-favorite-id]");
  if(!button||!window.DFNS?.favorites)return;
  event.preventDefault(); event.stopPropagation();
  const active=window.DFNS.favorites.toggle(button.dataset.favoriteId);
  button.classList.toggle("active",active); button.textContent=active?"♥":"♡";
});

document.addEventListener("DOMContentLoaded",()=>{
  const query=new URLSearchParams(location.search); state.search=(query.get("search")||"").toLowerCase();
  const input=document.querySelector("#shop-search-input");
  if(input){input.value=query.get("search")||"";input.addEventListener("input",()=>{state.search=input.value.trim().toLowerCase();render();});}
  document.querySelector("#clear-search")?.addEventListener("click",()=>{if(input)input.value="";state.search="";render();});
  document.querySelector("#shop-sort-select")?.addEventListener("change",e=>{state.sort=e.target.value;render();});
  document.querySelectorAll("[data-filter-type]").forEach(button=>button.addEventListener("click",()=>{state[button.dataset.filterType]=button.dataset.filterValue||"all";document.querySelectorAll(`[data-filter-type="${button.dataset.filterType}"]`).forEach(x=>x.classList.toggle("active",x===button));render();}));
  document.querySelector("#reset-filters")?.addEventListener("click",()=>{Object.assign(state,{search:"",category:"all",rarity:"all",price:"all",sort:"default"});if(input)input.value="";const sort=document.querySelector("#shop-sort-select");if(sort)sort.value="default";document.querySelectorAll("[data-filter-type]").forEach(x=>x.classList.toggle("active",x.dataset.filterValue==="all"));render();});
  load();
});
window.DFNSShop={state,load,render};
