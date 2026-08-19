/* DFNS — Lifetime cosmetic history bridge */
"use strict";

(async function () {
  const DATA_URL = "data/cosmetic-history.json?v=20260820-1";
  const waitForItem = async () => {
    for (let i = 0; i < 120; i++) {
      if (window.DFNSItem?.item?.id) return window.DFNSItem;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return null;
  };

  const parseDate = value => {
    if (value == null || value === "") return null;
    if (typeof value === "number" || /^\s*\d+(?:\.\d+)?\s*$/.test(String(value))) {
      const n = Number(value);
      const d = new Date(n < 10000000000 ? n * 1000 : n);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const number = value => {
    if (value == null || value === "") return null;
    const n = Number(String(value).replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  try {
    const item = await waitForItem();
    if (!item) return;

    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) return;
    const history = await response.json();
    const record = history?.[item.item.id] || history?.[String(item.item.id).toLowerCase()];
    if (!record) return;

    const originalGetHistoryEntries = item.getHistoryEntries.bind(item);
    const originalGetLastSeen = item.getLastSeen.bind(item);
    const originalGetPrice = item.getPrice.bind(item);

    const localEntries = Array.isArray(record.appearances)
      ? record.appearances.map(entry => ({
          date: parseDate(entry?.date),
          price: number(entry?.price)
        })).filter(entry => entry.date).sort((a, b) => b.date - a.date)
      : [];

    item.historyRecord = {
      firstSeen: record.firstSeen,
      lastSeen: record.lastSeen,
      price: number(record.price),
      appearances: localEntries
    };

    item.getHistoryEntries = function () {
      return localEntries.length ? localEntries : originalGetHistoryEntries();
    };

    item.getLastSeen = function () {
      const apiDate = parseDate(this.item?.lastAppearance);
      if (apiDate && apiDate <= new Date(Date.now() + 86400000)) return apiDate;
      return localEntries[0]?.date || parseDate(record.lastSeen) || originalGetLastSeen();
    };

    item.getPrice = function () {
      if (this.shopEntry) {
        const current = number(this.shopEntry.finalPrice ?? this.shopEntry.regularPrice ?? this.shopEntry.prices?.[0]?.finalPrice ?? this.shopEntry.prices?.[0]?.regularPrice);
        if (current != null) return current;
      }
      const historical = localEntries.find(entry => entry.price != null)?.price;
      return historical ?? number(record.price) ?? originalGetPrice();
    };

    /* Re-render after the local lifetime dataset has been applied. */
    item.render();
  } catch (error) {
    console.warn("DFNS history bridge failed:", error);
  }
})();
