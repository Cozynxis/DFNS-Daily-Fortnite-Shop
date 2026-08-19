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
      const [cosmeticResponse, shopResponse] = await Promise.allSettled([
        fetch(`https://fortnite-api.com/v2/cosmetics/br/${encodeURIComponent(id)}`, { headers: { Accept: "application/json" }, cache: "no-store" }),
        fetch("https://fortnite-api.com/v2/shop", { headers: { Accept: "application/json" }, cache: "no-store" })
      ]);

      if (cosmeticResponse.status !== "fulfilled" || !cosmeticResponse.value.ok) {
        const status = cosmeticResponse.status === "fulfilled" ? cosmeticResponse.value.status : 0;
        throw new Error(status === 404 ? "This cosmetic could not be found." : `Fortnite API error (${status || "network"}).`);
      }

      const json = await cosmeticResponse.value.json();
      if (!json?.data) throw new Error("The API returned no cosmetic data.");
      this.item = json.data;

      if (shopResponse.status === "fulfilled" && shopResponse.value.ok) {
        this.shopEntry = await this.findShopEntry(shopResponse.value, id);
      }

      this.render(this.item);
    } catch (error) {
      console.error("DFNS item:", error);
      this.showError(error?.message || "Unable to load this cosmetic.");
    }
  },

  bind() {
    document.querySelectorAll("[data-image-type]").forEach(button => {
      button.addEventListener("click", () => {
        this.imageMode = button.dataset.imageType || "featured";
        document.querySelectorAll("[data-image-type]").forEach(b => b.classList.toggle("active", b === button));
        if (this.item) this.setImage(this.item);
      });
    });

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

  async findShopEntry(response, id) {
    try {
      const json = await response.json();
      const entries = Array.isArray(json?.data?.entries) ? json.data.entries : [];
      for (const entry of entries) {
        const items = Array.isArray(entry?.brItems) ? entry.brItems : [];
        if (items.some(item => item?.id === id)) {
          this.related = items.filter(item => item?.id && item.id !== id).slice(0, 4);
          this.renderRelated();
          return entry;
        }
      }
    } catch (_) {}
    this.renderRelated();
    return null;
  },

  render(item) {
    const name = item.name || "Unknown Item";
    const type = item.type?.displayValue || item.type?.value || "Cosmetic";
    const rarity = item.rarity?.displayValue || item.rarity?.value || "Unknown";
    const image = item.images?.featured || item.images?.full_background || item.images?.icon || "";
    const icon = item.images?.icon || image;
    const set = item.set?.text || item.set?.name || "—";
    const series = item.series?.name || item.series?.value || "—";
    const intro = item.introduction?.text || item.introduction?.chapter || "—";
    const added = item.added?.date || item.added || "—";
    const price = this.getShopPrice(this.shopEntry);
    const available = Boolean(this.shopEntry);

    this.text("#item-name", name); this.text("#breadcrumb-item-name", name);
    this.text("#item-description", item.description || item.shortDescription || "No description available for this cosmetic.");
    this.text("#item-type", type); this.text("#item-rarity", rarity);
    this.text("#detail-name", name); this.text("#detail-type", type); this.text("#detail-rarity", rarity); this.text("#detail-id", item.id || "—");
    this.text("#detail-introduction", this.formatValue(intro)); this.text("#detail-added", this.formatDate(added)); this.text("#detail-last-seen", this.getLastSeen(item));
    this.text("#detail-set", set); this.text("#detail-series", series); this.text("#detail-set-part", item.set?.partOfSet || "—");
    this.text("#detail-shop-status", available ? "In today's shop" : "Not currently listed"); this.text("#detail-available", available ? "Yes" : "No");

    if (price !== null) {
      this.text("#item-price", price.toLocaleString());
      this.text("#detail-price", `${price.toLocaleString()} V-Bucks`);
    } else {
      this.text("#item-price", "—");
      this.text("#detail-price", "Not currently listed");
    }

    this.text("#availability-text", available ? "Available in today's shop" : "Not currently in the shop");
    this.text("#availability-date", available ? "Live shop data" : "Fortnite-API");
    const dot = document.querySelector("#availability-dot");
    if (dot) dot.style.background = available ? "#4ade80" : "#71717a";

    this.setImage(item, image, icon);
    this.updateFavorite(this.isFavorite(item.id));
    this.renderRelated();

    document.title = `${name} — DFNS`;
    this.setMeta("page-description", `View ${name} on DFNS — Daily Fortnite Shop.`);
    this.setMeta("og-title", `${name} — DFNS`); this.setMeta("og-description", item.description || `View ${name} on DFNS.`); this.setMeta("og-image", image);
  },

  renderRelated() {
    const grid = document.querySelector("#related-items");
    if (!grid) return;
    if (!this.related.length) {
      grid.innerHTML = `<div class="shop-empty-state"><strong>No related cosmetics available</strong><span>Browse the current Item Shop to discover more.</span></div>`;
      return;
    }
    grid.innerHTML = this.related.map(item => {
      const itemImage = item.images?.featured || item.images?.icon || item.images?.full_background || "";
      const itemName = item.name || "Unknown Item";
      const itemType = item.type?.displayValue || item.type?.value || "Cosmetic";
      const itemRarity = item.rarity?.displayValue || item.rarity?.value || "Unknown";
      const favorite = this.isFavorite(item.id);
      const price = this.shopEntry?.finalPrice ?? this.shopEntry?.regularPrice ?? 0;
      return `<article class="shop-card">
        <a class="shop-card-link" href="item.html?id=${encodeURIComponent(item.id)}">
          <div class="shop-card-image-wrapper">${itemImage ? `<img class="shop-card-image" src="${this.escape(itemImage)}" alt="${this.escape(itemName)}" loading="lazy">` : `<div class="shop-card-image-placeholder">No image</div>`}<span class="shop-card-rarity">${this.escape(itemRarity)}</span></div>
          <div class="shop-card-content"><h3 class="shop-card-name">${this.escape(itemName)}</h3><div class="shop-card-meta"><span>${this.escape(itemType)}</span><span class="shop-card-price"><span class="vbucks-icon">V</span> ${Number(price).toLocaleString()}</span></div></div>
        </a>
        <button class="shop-card-favorite ${favorite ? "active" : ""}" type="button" data-related-favorite="${this.escape(item.id)}">${favorite ? "♥" : "♡"}</button>
      </article>`;
    }).join("");

    grid.querySelectorAll("[data-related-favorite]").forEach(button => button.addEventListener("click", event => {
      event.preventDefault(); event.stopPropagation();
      const favorites = this.getFavorites();
      const id = button.dataset.relatedFavorite;
      const active = favorites.has(id);
      active ? favorites.delete(id) : favorites.add(id);
      localStorage.setItem(this.favoriteKey, JSON.stringify([...favorites]));
      button.classList.toggle("active", !active); button.textContent = !active ? "♥" : "♡";
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
    img.src = selected; img.alt = item.name || "Fortnite cosmetic";
    const background = document.querySelector("#item-hero-background");
    if (background) {
      background.style.backgroundImage = `linear-gradient(90deg,rgba(7,7,10,.15),rgba(7,7,10,.86)),url("${selected.replace(/"/g, "\\\"")}")`;
      background.style.backgroundSize = "cover"; background.style.backgroundPosition = "center";
    }
  },

  getShopPrice(entry) { if (!entry) return null; const value = Number(entry.finalPrice ?? entry.regularPrice); return Number.isFinite(value) ? value : null; },
  getLastSeen(item) { if (!Array.isArray(item.shopHistory) || !item.shopHistory.length) return "—"; return this.formatDate(item.shopHistory[item.shopHistory.length - 1]); },
  getFavorites() { try { const value = JSON.parse(localStorage.getItem(this.favoriteKey) || "[]"); return new Set(Array.isArray(value) ? value : []); } catch (_) { return new Set(); } },
  isFavorite(id) { return this.getFavorites().has(id); },
  updateFavorite(active) { const button = document.querySelector("#favorite-button"); if (!button) return; button.setAttribute("aria-pressed", String(active)); const icon = button.querySelector(".favorite-icon"); const text = button.querySelector(".favorite-text"); if (icon) icon.textContent = active ? "♥" : "♡"; if (text) text.textContent = active ? "Remove from Favorites" : "Add to Favorites"; },
  text(selector, value) { const element = document.querySelector(selector); if (element) element.textContent = value ?? "—"; },
  setMeta(id, value) { const element = document.getElementById(id); if (element) element.setAttribute("content", value ?? ""); },
  formatValue(value) { return value && value !== "—" ? String(value) : "—"; },
  formatDate(value) { if (!value || value === "—") return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); },
  showError(message) { const main = document.querySelector("main") || document.body; const existing = document.querySelector(".item-api-error"); if (existing) existing.remove(); const box = document.createElement("div"); box.className = "item-api-error"; box.innerHTML = `<strong>Unable to load cosmetic</strong><p>${this.escape(message)}</p><p><a href="shop.html">← Back to Item Shop</a></p>`; main.prepend(box); },
  escape(value) { const element = document.createElement("div"); element.textContent = value ?? ""; return element.innerHTML; }
};

document.addEventListener("DOMContentLoaded", () => DFNSItem.init());
window.DFNSItem = DFNSItem;
