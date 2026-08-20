"use strict";

const API="https://fortnite-api.com/v2";
const HISTORY_RAW="https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/history/shop";

const DFNSItem={
 item:null,shopEntry:null,historyRecord:null,historicalPrice:null,imageMode:"featured",favoriteKey:"dfns-favorites",
 async init(){
  this.bind();
  const p=new URLSearchParams(location.search),id=p.get("id")||p.get("item");
  if(!id)return this.showError("No cosmetic was selected.");
  try{
   const item=await this.fetchCosmetic(id); if(!item)throw Error("Cosmetic not found");
   this.item=item;
   await this.loadTimeline(id);
   await this.loadShop(id);
   await this.loadHistoricalPrice();
   this.render();
  }catch(e){console.error("DFNS item",e);this.showError(e?.message||"Unable to load cosmetic")}
 },
 async json(url){const r=await fetch(url,{cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)throw Error(`API ${r.status}`);return r.json()},
 async fetchCosmetic(id){
  const urls=[`${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`,`${API}/cosmetics/br/search/ids?language=en&id=${encodeURIComponent(id)}`,`${API}/cosmetics/br/search?language=en&searchLanguage=en&matchMethod=full&id=${encodeURIComponent(id)}`];
  for(const u of urls){try{const j=await this.json(u),a=Array.isArray(j?.data)?j.data:(j?.data?[j.data]:[]),x=a.find(v=>String(v?.id).toLowerCase()===String(id).toLowerCase())||a[0];if(x)return x}catch(e){console.warn("DFNS cosmetic:",e)}}
  return null;
 },
 async loadTimeline(id){
  const dates=[];const add=v=>{const d=this.toDate(v);if(d)dates.push(d)};
  const absorb=x=>{if(!x)return;if(Array.isArray(x.shopHistory))x.shopHistory.forEach(add);add(x.lastAppearance)};
  absorb(this.item);
  /* The search-by-ID endpoint is the reliable fallback for metadata fields. */
  for(const endpoint of [`${API}/cosmetics/br/search/ids?language=en&id=${encodeURIComponent(id)}`,`${API}/cosmetics/br/search/all?language=en&searchLanguage=en&matchMethod=full&id=${encodeURIComponent(id)}`]){
   try{const j=await this.json(endpoint),a=Array.isArray(j?.data)?j.data:[],x=a.find(v=>String(v?.id).toLowerCase()===String(id).toLowerCase())||a[0];if(x){this.item={...this.item,...x};absorb(x)}if(dates.length)break}catch(e){console.warn("DFNS last-seen fallback:",e)}
  }
  /* Final fallback: the complete BR cosmetics list contains lastAppearance even when a single-item response does not. */
  if(!dates.length){
   try{const j=await this.json(`${API}/cosmetics/br?language=en`),a=Array.isArray(j?.data)?j.data:[],x=a.find(v=>String(v?.id).toLowerCase()===String(id).toLowerCase());if(x){this.item={...this.item,...x};absorb(x)}}catch(e){console.warn("DFNS complete-cosmetics fallback:",e)}
  }
  const unique=[...new Map(dates.map(d=>[d.toISOString().slice(0,10),d])).values()].sort((a,b)=>b-a);
  const added=this.toDate(this.item?.added);
  this.historyRecord={firstSeen:added||unique.at(-1)||null,lastSeen:unique[0]||null,appearances:unique};
 },
 async loadShop(id){
  try{const j=await this.json(`${API}/shop`),entries=Array.isArray(j?.data?.entries)?j.data.entries:[],wanted=String(id).toLowerCase();this.shopEntry=entries.find(e=>Array.isArray(e?.brItems)&&e.brItems.some(i=>String(i?.id||"").toLowerCase()===wanted))||null;if(this.shopEntry){const child=this.shopEntry.brItems.find(i=>String(i?.id||"").toLowerCase()===wanted);this.historicalPrice=this.readPrice(child)??this.readPrice(this.shopEntry)}}catch(e){console.warn("DFNS shop:",e);this.shopEntry=null}
 },
 async loadHistoricalPrice(){
  if(this.historicalPrice!=null)return;
  const id=this.item?.id,last=this.historyRecord?.lastSeen;if(!id||!last)return;
  /* Prefer the lifetime registry: it contains every shop appearance and its price. */
  try{const r=await fetch("https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/main/data/items/registry.json",{cache:"force-cache"});if(r.ok){const registry=await r.json();const rec=registry?.[id]||registry?.items?.[id];if(rec){const appearances=rec.shopHistory||rec.appearances||rec.shop||rec.history;if(Array.isArray(appearances)){let best=null;for(const a of appearances){const d=this.toDate(a.date??a.timestamp??a.shopDate);const p=this.readPrice(a);if(d&&p!=null&&d.getTime()===last.getTime())return void(this.historicalPrice=p);if(d&&p!=null&&(!best||Math.abs(d-last)<Math.abs(best.d-last)))best={d,p}}if(best)this.historicalPrice=best.p}else{this.historicalPrice=this.readPrice(rec)}}}}catch(e){console.warn("DFNS registry price:",e)}
  if(this.historicalPrice!=null)return;
  try{const r=await fetch(`${HISTORY_RAW}/${this.isoDay(last)}.json`,{cache:"force-cache"});if(r.ok)this.historicalPrice=this.findPrice(await r.json(),id)}catch(e){console.warn("DFNS historical price:",e)}
 },
 findPrice(snapshot,id){const wanted=String(id).toLowerCase(),out=[];const scan=v=>{if(!v||typeof v!=="object")return;if(Array.isArray(v)){v.forEach(scan);return}if(Array.isArray(v.brItems)){for(const i of v.brItems)if(String(i?.id||"").toLowerCase()===wanted){const p=this.readPrice(i)??this.readPrice(v);if(p!=null)out.push(p)}}Object.values(v).forEach(scan)};scan(snapshot);return out[0]??null},
 readPrice(v){if(!v||typeof v!=="object")return null;for(const k of ["finalPrice","regularPrice","price","vbucks","vBucks"]){const n=this.number(v[k]);if(n!=null)return n}return null},
 render(){const i=this.item||{},n=i.name||i.displayName||"Unknown Item",type=i.type?.displayValue||i.displayType||"Cosmetic",rarity=i.rarity?.displayValue||i.displayRarity||"Unknown",last=this.historyRecord?.lastSeen,price=this.historicalPrice,available=!!this.shopEntry,lastText=last?`${this.formatDate(last)} · ${this.relative(last)}`:"No shop history available";this.text("#item-name",n);this.text("#breadcrumb-item-name",n);this.text("#item-description",i.description||i.shortDescription||"No description available for this cosmetic.");this.text("#item-type",type);this.text("#item-rarity",rarity);this.text("#detail-name",n);this.text("#detail-type",type);this.text("#detail-rarity",rarity);this.text("#detail-id",i.id||"—");this.text("#detail-introduction",i.introduction?.text||i.introduction?.chapter||i.introduction?.season||"—");this.text("#detail-added",this.formatDate(this.toDate(i.added)||this.historyRecord?.firstSeen));this.text("#detail-last-seen",lastText);this.text("#item-last-seen-date",lastText);this.text("#detail-set",i.set?.text||i.set?.name||"—");this.text("#detail-series",i.series?.name||i.series?.value||"—");this.text("#detail-set-part",i.set?.partOfSet||i.set?.text||"—");this.text("#detail-shop-status",available?"In today's shop":"Not currently listed");this.text("#item-price",price==null?"—":price.toLocaleString());this.text("#availability-text",available?"Available in today's shop":last?"Previously available in the Item Shop":"Not currently in the shop");this.text("#availability-date",available?"Live shop data":last?`Last seen ${this.formatDate(last)}`:"—");this.setImage();this.updateFavorite(this.isFavorite(i.id));document.title=`${n} — DFNS`;document.body.classList.add("item-ready")},
 setImage(){const i=this.item||{},src=this.imageMode==="icon"?(i.images?.icon||i.images?.featured):(i.images?.featured||i.images?.full_background||i.images?.icon);const img=document.querySelector("#item-main-image");if(img&&src){img.src=src;img.alt=i.name||"Fortnite cosmetic"}const bg=document.querySelector("#item-hero-background");if(bg&&src)bg.style.backgroundImage=`linear-gradient(90deg,rgba(7,7,10,.18),rgba(255,255,255,.88)),url("${String(src).replaceAll('"','\\"')}")`},
 toDate(v){if(v==null||v==="")return null;if(v instanceof Date)return Number.isNaN(v.getTime())?null:v;if(typeof v==="number"){const d=new Date(v<10000000000?v*1000:v);return Number.isNaN(d.getTime())?null:d}if(typeof v==="object")return this.toDate(v.timestamp??v.date??v.value);const d=new Date(v);return Number.isNaN(d.getTime())?null:d},isoDay(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`},number(v){if(v==null||v==="")return null;const n=Number(String(v).replace(/[^0-9.-]/g,""));return Number.isFinite(n)&&n>=0?n:null},formatDate(d){return d?d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Not available"},relative(d){const a=new Date(),b=new Date(d),aa=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()),bb=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()),n=Math.max(0,Math.floor((aa-bb)/86400000));return n===0?"today":n===1?"1 day ago":`${n} days ago`},getFavorites(){try{const a=JSON.parse(localStorage.getItem(this.favoriteKey)||"[]");return new Set(Array.isArray(a)?a:[])}catch{return new Set()}},isFavorite(id){return this.getFavorites().has(id)},updateFavorite(on){const b=document.querySelector("#favorite-button");if(!b)return;const i=b.querySelector(".favorite-icon"),t=b.querySelector(".favorite-text");if(i)i.textContent=on?"♥":"♡";if(t)t.textContent=on?"Remove from Favorites":"Add to Favorites";b.classList.toggle("active",on)},text(s,v){const e=document.querySelector(s);if(e)e.textContent=v??"—"},showError(m){console.error("DFNS item error:",m);this.text("#item-name","Unable to load cosmetic");this.text("#item-description",m||"Please try again.")},bind(){document.querySelectorAll("[data-image-type]").forEach(b=>b.addEventListener("click",()=>{this.imageMode=b.dataset.imageType||"featured";document.querySelectorAll("[data-image-type]").forEach(x=>x.classList.toggle("active",x===b));this.setImage()}));document.querySelector("#favorite-button")?.addEventListener("click",()=>{const id=this.item?.id;if(!id)return;const f=this.getFavorites(),on=!f.has(id);on?f.add(id):f.delete(id);localStorage.setItem(this.favoriteKey,JSON.stringify([...f]));this.updateFavorite(on);window.DFNSAuth?.syncFavorite?.(String(id),on)});document.querySelector("#share-button")?.addEventListener("click",async()=>{try{if(navigator.share)await navigator.share({title:document.title,text:`Check out ${this.item?.name||"this Fortnite cosmetic"} on DFNS.`,url:location.href});else await navigator.clipboard.writeText(location.href)}catch{}})}};

document.addEventListener("DOMContentLoaded",()=>DFNSItem.init());window.DFNSItem=DFNSItem;
