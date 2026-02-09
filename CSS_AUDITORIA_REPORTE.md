# Auditoria y Optimizacion Frontend

Fecha: 2026-02-08

## 1) Auditoria de CSS no usado por selector

Metodologia (estatica):
- Se extrajeron selectores de clase desde `css/style.css` y `css/premium-styles.css`.
- Se cruzaron contra uso en `index.html`, `about.html`, `catalog.html` y `js/app.js`.
- Se priorizo limpieza de selectores legacy (hero antiguo y variantes no renderizadas).

Resultado antes de limpieza:
- Selectores de clase sin referencia detectados: 10
- Lista detectada:
  - `.hero-bg-image`
  - `.hero-bg-media`
  - `.hero-dots`
  - `.hero-slide-light`
  - `.hero-slides`
  - `.home-hero-arrow`
  - `.home-hero-dot`
  - `.home-hero-dots`
  - `.skeleton-card`
  - `.trust-metric-card`

Accion aplicada:
- Se eliminaron estos selectores y sus bloques relacionados en:
  - `css/style.css`
  - `css/premium-styles.css`

Verificacion posterior:
- `UNUSED_CLASSES=0` para el cruce estatico aplicado.

## 2) Consolidacion de reglas duplicadas entre CSS base y premium

Metodologia:
- Comparacion de bloques exactos `selector + declaraciones` entre `style.css` y `premium-styles.css`.

Resultado antes de consolidar:
- Duplicados exactos: 1 bloque
  - `.trust-badge { border: 1px solid rgba(15, 23, 42, 0.09); background: rgba(255, 255, 255, 0.84); backdrop-filter: blur(8px); }`

Accion aplicada:
- Se elimino el duplicado exacto del archivo base para dejar una sola fuente de verdad en premium.

Verificacion posterior:
- `EXACT_DUPLICATE_BLOCKS=0`.

## 3) Optimizacion de carga (defer/condicional por pagina)

Cambios aplicados:
- `index.html`:
  - Se elimino `vendor/jspdf/jspdf.umd.min.js` (no se usaba en Home).
- `about.html`:
  - Se elimino `data/products.js` del arranque inicial.
- `catalog.html`:
  - Se mantiene `jspdf + products + app` (necesario para catalogo, carrito e invoice).
- `js/app.js`:
  - Se implemento carga perezosa de productos con `ensureProductsLoaded()`.
  - Catalogo y carrusel destacado esperan datos solo cuando los necesitan.
  - Busqueda en paginas sin dataset inicial (ej. `about`) carga `data/products.js` on-demand al primer uso.

## Verificaciones ejecutadas

- `node --check js/app.js` (sin errores)
- Revisión de includes por pagina:
  - `index.html`: `data/products.js` + `js/app.js`
  - `about.html`: `js/app.js`
  - `catalog.html`: `vendor/jspdf/jspdf.umd.min.js` + `data/products.js` + `js/app.js`

## Archivos modificados

- `css/style.css`
- `css/premium-styles.css`
- `js/app.js`
- `index.html`
- `about.html`
