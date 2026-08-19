/* DFNS — authoritative cosmetic history fix
   Uses only documented Fortnite-API cosmetic endpoints.
   This runs after item.js and repairs the detail-page metadata without changing the UI. */
"use strict";

(async function () {
  const API = "https://fortnite-api.com/v2";

  const toDate = (value) => {
    if (value == null || value === "") return null;
    if (typeof value === "number" || /^\s*\d+(?:\.\d+)?\s*$/.test(String(value))) {
      const n = Number(value);
      const d = new Date(n < 10000000000 ? n * 1000 : n);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const waitForItem = () => new Promise(resolve => {
    let tries = 0;
    const timer = setInterval(() => {
      if (window.DFNSItem?.item?.id) {
        clearInterval(timer);
        resolve(window.DFNSItem);
      } else if (++tries >= 200) {
        clearInterval(timer);
        resolve(null);
      }
    }, 100);
  });

  async function getJson(url) {
    const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  try {
    const dfns = await waitForItem();
    if (!dfns) return;

    const id = String(dfns.item.id);
    const encodedId = encodeURIComponent(id);

    // These are the documented endpoints. Do NOT use an undocumented responseFlags
    // query parameter here; the public v2 endpoint already exposes lastAppearance.
    const urls = [
      `${API}/cosmetics/br/search/ids?id=${encodedId}&language=en`,
      `${API}/cosmetics/br/search/all?id=${encodedId}&matchMethod=full&language=en&searchLanguage=en`,
      `${API}/cosmetics/br/search?id=${encodedId}&matchMethod=full&language=en&searchLanguage=en`
    ];

    let found = null;
    for (const url of urls) {
      try {
        const json = await getJson(url);
        const list = Array.isArray(json?.data) ? json.data : json?.data ? [json.data] : [];
        found = list.find(x => String(x?.id || "").toLowerCase() === id.toLowerCase()) || list[0] || null;
        if (found) break;
      } catch (error) {
        console.warn("DFNS history endpoint failed:", url, error);
      }
    }

    if (!found) return;

    // Merge the authoritative API record into the existing item.
    dfns.item = { ...dfns.item, ...found };

    const lastAppearance = toDate(found.lastAppearance);
    const added = toDate(found.added);

    // Fortnite-API documents lastAppearance as the cosmetic's last appearance
    // and added as its added/release timestamp.
    if (lastAppearance) {
      dfns.historyRecord = {
        ...(dfns.historyRecord || {}),
        lastSeen: lastAppearance
      };
    }

    // Some API responses may contain shopHistory. Use it only as a fallback;
    // it is a date list, not a price list.
    const history = Array.isArray(found.shopHistory)
      ? found.shopHistory.map(toDate).filter(Boolean).sort((a, b) => b - a)
      : [];

    if (history.length) {
      dfns.historyRecord = {
        ...(dfns.historyRecord || {}),
        lastSeen: lastAppearance || history[0],
        appearances: history.map(date => ({ date, price: null }))
      };
    }

    dfns.getLastSeen = function () {
      const direct = toDate(this.item?.lastAppearance);
      if (direct && direct <= new Date(Date.now() + 86400000)) return direct;
      return toDate(this.historyRecord?.lastSeen) || history[0] || null;
    };

    // Re-render using the authoritative API values.
    dfns.render();

    const lastSeen = dfns.getLastSeen();
    const label = lastSeen
      ? `${dfns.formatDate(lastSeen)} · ${dfns.relative(lastSeen)}`
      : "No shop history available";

    document.querySelectorAll("#detail-last-seen, #item-last-seen-date").forEach(el => {
      el.textContent = label;
      el.classList.toggle("is-unavailable", !lastSeen);
      if (lastSeen) el.title = `Last seen: ${dfns.formatDate(lastSeen)}`;
    });

    if (added) {
      const addedEl = document.querySelector("#detail-added");
      if (addedEl) addedEl.textContent = dfns.formatDate(added);
    }

    console.info("DFNS history loaded:", {
      id,
      name: found.name,
      added: found.added,
      lastAppearance: found.lastAppearance,
      shopHistoryEntries: history.length
    });
  } catch (error) {
    console.error("DFNS authoritative history fix:", error);
  }
})();
