/* DFNS — reliable cosmetic timeline repair */
"use strict";
(async function(){
  const API="https://fortnite-api.com/v2";
  const toDate=value=>{if(value==null||value==="")return null;if(value instanceof Date)return Number.isNaN(value.getTime())?null:value;if(typeof value==="number"||/^\s*\d+(?:\.\d+)?\s*$/.test(String(value))){const n=Number(value),d=new Date(n<10000000000?n*1000:n);return Number.isNaN(d.getTime())?null:d}if(typeof value==="object")return toDate(value.timestamp??value.date??value.value);const d=new Date(value);return Number.isNaN(d.getTime())?null:d};
  const getJson=async url=>{const r=await fetch(url,{cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)throw new Error(`${r.status}`);return r.json()};
  const wait=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{if(window.DFNSItem?.item?.id){clearInterval(t);resolve(window.DFNSItem)}else if(++n>200){clearInterval(t);resolve(null)}},100)});
  try{
    const dfns=await wait();if(!dfns)return;
    const id=String(dfns.item.id), name=String(dfns.item.name||"");
    // history.js may already have supplied the complete local lifetime dataset.
    // Never overwrite that dataset with a partial API response.
    const existingRecord=dfns.historyRecord||{};
    const existingEntries=Array.isArray(existingRecord.appearances)?existingRecord.appearances.map(x=>({date:toDate(x?.date??x),price:x?.price??null})).filter(x=>x.date):[];
    let found={...dfns.item};
    try{const j=await getJson(`${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`);if(j?.data)found={...found,...j.data}}catch(e){console.warn("DFNS detail timeline request failed",e)}
    // Search endpoints are only enrichment fallbacks. They must not replace local history.
    const urls=[`${API}/cosmetics/br/search/ids?id=${encodeURIComponent(id)}&language=en`,`${API}/cosmetics/br/search?id=${encodeURIComponent(id)}&matchMethod=full&language=en&searchLanguage=en`,`${API}/cosmetics/br/search/all?id=${encodeURIComponent(id)}&matchMethod=full&language=en&searchLanguage=en`,`${API}/cosmetics/br/search?name=${encodeURIComponent(name)}&matchMethod=full&language=en&searchLanguage=en`];
    for(const url of urls){try{const j=await getJson(url);const list=Array.isArray(j?.data)?j.data:j?.data?[j.data]:[];const x=list.find(v=>String(v?.id||"").toLowerCase()===id.toLowerCase())||list.find(v=>String(v?.name||"").toLowerCase()===name.toLowerCase());if(x){found={...found,...x};if(x.lastAppearance||x.added)break}}catch(e){console.warn("DFNS timeline endpoint failed",url)}}
    dfns.item={...dfns.item,...found};
    const apiHistory=Array.isArray(found.shopHistory)?found.shopHistory.map(x=>({date:toDate(x?.date??x),price:x?.price??null})).filter(x=>x.date):[];
    const merged=[...existingEntries,...apiHistory].reduce((map,x)=>{const key=x.date.toISOString().slice(0,10);if(!map.has(key)||map.get(key).price==null&&x.price!=null)map.set(key,x);return map},new Map());
    const appearances=[...merged.values()].sort((a,b)=>b.date-a.date);
    const directLast=toDate(found.lastAppearance);
    const last=directLast&&directLast<=new Date(Date.now()+86400000)?directLast:(appearances[0]?.date||toDate(existingRecord.lastSeen));
    const added=toDate(found.added)||toDate(found.addedSince)||toDate(existingRecord.firstSeen);
    dfns.historyRecord={...existingRecord,lastSeen:last||null,firstSeen:added||existingRecord.firstSeen||null,appearances};
    dfns.getHistoryEntries=function(){return appearances.length?appearances:[]};
    dfns.getLastSeen=function(){const direct=toDate(this.item?.lastAppearance);return direct&&direct<=new Date(Date.now()+86400000)?direct:(this.historyRecord?.appearances?.[0]?.date||toDate(this.historyRecord?.lastSeen)||null)};
    dfns.getPrice=function(){if(this.shopEntry){const p=Number(this.shopEntry.finalPrice??this.shopEntry.regularPrice??this.shopEntry.prices?.[0]?.finalPrice??this.shopEntry.prices?.[0]?.regularPrice);if(Number.isFinite(p))return p}const p=appearances.find(x=>x.price!=null)?.price;return p!=null?Number(p):Number(this.historyRecord?.price)||null};
    dfns.render();
    const lastFinal=dfns.getLastSeen();
    const label=lastFinal?`${dfns.formatDate(lastFinal)} · ${dfns.relative(lastFinal)}`:"No shop history available";
    ["#detail-last-seen","#item-last-seen-date"].forEach(sel=>document.querySelectorAll(sel).forEach(el=>{el.textContent=label;el.classList.toggle("is-unavailable",!lastFinal);if(lastFinal)el.title=`Last seen: ${dfns.formatDate(lastFinal)}`}));
    const addedEl=document.querySelector("#detail-added");if(addedEl)addedEl.textContent=added?dfns.formatDate(added):"Not available";
    console.info("DFNS timeline repaired",{id,name,added:added?.toISOString?.(),last:lastFinal?.toISOString?.(),history:appearances.length});
  }catch(e){console.error("DFNS timeline repair failed",e)}
})();