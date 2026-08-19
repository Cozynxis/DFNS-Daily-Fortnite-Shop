"use strict";
(function(){
  const LEGACY="dfns-favorites", ACCOUNT="dfns_favorites_v1", SESSION="dfns_account_v1";
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  function ids(){
    const legacy=read(LEGACY,[]); const account=read(ACCOUNT,{}); const user=read(SESSION,null);
    if(user?.email){
      const set=new Set(Array.isArray(account[user.email])?account[user.email]:[]);
      (Array.isArray(legacy)?legacy:[]).forEach(x=>set.add(String(x)));
      account[user.email]=[...set]; write(ACCOUNT,account); return [...set];
    }
    return Array.isArray(legacy)?legacy.map(String):[];
  }
  function sync(){
    const list=ids(); if(window.DFNSAuth?.refreshHeader) window.DFNSAuth.refreshHeader();
    return list;
  }
  function go(){location.href="favorites.html";}
  window.DFNSFavoritesCore={read,write,ids,sync,go};
  document.addEventListener("DOMContentLoaded",()=>sync());
  document.addEventListener("click",e=>{
    if(e.target.closest("[data-favorites]")){e.preventDefault();sync();go();}
    if(e.target.closest("#favorite-button"))setTimeout(sync,100);
  },true);
})();