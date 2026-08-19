/* DFNS accounts — static GitHub Pages version */
"use strict";

const DFNSAuth = {
  key: "dfns_account_v1",
  usersKey: "dfns_users_v1",
  favoritesKey: "dfns_favorites_v1",
  state: null,
  uiReady: false,

  init() {
    this.state = this.read(this.key, null);
    this.ensureUI();
    this.refreshHeader();
    this.bindGlobal();
    this.observeHeader();
  },
  read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  write(key, value) { localStorage.setItem(key, JSON.stringify(value)); },
  escape(v) { const n=document.createElement("div"); n.textContent=v ?? ""; return n.innerHTML; },
  initials(name) { return (name || "DFNS").trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase(); },

  ensureUI() {
    const actions = document.querySelector(".header-actions");
    if (!actions) return false;
    if (!document.querySelector("#dfns-account")) this.injectUI();
    this.uiReady = !!document.querySelector("#dfns-account");
    return this.uiReady;
  },

  injectUI() {
    const actions = document.querySelector(".header-actions");
    if (!actions || document.querySelector("#dfns-account")) return;
    const account = document.createElement("div");
    account.className = "dfns-account";
    account.id = "dfns-account";
    account.innerHTML = `<button class="dfns-account-trigger" id="dfns-account-trigger" type="button" aria-expanded="false"><span class="dfns-avatar" id="dfns-header-avatar">DF</span><span class="dfns-account-name" id="dfns-header-name">Login</span></button><div class="dfns-account-menu" id="dfns-account-menu"></div>`;
    actions.prepend(account);

    if (!document.querySelector("#dfns-auth-modal")) {
      const modal = document.createElement("div");
      modal.className = "dfns-auth-modal";
      modal.id = "dfns-auth-modal";
      modal.innerHTML = `<div class="dfns-auth-backdrop" data-auth-close></div><section class="dfns-auth-panel" role="dialog" aria-modal="true"><div class="dfns-auth-head"><div><span class="dfns-auth-eyebrow">DFNS ACCOUNT</span><h2 id="dfns-auth-title">Welcome to DFNS</h2></div><button class="dfns-auth-close" type="button" data-auth-close>×</button></div><div class="dfns-auth-tabs"><button class="dfns-auth-tab active" data-auth-tab="login" type="button">Login</button><button class="dfns-auth-tab" data-auth-tab="signup" type="button">Create account</button></div><form class="dfns-auth-form" id="dfns-auth-form"><div><label>Email</label><input name="email" type="email" autocomplete="email" required></div><div><label>Username</label><input name="username" type="text" autocomplete="username" required></div><div><label>Password</label><input name="password" type="password" autocomplete="current-password" minlength="6" required></div><button class="dfns-auth-submit" type="submit">Login</button><button class="dfns-google" type="button" id="dfns-google-login">Continue with Google</button><p class="dfns-auth-note">Google sign-in needs a real OAuth provider/backend. Your local DFNS account works in this browser.</p><div class="dfns-auth-message" id="dfns-auth-message"></div></form></section>`;
      document.body.appendChild(modal);
    }

    if (!document.querySelector("#dfns-profile-modal")) {
      const profile = document.createElement("div");
      profile.className = "dfns-profile-modal";
      profile.id = "dfns-profile-modal";
      profile.innerHTML = `<section class="dfns-profile-panel"><div class="dfns-auth-head"><div><span class="dfns-auth-eyebrow">PROFILE</span><h2>Edit profile</h2></div><button class="dfns-auth-close" type="button" data-profile-close>×</button></div><div class="dfns-profile-preview"><span class="dfns-avatar" id="dfns-profile-avatar">DF</span><div><strong id="dfns-profile-preview-name">Username</strong><span>Customize your DFNS profile</span></div></div><form class="dfns-profile-form" id="dfns-profile-form"><label>Username</label><input id="dfns-profile-username" maxlength="24" required><label>Profile image URL</label><input id="dfns-profile-image" type="url" placeholder="https://..."><button class="dfns-profile-save" type="submit">Save profile</button></form></section>`;
      document.body.appendChild(profile);
    }
  },

  observeHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    let repairing = false;
    const observer = new MutationObserver(() => {
      if (repairing) return;
      if (!document.querySelector("#dfns-account")) {
        repairing = true;
        this.ensureUI();
        this.refreshHeader();
        repairing = false;
      }
    });
    observer.observe(header, { childList: true, subtree: true });
  },

  refreshHeader() {
    this.ensureUI();
    const name = document.querySelector("#dfns-header-name");
    const avatar = document.querySelector("#dfns-header-avatar");
    const menu = document.querySelector("#dfns-account-menu");
    if (!name || !avatar || !menu) return;
    if (!this.state) {
      name.textContent = "Login"; avatar.textContent = "DF";
      menu.innerHTML = `<button class="dfns-account-action" data-auth-open="login">Sign in / Create account</button><button class="dfns-account-action dfns-favorites-link" data-auth-open="login">Favorites <span class="dfns-favorites-badge">LOGIN</span></button>`;
      return;
    }
    name.textContent = this.state.username;
    avatar.innerHTML = this.state.avatar ? `<img src="${this.escape(this.state.avatar)}" alt="">` : this.escape(this.initials(this.state.username));
    const favs = this.read(this.favoritesKey, {});
    const count = Array.isArray(favs[this.state.email]) ? favs[this.state.email].length : 0;
    menu.innerHTML = `<div class="dfns-profile-summary"><span class="dfns-avatar">${this.escape(this.initials(this.state.username))}</span><div><strong>${this.escape(this.state.username)}</strong><span>${this.escape(this.state.email)}</span></div></div><button class="dfns-account-action" data-profile-open>Edit profile</button><button class="dfns-account-action dfns-favorites-link" data-favorites>My Favorites <span class="dfns-favorites-badge">${count}</span></button><button class="dfns-account-action danger" data-logout>Log out</button>`;
  },

  bindGlobal() {
    document.addEventListener("click", e => {
      const trigger=e.target.closest("#dfns-account-trigger"); const menu=document.querySelector("#dfns-account-menu");
      if(trigger){ const open=menu.classList.toggle("open"); trigger.setAttribute("aria-expanded",String(open)); return; }
      if(e.target.closest("[data-auth-close]")){this.closeAuth();return;}
      const auth=e.target.closest("[data-auth-open]"); if(auth){this.openAuth(auth.dataset.authOpen);return;}
      if(e.target.closest("[data-profile-open]")){this.openProfile();return;}
      if(e.target.closest("[data-profile-close]")){this.closeProfile();return;}
      if(e.target.closest("[data-logout]")){this.logout();return;}
      if(e.target.closest("[data-favorites]")){this.showFavorites();return;}
      if(!e.target.closest("#dfns-account")){menu?.classList.remove("open");}
    });
    document.querySelector("#dfns-auth-form")?.addEventListener("submit", e => { e.preventDefault(); this.submitAuth(e.currentTarget); });
    document.querySelectorAll("[data-auth-tab]").forEach(tab=>tab.addEventListener("click",()=>this.setAuthMode(tab.dataset.authTab)));
    document.querySelector("#dfns-google-login")?.addEventListener("click",()=>{ document.querySelector("#dfns-auth-message").textContent="Google sign-in requires OAuth provider configuration."; });
    document.querySelector("#dfns-profile-form")?.addEventListener("submit", e=>{e.preventDefault();this.saveProfile();});
  },

  setAuthMode(mode){
    document.querySelectorAll("[data-auth-tab]").forEach(x=>x.classList.toggle("active",x.dataset.authTab===mode));
    const form=document.querySelector("#dfns-auth-form"); if(!form)return;
    form.querySelector('[name="username"]').parentElement.style.display=mode==="signup"?"block":"none";
    form.querySelector(".dfns-auth-submit").textContent=mode==="signup"?"Create account":"Login";
    document.querySelector("#dfns-auth-title").textContent=mode==="signup"?"Create your DFNS account":"Welcome back";
    form.dataset.mode=mode;
    document.querySelector("#dfns-auth-message").textContent="";
  },
  openAuth(mode="login"){document.querySelector("#dfns-account-menu")?.classList.remove("open");document.querySelector("#dfns-auth-modal")?.classList.add("open");this.setAuthMode(mode);document.querySelector('#dfns-auth-form input[name="email"]')?.focus();},
  closeAuth(){document.querySelector("#dfns-auth-modal")?.classList.remove("open");},
  submitAuth(form){
    const data=new FormData(form), email=String(data.get("email")).trim().toLowerCase(), password=String(data.get("password")), username=String(data.get("username")||"").trim();
    const users=this.read(this.usersKey,{}), msg=document.querySelector("#dfns-auth-message");
    if(form.dataset.mode==="signup"){
      if(!username){msg.textContent="Choose a username.";return;}
      if(users[email]){msg.textContent="An account with this email already exists.";return;}
      users[email]={email,username,password,avatar:""}; this.write(this.usersKey,users); this.state=users[email]; this.write(this.key,this.state); this.closeAuth(); this.refreshHeader(); return;
    }
    if(!users[email] || users[email].password!==password){msg.textContent="Incorrect email or password.";return;}
    this.state=users[email]; this.write(this.key,this.state); this.closeAuth(); this.refreshHeader();
  },
  logout(){this.state=null;localStorage.removeItem(this.key);document.querySelector("#dfns-account-menu")?.classList.remove("open");this.refreshHeader();},
  openProfile(){
    if(!this.state){this.openAuth();return;} document.querySelector("#dfns-account-menu")?.classList.remove("open");
    document.querySelector("#dfns-profile-username").value=this.state.username;document.querySelector("#dfns-profile-image").value=this.state.avatar||"";document.querySelector("#dfns-profile-modal")?.classList.add("open");this.updateProfilePreview();
  },
  closeProfile(){document.querySelector("#dfns-profile-modal")?.classList.remove("open");},
  updateProfilePreview(){const u=document.querySelector("#dfns-profile-username")?.value||"DFNS", a=document.querySelector("#dfns-profile-avatar");document.querySelector("#dfns-profile-preview-name").textContent=u;if(a)a.textContent=this.initials(u);},
  saveProfile(){const username=document.querySelector("#dfns-profile-username").value.trim(),avatar=document.querySelector("#dfns-profile-image").value.trim();if(!username)return;const users=this.read(this.usersKey,{});this.state={...this.state,username,avatar};users[this.state.email]=this.state;this.write(this.usersKey,users);this.write(this.key,this.state);this.closeProfile();this.refreshHeader();},
  syncFavorite(id, active) {
    if (!this.state?.email || !id) return;
    const all = this.read(this.favoritesKey, {});
    const list = new Set(Array.isArray(all[this.state.email]) ? all[this.state.email] : []);
    active ? list.add(id) : list.delete(id);
    all[this.state.email] = [...list];
    this.write(this.favoritesKey, all);
    this.refreshHeader();
  },
  showFavorites(){
    if(!this.state){this.openAuth();return;}
    document.querySelector("#dfns-account-menu")?.classList.remove("open");
    const all=this.read(this.favoritesKey,{}), ids=Array.isArray(all[this.state.email])?all[this.state.email]:[];
    if(!ids.length){alert("You have no favorites yet. Open a cosmetic and click Add to Favorites.");return;}
    const first=ids.map(id=>`item.html?id=${encodeURIComponent(id)}`).join("\n");
    alert(`Your DFNS Favorites (${ids.length})\n\n${first}`);
  }
};

document.addEventListener("DOMContentLoaded",()=>DFNSAuth.init());
window.DFNSAuth=DFNSAuth;
