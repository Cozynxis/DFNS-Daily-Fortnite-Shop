/* DFNS — authoritative cosmetic history fix
   Uses Fortnite-API's BR cosmetic search endpoint with shop-history response flags.
   This runs after item.js and re-renders the already-built detail page. */
"use strict";

(async function () {
  const API = "https://fortnite-api.com/v2";
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function toDate(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" || /^\s*\d+(?:\.\d+)?\s*$/.test(String(value))) {
      const n = Number(value);
      const d = new Date(n < 10000000000 ? n * 1000 : n);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function waitForItem() {
    return new Promise(resolve => {
      let tries = 0;
      const timer = setInterval(() => {
        if (window.DFNSItem?.item?.id) {
          clearInterval(timer);
          resolve(window.DFNSItem);
        } else if (++tries >= 150) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });
  }

  try {
    const dfns = await waitForItem();
    if (!dfns) return;

    const id = dfns.item.id;
    const url = `${API}/cosmetics/br/search/all?id=${encodeURIComponent(id)}&language=en&searchLanguage=en&matchMethod=full&responseFlags=4`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Cosmetic history request failed (${response.status})`);

    const json = await response.json();
    const list = Array.isArray(json?.data) ? json.data : [];
    const found = list.find(x => String(x?.id).toLowerCase() === String(id).toLowerCase());
    if (!found) return;

    // Preserve the original cosmetic object, but replace/add authoritative history fields.
    dfns.item = { ...dfns.item, ...found };

    // shopHistory is an ISO-date array. It is the authoritative lifetime shop appearance list.
    const history = Array.isArray(found.shopHistory)
      ? found.shopHistory.map(toDate).filter(Boolean).sort((a, b) => b - a)
      : [];

    if (history.length) {
      dfns.historyRecord = {
        ...(dfns.historyRecord || {}),
        lastSeen: history[0],
        appearances: history.map(date => ({ date, price: null }))
      };
    }

    // Force the detail page to use the API's lastAppearance when available,
    // otherwise the newest shopHistory entry.
    dfns.getLastSeen = function () {
      const direct = toDate(this.item?.lastAppearance);
      if (direct && direct <= new Date(Date.now() + 86400000)) return direct;
      return history[0] || toDate(this.historyRecord?.lastSeen) || null;
    };

    // Release date comes from the API's added field; history first_seen is only a fallback.
    const release = toDate(found.added) || toDate(dfns.historyRecord?.firstSeen);
    if (release) dfns.item.added = found.added;

    // Keep current-shop pricing untouched. Historical shopHistory contains dates, not prices.
    // Never invent a historical V-Bucks price when Fortnite-API did not provide one.
    dfns.render();

    // Update the visible history row immediately as well.
    const lastSeen = dfns.getLastSeen();
    const label = lastSeen
      ? `${dfns.formatDate(lastSeen)} · ${dfns.relative(lastSeen)}`
      : "No shop history available";
    document.querySelectorAll("#detail-last-seen, #item-last-seen-date").forEach(el => {
      el.textContent = label;
      el.classList.toggle("is-unavailable", !lastSeen);
      if (lastSeen) el.title = `Last seen: ${dfns.formatDate(lastSeen)}`;
    });

    if (release) {
      const added = document.querySelector("#detail-added");
      if (added) added.textContent = dfns.formatDate(release);
    }
  } catch (error) {
    console.error("DFNS authoritative history fix:", error);
  }
})();
