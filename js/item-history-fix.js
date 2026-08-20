/* DFNS — authoritative cosmetic timeline + price repair
   This file only repairs Last Seen / V-Bucks after item.js has loaded.
   It does not touch favorites, notifications, navigation or the rest of the UI. */
"use strict";

(async function () {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const API = "https://fortnite-api.com/v2";

  let tries = 0;
  while (!window.DFNSItem?.item?.id && tries++ < 200) await sleep(100);
  const item = window.DFNSItem;
  if (!item?.item?.id) return;

  const id = String(item.item.id);

  function toDate(value) {
    if (value == null || value === "") return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
      const d = new Date(value < 10000000000 ? value * 1000 : value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function dateText(date) {
    if (!date) return null;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function relative(date) {
    const now = new Date();
    const a = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const days = Math.max(0, Math.floor((a - b) / 86400000));
    return days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`;
  }

  function setText(selector, value) {
    const el = document.querySelector(selector);
    if (el) el.textContent = value;
  }

  function priceFromObject(obj) {
    if (!obj || typeof obj !== "object") return null;
    for (const key of ["finalPrice", "regularPrice", "price", "vbucks", "vBucks", "cost"]) {
      const n = Number(obj[key]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
  }

  async function json(url) {
    const r = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }

  /* The shop-history response flag is required by Fortnite-API. Without it
     shopHistory is intentionally returned as an empty array. */
  async function loadOfficialHistory() {
    const urls = [
      `${API}/cosmetics/br/${encodeURIComponent(id)}?language=en&responseFlags=4`,
      `${API}/cosmetics/br/search/ids?language=en&responseFlags=4&id=${encodeURIComponent(id)}`,
      `${API}/cosmetics/br/search/all?language=en&searchLanguage=en&matchMethod=full&responseFlags=4&id=${encodeURIComponent(id)}`
    ];

    for (const url of urls) {
      try {
        const payload = await json(url);
        const data = Array.isArray(payload?.data) ? payload.data : (payload?.data ? [payload.data] : []);
        const found = data.find(x => String(x?.id || "").toLowerCase() === id.toLowerCase()) || data[0];
        if (!found) continue;

        const history = Array.isArray(found.shopHistory) ? found.shopHistory : [];
        const dates = history.map(toDate).filter(Boolean).sort((a, b) => b - a);
        const last = dates[0] || toDate(found.lastAppearance);
        if (last) {
          const text = `${dateText(last)} · ${relative(last)}`;
          setText("#item-last-seen-date", text);
          setText("#detail-last-seen", text);
          setText("#availability-date", `Last seen ${dateText(last)}`);
          setText("#availability-text", "Previously available in the Item Shop");
        }
        return { found, last, history: dates };
      } catch (e) {
        console.warn("DFNS official history source failed:", e);
      }
    }
    return null;
  }

  /* Fortnite.GG exposes a compact public ID map. Its cosmetic pages contain
     the canonical displayed V-Bucks price and Last Seen value. We use this
     only as a fallback for historical price data because the public
     fortnite-api.com shop endpoint only contains today's prices. */
  async function loadFortniteGG() {
    try {
      const map = await json("https://fortnite.gg/api/items.json");
      const numericId = map?.[id] ?? map?.[id.toLowerCase()];
      if (numericId == null) return null;

      const urls = [
        `https://fortnite.gg/cosmetics?id=${encodeURIComponent(numericId)}`,
        `https://r.jina.ai/https://fortnite.gg/cosmetics?id=${encodeURIComponent(numericId)}`
      ];

      for (const url of urls) {
        try {
          const response = await fetch(url, { cache: "no-store" });
          if (!response.ok) continue;
          const text = await response.text();
          if (!text) continue;

          const priceMatch = text.match(/V-?Bucks\s*[:|]?\s*([0-9][0-9,]*)/i);
          const lastMatch = text.match(/Last seen\s*[:|]?\s*([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i);

          const price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : null;
          const last = lastMatch ? toDate(lastMatch[1]) : null;

          if (price != null) {
            setText("#item-price", price.toLocaleString());
            setText("#detail-shop-status", "Shop item");
            setText("#availability-text", "Previously available in the Item Shop");
          }
          if (last) {
            const textValue = `${dateText(last)} · ${relative(last)}`;
            setText("#item-last-seen-date", textValue);
            setText("#detail-last-seen", textValue);
            setText("#availability-date", `Last seen ${dateText(last)}`);
          }
          if (price != null || last) return { price, last };
        } catch (e) {
          console.warn("DFNS Fortnite.GG source failed:", e);
        }
      }
    } catch (e) {
      console.warn("DFNS Fortnite.GG ID map failed:", e);
    }
    return null;
  }

  try {
    const official = await loadOfficialHistory();

    // First repair Last Seen from the official response flag.
    if (!official?.last) {
      const direct = toDate(item.item.lastAppearance);
      if (direct) {
        const text = `${dateText(direct)} · ${relative(direct)}`;
        setText("#item-last-seen-date", text);
        setText("#detail-last-seen", text);
        setText("#availability-date", `Last seen ${dateText(direct)}`);
      }
    }

    // Then repair historical price independently.
    const currentPrice = priceFromObject(item.shopEntry) || priceFromObject(item.item);
    if (currentPrice != null) {
      setText("#item-price", currentPrice.toLocaleString());
    } else {
      await loadFortniteGG();
    }

    console.info("DFNS timeline/price repair complete:", id);
  } catch (error) {
    console.error("DFNS timeline/price repair failed:", error);
  }
})();