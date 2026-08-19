/* DFNS — reliable cosmetic timeline repair */
"use strict";
(async function(){
  const API="https://fortnite-api.com/v2";
  const toDate=value=>{
    if(value==null||value==="")return null;
    if(typeof value==="number"||/^\s*\d+(?:\.\d+)?\s*$/.test(String(value))){const n=Number(value),d=new Date(n<10000000000?n*1000:n);return Number.isNaN(d.getTime())?null:d}
    if(typeof value==="object")return toDate(value.timestamp??value.date??value.value);
    const d=new Date(value);return Number.isNaN(d.getTime())?null:d;
  };
  const getJson=async url=>{const r=await fetch(url,{cache:"no-store",headers:{Accept:"application/json"}});if(!r.ok)throw new Error(`${r.status}`);return r.json()};
  const wait=()=>new Promise(resolve=>{let n=0;const t=setInterval(()=>{if(window.DFNSItem?.item?.id){clearInterval(t);resolve(window.DFNSItem)}else if(++n>180){clearInterval(t);resolve(null)}},100)});
  try{
    const dfns=await wait();if(!dfns)return;
    const id=String(dfns.item.id), name=String(dfns.item.name||"");
    let found={...dfns.item};
    // The detail endpoint is the primary source. It already contains the item's
    // authoritative added/lastAppearance fields when available.
    try{const j=await getJson(`${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`);if(j?.data)found={...found,...j.data}}catch(e){console.warn("DFNS detail timeline request failed",e)}
    const urls=[
      `${API}/cosmetics/br/search/ids?id=${encodeURIComponent(id)}&language=en`,
      `${API}/cosmetics/br/search?id=${encodeURIComponent(id)}&matchMethod=full&language=en&searchLanguage=en`,
      `${API}/cosmetics/br/search/all?id=${encodeURIComponent(id)}&matchMethod=full&language=en&searchLanguage=en`,
      `${API}/cosmetics/br/search?name=${encodeURIComponent(name)}&matchMethod=full&language=en&searchLanguage=en`
    ];
    for(const url of urls){
      try{const j=await getJson(url);const list=Array.isArray(j?.data)?j.data:j?.data?[j.data]:[];const x=list.find(v=>String(v?.id||"").toLowerCase()===id.toLowerCase())||list.find(v=>String(v?.name||"").toLowerCase()===name.toLowerCase());if(x){found={...found,...x};if(x.lastAppearance||x.added||x.shopHistory?.length)break}}catch(e){console.warn("DFNS timeline endpoint failed",url,e)}}
    dfns.item={...dfns.item,...found};
    const history=Array.isArray(found.shopHistory)?found.shopHistory.map(toDate).filter(Boolean).sort((a,b)=>b-a):[];
    const directLast=toDate(found.lastAppearance);
    const last=directLast||history[0]||toDate(dfns.historyRecord?.lastSeen);
    const added=toDate(found.added)||toDate(found.addedSince)||toDate(dfns.historyRecord?.firstSeen);
    dfns.historyRecord={...(dfns.historyRecord||{}),lastSeen:last||null,firstSeen:added||dfns.historyRecord?.firstSeen||null,appearances:history.map(date=>({date,price:null}))};
    dfns.getLastSeen=function(){return toDate(this.item?.lastAppearance)||toDate(this.historyRecord?.lastSeen)||null};
    dfns.render();
    const label=last?`${dfns.formatDate(last)} · ${dfns.relative(last)}`:"No shop history available";
    ["#detail-last-seen","#item-last-seen-date"].forEach(sel=>document.querySelectorAll(sel).forEach(el=>{el.textContent=label;el.classList.toggle("is-unavailable",!last);if(last)el.title=`Last seen: ${dfns.formatDate(last)}`}));
    const addedEl=document.querySelector("#detail-added");if(addedEl)addedEl.textContent=added?dfns.formatDate(added):"Not available";
    console.info("DFNS timeline repaired",{id,name,added:found.added,lastAppearance:found.lastAppearance,history:history.length});
  }catch(e){console.error("DFNS timeline repair failed",e)}
})();