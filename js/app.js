// State
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
const PRICES_PENDING = true;
const PRICE_LABEL = '0';
const THEME_STORAGE_KEY = 'libreriaBelenTheme';
const PRODUCTS_SCRIPT_PATH = 'data/products.js';
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

// DOM Elements
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
let autoScrollInterval;

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value);
}

function escapeJsString(value) {
    return String(value || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, ' ');
}

function sanitizeUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return 'img/placeholder.jpg';
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('javascript:') || lower.startsWith('vbscript:')) return 'img/placeholder.jpg';
    if (/[<>"'`]/.test(trimmed)) return 'img/placeholder.jpg';

    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed);
    const isProtocolRelative = trimmed.startsWith('//');
    if (!hasScheme && !isProtocolRelative) {
        // Relative/local path: keep it local but encode spaces/unicode safely.
        return encodeURI(trimmed);
    }

    try {
        const parsed = new URL(trimmed, window.location.origin);
        const protocol = parsed.protocol.toLowerCase();
        if (!['http:', 'https:'].includes(protocol)) return 'img/placeholder.jpg';

        const allowedHosts = new Set([
            window.location.hostname,
            'via.placeholder.com'
        ]);
        if (!allowedHosts.has(parsed.hostname)) return 'img/placeholder.jpg';
        return parsed.href;
    } catch (error) {
        return 'img/placeholder.jpg';
    }
}

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    updateCartCount();
    initImageFallbackHandler();
    initSearchUI();
    initHeroCarousel();
    applyPricePendingUI();
    initAccessibilityEnhancements();
    initDynamicYear();
    initVisualMicroInteractions();
    initExperimentalDesignLayer();
    initPremiumFeatures();

    if (productGrid) {
        // Catalog Page Logic
        renderCatalogSkeleton(8);
        ensureProductsLoaded().then(() => {
            renderCategories();
            renderBrandFilters();
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

    // Close Modals on outside click
    window.onclick = function (event) {
        if (event.target == cartModal) closeCart();
        else if (event.target == sidebar) toggleSidebar();
        else if (event.target == productDetailModal) closeProductModal();
    }
});

function ensureProductsLoaded() {
    if (products.length > 0) return Promise.resolve(products);

    if (typeof window.PRODUCTS !== 'undefined') {
        loadProducts();
        return Promise.resolve(products);
    }

    if (productsLoadPromise) return productsLoadPromise;

    productsLoadPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${PRODUCTS_SCRIPT_PATH}"]`);
        if (existing) {
            existing.addEventListener('load', () => {
                loadProducts();
                resolve(products);
            }, { once: true });
            existing.addEventListener('error', () => {
                reject(new Error('No se pudo cargar products.js'));
            }, { once: true });
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
        productsLoadPromise = null;
    });

    return productsLoadPromise;
}

function initHeroCarousel() {
    const root = document.querySelector('[data-hero-carousel]');
    if (!root) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animationMs = 1300;

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

        if (prefersReducedMotion) {
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
        timer = setInterval(() => setActive(index + 1), 5500);
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

function setActiveSearchItem(items, index) {
    items.forEach((item, i) => item.classList.toggle('active', i === index));
    if (items[index]) items[index].scrollIntoView({ block: 'nearest' });
}

function getSearchHistory() {
    return parseStoredArray('libreriaBelenSearchHistory');
}

function saveSearchHistory(history) {
    localStorage.setItem('libreriaBelenSearchHistory', JSON.stringify(history.slice(0, 6)));
}

function addSearchHistory(query) {
    const q = query.trim();
    if (!q) return;
    const history = getSearchHistory().filter(item => item.toLowerCase() !== q.toLowerCase());
    history.unshift(q);
    saveSearchHistory(history);
}

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
            searchResults.innerHTML = '<div class="search-empty">Escribe para buscar productos</div>';
        }

        searchResults.classList.add('active');
        return;
    }

    const suggestions = filtered.slice(0, 6);
    if (suggestions.length === 0) {
        searchResults.innerHTML = '<div class="search-empty">No se encontraron resultados</div>';
    } else {
        suggestions.forEach(product => {
            const item = document.createElement('div');
            const safeTitle = escapeHtml(product.title);
            const safeImage = escapeAttr(sanitizeUrl(product.image));
            const highlightedTitle = highlightSearchMatches(product.title, query);
            const highlightedCategory = highlightSearchMatches(product.category, query);
            item.className = 'search-item';
            item.setAttribute('data-search-item', 'true');
            item.onclick = () => {
                addSearchHistory(product.title);
                openProductModal(product.id);
                searchResults.classList.remove('active');
                const input = document.getElementById('searchInput');
                if (input) input.value = '';
            };
            item.innerHTML = `
                <img src="${safeImage}" alt="${safeTitle}" data-fallback-src="https://via.placeholder.com/40">
                <div class="search-item-info">
                    <h4>${highlightedTitle}</h4>
                    <p>${highlightedCategory}</p>
                </div>
                <div class="search-item-price">${PRICE_LABEL}</div>
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

    const bestPrice = getBestPriceProducts(filtered, 4);
    if (bestPrice.length > 0) {
        searchResults.appendChild(createSectionTitle('Mejor precio'));
        searchResults.appendChild(createProductChipRow(bestPrice));
    }

    searchResults.classList.add('active');
}

function createSectionTitle(text) {
    const title = document.createElement('div');
    title.className = 'search-section-title';
    title.innerText = text;
    return title;
}

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
        price.textContent = PRICE_LABEL;
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

function getBestPriceProducts(list, limit) {
    return [...list]
        .filter(p => Number.isFinite(p.price))
        .sort((a, b) => a.price - b.price)
        .slice(0, limit);
}

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

function loadProducts() {
    if (typeof window.PRODUCTS !== 'undefined') {
        products = Object.entries(window.PRODUCTS).map(([slug, data], index) => {
            let price = 0;
            if (typeof data.price === 'string') {
                price = parseFloat(data.price.replace('S/ ', '').replace(',', ''));
            } else {
                price = Number(data.price);
            }
            let image = data.image || 'img/placeholder.jpg';
            if (image.startsWith('assets/img/')) {
                image = image.replace('assets/img/', 'img/');
            }
            try { image = decodeURIComponent(image); } catch (e) { }

            const normalizedCategory = normalizeCategory(data.category, data.title);
            const normalizedSubcategory = normalizeSubcategory(normalizedCategory, data.title || '');
            const brand = extractBrandFromTitle(data.title || '') || 'Otros';
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

function normalizeCategory(rawCategory, title) {
    const normalized = (rawCategory || '').toString().trim().toLowerCase();
    if (['papeleria', 'regalos', 'cuadernos'].includes(normalized)) return normalized;
    if (normalized === 'office') return 'oficina';
    if (normalized === 'school') return 'utiles';
    if (normalized === 'tech') return 'tecnologia';
    if (normalized === 'varios') return 'otros';

    return categorizeByTitle(title || '') || (normalized || 'otros');
}

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

function normalizeSubcategory(category, title) {
    const patterns = SUBCATEGORY_PATTERNS[category] || [];
    const t = title.toLowerCase();
    for (const entry of patterns) {
        if (entry.regex.test(t)) return entry.key;
    }
    return 'varios';
}

function getSubcategoryLabel(category, subcategory) {
    const patterns = SUBCATEGORY_PATTERNS[category] || [];
    const match = patterns.find(p => p.key === subcategory);
    return match ? match.label : subcategory;
}

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

function tokenize(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}

function normalizeText(text) {
    return tokenize(text).join(' ');
}

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

function hasApproxToken(tokens, queryToken) {
    if (!queryToken || queryToken.length < 4) return false;
    const maxDistance = queryToken.length >= 8 ? 2 : 1;
    for (const token of tokens) {
        if (Math.abs(token.length - queryToken.length) > maxDistance) continue;
        if (levenshteinDistance(token, queryToken) <= maxDistance) return true;
    }
    return false;
}

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

// Product Detail Modal Logic
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    currentDetailId = productId;
    currentDetailQty = 1;

    document.getElementById('detailImage').src = sanitizeUrl(product.image);
    document.getElementById('detailTitle').innerText = product.title;
    document.getElementById('detailPrice').innerText = PRICE_LABEL;
    document.getElementById('detailRating').innerHTML = getStars(product.rating);
    document.getElementById('detailDescription').innerText = product.longDescription;
    document.getElementById('detailQty').innerText = currentDetailQty;
    const detailAddBtn = document.getElementById('detailAddBtn');
    if (detailAddBtn) {
        detailAddBtn.disabled = PRICES_PENDING;
        detailAddBtn.title = PRICES_PENDING ? 'Precios próximamente' : '';
    }

    // Features
    const featureList = document.getElementById('detailFeatures');
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
    const usageList = document.getElementById('detailUsage');
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
}

function closeProductModal() {
    productDetailModal.style.display = 'none';
}

function adjustDetailQty(change) {
    currentDetailQty += change;
    if (currentDetailQty < 1) currentDetailQty = 1;
    document.getElementById('detailQty').innerText = currentDetailQty;
}

function addToCartFromDetail() {
    if (PRICES_PENDING) {
        showToast('Precios próximamente', 'error');
        return;
    }
    if (!currentDetailId) return;
    const product = products.find(p => p.id === currentDetailId);
    if (!product) return;

    // Logic similar to addToCart but with custom qty
    const existingItem = cart.find(item => item.id === currentDetailId);
    if (existingItem) {
        existingItem.quantity += currentDetailQty;
    } else {
        cart.push({ ...product, quantity: currentDetailQty });
    }

    saveCart();
    updateCartCount();
    animateCartCount();
    closeProductModal();
    openCart(); // Optional: show cart after adding
}


// Search Logic
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

function executeSearch() {
    const input = document.getElementById('searchInput');
    if (!input) return;
    const query = input.value.trim();
    addSearchHistory(query);
    window.location.href = `catalog.html?search=${encodeURIComponent(query)}`;
}

// ... Rest (Carousel, Pagination, Standard Cart) ...

function renderFeaturedCarousel() {
    if (!featuredCarousel || products.length === 0) return;
    const shuffled = [...products].sort(() => 0.5 - Math.random());
    const featured = shuffled.slice(0, 8);

    featuredCarousel.innerHTML = '';
    const fragment = document.createDocumentFragment();
    featured.forEach((product, index) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = getProductCardHtml(product, index);
        fragment.appendChild(card);
    });
    featuredCarousel.appendChild(fragment);
}

function scrollCarousel(direction) {
    if (!featuredCarousel) return;
    const cardWidth = 250 + 32;
    if (direction === 1 && Math.ceil(featuredCarousel.scrollLeft + featuredCarousel.clientWidth) >= featuredCarousel.scrollWidth) {
        featuredCarousel.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
        featuredCarousel.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
    }
}

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
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = getProductCardHtml(product, index);
        productGrid.appendChild(card);
    });

    renderPagination(productsToRender.length);
}

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

function changePage(newPage) {
    currentPage = newPage;
    renderProducts(sortProducts(currentProducts, currentSort));
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initSortSelect() {
    const select = document.getElementById('sortSelect');
    if (!select) return;
    select.value = currentSort;
    select.addEventListener('change', () => {
        currentSort = select.value;
        renderProducts(sortProducts(currentProducts, currentSort));
    });
}

function sortProducts(list, sortKey) {
    const items = [...list];
    if (sortKey === 'price-asc') return items.sort((a, b) => a.price - b.price);
    if (sortKey === 'price-desc') return items.sort((a, b) => b.price - a.price);
    if (sortKey === 'name-asc') return items.sort((a, b) => a.title.localeCompare(b.title));
    if (sortKey === 'name-desc') return items.sort((a, b) => b.title.localeCompare(a.title));
    return items;
}

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

function filterBySearch(list, query) {
    return getRankedSearchResults(list, query);
}

function filterProducts(category) {
    currentPage = 1;
    currentCategory = category;
    currentSubcategory = 'all';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    currentSearchQuery = '';
    applyFilters();
    if (window.innerWidth < 768) { toggleSidebar(); }
}

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
    if (window.innerWidth < 768) { toggleSidebar(); }
}

function toggleSubcategory(category) {
    const container = document.querySelector(`.filter-accordion[data-category="${category}"]`);
    if (!container) return;
    container.classList.toggle('open');
}

function filterByPrice(maxPrice) {
    if (PRICES_PENDING) return;
    currentPage = 1;
    const priceDisplay = document.getElementById('priceValue');
    if (priceDisplay) priceDisplay.innerText = `S/ ${maxPrice}`;
    currentMaxPrice = Number(maxPrice);
    applyFilters();
}

function filterByBrand(brand) {
    currentPage = 1;
    currentBrand = brand;
    applyFilters();
}

function toggleSidebar() { if (sidebar) sidebar.classList.toggle('open'); }
function removeFromCart(productId) { cart = cart.filter(item => item.id !== productId); saveCart(); renderCart(); updateCartCount(); }
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) { removeFromCart(productId); } else { saveCart(); renderCart(); updateCartCount(); }
    }
}
function saveCart() { localStorage.setItem('libreriaBelenCart', JSON.stringify(cart)); }
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.forEach(el => {
        el.innerText = totalItems;
        el.classList.toggle('is-empty', totalItems === 0);
    });
}
function openCart() {
    if (!cartModal) {
        if (!document.getElementById('cartItems')) {
            // If on homepage without modal, go to catalog
            window.location.href = 'catalog.html';
            return;
        }
    }
    renderCart();
    if (cartModal) cartModal.style.display = 'block';
}

function closeCart() { if (cartModal) cartModal.style.display = 'none'; }
function renderCart() {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    let total = 0;
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color: var(--text-light); margin-top: 2rem;">Tu carrito está vacío.</p>';
        // Hide/Disable checkout button if possible or just let checkout logic handle it
    } else {
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            const cartItem = document.createElement('div');
            cartItem.style.display = 'flex';
            cartItem.style.marginBottom = '1rem';
            cartItem.style.borderBottom = '1px solid #eee';
            cartItem.style.paddingBottom = '0.5rem';
            cartItem.style.alignItems = 'center';
            const safeTitle = escapeHtml(item.title);
            const safeImage = escapeAttr(sanitizeUrl(item.image));
            const priceLabel = PRICES_PENDING ? PRICE_LABEL : `S/ ${item.price.toFixed(2)}`;
            cartItem.innerHTML = `
                <div style="width: 60px; height: 60px; background: #f8fafc; margin-right: 1rem; border-radius: 4px; overflow:hidden;">
                    <img src="${safeImage}" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex:1;">
                    <h4 style="font-size: 0.9rem; margin-bottom: 0.25rem; font-weight: 600;">${safeTitle}</h4>
                    <div style="color: var(--primary-color); font-weight: bold;">${priceLabel}</div>
                </div>
                <div style="display:flex; align-items:center; gap: 0.5rem;">
                    <button onclick="updateQuantity(${item.id}, -1)" class="btn-qty">-</button>
                    <span style="font-weight: 600; min-width: 20px; text-align: center;">${item.quantity}</span>
                    <button onclick="updateQuantity(${item.id}, 1)" class="btn-qty">+</button>
                    <button onclick="removeFromCart(${item.id})" style="color: #ef4444; border:none; background:none; cursor:pointer;" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            `;
            cartItemsContainer.appendChild(cartItem);
        });
    }
    const checkoutBtn = document.getElementById('checkoutBtn');
    const invoiceBtn = document.getElementById('invoiceBtn');
    if (cartTotalElement) {
        cartTotalElement.innerText = PRICES_PENDING ? PRICE_LABEL : `S/ ${total.toFixed(2)}`;
    }
    if (checkoutBtn) checkoutBtn.disabled = PRICES_PENDING;
    if (invoiceBtn) invoiceBtn.disabled = PRICES_PENDING;
}

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

    if (dni.length !== 8) {
        alert('El DNI debe tener exactamente 8 dígitos.');
        return null;
    }

    if (consentInput && !consentInput.checked) {
        alert('Debes aceptar el envío de datos por WhatsApp para continuar.');
        return null;
    }

    return { name, lastName, dni };
}

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

    const phoneNumber = "51947872207";
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, '_blank', 'noopener,noreferrer');
}

function generateInvoice() {
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

    const { jsPDF } = window.jspdf;
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

// Mobile Menu Logic
function setMobileMenuState(isOpen) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    navLinks.classList.toggle('mobile-active', Boolean(isOpen));
    document.body.classList.toggle('mobile-menu-open', Boolean(isOpen));
}

function closeMobileMenu() {
    setMobileMenuState(false);
}

function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    setMobileMenuState(!navLinks.classList.contains('mobile-active'));
}

// Close mobile menu when clicking a link
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

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
});

function initAccessibilityEnhancements() {
    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;

        const navLinks = document.querySelector('.nav-links');
        if (navLinks) closeMobileMenu();

        const searchResults = document.getElementById('searchResults');
        if (searchResults) searchResults.classList.remove('active');

        if (cartModal && cartModal.style.display === 'block') closeCart();
        if (productDetailModal && productDetailModal.style.display === 'block') closeProductModal();
        if (sidebar && sidebar.classList.contains('open')) toggleSidebar();
    });
}

function initDynamicYear() {
    const year = new Date().getFullYear();
    document.querySelectorAll('[data-current-year]').forEach(el => {
        el.textContent = year;
    });
}

function initVisualMicroInteractions() {
    const targets = document.querySelectorAll(
        '.home-hero, .conversion-strip, .trust-badges, .trust-metrics, .carousel-container, .location-section, .about-content, .product-grid, .footer-content'
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
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    targets.forEach(el => observer.observe(el));
}

function initExperimentalDesignLayer() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    const hasHero = !!document.querySelector('.home-hero');
    const hasCards = !!document.querySelector('.product-card');
    if (!hasHero && !hasCards) return;

    const hero = document.querySelector('.home-hero');
    if (hero) {
        hero.addEventListener('mousemove', (event) => {
            const rect = hero.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            const y = ((event.clientY - rect.top) / rect.height) * 100;
            hero.style.setProperty('--pointer-x', `${x}%`);
            hero.style.setProperty('--pointer-y', `${y}%`);
        });
    }

    document.addEventListener('mousemove', (event) => {
        const card = event.target.closest('.product-card');
        if (!card || window.innerWidth < 900) return;

        const rect = card.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const px = (x / rect.width) * 100;
        const py = (y / rect.height) * 100;

        card.style.setProperty('--pointer-x', `${px}%`);
        card.style.setProperty('--pointer-y', `${py}%`);
    });
}

// ========== PREMIUM FEATURES ==========

// Toast Notifications
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

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Favorites System
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

function isFavorite(productId) {
    return favorites.includes(productId);
}

// Back to Top Button
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

// Get Product Badge
function getProductBadge(index) {
    if (index < 3) return '<span class="product-badge new">Nuevo</span>';
    if (index % 5 === 0) return '<span class="product-badge sale">Oferta</span>';
    if (index % 7 === 0) return '<span class="product-badge popular">Popular</span>';
    return '';
}

// Enhanced Add to Cart with Toast
function addToCart(productId) {
    if (PRICES_PENDING) {
        showToast('Precios próximamente', 'error');
        return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartCount();
    animateCartCount();
    showToast(`${product.title} añadido al carrito`, 'success');
}

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
            <div class="product-price">${PRICE_LABEL}</div>
            <div class="product-actions">
                <button class="btn-cart" ${cartDisabled} onclick="addToCart(${product.id})">
                    <i class="fas fa-cart-plus"></i>
                </button>
                <button class="btn-buy" onclick="openProductModal(${product.id})">
                    Ver detalle
                </button>
            </div>
        </div>
    `;
}

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

function animateCartCount() {
    document.querySelectorAll('.cart-count').forEach((badge) => {
        badge.classList.remove('count-pop');
        void badge.offsetWidth;
        badge.classList.add('count-pop');
    });
}

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

    applyFilters();
}

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

function initPremiumFeatures() {
    initBackToTop();
    updateFavoriteButtons();
}
