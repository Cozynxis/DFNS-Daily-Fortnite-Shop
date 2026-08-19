"use strict";
/* DFNS favorites bridge: keeps the original item-page favorite store and account store in sync. */
(function(){
  const LEGACY="dfns-favorites", ACCOUNT="dfns_favorites_v1", SESSION="dfns_account_v1";
  function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v))}
  function migrate(){
    const account=read(SESSION,null); if(!account?.email)return;
    const legacy=read(LEGACY,[]); const all=read(ACCOUNT,{});
    const current=new Set(Array.isArray(all[account.email])?all[account.email]:[]);
    (Array.isArray(legacy)?legacy:[]).forEach(id=>current.add(String(id)));
    all[account.email]=[...current]; write(ACCOUNT,all);
    if(window.DFNSAuth?.refreshHeader) window.DFNSAuth.refreshHeader();
  }
  document.addEventListener("DOMContentLoaded",()=>{migrate();setTimeout(migrate,700);setTimeout(migrate,1800)});
  document.addEventListener("click",e=>{
    const fav=e.target.closest("[data-favorites]");
    if(fav){migrate();setTimeout(migrate,50)}
    const button=e.target.closest("#favorite-button");
    if(button){setTimeout(migrate,80);setTimeout(migrate,400)}
  },true);
  window.DFNSFavoritesBridge={migrate};
})();