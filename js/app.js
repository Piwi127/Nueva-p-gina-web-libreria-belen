// Estado
// Funcion: parseStoredJson. Describe y encapsula una parte de la logica de la aplicacion.
function parseStoredJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch (error) {
        console.warn(`Invalid storage payload for ${key}, resetting.`);
        return fallback;
    }
}

// Funcion: parseStoredArray. Describe y encapsula una parte de la logica de la aplicacion.
function parseStoredArray(key) {
    const value = parseStoredJson(key, []);
    return Array.isArray(value) ? value : [];
}

let cart = parseStoredArray('libreriaBelenCart');
let favorites = parseStoredArray('libreriaBelenFavorites');
let products = [];
let currentPage = 1;
const itemsPerPage = 12;
let currentProducts = [];
let currentDetailId = null; // Track product in detail view
let currentDetailQty = 1;
let currentSort = 'featured';
let currentCategory = 'all';
let currentSubcategory = 'all';
let currentBrand = 'all';
let currentMaxPrice = Infinity;
let currentSearchQuery = '';
let productsLoadPromise = null;
let jsPdfLoadPromise = null;
let isProductsLoading = false;
const PRICES_PENDING = false;
const PRICE_LABEL = 'S/ 0.00';
const THEME_STORAGE_KEY = 'libreriaBelenTheme';
const PRODUCTS_SCRIPT_PATH = 'data/products.js?v=20260228e';
const JSPDF_SCRIPT_PATH = 'vendor/jspdf/jspdf.umd.min.js?v=20260227a';
const WHATSAPP_PHONE_NUMBER = '51947872207';
const CF_BEACON_PLACEHOLDER = 'YOUR_CF_BEACON_TOKEN';
const CATEGORY_LABELS = {
    papeleria: 'Papelería',
    utiles: 'Útiles escolares',
    cuadernos: 'Cuadernos',
    arte: 'Arte y manualidades',
    oficina: 'Oficina',
    organizacion: 'Organización',
    escritura: 'Escritura y bolígrafos',
    tecnologia: 'Tecnología',
    regalos: 'Regalos',
    otros: 'Otros'
};

const SUBCATEGORY_PATTERNS = {
    papeleria: [
        { key: 'cartulinas', label: 'Cartulinas', regex: /cartulina/ },
        { key: 'papel-bond', label: 'Papel bond', regex: /papel bond|bond/ },
        { key: 'papel-lustre', label: 'Papel lustre', regex: /papel lustre|lustre/ },
        { key: 'papel-crepe', label: 'Papel crepé', regex: /papel crepe|crepé|crepe/ },
        { key: 'papel-fotocopia', label: 'Papel fotocopia', regex: /fotocopia|resma|chamex/ },
        { key: 'papel-seda', label: 'Papel seda', regex: /papel seda/ },
        { key: 'papel-kraft', label: 'Papel kraft', regex: /kraft/ },
        { key: 'papel-carbon', label: 'Papel carbón', regex: /carb[oó]n|carbon/ },
        { key: 'microporoso', label: 'Microporoso', regex: /microporoso/ },
        { key: 'papelografo', label: 'Papelógrafo', regex: /papel[oó]grafo/ }
    ],
    utiles: [
        { key: 'borradores', label: 'Borradores', regex: /borrador/ },
        { key: 'lapices', label: 'Lápices', regex: /l[aá]piz/ },
        { key: 'colores', label: 'Colores', regex: /colores|cray[oó]n/ },
        { key: 'pegamentos', label: 'Pegamentos', regex: /pegamento|goma|cola|silicona|adhesivo/ },
        { key: 'tajadores', label: 'Tajadores', regex: /tajador|sacapuntas/ },
        { key: 'tijeras', label: 'Tijeras', regex: /tijera/ },
        { key: 'reglas', label: 'Reglas y medidores', regex: /regla|escuadra|transportador|comp[aá]s/ },
        { key: 'cartucheras', label: 'Cartucheras', regex: /cartuchera|estuche/ }
    ],
    cuadernos: [
        { key: 'cuadernos', label: 'Cuadernos', regex: /cuaderno/ },
        { key: 'blocks', label: 'Blocks', regex: /block/ },
        { key: 'libretas', label: 'Libretas', regex: /libreta/ },
        { key: 'anillados', label: 'Anillados', regex: /anillad/ }
    ],
    arte: [
        { key: 'acuarelas', label: 'Acuarelas', regex: /acuarela/ },
        { key: 'temperas', label: 'Témperas', regex: /t[eé]mpera/ },
        { key: 'pinceles', label: 'Pinceles', regex: /pincel/ },
        { key: 'plastilina', label: 'Plastilina', regex: /plastilina/ },
        { key: 'foamy', label: 'Foamy/EVA', regex: /foamy|eva/ },
        { key: 'escarcha', label: 'Escarcha/Glitter', regex: /escarcha|glitter/ },
        { key: 'origami', label: 'Origami', regex: /origami/ }
    ],
    oficina: [
        { key: 'grapadoras', label: 'Grapadoras', regex: /grapadora|engrap/ },
        { key: 'perforadores', label: 'Perforadores', regex: /perforador/ },
        { key: 'sellos', label: 'Sellos/Tampón', regex: /tamp[oó]n|sello/ },
        { key: 'cintas', label: 'Cintas', regex: /cinta/ },
        { key: 'papel-oficina', label: 'Papel de oficina', regex: /papel|resma/ }
    ],
    organizacion: [
        { key: 'archivadores', label: 'Archivadores', regex: /archivador/ },
        { key: 'carpetas', label: 'Carpetas/Folders', regex: /carpeta|folder/ },
        { key: 'separadores', label: 'Separadores', regex: /separador/ },
        { key: 'clips', label: 'Clips/Broches', regex: /clip|broche/ },
        { key: 'chinches', label: 'Chinches/Alfileres', regex: /chinche|alfiler/ },
        { key: 'sobres', label: 'Sobres', regex: /sobre/ }
    ],
    escritura: [
        { key: 'boligrafos', label: 'Bolígrafos', regex: /bol[íi]grafo|lapicero|pluma/ },
        { key: 'marcadores', label: 'Marcadores/Plumones', regex: /marcador|plum[oó]n/ },
        { key: 'resaltadores', label: 'Resaltadores', regex: /resaltador/ },
        { key: 'tintas', label: 'Tintas', regex: /tinta/ }
    ],
    tecnologia: [
        { key: 'usb', label: 'USB/Memorias', regex: /usb|memoria/ },
        { key: 'audio', label: 'Audífonos', regex: /aud[ií]fono/ },
        { key: 'perifericos', label: 'Periféricos', regex: /mouse|teclado/ }
    ],
    regalos: [
        { key: 'detalles', label: 'Detalles', regex: /detalle|regalo/ }
    ],
    otros: [
        { key: 'varios', label: 'Varios', regex: /.+/ }
    ]
};

// Elementos del DOM
const productGrid = document.getElementById('product-grid');
const cartCount = document.querySelectorAll('.cart-count');
const cartModal = document.getElementById('cartModal');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalElement = document.getElementById('cartTotal');
const categoryFilterContainer = document.querySelector('.sidebar .filter-group');
const paginationContainer = document.getElementById('pagination');
const sidebar = document.getElementById('sidebar');
const featuredCarousel = document.getElementById('featured-carousel');
const productDetailModal = document.getElementById('productDetailModal');
const entryAnnouncementModal = document.getElementById('entryAnnouncementModal'); // Puede ser null
const enmicadosModal = document.getElementById('enmicadosModal'); // Puede ser null
let autoScrollInterval;
let entryAnnouncementCloseTimer = null;
const ENTRY_ANNOUNCEMENT_ANIMATION_MS = 260;

// Funcion: escapeHtml. Describe y encapsula una parte de la logica de la aplicacion.
function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Funcion: escapeAttr. Describe y encapsula una parte de la logica de la aplicacion.
function escapeAttr(value) {
    return escapeHtml(value);
}

// Funcion: escapeJsString. Describe y encapsula una parte de la logica de la aplicacion.
function escapeJsString(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ');
}

// Funcion: formatPrice. Describe y encapsula una parte de la logica de la aplicacion.
function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return PRICE_LABEL;
    return 'S/ ' + amount.toFixed(2);
}

// Funcion: sanitizeUrl. Describe y encapsula una parte de la logica de la aplicacion.
function sanitizeUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return 'img/icon.svg';
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return 'img/icon.svg';
    if (/[<>"'`]/.test(trimmed)) return 'img/icon.svg';

    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
    const isProtocolRelative = trimmed.startsWith('//');
    if (!hasScheme && !isProtocolRelative) {
        // Relative/local path: keep it local but encode spaces/unicode safely.
        return encodeURI(trimmed);
    }

    try {
        const parsed = new URL(trimmed, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (!['http:', 'https:'].includes(protocol)) return 'img/icon.svg';

        const allowedHosts = new Set([
            window.location.hostname,
            'via.placeholder.com'
        ]);
        if (!allowedHosts.has(parsed.hostname)) return 'img/icon.svg';
        return parsed.href;
    } catch (error) {
        return 'img/icon.svg';
    }
}

// Funcion: initImageFallbackHandler. Describe y encapsula una parte de la logica de la aplicacion.
function initImageFallbackHandler() {
    document.addEventListener('error', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLImageElement)) return;
        const fallback = target.getAttribute('data-fallback-src');
        if (!fallback) return;
        if (target.dataset.fallbackApplied === '1') return;

        target.dataset.fallbackApplied = '1';
        target.src = fallback;
    }, true);
}

// Funcion: openEntryAnnouncementModal. Describe y encapsula una parte de la logica de la aplicacion.
function openEntryAnnouncementModal() {
    if (!entryAnnouncementModal) return;
    if (entryAnnouncementCloseTimer) {
        clearTimeout(entryAnnouncementCloseTimer);
        entryAnnouncementCloseTimer = null;
    }
    entryAnnouncementModal.style.display = 'grid';
    entryAnnouncementModal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        entryAnnouncementModal.classList.add('is-visible');
    });
    document.body.classList.add('announcement-open');
}

// Funcion: closeEntryAnnouncementModal. Describe y encapsula una parte de la logica de la aplicacion.
function closeEntryAnnouncementModal() {
    if (!entryAnnouncementModal) return;
    entryAnnouncementModal.classList.remove('is-visible');
    entryAnnouncementModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('announcement-open');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduceMotion ? 0 : ENTRY_ANNOUNCEMENT_ANIMATION_MS;
    if (entryAnnouncementCloseTimer) clearTimeout(entryAnnouncementCloseTimer);
    entryAnnouncementCloseTimer = window.setTimeout(() => {
        if (!entryAnnouncementModal.classList.contains('is-visible')) {
            entryAnnouncementModal.style.display = 'none';
        }
        entryAnnouncementCloseTimer = null;
    }, delay);
}

// Funcion: initEntryAnnouncementModal. Describe y encapsula una parte de la logica de la aplicacion.
function initEntryAnnouncementModal() {
    // Check for support modal first
    const supportModal = document.getElementById('supportAnnouncementModal');
    const homeModal = document.getElementById('entryAnnouncementModal');
    const enmicadosModal = document.getElementById('enmicadosModal');
    
    // Use support modal on support page, home modal on home page
    const isSupportPage = document.body.classList.contains('support-page-body');
    const isHomePage = document.body.classList.contains('page-home');
    
    let modalToUse = null;
    let openFn, closeFn, closeBtnSelector;
    
    if (isSupportPage && supportModal) {
        modalToUse = supportModal;
        openFn = openSupportAnnouncementModal;
        closeFn = closeSupportAnnouncementModal;
        closeBtnSelector = '[data-support-announcement-close]';
    } else if (isHomePage && homeModal) {
        modalToUse = homeModal;
        openFn = openEntryAnnouncementModal;
        closeFn = closeEntryAnnouncementModal;
        closeBtnSelector = '[data-announcement-close]';
    }
    
    if (modalToUse) {
        // Bind close button
        if (modalToUse.dataset.bound !== '1') {
            const closeBtn = modalToUse.querySelector(closeBtnSelector);
            if (closeBtn) {
                closeBtn.addEventListener('click', closeFn);
            }
            modalToUse.dataset.bound = '1';
        }
        window.setTimeout(openFn, 280);
    }

    // Also show enmicados modal on home page (after a delay)
    if (isHomePage && enmicadosModal) {
        if (enmicadosModal.dataset.bound !== '1') {
            const closeBtn = enmicadosModal.querySelector('[data-enmicados-close]');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeEnmicadosModal);
            }
            enmicadosModal.dataset.bound = '1';
        }
        // Show after 3 seconds (after the main announcement)
        window.setTimeout(openEnmicadosModal, 3000);
    }
}

// Funcion: openSupportAnnouncementModal. Soporte técnico.
function openSupportAnnouncementModal() {
    const modal = document.getElementById('supportAnnouncementModal');
    if (!modal) return;
    if (entryAnnouncementCloseTimer) {
        clearTimeout(entryAnnouncementCloseTimer);
        entryAnnouncementCloseTimer = null;
    }
    modal.style.display = 'grid';
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        modal.classList.add('is-visible');
    });
    document.body.classList.add('announcement-open');
}

// Funcion: closeSupportAnnouncementModal. Soporte técnico.
function closeSupportAnnouncementModal() {
    const modal = document.getElementById('supportAnnouncementModal');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('announcement-open');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduceMotion ? 0 : ENTRY_ANNOUNCEMENT_ANIMATION_MS;
    if (entryAnnouncementCloseTimer) clearTimeout(entryAnnouncementCloseTimer);
    entryAnnouncementCloseTimer = window.setTimeout(() => {
        if (!modal.classList.contains('is-visible')) {
            modal.style.display = 'none';
        }
        entryAnnouncementCloseTimer = null;
    }, delay);
}

// Enmicados modal functions
function openEnmicadosModal() {
    const modal = document.getElementById('enmicadosModal');
    if (!modal) return;
    if (entryAnnouncementCloseTimer) {
        clearTimeout(entryAnnouncementCloseTimer);
        entryAnnouncementCloseTimer = null;
    }
    modal.style.display = 'grid';
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
        modal.classList.add('is-visible');
    });
    document.body.classList.add('announcement-open');
}

function closeEnmicadosModal() {
    const modal = document.getElementById('enmicadosModal');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('announcement-open');

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reduceMotion ? 0 : ENTRY_ANNOUNCEMENT_ANIMATION_MS;
    if (entryAnnouncementCloseTimer) clearTimeout(entryAnnouncementCloseTimer);
    entryAnnouncementCloseTimer = window.setTimeout(() => {
        if (!modal.classList.contains('is-visible')) {
            modal.style.display = 'none';
        }
        entryAnnouncementCloseTimer = null;
    }, delay);
}

// Inicializacion
document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.toggle('prices-pending', PRICES_PENDING);
    initThemeToggle();
    updateCartCount();
    initImageFallbackHandler();
    initCloudflareWebAnalytics();
    initAnalyticsTracking();
    initSearchUI();
    initSupportRequestForm();
    initHeroCarousel();
    initSupportMatrixBackground();
    applyPricePendingUI();
    initAccessibilityEnhancements();
    initDynamicYear();
    initVisualMicroInteractions();
    initPremiumFeatures();
    initEntryAnnouncementModal(); // Habilitado - muestra anuncio al ingresar

    if (productGrid) {
        // Catalog Page Logic
        renderCatalogSkeleton(8);
        ensureProductsLoaded().then(() => {
            renderCategories();
            renderBrandFilters();
            initPriceFilterUI();
            initSortSelect();
            const urlParams = new URLSearchParams(window.location.search);
            const category = urlParams.get('category');
            const searchQuery = urlParams.get('search');

            if (category) {
                setTimeout(() => {
                    const normalizedCategory = normalizeCategory(category, '');
                    const radio = document.querySelector(`input[name="category"][value="${normalizedCategory}"]`);
                    if (radio) radio.checked = true;
                    filterProducts(normalizedCategory);
                }, 0);
            } else if (searchQuery) {
                setTimeout(() => {
                    const input = document.getElementById('searchInput');
                    if (input) input.value = searchQuery;
                    handleSearchInput(searchQuery, false, true);
                }, 0);
            } else {
                currentProducts = products;
                applyFilters();
            }
        }).catch(() => {
            if (productGrid) {
                productGrid.innerHTML = '<p class="no-results" style="grid-column:1/-1; text-align:center; padding: 2rem;">No se pudo cargar el catálogo.</p>';
            }
        });
    }

    if (featuredCarousel) {
        renderFeaturedSkeleton(4);
        ensureProductsLoaded().then(() => {
            renderFeaturedCarousel();
            startCarouselAutoScroll();
        }).catch(() => {
            if (featuredCarousel) {
                featuredCarousel.innerHTML = '<p style="text-align: center; width: 100%; padding: 2rem;">No se pudieron cargar novedades.</p>';
            }
        });
    }

    // Close modals on outside click without clobbering other handlers.
    window.addEventListener('click', (event) => {
        if (event.target === cartModal) closeCart();
        else if (event.target === productDetailModal) closeProductModal();
        else if (event.target === entryAnnouncementModal) closeEntryAnnouncementModal();
    });
});

// Funcion: ensureProductsLoaded. Describe y encapsula una parte de la logica de la aplicacion.
function ensureProductsLoaded() {
    if (products.length > 0) return Promise.resolve(products);

    if (typeof window.PRODUCTS !== 'undefined') {
        loadProducts();
        return Promise.resolve(products);
    }

    if (isProductsLoading) return productsLoadPromise;

    isProductsLoading = true;
    productsLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${PRODUCTS_SCRIPT_PATH}"]`);
        if (existing) {
            if (typeof window.PRODUCTS !== 'undefined') {
                loadProducts();
                resolve(products);
                return;
            }

            const onLoad = () => {
                cleanup();
                loadProducts();
                resolve(products);
            };
            const onError = () => {
                cleanup();
                reject(new Error('No se pudo cargar products.js'));
            };
            const timeoutId = window.setTimeout(() => {
                cleanup();
                if (typeof window.PRODUCTS !== 'undefined') {
                    loadProducts();
                    resolve(products);
                    return;
                }
                reject(new Error('Tiempo de espera agotado al cargar products.js'));
            }, 5000);
            const cleanup = () => {
                clearTimeout(timeoutId);
                existing.removeEventListener('load', onLoad);
                existing.removeEventListener('error', onError);
            };

            existing.addEventListener('load', onLoad, { once: true });
            existing.addEventListener('error', onError, { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = PRODUCTS_SCRIPT_PATH;
        script.defer = true;
        script.onload = () => {
            loadProducts();
            resolve(products);
        };
        script.onerror = () => reject(new Error('No se pudo cargar products.js'));
        document.head.appendChild(script);
    }).finally(() => {
        isProductsLoading = false;
        productsLoadPromise = null;
    });

    return productsLoadPromise;
}

// Funcion: trackEvent. Describe y encapsula una parte de la logica de la aplicacion.
function trackEvent(eventName, params = {}) {
    const payload = { event_name: eventName, ...params };

    if (Array.isArray(window.dataLayer)) {
        window.dataLayer.push(payload);
    }
    if (typeof window.gtag === 'function') {
        window.gtag('event', eventName, params);
    }

    window.dispatchEvent(new CustomEvent('libreria-analytics', { detail: payload }));
}

// Funcion: initCloudflareWebAnalytics. Describe y encapsula una parte de la logica de la aplicacion.
function initCloudflareWebAnalytics() {
    const tokenMeta = document.querySelector('meta[name="cf-beacon-token"]');
    if (!tokenMeta) return;

    const token = (tokenMeta.getAttribute('content') || '').trim();
    if (!token || token === CF_BEACON_PLACEHOLDER) return;
    if (document.querySelector('script[data-cf-beacon]')) return;

    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', `{"token":"${token}"}`);
    document.head.appendChild(script);
}

// Funcion: initAnalyticsTracking. Describe y encapsula una parte de la logica de la aplicacion.
function initAnalyticsTracking() {
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const conversionCta = target.closest('[data-cta-id]');
        if (conversionCta) {
            const ctaId = conversionCta.getAttribute('data-cta-id') || 'unknown';
            const label = conversionCta.textContent ? conversionCta.textContent.trim().toLowerCase() : ctaId;
            trackEvent('conversion_cta_click', {
                cta_id: ctaId,
                label: label.slice(0, 90),
                path: window.location.pathname
            });
        }

        const whatsappLink = target.closest('a[href*="wa.me/"]');
        if (whatsappLink) {
            trackEvent('whatsapp_click', {
                source: whatsappLink.className || 'link',
                path: window.location.pathname
            });
            return;
        }

        const cta = target.closest('a.btn, button.btn');
        if (!cta) return;

        const label = cta.textContent ? cta.textContent.trim().toLowerCase() : 'cta';
        trackEvent('cta_click', { label, path: window.location.pathname });
    });
}

// Funcion: initHeroCarousel. Describe y encapsula una parte de la logica de la aplicacion.
function initHeroCarousel() {
    const root = document.querySelector('[data-hero-carousel]');
    if (!root) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationMsRaw = Number(root.dataset.animationMs);
    const autoplayMsRaw = Number(root.dataset.autoplayMs);
    const animationMs = Number.isFinite(animationMsRaw) && animationMsRaw >= 0 ? animationMsRaw : 1800;
    const autoplayMs = Number.isFinite(autoplayMsRaw) && autoplayMsRaw >= 1200 ? autoplayMsRaw : 6500;

    const slides = Array.from(root.querySelectorAll('[data-hero-slide]'));
    const dots = Array.from(root.querySelectorAll('[data-hero-dot]'));
    const prevBtn = root.querySelector('[data-hero-prev]');
    const nextBtn = root.querySelector('[data-hero-next]');
    if (slides.length === 0) return;

    let index = slides.findIndex(slide => slide.classList.contains('is-active'));
    if (index < 0) index = 0;
    let timer = null;
    let animating = false;
    let animationFrame = null;

    const syncUiState = (activeIndex) => {
        dots.forEach((dot, i) => {
            const active = i === activeIndex;
            dot.classList.toggle('is-active', active);
            dot.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        slides.forEach((slide, i) => {
            slide.setAttribute('aria-hidden', i === activeIndex ? 'false' : 'true');
        });
    };

    const cleanAnimationClasses = (slide) => {
        slide.classList.remove('is-entering', 'is-leaving', 'to-next', 'to-prev');
    };

    const getDirection = (current, target) => {
        if (slides.length <= 1 || current === target) return 'to-next';
        if (current === slides.length - 1 && target === 0) return 'to-next';
        if (current === 0 && target === slides.length - 1) return 'to-prev';
        return target > current ? 'to-next' : 'to-prev';
    };

    const setActive = (next) => {
        const safeNext = (next + slides.length) % slides.length;
        if (animating) return;
        if (safeNext === index && slides[index].classList.contains('is-active')) {
            syncUiState(safeNext);
            return;
        }

        const currentSlide = slides[index];
        const nextSlide = slides[safeNext];
        const direction = getDirection(index, safeNext);

        if (prefersReducedMotion || animationMs === 0) {
            cleanAnimationClasses(currentSlide);
            cleanAnimationClasses(nextSlide);
            currentSlide.classList.remove('is-active');
            nextSlide.classList.add('is-active');
            index = safeNext;
            syncUiState(index);
            return;
        }

        animating = true;
        slides.forEach(cleanAnimationClasses);

        currentSlide.classList.remove('is-active');
        currentSlide.classList.add('is-leaving', direction);

        nextSlide.classList.add('is-active', 'is-entering', direction);
        syncUiState(safeNext);

        if (animationFrame) {
            clearTimeout(animationFrame);
            animationFrame = null;
        }

        animationFrame = setTimeout(() => {
            cleanAnimationClasses(currentSlide);
            cleanAnimationClasses(nextSlide);
            index = safeNext;
            animating = false;
            animationFrame = null;
            syncUiState(index);
        }, animationMs);

        index = safeNext;
    };

    const startAutoplay = () => {
        if (root.dataset.autoplay !== 'true') return;
        if (prefersReducedMotion || document.hidden) return;
        stopAutoplay();
        timer = setInterval(() => setActive(index + 1), autoplayMs);
    };

    const stopAutoplay = () => {
        if (!timer) return;
        clearInterval(timer);
        timer = null;
    };

    dots.forEach((dot, i) => {
        dot.addEventListener('click', () => {
            setActive(i);
            startAutoplay();
        });
    });

    if (prevBtn) prevBtn.addEventListener('click', () => {
        setActive(index - 1);
        startAutoplay();
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
        setActive(index + 1);
        startAutoplay();
    });

    root.addEventListener('mouseenter', stopAutoplay);
    root.addEventListener('mouseleave', startAutoplay);
    root.addEventListener('focusin', stopAutoplay);
    root.addEventListener('focusout', startAutoplay);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
    });

    setActive(index);
    startAutoplay();
}

// Funcion: applyTheme. Describe y encapsula una parte de la logica de la aplicacion.
function applyTheme(theme) {
    const safeTheme = theme === 'night' ? 'night' : 'editorial';
    if (safeTheme === 'editorial') {
        document.documentElement.removeAttribute('data-theme');
    } else {
        document.documentElement.setAttribute('data-theme', safeTheme);
    }

    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = safeTheme === 'night' ? 'fas fa-sun' : 'fas fa-moon';
        }
        btn.setAttribute('aria-label', safeTheme === 'night' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro');
    });
}

// Funcion: initThemeToggle. Describe y encapsula una parte de la logica de la aplicacion.
function initThemeToggle() {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    applyTheme(stored || 'editorial');
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme') === 'night' ? 'night' : 'editorial';
            const next = current === 'night' ? 'editorial' : 'night';
            localStorage.setItem(THEME_STORAGE_KEY, next);
            applyTheme(next);
        });
    });
}

let activeSearchIndex = -1;
let searchDebounceTimer = null;
const SEARCH_DEBOUNCE_MS = 120;

// Funcion: initSearchUI. Describe y encapsula una parte de la logica de la aplicacion.
function initSearchUI() {
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    input.addEventListener('keydown', (event) => {
        if (!results.classList.contains('active')) return;
        const items = Array.from(results.querySelectorAll('.search-item[data-search-item]'));
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeSearchIndex = (activeSearchIndex + 1) % items.length;
            setActiveSearchItem(items, activeSearchIndex);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeSearchIndex = (activeSearchIndex - 1 + items.length) % items.length;
            setActiveSearchItem(items, activeSearchIndex);
        } else if (event.key === 'Enter') {
            if (activeSearchIndex >= 0 && items[activeSearchIndex]) {
                event.preventDefault();
                items[activeSearchIndex].click();
            } else {
                executeSearch();
            }
        } else if (event.key === 'Escape') {
            results.classList.remove('active');
            activeSearchIndex = -1;
        }
    });

    document.addEventListener('click', (event) => {
        const searchBar = event.target.closest('.search-bar');
        if (!searchBar) {
            results.classList.remove('active');
            activeSearchIndex = -1;
        }
    });
}

// Funcion: setActiveSearchItem. Describe y encapsula una parte de la logica de la aplicacion.
function setActiveSearchItem(items, index) {
    items.forEach((item, i) => item.classList.toggle('active', i === index));
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
}

// Funcion: getSearchHistory. Describe y encapsula una parte de la logica de la aplicacion.
function getSearchHistory() {
    return parseStoredArray('libreriaBelenSearchHistory');
}

// Funcion: saveSearchHistory. Describe y encapsula una parte de la logica de la aplicacion.
function saveSearchHistory(history) {
    localStorage.setItem('libreriaBelenSearchHistory', JSON.stringify(history.slice(0, 6)));
}

// Funcion: addSearchHistory. Describe y encapsula una parte de la logica de la aplicacion.
function addSearchHistory(query) {
    const q = query.trim();
    if (!q) return;
    const history = getSearchHistory().filter(item => item.toLowerCase() !== q.toLowerCase());
    history.unshift(q);
    saveSearchHistory(history);
}

// Funcion: renderSearchDropdown. Describe y encapsula una parte de la logica de la aplicacion.
function renderSearchDropdown(query, filtered) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    searchResults.innerHTML = '';
    activeSearchIndex = -1;
    const q = query.trim().toLowerCase();

    if (q.length === 0) {
        const history = getSearchHistory();
        if (history.length > 0) {
            searchResults.appendChild(createSectionTitle('Búsquedas recientes'));
            searchResults.appendChild(createChipRow(history, (text) => {
                const input = document.getElementById('searchInput');
                if (input) input.value = text;
                handleSearchInput(text, true, true);
            }));
        }

        const categoryList = getTopCategories(products, 6);
        if (categoryList.length > 0) {
            searchResults.appendChild(createSectionTitle('Categorías populares'));
            searchResults.appendChild(createChipRow(categoryList, (cat) => handleCategorySearch(cat)));
        }

        const brandList = getTopBrands(products, 6);
        if (brandList.length > 0) {
            searchResults.appendChild(createSectionTitle('Marcas populares'));
            searchResults.appendChild(createChipRow(brandList, (brand) => handleBrandSearch(brand)));
        }

        if (history.length === 0 && categoryList.length === 0) {
            searchResults.innerHTML = '<div class="search-empty"><i class="fas fa-search"></i><div>Escribe para buscar productos</div></div>';
        }

        searchResults.classList.add('active');
        return;
    }

    const suggestions = filtered.slice(0, 8);
    if (suggestions.length === 0) {
        searchResults.innerHTML = '<div class="search-empty"><i class="fas fa-sad-tear"></i><div>No se encontraron resultados</div></div>';
    } else {
        suggestions.forEach((product, index) => {
            const item = document.createElement('div');
            const safeTitle = escapeHtml(product.title);
            const safeImage = escapeAttr(sanitizeUrl(product.image));
            const highlightedTitle = highlightSearchMatches(product.title, query);
            const highlightedCategory = highlightSearchMatches(product.category, query);
            item.className = 'search-item';
            item.setAttribute('data-search-item', 'true');
            item.style.animationDelay = `${index * 0.05}s`;
            item.onclick = () => {
                addSearchHistory(product.title);
                openProductModal(product.id);
                searchResults.classList.remove('active');
                const input = document.getElementById('searchInput');
                if (input) input.value = '';
            };
            item.innerHTML = `
                <img src="${safeImage}" alt="${safeTitle}" data-fallback-src="img/icon.svg">
                <div class="search-item-info">
                    <h4>${highlightedTitle}</h4>
                    <p>${highlightedCategory}</p>
                </div>
                <div class="search-item-price">${PRICES_PENDING ? PRICE_LABEL : formatPrice(product.price)}</div>
            `;
            searchResults.appendChild(item);
        });
    }

    const relatedCategories = getTopCategories(filtered, 5);
    if (relatedCategories.length > 0) {
        searchResults.appendChild(createSectionTitle('Categorías relacionadas'));
        searchResults.appendChild(createChipRow(relatedCategories, (cat) => handleCategorySearch(cat)));
    }

    const relatedBrands = getTopBrands(filtered, 5);
    if (relatedBrands.length > 0) {
        searchResults.appendChild(createSectionTitle('Marcas relacionadas'));
        searchResults.appendChild(createChipRow(relatedBrands, (brand) => handleBrandSearch(brand)));
    }

    searchResults.classList.add('active');
}

// Funcion: createSectionTitle. Describe y encapsula una parte de la logica de la aplicacion.
function createSectionTitle(text) {
    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.innerText = text;
    return title;
}

// Funcion: createChipRow. Describe y encapsula una parte de la logica de la aplicacion.
function createChipRow(items, onClick) {
    const row = document.createElement('div');
    row.className = 'search-chips';
    items.forEach(item => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'search-chip';
        chip.innerText = item;
        chip.onclick = () => onClick(item);
        row.appendChild(chip);
    });
    return row;
}

// Funcion: createProductChipRow. Describe y encapsula una parte de la logica de la aplicacion.
function createProductChipRow(items) {
    const row = document.createElement('div');
    row.className = 'search-chips';
    items.forEach(product => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'search-chip search-product-chip';
        const title = document.createElement('span');
        title.textContent = product.title;
        const price = document.createElement('strong');
        price.textContent = PRICES_PENDING ? PRICE_LABEL : formatPrice(product.price);
        chip.appendChild(title);
        chip.appendChild(price);
        chip.onclick = () => {
            addSearchHistory(product.title);
            openProductModal(product.id);
            const results = document.getElementById('searchResults');
            if (results) results.classList.remove('active');
        };
        row.appendChild(chip);
    });
    return row;
}

// Funcion: getTopCategories. Describe y encapsula una parte de la logica de la aplicacion.
function getTopCategories(list, limit) {
    const counts = {};
    list.forEach(p => {
        const key = (p.category || 'Varios').toString();
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name]) => name);
}

// Funcion: getTopBrands. Describe y encapsula una parte de la logica de la aplicacion.
function getTopBrands(list, limit) {
    const counts = {};
    list.forEach(p => {
        const brand = p.brand || extractBrandFromTitle(p.title);
        if (!brand) return;
        counts[brand] = (counts[brand] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name]) => name);
}

// Funcion: extractBrandFromTitle. Describe y encapsula una parte de la logica de la aplicacion.
function extractBrandFromTitle(title) {
    const knownBrands = [
        { label: 'Faber-Castell', pattern: /faber[-\s]?castell/i },
        { label: 'Artesco', pattern: /artesco/i },
        { label: 'Staedtler', pattern: /staedtler/i },
        { label: 'Maped', pattern: /maped/i },
        { label: 'Pelikan', pattern: /pelikan/i },
        { label: 'Vinifan', pattern: /vinifan/i },
        { label: 'Ove', pattern: /\bove\b/i },
        { label: 'Justus', pattern: /justus/i }
    ];

    for (const brand of knownBrands) {
        if (brand.pattern.test(title)) return brand.label;
    }

    return '';
}

// Funcion: getBestPriceProducts. Describe y encapsula una parte de la logica de la aplicacion.
function getBestPriceProducts(list, limit) {
    return [...list]
        .filter(p => Number.isFinite(p.price))
        .sort((a, b) => a.price - b.price)
        .slice(0, limit);
}

// Funcion: handleCategorySearch. Describe y encapsula una parte de la logica de la aplicacion.
function handleCategorySearch(category) {
    const input = document.getElementById('searchInput');
    if (input) input.value = '';

    if (products.length === 0) {
        ensureProductsLoaded().then(() => handleCategorySearch(category)).catch(() => {});
        return;
    }

    if (productGrid) {
        const radio = document.querySelector(`input[name="category"][value="${category}"]`);
        if (radio) {
            radio.checked = true;
            filterProducts(category);
        } else {
            currentProducts = products.filter(p => p.category === category);
            renderProducts(currentProducts);
        }
    } else {
        window.location.href = `catalog.html?category=${encodeURIComponent(category)}`;
    }
}

// Funcion: handleBrandSearch. Describe y encapsula una parte de la logica de la aplicacion.
function handleBrandSearch(brand) {
    const input = document.getElementById('searchInput');
    if (input) input.value = brand;

    if (products.length === 0) {
        ensureProductsLoaded().then(() => handleBrandSearch(brand)).catch(() => {});
        return;
    }

    const filtered = filterBySearch(products, brand);
    if (productGrid) {
        currentPage = 1;
        currentProducts = filtered;
        renderProducts(sortProducts(currentProducts, currentSort));
    }
    renderSearchDropdown(brand, filtered);
}

// Funcion: loadProducts. Describe y encapsula una parte de la logica de la aplicacion.
function loadProducts() {
    if (typeof window.PRODUCTS !== 'undefined') {
        products = Object.entries(window.PRODUCTS).map(([slug, data], index) => {
            let price = 0;
            if (typeof data.price === 'string') {
                price = parseFloat(data.price.replace('S/ ', '').replace(',', ''));
            } else {
                price = Number(data.price);
            }
            let image = data.image || 'img/icon.svg';
            if (image.startsWith('assets/img/')) {
                image = image.replace('assets/img/', 'img/');
            }
            try { image = decodeURIComponent(image); } catch (e) { }

            const normalizedCategory = normalizeCategory(data.category, data.title);
            const normalizedSubcategory = normalizeSubcategory(normalizedCategory, data.title || '');
            const brand = (data.brand && String(data.brand).trim()) || extractBrandFromTitle(data.title || '') || 'Otros';
            const searchTokens = buildSearchTokens({
                title: data.title,
                description: data.description,
                longDescription: data.longDescription,
                usage: data.usage,
                category: normalizedCategory,
                subcategory: normalizedSubcategory,
                subcategoryLabel: getSubcategoryLabel(normalizedCategory, normalizedSubcategory),
                brand
            });
            const normalizedTitle = normalizeText(data.title || '');
            const normalizedSearchBlob = normalizeText([
                data.title || '',
                data.description || '',
                data.longDescription || '',
                Array.isArray(data.usage) ? data.usage.join(' ') : (data.usage || ''),
                normalizedCategory,
                normalizedSubcategory,
                getSubcategoryLabel(normalizedCategory, normalizedSubcategory),
                brand
            ].join(' '));

            return {
                id: index + 1,
                slug: slug,
                title: data.title,
                price: price || 0,
                category: normalizedCategory,
                subcategory: normalizedSubcategory,
                brand,
                image: image,
                rating: parseFloat(data.rating) || 4.5,
                description: data.description || '',
                longDescription: data.longDescription || data.description, // Fallback
                features: data.details || [],
                usage: data.usage || [],
                searchTokens,
                normalizedTitle,
                normalizedSearchBlob
            };
        });
        currentProducts = products;
    }
}

// Funcion: normalizeCategory. Describe y encapsula una parte de la logica de la aplicacion.
function normalizeCategory(rawCategory, title) {
    const normalized = (rawCategory || '').toString().trim().toLowerCase();
    if (['papeleria', 'regalos', 'cuadernos'].includes(normalized)) return normalized;
    if (normalized === 'office') return 'oficina';
    if (normalized === 'school') return 'utiles';
    if (normalized === 'tech') return 'tecnologia';
    if (normalized === 'varios') return 'otros';

    return categorizeByTitle(title || '') || (normalized || 'otros');
}

// Funcion: categorizeByTitle. Describe y encapsula una parte de la logica de la aplicacion.
function categorizeByTitle(title) {
    const t = title.toLowerCase();

    if (/(cuaderno|block|cuadernillo|anillad|empastad|libreta)/.test(t)) return 'cuadernos';
    if (/(cartulina|papel bond|papel lustre|papel crepe|papelógrafo|papelografo|microporoso|papel fotocopia|papel autocopia|papel seda|papel kraft|papel carbón|papel carbon)/.test(t)) return 'papeleria';
    if (/(acuarela|témpera|tempera|pintura|oleo|pincel|cray[oó]n|plastilina|microporoso|foamy|eva|origami|escarcha|glitter|lentejuela)/.test(t)) return 'arte';
    if (/(borrador|tajador|sacapuntas|regla|transportador|comp[aá]s|pegamento|goma|silicona|tijera|cartuchera|estuche|colores|lapicero escolar|lapiz escolar)/.test(t)) return 'utiles';
    if (/(bol[íi]grafo|lapicero|l[aá]piz|plum[oó]n|marcador|resaltador|tinta|pilot|faber|bic|staedtler|paper mate)/.test(t)) return 'escritura';
    if (/(archivador|folder|carpeta|separador|organizador|clip|chinche|alfiler|broche|broches|sobre|post-it|nota adhesiva|portafolio)/.test(t)) return 'organizacion';
    if (/(perforador|grapadora|engrap|tamp[oó]n|sello|calculadora|laminadora|cinta adhesiva|dispensador)/.test(t)) return 'oficina';
    if (/(usb|memoria|mouse|teclado|aud[ií]fono|cd|dvd|laptop|bater[ií]a|cargador)/.test(t)) return 'tecnologia';
    if (/(regalo|detalle|juguete)/.test(t)) return 'regalos';

    return '';
}

// Funcion: normalizeSubcategory. Describe y encapsula una parte de la logica de la aplicacion.
function normalizeSubcategory(category, title) {
    const patterns = SUBCATEGORY_PATTERNS[category] || [];
    const t = title.toLowerCase();
    for (const entry of patterns) {
        if (entry.regex.test(t)) return entry.key;
    }
    return 'varios';
}

// Funcion: getSubcategoryLabel. Describe y encapsula una parte de la logica de la aplicacion.
function getSubcategoryLabel(category, subcategory) {
    const patterns = SUBCATEGORY_PATTERNS[category] || [];
    const match = patterns.find(p => p.key === subcategory);
    return match ? match.label : subcategory;
}

// Funcion: buildSearchTokens. Describe y encapsula una parte de la logica de la aplicacion.
function buildSearchTokens({ title, description, longDescription, usage, category, subcategory, subcategoryLabel, brand }) {
    const tokens = new Set();
    const source = [
        title || '',
        description || '',
        longDescription || '',
        Array.isArray(usage) ? usage.join(' ') : (usage || ''),
        category || '',
        subcategory || '',
        subcategoryLabel || '',
        brand || ''
    ]
        .join(' ')
        .toLowerCase();

    tokenize(source).forEach(t => tokens.add(t));

    const usageAliases = {
        pegar: ['pegamento', 'goma', 'cola', 'silicona', 'adhesivo', 'cinta'],
        escribir: ['lapiz', 'lápiz', 'boligrafo', 'bolígrafo', 'lapicero', 'pluma', 'tinta', 'marcador', 'plumon', 'plumón'],
        cortar: ['tijera', 'cutter', 'cortador'],
        medir: ['regla', 'escuadra', 'transportador', 'compas', 'compás'],
        organizar: ['archivador', 'folder', 'carpeta', 'separador', 'organizador', 'clip', 'grapa', 'grapadora', 'chinche', 'alfiler'],
        colorear: ['colores', 'crayon', 'crayón', 'acuarela', 'tempera', 'témpera', 'plumon', 'plumón', 'marcador'],
        limpiar: ['borrador', 'corrector'],
        imprimir: ['papel bond', 'fotocopia', 'resma', 'papel'],
        manualidades: ['foamy', 'eva', 'microporoso', 'escarcha', 'glitter', 'origami', 'lentejuela', 'cartulina', 'palito', 'palitos', 'pincel', 'pintura'],
        seguridad: ['candado', 'cinta', 'sellado'],
        oficina: ['archivador', 'folder', 'carpeta', 'papel bond', 'resma', 'clip', 'grapadora', 'perforador', 'cinta', 'tinta', 'sello'],
        colegio: ['cuaderno', 'block', 'lapiz', 'lápiz', 'borrador', 'tajador', 'sacapuntas', 'regla', 'pegamento', 'goma', 'colores'],
        arte: ['acuarela', 'tempera', 'témpera', 'oleo', 'óleo', 'pincel', 'crayon', 'crayón', 'plumon', 'plumón', 'papel dibujo', 'cartulina'],
        resaltar: ['resaltador', 'highlight', 'marcador fluorescente'],
        dibujar: ['lapiz', 'lápiz', 'plumon', 'plumón', 'marcador', 'crayon', 'crayón', 'block dibujo', 'papel dibujo'],
        pegarTodo: ['pegamento', 'goma', 'cola', 'silicona', 'cinta', 'adhesivo', 'pegante', 'masking', 'cinta de embalaje', 'cinta de papel', 'cinta transparente'],
        embalar: ['cinta de embalaje', 'cinta transparente', 'cinta de empaque', 'caja', 'carton', 'cartón'],
        papel: ['cartulina', 'carton', 'cartón', 'papel lustre', 'papel seda', 'papel crepe', 'papel bond', 'papel fotocopia', 'resma'],
        rotular: ['marcador', 'plumon', 'plumón', 'rotulador', 'etiqueta', 'label'],
        archivar: ['archivador', 'folder', 'carpeta', 'anillado', 'separador', 'broche'],
        enviar: ['sobre', 'envelope', 'bolsa', 'empaque'],
        borrar: ['borrador', 'goma', 'corrector', 'liquid paper'],
        pegarPapel: ['barra de pegamento', 'pegamento en barra', 'cola', 'goma'],
        artes: ['manualidades', 'arte', 'dibujar', 'pintar', 'colorear', 'foamy', 'eva', 'escarcha', 'glitter']
    };

    Object.entries(usageAliases).forEach(([alias, words]) => {
        if (words.some(w => source.includes(w))) tokens.add(alias);
    });

    return Array.from(tokens);
}

// Funcion: tokenize. Describe y encapsula una parte de la logica de la aplicacion.
function tokenize(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

// Funcion: normalizeText. Describe y encapsula una parte de la logica de la aplicacion.
function normalizeText(text) {
    return tokenize(text).join(' ');
}

// Funcion: getTokenCharRanges. Describe y encapsula una parte de la logica de la aplicacion.
function getTokenCharRanges(text) {
    const raw = String(text || '');
    const ranges = [];
    let tokenStart = -1;
    let normalized = '';

    for (let i = 0; i <= raw.length; i++) {
        const char = raw[i] || ' ';
        const normalizedChar = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const isTokenChar = /[a-zA-Z0-9]/.test(normalizedChar);

        if (isTokenChar && tokenStart === -1) tokenStart = i;
        if (!isTokenChar && tokenStart !== -1) {
            const tokenRaw = raw.slice(tokenStart, i);
            const tokenNorm = normalizeText(tokenRaw);
            if (tokenNorm) {
                ranges.push({
                    start: tokenStart,
                    end: i,
                    normStart: normalized.length,
                    normEnd: normalized.length + tokenNorm.length,
                    token: tokenNorm
                });
                normalized += tokenNorm + ' ';
            }
            tokenStart = -1;
        }
    }

    return { raw, ranges };
}

// Funcion: highlightSearchMatches. Describe y encapsula una parte de la logica de la aplicacion.
function highlightSearchMatches(text, query) {
    const source = String(text || '');
    const q = String(query || '').trim();
    if (!q) return escapeHtml(source);

    const queryTokens = getExpandedQueryTokens(q).filter(t => t.length >= 2);
    if (!queryTokens.length) return escapeHtml(source);

    const { raw, ranges } = getTokenCharRanges(source);
    if (!ranges.length) return escapeHtml(source);

    const marks = [];
    ranges.forEach(range => {
        const matched = queryTokens.some(token =>
            range.token === token ||
            range.token.startsWith(token) ||
            token.startsWith(range.token) ||
            (token.length >= 4 && levenshteinDistance(range.token, token) <= 1)
        );
        if (matched) marks.push([range.start, range.end]);
    });

    if (!marks.length) return escapeHtml(source);

    marks.sort((a, b) => a[0] - b[0]);
    const merged = [marks[0]];
    for (let i = 1; i < marks.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = marks[i];
        if (curr[0] <= prev[1]) {
            prev[1] = Math.max(prev[1], curr[1]);
        } else {
            merged.push(curr);
        }
    }

    let result = '';
    let cursor = 0;
    merged.forEach(([start, end]) => {
        if (start > cursor) result += escapeHtml(raw.slice(cursor, start));
        result += `<mark class="search-mark">${escapeHtml(raw.slice(start, end))}</mark>`;
        cursor = end;
    });
    if (cursor < raw.length) result += escapeHtml(raw.slice(cursor));

    return result;
}

// Funcion: getExpandedQueryTokens. Describe y encapsula una parte de la logica de la aplicacion.
function getExpandedQueryTokens(query) {
    const baseTokens = tokenize(query);
    const expanded = new Set(baseTokens);
    const synonymMap = {
        lapicero: ['boligrafo', 'pluma'],
        boligrafo: ['lapicero', 'pluma'],
        plumon: ['marcador', 'resaltador'],
        goma: ['pegamento', 'cola'],
        folder: ['carpeta', 'archivador'],
        cuaderno: ['libreta', 'block'],
        block: ['cuaderno', 'libreta']
    };

    baseTokens.forEach(token => {
        if (token.length > 4 && token.endsWith('es')) expanded.add(token.slice(0, -2));
        if (token.length > 3 && token.endsWith('s')) expanded.add(token.slice(0, -1));
        (synonymMap[token] || []).forEach(alias => expanded.add(alias));
    });

    return Array.from(expanded);
}

// Funcion: levenshteinDistance. Describe y encapsula una parte de la logica de la aplicacion.
function levenshteinDistance(a, b) {
    if (a === b) return 0;
    const m = a.length;
    const n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;

    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[m][n];
}

// Funcion: hasApproxToken. Describe y encapsula una parte de la logica de la aplicacion.
function hasApproxToken(tokens, queryToken) {
    if (!queryToken || queryToken.length < 4) return false;
    const maxDistance = queryToken.length >= 8 ? 2 : 1;
    for (const token of tokens) {
        if (Math.abs(token.length - queryToken.length) > maxDistance) continue;
        if (levenshteinDistance(token, queryToken) <= maxDistance) return true;
    }
    return false;
}

// Funcion: scoreSearchProduct. Describe y encapsula una parte de la logica de la aplicacion.
function scoreSearchProduct(product, query, queryTokens) {
    const qNorm = normalizeText(query);
    if (!qNorm) return 0;

    const title = product.normalizedTitle || normalizeText(product.title || '');
    const blob = product.normalizedSearchBlob || normalizeText(product.title || '');
    const tokenList = Array.isArray(product.searchTokens) ? product.searchTokens : [];
    const tokenSet = new Set(tokenList);

    let score = 0;
    if (title === qNorm) score += 220;
    if (title.startsWith(qNorm)) score += 150;
    if (title.includes(qNorm)) score += 110;
    if (blob.includes(qNorm)) score += 45;

    let tokenHits = 0;
    queryTokens.forEach(token => {
        if (tokenSet.has(token)) {
            tokenHits += 1;
            score += 24;
            return;
        }
        if (tokenList.some(item => item.startsWith(token))) {
            tokenHits += 1;
            score += 15;
            return;
        }
        if (hasApproxToken(tokenList, token)) {
            tokenHits += 1;
            score += 9;
        }
    });

    if (queryTokens.length > 0 && tokenHits === queryTokens.length) score += 34;
    if (queryTokens.length > 1 && title.includes(qNorm)) score += 22;

    return score;
}

// Funcion: getRankedSearchResults. Describe y encapsula una parte de la logica de la aplicacion.
function getRankedSearchResults(list, query) {
    const q = (query || '').trim();
    if (!q) return list;
    const queryTokens = getExpandedQueryTokens(q);

    return list
        .map(product => ({ product, score: scoreSearchProduct(product, q, queryTokens) }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score || a.product.title.localeCompare(b.product.title))
        .map(item => item.product);
}

// Logica del modal de detalle de producto
// Funcion: getProductModalNodes. Describe y encapsula una parte de la logica de la aplicacion.
function getProductModalNodes() {
    if (!productDetailModal) return null;

    const nodes = {
        detailImage: document.getElementById('detailImage'),
        detailTitle: document.getElementById('detailTitle'),
        detailPrice: document.getElementById('detailPrice'),
        detailRating: document.getElementById('detailRating'),
        detailDescription: document.getElementById('detailDescription'),
        detailQty: document.getElementById('detailQty'),
        detailFeatures: document.getElementById('detailFeatures'),
        detailUsage: document.getElementById('detailUsage')
    };
    const hasMissingNode = Object.values(nodes).some(node => !node);
    return hasMissingNode ? null : nodes;
}

// Funcion: initSupportMatrixBackground. Describe y encapsula una parte de la logica de la aplicacion.
function initSupportMatrixBackground() {
    const canvas = document.getElementById('supportMatrixCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glyphs = '01001101011100101010110010101100100101010110010010110010101011';
    let width = 0;
    let height = 0;
    let fontSize = 16;
    let columns = 0;
    let drops = [];
    let rafId = null;

    const resize = () => {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        fontSize = Math.max(14, Math.round(width / 95));
        columns = Math.max(20, Math.floor(width / fontSize));
        drops = Array.from({ length: columns }, () => Math.floor(Math.random() * -45));
        ctx.fillStyle = '#07130f';
        ctx.fillRect(0, 0, width, height);
    };

    const drawFrame = () => {
        ctx.fillStyle = 'rgba(6, 18, 13, 0.08)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;

        for (let i = 0; i < columns; i += 1) {
            const text = glyphs[Math.floor(Math.random() * glyphs.length)];
            const x = i * fontSize;
            const y = drops[i] * fontSize;
            const alpha = 0.22 + Math.random() * 0.24;
            ctx.fillStyle = `rgba(108, 255, 178, ${alpha.toFixed(3)})`;
            ctx.fillText(text, x, y);

            if (y > height + fontSize * 2 && Math.random() > 0.975) {
                drops[i] = Math.floor(Math.random() * -18);
            } else {
                drops[i] += 0.34 + Math.random() * 0.42;
            }
        }

        rafId = window.requestAnimationFrame(drawFrame);
    };

    resize();
    if (!reducedMotion) {
        drawFrame();
    } else {
        for (let i = 0; i < columns; i += 2) {
            const text = glyphs[Math.floor(Math.random() * glyphs.length)];
            const x = i * fontSize;
            const y = (Math.random() * height) | 0;
            ctx.fillStyle = 'rgba(108, 255, 178, 0.18)';
            ctx.fillText(text, x, y);
        }
    }

    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && rafId) {
            window.cancelAnimationFrame(rafId);
            rafId = null;
            return;
        }
        if (!document.hidden && !reducedMotion && !rafId) {
            drawFrame();
        }
    });
}

// Funcion: openProductModal. Describe y encapsula una parte de la logica de la aplicacion.
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return false;

    const modalNodes = getProductModalNodes();
    if (!modalNodes) {
        window.location.href = `catalog.html?search=${encodeURIComponent(product.title || '')}`;
        return false;
    }

    currentDetailId = productId;
    currentDetailQty = 1;

    modalNodes.detailImage.src = sanitizeUrl(product.image);
    modalNodes.detailTitle.innerText = product.title;
    modalNodes.detailPrice.innerText = PRICES_PENDING ? PRICE_LABEL : formatPrice(product.price);
    modalNodes.detailRating.innerHTML = getStars(product.rating);
    modalNodes.detailDescription.innerText = product.longDescription;
    modalNodes.detailQty.innerText = currentDetailQty;
    const detailAddBtn = document.getElementById('detailAddBtn');
    if (detailAddBtn) {
        detailAddBtn.disabled = PRICES_PENDING;
        detailAddBtn.title = PRICES_PENDING ? 'Precios próximamente' : '';
    }
    const detailWhatsAppBtn = document.getElementById('detailWhatsAppBtn');
    if (detailWhatsAppBtn) {
        detailWhatsAppBtn.disabled = false;
        detailWhatsAppBtn.title = '';
    }

    // Features
    const featureList = modalNodes.detailFeatures;
    featureList.innerHTML = '';
    if (product.features && product.features.length > 0) {
        product.features.forEach(f => {
            const li = document.createElement('li');
            li.innerText = f;
            featureList.appendChild(li);
        });
    } else {
        featureList.innerHTML = '<li>Sin información adicional.</li>';
    }

    // Usage
    const usageList = modalNodes.detailUsage;
    usageList.innerHTML = '';
    if (product.usage && product.usage.length > 0) {
        product.usage.forEach(u => {
            const li = document.createElement('li');
            li.innerText = u;
            usageList.appendChild(li);
        });
    } else {
        usageList.innerHTML = '<li>Sin información de uso.</li>';
    }

    productDetailModal.style.display = 'block';
    return true;
}

// Funcion: closeProductModal. Describe y encapsula una parte de la logica de la aplicacion.
function closeProductModal() {
    if (!productDetailModal) return;
    productDetailModal.style.display = 'none';
}

// Funcion: adjustDetailQty. Describe y encapsula una parte de la logica de la aplicacion.
function adjustDetailQty(change) {
    currentDetailQty += change;
    if (currentDetailQty < 1) currentDetailQty = 1;
    const detailQtyNode = document.getElementById('detailQty');
    if (detailQtyNode) detailQtyNode.innerText = currentDetailQty;
}

// Funcion: addToCartFromDetail. Describe y encapsula una parte de la logica de la aplicacion.
function addToCartFromDetail() {
    if (PRICES_PENDING) {
        showToast('Precios próximamente', 'error');
        return;
    }
    if (!currentDetailId) return;
    const product = addProductToCart(currentDetailId, currentDetailQty);
    if (!product) return;

    saveCart();
    updateCartCount();
    animateCartCount();
    trackEvent('add_to_cart', { source: 'modal', product_id: product.id });
    closeProductModal();
    openCart(); // Optional: show cart after adding
}


// Funcion: buildProductInquiryMessage. Describe y encapsula una parte de la logica de la aplicacion.
function buildProductInquiryMessage(product, quantity, source) {
    const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
    const categoryLabel = CATEGORY_LABELS[product.category] || 'Cat?logo';

    let message = 'Hola LIBRERIA BELEN, deseo consultar este producto:\n\n';
    message += `Producto: ${product.title}\n`;
    message += `Cantidad: ${safeQty}\n`;
    message += `Categoría: ${categoryLabel}\n`;
    message += `Origen: ${source}\n`;
    message += '\n?Podr?an confirmar stock y tiempo de entrega?';
    return message;
}

// Funcion: openProductWhatsApp. Describe y encapsula una parte de la logica de la aplicacion.
function openProductWhatsApp(productId, quantity = 1, source = 'catalog_card') {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const message = buildProductInquiryMessage(product, quantity, source);
    const url = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
    trackEvent('product_whatsapp_click', {
        source,
        product_id: product.id,
        quantity: Number.isFinite(quantity) ? quantity : 1
    });
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Funcion: contactViaProductWhatsAppFromDetail. Describe y encapsula una parte de la logica de la aplicacion.
function contactViaProductWhatsAppFromDetail() {
    if (!currentDetailId) return;
    openProductWhatsApp(currentDetailId, currentDetailQty, 'product_modal');
}


// Logica de busqueda
// Funcion: handleSearchInput. Describe y encapsula una parte de la logica de la aplicacion.
function handleSearchInput(query, showDropdown = true, immediate = false) {
    currentSearchQuery = query;

    if (products.length === 0) {
        ensureProductsLoaded()
            .then(() => handleSearchInput(query, showDropdown, immediate))
            .catch(() => {
                const searchResults = document.getElementById('searchResults');
                if (!searchResults || !showDropdown) return;
                searchResults.innerHTML = '<div class="search-empty">No se pudo cargar el buscador</div>';
                searchResults.classList.add('active');
            });
        return;
    }

    const runSearch = () => {
        const filtered = filterBySearch(products, query);

        if (productGrid) {
            currentPage = 1;
            applyFilters();
        }

        if (showDropdown) {
            renderSearchDropdown(query, filtered);
        }
    };

    if (immediate) {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        runSearch();
        return;
    }

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
}

// Funcion: executeSearch. Describe y encapsula una parte de la logica de la aplicacion.
function executeSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const query = input.value.trim();
    addSearchHistory(query);
    if (query) {
        trackEvent('search_execute', {
            query_length: query.length,
            path: window.location.pathname
        });
    }
    window.location.href = `catalog.html?search=${encodeURIComponent(query)}`;
}

// ... Resto (carrusel, paginacion y carrito estandar) ...

// Funcion: renderFeaturedCarousel. Describe y encapsula una parte de la logica de la aplicacion.
function renderFeaturedCarousel() {
    if (!featuredCarousel || products.length === 0) return;
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const featured = shuffled.slice(0, 8);

    featuredCarousel.innerHTML = '';
    const fragment = document.createDocumentFragment();
    featured.forEach((product, index) => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = getProductCardHtml(product, index);
        fragment.appendChild(card);
    });
    featuredCarousel.appendChild(fragment);
}

// Funcion: scrollCarousel. Describe y encapsula una parte de la logica de la aplicacion.
function scrollCarousel(direction) {
    if (!featuredCarousel) return;
    const cardWidth = 250 + 32;
    if (direction === 1 && Math.ceil(featuredCarousel.scrollLeft + featuredCarousel.clientWidth) >= featuredCarousel.scrollWidth) {
        featuredCarousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
        featuredCarousel.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    }
}

// Funcion: startCarouselAutoScroll. Describe y encapsula una parte de la logica de la aplicacion.
function startCarouselAutoScroll() {
    if (!featuredCarousel) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (autoScrollInterval) clearInterval(autoScrollInterval);
    const tick = () => {
        if (document.hidden) return;
        scrollCarousel(1);
    };
    const restart = () => {
        clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(tick, 3000);
    };
    restart();
    featuredCarousel.parentElement.addEventListener('mouseenter', () => { clearInterval(autoScrollInterval); });
    featuredCarousel.parentElement.addEventListener('mouseleave', restart);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearInterval(autoScrollInterval);
        else restart();
    });
}

// Funcion: renderProducts. Describe y encapsula una parte de la logica de la aplicacion.
function renderProducts(productsToRender) {
    if (!productGrid) return;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProducts = productsToRender.slice(startIndex, endIndex);

    productGrid.innerHTML = '';

    if (paginatedProducts.length === 0) {
        productGrid.innerHTML = '<p class="no-results" style="grid-column:1/-1; text-align:center; padding: 2rem;">No se encontraron productos.</p>';
        renderPagination(0);
        return;
    }

    paginatedProducts.forEach((product, index) => {
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = getProductCardHtml(product, index);
        productGrid.appendChild(card);
    });

    renderPagination(productsToRender.length);
}

// Funcion: renderPagination. Describe y encapsula una parte de la logica de la aplicacion.
function renderPagination(totalItems) {
    if (!paginationContainer) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    paginationContainer.innerHTML = '';
    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationContainer.appendChild(prevBtn);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) { startPage = Math.max(1, endPage - 4); }

    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => changePage(i);
        paginationContainer.appendChild(btn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
}

// Funcion: changePage. Describe y encapsula una parte de la logica de la aplicacion.
function changePage(newPage) {
    currentPage = newPage;
    renderProducts(sortProducts(currentProducts, currentSort));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funcion: initSortSelect. Describe y encapsula una parte de la logica de la aplicacion.
function initSortSelect() {
    const select = document.getElementById('sortSelect');
    if (!select) return;
    select.value = currentSort;
    select.addEventListener('change', () => {
        currentSort = select.value;
        renderProducts(sortProducts(currentProducts, currentSort));
    });
}

// Funcion: sortProducts. Describe y encapsula una parte de la logica de la aplicacion.
function sortProducts(list, sortKey) {
    const items = [...list];
    if (sortKey === 'price-asc') return items.sort((a, b) => a.price - b.price);
    if (sortKey === 'price-desc') return items.sort((a, b) => b.price - a.price);
    if (sortKey === 'name-asc') return items.sort((a, b) => a.title.localeCompare(b.title));
    if (sortKey === 'name-desc') return items.sort((a, b) => b.title.localeCompare(a.title));
    return items;
}

// Funcion: getStars. Describe y encapsula una parte de la logica de la aplicacion.
function getStars(rating) {
    const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
    const clamped = Math.max(0, Math.min(5, safeRating));
    const fullStars = Math.floor(clamped);
    const halfStar = clamped % 1 >= 0.5;
    let starsHtml = '';
    for (let i = 0; i < fullStars; i++) starsHtml += '<i class="fas fa-star"></i>';
    if (halfStar) starsHtml += '<i class="fas fa-star-half-alt"></i>';
    return starsHtml;
}

// Funcion: renderCategories. Describe y encapsula una parte de la logica de la aplicacion.
function renderCategories() {
    if (!categoryFilterContainer) return;
    const counts = products.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
    }, {});

    const subCounts = products.reduce((acc, p) => {
        if (!acc[p.category]) acc[p.category] = {};
        acc[p.category][p.subcategory] = (acc[p.category][p.subcategory] || 0) + 1;
        return acc;
    }, {});

    const ordered = Object.keys(CATEGORY_LABELS).filter(key => counts[key]);
    const categories = ['all', ...ordered];
    let html = '<h4>Categorías</h4>';

    categories.forEach(cat => {
        const label = cat === 'all' ? 'Ver Todo' : (CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1));
        const count = cat === 'all' ? products.length : (counts[cat] || 0);
        const subMap = subCounts[cat] || {};
        const subList = (SUBCATEGORY_PATTERNS[cat] || []).filter(item => subMap[item.key]);
        const hasSub = cat !== 'all' && subList.length > 0;
        const safeLabel = escapeHtml(label);

        html += `<div class="filter-accordion ${hasSub ? '' : 'no-sub'}" data-category="${cat}">`;
        html += `
            <label class="filter-item filter-item-main">
                <span>
                    <input type="radio" name="category" value="${cat}" ${cat === 'all' ? 'checked' : ''} onchange="filterProducts('${cat}')">
                    ${safeLabel}
                </span>
                <span class="filter-actions">
                    <span class="filter-count">${count}</span>
                    ${hasSub ? `<button type="button" class="filter-toggle" onclick="toggleSubcategory('${cat}')"><i class="fas fa-chevron-down"></i></button>` : ''}
                </span>
            </label>
        `;

        if (hasSub) {
            html += `<div class="subcategory-list" id="subcat-${cat}">`;
            subList.forEach(item => {
                const subCount = subMap[item.key] || 0;
                const safeSubLabel = escapeHtml(item.label);
                html += `
                    <button type="button" class="subcategory-chip" onclick="filterBySubcategory('${cat}','${item.key}')">
                        <span>${safeSubLabel}</span>
                        <span class="filter-count">${subCount}</span>
                    </button>
                `;
            });
            html += `</div>`;
        }

        html += `</div>`;
    });
    categoryFilterContainer.innerHTML = html;
}

// Funcion: renderBrandFilters. Describe y encapsula una parte de la logica de la aplicacion.
function renderBrandFilters() {
    const container = document.getElementById('brandFilters');
    if (!container) return;
    const counts = products.reduce((acc, p) => {
        const key = p.brand || 'Otros';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const brands = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    let html = `
        <label class="filter-item">
            <span>
                <input type="radio" name="brand" value="all" ${currentBrand === 'all' ? 'checked' : ''} onchange="filterByBrand('all')">
                Todas
            </span>
            <span class="filter-count">${products.length}</span>
        </label>
    `;

    brands.forEach(brand => {
        const safeBrand = escapeHtml(brand);
        const safeBrandValue = escapeAttr(brand);
        const safeBrandJs = escapeJsString(brand);
        html += `
            <label class="filter-item">
                <span>
                    <input type="radio" name="brand" value="${safeBrandValue}" ${currentBrand === brand ? 'checked' : ''} onchange="filterByBrand('${safeBrandJs}')">
                    ${safeBrand}
                </span>
                <span class="filter-count">${counts[brand]}</span>
            </label>
        `;
    });

    container.innerHTML = html;
}

// Funcion: applyFilters. Describe y encapsula una parte de la logica de la aplicacion.
function applyFilters() {
    let list = products;

    if (currentSearchQuery.trim()) {
        list = filterBySearch(list, currentSearchQuery);
    }

    if (currentCategory !== 'all') {
        list = list.filter(p => p.category === currentCategory);
    }

    if (currentSubcategory !== 'all') {
        list = list.filter(p => p.subcategory === currentSubcategory);
    }

    if (currentBrand !== 'all') {
        list = list.filter(p => (p.brand || '').toLowerCase() === currentBrand.toLowerCase());
    }

    if (Number.isFinite(currentMaxPrice)) {
        list = list.filter(p => p.price <= currentMaxPrice);
    }

    currentProducts = list;
    renderProducts(sortProducts(currentProducts, currentSort));
    updateCatalogInsights();
}

// Funcion: filterBySearch. Describe y encapsula una parte de la logica de la aplicacion.
function filterBySearch(list, query) {
    return getRankedSearchResults(list, query);
}

// Funcion: filterProducts. Describe y encapsula una parte de la logica de la aplicacion.
function filterProducts(category) {
    currentPage = 1;
    currentCategory = category;
    currentSubcategory = 'all';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    currentSearchQuery = '';
    applyFilters();
    if (window.innerWidth < 768) closeSidebar();
}

// Funcion: filterBySubcategory. Describe y encapsula una parte de la logica de la aplicacion.
function filterBySubcategory(category, subcategory) {
    currentPage = 1;
    currentCategory = category;
    currentSubcategory = subcategory;
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    const radio = document.querySelector(`input[name="category"][value="${category}"]`);
    if (radio) radio.checked = true;
    currentSearchQuery = '';
    applyFilters();
    if (window.innerWidth < 768) closeSidebar();
}

// Funcion: toggleSubcategory. Describe y encapsula una parte de la logica de la aplicacion.
function toggleSubcategory(category) {
    const container = document.querySelector(`.filter-accordion[data-category="${category}"]`);
    if (!container) return;
    container.classList.toggle('open');
}

// Funcion: filterByPrice. Describe y encapsula una parte de la logica de la aplicacion.
function filterByPrice(maxPrice) {
    if (PRICES_PENDING) return;
    currentPage = 1;
    const safeMaxPrice = Number(maxPrice);
    const priceDisplay = document.getElementById('priceValue');
    if (priceDisplay) priceDisplay.innerText = formatPrice(safeMaxPrice);
    currentMaxPrice = safeMaxPrice;
    applyFilters();
}

// Funcion: filterByBrand. Describe y encapsula una parte de la logica de la aplicacion.
function filterByBrand(brand) {
    currentPage = 1;
    currentBrand = brand;
    applyFilters();
}

// Funcion: setSidebarState. Describe y encapsula una parte de la logica de la aplicacion.
function setSidebarState(isOpen) {
    if (!sidebar) return;
    const open = Boolean(isOpen);
    sidebar.classList.toggle('open', open);
    document.body.classList.toggle('sidebar-open', open);
}

// Funcion: closeSidebar. Describe y encapsula una parte de la logica de la aplicacion.
function closeSidebar() {
    setSidebarState(false);
}

// Funcion: toggleSidebar. Describe y encapsula una parte de la logica de la aplicacion.
function toggleSidebar() {
    if (!sidebar) return;
    setSidebarState(!sidebar.classList.contains('open'));
}
// Funcion: removeFromCart. Describe y encapsula una parte de la logica de la aplicacion.
function removeFromCart(productId) { cart = cart.filter(item => item.id !== productId); saveCart(); renderCart(); updateCartCount(); }
// Funcion: clearCart. Describe y encapsula una parte de la logica de la aplicacion.
function clearCart() {
    if (!Array.isArray(cart) || cart.length === 0) return;
    const confirmed = window.confirm('?Deseas eliminar toda la lista del carrito?');
    if (!confirmed) return;
    cart = [];
    saveCart();
    renderCart();
    updateCartCount();
}
// Funcion: updateQuantity. Describe y encapsula una parte de la logica de la aplicacion.
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) { removeFromCart(productId); } else { saveCart(); renderCart(); updateCartCount(); }
    }
}
// Funcion: saveCart. Describe y encapsula una parte de la logica de la aplicacion.
function saveCart() { localStorage.setItem('libreriaBelenCart', JSON.stringify(cart)); }
// Funcion: updateCartCount. Describe y encapsula una parte de la logica de la aplicacion.
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.forEach(el => {
        el.innerText = totalItems;
        el.classList.toggle('is-empty', totalItems === 0);
    });
}
// Funcion: openCart. Describe y encapsula una parte de la logica de la aplicacion.
function openCart() {
    if (!cartModal) {
        if (!document.getElementById('cartItems')) {
            // If on homepage without modal, go to catalog
            window.location.href = 'catalog.html';
            return;
        }
    }
    renderCart();
    if (cartModal) {
        cartModal.style.display = 'grid';
        cartModal.setAttribute('aria-hidden', 'false');
        syncMobileOverlayState();
    }
}

// Funcion: closeCart. Describe y encapsula una parte de la logica de la aplicacion.
function closeCart() {
    if (!cartModal) return;
    cartModal.style.display = 'none';
    cartModal.setAttribute('aria-hidden', 'true');
    syncMobileOverlayState();
}
// Funcion: renderCart. Describe y encapsula una parte de la logica de la aplicacion.
function renderCart() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    const subtitle = document.getElementById('cartSubtitle');
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML =
            '<div class="cart-empty-state">' +
            '    <i class="fas fa-shopping-basket" aria-hidden="true"></i>' +
            '    <h3>Tu carrito está vacío.</h3>' +
            '    <p>Agrega productos y aparecerán aquí automáticamente.</p>' +
            '</div>';
    } else {
        const fragment = document.createDocumentFragment();

        cart.forEach(item => {
            const safeQty = Math.max(1, Math.floor(Number(item.quantity) || 1));
            const itemTotal = item.price * safeQty;
            total += itemTotal;

            const cartItem = document.createElement('article');
            cartItem.className = 'cart-item';
            const safeTitle = escapeHtml(item.title);
            const safeImage = escapeAttr(sanitizeUrl(item.image));
            const priceLabel = PRICES_PENDING ? PRICE_LABEL : formatPrice(item.price);
            const subtotalLabel = PRICES_PENDING ? PRICE_LABEL : formatPrice(itemTotal);

            cartItem.innerHTML =
                '<div class="cart-item-media">' +
                '    <img src="' + safeImage + '" alt="' + safeTitle + '">' +
                '</div>' +
                '<div class="cart-item-main">' +
                '    <h4 class="cart-item-title">' + safeTitle + '</h4>' +
                '    <div class="cart-item-meta">' +
                '        <span class="cart-item-price">' + priceLabel + '</span>' +
                '        <span class="cart-item-subtotal">' + subtotalLabel + '</span>' +
                '    </div>' +
                '</div>' +
                '<div class="cart-item-controls">' +
                '    <button type="button" onclick="updateQuantity(' + item.id + ', -1)" class="btn-qty" aria-label="Restar cantidad">-</button>' +
                '    <span class="cart-item-qty">' + safeQty + '</span>' +
                '    <button type="button" onclick="updateQuantity(' + item.id + ', 1)" class="btn-qty" aria-label="Sumar cantidad">+</button>' +
                '    <button type="button" onclick="removeFromCart(' + item.id + ')" class="cart-item-remove" title="Eliminar" aria-label="Eliminar producto"><i class="fas fa-trash"></i></button>' +
                '</div>';

            fragment.appendChild(cartItem);
        });

        cartItemsContainer.appendChild(fragment);
    }

    if (subtitle) {
        const count = cart.reduce((sum, item) => sum + Math.max(1, Math.floor(Number(item.quantity) || 1)), 0);
        subtitle.textContent = count + ' producto' + (count === 1 ? '' : 's');
    }

    const checkoutBtn = document.getElementById('checkoutBtn');
    const clearBtn = document.getElementById('clearCartBtn');
    const invoiceBtn = document.getElementById('invoiceBtn');
    if (cartTotalElement) {
        cartTotalElement.innerText = PRICES_PENDING ? PRICE_LABEL : formatPrice(total);
    }
    if (clearBtn) clearBtn.disabled = cart.length === 0;
    if (checkoutBtn) checkoutBtn.disabled = PRICES_PENDING;
    if (invoiceBtn) invoiceBtn.disabled = PRICES_PENDING;
}

// Funcion: getCustomerData. Describe y encapsula una parte de la logica de la aplicacion.
function getCustomerData() {
    const nameInput = document.getElementById('customerName');
    const lastNameInput = document.getElementById('customerLastName');
    const dniInput = document.getElementById('customerDni');
    const consentInput = document.getElementById('consentWhatsapp');

    // Only check if elements exist (modal might be open)
    if (!nameInput || !lastNameInput || !dniInput) return null;

    const name = nameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const dni = dniInput.value.trim();

    if (!name || !lastName || !dni) {
        alert('Por favor, completa todos los campos (Nombres, Apellidos y DNI).');
        return null;
    }

    if (!/^\d{8}$/.test(dni)) {
        alert('El DNI debe tener exactamente 8 digitos numericos.');
        return null;
    }

    if (consentInput && !consentInput.checked) {
        alert('Debes aceptar el envío de datos por WhatsApp para continuar.');
        return null;
    }

    return { name, lastName, dni };
}

// Funcion: checkout. Describe y encapsula una parte de la logica de la aplicacion.
function checkout() {
    if (cart.length === 0) {
        alert('Tu carrito está vacío.');
        return;
    }

    if (PRICES_PENDING) {
        alert('Los precios están por definirse. Pronto podrás comprar.');
        return;
    }

    const customer = getCustomerData();
    if (!customer) return;

    let message = "Hola *LIBRERÍA BELEN*, deseo realizar el siguiente pedido:\n\n";

    // Add Client Info
    message += `*Cliente:* ${customer.name} ${customer.lastName}\n`;
    message += `*DNI:* ${customer.dni}\n\n`;

    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `- *${item.quantity}x* ${item.title} (S/ ${itemTotal.toFixed(2)})\n`;
    });

    message += `\n*Total a Pagar: S/ ${total.toFixed(2)}*`;
    message += "\n\n¿Cuáles son los métodos de pago disponibles y el tiempo de entrega?";

    const url = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;

    trackEvent('checkout_whatsapp', { items: cart.length, total });
    window.open(url, '_blank', 'noopener,noreferrer');
}

// Funcion: ensureJsPdfLoaded. Describe y encapsula una parte de la logica de la aplicacion.
function ensureJsPdfLoaded() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfLoadPromise) return jsPdfLoadPromise;

    jsPdfLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${JSPDF_SCRIPT_PATH}"]`);

        const resolveIfReady = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                resolve(window.jspdf.jsPDF);
                return true;
            }
            return false;
        };

        if (existing) {
            if (resolveIfReady()) return;
            existing.addEventListener('load', () => {
                if (resolveIfReady()) return;
                reject(new Error('jsPDF no se cargo correctamente.'));
            }, { once: true });
            existing.addEventListener('error', () => reject(new Error('No se pudo cargar jsPDF.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = JSPDF_SCRIPT_PATH;
        script.defer = true;
        script.onload = () => {
            if (resolveIfReady()) return;
            reject(new Error('jsPDF no esta disponible tras la carga.'));
        };
        script.onerror = () => reject(new Error('No se pudo cargar jsPDF.'));
        document.head.appendChild(script);
    }).finally(() => {
        jsPdfLoadPromise = null;
    });

    return jsPdfLoadPromise;
}

// Funcion: generateInvoice. Describe y encapsula una parte de la logica de la aplicacion.
async function generateInvoice() {
    if (cart.length === 0) {
        alert('El carrito está vacío. Agrega productos para generar una boleta.');
        return;
    }

    if (PRICES_PENDING) {
        alert('Los precios están por definirse. La boleta estará disponible próximamente.');
        return;
    }

    const customer = getCustomerData();
    if (!customer) return;

    const jsPdfApi = await ensureJsPdfLoaded().catch(() => null);
    if (!jsPdfApi) {
        alert('No se pudo generar la boleta porque la libreria PDF no esta disponible.');
        return;
    }

    const jsPDF = jsPdfApi;
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(44, 62, 80); // Dark Blue
    doc.text("LIBRERÍA BELEN", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text("Suministros de Oficina y Escolares", 105, 28, null, null, "center");
    doc.text("RUC: 10123456789", 105, 34, null, null, "center");

    doc.setDrawColor(200);
    doc.line(20, 40, 190, 40);

    // Info
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text(`Fecha: ${date} ${time}`, 20, 50);
    doc.text(`Cliente: ${customer.name} ${customer.lastName}`, 20, 56);
    doc.text(`DNI: ${customer.dni}`, 20, 62);

    // Table Header
    let y = 74;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text("Descripción", 20, y);
    doc.text("Cant.", 130, y, null, null, "right");
    doc.text("P. Unit", 160, y, null, null, "right");
    doc.text("Total", 190, y, null, null, "right");

    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    // Items
    doc.setFont(undefined, 'normal');
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;

        let title = item.title;
        if (title.length > 50) title = title.substring(0, 50) + "...";

        doc.text(title, 20, y);
        doc.text(item.quantity.toString(), 130, y, null, null, "right");
        doc.text(`S/ ${item.price.toFixed(2)}`, 160, y, null, null, "right");
        doc.text(`S/ ${itemTotal.toFixed(2)}`, 190, y, null, null, "right");
        y += 8;
    });

    // Total
    doc.line(20, y, 190, y);
    y += 10;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL A PAGAR: S/ ${total.toFixed(2)}`, 190, y, null, null, "right");

    // Footer
    doc.setFontSize(10);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(100);
    doc.text("¡Gracias por su compra!", 105, y + 20, null, null, "center");
    doc.text("Contacto: +51 947 872 207", 105, y + 26, null, null, "center");

    doc.save(`Boleta_${customer.name}_${customer.lastName}_${Date.now()}.pdf`);
}

// Funcion: initSupportRequestForm. Describe y encapsula una parte de la logica de la aplicacion.
function initSupportRequestForm() {
    const form = document.getElementById('supportForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();

        const getValue = (id) => {
            const node = document.getElementById(id);
            return node ? node.value.trim() : '';
        };

        const serviceType = getValue('supportServiceType');
        const deviceType = getValue('supportDeviceType');
        const brandModel = getValue('supportBrandModel');
        const issueDetail = getValue('supportIssueDetail');
        const urgency = getValue('supportUrgency');
        const budget = getValue('supportBudget');
        const customerName = getValue('supportCustomerName');
        const customerPhone = getValue('supportCustomerPhone');
        const district = getValue('supportDistrict');
        const availableTime = getValue('supportAvailableTime');
        const consentNode = document.getElementById('supportConsent');

        if (!serviceType || !deviceType || !brandModel || !issueDetail || !urgency || !customerName || !customerPhone) {
            alert('Por favor, completa todos los campos obligatorios del formulario técnico.');
            return;
        }

        const normalizedPhone = customerPhone.replace(/\D/g, '');
        if (normalizedPhone.length < 9) {
            alert('Ingresa un número de contacto válido (mínimo 9 dígitos).');
            return;
        }

        if (consentNode && !consentNode.checked) {
            alert('Debes autorizar el contacto por WhatsApp para continuar.');
            return;
        }

        let message = 'Hola LIBRERÍA BELÉN, deseo solicitar SOPORTE TÉCNICO para PC:\n\n';
        message += `Servicio: ${serviceType}\n`;
        message += `Tipo de equipo: ${deviceType}\n`;
        message += `Marca/Modelo: ${brandModel}\n`;
        message += `Falla o requerimiento: ${issueDetail}\n`;
        message += `Urgencia: ${urgency}\n`;
        message += `Presupuesto estimado: ${budget || 'Por definir'}\n\n`;
        message += `Cliente: ${customerName}\n`;
        message += `Teléfono: ${customerPhone}\n`;
        if (district) message += `Distrito/Zona: ${district}\n`;
        if (availableTime) message += `Horario disponible: ${availableTime}\n`;
        message += '\nQuedo atento(a) a su evaluación y propuesta técnica.';

        trackEvent('support_request_submit', {
            service_type: serviceType,
            device_type: deviceType,
            urgency,
            has_budget: Boolean(budget),
            path: window.location.pathname
        });

        const url = `https://wa.me/${WHATSAPP_PHONE_NUMBER}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    });
}

// Logica del menu movil
// Funcion: syncMobileOverlayState. Describe y encapsula una parte de la logica de la aplicacion.
function syncMobileOverlayState() {
    const navLinks = document.querySelector('.nav-links');
    const navOpen = Boolean(navLinks && navLinks.classList.contains('mobile-active'));
    const cartOpen = Boolean(cartModal && cartModal.style.display && cartModal.style.display !== 'none');
    document.body.classList.toggle('mobile-menu-open', navOpen || cartOpen);
    document.body.classList.toggle('cart-open', cartOpen);
}

// Funcion: setMobileMenuState. Describe y encapsula una parte de la logica de la aplicacion.
function setMobileMenuState(isOpen) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    const open = Boolean(isOpen);
    navLinks.classList.toggle('mobile-active', open);
    syncMobileOverlayState();
}

// Funcion: closeMobileMenu. Describe y encapsula una parte de la logica de la aplicacion.
function closeMobileMenu() {
    setMobileMenuState(false);
}

// Funcion: toggleMobileMenu. Describe y encapsula una parte de la logica de la aplicacion.
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    setMobileMenuState(!navLinks.classList.contains('mobile-active'));
}

// Cierra el menu movil al hacer clic en un enlace
document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
        closeMobileMenu();
    });
});

document.addEventListener('click', (event) => {
    if (window.innerWidth > 768) return;
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || !navLinks.classList.contains('mobile-active')) return;

    const target = event.target;
    const clickedInsideMenu = target.closest('.nav-links');
    const clickedMenuButton = target.closest('.mobile-menu-btn');
    if (!clickedInsideMenu && !clickedMenuButton) closeMobileMenu();
});

document.addEventListener('click', (event) => {
    if (window.innerWidth > 768) return;
    if (!sidebar || !sidebar.classList.contains('open')) return;

    const target = event.target;
    const clickedInsideSidebar = target.closest('#sidebar');
    const clickedSidebarButton = target.closest('#mobile-filter-toggle') || target.closest('.sidebar-header button');
    if (!clickedInsideSidebar && !clickedSidebarButton) closeSidebar();
});

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        closeMobileMenu();
        closeSidebar();
    }
});

// Funcion: initAccessibilityEnhancements. Describe y encapsula una parte de la logica de la aplicacion.
function initAccessibilityEnhancements() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        const navLinks = document.querySelector('.nav-links');
        if (navLinks) closeMobileMenu();

        const searchResults = document.getElementById('searchResults');
        if (searchResults) searchResults.classList.remove('active');

        if (cartModal && cartModal.style.display && cartModal.style.display !== 'none') closeCart();
        if (productDetailModal && productDetailModal.style.display === 'block') closeProductModal();
        if (entryAnnouncementModal && entryAnnouncementModal.style.display && entryAnnouncementModal.style.display !== 'none') closeEntryAnnouncementModal();
        if (sidebar && sidebar.classList.contains('open')) closeSidebar();
    });
}

// Funcion: initDynamicYear. Describe y encapsula una parte de la logica de la aplicacion.
function initDynamicYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll('[data-current-year]').forEach(el => {
        el.textContent = year;
    });
}

// Funcion: initVisualMicroInteractions. Describe y encapsula una parte de la logica de la aplicacion.
function initVisualMicroInteractions() {
    const targets = document.querySelectorAll(
        '.home-hero, .conversion-strip, .support-tech-section, .jobs-divider-section, .jobs-section, .support-page-hero, .support-page-layout, .trust-badges, .trust-metrics, .carousel-container, .location-section, .about-content, .product-grid, .footer-content'
    );

    if (!targets.length) return;
    targets.forEach(el => el.classList.add('reveal-on-scroll'));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion || !('IntersectionObserver' in window)) {
        targets.forEach(el => el.classList.add('is-visible'));
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.01, rootMargin: '0px 0px 0px 0px' });

    targets.forEach(el => observer.observe(el));
}



// ========== FUNCIONES PREMIUM ==========

// Notificaciones tipo toast
// Funcion: showToast. Describe y encapsula una parte de la logica de la aplicacion.
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const safeMessage = escapeHtml(message);
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} toast-icon"></i>
        <span class="toast-message">${safeMessage}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Funcion: createToastContainer. Describe y encapsula una parte de la logica de la aplicacion.
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Sistema de favoritos
// Funcion: toggleFavorite. Describe y encapsula una parte de la logica de la aplicacion.
function toggleFavorite(productId) {
    const index = favorites.indexOf(productId);

    if (index > -1) {
        favorites.splice(index, 1);
        showToast('Producto eliminado de favoritos', 'error');
    } else {
        favorites.push(productId);
        showToast('¡Producto añadido a favoritos!', 'success');
    }

    localStorage.setItem('libreriaBelenFavorites', JSON.stringify(favorites));
    updateFavoriteButtons();
}

// Funcion: updateFavoriteButtons. Describe y encapsula una parte de la logica de la aplicacion.
function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const productId = parseInt(btn.dataset.productId);
        if (favorites.includes(productId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Funcion: isFavorite. Describe y encapsula una parte de la logica de la aplicacion.
function isFavorite(productId) {
    return favorites.includes(productId);
}

// Boton volver arriba
// Funcion: initBackToTop. Describe y encapsula una parte de la logica de la aplicacion.
function initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
}

// Obtiene la etiqueta visual de producto
// Funcion: getProductBadge. Describe y encapsula una parte de la logica de la aplicacion.
function getProductBadge(index) {
    if (index < 3) return '<span class="product-badge new">Nuevo</span>';
    if (index % 5 === 0) return '<span class="product-badge sale">Oferta</span>';
    if (index % 7 === 0) return '<span class="product-badge popular">Popular</span>';
    return '';
}

// Funcion: addProductToCart. Describe y encapsula una parte de la logica de la aplicacion.
function addProductToCart(productId, quantity = 1) {
    const product = products.find(p => p.id === productId);
    if (!product) return null;

    const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += safeQuantity;
    } else {
        cart.push({ ...product, quantity: safeQuantity });
    }
    return product;
}

// Agregar al carrito con notificacion toast
// Funcion: addToCart. Describe y encapsula una parte de la logica de la aplicacion.
function addToCart(productId) {
    if (PRICES_PENDING) {
        showToast('Precios próximamente', 'error');
        return;
    }
    const product = addProductToCart(productId, 1);
    if (!product) return;

    saveCart();
    updateCartCount();
    animateCartCount();
    trackEvent('add_to_cart', { source: 'catalog', product_id: product.id });
    showToast(`${product.title} añadido al carrito`, 'success');
}

// Funcion: getProductCardHtml. Describe y encapsula una parte de la logica de la aplicacion.
function getProductCardHtml(product, index) {
    const badge = getProductBadge(index);
    const favoriteActive = isFavorite(product.id) ? 'active' : '';
    const safeTitle = escapeHtml(product.title);
    const safeCategory = escapeHtml(CATEGORY_LABELS[product.category] || product.category);
    const safeBrand = escapeHtml(product.brand || 'Marca variada');
    const safeImage = escapeAttr(sanitizeUrl(product.image));
    const cartDisabled = PRICES_PENDING ? 'disabled aria-disabled="true" title="Precios próximamente"' : '';

    return `
        ${badge}
        <button class="favorite-btn ${favoriteActive}" data-product-id="${product.id}" onclick="event.stopPropagation(); toggleFavorite(${product.id})">
            <i class="fas fa-heart"></i>
        </button>
        <div class="product-image" onclick="openProductModal(${product.id})" style="cursor:pointer">
            <img src="${safeImage}" alt="${safeTitle}" loading="lazy" decoding="async" data-fallback-src="https://via.placeholder.com/300?text=No+Image">
        </div>
        <div class="product-info">
            <div class="product-meta">
                <span class="product-brand">${safeBrand}</span>
                <span class="product-category">${safeCategory}</span>
            </div>
            <h3 class="product-title" onclick="openProductModal(${product.id})" style="cursor:pointer">${safeTitle}</h3>
            <div class="product-rating-inline">${getStars(product.rating || 4.5)}<small> Calificado</small></div>
            <div class="product-price">${PRICES_PENDING ? PRICE_LABEL : formatPrice(product.price)}</div>
            <div class="product-actions">
                <button class="btn-cart" ${cartDisabled} onclick="addToCart(${product.id})">
                    <i class="fas fa-cart-plus"></i>
                </button>
                <button class="btn-buy" onclick="openProductModal(${product.id})">
                    Ver detalle
                </button>
                <button class="btn-whatsapp-product" onclick="openProductWhatsApp(${product.id}, 1, 'catalog_card')">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
            </div>
        </div>
    `;
}

// Funcion: renderCatalogSkeleton. Describe y encapsula una parte de la logica de la aplicacion.
function renderCatalogSkeleton(count = 8) {
    if (!productGrid) return;
    const items = Array.from({ length: count }).map(() => `
        <article class="product-card product-card-skeleton" aria-hidden="true">
            <div class="product-image skeleton"></div>
            <div class="product-info">
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line medium"></div>
                <div class="skeleton skeleton-line short"></div>
            </div>
        </article>
    `).join('');
    productGrid.innerHTML = items;
}

// Funcion: renderFeaturedSkeleton. Describe y encapsula una parte de la logica de la aplicacion.
function renderFeaturedSkeleton(count = 4) {
    if (!featuredCarousel) return;
    const items = Array.from({ length: count }).map(() => `
        <article class="product-card product-card-skeleton" aria-hidden="true">
            <div class="product-image skeleton"></div>
            <div class="product-info">
                <div class="skeleton skeleton-line short"></div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line medium"></div>
            </div>
        </article>
    `).join('');
    featuredCarousel.innerHTML = items;
}

// Funcion: animateCartCount. Describe y encapsula una parte de la logica de la aplicacion.
function animateCartCount() {
    document.querySelectorAll('.cart-count').forEach((badge) => {
        badge.classList.remove('count-pop');
        void badge.offsetWidth;
        badge.classList.add('count-pop');
    });
}

// Funcion: updateCatalogInsights. Describe y encapsula una parte de la logica de la aplicacion.
function updateCatalogInsights() {
    const countNode = document.getElementById('catalogResultsCount');
    const chipsNode = document.getElementById('activeFilters');
    if (!countNode || !chipsNode) return;

    countNode.textContent = `${currentProducts.length} resultado${currentProducts.length === 1 ? '' : 's'} encontrados`;

    const chips = [];
    if (currentCategory !== 'all') chips.push({ label: `Categoría: ${CATEGORY_LABELS[currentCategory] || currentCategory}`, clear: 'category' });
    if (currentSubcategory !== 'all') chips.push({ label: `Subcategoría: ${getSubcategoryLabel(currentCategory, currentSubcategory)}`, clear: 'subcategory' });
    if (currentBrand !== 'all') chips.push({ label: `Marca: ${currentBrand}`, clear: 'brand' });
    if (currentSearchQuery.trim()) chips.push({ label: `Búsqueda: ${currentSearchQuery.trim()}`, clear: 'search' });

    if (chips.length === 0) {
        chipsNode.innerHTML = '<span class="filter-chip neutral">Sin filtros activos</span>';
        return;
    }

    chipsNode.innerHTML = chips.map(chip => `
        <button class="filter-chip" type="button" onclick="clearSpecificFilter('${chip.clear}')">
            ${escapeHtml(chip.label)} <i class="fas fa-times"></i>
        </button>
    `).join('') + '<button class="filter-chip clear-all" type="button" onclick="clearAllCatalogFilters()">Limpiar todo</button>';
}

// Funcion: clearSpecificFilter. Describe y encapsula una parte de la logica de la aplicacion.
function clearSpecificFilter(filterKey) {
    if (filterKey === 'category') {
        currentCategory = 'all';
        currentSubcategory = 'all';
        const radio = document.querySelector('input[name="category"][value="all"]');
        if (radio) radio.checked = true;
    }
    if (filterKey === 'subcategory') currentSubcategory = 'all';
    if (filterKey === 'brand') {
        currentBrand = 'all';
        const radio = document.querySelector('input[name="brand"][value="all"]');
        if (radio) radio.checked = true;
    }
    if (filterKey === 'search') {
        currentSearchQuery = '';
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
    }
    currentPage = 1;
    applyFilters();
}

// Funcion: clearAllCatalogFilters. Describe y encapsula una parte de la logica de la aplicacion.
function clearAllCatalogFilters() {
    currentCategory = 'all';
    currentSubcategory = 'all';
    currentBrand = 'all';
    currentSearchQuery = '';
    currentPage = 1;

    const categoryRadio = document.querySelector('input[name="category"][value="all"]');
    if (categoryRadio) categoryRadio.checked = true;
    const brandRadio = document.querySelector('input[name="brand"][value="all"]');
    if (brandRadio) brandRadio.checked = true;
    const input = document.getElementById('searchInput');
    if (input) input.value = '';
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    if (!PRICES_PENDING && priceRange) {
        priceRange.value = priceRange.max;
        currentMaxPrice = Number(priceRange.max);
        if (priceValue) priceValue.innerText = formatPrice(currentMaxPrice);
    } else {
        currentMaxPrice = Infinity;
    }

    applyFilters();
}

// Funcion: initPriceFilterUI. Describe y encapsula una parte de la logica de la aplicacion.
function initPriceFilterUI() {
    const priceRange = document.getElementById('priceRange');
    const priceValue = document.getElementById('priceValue');
    const priceMinValue = document.getElementById('priceMinValue');
    if (!priceRange) return;

    const priceList = products
        .map(p => Number(p.price))
        .filter(value => Number.isFinite(value) && value >= 0);

    if (priceList.length === 0) {
        priceRange.disabled = true;
        if (priceValue) priceValue.innerText = PRICE_LABEL;
        if (priceMinValue) priceMinValue.innerText = PRICE_LABEL;
        currentMaxPrice = Infinity;
        return;
    }

    const minPrice = Math.min(...priceList);
    const maxPrice = Math.max(...priceList);
    const minStep = minPrice < 10 || maxPrice < 10 ? 0.1 : 0.5;

    priceRange.disabled = PRICES_PENDING;
    priceRange.min = String(minPrice);
    priceRange.max = String(maxPrice);
    priceRange.step = String(minStep);
    priceRange.value = String(maxPrice);
    currentMaxPrice = PRICES_PENDING ? Infinity : maxPrice;

    if (priceValue) priceValue.innerText = PRICES_PENDING ? PRICE_LABEL : formatPrice(maxPrice);
    if (priceMinValue) priceMinValue.innerText = PRICES_PENDING ? PRICE_LABEL : formatPrice(minPrice);
}

// Funcion: applyPricePendingUI. Describe y encapsula una parte de la logica de la aplicacion.
function applyPricePendingUI() {
    if (!PRICES_PENDING) return;
    const priceRange = document.getElementById('priceRange');
    if (priceRange) priceRange.disabled = true;
    const priceValue = document.getElementById('priceValue');
    if (priceValue) priceValue.innerText = PRICE_LABEL;
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        Array.from(sortSelect.options).forEach(option => {
            if (option.value.startsWith('price-')) option.disabled = true;
        });
        if (sortSelect.value.startsWith('price-')) {
            sortSelect.value = 'featured';
            currentSort = 'featured';
        }
    }
}

// Funcion: initPremiumFeatures. Describe y encapsula una parte de la logica de la aplicacion.
function initPremiumFeatures() {
    initBackToTop();
    updateFavoriteButtons();
}
