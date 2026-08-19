/* ============================================================
   DFNS — DAILY FORTNITE SHOP
   ITEM PAGE JAVASCRIPT
   ============================================================ */

"use strict";


/* ============================================================
   01. ITEM APPLICATION
   ============================================================ */

const DFNSItem = {

    /* --------------------------------------------------------
       Configuration
    -------------------------------------------------------- */

    config: {

        /*
         * Fortnite-API endpoint.
         *
         * We gebruiken hier de public Fortnite API.
         */

        apiBase:
            "https://fortnite-api.com/v2",

        itemEndpoint:
            "/cosmetics/br",

        /*
         * How long cached item data remains valid.
         */

        cacheDuration:
            1000 * 60 * 10,

    },


    /* --------------------------------------------------------
       Runtime state
    -------------------------------------------------------- */

    state: {

        initialized: false,

        loading: false,

        item: null,

        itemId: null,

    },


    /* --------------------------------------------------------
       DOM references
    -------------------------------------------------------- */

    elements: {},


    /* ========================================================
       02. INITIALIZE
       ======================================================== */

    async init() {

        if (this.state.initialized) {
            return;
        }


        this.cacheElements();


        this.state.itemId =
            this.getItemId();


        this.setupInteractions();


        this.state.initialized =
            true;


        /*
         * If there is no ID in the URL, show a useful
         * error instead of making an invalid API request.
         */

        if (!this.state.itemId) {

            this.renderMissingItem();

            return;

        }


        await this.loadItem(
            this.state.itemId
        );

    },


    /* ========================================================
       03. DOM CACHE
       ======================================================== */

    cacheElements() {

        this.elements = {

            page:
                document.querySelector(
                    ".item-page"
                ),

            loading:
                document.querySelector(
                    "[data-item-loading]"
                ),

            content:
                document.querySelector(
                    "[data-item-content]"
                ),

            error:
                document.querySelector(
                    "[data-item-error]"
                ),

            errorTitle:
                document.querySelector(
                    "[data-item-error-title]"
                ),

            errorMessage:
                document.querySelector(
                    "[data-item-error-message]"
                ),

            retryButton:
                document.querySelector(
                    "[data-item-retry]"
                ),

            backButton:
                document.querySelector(
                    "[data-item-back]"
                ),

            /*
             * Main item information
             */

            image:
                document.querySelector(
                    "[data-item-image]"
                ),

            imageWrapper:
                document.querySelector(
                    "[data-item-image-wrapper]"
                ),

            name:
                document.querySelector(
                    "[data-item-name]"
                ),

            description:
                document.querySelector(
                    "[data-item-description]"
                ),

            rarity:
                document.querySelector(
                    "[data-item-rarity]"
                ),

            type:
                document.querySelector(
                    "[data-item-type]"
                ),

            id:
                document.querySelector(
                    "[data-item-id]"
                ),

            introduced:
                document.querySelector(
                    "[data-item-introduced]"
                ),

            /*
             * Shop information
             */

            price:
                document.querySelector(
                    "[data-item-price]"
                ),

            vbucks:
                document.querySelector(
                    "[data-item-vbucks]"
                ),

            shopDate:
                document.querySelector(
                    "[data-item-shop-date]"
                ),

            /*
             * Favorite
             */

            favoriteButton:
                document.querySelector(
                    "[data-item-favorite]"
                ),

            favoriteIcon:
                document.querySelector(
                    "[data-item-favorite-icon]"
                ),

            favoriteLabel:
                document.querySelector(
                    "[data-item-favorite-label]"
                ),

            /*
             * Metadata
             */

            series:
                document.querySelector(
                    "[data-item-series]"
                ),

            set:
                document.querySelector(
                    "[data-item-set]"
                ),

            chapter:
                document.querySelector(
                    "[data-item-chapter]"
                ),

            season:
                document.querySelector(
                    "[data-item-season]"
                ),

            rarityColor:
                document.querySelector(
                    "[data-item-rarity-color]"
                ),

            /*
             * Related content
             */

            relatedGrid:
                document.querySelector(
                    "[data-related-items]"
                ),

        };

    },


    /* ========================================================
       04. GET ITEM ID
       ======================================================== */

    getItemId() {

        /*
         * Preferred:
         *
         * item.html?id=some-id
         */

        const urlId =
            DFNS.getQueryParameter(
                "id"
            );


        if (urlId) {

            return urlId.trim();

        }


        /*
         * Alternative:
         *
         * item.html?item=some-id
         */

        const alternativeId =
            DFNS.getQueryParameter(
                "item"
            );


        if (alternativeId) {

            return alternativeId.trim();

        }


        /*
         * Alternative:
         *
         * item.html?name=Some%20Skin
         *
         * This is handled later by searching the API.
         */

        const name =
            DFNS.getQueryParameter(
                "name"
            );


        if (name) {

            return name.trim();

        }


        return null;

    },


    /* ========================================================
       05. INTERACTIONS
       ======================================================== */

    setupInteractions() {

        const {

            retryButton,

            backButton,

            favoriteButton,

        } = this.elements;


        /*
         * Retry button
         */

        if (retryButton) {

            retryButton.addEventListener(
                "click",
                () => {

                    if (
                        this.state.itemId
                    ) {

                        this.loadItem(
                            this.state.itemId,
                            true
                        );

                    }

                }
            );

        }


        /*
         * Back button
         */

        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    this.goBack();

                }
            );

        }


        /*
         * Favorite button
         */

        if (favoriteButton) {

            favoriteButton.addEventListener(
                "click",
                () => {

                    this.toggleFavorite();

                }
            );

        }


        /*
         * Image error fallback
         */

        if (
            this.elements.image
        ) {

            this.elements.image.addEventListener(
                "error",
                () => {

                    this.handleImageError();

                }
            );

        }

    },


    /* ========================================================
       06. LOAD ITEM
       ======================================================== */

    async loadItem(
        itemId,
        forceRefresh = false
    ) {

        if (
            this.state.loading
        ) {

            return;

        }


        this.state.loading =
            true;


        this.showLoading();


        this.hideError();


        try {

            /*
             * Check cache first.
             */

            if (!forceRefresh) {

                const cached =
                    this.getCachedItem(
                        itemId
                    );


                if (cached) {

                    this.state.item =
                        cached;


                    this.renderItem(
                        cached
                    );


                    this.state.loading =
                        false;


                    return;

                }

            }


            /*
             * Determine whether the query looks like
             * an actual Fortnite cosmetic ID.
             */

            const looksLikeId =
                this.looksLikeCosmeticId(
                    itemId
                );


            let item;


            if (looksLikeId) {

                item =
                    await this.fetchItemById(
                        itemId
                    );

            } else {

                item =
                    await this.findItemByName(
                        itemId
                    );

            }


            if (!item) {

                throw new Error(
                    "Item not found."
                );

            }


            this.state.item =
                item;


            this.cacheItem(
                item
            );


            this.renderItem(
                item
            );


        } catch (error) {

            console.error(
                "DFNS item error:",
                error
            );


            this.renderError(
                this.getFriendlyError(
                    error
                )
            );


        } finally {

            this.state.loading =
                false;

        }

    },


    /* ========================================================
       07. API — FETCH BY ID
       ======================================================== */

    async fetchItemById(
        itemId
    ) {

        const endpoint =
            `${this.config.apiBase}` +
            `${this.config.itemEndpoint}` +
            `/${encodeURIComponent(itemId)}`;


        const response =
            await fetch(
                endpoint,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json",
                    },

                    cache:
                        "no-store",
                }
            );


        if (
            !response.ok
        ) {

            if (
                response.status === 404
            ) {

                throw new Error(
                    "Item not found."
                );

            }


            throw new Error(
                `API request failed with status ${response.status}.`
            );

        }


        const result =
            await response.json();


        if (
            !result ||
            !result.data
        ) {

            throw new Error(
                "The API returned no item data."
            );

        }


        return result.data;

    },


    /* ========================================================
       08. API — FIND BY NAME
       ======================================================== */

    async findItemByName(
        name
    ) {

        const endpoint =
            `${this.config.apiBase}` +
            `${this.config.itemEndpoint}`;


        const response =
            await fetch(
                endpoint,
                {
                    method: "GET",

                    headers: {
                        "Accept":
                            "application/json",
                    },

                    cache:
                        "no-store",
                }
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `API request failed with status ${response.status}.`
            );

        }


        const result =
            await response.json();


        const items =
            Array.isArray(
                result.data
            )
                ? result.data
                : [];


        const normalizedName =
            name
                .toLowerCase()
                .trim();


        /*
         * Exact match first.
         */

        const exact =
            items.find(
                (item) => {

                    return (
                        String(
                            item.name || ""
                        )
                            .toLowerCase()
                            .trim() ===
                        normalizedName
                    );

                }
            );


        if (exact) {
            return exact;
        }


        /*
         * Partial match second.
         */

        const partial =
            items.find(
                (item) => {

                    return (
                        String(
                            item.name || ""
                        )
                            .toLowerCase()
                            .includes(
                                normalizedName
                            )
                    );

                }
            );


        return partial || null;

    },


    /* ========================================================
       09. ID DETECTION
       ======================================================== */

    looksLikeCosmeticId(
        value
    ) {

        if (!value) {
            return false;
        }


        /*
         * Fortnite cosmetic IDs generally consist of
         * alphanumeric characters and hyphens.
         *
         * We intentionally keep this permissive.
         */

        return /^[a-zA-Z0-9_-]{8,}$/.test(
            value
        );

    },


    /* ========================================================
       10. RENDER ITEM
       ======================================================== */

    renderItem(
        item
    ) {

        if (!item) {

            this.renderMissingItem();

            return;

        }


        this.hideLoading();

        this.hideError();

        this.showContent();


        /*
         * Main information
         */

        this.setText(
            this.elements.name,
            this.getItemName(
                item
            )
        );


        this.setText(
            this.elements.description,
            this.getItemDescription(
                item
            )
        );


        this.setText(
            this.elements.rarity,
            this.getRarityName(
                item
            )
        );


        this.setText(
            this.elements.type,
            this.getItemType(
                item
            )
        );


        this.setText(
            this.elements.id,
            item.id
        );


        this.setText(
            this.elements.introduced,
            this.formatDate(
                item.introduction?.date
            )
        );


        /*
         * Main image
         */

        this.renderMainImage(
            item
        );


        /*
         * Shop information
         */

        this.renderPrice(
            item
        );


        /*
         * Metadata
         */

        this.setText(
            this.elements.series,
            this.getSeriesName(
                item
            )
        );


        this.setText(
            this.elements.set,
            this.getSetName(
                item
            )
        );


        this.setText(
            this.elements.chapter,
            item.introduction?.chapter
        );


        this.setText(
            this.elements.season,
            item.introduction?.season
        );


        this.setText(
            this.elements.rarityColor,
            this.getRarityColor(
                item
            )
        );


        /*
         * Apply rarity styling.
         */

        this.applyRarityClass(
            item
        );


        /*
         * Favorite state.
         */

        this.updateFavoriteButton(
            item.id
        );


        /*
         * Page metadata.
         */

        this.updateDocumentMeta(
            item
        );


        /*
         * Related styles.
         */

        this.renderRelatedItems(
            item
        );


        /*
         * Tell the rest of the application that the item
         * has finished loading.
         */

        DFNS.emit(
            "dfns:item-loaded",
            {
                item,
            }
        );

    },


    /* ========================================================
       11. ITEM NAME
       ======================================================== */

    getItemName(
        item
    ) {

        return (
            item.name ||
            item.displayName ||
            "Unknown Item"
        );

    },


    /* ========================================================
       12. DESCRIPTION
       ======================================================== */

    getItemDescription(
        item
    ) {

        return (
            item.description ||
            item.shortDescription ||
            "No description is available for this item."
        );

    },


    /* ========================================================
       13. TYPE
       ======================================================== */

    getItemType(
        item
    ) {

        if (
            item.type?.displayValue
        ) {

            return item.type.displayValue;

        }


        if (
            item.type?.value
        ) {

            return item.type.value;

        }


        if (
            item.type?.name
        ) {

            return item.type.name;

        }


        return "Cosmetic";

    },


    /* ========================================================
       14. RARITY
       ======================================================== */

    getRarityName(
        item
    ) {

        if (
            item.rarity?.displayValue
        ) {

            return item.rarity.displayValue;

        }


        if (
            item.rarity?.value
        ) {

            return item.rarity.value;

        }


        if (
            item.rarity?.name
        ) {

            return item.rarity.name;

        }


        return "Unknown";

    },


    /* ========================================================
       15. RARITY COLOR
       ======================================================== */

    getRarityColor(
        item
    ) {

        return (
            item.rarity?.backendValue ||
            item.rarity?.color ||
            "Unknown"
        );

    },


    /* ========================================================
       16. SET
       ======================================================== */

    getSetName(
        item
    ) {

        if (
            item.set?.text
        ) {

            return item.set.text;

        }


        if (
            item.set?.name
        ) {

            return item.set.name;

        }


        return "None";

    },


    /* ========================================================
       17. SERIES
       ======================================================== */

    getSeriesName(
        item
    ) {

        if (
            item.series?.name
        ) {

            return item.series.name;

        }


        if (
            item.series?.value
        ) {

            return item.series.value;

        }


        return "None";

    },


    /* ========================================================
       18. MAIN IMAGE
       ======================================================== */

    renderMainImage(
        item
    ) {

        const image =
            this.elements.image;


        if (!image) {
            return;
        }


        const imageUrl =
            item.images?.featured ||
            item.images?.icon ||
            item.images?.full_background ||
            item.images?.background;


        if (!imageUrl) {

            this.handleImageError();

            return;

        }


        image.src =
            imageUrl;


        image.alt =
            this.getItemName(
                item
            );


        image.loading =
            "eager";


        image.decoding =
            "async";


        if (
            this.elements.imageWrapper
        ) {

            this.elements.imageWrapper.classList
                .remove(
                    "image-error"
                );

        }

    },


    /* ========================================================
       19. IMAGE ERROR
       ======================================================== */

    handleImageError() {

        const {

            image,

            imageWrapper,

        } = this.elements;


        if (imageWrapper) {

            imageWrapper.classList.add(
                "image-error"
            );

        }


        if (image) {

            image.removeAttribute(
                "src"
            );

            image.alt =
                "Image unavailable";

        }

    },


    /* ========================================================
       20. PRICE
       ======================================================== */

    renderPrice(
        item
    ) {

        const {

            price,

            vbucks,

            shopDate,

        } = this.elements;


        /*
         * The cosmetic endpoint doesn't necessarily contain
         * today's shop price. We therefore safely check
         * several possible structures.
         */

        const priceValue =
            item.price?.value ??
            item.shopHistory?.[0]?.price ??
            item.price ??
            null;


        if (price) {

            if (
                priceValue !== null &&
                priceValue !== undefined
            ) {

                price.textContent =
                    this.formatNumber(
                        priceValue
                    );

            } else {

                price.textContent =
                    "—";

            }

        }


        if (vbucks) {

            vbucks.textContent =
                "V-Bucks";

        }


        if (shopDate) {

            const latestShopDate =
                this.getLatestShopDate(
                    item
                );


            shopDate.textContent =
                latestShopDate
                    ? this.formatDate(
                        latestShopDate
                    )
                    : "Not available";

        }

    },


    /* ========================================================
       21. SHOP DATE
       ======================================================== */

    getLatestShopDate(
        item
    ) {

        if (
            Array.isArray(
                item.shopHistory
            ) &&
            item.shopHistory.length
        ) {

            const dates =
                item.shopHistory
                    .map(
                        (entry) =>
                            entry.date
                    )
                    .filter(Boolean)
                    .sort(
                        (a, b) =>
                            new Date(b) -
                            new Date(a)
                    );


            return dates[0] || null;

        }


        return null;

    },


    /* ========================================================
       22. FAVORITES
       ======================================================== */

    toggleFavorite() {

        const item =
            this.state.item;


        if (!item?.id) {
            return;
        }


        const isFavorite =
            DFNS.favorites.toggle(
                item.id
            );


        this.updateFavoriteButton(
            item.id
        );


        if (isFavorite) {

            DFNS.showToast(
                `${this.getItemName(item)} added to favorites.`,
                "success"
            );

        } else {

            DFNS.showToast(
                `${this.getItemName(item)} removed from favorites.`,
                "info"
            );

        }

    },


    /* --------------------------------------------------------
       Update favorite button
    -------------------------------------------------------- */

    updateFavoriteButton(
        itemId
    ) {

        const {

            favoriteButton,

            favoriteIcon,

            favoriteLabel,

        } = this.elements;


        if (!favoriteButton) {
            return;
        }


        const active =
            DFNS.favorites.has(
                itemId
            );


        favoriteButton.classList.toggle(
            "active",
            active
        );


        favoriteButton.setAttribute(
            "aria-pressed",
            String(active)
        );


        if (favoriteIcon) {

            favoriteIcon.textContent =
                active
                    ? "♥"
                    : "♡";

        }


        if (favoriteLabel) {

            favoriteLabel.textContent =
                active
                    ? "Saved"
                    : "Save";

        }

    },


    /* ========================================================
       23. RARITY CLASS
       ======================================================== */

    applyRarityClass(
        item
    ) {

        const page =
            this.elements.page;


        if (!page) {
            return;
        }


        const rarity =
            this.getRarityName(
                item
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9]+/g,
                    "-"
                );


        /*
         * Remove previous rarity classes.
         */

        page.classList.forEach(
            (className) => {

                if (
                    className.startsWith(
                        "rarity-"
                    )
                ) {

                    page.classList.remove(
                        className
                    );

                }

            }
        );


        page.classList.add(
            `rarity-${rarity}`
        );

    },


    /* ========================================================
       24. RELATED ITEMS
       ======================================================== */

    renderRelatedItems(
        item
    ) {

        const grid =
            this.elements.relatedGrid;


        if (!grid) {
            return;
        }


        /*
         * The individual item endpoint doesn't always return
         * enough related cosmetic data for a complete section.
         *
         * We render related variants if they exist.
         */

        const variants =
            Array.isArray(
                item.variants
            )
                ? item.variants
                : [];


        if (!variants.length) {

            grid.innerHTML = "";

            return;

        }


        grid.innerHTML =
            variants
                .map(
                    (variant, index) => {

                        const name =
                            variant.name ||
                            `Variant ${index + 1}`;


                        const image =
                            variant.image ||
                            variant.images?.icon ||
                            "";


                        return `

                            <article
                                class="item-variant-card"
                            >

                                <div
                                    class="item-variant-image"
                                >

                                    ${
                                        image
                                            ? `
                                                <img
                                                    src="${this.escapeAttribute(image)}"
                                                    alt="${this.escapeAttribute(name)}"
                                                    loading="lazy"
                                                >
                                            `
                                            : `
                                                <div
                                                    class="variant-placeholder"
                                                >
                                                    —
                                                </div>
                                            `
                                    }

                                </div>

                                <div
                                    class="item-variant-content"
                                >

                                    <h3>
                                        ${DFNS.escapeHTML(name)}
                                    </h3>

                                </div>

                            </article>

                        `;

                    }
                )
                .join("");

    },


    /* ========================================================
       25. LOADING STATE
       ======================================================== */

    showLoading() {

        this.toggle(
            this.elements.loading,
            true
        );


        this.toggle(
            this.elements.content,
            false
        );


        this.toggle(
            this.elements.error,
            false
        );

    },


    hideLoading() {

        this.toggle(
            this.elements.loading,
            false
        );

    },


    /* ========================================================
       26. CONTENT STATE
       ======================================================== */

    showContent() {

        this.toggle(
            this.elements.content,
            true
        );

    },


    /* ========================================================
       27. ERROR STATE
       ======================================================== */

    renderError(
        message
    ) {

        this.hideLoading();

        this.toggle(
            this.elements.content,
            false
        );


        this.toggle(
            this.elements.error,
            true
        );


        this.setText(
            this.elements.errorTitle,
            "Unable to load item"
        );


        this.setText(
            this.elements.errorMessage,
            message
        );

    },


    hideError() {

        this.toggle(
            this.elements.error,
            false
        );

    },


    /* ========================================================
       28. MISSING ITEM
       ======================================================== */

    renderMissingItem() {

        this.hideLoading();


        this.toggle(
            this.elements.content,
            false
        );


        this.toggle(
            this.elements.error,
            true
        );


        this.setText(
            this.elements.errorTitle,
            "No item selected"
        );


        this.setText(
            this.elements.errorMessage,
            "Open an item from the shop to view its details."
        );

    },


    /* ========================================================
       29. CACHE
       ======================================================== */

    getCacheKey(
        itemId
    ) {

        return (
            `item_${itemId}`
        );

    },


    getCachedItem(
        itemId
    ) {

        const cached =
            DFNS.storage.get(
                this.getCacheKey(
                    itemId
                ),
                null
            );


        if (!cached) {
            return null;
        }


        if (
            !cached.timestamp ||
            !cached.data
        ) {

            return null;

        }


        const age =
            Date.now() -
            cached.timestamp;


        if (
            age >
            this.config.cacheDuration
        ) {

            DFNS.storage.remove(
                this.getCacheKey(
                    itemId
                )
            );


            return null;

        }


        return cached.data;

    },


    cacheItem(
        item
    ) {

        if (!item?.id) {
            return;
        }


        DFNS.storage.set(
            this.getCacheKey(
                item.id
            ),
            {
                timestamp:
                    Date.now(),

                data:
                    item,
            }
        );

    },


    /* ========================================================
       30. DOCUMENT META
       ======================================================== */

    updateDocumentMeta(
        item
    ) {

        const name =
            this.getItemName(
                item
            );


        const description =
            this.getItemDescription(
                item
            );


        document.title =
            `${name} — DFNS`;


        const metaDescription =
            document.querySelector(
                'meta[name="description"]'
            );


        if (metaDescription) {

            metaDescription.setAttribute(
                "content",
                description
            );

        }

    },


    /* ========================================================
       31. BACK NAVIGATION
       ======================================================== */

    goBack() {

        /*
         * If the browser has a previous page, use it.
         */

        if (
            window.history.length > 1
        ) {

            window.history.back();

            return;

        }


        /*
         * Otherwise return to the shop.
         */

        window.location.href =
            "shop.html";

    },


    /* ========================================================
       32. FRIENDLY ERRORS
       ======================================================== */

    getFriendlyError(
        error
    ) {

        if (!error) {

            return (
                "Something went wrong while loading this item."
            );

        }


        const message =
            String(
                error.message || error
            );


        if (
            message
                .toLowerCase()
                .includes(
                    "failed to fetch"
                )
        ) {

            return (
                "The Fortnite API could not be reached. Check your internet connection and try again."
            );

        }


        if (
            message
                .toLowerCase()
                .includes(
                    "not found"
                )
        ) {

            return (
                "We couldn't find that Fortnite cosmetic."
            );

        }


        return message;

    },


    /* ========================================================
       33. GENERIC DOM HELPERS
       ======================================================== */

    setText(
        element,
        value
    ) {

        if (!element) {
            return;
        }


        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {

            element.textContent =
                "—";

            return;

        }


        element.textContent =
            String(value);

    },


    toggle(
        element,
        visible
    ) {

        if (!element) {
            return;
        }


        element.hidden =
            !visible;


        element.classList.toggle(
            "is-visible",
            visible
        );

    },


    /* ========================================================
       34. FORMAT NUMBER
       ======================================================== */

    formatNumber(
        value
    ) {

        const number =
            Number(
                value
            );


        if (
            Number.isNaN(number)
        ) {

            return String(value);

        }


        return new Intl.NumberFormat(
            "en-US"
        ).format(
            number
        );

    },


    /* ========================================================
       35. FORMAT DATE
       ======================================================== */

    formatDate(
        value
    ) {

        if (!value) {
            return "—";
        }


        const date =
            new Date(
                value
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return new Intl.DateTimeFormat(
            "en-US",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
            }
        ).format(
            date
        );

    },


    /* ========================================================
       36. ESCAPE ATTRIBUTE
       ======================================================== */

    escapeAttribute(
        value
    ) {

        return DFNS
            .escapeHTML(
                value
            );

    },


};


/* ============================================================
   37. START APPLICATION
   ============================================================ */

if (
    document.readyState === "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => {

            DFNSItem.init();

        }
    );

} else {

    DFNSItem.init();

}


/* ============================================================
   38. GLOBAL ACCESS
   ============================================================ */

window.DFNSItem =
    DFNSItem;
