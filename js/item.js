/* DFNS — Cosmetic Detail */
"use strict";

const DFNSItem = {
  async init() {
    const id = new URLSearchParams(location.search).get("id") || new URLSearchParams(location.search).get("item");
    if (!id) return this.message("No item selected.");
    try {
      const r = await fetch(`https://fortnite-api.com/v2/cosmetics/br/${encodeURIComponent(id)}`, {headers:{Accept:"application/json"},cache:"no-store"});
      if (!r.ok) throw new Error(r.status === 404 ? "Item not found." : `API error ${r.status}`);
      const json = await r.json();
      this.render(json.data);
    } catch(e) { console.error(e); this.message(e.message); }
  },
  render(item) {
    const image=item.images?.featured||item.images?.icon||item.images?.full_background||"";
    this.set("#item-name,.item-name,[data-item-name]",item.name||"Unknown Item");
    this.set("#item-description,.item-description,[data-item-description]",item.description||item.shortDescription||"No description available.");
    this.set("#item-rarity,.item-rarity,[data-item-rarity]",item.rarity?.displayValue||"Unknown");
    this.set("#item-type,.item-type,[data-item-type]",item.type?.displayValue||"Cosmetic");
    this.set("#item-id,.item-id,[data-item-id]",item.id||"");
    const img=document.querySelector("#item-image,.item-image,[data-item-image]");
    if(img&&image){img.src=image;img.alt=item.name||"Fortnite cosmetic";}
    document.title=`${item.name||"Item"} — DFNS`;
  },
  set(selector,value){const el=document.querySelector(selector);if(el)el.textContent=value;},
  message(text){const el=document.querySelector("#item-error,.item-error,[data-item-error],main");if(el){const box=document.createElement("div");box.className="item-api-error";box.textContent=text;el.prepend(box);}}
};
document.addEventListener("DOMContentLoaded",()=>DFNSItem.init());
window.DFNSItem=DFNSItem;
