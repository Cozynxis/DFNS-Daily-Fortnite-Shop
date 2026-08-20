/* DFNS — timeline compatibility bridge
   item.js is now the single source of truth. This file intentionally does not
   replace getLastSeen/getPrice/historyRecord with partial API responses. */
"use strict";
(async function(){
  let tries=0;
  while(!window.DFNSItem?.item?.id && tries++<200) await new Promise(r=>setTimeout(r,100));
  const item=window.DFNSItem;
  if(!item?.item?.id)return;
  try{
    item.render?.();
    console.info("DFNS timeline bridge: using authoritative item.js timeline",item.item.id);
  }catch(e){console.warn("DFNS timeline bridge:",e)}
})();