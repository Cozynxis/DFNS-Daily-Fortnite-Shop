"use strict";

const API = "https://fortnite-api.com/v2";

const DFNSItem = {
  item: null,
  shopEntry: null,
  historyRecord: null,
  historicalPrice: null,
  imageMode: "featured",
  favoriteKey: "dfns-favorites",

  async init() {
    this.bind();
    const params = new URLSearchParams(location.search);
    const id = params.get("id") || params.get("item");
    if (!id) return this.showError("No cosmetic was selected.");

    try {
      this.item = await this.fetchCosmetic(id);
      if (!this.item) throw new Error("Cosmetic not found.");

      // Render the cosmetic immediately. Do not wait for optional shop data.
      this.buildTimeline();
      this.render();

      // Price/shop information is independent from Last Seen.
      await this.loadShopPrice(id);
      this.render();
    } catch (error) {
      console.error("DFNS item error:", error);
      this.showError(error?.message || "Unable to load cosmetic.");
    }
  },

  async json(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    return response.json();
  },

  async fetchCosmetic(id) {
    const urls = [
      `${API}/cosmetics/br/${encodeURIComponent(id)}?language=en`,
      `${API}/cosmetics/br/search/ids?language=en&id=${encodeURIComponent(id)}`,
      `${API}/cosmetics/br/search?language=en&searchLanguage=en&matchMethod=full&id=${encodeURIComponent(id)}`
    ];

    for (const url of urls) {
      try {
        const json = await this.json(url);
        const data = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : []);
        const exact = data.find(x => String(x?.id || "").toLowerCase() === String(id).toLowerCase());
        if (exact) return exact;
        if (data[0]) return data[0];
      } catch (error) {
        console.warn("DFNS cosmetic endpoint failed:", url, error);
      }
    }
    return null;
  },

  buildTimeline() {
    const dates = [];
    const add = value => {
      const date = this.toDate(value);
      if (date) dates.push(date);
    };

    // Fortnite-API documents lastAppearance as the item's last shop appearance.
    add(this.item?.lastAppearance);
    add(this.item?.last_appearance);
    add(this.item?.lastSeen);
    add(this.item?.last_seen);

    // Some API responses also expose the complete shop history.
    for (const key of ["shopHistory", "shop_history"]) {
      if (Array.isArray(this.item?.[key])) this.item[key].forEach(add);
    }

    // Keep a deterministic fallback from unseenFor rather than displaying "No shop history".
    if (!dates.length && Number.isFinite(Number(this.item?.unseenFor))) {
      const days = Math.max(0, Number(this.item.unseenFor));
      const fallback = new Date();
      fallback.setHours(12, 0, 0, 0);
      fallback.setDate(fallback.getDate() - days);
      dates.push(fallback);
    }

    const unique = [...new Map(dates.map(date => [this.isoDay(date), date])).values()]
      .sort((a, b) => b.getTime() - a.getTime());

    const added = this.toDate(this.item?.added);
    this.historyRecord = {
      firstSeen: added || unique.at(-1) || null,
      lastSeen: unique[0] || null,
      appearances: unique
    };
  },

  async loadShopPrice(id) {
    const wanted = String(id).toLowerCase();
    const urls = [`${API}/shop/br`, `${API}/shop`];

    for (const url of urls) {
      try {
        const json = await this.json(url);
        const data = json?.data || {};
        const sections = [
          data.featured,
          data.daily,
          data.specialFeatured,
          data.specialDaily,
          data.votes,
          data.voteWinners
        ].filter(Boolean);

        const entries = [];
        if (Array.isArray(data.entries)) entries.push(...data.entries);
        for (const section of sections) {
          if (Array.isArray(section.entries)) entries.push(...section.entries);
        }

        for (const entry of entries) {
          const items = Array.isArray(entry?.brItems) ? entry.brItems : [];
          const match = items.find(item => String(item?.id || "").toLowerCase() === wanted);
          if (match) {
            this.shopEntry = entry;
            this.historicalPrice = this.readPrice(entry);
            if (this.historicalPrice == null) this.historicalPrice = this.readPrice(match);
            if (this.historicalPrice != null) return;
          }
        }
      } catch (error) {
        console.warn("DFNS shop endpoint failed:", url, error);
      }
    }

    // Cosmetic metadata sometimes contains its known V-Bucks price.
    const metadataPrice = this.readPrice(this.item);
    if (metadataPrice != null) this.historicalPrice = metadataPrice;
  },

  readPrice(value) {
    if (!value || typeof value !== "object") return null;
    for (const key of ["finalPrice", "regularPrice", "price", "vbucks", "vBucks", "cost"]) {
      const number = this.number(value[key]);
      if (number != null) return number;
    }
    return null;
  },

  render() {
    const item = this.item || {};
    const name = item.name || item.displayName || "Unknown Item";
    const type = item.type?.displayValue || item.displayType || "Cosmetic";
    const rarity = item.rarity?.displayValue || item.displayRarity || "Unknown";
    const last = this.historyRecord?.lastSeen || this.toDate(item.lastAppearance);
    const price = this.historicalPrice;
    const available = !!this.shopEntry;
    const lastText = last
      ? `${this.formatDate(last)} · ${this.relative(last)}`
      : "Not available";

    this.text("#item-name", name);
    this.text("#breadcrumb-item-name", name);
    this.text("#item-description", item.description || item.shortDescription || "No description available for this cosmetic.");
    this.text("#item-type", type);
    this.text("#item-rarity", rarity);

    this.text("#detail-name", name);
    this.text("#detail-type", type);
    this.text("#detail-rarity", rarity);
    this.text("#detail-id", item.id || "—");
    this.text("#detail-introduction", item.introduction?.text || item.introduction?.chapter || item.introduction?.season || "—");
    this.text("#detail-added", this.formatDate(this.toDate(item.added)));
    this.text("#detail-last-seen", lastText);
    this.text("#item-last-seen-date", lastText);
    this.text("#detail-set", item.set?.text || item.set?.name || "—");
    this.text("#detail-series", item.series?.name || item.series?.value || "—");
    this.text("#detail-set-part", item.set?.partOfSet || item.set?.text || "—");
    this.text("#detail-shop-status", available ? "In today's shop" : "Not currently listed");

    this.text("#item-price", price == null ? "—" : price.toLocaleString());
    this.text("#availability-text", available ? "Available in today's shop" : last ? "Previously available in the Item Shop" : "Not currently in the shop");
    this.text("#availability-date", available ? "Live shop data" : last ? `Last seen ${this.formatDate(last)}` : "—");

    this.setImage();
    this.updateFavorite(this.isFavorite(item.id));
    document.title = `${name} — DFNS`;
    document.body.classList.add("item-ready");
  },

  setImage() {
    const item = this.item || {};
    const source = this.imageMode === "icon"
      ? (item.images?.icon || item.images?.featured)
      : (item.images?.featured || item.images?.full_background || item.images?.icon);

    const image = document.querySelector("#item-main-image");
    if (image && source) {
      image.src = source;
      image.alt = item.name || "Fortnite cosmetic";
    }

    const background = document.querySelector("#item-hero-background");
    if (background && source) {
      background.style.backgroundImage = `linear-gradient(90deg,rgba(7,7,10,.18),rgba(7,7,10,.88)),url("${String(source).replaceAll('"', '\\"')}")`;
    }
  },

  toDate(value) {
    if (value == null || value === "") return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
      const date = new Date(value < 10000000000 ? value * 1000 : value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === "object") return this.toDate(value.timestamp ?? value.date ?? value.value ?? value.datetime);
    if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) return this.toDate(Number(value));
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  },

  isoDay(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  },

  number(value) {
    if (value == null || value === "") return null;
    const number = Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(number) && number >= 0 ? number : null;
  },

  formatDate(date) {
    return date ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Not available";
  },

  relative(date) {
    const now = new Date();
    const target = new Date(date);
    const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const then = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
    const days = Math.max(0, Math.floor((today - then) / 86400000));
    return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  },

  getFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(this.favoriteKey) || "[]");
      return new Set(Array.isArray(value) ? value : []);
    } catch {
      return new Set();
    }
  },

  isFavorite(id) {
    return this.getFavorites().has(id);
  },

  updateFavorite(active) {
    const button = document.querySelector("#favorite-button");
    if (!button) return;
    const icon = button.querySelector(".favorite-icon");
    const text = button.querySelector(".favorite-text");
    if (icon) icon.textContent = active ? "♥" : "♡";
    if (text) text.textContent = active ? "Remove from Favorites" : "Add to Favorites";
    button.classList.toggle("active", active);
  },

  text(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value ?? "—";
  },

  showError(message) {
    console.error("DFNS item error:", message);
    this.text("#item-name", "Unable to load cosmetic");
    this.text("#item-description", message || "Please try again.");
  },

  bind() {
    document.querySelectorAll("[data-image-type]").forEach(button => {
      button.addEventListener("click", () => {
        this.imageMode = button.dataset.imageType || "featured";
        document.querySelectorAll("[data-image-type]").forEach(x => x.classList.toggle("active", x === button));
        this.setImage();
      });
    });

    document.querySelector("#favorite-button")?.addEventListener("click", () => {
      const id = this.item?.id;
      if (!id) return;
      const favorites = this.getFavorites();
      const active = !favorites.has(id);
      active ? favorites.add(id) : favorites.delete(id);
      localStorage.setItem(this.favoriteKey, JSON.stringify([...favorites]));
      this.updateFavorite(active);
      window.DFNSAuth?.syncFavorite?.(String(id), active);
    });

    document.querySelector("#share-button")?.addEventListener("click", async () => {
      try {
        if (navigator.share) await navigator.share({ title: document.title, text: `Check out ${this.item?.name || "this Fortnite cosmetic"} on DFNS.`, url: location.href });
        else await navigator.clipboard.writeText(location.href);
      } catch {}
    });
  }
};

document.addEventListener("DOMContentLoaded", () => DFNSItem.init());
window.DFNSItem = DFNSItem;
