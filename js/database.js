/* DFNS — Cosmetic Database & Global Search */
"use strict";

const DFNSDatabase = {
    endpoint: "https://fortnite-api.com/v2/cosmetics/br/search/all",
    timer: null,
    cache: new Map(),
    activeRequest: 0,

    init() {
        this.ensureSearchUI();
        this.bindTriggers();
        this.bindNavigationActions();
    },

    ensureSearchUI() {
        if (document.querySelector("#dfns-cosmetic-search")) return;
        const overlay = document.createElement("div");
        overlay.id = "dfns-cosmetic-search";
        overlay.className = "dfns-search-modal";
        overlay.setAttribute("aria-hidden", "true");
        overlay.innerHTML = `<div class="dfns-search-backdrop" data-db-close></div><section class="dfns-search-panel" role="dialog" aria-modal="true" aria-label="Search Fortnite cosmetics"><div class="dfns-search-head"><div><span class="dfns-search-eyebrow">COSMETIC DATABASE</span><h2>Search Fortnite Cosmetics</h2></div><button type="button" class="dfns-search-close" data-db-close aria-label="Close search">×</button></div><div class="dfns-search-input-wrap"><span>⌕</span><input id="dfns-database-input" type="search" autocomplete="off" placeholder="Search Fresh, Peely, Galaxy..."><kbd>ESC</kbd></div><div id="dfns-database-status" class="dfns-search-status">Type at least 2 characters to search the full cosmetic database.</div><div id="dfns-database-results" class="dfns-search-results"></div></section>`;
        document.body.appendChild(overlay);
        overlay.addEventListener("click", event => { if (event.target.closest("[data-db-close]")) this.close(); });
        const input = overlay.querySelector("#dfns-database-input");
        input.addEventListener("input", () => this.onInput(input.value));
        input.addEventListener("keydown", event => { if (event.key === "Escape") this.close(); });
    },

    bindTriggers() {
        document.querySelectorAll("[data-search-trigger], .header-search-button").forEach(trigger => {
            if (trigger.dataset.dbBound === "true") return;
            trigger.dataset.dbBound = "true";
            trigger.addEventListener("click", event => { event.preventDefault(); this.open(); });
        });
    },

    bindNavigationActions() {
        const nav = document.querySelector(".main-navigation");
        if (!nav) return;

        const links = nav.querySelectorAll(".nav-link");
        const cosmetics = nav.querySelector('[data-nav="cosmetics"]');

        /* Navigation is an action bar: none of the buttons stay selected. */
        links.forEach(link => {
            link.classList.remove("active");
            link.removeAttribute("aria-current");
        });

        /* Cosmetics opens the database and never changes the URL. */
        if (cosmetics && cosmetics.dataset.dbNavBound !== "true") {
            cosmetics.dataset.dbNavBound = "true";
            cosmetics.addEventListener("click", event => {
                event.preventDefault();
                event.stopImmediatePropagation();
                links.forEach(link => {
                    link.classList.remove("active");
                    link.removeAttribute("aria-current");
                });
                this.open();
            });
        }

        /* Home and Item Shop are normal navigation buttons, not persistent tabs. */
        const home = nav.querySelector('[data-nav="home"]');
        const shop = nav.querySelector('[data-nav="shop"]');
        [home, shop].forEach(link => {
            if (!link || link.dataset.dbNavBound === "true") return;
            link.dataset.dbNavBound = "true";
            link.addEventListener("click", () => {
                links.forEach(item => {
                    item.classList.remove("active");
                    item.removeAttribute("aria-current");
                });
            });
        });
    },

    open(query = "") {
        const modal = document.querySelector("#dfns-cosmetic-search");
        const input = document.querySelector("#dfns-database-input");
        if (!modal || !input) return;
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("no-scroll");
        input.value = query;
        window.setTimeout(() => input.focus(), 40);
        if (query.trim().length >= 2) this.search(query.trim());
    },

    close() {
        const modal = document.querySelector("#dfns-cosmetic-search");
        if (!modal) return;
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("no-scroll");
    },

    onInput(value) {
        clearTimeout(this.timer);
        const query = value.trim();
        const status = document.querySelector("#dfns-database-status");
        if (query.length < 2) { if (status) status.textContent = "Type at least 2 characters to search the full cosmetic database."; this.render([]); return; }
        if (status) status.textContent = "Searching Fortnite cosmetics…";
        this.timer = setTimeout(() => this.search(query), 260);
    },

    async search(query) {
        const key = query.toLowerCase();
        if (this.cache.has(key)) { this.render(this.cache.get(key)); return; }
        const requestId = ++this.activeRequest;
        try {
            const url = `${this.endpoint}?name=${encodeURIComponent(query)}&matchMethod=contains&language=en&searchLanguage=en`;
            const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const json = await response.json();
            const items = Array.isArray(json?.data) ? json.data : (json?.data ? [json.data] : []);
            if (requestId !== this.activeRequest) return;
            this.cache.set(key, items); this.render(items);
        } catch (error) {
            if (requestId !== this.activeRequest) return;
            const status = document.querySelector("#dfns-database-status");
            if (status) status.textContent = "The cosmetic database could not be reached. Try again in a moment.";
            this.render([]); console.error("DFNS cosmetic database:", error);
        }
    },

    render(items) {
        const results = document.querySelector("#dfns-database-results");
        const status = document.querySelector("#dfns-database-status");
        if (!results) return;
        if (!items.length) { results.innerHTML = ""; if (document.querySelector("#dfns-database-input")?.value.trim().length >= 2 && status) status.textContent = "No cosmetics found. Try another name."; return; }
        if (status) status.textContent = `${items.length} cosmetic${items.length === 1 ? "" : "s"} found`;
        results.innerHTML = items.slice(0, 30).map(item => {
            const image = item.images?.icon || item.images?.featured || item.images?.full_background || "";
            const type = item.type?.displayValue || item.type?.value || item.displayType || "Cosmetic";
            const rarity = item.rarity?.displayValue || item.rarity?.value || "Unknown";
            return `<a class="dfns-search-result" href="item.html?id=${encodeURIComponent(item.id)}"><div class="dfns-search-result-image">${image ? `<img src="${this.escape(image)}" alt="" loading="lazy">` : ""}</div><div class="dfns-search-result-copy"><strong>${this.escape(item.name || "Unknown Item")}</strong><span>${this.escape(type)} · ${this.escape(rarity)}</span></div><span class="dfns-search-arrow">→</span></a>`;
        }).join("");
    },

    escape(value) { const node = document.createElement("div"); node.textContent = value ?? ""; return node.innerHTML; }
};

document.addEventListener("DOMContentLoaded", () => DFNSDatabase.init());
window.DFNSDatabase = DFNSDatabase;
