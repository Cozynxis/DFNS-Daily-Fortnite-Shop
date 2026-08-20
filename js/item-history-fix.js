/* DFNS — authoritative item history + historical V-Bucks repair
   This file is intentionally isolated from favorites, auth, notifications and navigation.
*/
"use strict";

(() => {
  const API = "https://fortnite-api.com/v2";
  const RAW_HISTORY = "https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/history/shop";

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function getJson(url) {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function asDate(value) {
    if (value == null || value === "") return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === "number") {
      const d = new Date(value < 10000000000 ? value * 1000 : value);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (typeof value === "object") return asDate(value.timestamp ?? value.date ?? value.value ?? value.datetime);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function day(d) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function price(value) {
    if (!value || typeof value !== "object") return null;
    for (const key of ["finalPrice", "regularPrice", "price", "vbucks", "vBucks", "cost"]) {
      const n = Number(value[key]);
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
  }

  function historyFrom(item) {
    const values = [];
    const add = value => {
      const d = asDate(value);
      if (d) values.push(d);
    };
    for (const key of ["shopHistory", "shop_history"]) {
      if (Array.isArray(item?.[key])) item[key].forEach(add);
    }
    add(item?.lastAppearance);
    add(item?.last_appearance);
    return [...new Map(values.map(d => [day(d), d])).values()].sort((a, b) => b - a);
  }

  async function authoritativeCosmetic(id) {
    const encoded = encodeURIComponent(id);
    const urls = [
      `${API}/cosmetics/br/search?language=en&searchLanguage=en&matchMethod=full&id=${encoded}&responseFlags=4`,
      `${API}/cosmetics/br/search/all?language=en&searchLanguage=en&matchMethod=full&id=${encoded}&responseFlags=4`,
      `${API}/cosmetics/br/${encoded}?language=en&responseFlags=4`,
      `${API}/cosmetics/br/search/ids?language=en&id=${encoded}&responseFlags=4`
    ];

    for (const url of urls) {
      try {
        const json = await getJson(url);
        const raw = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : []);
        const exact = raw.find(x => String(x?.id || "").toLowerCase() === String(id).toLowerCase());
        if (exact) return exact;
        if (raw[0]) return raw[0];
      } catch (error) {
        console.warn("DFNS authoritative cosmetic request failed:", error);
      }
    }
    return null;
  }

  async function historicalPrice(id, name, dates) {
    const candidates = dates.slice(0, 12);
    for (const date of candidates) {
      const url = `${RAW_HISTORY}/${day(date)}.json`;
      try {
        const json = await getJson(url);
        const entries = Array.isArray(json?.data?.entries) ? json.data.entries : [];
        for (const entry of entries) {
          const items = Array.isArray(entry?.brItems) ? entry.brItems : [];
          const exact = items.find(x => String(x?.id || "").toLowerCase() === String(id).toLowerCase());
          if (exact || (name && items.some(x => String(x?.name || "").toLowerCase() === String(name).toLowerCase()))) {
            const p = price(entry);
            if (p != null) return { value: p, date };
          }
        }
      } catch (error) {
        // A missing snapshot is normal for dates before the archive started.
        console.debug("DFNS historical shop snapshot unavailable:", day(date), error);
      }
    }
    return null;
  }

  async function repair() {
    let tries = 0;
    while ((!window.DFNSItem || !window.DFNSItem.item?.id) && tries++ < 300) await sleep(50);
    const state = window.DFNSItem;
    if (!state?.item?.id) return;

    const id = String(state.item.id);
    try {
      // Re-fetch with INCLUDE_SHOP_HISTORY. The normal cosmetic request does not
      // include shop history by default, which is why the old page was intermittent.
      const authoritative = await authoritativeCosmetic(id);
      if (authoritative) state.item = { ...state.item, ...authoritative };

      const dates = historyFrom(state.item);
      if (dates.length) {
        state.historyRecord = {
          firstSeen: asDate(state.item.added) || dates[dates.length - 1],
          lastSeen: dates[0],
          appearances: dates
        };
      }

      // Current shop price is still handled by item.js. If it is not in today's
      // shop, resolve the exact price from the snapshot of its last appearance.
      if (state.historicalPrice == null && !state.shopEntry && dates.length) {
        const historical = await historicalPrice(id, state.item.name, dates);
        if (historical) state.historicalPrice = historical.value;
      }

      state.render?.();
      console.info("DFNS item data repaired", {
        id,
        lastSeen: state.historyRecord?.lastSeen || null,
        price: state.historicalPrice
      });
    } catch (error) {
      console.error("DFNS item repair failed:", error);
      // Never break the rest of the item page because history/price is optional.
      try { state.render?.(); } catch {}
    }
  }

  document.addEventListener("DOMContentLoaded", repair, { once: true });
})();
