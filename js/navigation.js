"use strict";

(function () {
    function init() {
        const nav = document.querySelector(".main-navigation");
        if (!nav) return;

        const links = nav.querySelectorAll(".nav-link");
        const cosmetics = nav.querySelector('[data-nav="cosmetics"]');

        // Navbar is action-only: never leave a selected/white state behind.
        function clearActive() {
            links.forEach(link => {
                link.classList.remove("active");
                link.removeAttribute("aria-current");
            });
        }

        clearActive();

        if (cosmetics && cosmetics.dataset.navigationBound !== "true") {
            cosmetics.dataset.navigationBound = "true";
            cosmetics.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                clearActive();

                const open = () => {
                    if (window.DFNSDatabase && typeof window.DFNSDatabase.open === "function") {
                        window.DFNSDatabase.open();
                        return true;
                    }
                    return false;
                };

                // database.js is loaded before this file, but retry once if a browser
                // is still parsing/defer-loading scripts.
                if (!open()) {
                    window.setTimeout(open, 50);
                    window.setTimeout(open, 200);
                }
            });
        }

        // Clicking Home or Item Shop should never leave an active cosmetic state.
        nav.querySelectorAll('[data-nav="home"], [data-nav="shop"]').forEach(link => {
            if (link.dataset.navigationBound === "true") return;
            link.dataset.navigationBound = "true";
            link.addEventListener("click", clearActive, { capture: true });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
