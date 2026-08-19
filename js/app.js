/* ============================================================
   DFNS — DAILY FORTNITE SHOP
   GLOBAL APPLICATION SCRIPT
   ============================================================ */

"use strict";


/* ============================================================
   01. DFNS APPLICATION
   ============================================================ */

const DFNS = {

    /* --------------------------------------------------------
       Application configuration
    -------------------------------------------------------- */

    config: {

        siteName: "DFNS",

        fullName: "Daily Fortnite Shop",

        storagePrefix: "dfns_",

        animationDuration: 220,

    },


    /* --------------------------------------------------------
       Runtime state
    -------------------------------------------------------- */

    state: {

        mobileMenuOpen: false,

        searchOpen: false,

        initialized: false,

    },


    /* --------------------------------------------------------
       DOM cache
    -------------------------------------------------------- */

    elements: {},


    /* --------------------------------------------------------
       Initialize application
    -------------------------------------------------------- */

    init() {

        if (this.state.initialized) {
            return;
        }

        this.cacheElements();

        this.setupNavigation();

        this.setupSearch();

        this.setupGlobalInteractions();

        this.setupDynamicContent();

        this.setupKeyboardShortcuts();

        this.setupExternalLinks();

        this.state.initialized = true;

        document.documentElement.classList.add("dfns-ready");

        this.emit("dfns:ready");

    },


    /* ========================================================
       02. DOM CACHE
       ======================================================== */

    cacheElements() {

        this.elements = {

            body:
                document.body,

            header:
                document.querySelector(".site-header"),

            navigation:
                document.querySelector(".main-navigation"),

            mobileMenuButton:
                document.querySelector(".mobile-menu-button"),

            searchButton:
                document.querySelector(".header-search-button"),

            searchOverlay:
                document.querySelector(".search-overlay"),

            searchOverlayBackdrop:
                document.querySelector(".search-overlay-backdrop"),

            searchOverlayClose:
                document.querySelector(".search-overlay-close"),

            searchForm:
                document.querySelector(".overlay-search-form"),

            searchInput:
                document.querySelector(".overlay-search-form input"),

            footer:
                document.querySelector(".site-footer"),

            currentYear:
                document.querySelectorAll("[data-current-year]"),

            currentDate:
                document.querySelectorAll("[data-current-date]"),

        };

    },


    /* ========================================================
       03. NAVIGATION
       ======================================================== */

    setupNavigation() {

        const {

            mobileMenuButton,

            navigation,

        } = this.elements;


        if (!mobileMenuButton || !navigation) {
            return;
        }


        mobileMenuButton.addEventListener(
            "click",
            () => {

                this.toggleMobileMenu();

            }
        );


        navigation.querySelectorAll("a").forEach(
            (link) => {

                link.addEventListener(
                    "click",
                    () => {

                        this.closeMobileMenu();

                    }
                );

            }
        );


        document.addEventListener(
            "click",
            (event) => {

                const clickedInsideNavigation =
                    navigation.contains(event.target);

                const clickedMenuButton =
                    mobileMenuButton.contains(event.target);


                if (
                    this.state.mobileMenuOpen &&
                    !clickedInsideNavigation &&
                    !clickedMenuButton
                ) {

                    this.closeMobileMenu();

                }

            }
        );


        window.addEventListener(
            "resize",
            () => {

                if (window.innerWidth > 800) {

                    this.closeMobileMenu();

                }

            }
        );

    },


    /* --------------------------------------------------------
       Toggle mobile menu
    -------------------------------------------------------- */

    toggleMobileMenu() {

        if (this.state.mobileMenuOpen) {

            this.closeMobileMenu();

        } else {

            this.openMobileMenu();

        }

    },


    /* --------------------------------------------------------
       Open mobile menu
    -------------------------------------------------------- */

    openMobileMenu() {

        const {

            navigation,

            mobileMenuButton,

        } = this.elements;


        if (!navigation || !mobileMenuButton) {
            return;
        }


        this.state.mobileMenuOpen = true;


        navigation.classList.add("open");

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        mobileMenuButton.setAttribute(
            "aria-label",
            "Close navigation"
        );

        mobileMenuButton.classList.add("active");

    },


    /* --------------------------------------------------------
       Close mobile menu
    -------------------------------------------------------- */

    closeMobileMenu() {

        const {

            navigation,

            mobileMenuButton,

        } = this.elements;


        if (!navigation || !mobileMenuButton) {
            return;
        }


        this.state.mobileMenuOpen = false;


        navigation.classList.remove("open");

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        mobileMenuButton.setAttribute(
            "aria-label",
            "Open navigation"
        );

        mobileMenuButton.classList.remove("active");

    },


    /* ========================================================
       04. SEARCH OVERLAY
       ======================================================== */

    setupSearch() {

        const {

            searchButton,

            searchOverlay,

            searchOverlayBackdrop,

            searchOverlayClose,

            searchForm,

            searchInput,

        } = this.elements;


        if (!searchButton || !searchOverlay) {
            return;
        }


        searchButton.addEventListener(
            "click",
            () => {

                this.openSearch();

            }
        );


        if (searchOverlayBackdrop) {

            searchOverlayBackdrop.addEventListener(
                "click",
                () => {

                    this.closeSearch();

                }
            );

        }


        if (searchOverlayClose) {

            searchOverlayClose.addEventListener(
                "click",
                () => {

                    this.closeSearch();

                }
            );

        }


        if (searchForm) {

            searchForm.addEventListener(
                "submit",
                (event) => {

                    this.handleSearchSubmit(
                        event
                    );

                }
            );

        }


        if (searchInput) {

            searchInput.addEventListener(
                "input",
                () => {

                    this.handleSearchInput();

                }
            );

        }

    },


    /* --------------------------------------------------------
       Open search
    -------------------------------------------------------- */

    openSearch() {

        const {

            searchOverlay,

            searchInput,

        } = this.elements;


        if (!searchOverlay) {
            return;
        }


        this.state.searchOpen = true;


        searchOverlay.classList.add("open");

        this.elements.body.classList.add("no-scroll");


        searchOverlay.setAttribute(
            "aria-hidden",
            "false"
        );


        if (searchInput) {

            window.setTimeout(
                () => {

                    searchInput.focus();

                },
                80
            );

        }


        this.emit("dfns:search-open");

    },


    /* --------------------------------------------------------
       Close search
    -------------------------------------------------------- */

    closeSearch() {

        const {

            searchOverlay,

        } = this.elements;


        if (!searchOverlay) {
            return;
        }


        this.state.searchOpen = false;


        searchOverlay.classList.remove("open");

        this.elements.body.classList.remove("no-scroll");


        searchOverlay.setAttribute(
            "aria-hidden",
            "true"
        );


        this.emit("dfns:search-close");

    },


    /* --------------------------------------------------------
       Search submit
    -------------------------------------------------------- */

    handleSearchSubmit(event) {

        event.preventDefault();


        const input =
            this.elements.searchInput;


        if (!input) {
            return;
        }


        const query =
            input.value.trim();


        if (!query) {

            this.showToast(
                "Enter something to search.",
                "warning"
            );

            return;

        }


        this.performGlobalSearch(
            query
        );

    },


    /* --------------------------------------------------------
       Search input
    -------------------------------------------------------- */

    handleSearchInput() {

        const input =
            this.elements.searchInput;


        if (!input) {
            return;
        }


        const query =
            input.value.trim();


        this.emit(
            "dfns:search-input",
            {
                query,
            }
        );

    },


    /* --------------------------------------------------------
       Perform global search
    -------------------------------------------------------- */

    performGlobalSearch(query) {

        const normalizedQuery =
            query.toLowerCase();


        /*
         * If we are already on shop.html, send the search
         * directly to the shop search input when available.
         */

        const shopSearch =
            document.querySelector(
                ".shop-search-input"
            );


        if (shopSearch) {

            shopSearch.value =
                query;


            shopSearch.dispatchEvent(
                new Event(
                    "input",
                    {
                        bubbles: true,
                    }
                )
            );


            this.closeSearch();

            shopSearch.focus();

            return;

        }


        /*
         * Otherwise navigate to shop.html and pass the query
         * through the URL.
         */

        const destination =
            `shop.html?search=${encodeURIComponent(normalizedQuery)}`;


        window.location.href =
            destination;

    },


    /* ========================================================
       05. GLOBAL INTERACTIONS
       ======================================================== */

    setupGlobalInteractions() {

        /*
         * Handle elements with [data-action].
         */

        document.addEventListener(
            "click",
            (event) => {

                const actionElement =
                    event.target.closest(
                        "[data-action]"
                    );


                if (!actionElement) {
                    return;
                }


                const action =
                    actionElement.dataset.action;


                this.handleAction(
                    actionElement,
                    action,
                    event
                );

            }
        );


        /*
         * Smooth scroll for internal anchors.
         */

        document.addEventListener(
            "click",
            (event) => {

                const link =
                    event.target.closest(
                        'a[href^="#"]'
                    );


                if (!link) {
                    return;
                }


                const targetId =
                    link.getAttribute("href");


                if (
                    !targetId ||
                    targetId === "#"
                ) {
                    return;
                }


                const target =
                    document.querySelector(
                        targetId
                    );


                if (!target) {
                    return;
                }


                event.preventDefault();


                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });

            }
        );

    },


    /* ========================================================
       06. DATA ACTION HANDLER
       ======================================================== */

    handleAction(
        element,
        action,
        event
    ) {

        switch (action) {

            case "open-search":

                event.preventDefault();

                this.openSearch();

                break;


            case "close-search":

                event.preventDefault();

                this.closeSearch();

                break;


            case "mobile-menu":

                event.preventDefault();

                this.toggleMobileMenu();

                break;


            case "scroll-top":

                event.preventDefault();

                this.scrollToTop();

                break;


            case "clear-search":

                event.preventDefault();

                this.clearInput(
                    element
                );

                break;


            default:

                break;

        }

    },


    /* ========================================================
       07. DYNAMIC CONTENT
       ======================================================== */

    setupDynamicContent() {

        this.setCurrentYear();

        this.setCurrentDate();

        this.setActiveNavigation();

    },


    /* --------------------------------------------------------
       Current year
    -------------------------------------------------------- */

    setCurrentYear() {

        const elements =
            this.elements.currentYear;


        if (!elements || !elements.length) {
            return;
        }


        const year =
            new Date().getFullYear();


        elements.forEach(
            (element) => {

                element.textContent =
                    year;

            }
        );

    },


    /* --------------------------------------------------------
       Current date
    -------------------------------------------------------- */

    setCurrentDate() {

        const elements =
            this.elements.currentDate;


        if (!elements || !elements.length) {
            return;
        }


        const date =
            new Date();


        const formattedDate =
            new Intl.DateTimeFormat(
                "en-US",
                {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }
            ).format(date);


        elements.forEach(
            (element) => {

                element.textContent =
                    formattedDate;

            }
        );

    },


    /* ========================================================
       08. ACTIVE NAVIGATION
       ======================================================== */

    setActiveNavigation() {

        const navigation =
            this.elements.navigation;


        if (!navigation) {
            return;
        }


        const currentPath =
            window.location.pathname;


        const currentFile =
            currentPath
                .split("/")
                .pop()
                .toLowerCase();


        const normalizedCurrentFile =
            currentFile || "index.html";


        navigation
            .querySelectorAll("a")
            .forEach(
                (link) => {

                    const href =
                        link.getAttribute("href");


                    if (!href) {
                        return;
                    }


                    const linkFile =
                        href
                            .split("/")
                            .pop()
                            .split("?")[0]
                            .split("#")[0]
                            .toLowerCase();


                    const normalizedLinkFile =
                        linkFile || "index.html";


                    if (
                        normalizedLinkFile ===
                        normalizedCurrentFile
                    ) {

                        link.classList.add(
                            "active"
                        );

                        link.setAttribute(
                            "aria-current",
                            "page"
                        );

                    }

                }
            );

    },


    /* ========================================================
       09. KEYBOARD SHORTCUTS
       ======================================================== */

    setupKeyboardShortcuts() {

        document.addEventListener(
            "keydown",
            (event) => {

                /*
                 * Escape closes overlays and menus.
                 */

                if (
                    event.key === "Escape"
                ) {

                    if (
                        this.state.searchOpen
                    ) {

                        this.closeSearch();

                        return;

                    }


                    if (
                        this.state.mobileMenuOpen
                    ) {

                        this.closeMobileMenu();

                    }

                }


                /*
                 * "/" opens global search unless the user
                 * is already typing in a form field.
                 */

                if (
                    event.key === "/" &&
                    !this.isTypingContext(
                        event.target
                    )
                ) {

                    event.preventDefault();

                    this.openSearch();

                }


                /*
                 * CTRL/CMD + K opens search.
                 */

                if (
                    (
                        event.ctrlKey ||
                        event.metaKey
                    ) &&
                    event.key.toLowerCase() === "k"
                ) {

                    event.preventDefault();

                    this.openSearch();

                }

            }
        );

    },


    /* --------------------------------------------------------
       Check typing context
    -------------------------------------------------------- */

    isTypingContext(element) {

        if (!element) {
            return false;
        }


        const tagName =
            element.tagName.toLowerCase();


        return (
            tagName === "input" ||
            tagName === "textarea" ||
            tagName === "select" ||
            element.isContentEditable
        );

    },


    /* ========================================================
       10. EXTERNAL LINKS
       ======================================================== */

    setupExternalLinks() {

        document
            .querySelectorAll(
                'a[href^="http://"], a[href^="https://"]'
            )
            .forEach(
                (link) => {

                    const currentHost =
                        window.location.hostname;


                    let linkHost = "";


                    try {

                        linkHost =
                            new URL(
                                link.href
                            ).hostname;

                    } catch {

                        return;

                    }


                    if (
                        linkHost &&
                        linkHost !== currentHost
                    ) {

                        link.setAttribute(
                            "target",
                            "_blank"
                        );

                        link.setAttribute(
                            "rel",
                            "noopener noreferrer"
                        );

                    }

                }
            );

    },


    /* ========================================================
       11. LOCAL STORAGE
       ======================================================== */

    storage: {

        get(key, fallback = null) {

            try {

                const value =
                    localStorage.getItem(
                        DFNS.config.storagePrefix + key
                    );


                if (value === null) {

                    return fallback;

                }


                return JSON.parse(
                    value
                );

            } catch {

                return fallback;

            }

        },


        set(key, value) {

            try {

                localStorage.setItem(
                    DFNS.config.storagePrefix + key,
                    JSON.stringify(value)
                );

                return true;

            } catch {

                return false;

            }

        },


        remove(key) {

            try {

                localStorage.removeItem(
                    DFNS.config.storagePrefix + key
                );

                return true;

            } catch {

                return false;

            }

        },


        clear() {

            try {

                const prefix =
                    DFNS.config.storagePrefix;


                Object.keys(
                    localStorage
                ).forEach(
                    (key) => {

                        if (
                            key.startsWith(
                                prefix
                            )
                        ) {

                            localStorage.removeItem(
                                key
                            );

                        }

                    }
                );


                return true;

            } catch {

                return false;

            }

        },

    },


    /* ========================================================
       12. FAVORITES
       ======================================================== */

    favorites: {

        getAll() {

            return DFNS.storage.get(
                "favorites",
                []
            );

        },


        has(itemId) {

            if (!itemId) {
                return false;
            }


            return this
                .getAll()
                .includes(
                    String(itemId)
                );

        },


        add(itemId) {

            if (!itemId) {
                return false;
            }


            const id =
                String(itemId);


            const favorites =
                this.getAll();


            if (
                !favorites.includes(id)
            ) {

                favorites.push(id);

            }


            DFNS.storage.set(
                "favorites",
                favorites
            );


            DFNS.emit(
                "dfns:favorite-added",
                {
                    itemId: id,
                }
            );


            return true;

        },


        remove(itemId) {

            if (!itemId) {
                return false;
            }


            const id =
                String(itemId);


            const favorites =
                this.getAll();


            const updated =
                favorites.filter(
                    (favoriteId) =>
                        favoriteId !== id
                );


            DFNS.storage.set(
                "favorites",
                updated
            );


            DFNS.emit(
                "dfns:favorite-removed",
                {
                    itemId: id,
                }
            );


            return true;

        },


        toggle(itemId) {

            if (
                this.has(itemId)
            ) {

                this.remove(itemId);

                return false;

            }


            this.add(itemId);

            return true;

        },

    },


    /* ========================================================
       13. CLEAR INPUT
       ======================================================== */

    clearInput(element) {

        if (!element) {
            return;
        }


        const targetSelector =
            element.dataset.target;


        if (!targetSelector) {
            return;
        }


        const target =
            document.querySelector(
                targetSelector
            );


        if (!target) {
            return;
        }


        target.value = "";


        target.dispatchEvent(
            new Event(
                "input",
                {
                    bubbles: true,
                }
            )
        );


        target.focus();

    },


    /* ========================================================
       14. SCROLL HELPERS
       ======================================================== */

    scrollToTop() {

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

    },


    /* ========================================================
       15. TOAST SYSTEM
       ======================================================== */

    showToast(
        message,
        type = "success",
        duration = 3200
    ) {

        if (!message) {
            return;
        }


        /*
         * Remove existing toast if present.
         */

        const existingToast =
            document.querySelector(
                ".dfns-toast"
            );


        if (existingToast) {

            existingToast.remove();

        }


        const toast =
            document.createElement(
                "div"
            );


        toast.className =
            "dfns-toast";


        toast.setAttribute(
            "role",
            "status"
        );


        const icon =
            this.getToastIcon(
                type
            );


        toast.innerHTML = `

            <span class="dfns-toast-icon">
                ${icon}
            </span>

            <span class="dfns-toast-message">
                ${this.escapeHTML(message)}
            </span>

            <button
                class="dfns-toast-close"
                type="button"
                aria-label="Close notification"
            >
                ×
            </button>

        `;


        this.injectToastStyles();


        document.body.appendChild(
            toast
        );


        requestAnimationFrame(
            () => {

                toast.classList.add(
                    "visible"
                );

            }
        );


        const closeButton =
            toast.querySelector(
                ".dfns-toast-close"
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                () => {

                    this.removeToast(
                        toast
                    );

                }
            );

        }


        const timeout =
            window.setTimeout(
                () => {

                    this.removeToast(
                        toast
                    );

                },
                duration
            );


        toast._dfnsTimeout =
            timeout;

    },


    /* --------------------------------------------------------
       Toast icon
    -------------------------------------------------------- */

    getToastIcon(type) {

        switch (type) {

            case "error":

                return "×";


            case "warning":

                return "!";


            case "info":

                return "i";


            case "success":

            default:

                return "✓";

        }

    },


    /* --------------------------------------------------------
       Remove toast
    -------------------------------------------------------- */

    removeToast(toast) {

        if (!toast) {
            return;
        }


        if (toast._dfnsTimeout) {

            window.clearTimeout(
                toast._dfnsTimeout
            );

        }


        toast.classList.remove(
            "visible"
        );


        window.setTimeout(
            () => {

                toast.remove();

            },
            220
        );

    },


    /* --------------------------------------------------------
       Toast styles
    -------------------------------------------------------- */

    injectToastStyles() {

        if (
            document.getElementById(
                "dfns-toast-styles"
            )
        ) {

            return;

        }


        const style =
            document.createElement(
                "style"
            );


        style.id =
            "dfns-toast-styles";


        style.textContent = `

            .dfns-toast {

                position: fixed;

                right: 24px;

                bottom: 24px;

                z-index: 9999;

                display: flex;

                align-items: center;

                gap: 10px;

                max-width: 390px;

                min-width: 240px;

                padding: 12px 12px 12px 14px;

                border:
                    1px solid rgba(255,255,255,0.08);

                border-radius: 12px;

                background:
                    rgba(24,24,27,0.96);

                box-shadow:
                    0 20px 50px rgba(0,0,0,0.4);

                backdrop-filter:
                    blur(18px);

                color:
                    #f4f4f5;

                font-family:
                    Inter,
                    sans-serif;

                font-size: 12px;

                font-weight: 650;

                opacity: 0;

                transform:
                    translateY(12px)
                    scale(0.98);

                transition:
                    opacity 220ms ease,
                    transform 220ms ease;

            }


            .dfns-toast.visible {

                opacity: 1;

                transform:
                    translateY(0)
                    scale(1);

            }


            .dfns-toast-icon {

                display: flex;

                align-items: center;

                justify-content: center;

                width: 23px;

                height: 23px;

                flex-shrink: 0;

                border-radius: 50%;

                background:
                    rgba(124,92,255,0.12);

                color:
                    #987dff;

                font-size: 11px;

                font-weight: 900;

            }


            .dfns-toast-message {

                flex: 1;

                line-height: 1.45;

            }


            .dfns-toast-close {

                display: flex;

                align-items: center;

                justify-content: center;

                width: 26px;

                height: 26px;

                flex-shrink: 0;

                border: 0;

                border-radius: 7px;

                background:
                    transparent;

                color:
                    #71717a;

                font-size: 18px;

                cursor: pointer;

            }


            .dfns-toast-close:hover {

                background:
                    rgba(255,255,255,0.05);

                color:
                    #f4f4f5;

            }


            @media (max-width: 600px) {

                .dfns-toast {

                    right: 14px;

                    bottom: 14px;

                    left: 14px;

                    max-width: none;

                }

            }

        `;


        document.head.appendChild(
            style
        );

    },


    /* ========================================================
       16. HTML ESCAPING
       ======================================================== */

    escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    },


    /* ========================================================
       17. DEBOUNCE
       ======================================================== */

    debounce(
        callback,
        delay = 250
    ) {

        let timeout;


        return (...args) => {

            window.clearTimeout(
                timeout
            );


            timeout =
                window.setTimeout(
                    () => {

                        callback(
                            ...args
                        );

                    },
                    delay
                );

        };

    },


    /* ========================================================
       18. THROTTLE
       ======================================================== */

    throttle(
        callback,
        limit = 100
    ) {

        let waiting = false;


        return (...args) => {

            if (waiting) {
                return;
            }


            callback(
                ...args
            );


            waiting = true;


            window.setTimeout(
                () => {

                    waiting = false;

                },
                limit
            );

        };

    },


    /* ========================================================
       19. CUSTOM EVENTS
       ======================================================== */

    emit(
        eventName,
        detail = {}
    ) {

        document.dispatchEvent(
            new CustomEvent(
                eventName,
                {
                    detail,
                }
            )
        );

    },


    /* ========================================================
       20. PAGE HELPERS
       ======================================================== */

    getCurrentPage() {

        const path =
            window.location.pathname;


        const file =
            path
                .split("/")
                .pop()
                .toLowerCase();


        if (
            !file ||
            file === "index.html"
        ) {

            return "home";

        }


        if (
            file === "shop.html"
        ) {

            return "shop";

        }


        if (
            file === "item.html"
        ) {

            return "item";

        }


        return "unknown";

    },


    /* --------------------------------------------------------
       Get URL query parameter
    -------------------------------------------------------- */

    getQueryParameter(
        name
    ) {

        const params =
            new URLSearchParams(
                window.location.search
            );


        return params.get(
            name
        );

    },


    /* --------------------------------------------------------
       Update URL parameter
    -------------------------------------------------------- */

    setQueryParameter(
        name,
        value
    ) {

        const url =
            new URL(
                window.location.href
            );


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            url.searchParams.delete(
                name
            );

        } else {

            url.searchParams.set(
                name,
                value
            );

        }


        window.history.replaceState(
            {},
            "",
            url
        );

    },


    /* ========================================================
       21. IMAGE FALLBACK
       ======================================================== */

    setupImageFallbacks() {

        document
            .querySelectorAll(
                "img"
            )
            .forEach(
                (image) => {

                    if (
                        image.dataset.fallbackReady
                    ) {

                        return;

                    }


                    image.dataset.fallbackReady =
                        "true";


                    image.addEventListener(
                        "error",
                        () => {

                            image.classList.add(
                                "image-error"
                            );


                            if (
                                image.dataset.fallback
                            ) {

                                image.src =
                                    image.dataset.fallback;

                            }

                        }
                    );

                }
            );

    },


    /* ========================================================
       22. VISIBILITY HELPERS
       ======================================================== */

    isElementVisible(element) {

        if (!element) {
            return false;
        }


        const rect =
            element.getBoundingClientRect();


        return (
            rect.top <
                window.innerHeight &&
            rect.bottom > 0 &&
            rect.left <
                window.innerWidth &&
            rect.right > 0
        );

    },


    /* ========================================================
       23. INITIAL PAGE LOADER
       ======================================================== */

    removePageLoader() {

        const loader =
            document.querySelector(
                "[data-page-loader]"
            );


        if (!loader) {
            return;
        }


        loader.classList.add(
            "loaded"
        );


        window.setTimeout(
            () => {

                loader.remove();

            },
            400
        );

    },


};


/* ============================================================
   24. DOCUMENT READY
   ============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            DFNS.init();

        }
    );

} else {

    DFNS.init();

}


/* ============================================================
   25. GLOBAL ACCESS
   ============================================================ */

window.DFNS = DFNS;
