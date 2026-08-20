/* DFNS — cosmetic timeline metadata fallback */
"use strict";
(async function(){
  const API="https://fortnite-api.com/v2";
  for(let i=0;i<120&&!window.DFNSItem?.item?.id;i++) await new Promise(r=>setTimeout(r,100));
  const item=window.DFNSItem;if(!item?.item?.id)return;
  const id=String(item.item.id);
  try{
    const urls=[
      `${API}/cosmetics/br/search/ids?id=${encodeURIComponent(id)}&language=en`,
      `${API}/cosmetics/br/search/all?id=${encodeURIComponent(id)}&matchMethod=full&language=en&searchLanguage=en`
    ];
    for(const url of urls){
      try{
        const r=await fetch(url,{cache:"no-store"});if(!r.ok)continue;
        const j=await r.json();const list=Array.isArray(j?.data)?j.data:(j?.data?[j.data]:[]);
        const found=list.find(x=>String(x?.id||"").toLowerCase()===id.toLowerCase())||list[0];
        if(found){
          item.item={...item.item,...found};
          if(found.lastAppearance||found.added)break;
        }
      }catch(e){console.warn("DFNS timeline metadata request failed:",e)}
    }
    item.buildHistory();
    item.render();
  }catch(e){console.warn("DFNS timeline fallback failed:",e)}
})();