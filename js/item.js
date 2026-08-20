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
   const item=await this.fetchCosmetic(id);
   if(!item)throw Error("Cosmetic not found");
   this.item=item;
   await Promise.allSettled([this.loadShop(id),this.loadTimeline(id)]);
   await this.loadHistoricalPrice();
   this.render();
  }catch(e){console.error("DFNS item",e);this.showError(e?.message||"Unable to load cosmetic")}
 },
 async fetchCosmetic(id){
  const urls=[
   `${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`,
   `${API}/cosmetics/br/search?language=en&searchLanguage=en&matchMethod=full&id=${encodeURIComponent(id)}`,
   `${API}/cosmetics/br/search/all?language=en&searchLanguage=en&matchMethod=full&id=${encodeURIComponent(id)}`
  ];
  for(const url of urls){try{const r=await fetch(url,{cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)continue;const j=await r.json();const list=Array.isArray(j?.data)?j.data:(j?.data?[j.data]:[]);const found=list.find(x=>String(x?.id).toLowerCase()===String(id).toLowerCase())||list[0];if(found)return found}catch(e){console.warn("DFNS cosmetic request:",e)}}
  return null;
 },
 async loadShop(id){
  try{
   /* /v2/shop is the working shop endpoint used by the rest of DFNS. */
   const r=await fetch(`${API}/shop`,{cache:"no-store",headers:{Accept:"application/json"}});
   if(!r.ok)throw Error(`Shop API ${r.status}`);
   const j=await r.json();
   const entries=Array.isArray(j?.data?.entries)?j.data.entries:[];
   const wanted=String(id).toLowerCase();
   this.shopEntry=entries.find(e=>Array.isArray(e?.brItems)&&e.brItems.some(i=>String(i?.id||"").toLowerCase()===wanted))||null;
   if(this.shopEntry){
    const child=this.shopEntry.brItems.find(i=>String(i?.id||"").toLowerCase()===wanted);
    this.historicalPrice=this.readPrice(this.shopEntry);
    if(this.historicalPrice==null)this.historicalPrice=this.readPrice(child);
   }
  }catch(e){console.warn("DFNS shop:",e);this.shopEntry=null}
 },
 async loadTimeline(id){
  let dates=[];
  const add=v=>{const d=this.toDate(v);if(d)dates.push(d)};
  if(Array.isArray(this.item?.shopHistory))this.item.shopHistory.forEach(add);
  add(this.item?.lastAppearance);

  /* Search/all is a reliable fallback when the single-item response omits shopHistory. */
  if(!dates.length){
   try{
    const r=await fetch(`${API}/cosmetics/br/search/all?language=en&searchLanguage=en&matchMethod=full&id=${encodeURIComponent(id)}`,{cache:"no-store"});
    if(r.ok){const j=await r.json();const list=Array.isArray(j?.data)?j.data:[];const x=list.find(v=>String(v?.id).toLowerCase()===String(id).toLowerCase())||list[0];if(x){if(Array.isArray(x.shopHistory))x.shopHistory.forEach(add);add(x.lastAppearance);}}
   }catch(e){console.warn("DFNS history fallback:",e)}
  }
  const unique=[...new Map(dates.map(d=>[d.toISOString().slice(0,10),d])).values()].sort((a,b)=>b-a);
  const added=this.toDate(this.item?.added);
  this.historyRecord={firstSeen:added||unique.at(-1)||null,lastSeen:unique[0]||null,appearances:unique};
 },
 async loadHistoricalPrice(){
  if(this.historicalPrice!=null)return;
  const last=this.historyRecord?.lastSeen;
  if(!last||!this.item?.id)return;
  const day=this.isoDay(last);
  try{
   const r=await fetch(`${HISTORY_RAW}/${day}.json`,{cache:"force-cache"});
   if(!r.ok)return;
   const snapshot=await r.json();
   this.historicalPrice=this.findPrice(snapshot,this.item.id);
  }catch(e){console.warn("DFNS historical price:",e)}
 },
 findPrice(snapshot,id){
  const wanted=String(id).toLowerCase(),entries=[];
  const collect=v=>{
   if(!v||typeof v!=="object")return;
   if(Array.isArray(v)){v.forEach(collect);return}
   if(Array.isArray(v.brItems))entries.push(v);
   Object.values(v).forEach(collect);
  };
  collect(snapshot);
  for(const e of entries){
   const item=e.brItems.find(i=>String(i?.id||"").toLowerCase()===wanted);
   if(item){const p=this.readPrice(e)??this.readPrice(item);if(p!=null)return p;}
  }
  /* Some historical snapshots store the item and price in a flatter object. */
  let result=null;
  const scan=v=>{
   if(result!=null||!v||typeof v!=="object")return;
   if(Array.isArray(v)){v.forEach(scan);return}
   if(String(v.id||"").toLowerCase()===wanted){result=this.readPrice(v);if(result!=null)return}
   Object.values(v).forEach(scan);
  };
  scan(snapshot);return result;
 },
 readPrice(v){if(!v||typeof v!=="object")return null;for(const k of ["finalPrice","regularPrice","price","vbucks","vBucks"]){const n=this.number(v[k]);if(n!=null)return n}return null},
 buildHistory(){},
 render(){
  const i=this.item||{},n=i.name||i.displayName||"Unknown Item",type=i.type?.displayValue||i.displayType||"Cosmetic",rarity=i.rarity?.displayValue||i.displayRarity||"Unknown",last=this.historyRecord?.lastSeen,price=this.historicalPrice,available=!!this.shopEntry;
  const lastText=last?`${this.formatDate(last)} · ${this.relative(last)}`:"No shop history available";
  this.text("#item-name",n);this.text("#breadcrumb-item-name",n);this.text("#item-description",i.description||i.shortDescription||"No description available for this cosmetic.");this.text("#item-type",type);this.text("#item-rarity",rarity);
  this.text("#detail-name",n);this.text("#detail-type",type);this.text("#detail-rarity",rarity);this.text("#detail-id",i.id||"—");this.text("#detail-introduction",i.introduction?.text||i.introduction?.chapter||i.introduction?.season||"—");this.text("#detail-added",this.formatDate(this.toDate(i.added)||this.historyRecord?.firstSeen));this.text("#detail-last-seen",lastText);this.text("#item-last-seen-date",lastText);
  this.text("#detail-set",i.set?.text||i.set?.name||"—");this.text("#detail-series",i.series?.name||i.series?.value||"—");this.text("#detail-set-part",i.set?.partOfSet||i.set?.text||"—");this.text("#detail-shop-status",available?"In today's shop":"Not currently listed");this.text("#item-price",price==null?"—":price.toLocaleString());this.text("#availability-text",available?"Available in today's shop":last?"Previously available in the Item Shop":"Not currently in the shop");this.text("#availability-date",available?"Live shop data":last?`Last seen ${this.formatDate(last)}`:"—");
  this.setImage();this.updateFavorite(this.isFavorite(i.id));document.title=`${n} — DFNS`;document.body.classList.add("item-ready");
 },
 setImage(){const i=this.item||{},src=this.imageMode==="icon"?(i.images?.icon||i.images?.featured):(i.images?.featured||i.images?.full_background||i.images?.icon);const img=document.querySelector("#item-main-image");if(img&&src){img.src=src;img.alt=i.name||"Fortnite cosmetic"}const bg=document.querySelector("#item-hero-background");if(bg&&src)bg.style.backgroundImage=`linear-gradient(90deg,rgba(7,7,10,.18),rgba(7,7,10,.88)),url("${String(src).replaceAll('"','\\"')}")`},
 toDate(v){if(v==null||v==="")return null;if(v instanceof Date)return Number.isNaN(v.getTime())?null:v;if(typeof v==="number"){const d=new Date(v<10000000000?v*1000:v);return Number.isNaN(d.getTime())?null:d}if(typeof v==="object")return this.toDate(v.timestamp??v.date??v.value);const d=new Date(v);return Number.isNaN(d.getTime())?null:d},
 isoDay(d){return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`},
 number(v){if(v==null||v==="")return null;const n=Number(String(v).replace(/[^0-9.-]/g,""));return Number.isFinite(n)&&n>=0?n:null},
 formatDate(d){return d?d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):"Not available"},
 relative(d){const a=new Date(),b=new Date(d),aa=Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()),bb=Date.UTC(b.getFullYear(),b.getMonth(),b.getDate()),n=Math.max(0,Math.floor((aa-bb)/86400000));return n===0?"today":n===1?"1 day ago":`${n} days ago`},
 getFavorites(){try{const a=JSON.parse(localStorage.getItem(this.favoriteKey)||"[]");return new Set(Array.isArray(a)?a:[])}catch{return new Set()}},isFavorite(id){return this.getFavorites().has(id)},
 updateFavorite(on){const b=document.querySelector("#favorite-button");if(!b)return;const i=b.querySelector(".favorite-icon"),t=b.querySelector(".favorite-text");if(i)i.textContent=on?"♥":"♡";if(t)t.textContent=on?"Remove from Favorites":"Add to Favorites";b.classList.toggle("active",on)},
 text(s,v){const e=document.querySelector(s);if(e)e.textContent=v??"—"},
 showError(m){console.error("DFNS item error:",m);this.text("#item-name","Unable to load cosmetic");this.text("#item-description",m||"Please try again.")},
 bind(){
  document.querySelectorAll("[data-image-type]").forEach(b=>b.addEventListener("click",()=>{this.imageMode=b.dataset.imageType||"featured";document.querySelectorAll("[data-image-type]").forEach(x=>x.classList.toggle("active",x===b));this.setImage()}));
  document.querySelector("#favorite-button")?.addEventListener("click",()=>{const id=this.item?.id;if(!id)return;const f=this.getFavorites(),on=!f.has(id);on?f.add(id):f.delete(id);localStorage.setItem(this.favoriteKey,JSON.stringify([...f]));this.updateFavorite(on);window.DFNSAuth?.syncFavorite?.(String(id),on)});
  document.querySelector("#share-button")?.addEventListener("click",async()=>{try{if(navigator.share)await navigator.share({title:document.title,text:`Check out ${this.item?.name||"this Fortnite cosmetic"} on DFNS.`,url:location.href});else await navigator.clipboard.writeText(location.href)}catch{}})
 }
};

document.addEventListener("DOMContentLoaded",()=>DFNSItem.init());
window.DFNSItem=DFNSItem;
