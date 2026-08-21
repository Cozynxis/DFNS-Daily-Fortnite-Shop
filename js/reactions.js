"use strict";

const DFNSReactions = {
  config: window.DFNS_REACTIONS_CONFIG || { url: "", anonKey: "" },
  table: "cosmetic_votes",
  voterKey: "dfns_reaction_voter_v1",
  state: { id: null, fire: 0, poop: 0, vote: null },

  async init() {
    const p = new URLSearchParams(location.search), id = p.get("id") || p.get("item");
    if (!id) return;
    this.state.id = String(id);
    this.ensureVoterId();
    this.compactAndMoveCard();
    this.bind();
    this.renderStatus("Loading community reactions…");
    await this.load();
  },

  ensureVoterId() {
    let id = localStorage.getItem(this.voterKey);
    if (!id) { id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(this.voterKey, id); }
    this.voterId = id;
  },

  configured() { return !!(this.config?.url && this.config?.anonKey); },
  apiBase() { return String(this.config.url || "").replace(/\/+$/, "").replace(/\/rest\/v1$/, ""); },
  headers(extra = {}) { return { apikey: this.config.anonKey, Authorization: `Bearer ${this.config.anonKey}`, "Content-Type": "application/json", ...extra }; },

  async load() {
    if (!this.configured()) { this.loadLocal(); this.renderStatus("Community reactions are ready."); return; }
    try {
      const r = await fetch(`${this.apiBase()}/rest/v1/${this.table}?select=vote,voter_id&cosmetic_id=eq.${encodeURIComponent(this.state.id)}`, { headers: this.headers({ Accept: "application/json" }), cache: "no-store" });
      if (!r.ok) throw new Error(`GET ${r.status}`);
      const rows = await r.json();
      this.state.fire = rows.filter(x => x.vote === "fire").length;
      this.state.poop = rows.filter(x => x.vote === "poop").length;
      this.state.vote = rows.find(x => x.voter_id === this.voterId)?.vote || null;
      this.render(); this.renderStatus("Your vote is saved for this cosmetic.");
    } catch (e) { console.warn("DFNS reactions:", e); this.loadLocal(); this.renderStatus("Community database unavailable — using this device temporarily."); }
  },

  loadLocal() {
    try {
      const all = JSON.parse(localStorage.getItem("dfns_reactions_local_v1") || "{}"), item = all[this.state.id] || { fire: 0, poop: 0, voters: {} };
      this.state.fire = +item.fire || 0; this.state.poop = +item.poop || 0; this.state.vote = item.voters?.[this.voterId] || null;
    } catch { this.state.fire = 0; this.state.poop = 0; this.state.vote = null; }
    this.render();
  },

  async vote(nextVote) {
    if (!this.state.id || this.busy) return;
    this.busy = true;
    const previous = this.state.vote, next = previous === nextVote ? null : nextVote;
    this.state.vote = next; this.changeCounts(previous, next); this.render();
    try {
      if (!this.configured()) this.saveLocal(next);
      else if (next) {
        const r = await fetch(`${this.apiBase()}/rest/v1/${this.table}?on_conflict=cosmetic_id,voter_id`, { method: "POST", headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify({ cosmetic_id: this.state.id, voter_id: this.voterId, vote: next, updated_at: new Date().toISOString() }) });
        if (!r.ok) throw new Error(`POST ${r.status}`);
      } else {
        const r = await fetch(`${this.apiBase()}/rest/v1/${this.table}?cosmetic_id=eq.${encodeURIComponent(this.state.id)}&voter_id=eq.${encodeURIComponent(this.voterId)}`, { method: "DELETE", headers: this.headers() });
        if (!r.ok) throw new Error(`DELETE ${r.status}`);
      }
      await this.load(); this.flash(next ? `Voted ${next === "fire" ? "🔥 Fire" : "💩 Poop"}` : "Vote removed");
    } catch (e) {
      console.warn("DFNS reaction write:", e); this.state.vote = previous; this.changeCounts(next, previous); this.render(); this.flash("Could not save that vote. Please try again.");
    } finally { this.busy = false; }
  },

  changeCounts(previous, next) {
    if (previous === "fire") this.state.fire = Math.max(0, this.state.fire - 1);
    if (previous === "poop") this.state.poop = Math.max(0, this.state.poop - 1);
    if (next === "fire") this.state.fire++;
    if (next === "poop") this.state.poop++;
  },

  saveLocal(vote) {
    const all = JSON.parse(localStorage.getItem("dfns_reactions_local_v1") || "{}"), item = all[this.state.id] || { fire: 0, poop: 0, voters: {} }, old = item.voters[this.voterId];
    if (old === "fire") item.fire = Math.max(0, item.fire - 1);
    if (old === "poop") item.poop = Math.max(0, item.poop - 1);
    if (vote === "fire") item.fire++; if (vote === "poop") item.poop++;
    if (vote) item.voters[this.voterId] = vote; else delete item.voters[this.voterId];
    all[this.state.id] = item; localStorage.setItem("dfns_reactions_local_v1", JSON.stringify(all));
  },

  bind() { document.querySelectorAll("[data-dfns-reaction]").forEach(b => { if (!b.dataset.dfnsBound) { b.dataset.dfnsBound = "1"; b.addEventListener("click", () => this.vote(b.dataset.dfnsReaction)); } }); },

  compactAndMoveCard() {
    const card = document.querySelector("#dfns-reactions");
    const availability = document.querySelector(".item-information .item-availability");
    if (!card || !availability) return;

    const style = document.createElement("style");
    style.textContent = `.dfns-reactions-compact{display:block!important;width:100%!important;box-sizing:border-box!important;margin:10px 0 0!important;max-width:none!important;padding:10px!important;border-radius:13px!important;box-shadow:0 8px 24px rgba(0,0,0,.14)!important}.dfns-reactions-compact .dfns-reactions-head{margin-bottom:8px;align-items:center;gap:8px}.dfns-reactions-compact .dfns-reactions-title{font-size:13px}.dfns-reactions-compact .dfns-reactions-subtitle,.dfns-reactions-compact .dfns-reactions-eyebrow,.dfns-reactions-compact .dfns-reactions-backend-note,.dfns-reactions-compact .dfns-reaction-status,.dfns-reactions-compact .dfns-reaction-percentages{display:none}.dfns-reactions-compact .dfns-reaction-total{font-size:9px}.dfns-reactions-compact .dfns-reaction-buttons{grid-template-columns:1fr 1fr;gap:7px}.dfns-reactions-compact .dfns-reaction-button{padding:7px 9px;border-radius:10px;gap:6px}.dfns-reactions-compact .dfns-reaction-emoji{font-size:18px}.dfns-reactions-compact .dfns-reaction-main{gap:6px}.dfns-reactions-compact .dfns-reaction-label strong{font-size:10px}.dfns-reactions-compact .dfns-reaction-label span{font-size:8px}.dfns-reactions-compact .dfns-reaction-count{font-size:12px}.dfns-reactions-compact .dfns-reaction-meter{height:3px;margin-top:8px}@media(max-width:620px){.dfns-reactions-compact{padding:9px!important}.dfns-reactions-compact .dfns-reaction-button{padding:8px}.dfns-reactions-compact .dfns-reactions-title{font-size:12px}}`;
    document.head.appendChild(style);

    card.classList.add("dfns-reactions-compact");
    card.setAttribute("aria-label", "Community reactions");

    // Put the compact reaction box immediately below the availability box,
    // inside the same cosmetic information panel. It must never appear below Details/Stats.
    availability.insertAdjacentElement("afterend", card);
    const section = card.closest("section.related-section");
    if (section) section.remove();
  },

  render() {
    const total = this.state.fire + this.state.poop, firePct = total ? Math.round(this.state.fire / total * 100) : 0, poopPct = total ? 100 - firePct : 0;
    const fire = document.querySelector("#dfns-fire-count"), poop = document.querySelector("#dfns-poop-count"), totalEl = document.querySelector("#dfns-reaction-total"), bar = document.querySelector("#dfns-reaction-fire-bar");
    const fb = document.querySelector('[data-dfns-reaction="fire"]'), pb = document.querySelector('[data-dfns-reaction="poop"]');
    if (fire) fire.textContent = this.format(this.state.fire); if (poop) poop.textContent = this.format(this.state.poop); if (totalEl) totalEl.textContent = `${this.format(total)} vote${total === 1 ? "" : "s"}`; if (bar) bar.style.width = `${firePct}%`;
    if (fb) { fb.classList.toggle("selected", this.state.vote === "fire"); fb.setAttribute("aria-pressed", this.state.vote === "fire"); }
    if (pb) { pb.classList.toggle("selected", this.state.vote === "poop"); pb.setAttribute("aria-pressed", this.state.vote === "poop"); }
    document.querySelectorAll("[data-dfns-reaction-percent]").forEach(x => x.textContent = x.dataset.dfnsReactionPercent === "fire" ? `${firePct}%` : `${poopPct}%`);
  },
  renderStatus(t) { const e = document.querySelector("#dfns-reaction-status"); if (e) e.textContent = t; },
  flash(t) { const e = document.querySelector("#dfns-reaction-status"); if (!e) return; e.textContent = t; clearTimeout(this.flashTimer); this.flashTimer = setTimeout(() => this.renderStatus("Tap a reaction to change your vote."), 2200); },
  format(v) { return Number(v || 0).toLocaleString("en-US"); }
};

document.addEventListener("DOMContentLoaded", () => DFNSReactions.init());
window.DFNSReactions = DFNSReactions;
