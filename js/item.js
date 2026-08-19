/* DFNS — Cosmetic Detail */
"use strict";

const DFNSItem = {
  item: null,
  imageMode: "featured",

  async init() {
    this.bind();
    const params = new URLSearchParams(location.search);
    const id = params.get("id") || params.get("item");
    if (!id) return this.error("No cosmetic was selected.");

    try {
      const response = await fetch(`https://fortnite-api.com/v2/cosmetics/br/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(response.status === 404 ? "This cosmetic could not be found." : `Fortnite API error (${response.status}).`);
      const json = await response.json();
      if (!json?.data) throw new Error("The API returned no cosmetic data.");
      this.item = json.data;
      this.render(json.data);
    } catch (error) {
      console.error("DFNS item:", error);
      this.error(error.message || "Unable to load this cosmetic.");
    }
  },

  bind() {
    document.querySelectorAll("[data-image-type]").forEach(button => {
      button.addEventListener("click", () => {
        this.imageMode = button.dataset.imageType;
        document.querySelectorAll("[data-image-type]").forEach(b => b.classList.toggle("active", b === button));
        if (this.item) this.setImage(this.item);
      });
    });

    document.querySelector("#favorite-button")?.addEventListener("click", () => {
      if (!this.item) return;
      const key = "dfns-favorites";
      const favorites = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
      const id = this.item.id;
      const active = favorites.has(id);
      active ? favorites.delete(id) : favorites.add(id);
      localStorage.setItem(key, JSON.stringify([...favorites]));
      this.updateFavorite(!active);
    });

    document.querySelector("#share-button")?.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, url: location.href });
        else await navigator.clipboard.writeText(location.href);
        const button = document.querySelector("#share-button");
        if (button) { const old = button.innerHTML; button.textContent = "Copied!"; setTimeout(() => button.innerHTML = old, 1400); }
      } catch (_) {}
    });
  },

  render(item) {
    const name = item.name || "Unknown Item";
    const type = item.type?.displayValue || item.type?.value || "Cosmetic";
    const rarity = item.rarity?.displayValue || item.rarity?.value || "Unknown";
    const image = item.images?.featured || item.images?.icon || item.images?.full_background || "";
    const icon = item.images?.icon || image;
    const set = item.set?.text || item.set?.name || "—";
    const series = item.series?.name || item.series?.value || "—";
    const intro = item.introduction?.text || item.introduction?.chapter || "—";
    const added = item.added?.date || item.added || "—";
    const lastSeen = Array.isArray(item.shopHistory) && item.shopHistory.length ? item.shopHistory[item.shopHistory.length - 1] : "—";

    this.text("#item-name", name); this.text("#breadcrumb-item-name", name); this.text("#item-description", item.description || item.shortDescription || "No description available.");
    this.text("#item-type", type); this.text("#item-rarity", rarity); this.text("#detail-name", name); this.text("#detail-type", type); this.text("#detail-rarity", rarity); this.text("#detail-id", item.id || "—");
    this.text("#detail-introduction", this.formatValue(intro)); this.text("#detail-added", this.formatDate(added)); this.text("#detail-last-seen", this.formatDate(lastSeen)); this.text("#detail-set", set); this.text("#detail-series", series);
    this.text("#detail-set-part", item.set?.partOfSet || "—");
    this.text("#detail-shop-status", "View in Item Shop"); this.text("#detail-price", "—"); this.text("#detail-available", "Current API data");
    this.text("#availability-text", "Cosmetic loaded"); this.text("#availability-date", "Fortnite-API");

    const price = this.findPrice(item);
    if (price !== null) { this.text("#item-price", price.toLocaleString()); this.text("#detail-price", `${price.toLocaleString()} V-Bucks`); }

    this.setImage(item, image, icon);
    this.updateFavorite(this.isFavorite(item.id));
    document.title = `${name} — DFNS`;
    this.setMeta("page-title", document.title); this.setMeta("page-description", `View ${name} on DFNS — Daily Fortnite Shop.`); this.setMeta("og-title", `${name} — DFNS`); this.setMeta("og-description", item.description || `View ${name} on DFNS.`); this.setMeta("og-image", image);
  },

  setImage(item, featured, icon) {
    const image = featured || item.images?.featured || item.images?.full_background || item.images?.icon || "";
    const iconImage = icon || item.images?.icon || image;
    const selected = this.imageMode === "icon" ? iconImage : image;
    const img = document.querySelector("#item-main-image");
    const loading = document.querySelector("#item-image-loading");
    if (!img || !selected) return;
    if (loading) loading.style.display = "grid";
    img.onload = () => { if (loading) loading.style.display = "none"; };
    img.src = selected; img.alt = item.name || "Fortnite cosmetic";
    document.querySelector("#item-hero-background")?.style.setProperty("background-image", `radial-gradient(circle at 25% 35%, rgba(124,92,255,.13), transparent 34%), url(${JSON.stringify(selected)})`);
  },

  findPrice(item) {
    const candidates = [item.price, item.finalPrice, item.regularPrice, item.shopHistory?.price];
    for (const value of candidates) { const n = Number(value); if (Number.isFinite(n) && n > 0) return n; }
    return null;
  },

  isFavorite(id) { return new Set(JSON.parse(localStorage.getItem("dfns-favorites") || "[]")).has(id); },
  updateFavorite(active) { const button = document.querySelector("#favorite-button"); if (!button) return; button.setAttribute("aria-pressed", String(active)); button.querySelector(".favorite-icon")?.replaceChildren(document.createTextNode(active ? "♥" : "♡")); const text = button.querySelector(".favorite-text"); if (text) text.textContent = active ? "Remove from Favorites" : "Add to Favorites"; },
  text(selector, value) { const el = document.querySelector(selector); if (el) el.textContent = value ?? "—"; },
  setMeta(id, value) { const el = document.getElementById(id); if (el) el.content = value; },
  formatValue(value) { return value && value !== "—" ? String(value) : "—"; },
  formatDate(value) { if (!value || value === "—") return "—"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"}); },
  error(message) { const main = document.querySelector("main") || document.body; const box = document.createElement("div"); box.className = "item-api-error"; box.innerHTML = `<strong>Unable to load cosmetic</strong><p>${this.escape(message)}</p><p><a href="shop.html">← Back to Item Shop</a></p>`; main.prepend(box); },
  escape(value) { const d = document.createElement("div"); d.textContent = value; return d.innerHTML; }
};

document.addEventListener("DOMContentLoaded", () => DFNSItem.init());
window.DFNSItem = DFNSItem;
