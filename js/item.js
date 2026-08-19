/* DFNS — Cosmetic Detail Page */
"use strict";

const DFNSItem = {
  item: null,
  shopEntry: null,
  related: [],
  imageMode: "featured",
  favoriteKey: "dfns-favorites",

  async init() {
    this.bind();
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") || params.get("item");
    if (!id) return this.showError("No cosmetic was selected.");

    try {
      const cosmeticResponse = await fetch(`https://fortnite-api.com/v2/cosmetics/br/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" }, cache: "no-store"
      });
      if (!cosmeticResponse.ok) throw new Error(cosmeticResponse.status === 404 ? "This cosmetic could not be found." : `Fortnite API error (${cosmeticResponse.status}).`);

      const json = await cosmeticResponse.json();
      if (!json?.data) throw new Error("The API returned no cosmetic data.");
      this.item = json.data;

      await Promise.allSettled([this.enrichMetadata(id), this.loadShop(id)]);
      this.render(this.item);
    } catch (error) {
      console.error("DFNS item:", error);
      this.showError(error?.message || "Unable to load this cosmetic.");
    }
  },

  bind() {
    document.querySelectorAll("[data-image-type]").forEach(button => button.addEventListener("click", () => {
      this.imageMode = button.dataset.imageType || "featured";
      document.querySelectorAll("[data-image-type]").forEach(b => b.classList.toggle("active", b === button));
      if (this.item) this.setImage(this.item);
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
      const button = document.querySelector("#share-button");
      try {
        if (navigator.share) await navigator.share({ title: document.title, text: `Check out ${this.item?.name || "this Fortnite cosmetic"} on DFNS.`, url: window.location.href });
        else if (navigator.clipboard) await navigator.clipboard.writeText(window.location.href);
        else throw new Error("Clipboard unavailable");
        if (button) {
          const original = button.innerHTML;
          button.innerHTML = "✓ <span>Copied!</span>";
          setTimeout(() => { button.innerHTML = original; }, 1400);
        }
      } catch (_) {}
    });
  },

  async enrichMetadata(id) {
    const urls = [
      `https://fortnite-api.com/v2/cosmetics/br/search/ids?id=${encodeURIComponent(id)}`,
      `https://fortnite-api.com/v2/cosmetics/br/search?name=${encodeURIComponent(this.item?.name || "")}&matchMethod=full`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) continue;
        const json = await response.json();
        const list = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : []);
        const metadata = list.find(x => x?.id === id) || list[0];
        if (!metadata) continue;

        // Merge the complete metadata object. The search endpoints contain
        // the historical fields that are sometimes absent from the ID route.
        this.item = { ...this.item, ...metadata };
        if (metadata.lastAppearance != null) this.item.lastAppearance = metadata.lastAppearance;
        if (metadata.added != null) this.item.added = metadata.added;
        if (metadata.addedSince != null) this.item.addedSince = metadata.addedSince;
        if (metadata.unseenFor != null) this.item.unseenFor = metadata.unseenFor;
        if (this.getLastSeenTimestamp(this.item)) break;
      } catch (error) {
        console.warn("DFNS metadata request failed:", error);
      }
    }
  },

  async loadShop(id) {
    try {
      const response = await fetch("https://fortnite-api.com/v2/shop", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return;
      this.shopEntry = await this.findShopEntry(response, id);
    } catch (_) {}
  },

  async findShopEntry(response, id) {
    try {
      const json = await response.json();
      const entries = Array.isArray(json?.data?.entries) ? json.data.entries : [];
      for (const entry of entries) {
        const items = Array.isArray(entry?.brItems) ? entry.brItems : [];
        if (items.some(item => item?.id === id)) {
          this.related = items.filter(item => item?.id && item.id !== id).slice(0, 4);
          return entry;
        }
      }
    } catch (_) {}
    return null;
  },

  render(item) {
    const name = item.name || "Unknown Item";
    const type = item.type?.displayValue || item.type?.value || item.displayType || "Cosmetic";
    const rarity = item.rarity?.displayValue || item.rarity?.value || item.displayRarity || "Unknown";
    const image = item.images?.featured || item.images?.full_background || item.images?.icon || "";
    const icon = item.images?.icon || image;
    const set = item.set?.text || item.set?.name || "—";
    const series = item.series?.name || item.series?.value || "—";
    const intro = item.introduction?.text || item.introduction?.chapter || item.introduction?.season || "—";
    const added = this.toDate(item.added);
    const lastSeen = this.getLastSeenTimestamp(item);
    const price = this.getShopPrice(this.shopEntry);
    const available = Boolean(this.shopEntry);

    this.text("#item-name", name);
    this.text("#breadcrumb-item-name", name);
    this.text("#item-description", item.description || item.shortDescription || "No description available for this cosmetic.");
    this.text("#item-type", type);
    this.text("#item-rarity", rarity);
    this.text("#detail-name", name);
    this.text("#detail-type", type);
    this.text("#detail-rarity", rarity);
    this.text("#detail-id", item.id || "—");
    this.text("#detail-introduction", this.formatValue(intro));
    this.text("#detail-added", this.formatFullDate(added));
    this.renderLastSeen(lastSeen);
    this.text("#detail-set", set);
    this.text("#detail-series", series);
    this.text("#detail-set-part", this.formatSetPart(item.set));
    this.text("#detail-shop-status", available ? "In today's shop" : "Not currently listed");
    this.text("#item-price", price !== null ? price.toLocaleString() : "—");
    this.text("#detail-price", price !== null ? `${price.toLocaleString()} V-Bucks` : "Not currently listed");
    this.text("#availability-text", available ? "Available in today's shop" : "Not currently in the shop");
    this.text("#availability-date", available ? "Live shop data" : "Cosmetic database");

    const dot = document.querySelector("#availability-dot");
    if (dot) dot.style.background = available ? "#4ade80" : "#71717a";

    const heroLastSeen = document.querySelector("#item-last-seen-date");
    if (heroLastSeen) heroLastSeen.textContent = this.lastSeenLabel(lastSeen);

    this.setImage(item, image, icon);
    this.updateFavorite(this.isFavorite(item.id));
    this.renderRelated();
    document.title = `${name} — DFNS`;
    this.setMeta("page-description", `View ${name} on DFNS — Daily Fortnite Shop.`);
    this.setMeta("og-title", `${name} — DFNS`);
    this.setMeta("og-description", item.description || `View ${name} on DFNS.`);
    this.setMeta("og-image", image);
  },

  renderLastSeen(date) {
    const container = document.querySelector("#detail-last-seen");
    if (!container) return;
    if (!date) {
      container.textContent = "No shop history available";
      container.removeAttribute("title");
      container.classList.add("is-unavailable");
      return;
    }
    container.textContent = this.lastSeenLabel(date);
    container.title = `Last seen: ${this.formatFullDate(date)}`;
    container.classList.add("last-seen-value");
    container.classList.remove("is-unavailable");
  },

  renderRelated() {
    const grid = document.querySelector("#related-items");
    if (!grid) return;
    if (!this.related.length) {
      grid.innerHTML = `<div class="shop-empty-state"><strong>No related cosmetics available</strong><span>Browse the current Item Shop to discover more.</span></div>`;
      return;
    }
    grid.innerHTML = this.related.map(item => {
      const image = item.images?.featured || item.images?.icon || item.images?.full_background || "";
      const name = item.name || "Unknown Item";
      const type = item.type?.displayValue || item.type?.value || "Cosmetic";
      const rarity = item.rarity?.displayValue || item.rarity?.value || "Unknown";
      const favorite = this.isFavorite(item.id);
      const price = this.shopEntry?.finalPrice ?? this.shopEntry?.regularPrice ?? 0;
      return `<article class="shop-card"><a class="shop-card-link" href="item.html?id=${encodeURIComponent(item.id)}"><div class="shop-card-image-wrapper">${image ? `<img class="shop-card-image" src="${this.escape(image)}" alt="${this.escape(name)}" loading="lazy">` : `<div class="shop-card-image-placeholder">No image</div>`}<span class="shop-card-rarity">${this.escape(rarity)}</span></div><div class="shop-card-content"><h3 class="shop-card-name">${this.escape(name)}</h3><div class="shop-card-meta"><span>${this.escape(type)}</span><span class="shop-card-price"><span class="vbucks-icon">V</span> ${Number(price).toLocaleString()}</span></div></div></a><button class="shop-card-favorite ${favorite ? "active" : ""}" type="button" data-related-favorite="${this.escape(item.id)}">${favorite ? "♥" : "♡"}</button></article>`;
    }).join("");

    grid.querySelectorAll("[data-related-favorite]").forEach(button => button.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      const favorites = this.getFavorites(), id = button.dataset.relatedFavorite, active = favorites.has(id);
      active ? favorites.delete(id) : favorites.add(id);
      localStorage.setItem(this.favoriteKey, JSON.stringify([...favorites]));
      button.classList.toggle("active", !active);
      button.textContent = !active ? "♥" : "♡";
    }));
  },

  setImage(item, featured, icon) {
    const featuredImage = featured || item.images?.featured || item.images?.full_background || item.images?.icon || "";
    const iconImage = icon || item.images?.icon || featuredImage;
    const selected = this.imageMode === "icon" ? iconImage : featuredImage;
    const img = document.querySelector("#item-main-image");
    const loading = document.querySelector("#item-image-loading");
    if (!img || !selected) return;
    if (loading) loading.style.display = "grid";
    img.onload = () => { if (loading) loading.style.display = "none"; };
    img.onerror = () => { if (loading) loading.style.display = "none"; };
    img.src = selected;
    img.alt = item.name || "Fortnite cosmetic";
    const background = document.querySelector("#item-hero-background");
    if (background) {
      background.style.backgroundImage = `linear-gradient(90deg,rgba(7,7,10,.15),rgba(7,7,10,.86)),url("${selected.replace(/"/g, "\\\"")}")`;
      background.style.backgroundSize = "cover";
      background.style.backgroundPosition = "center";
    }
  },

  getShopPrice(entry) {
    if (!entry) return null;
    const value = Number(entry.finalPrice ?? entry.regularPrice);
    return Number.isFinite(value) ? value : null;
  },

  toDate(value) {
    if (value === undefined || value === null || value === "") return null;
    if (Array.isArray(value)) {
      const dates = value.map(v => this.toDate(v)).filter(Boolean).sort((a,b) => a - b);
      return dates.length ? dates[dates.length - 1] : null;
    }
    if (typeof value === "object") {
      return this.toDate(value.timestamp ?? value.date ?? value.value ?? value.lastAppearance);
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number" || (typeof value === "string" && /^\s*\d+(?:\.\d+)?\s*$/.test(value))) {
      const numeric = Number(value);
      const millis = numeric < 10000000000 ? numeric * 1000 : numeric;
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  getLastSeenTimestamp(item) {
    const candidates = [item?.lastAppearance, item?.lastSeen, item?.lastSeenDate];
    for (const candidate of candidates) {
      const date = this.toDate(candidate);
      if (date && date.getTime() <= Date.now() + 86400000) return date;
    }

    const histories = [item?.shopHistory, item?.history, item?.shopAppearances, item?.appearances];
    for (const history of histories) {
      if (!Array.isArray(history)) continue;
      const dates = history.map(entry => this.toDate(entry?.date ?? entry?.timestamp ?? entry)).filter(Boolean).filter(date => date.getTime() <= Date.now() + 86400000).sort((a,b) => a-b);
      if (dates.length) return dates[dates.length - 1];
    }
    return null;
  },

  lastSeenLabel(date) {
    if (!date) return "No shop history available";
    const full = this.formatFullDate(date);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.floor((today - target) / 86400000);
    if (diff < 0) return `${full} · not yet seen`;
    return `${full} · ${diff === 0 ? "today" : diff === 1 ? "1 day ago" : `${diff.toLocaleString()} days ago`}`;
  },

  formatFullDate(date) { return date ? date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"; },
  formatSetPart(set) { if (!set) return "—"; if (typeof set.partOfSet === "string") return set.partOfSet; return set.name || set.text || "—"; },
  getFavorites() { try { const value = JSON.parse(localStorage.getItem(this.favoriteKey) || "[]"); return new Set(Array.isArray(value) ? value : []); } catch (_) { return new Set(); } },
  isFavorite(id) { return this.getFavorites().has(id); },
  updateFavorite(active) { const button = document.querySelector("#favorite-button"); if (!button) return; button.setAttribute("aria-pressed", String(active)); const icon = button.querySelector(".favorite-icon"), text = button.querySelector(".favorite-text"); if (icon) icon.textContent = active ? "♥" : "♡"; if (text) text.textContent = active ? "Remove from Favorites" : "Add to Favorites"; },
  text(selector, value) { const element = document.querySelector(selector); if (element) element.textContent = value ?? "—"; },
  setMeta(id, value) { const element = document.getElementById(id); if (element) element.setAttribute("content", value ?? ""); },
  formatValue(value) { return value && value !== "—" ? String(value) : "—"; },
  showError(message) { const main = document.querySelector("main") || document.body, existing = document.querySelector(".item-api-error"); if (existing) existing.remove(); const box = document.createElement("div"); box.className = "item-api-error"; box.innerHTML = `<strong>Unable to load cosmetic</strong><p>${this.escape(message)}</p><p><a href="shop.html">← Back to Item Shop</a></p>`; main.prepend(box); },
  escape(value) { const element = document.createElement("div"); element.textContent = value ?? ""; return element.innerHTML; }
};

document.addEventListener("DOMContentLoaded", () => DFNSItem.init());
window.DFNSItem = DFNSItem;
