/* DFNS — authoritative item history + V-Bucks repair */
"use strict";

(() => {
  const API = "https://fortnite-api.com/v2";
  const RAW_HISTORY = "https://raw.githubusercontent.com/Fortnite-Datamining/Fortnite-Datamining/history/shop";

  async function getJson(url) {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
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

  function readPrice(value) {
    if (!value || typeof value !== "object") return null;
    for (const key of ["finalPrice", "regularPrice", "price", "vbucks", "vBucks", "cost"]) {
      const raw = value[key];
      if (raw == null || raw === "") continue;
      const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(n) && n >= 0) return n;
    }
    return null;
  }

  function getHistory(item) {
    const values = [];
    const add = value => { const d = asDate(value); if (d) values.push(d); };
    if (Array.isArray(item?.shopHistory)) item.shopHistory.forEach(add);
    if (Array.isArray(item?.shop_history)) item.shop_history.forEach(add);
    add(item?.lastAppearance);
    add(item?.last_appearance);
    return [...new Map(values.map(d => [day(d), d])).values()].sort((a, b) => b - a);
  }

  async function getAuthoritativeItem(id) {
    const encoded = encodeURIComponent(id);
    const urls = [
      `${API}/cosmetics/br/search?language=en&searchLanguage=en&matchMethod=full&id=${encoded}&responseFlags=4`,
      `${API}/cosmetics/br/search/ids?language=en&id=${encoded}&responseFlags=4`,
      `${API}/cosmetics/br/${encoded}?language=en&responseFlags=4`
    ];
    for (const url of urls) {
      try {
        const json = await getJson(url);
        const list = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : []);
        const exact = list.find(x => String(x?.id || "").toLowerCase() === String(id).toLowerCase());
        if (exact) return exact;
      } catch (e) { console.warn("DFNS cosmetic history request failed", e); }
    }
    return null;
  }

  function findEntryPrice(entries, id, name) {
    const wanted = String(id).toLowerCase();
    const wantedName = String(name || "").toLowerCase();
    for (const entry of entries) {
      const items = Array.isArray(entry?.brItems) ? entry.brItems : [];
      const item = items.find(x => String(x?.id || "").toLowerCase() === wanted) ||
        (wantedName ? items.find(x => String(x?.name || x?.displayName || "").toLowerCase() === wantedName) : null);
      if (!item) continue;

      // Fortnite shop snapshots put the price on the shop entry in normal data,
      // but some archived snapshots expose it on the item. Check both.
      const p = readPrice(entry) ?? readPrice(item) ?? readPrice(entry?.priceInfo) ?? readPrice(entry?.price);
      if (p != null) return p;
    }
    return null;
  }

  async function currentShopPrice(id, name) {
    try {
      // This is the same endpoint/shape used by the working shop page.
      const json = await getJson(`${API}/shop`);
      const entries = Array.isArray(json?.data?.entries) ? json.data.entries : [];
      return findEntryPrice(entries, id, name);
    } catch (e) {
      console.warn("DFNS current shop price request failed", e);
      return null;
    }
  }

  async function historicalShopPrice(id, name, dates) {
    // Try the actual last-seen day first, then earlier appearances if that
    // snapshot is unavailable. Never stop because a current shop entry exists.
    for (const date of dates.slice(0, 20)) {
      try {
        const json = await getJson(`${RAW_HISTORY}/${day(date)}.json`);
        const entries = Array.isArray(json?.data?.entries) ? json.data.entries :
          (Array.isArray(json?.entries) ? json.entries : []);
        const p = findEntryPrice(entries, id, name);
        if (p != null) return p;
      } catch (e) {
        console.debug("DFNS historical shop snapshot unavailable", day(date));
      }
    }
    return null;
  }

  async function repair() {
    let tries = 0;
    while ((!window.DFNSItem || !window.DFNSItem.item?.id) && tries++ < 300) {
      await new Promise(r => setTimeout(r, 50));
    }

    const state = window.DFNSItem;
    if (!state?.item?.id) return;

    const id = String(state.item.id);
    try {
      const authoritative = await getAuthoritativeItem(id);
      if (authoritative) state.item = { ...state.item, ...authoritative };

      const dates = getHistory(state.item);
      if (dates.length) {
        state.historyRecord = {
          firstSeen: asDate(state.item.added) || dates[dates.length - 1],
          lastSeen: dates[0],
          appearances: dates
        };
      }

      // IMPORTANT: always attempt the current shop independently. A matched
      // shopEntry with a missing price must never block the historical lookup.
      let p = await currentShopPrice(id, state.item.name);
      if (p == null && dates.length) p = await historicalShopPrice(id, state.item.name, dates);
      if (p == null) p = readPrice(state.item);
      if (p != null) state.historicalPrice = p;

      state.render?.();
      console.info("DFNS V-Bucks repair", { id, price: state.historicalPrice, lastSeen: state.historyRecord?.lastSeen || null });
    } catch (error) {
      console.error("DFNS item repair failed:", error);
      try { state.render?.(); } catch {}
    }
  }

  document.addEventListener("DOMContentLoaded", repair, { once: true });
})();
