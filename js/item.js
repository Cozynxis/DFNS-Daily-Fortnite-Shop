/* DFNS — Cosmetic Detail Page */
"use strict";

const API = "https://fortnite-api.com/v2";
const HISTORY_URLS = [
  "https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/main/data/items/registry.json",
  "https://cdn.jsdelivr.net/gh/Fortnite-Datamining/Fortnite-Datamining@main/data/items/registry.json"
];

/* Small, verified fallback for legacy cosmetics whose live API record has no history. */
const KNOWN_HISTORY = {
  EID_Fresh: {
    first_seen: "2017-12-16",
    shop_appearances: [
      "2017-12-16", "2017-12-25", "2017-12-26", "2018-01-02", "2018-01-06", "2018-01-12", "2018-01-13", "2018-01-19", "2018-01-24", "2018-02-01", "2018-02-10", "2018-02-17", "2018-02-22", "2018-02-28", "2018-03-07", "2018-03-15", "2018-04-06", "2018-04-13", "2018-04-22", "2018-05-03", "2018-05-12", "2018-05-19", "2018-05-31", "2018-06-14", "2018-06-30", "2018-07-27", "2018-08-28", "2018-09-28", "2018-10-26", "2018-11-21"
    ],
    price: 800
  }
};

const DFNSItem = {
  item: null,
  shopEntry: null,
  imageMode: "featured",
  favoriteKey: "dfns-favorites",
  historyRecord: null,

  async init() {
    this.bind();
    const params = new URLSearchParams(location.search);
    const id = params.get("id") || params.get("item");
    if (!id) return this.showError("No cosmetic was selected.");

    try {
      const response = await fetch(`${API}/cosmetics/br/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "This cosmetic could not be found." : `Fortnite API error (${response.status}).`);
      const json = await response.json();
      if (!json?.data) throw new Error("The API returned no cosmetic data.");
      this.item = json.data;

      await Promise.allSettled([this.enrichMetadata(id), this.loadShop(id), this.loadHistory(id)]);
      this.render();
    } catch (error) {
      console.error("DFNS item:", error);
      this.showError(error?.message || "Unable to load this cosmetic.");
    }
  },

  bind() {
    document.querySelectorAll("[data-image-type]").forEach(button => button.addEventListener("click", () => {
      this.imageMode = button.dataset.imageType || "featured";
      document.querySelectorAll("[data-image-type]").forEach(b => b.classList.toggle("active", b === button));
      this.setImage();
    }));

    document.querySelector("#favorite-button")?.addEventListener("click", () => {
      if (!this.item?.id) return;
      const favorites = this.getFavorites();
      const active = favorites.has(this.item.id);
      active ? favorites.delete(this.item.id) : favorites.add(this.item.id);
      localStorage.setItem(this.favoriteKey, JSON.stringify([...favorites]));
      this.updateFavorite(!active);
    });

    document.querySelector("#share-button")?.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, text: `Check out ${this.item?.name || "this Fortnite cosmetic"} on DFNS.`, url: location.href });
        else await navigator.clipboard.writeText(location.href);
        const button = document.querySelector("#share-button");
        if (button) { const old = button.innerHTML; button.innerHTML = "✓ <span>Copied!</span>"; setTimeout(() => button.innerHTML = old, 1400); }
      } catch (_) {}
    });
  },

  async enrichMetadata(id) {
    const urls = [
      `${API}/cosmetics/br/search/ids?id=${encodeURIComponent(id)}`,
      `${API}/cosmetics/br/search/all?id=${encodeURIComponent(id)}`,
      `${API}/cosmetics/br/search/all?name=${encodeURIComponent(this.item?.name || "")}&matchMethod=full`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) continue;
        const json = await response.json();
        const list = Array.isArray(json?.data) ? json.data : json?.data ? [json.data] : [];
        const found = list.find(x => String(x?.id) === String(id)) || list.find(x => String(x?.name || "").toLowerCase() === String(this.item?.name || "").toLowerCase());
        if (!found) continue;
        this.item = { ...this.item, ...found };
        if (found.lastAppearance || found.added || Array.isArray(found.shopHistory)) break;
      } catch (error) { console.warn("DFNS metadata:", error); }
    }
  },

  async loadShop(id) {
    try {
      const response = await fetch(`${API}/shop`, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      const json = await response.json();
      const entries = Array.isArray(json?.data?.entries) ? json.data.entries : [];
      this.shopEntry = entries.find(entry => (Array.isArray(entry.brItems) ? entry.brItems : []).some(item => item?.id === id)) || null;
    } catch (error) { console.warn("DFNS shop:", error); }
  },

  async loadHistory(id) {
    const known = KNOWN_HISTORY[id];
    if (known) this.historyRecord = known;

    for (const url of HISTORY_URLS) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) continue;
        const registry = await response.json();
        const record = registry?.[id] || registry?.items?.[id] || registry?.data?.[id];
        if (record) {
          this.historyRecord = { ...(this.historyRecord || {}), ...record };
          return;
        }
      } catch (error) { console.warn("DFNS historical registry:", error); }
    }
  },

  render() {
    const item = this.item;
    const name = item.name || "Unknown Item";
    const type = item.type?.displayValue || item.type?.value || item.displayType || "Cosmetic";
    const rarity = item.rarity?.displayValue || item.rarity?.value || item.displayRarity || "Unknown";
    const set = item.set?.text || item.set?.name || this.historyRecord?.set || "—";
    const series = item.series?.name || item.series?.value || "—";
    const intro = item.introduction?.text || item.introduction?.chapter || item.introduction?.season || "—";
    const added = this.toDate(item.added) || this.toDate(item.addedSince) || this.toDate(this.historyRecord?.first_seen) || this.toDate(this.historyRecord?.firstSeen);
    const lastSeen = this.getLastSeen();
    const price = this.getPrice();
    const available = !!this.shopEntry;

    this.text("#item-name", name); this.text("#breadcrumb-item-name", name);
    this.text("#item-description", item.description || item.shortDescription || "No description available for this cosmetic.");
    this.text("#item-type", type); this.text("#item-rarity", rarity);
    this.text("#detail-name", name); this.text("#detail-type", type); this.text("#detail-rarity", rarity); this.text("#detail-id", item.id || "—");
    this.text("#detail-introduction", intro); this.text("#detail-added", this.formatDate(added));
    this.text("#detail-set", set); this.text("#detail-series", series); this.text("#detail-set-part", item.set?.partOfSet || set);
    this.text("#detail-shop-status", available ? "In today's shop" : "Not currently listed");
    this.text("#item-price", price == null ? "—" : price.toLocaleString());
    this.text("#detail-price", price == null ? "Not currently listed" : `${price.toLocaleString()} V-Bucks`);
    this.text("#availability-text", available ? "Available in today's shop" : lastSeen ? "Previously available in the Item Shop" : "Not currently in the shop");
    this.text("#availability-date", available ? "Live shop data" : lastSeen ? `Last seen ${this.formatDate(lastSeen)}` : "No historical shop appearance recorded");

    this.renderLastSeen(lastSeen);
    this.setImage();
    this.updateFavorite(this.isFavorite(item.id));
    document.title = `${name} — DFNS`;
    document.body.classList.add("item-ready");
  },

  getHistoryEntries() {
    const raw = this.item?.shopHistory || this.historyRecord?.shop_appearances || this.historyRecord?.shopHistory || this.historyRecord?.shop_history || this.historyRecord?.appearances || this.historyRecord?.shopAppearances || [];
    if (!Array.isArray(raw)) return [];
    return raw.map(entry => {
      if (typeof entry === "string" || typeof entry === "number") return { date: this.toDate(entry), price: null };
      return {
        date: this.toDate(entry?.date ?? entry?.appearance ?? entry?.timestamp ?? entry?.inDate ?? entry?.in_date ?? entry?.dateAdded),
        price: this.number(entry?.price ?? entry?.finalPrice ?? entry?.final_price ?? entry?.regularPrice ?? entry?.regular_price)
      };
    }).filter(x => x.date && x.date <= new Date(Date.now() + 86400000)).sort((a,b) => b.date - a.date);
  },

  getLastSeen() {
    const direct = this.toDate(this.item?.lastAppearance);
    if (direct && direct <= new Date(Date.now() + 86400000)) return direct;
    return this.getHistoryEntries()[0]?.date || null;
  },

  getPrice() {
    if (this.shopEntry) {
      const current = this.number(this.shopEntry.finalPrice ?? this.shopEntry.regularPrice ?? this.shopEntry.prices?.[0]?.finalPrice ?? this.shopEntry.prices?.[0]?.regularPrice);
      if (current != null) return current;
    }
    const history = this.getHistoryEntries();
    const historical = history.find(x => x.price != null)?.price;
    if (historical != null) return historical;
    const fallback = KNOWN_HISTORY[this.item?.id]?.price;
    return fallback ?? this.number(this.historyRecord?.price);
  },

  renderLastSeen(date) {
    const label = date ? `${this.formatDate(date)} · ${this.relative(date)}` : "No shop history available";
    const detail = document.querySelector("#detail-last-seen");
    if (detail) { detail.textContent = label; detail.classList.toggle("is-unavailable", !date); if (date) detail.title = `Last seen: ${this.formatDate(date)}`; else detail.removeAttribute("title"); }
    const hero = document.querySelector("#item-last-seen-date");
    if (hero) hero.textContent = label;
    document.querySelectorAll("[data-last-seen]").forEach(el => el.textContent = label);
  },

  setImage() {
    const item = this.item;
    const featured = item?.images?.featured || item?.images?.full_background || item?.images?.icon || "";
    const icon = item?.images?.icon || featured;
    const selected = this.imageMode === "icon" ? icon : featured;
    const img = document.querySelector("#item-main-image");
    if (img && selected) { img.src = selected; img.alt = item.name || "Fortnite cosmetic"; }
    const bg = document.querySelector("#item-hero-background");
    if (bg && selected) bg.style.backgroundImage = `linear-gradient(90deg,rgba(7,7,10,.18),rgba(7,7,10,.88)),url("${selected.replace(/"/g, '\\"')}")`;
  },

  toDate(value) {
    if (value == null || value === "") return null;
    if (Array.isArray(value)) { const dates = value.map(v => this.toDate(v)).filter(Boolean).sort((a,b) => b-a); return dates[0] || null; }
    if (typeof value === "object") return this.toDate(value.timestamp ?? value.date ?? value.value ?? value.lastAppearance);
    if (typeof value === "number" || /^\s*\d+(?:\.\d+)?\s*$/.test(String(value))) {
      const n = Number(value); const d = new Date(n < 10000000000 ? n * 1000 : n); return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value); return Number.isNaN(d.getTime()) ? null : d;
  },
  number(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; },
  formatDate(date) { return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not available"; },
  relative(date) { const a = new Date(); const b = new Date(date); const aa = new Date(a.getFullYear(), a.getMonth(), a.getDate()); const bb = new Date(b.getFullYear(), b.getMonth(), b.getDate()); const days = Math.max(0, Math.floor((aa - bb) / 86400000)); return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days.toLocaleString()} days ago`; },
  getFavorites() { try { const x = JSON.parse(localStorage.getItem(this.favoriteKey) || "[]"); return new Set(Array.isArray(x) ? x : []); } catch (_) { return new Set(); } },
  isFavorite(id) { return this.getFavorites().has(id); },
  updateFavorite(active) { const button = document.querySelector("#favorite-button"); if (!button) return; button.setAttribute("aria-pressed", String(active)); const icon = button.querySelector(".favorite-icon"); const text = button.querySelector(".favorite-text"); if (icon) icon.textContent = active ? "♥" : "♡"; if (text) text.textContent = active ? "Remove from Favorites" : "Add to Favorites"; },
  text(selector, value) { const el = document.querySelector(selector); if (el) el.textContent = value ?? "—"; },
  showError(message) { document.querySelectorAll("[data-item-error]").forEach(el => { el.hidden = false; el.textContent = message; }); },
  escape(value) { const d = document.createElement("div"); d.textContent = value ?? ""; return d.innerHTML; }
};

document.addEventListener("DOMContentLoaded", () => DFNSItem.init());
window.DFNSItem = DFNSItem;
