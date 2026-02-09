# Libreria Belen - Sitio estatico

Sitio web estatico listo para publicarse en GitHub y desplegarse en Cloudflare Pages.

## Estructura

- `index.html`: portada
- `catalog.html`: catalogo de productos
- `about.html`: pagina nosotros
- `plantilla-formulario.html`: plantilla de formulario
- `css/`: estilos
- `js/`: logica de UI
- `data/`: datos de productos
- `images/` e `img/`: recursos graficos
- `vendor/`: dependencias locales (Font Awesome, jsPDF)
- `_headers`: headers HTTP para Cloudflare Pages
- `_redirects`: rutas amigables en Cloudflare Pages

## Publicar en GitHub

1. Inicializa o verifica el repositorio:

```bash
git init
git add .
git commit -m "Preparar sitio estatico para Cloudflare Pages"
```

2. Conecta tu remoto y sube:

```bash
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## Desplegar en Cloudflare Pages

1. En Cloudflare: **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
2. Selecciona este repositorio.
3. Configuracion de build:
   - **Framework preset**: `None`
   - **Build command**: dejar vacio
   - **Build output directory**: `/`
4. Deploy.

## Notas

- Es un proyecto 100% estatico: no requiere Node, npm ni backend.
- `_headers` y `_redirects` son leidos automaticamente por Cloudflare Pages.
- Si actualizas con frecuencia imagenes/CSS/JS, purga cache en Cloudflare cuando sea necesario.
