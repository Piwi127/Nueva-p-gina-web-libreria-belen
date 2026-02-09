# Checklist de Publicación en Cloudflare (Producción)

## 1) DNS y SSL/TLS
- [ ] Dominio apuntando a Cloudflare (nube naranja en `A/AAAA/CNAME` públicos).
- [ ] `SSL/TLS mode`: `Full (strict)`.
- [ ] Certificado válido en origen (Cloudflare Origin Cert o certificado público).
- [ ] `Always Use HTTPS`: ON.
- [ ] `Automatic HTTPS Rewrites`: ON.
- [ ] `Minimum TLS`: `1.2` (o `1.3` si tus clientes lo permiten).

## 2) Headers de seguridad (Rules > Transform Rules > HTTP Response Header Modification)
- [ ] `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`.
- [ ] `X-Content-Type-Options`: `nosniff`.
- [ ] `Referrer-Policy`: `strict-origin-when-cross-origin`.
- [ ] `X-Frame-Options`: `DENY`.
- [ ] `Permissions-Policy`: `camera=(), microphone=(), geolocation=()`.
- [ ] Definir `Content-Security-Policy` por header (no por meta) cuando termines de quitar inline handlers.

## 3) Caché y rendimiento
- [ ] `Caching Level`: `Standard`.
- [ ] `Browser Cache TTL`: al menos `1 month` para assets estáticos.
- [ ] Rule para estáticos (`*.css`, `*.js`, `*.jpg`, `*.jpeg`, `*.png`, `*.webp`, `*.avif`, `*.svg`, `*.woff2`):
  - [ ] `Cache Everything`.
  - [ ] `Edge TTL`: `1 month` o más.
- [ ] Activar `Brotli`: ON.
- [ ] Activar `HTTP/2` y `HTTP/3 (QUIC)`: ON.
- [ ] `Rocket Loader`: OFF (si rompe JS/handlers inline), probar antes de activar.

## 4) WAF y protección
- [ ] `Managed WAF Rules`: ON.
- [ ] `Bot Fight Mode` (o Super Bot Fight si plan lo permite): ON.
- [ ] `DDoS Protection`: ON (por defecto en Cloudflare).
- [ ] Rate Limiting:
  - [ ] `/catalog.html` y rutas sensibles (si agregas backend/formularios).
  - [ ] Umbral recomendado inicial: 60 req/min por IP (ajustar según tráfico real).

## 5) Reglas de página/rewrite
- [ ] Forzar canonical host (`www` o sin `www`) con Redirect Rule 301.
- [ ] Evitar indexación de ambientes de prueba (`X-Robots-Tag: noindex` en staging).
- [ ] Si hay rutas antiguas, crear redirects 301 para no perder SEO.

## 6) Monitoreo y observabilidad
- [ ] Activar `Web Analytics` de Cloudflare.
- [ ] Revisar `Security Events` semanalmente (bloqueos falsos positivos).
- [ ] Revisar `Cache Analytics` (hit ratio) y ajustar reglas.

## 7) Verificación final previa al go-live
- [ ] Prueba desktop y móvil en:
  - [ ] `index.html`
  - [ ] `catalog.html`
  - [ ] `about.html`
- [ ] Comprobar que imágenes AVIF/JPG cargan con fallback.
- [ ] Verificar que WhatsApp y Google Maps abren correctamente.
- [ ] Ejecutar hard refresh y prueba en incógnito.
- [ ] Validar headers finales con `curl -I` o herramientas tipo securityheaders.com.

## 8) Pendientes técnicos recomendados en el proyecto
- [ ] Migrar `onclick/oninput/onchange` inline a listeners JS (permite CSP estricta sin `unsafe-inline`).
- [ ] Mover CSP de meta tag a header HTTP en Cloudflare.
- [ ] Reducir inline styles restantes en HTML.
