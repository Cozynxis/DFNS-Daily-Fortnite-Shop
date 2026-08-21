/* DFNS — global cosmetic reactions (Supabase REST + local fallback) */
"use strict";

const DFNSReactions = {
  config: window.DFNS_REACTIONS_CONFIG || { url: "", anonKey: "" },
  table: "cosmetic_votes",
  voterKey: "dfns_reaction_voter_v1",
  state: { id: null, fire: 0, poop: 0, vote: null },

  async init() {
    const params = new URLSearchParams(location.search);
    const id = params.get("id") || params.get("item");
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
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(this.voterKey, id);
    }
    this.voterId = id;
  },

  configured() {
    return Boolean(this.config?.url && this.config?.anonKey);
  },

  apiBase() {
    return String(this.config.url || "").replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  },

  headers(extra = {}) {
    return {
      apikey: this.config.anonKey,
      Authorization: `Bearer ${this.config.anonKey}`,
      "Content-Type": "application/json",
      ...extra
    };
  },

  async load() {
    if (!this.configured()) {
      this.loadLocal();
      this.renderStatus("Community reactions are ready.");
      return;
    }
    try {
      const filter = encodeURIComponent(this.state.id);
      const response = await fetch(`${this.apiBase()}/rest/v1/${this.table}?select=vote,voter_id&cosmetic_id=eq.${filter}`, {
        headers: this.headers({ Accept: "application/json" }),
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Reaction API returned ${response.status}`);
      const rows = await response.json();
      this.state.fire = rows.filter(x => x.vote === "fire").length;
      this.state.poop = rows.filter(x => x.vote === "poop").length;
      this.state.vote = rows.find(x => x.voter_id === this.voterId)?.vote || null;
      this.render();
      this.renderStatus("Your vote is saved for this cosmetic.");
    } catch (error) {
      console.warn("DFNS reactions backend unavailable:", error);
      this.loadLocal();
      this.renderStatus("Community database unavailable — using this device temporarily.");
    }
  },

  loadLocal() {
    try {
      const all = JSON.parse(localStorage.getItem("dfns_reactions_local_v1") || "{}");
      const item = all[this.state.id] || { fire: 0, poop: 0, voters: {} };
      this.state.fire = Number(item.fire) || 0;
      this.state.poop = Number(item.poop) || 0;
      this.state.vote = item.voters?.[this.voterId] || null;
    } catch {
      this.state.fire = 0;
      this.state.poop = 0;
      this.state.vote = null;
    }
    this.render();
  },

  async vote(nextVote) {
    if (!this.state.id || this.busy) return;
    this.busy = true;
    const previous = this.state.vote;
    const next = previous === nextVote ? null : nextVote;
    this.state.vote = next;
    this.applyOptimistic(previous, next);
    this.render();
    try {
      if (!this.configured()) {
        this.saveLocal(next);
      } else if (next) {
        const response = await fetch(`${this.apiBase()}/rest/v1/${this.table}?on_conflict=cosmetic_id,voter_id`, {
          method: "POST",
          headers: this.headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
          body: JSON.stringify({ cosmetic_id: this.state.id, voter_id: this.voterId, vote: next, updated_at: new Date().toISOString() })
        });
        if (!response.ok) throw new Error(`Vote save failed (${response.status})`);
      } else {
        const response = await fetch(`${this.apiBase()}/rest/v1/${this.table}?cosmetic_id=eq.${encodeURIComponent(this.state.id)}&voter_id=eq.${encodeURIComponent(this.voterId)}`, {
          method: "DELETE",
          headers: this.headers({ Prefer: "return=minimal" })
        });
        if (!response.ok) throw new Error(`Vote removal failed (${response.status})`);
      }
      await this.load();
      this.flash(next ? `Voted ${next === "fire" ? "🔥 Fire" : "💩 Poop"}` : "Vote removed");
    } catch (error) {
      console.warn("DFNS reaction write failed:", error);
      this.state.vote = previous;
      this.applyOptimistic(next, previous);
      this.render();
      this.flash("Could not save that vote. Please try again.");
    } finally {
      this.busy = false;
    }
  },

  applyOptimistic(previous, next) {
    if (previous === "fire") this.state.fire = Math.max(0, this.state.fire - 1);
    if (previous === "poop") this.state.poop = Math.max(0, this.state.poop - 1);
    if (next === "fire") this.state.fire += 1;
    if (next === "poop") this.state.poop += 1;
  },

  saveLocal(vote) {
    const all = JSON.parse(localStorage.getItem("dfns_reactions_local_v1") || "{}");
    const item = all[this.state.id] || { fire: 0, poop: 0, voters: {} };
    if (item.voters[this.voterId] === "fire") item.fire = Math.max(0, item.fire - 1);
    if (item.voters[this.voterId] === "poop") item.poop = Math.max(0, item.fire - 1);
    if (vote === "fire") item.fire += 1;
    if (vote === "poop") item.poop += 1;
    if (vote) item.voters[this.voterId] = vote;
    else delete item.voters[this.voterId];
    all[this.state.id] = item;
    localStorage.setItem("dfns_reactions_local_v1", JSON.stringify(all));
  },

  bind() {
    document.querySelectorAll("[data-dfns-reaction]").forEach(button => {
      if (button.dataset.dfnsBound) return;
      button.dataset.dfnsBound = "1";
      button.addEventListener("click", () => this.vote(button.dataset.dfnsReaction));
    });
  },

  compactAndMoveCard() {
    const card = document.querySelector("#dfns-reactions");
    const availability = document.querySelector(".item-availability");
    if (!card) return;
    card.classList.add("dfns-reactions-compact");
    const parentSection = card.closest("section.related-section");
    if (availability?.parentElement) {
      availability.insertAdjacentElement("afterend", card);
      if (parentSection && parentSection.querySelectorAll(".container").length) {
        parentSection.remove();
      }
    }
  },

  render() {
    const total = this.state.fire + this.state.poop;
    const firePct = total ? Math.round((this.state.fire / total) * 100) : 0;
    const poopPct = total ? 100 - firePct : 0;
    const fire = document.querySelector("#dfns-fire-count");
    const poop = document.querySelector("#dfns-poop-count");
    const totalEl = document.querySelector("#dfns-reaction-total");
    const bar = document.querySelector("#dfns-reaction-fire-bar");
    const fireButton = document.querySelector('[data-dfns-reaction="fire"]');
    const poopButton = document.querySelector('[data-dfns-reaction="poop"]');
    if (fire) fire.textContent = this.format(this.state.fire);
    if (poop) poop.textContent = this.format(this.state.poop);
    if (totalEl) totalEl.textContent = `${this.format(total)} vote${total === 1 ? "" : "s"}`;
    if (bar) bar.style.width = `${firePct}%`;
    if (fireButton) {
      fireButton.classList.toggle("selected", this.state.vote === "fire");
      fireButton.setAttribute("aria-pressed", String(this.state.vote === "fire"));
    }
    if (poopButton) {
      poopButton.classList.toggle("selected", this.state.vote === "poop");
      poopButton.setAttribute("aria-pressed", String(this.state.vote === "poop"));
    }
    document.querySelectorAll("[data-dfns-reaction-percent]").forEach(label => {
      label.textContent = label.dataset.dfnsReactionPercent === "fire" ? `${firePct}%` : `${poopPct}%`;
    });
  },

  renderStatus(text) {
    const el = document.querySelector("#dfns-reaction-status");
    if (el) el.textContent = text;
  },

  flash(text) {
    const el = document.querySelector("#dfns-reaction-status");
    if (!el) return;
    el.textContent = text;
    clearTimeout(this.flashTimer);
    this.flashTimer = setTimeout(() => this.renderStatus("Tap a reaction to change your vote."), 2200);
  },

  format(value) {
    return Number(value || 0).toLocaleString("en-US");
  }
};

document.addEventListener("DOMContentLoaded", () => DFNSReactions.init());
window.DFNSReactions = DFNSReactions;
