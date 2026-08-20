"use strict";

(() => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "dfns-scroll-toggle";
    button.setAttribute("aria-label", "Scroll to bottom");
    button.innerHTML = '<span class="dfns-scroll-arrow">↓</span>';
    document.body.appendChild(button);

    const update = () => {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const nearBottom = max > 80 && window.scrollY >= max - 80;
        button.classList.toggle("at-bottom", nearBottom);
        button.setAttribute("aria-label", nearBottom ? "Scroll to top" : "Scroll to bottom");
    };

    button.addEventListener("click", () => {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const nearBottom = max > 80 && window.scrollY >= max - 80;
        window.scrollTo({ top: nearBottom ? 0 : document.documentElement.scrollHeight, behavior: "smooth" });
    });

    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.setTimeout(update, 100);
})();
