import concurrent.futures
import json
import re
import unicodedata
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

import difflib


ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_JS = ROOT / "data" / "products.js"
IMG_PRODUCTS_DIR = ROOT / "img" / "products"
SEARCH_API = "https://api.clip.com.pe/v1/products/search"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"


def normalize_text(text: str) -> str:
    txt = str(text or "")
    txt = unicodedata.normalize("NFD", txt)
    txt = "".join(ch for ch in txt if unicodedata.category(ch) != "Mn")
    txt = txt.lower()
    txt = re.sub(r"[^a-z0-9\s]", " ", txt)
    txt = re.sub(r"\s+", " ", txt).strip()
    return txt


def parse_products_js(path: Path) -> Tuple[Dict[str, dict], List[dict]]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    match = re.search(r"const PRODUCTS = (\{.*?\});\s*const OFFERS = (\[.*?\]);", text, flags=re.S)
    if not match:
        raise ValueError("No se pudo parsear PRODUCTS/OFFERS en data/products.js")
    products = json.loads(match.group(1))
    offers = json.loads(match.group(2))
    return products, offers


def write_products_js(path: Path, products: Dict[str, dict], offers: List[dict]) -> None:
    content = []
    content.append("(() => {")
    content.append("  const PRODUCTS = " + json.dumps(products, ensure_ascii=True, indent=2) + ";")
    content.append("  const OFFERS = " + json.dumps(offers, ensure_ascii=True, indent=2) + ";")
    content.append("  window.PRODUCTS = PRODUCTS;")
    content.append("  window.OFFERS = OFFERS;")
    content.append("})();")
    path.write_text("\n".join(content) + "\n", encoding="utf-8")


def color_tokens(text: str) -> set:
    base = normalize_text(text)
    mapping = {
        "negro": "negro",
        "blanco": "blanco",
        "azul": "azul",
        "rojo": "rojo",
        "verde": "verde",
        "amarillo": "amarillo",
        "naranja": "naranja",
        "rosado": "rosado",
        "marron": "marron",
        "morado": "morado",
        "lila": "lila",
        "celeste": "celeste",
        "turquesa": "turquesa",
        "fucsia": "fucsia",
        "dorado": "dorado",
    }
    out = set()
    for token in mapping:
        if re.search(rf"\b{re.escape(token)}\b", base):
            out.add(mapping[token])
    return out


def score_candidate(title: str, candidate: dict) -> float:
    local_title = normalize_text(title)
    remote_title = normalize_text(candidate.get("name", ""))
    if not remote_title:
        return 0.0

    similarity = difflib.SequenceMatcher(None, local_title, remote_title).ratio()
    api_score = float(candidate.get("score") or 0.0)
    final = (similarity * 0.65) + (api_score * 0.35)

    local_colors = color_tokens(title)
    remote_colors = color_tokens(candidate.get("name", ""))
    if local_colors and remote_colors and not (local_colors & remote_colors):
        final -= 0.22

    local_brand = normalize_text(title).split(" ")
    remote_brand = normalize_text(str(candidate.get("brand") or ""))
    if remote_brand and not all(token in local_title for token in remote_brand.split()):
        final -= 0.03

    return final


def fetch_search_results(query: str) -> List[dict]:
    url = f"{SEARCH_API}?{urlencode({'q': query})}"
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8", errors="ignore"))
    if isinstance(data, list):
        return data
    return []


def choose_best_result(title: str, results: List[dict]) -> Optional[dict]:
    if not results:
        return None

    ranked = []
    for item in results:
        ranked.append((score_candidate(title, item), item))
    ranked.sort(key=lambda x: x[0], reverse=True)

    best_score, best_item = ranked[0]
    if best_score < 0.62 and results:
        # Fallback controlado: si score bajo, tomar mejor por API score.
        api_sorted = sorted(results, key=lambda x: float(x.get("score") or 0.0), reverse=True)
        best_item = api_sorted[0]
        best_score = score_candidate(title, best_item)

    best_item = dict(best_item)
    best_item["_match_score"] = round(best_score, 4)
    return best_item


def ext_from_url(url: str) -> str:
    path = urlsplit(url).path.lower()
    ext = Path(path).suffix.lower()
    if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
        return ".jpg"
    return ext


def download_image(image_url: str, slug: str) -> Optional[str]:
    if not image_url:
        return None
    try:
        ext = ext_from_url(image_url)
        IMG_PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
        target = IMG_PRODUCTS_DIR / f"{slug}{ext}"
        req = Request(image_url, headers={"User-Agent": USER_AGENT})
        with urlopen(req, timeout=25) as resp:
            content = resp.read()
        if not content:
            return None
        target.write_bytes(content)
        return f"img/products/{target.name}"
    except Exception:
        return None


def process_one(slug: str, item: dict) -> Tuple[str, Optional[dict], Optional[str]]:
    title = item.get("title") or ""
    try:
        results = fetch_search_results(title)
    except HTTPError as err:
        return slug, None, f"http_{err.code}"
    except URLError:
        return slug, None, "url_error"
    except Exception:
        return slug, None, "search_error"

    best = choose_best_result(title, results)
    if not best:
        return slug, None, "no_match"

    image_url = str(best.get("image_url") or "").strip()
    product_url = str(best.get("url") or "").strip()
    local_path = download_image(image_url, slug)
    if not local_path:
        return slug, None, "image_download_failed"

    payload = {
        "image": local_path,
        "link": product_url or item.get("link", ""),
        "brand": (item.get("brand") or "").strip() or str(best.get("brand") or "").strip() or "Generica",
        "match_score": best.get("_match_score", 0.0),
        "remote_name": best.get("name", ""),
    }
    return slug, payload, None


def clean_unused_images(products: Dict[str, dict]) -> int:
    referenced = set()
    for item in products.values():
        image = str(item.get("image") or "")
        if image.startswith("img/products/"):
            referenced.add(image.split("/", 2)[-1])

    removed = 0
    if IMG_PRODUCTS_DIR.exists():
        for file in IMG_PRODUCTS_DIR.iterdir():
            if not file.is_file():
                continue
            if file.name not in referenced:
                file.unlink(missing_ok=True)
                removed += 1
    return removed


def main():
    products, offers = parse_products_js(PRODUCTS_JS)
    keys = list(products.keys())

    updated = 0
    failed = {}
    low_confidence = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(process_one, slug, products[slug]) for slug in keys]
        for fut in concurrent.futures.as_completed(futures):
            slug, payload, error = fut.result()
            if error:
                failed[error] = failed.get(error, 0) + 1
                continue

            products[slug]["image"] = payload["image"]
            if payload["link"]:
                products[slug]["link"] = payload["link"]
            if payload["brand"]:
                products[slug]["brand"] = payload["brand"]
            updated += 1

            if float(payload.get("match_score") or 0.0) < 0.72:
                low_confidence.append(
                    {
                        "slug": slug,
                        "title": products[slug].get("title"),
                        "remote_name": payload.get("remote_name"),
                        "score": payload.get("match_score"),
                    }
                )

    removed_images = clean_unused_images(products)
    write_products_js(PRODUCTS_JS, products, offers)

    print(f"Total products: {len(products)}")
    print(f"Images updated from Tailoy: {updated}")
    print(f"Failed lookups/downloads: {failed or 'none'}")
    print(f"Low confidence matches: {len(low_confidence)}")
    if low_confidence:
        for row in low_confidence[:15]:
            print(f"- {row['slug']} | score={row['score']} | local='{row['title']}' | remote='{row['remote_name']}'")
    print(f"Unused local images removed: {removed_images}")


if __name__ == "__main__":
    main()
