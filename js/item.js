/* DFNS — Cosmetic Detail Page */
"use strict";

const API="https://fortnite-api.com/v2";
const HISTORY_RAW="https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/history/shop";

const DFNSItem={
 item:null,shopEntry:null,historyRecord:null,imageMode:"featured",favoriteKey:"dfns-favorites",historicalPrice:null,
 async init(){
  this.bind();
  const p=new URLSearchParams(location.search),id=p.get("id")||p.get("item");
  if(!id)return this.showError("No cosmetic was selected.");
  try{
   const r=await fetch(`${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`,{cache:"no-store"});
   if(!r.ok)throw new Error(`Fortnite API error (${r.status})`);
   const j=await r.json();
   if(!j?.data)throw new Error("The API returned no cosmetic data.");
   this.item=j.data;
   await this.enrichMetadata(id);
   await this.loadShop(id);
   await this.loadHistoricalPrice(id);
   this.buildHistory();
   this.render();
  }catch(e){console.error("DFNS item:",e);this.showError(e?.message||"Unable to load this cosmetic.")}
 },
 bind(){
  document.querySelectorAll("[data-image-type]").forEach(b=>b.addEventListener("click",()=>{this.imageMode=b.dataset.imageType||"featured";document.querySelectorAll("[data-image-type]").forEach(x=>x.classList.toggle("active",x===b));this.setImage()}));
  document.querySelector("#favorite-button")?.addEventListener("click",()=>{if(!this.item?.id)return;const f=this.getFavorites(),active=f.has(this.item.id);active?f.delete(this.item.id):f.add(this.item.id);localStorage.setItem(this.favoriteKey,JSON.stringify([...f]));this.updateFavorite(!active);window.DFNSAuth?.syncFavorite?.(String(this.item.id),!active)});
  document.querySelector("#share-button")?.addEventListener("click",async()=>{try{if(navigator.share)await navigator.share({title:document.title,text:`Check out ${this.item?.name||"this Fortnite cosmetic"} on DFNS.`,url:location.href});else await navigator.clipboard.writeText(location.href);const b=document.querySelector("#share-button");if(b){const old=b.innerHTML;b.innerHTML="✓ <span>Copied!</span>";setTimeout(()=>b.innerHTML=old,1400)}}catch(_){}});
 },
 async enrichMetadata(id){
  const urls=[`${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`,`${API}/cosmetics/br/search/ids?id=${encodeURIComponent(id)}&language=en`,`${API}/cosmetics/br/search/all?id=${encodeURIComponent(id)}&matchMethod=full&language=en&searchLanguage=en`];
  for(const url of urls){try{const r=await fetch(url,{cache:"no-store"});if(!r.ok)continue;const j=await r.json();const list=Array.isArray(j?.data)?j.data:(j?.data?[j.data]:[]);const x=list.find(v=>String(v?.id||"").toLowerCase()===String(id).toLowerCase())||list[0];if(x)this.item={...this.item,...x};if(this.item?.lastAppearance||this.item?.shopHistory?.length)break}catch(e){console.warn("DFNS metadata:",e)}}
 },
 async loadShop(id){
  try{const r=await fetch(`${API}/shop`,{cache:"no-store"});if(!r.ok)return;const j=await r.json(),entries=Array.isArray(j?.data?.entries)?j.data.entries:[];this.shopEntry=entries.find(e=>(e.brItems||[]).some(i=>String(i?.id).toLowerCase()===String(id).toLowerCase()))||null}catch(e){console.warn("DFNS shop:",e)}
 },
 async loadHistoricalPrice(id){
  const last=this.toDate(this.item?.lastAppearance);
  if(!last)return;
  const date=this.isoDay(last);
  const url=`${HISTORY_RAW}/${date}.json`;
  try{
   const r=await fetch(url,{cache:"no-store"});
   if(!r.ok)return;
   const j=await r.json();
   const entries=Array.isArray(j?.data?.entries)?j.data.entries:Array.isArray(j?.entries)?j.entries:[];
   const hit=entries.find(e=>(e.brItems||[]).some(i=>String(i?.id||"").toLowerCase()===String(id).toLowerCase()));
   if(hit){
    const p=this.number(hit.finalPrice??hit.regularPrice??hit.prices?.[0]?.finalPrice??hit.prices?.[0]?.regularPrice);
    if(p!=null)this.historicalPrice=p;
   }
  }catch(e){console.warn("DFNS historical shop:",e)}
 },
 buildHistory(){
  const raw=Array.isArray(this.item?.shopHistory)?this.item.shopHistory:[];
  const appearances=raw.map(x=>this.toDate(x)).filter(Boolean).sort((a,b)=>b-a);
  const directLast=this.toDate(this.item?.lastAppearance);
  const last=directLast||appearances[0]||null;
  const first=this.toDate(this.item?.added)||appearances.at(-1)||null;
  this.historyRecord={firstSeen:first,lastSeen:last,appearances,price:this.historicalPrice};
 },
 getLastSeen(){return this.historyRecord?.lastSeen||null},
 getPrice(){
  if(this.shopEntry){const p=this.number(this.shopEntry.finalPrice??this.shopEntry.regularPrice);if(p!=null)return p}
  if(this.historicalPrice!=null)return this.historicalPrice;
  const p=this.number(this.item?.price??this.item?.finalPrice??this.item?.regularPrice);return p;
 },
 render(){
  const i=this.item,n=i.name||"Unknown Item",type=i.type?.displayValue||i.type?.value||i.displayType||"Cosmetic",rarity=i.rarity?.displayValue||i.rarity?.value||i.displayRarity||"Unknown",set=i.set?.text||i.set?.name||"—",series=i.series?.name||i.series?.value||"—",intro=i.introduction?.text||i.introduction?.chapter||i.introduction?.season||"—",added=this.historyRecord?.firstSeen,last=this.getLastSeen(),price=this.getPrice(),available=!!this.shopEntry;
  this.text("#item-name",n);this.text("#breadcrumb-item-name",n);this.text("#item-description",i.description||i.shortDescription||"No description available for this cosmetic.");this.text("#item-type",type);this.text("#item-rarity",rarity);this.text("#detail-name",n);this.text("#detail-type",type);this.text("#detail-rarity",rarity);this.text("#detail-id",i.id||"—");this.text("#detail-introduction",intro);this.text("#detail-added",this.formatDate(added));this.text("#detail-set",set);this.text("#detail-series",series);this.text("#detail-set-part",i.set?.partOfSet||set);this.text("#detail-shop-status",available?"In today's shop":"Not currently listed");this.text("#item-price",price==null?"—":price.toLocaleString());this.text("#availability-text",available?"Available in today's shop":last?"Previously available in the Item Shop":"Not currently in the shop");this.text("#availability-date",available?"Live shop data":last?`Last seen ${this.formatDate(last)}`:"No historical shop appearance recorded");this.renderLastSeen(last);this.setImage();this.updateFavorite(this.isFavorite(i.id));this.syncNotifyButton();document.title=`${n} — DFNS`;document.body.classList.add("item-ready")
 },
 renderLastSeen(date){const label=date?`${this.formatDate(date)} · ${this.relative(date)}`:"No shop history available";["#detail-last-seen","#item-last-seen-date"].forEach(s=>document.querySelectorAll(s).forEach(e=>{e.textContent=label;e.classList.toggle("is-unavailable",!date)}))},
 syncNotifyButton(){const b=document.querySelector("#notification-button");if(!b||!this.item?.id)return;let map={};try{map=JSON.parse(localStorage.getItem("dfns_watchlist_v1")||"{}")}catch{}const email=(()=>{try{return JSON.parse(localStorage.getItem("dfns_account_v1")||"null")?.email||"guest"}catch{return"guest"}})();const on=Array.isArray(map[email])&&map[email].some(x=>String(x.itemId)===String(this.item.id));b.classList.toggle("notify-active",on);b.setAttribute("aria-pressed",String(on));b.querySelector("span:last-child")?.replaceChildren(document.createTextNode(on?"Notifications on":"Notify me"))},
 setImage(){const i=this.item,featured=i?.images?.featured||i?.images?.full_background||i?.images?.icon||"",icon=i?.images?.icon||featured,selected=this.imageMode==="icon"?icon:featured,img=document.querySelector("#item-main-image");if(img&&selected){img.src=selected;img.alt=i.name||"Fortnite cosmetic"}const bg=document.querySelector("#item-hero-background");if(bg&&selected)bg.style.backgroundImage=`linear-gradient(90deg,rgba(7,7,10,.18),rgba(7,7,10,.88)),url("${selected.replaceAll('"','\\"')}")`},
 toDate(v){if(v==null||v==="")return null;if(v instanceof Date)return Number.isNaN(v.getTime())?null:v;if(typeof v==="number"||/^\s*\d+(?:\.\d+)?\s*$/.test(String(v))){const n=Number(v),d=new Date(n<10000000000?n*1000:n);return Number.isNaN(d.getTime())?null:d}if(typeof v==="object")return this.toDate(v.timestamp??v.date??v.value);const d=new Date(v);return Number.isNaN(d.getTime())?null:d},
 isoDay(d){const x=new Date(d);return `${x.getUTCFullYear()}-${String(x.getUTCMonth()+1).padStart(2,"0")}-${String(x.getUTCDate()).padStart(2,"0")}`},
 number(v){if(v==null||v==="")return null;const n=Number(String(v).replace(/[^0-9.-]/g,""));return Number.isFinite(n)&&n>=0?n:null},
 formatDate(d){return d?d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Not available"},
 relative(d){const a=new Date(),b=new Date(d),aa=new Date(a.getFullYear(),a.getMonth(),a.getDate()),bb=new Date(b.getFullYear(),b.getMonth(),b.getDate()),days=Math.max(0,Math.floor((aa-bb)/86400000));return days===0?"today":days===1?"1 day ago":`${days} days ago`},
 getFavorites(){try{const x=JSON.parse(localStorage.getItem(this.favoriteKey)||"[]");return new Set(Array.isArray(x)?x:[])}catch{return new Set()}},
 isFavorite(id){return this.getFavorites().has(id)},
 updateFavorite(active){const b=document.querySelector("#favorite-button");if(!b)return;b.setAttribute("aria-pressed",String(active));const icon=b.querySelector(".favorite-icon"),text=b.querySelector(".favorite-text");if(icon)icon.textContent=active?"♥":"♡";if(text)text.textContent=active?"Remove from Favorites":"Add to Favorites"},
 text(s,v){const e=document.querySelector(s);if(e)e.textContent=v??"—"},
 showError(m){document.querySelectorAll("[data-item-error]").forEach(e=>{e.hidden=false;e.textContent=m});console.error("DFNS item error:",m)}
};
document.addEventListener("DOMContentLoaded",()=>DFNSItem.init());
window.DFNSItem=DFNSItem;
