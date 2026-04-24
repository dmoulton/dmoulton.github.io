#!/usr/bin/env python3
"""
generate_nina_plugins.py
------------------------
Clones (or updates) the NINA plugin manifest repository, parses the JSON
manifests, filters to plugins requiring NINA 3.0+, and writes a Jekyll page
to pages/nina-plugins.html.

Usage (from repo root):
    python3 scripts/generate_nina_plugins.py

The script is also run automatically each week by .github/workflows/update-nina-plugins.yml
"""

import json
import glob
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
MANIFEST_REPO   = "https://github.com/isbeorn/nina.plugin.manifests.git"
MIN_NINA_MAJOR  = 3
OUTPUT_PATH     = Path(__file__).parent.parent / "pages" / "nina-plugins.html"

# ── Helpers ───────────────────────────────────────────────────────────────────

def clone_or_update(repo_url: str, dest: Path) -> None:
    """Clone repo into dest, or pull if it already exists."""
    if (dest / ".git").exists():
        print(f"  Updating {dest} …")
        subprocess.run(["git", "-C", str(dest), "pull", "--depth=1", "--ff-only"],
                       check=True, capture_output=True)
    else:
        print(f"  Cloning {repo_url} → {dest} …")
        subprocess.run(["git", "clone", "--depth=1", repo_url, str(dest)],
                       check=True, capture_output=True)


def parse_manifests(manifests_dir: Path) -> list[dict]:
    """
    Parse all manifest JSON files, deduplicate by Identifier keeping the
    latest version, filter to MIN_NINA_MAJOR+, return sorted list.
    """
    files = glob.glob(str(manifests_dir / "**" / "*.json"), recursive=True)
    plugins: dict[str, dict] = {}

    for filepath in files:
        try:
            with open(filepath, encoding="utf-8-sig") as fh:
                data = json.load(fh)
        except Exception as exc:
            print(f"  SKIP {filepath}: {exc}", file=sys.stderr)
            continue

        ident = data.get("Identifier", filepath)
        v = data.get("Version", {})
        try:
            ver_tuple = (
                int(v.get("Major", 0)), int(v.get("Minor", 0)),
                int(v.get("Patch", 0)), int(v.get("Build", 0)),
            )
        except (TypeError, ValueError):
            ver_tuple = (0, 0, 0, 0)

        if ident not in plugins or ver_tuple > plugins[ident]["_ver"]:
            data["_ver"] = ver_tuple
            plugins[ident] = data

    results = []
    for data in plugins.values():
        mav = data.get("MinimumApplicationVersion", {})
        try:
            if int(mav.get("Major", 0)) < MIN_NINA_MAJOR:
                continue
        except (TypeError, ValueError):
            continue

        v    = data.get("Version", {})
        desc = data.get("Descriptions", {})
        results.append({
            "name":           data.get("Name", ""),
            "author":         data.get("Author", ""),
            "version":        f"{v.get('Major','0')}.{v.get('Minor','0')}.{v.get('Patch','0')}.{v.get('Build','0')}",
            "tags":           data.get("Tags", []),
            "short_desc":     desc.get("ShortDescription", ""),
            "long_desc":      desc.get("LongDescription", ""),
            "featured_image": desc.get("FeaturedImageURL", ""),
            "installer_url":  data.get("Installer", {}).get("URL", ""),
        })

    results.sort(key=lambda x: x["name"].lower())
    return results


def build_page(plugins: list[dict]) -> str:
    """Render the full Jekyll front-matter + HTML page."""
    plugins_json  = json.dumps(plugins)
    count         = len(plugins)
    generated_at  = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    generated_friendly = datetime.now(timezone.utc).strftime("%B %-d, %Y")

    # ── CSS ──────────────────────────────────────────────────────────────────
    STYLE = ":root {\n    --plg-bg: #080c14;\n    --plg-surface: #0d1520;\n    --plg-surface2: #111d2e;\n    --plg-border: #1e3050;\n    --plg-accent: #4fc3f7;\n    --plg-accent2: #7c4dff;\n    --plg-accent3: #00e5ff;\n    --plg-text: #cdd9e8;\n    --plg-text-dim: #6b8299;\n    --plg-text-bright: #eaf2ff;\n    --plg-tag-bg: #0d2040;\n    --plg-tag-text: #4fc3f7;\n  }\n\n  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }\n\n  body {\n    background: var(--plg-bg);\n    color: var(--plg-text);\n    font-family: 'Syne', sans-serif;\n    min-height: 100vh;\n    overflow-x: hidden;\n  }\n\n  body::before {\n    content: '';\n    position: fixed;\n    inset: 0;\n    background-image:\n      radial-gradient(1px 1px at 10% 20%, rgba(255,255,255,0.6) 0%, transparent 100%),\n      radial-gradient(1px 1px at 30% 60%, rgba(255,255,255,0.4) 0%, transparent 100%),\n      radial-gradient(1.5px 1.5px at 50% 10%, rgba(255,255,255,0.5) 0%, transparent 100%),\n      radial-gradient(1px 1px at 70% 80%, rgba(255,255,255,0.3) 0%, transparent 100%),\n      radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.5) 0%, transparent 100%),\n      radial-gradient(1px 1px at 15% 85%, rgba(255,255,255,0.4) 0%, transparent 100%),\n      radial-gradient(1.5px 1.5px at 45% 45%, rgba(255,255,255,0.3) 0%, transparent 100%),\n      radial-gradient(1px 1px at 80% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),\n      radial-gradient(1px 1px at 60% 70%, rgba(255,255,255,0.4) 0%, transparent 100%),\n      radial-gradient(1px 1px at 25% 35%, rgba(255,255,255,0.5) 0%, transparent 100%);\n    pointer-events: none;\n    z-index: 0;\n  }\n\n  header {\n    position: relative;\n    z-index: 10;\n    padding: 60px 40px 40px;\n    border-bottom: 1px solid var(--plg-border);\n    background: linear-gradient(180deg, rgba(79,195,247,0.05) 0%, transparent 100%);\n  }\n\n  .header-inner {\n    max-width: 1400px;\n    margin: 0 auto;\n  }\n\n  .site-label {\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    letter-spacing: 0.3em;\n    color: var(--plg-accent);\n    text-transform: uppercase;\n    margin-bottom: 16px;\n    opacity: 0.8;\n  }\n\n  h1 {\n    font-size: clamp(2.5rem, 5vw, 4.5rem);\n    font-weight: 800;\n    color: var(--plg-text-bright);\n    line-height: 1;\n    letter-spacing: -0.03em;\n    margin-bottom: 16px;\n  }\n\n  h1 span { color: var(--plg-accent); }\n\n  .subtitle {\n    font-family: 'Space Mono', monospace;\n    font-size: 13px;\n    color: var(--plg-text-dim);\n    margin-bottom: 36px;\n  }\n\n  .controls {\n    display: flex;\n    gap: 16px;\n    flex-wrap: wrap;\n    align-items: center;\n  }\n\n  .search-wrap {\n    position: relative;\n    flex: 1;\n    min-width: 260px;\n    max-width: 480px;\n  }\n\n  .search-wrap svg {\n    position: absolute;\n    left: 14px;\n    top: 50%;\n    transform: translateY(-50%);\n    color: var(--plg-text-dim);\n    pointer-events: none;\n  }\n\n  #search {\n    width: 100%;\n    padding: 12px 16px 12px 42px;\n    background: var(--plg-surface2);\n    border: 1px solid var(--plg-border);\n    border-radius: 8px;\n    color: var(--plg-text-bright);\n    font-family: 'Space Mono', monospace;\n    font-size: 13px;\n    outline: none;\n    transition: border-color 0.2s;\n  }\n\n  #search:focus { border-color: var(--plg-accent); }\n  #search::placeholder { color: var(--plg-text-dim); }\n\n  .count-badge {\n    font-family: 'Space Mono', monospace;\n    font-size: 12px;\n    color: var(--plg-text-dim);\n    padding: 8px 16px;\n    background: var(--plg-surface2);\n    border: 1px solid var(--plg-border);\n    border-radius: 8px;\n    white-space: nowrap;\n  }\n\n  .count-badge span { color: var(--plg-accent); font-weight: 700; }\n\n  main {\n    position: relative;\n    z-index: 10;\n    max-width: 1400px;\n    margin: 0 auto;\n    padding: 40px 40px 80px;\n  }\n\n  #grid {\n    display: grid;\n    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));\n    gap: 24px;\n  }\n\n  .card {\n    background: var(--plg-surface);\n    border: 1px solid var(--plg-border);\n    border-radius: 12px;\n    overflow: hidden;\n    display: flex;\n    flex-direction: column;\n    transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;\n    animation: fadeUp 0.4s ease both;\n  }\n\n  .card:hover {\n    transform: translateY(-3px);\n    border-color: rgba(79,195,247,0.4);\n    box-shadow: 0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(79,195,247,0.1);\n  }\n\n  @keyframes fadeUp {\n    from { opacity: 0; transform: translateY(16px); }\n    to   { opacity: 1; transform: translateY(0); }\n  }\n\n  .card-image {\n    width: 100%;\n    height: 200px;\n    object-fit: cover;\n    background: var(--plg-surface2);\n    display: block;\n    border-bottom: 1px solid var(--plg-border);\n  }\n\n  .card-image-placeholder {\n    width: 100%;\n    height: 200px;\n    background: linear-gradient(135deg, var(--plg-surface2) 0%, #0a1829 100%);\n    border-bottom: 1px solid var(--plg-border);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    flex-direction: column;\n    gap: 10px;\n    color: var(--plg-border);\n  }\n\n  .card-image-placeholder svg {\n    width: 48px;\n    height: 48px;\n    opacity: 0.4;\n  }\n\n  .placeholder-name {\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    color: var(--plg-text-dim);\n    text-align: center;\n    padding: 0 20px;\n    opacity: 0.6;\n  }\n\n  .card-body {\n    padding: 20px 22px 16px;\n    flex: 1;\n    display: flex;\n    flex-direction: column;\n  }\n\n  .card-name {\n    font-size: 1.05rem;\n    font-weight: 700;\n    color: var(--plg-text-bright);\n    margin-bottom: 4px;\n    letter-spacing: -0.01em;\n  }\n\n  .card-author {\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    color: var(--plg-accent);\n    margin-bottom: 12px;\n    letter-spacing: 0.05em;\n  }\n\n  .card-tags {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px;\n    margin-bottom: 12px;\n  }\n\n  .tag {\n    font-family: 'Space Mono', monospace;\n    font-size: 10px;\n    padding: 3px 8px;\n    background: var(--plg-tag-bg);\n    color: var(--plg-tag-text);\n    border-radius: 4px;\n    letter-spacing: 0.04em;\n    border: 1px solid rgba(79,195,247,0.15);\n  }\n\n  .card-version {\n    font-family: 'Space Mono', monospace;\n    font-size: 10px;\n    color: var(--plg-text-dim);\n    margin-bottom: 12px;\n  }\n\n  .card-short-desc {\n    font-size: 0.85rem;\n    line-height: 1.55;\n    color: var(--plg-text);\n    margin-bottom: 10px;\n    font-style: italic;\n  }\n\n  .details-btn {\n    align-self: flex-start;\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    color: var(--plg-accent);\n    background: none;\n    border: 1px solid rgba(79,195,247,0.25);\n    border-radius: 4px;\n    cursor: pointer;\n    padding: 5px 10px;\n    opacity: 0.85;\n    transition: opacity 0.2s, border-color 0.2s, background 0.2s;\n    margin-top: auto;\n  }\n\n  .details-btn:hover {\n    opacity: 1;\n    border-color: var(--plg-accent);\n    background: rgba(79,195,247,0.07);\n  }\n\n  .card-footer {\n    padding: 14px 22px;\n    border-top: 1px solid var(--plg-border);\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 10px;\n  }\n\n  .download-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    padding: 9px 18px;\n    background: linear-gradient(135deg, var(--plg-accent2), var(--plg-accent3));\n    color: #fff;\n    text-decoration: none;\n    border-radius: 6px;\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    font-weight: 700;\n    letter-spacing: 0.04em;\n    transition: opacity 0.2s, transform 0.15s;\n  }\n\n  .download-btn:hover { opacity: 0.9; transform: scale(1.03); }\n  .download-btn svg { flex-shrink: 0; }\n\n  .no-installer {\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    color: var(--plg-text-dim);\n  }\n\n  /* ── Modal ── */\n  #modal-overlay {\n    display: none;\n    position: fixed;\n    inset: 0;\n    z-index: 1000;\n    background: rgba(4, 8, 16, 0.85);\n    backdrop-filter: blur(6px);\n    -webkit-backdrop-filter: blur(6px);\n    align-items: center;\n    justify-content: center;\n    padding: 24px;\n  }\n\n  #modal-overlay.open {\n    display: flex;\n    animation: overlayIn 0.2s ease;\n  }\n\n  @keyframes overlayIn {\n    from { opacity: 0; }\n    to   { opacity: 1; }\n  }\n\n  #modal {\n    background: var(--plg-surface);\n    border: 1px solid rgba(79,195,247,0.3);\n    border-radius: 16px;\n    width: 100%;\n    max-width: 740px;\n    max-height: 90vh;\n    display: flex;\n    flex-direction: column;\n    box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(79,195,247,0.1);\n    animation: modalIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);\n    overflow: hidden;\n  }\n\n  @keyframes modalIn {\n    from { opacity: 0; transform: scale(0.93) translateY(10px); }\n    to   { opacity: 1; transform: scale(1) translateY(0); }\n  }\n\n  .modal-image-wrap {\n    position: relative;\n    flex-shrink: 0;\n  }\n\n  #modal-image {\n    width: 100%;\n    height: 240px;\n    object-fit: cover;\n    display: block;\n    border-bottom: 1px solid var(--plg-border);\n  }\n\n  .modal-image-placeholder {\n    width: 100%;\n    height: 160px;\n    background: linear-gradient(135deg, var(--plg-surface2) 0%, #0a1829 100%);\n    border-bottom: 1px solid var(--plg-border);\n    display: flex;\n    align-items: center;\n    justify-content: center;\n  }\n\n  .modal-image-placeholder svg {\n    width: 56px;\n    height: 56px;\n    opacity: 0.2;\n  }\n\n  .modal-close {\n    position: absolute;\n    top: 14px;\n    right: 14px;\n    width: 32px;\n    height: 32px;\n    background: rgba(8,12,20,0.7);\n    border: 1px solid var(--plg-border);\n    border-radius: 50%;\n    color: var(--plg-text-dim);\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    transition: color 0.2s, border-color 0.2s;\n    font-size: 18px;\n    line-height: 1;\n    z-index: 2;\n  }\n\n  .modal-close:hover { color: var(--plg-text-bright); border-color: var(--plg-accent); }\n\n  .modal-body {\n    padding: 28px 32px;\n    overflow-y: auto;\n    flex: 1;\n  }\n\n  .modal-body::-webkit-scrollbar { width: 5px; }\n  .modal-body::-webkit-scrollbar-track { background: transparent; }\n  .modal-body::-webkit-scrollbar-thumb { background: var(--plg-border); border-radius: 3px; }\n\n  .modal-name {\n    font-size: 1.5rem;\n    font-weight: 800;\n    color: var(--plg-text-bright);\n    letter-spacing: -0.02em;\n    margin-bottom: 4px;\n  }\n\n  .modal-author {\n    font-family: 'Space Mono', monospace;\n    font-size: 12px;\n    color: var(--plg-accent);\n    letter-spacing: 0.05em;\n    margin-bottom: 14px;\n  }\n\n  .modal-tags {\n    display: flex;\n    flex-wrap: wrap;\n    gap: 6px;\n    margin-bottom: 20px;\n  }\n\n  .modal-short-desc {\n    font-size: 0.95rem;\n    color: var(--plg-text-bright);\n    font-style: italic;\n    margin-bottom: 20px;\n    padding-bottom: 20px;\n    border-bottom: 1px solid var(--plg-border);\n    line-height: 1.6;\n  }\n\n  .modal-section-label {\n    font-family: 'Space Mono', monospace;\n    font-size: 10px;\n    letter-spacing: 0.2em;\n    color: var(--plg-text-dim);\n    text-transform: uppercase;\n    margin-bottom: 10px;\n  }\n\n  .modal-long-desc {\n    font-size: 0.875rem;\n    line-height: 1.75;\n    color: var(--plg-text-dim);\n    white-space: pre-wrap;\n    word-break: break-word;\n  }\n\n  .modal-footer {\n    padding: 18px 32px;\n    border-top: 1px solid var(--plg-border);\n    display: flex;\n    align-items: center;\n    justify-content: space-between;\n    gap: 12px;\n    flex-shrink: 0;\n    background: var(--plg-surface2);\n  }\n\n  .modal-meta {\n    font-family: 'Space Mono', monospace;\n    font-size: 11px;\n    color: var(--plg-text-dim);\n    line-height: 1.8;\n  }\n\n  #empty {\n    display: none;\n    grid-column: 1/-1;\n    text-align: center;\n    padding: 80px 20px;\n  }\n\n  #empty.visible { display: block; }\n\n  #empty p {\n    font-family: 'Space Mono', monospace;\n    color: var(--plg-text-dim);\n    font-size: 14px;\n  }\n\n  ::-webkit-scrollbar { width: 6px; }\n  ::-webkit-scrollbar-track { background: var(--plg-bg); }\n  ::-webkit-scrollbar-thumb { background: var(--plg-border); border-radius: 3px; }"

    # ── Modal HTML ───────────────────────────────────────────────────────────
    MODAL = '<!-- Modal -->\n<div id="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">\n  <div id="modal">\n    <div class="modal-image-wrap">\n      <button class="modal-close" id="modal-close" aria-label="Close">&times;</button>\n      <div id="modal-img-container"></div>\n    </div>\n    <div class="modal-body">\n      <div class="modal-name" id="modal-title"></div>\n      <div class="modal-author" id="modal-author"></div>\n      <div class="modal-tags" id="modal-tags"></div>\n      <div class="modal-short-desc" id="modal-short-desc"></div>\n      <div class="modal-section-label">Full Description</div>\n      <div class="modal-long-desc" id="modal-long-desc"></div>\n    </div>\n    <div class="modal-footer">\n      <div class="modal-meta" id="modal-meta"></div>\n      <a id="modal-install-btn" class="download-btn" href="#" target="_blank" rel="noopener">\n        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">\n          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>\n          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>\n        </svg>\n        INSTALL\n      </a>\n    </div>\n  </div>\n</div>'

    # ── JS ───────────────────────────────────────────────────────────────────
    JS = '\nconst PLUGINS = __PLUGINS_JSON__;\n\nfunction esc(s) {\n  return (s||\'\').replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\').replace(/"/g,\'&quot;\');\n}\n\nfunction markdownToHtml(text) {\n  if (!text) return \'\';\n  const escaped = text\n    .replace(/&/g,\'&amp;\')\n    .replace(/</g,\'&lt;\')\n    .replace(/>/g,\'&gt;\');\n  return escaped\n    .replace(/\\[([^\\]]+)\\]\\((https?:\\/\\/[^)]+)\\)/g,\n      \'<a href="$2" target="_blank" rel="noopener noreferrer" style="color:var(--plg-accent);text-decoration:underline;text-underline-offset:3px;">$1</a>\')\n    .replace(/\\r\\n|\\r|\\n/g, \'<br>\');\n}\n\nfunction makePlaceholderEl(name) {\n  const div = document.createElement(\'div\');\n  div.className = \'card-image-placeholder\';\n  div.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:0.4">\n    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>\n    <polyline points="21 15 16 10 5 21"/>\n  </svg><span class="placeholder-name">${esc(name)}</span>`;\n  return div;\n}\n\nfunction buildCard(p, idx) {\n  const delay = (idx % 20) * 30;\n  const hasImage = p.featured_image && p.featured_image.trim() !== \'\';\n  const hasInstaller = p.installer_url && p.installer_url.trim() !== \'\';\n  const tags = (p.tags || []).slice(0, 5).map(t => `<span class="tag">${esc(t)}</span>`).join(\'\');\n\n  const imageHtml = hasImage\n    ? `<img class="card-image" src="${esc(p.featured_image)}" alt="${esc(p.name)}" loading="lazy">`\n    : `<div class="card-image-placeholder">\n        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">\n          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>\n          <polyline points="21 15 16 10 5 21"/>\n        </svg>\n        <span class="placeholder-name">${esc(p.name)}</span>\n      </div>`;\n\n  const shortDesc = p.short_desc ? `<div class="card-short-desc">${esc(p.short_desc)}</div>` : \'\';\n\n  const installerHtml = hasInstaller\n    ? `<a class="download-btn" href="${esc(p.installer_url)}" target="_blank" rel="noopener">\n        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">\n          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>\n          <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>\n        </svg>\n        INSTALL\n      </a>`\n    : `<span class="no-installer">// no installer</span>`;\n\n  return `\n    <div class="card" style="animation-delay:${delay}ms"\n         data-idx="${idx}"\n         data-name="${esc(p.name.toLowerCase())}"\n         data-author="${esc((p.author||\'\').toLowerCase())}"\n         data-tags="${esc((p.tags||[]).join(\' \').toLowerCase())}">\n      ${imageHtml}\n      <div class="card-body">\n        <div class="card-name">${esc(p.name)}</div>\n        <div class="card-author">${esc(p.author || \'Unknown\')}</div>\n        ${tags ? `<div class="card-tags">${tags}</div>` : \'\'}\n        <div class="card-version">v${esc(p.version)}</div>\n        ${shortDesc}\n        <button class="details-btn" onclick="openModal(${idx})">[ full details ]</button>\n      </div>\n      <div class="card-footer">\n        ${installerHtml}\n        <span class="card-version" style="margin:0">NINA 3.0+</span>\n      </div>\n    </div>`;\n}\n\n// Render cards\nconst grid = document.getElementById(\'grid\');\nPLUGINS.forEach((p, i) => grid.insertAdjacentHTML(\'beforeend\', buildCard(p, i)));\n\n// Fix broken images on cards\ngrid.querySelectorAll(\'.card-image\').forEach(img => {\n  img.addEventListener(\'error\', function() {\n    const placeholder = makePlaceholderEl(this.alt);\n    this.parentNode.replaceChild(placeholder, this);\n  });\n});\n\n// Modal logic\nconst overlay = document.getElementById(\'modal-overlay\');\nconst modalImgContainer = document.getElementById(\'modal-img-container\');\n\nfunction openModal(idx) {\n  const p = PLUGINS[idx];\n  const hasImage = p.featured_image && p.featured_image.trim() !== \'\';\n  const hasInstaller = p.installer_url && p.installer_url.trim() !== \'\';\n\n  modalImgContainer.innerHTML = \'\';\n  if (hasImage) {\n    const img = document.createElement(\'img\');\n    img.id = \'modal-image\';\n    img.src = p.featured_image;\n    img.alt = p.name;\n    img.onerror = function() {\n      const ph = document.createElement(\'div\');\n      ph.className = \'modal-image-placeholder\';\n      ph.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:56px;height:56px;opacity:0.2">\n        <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>\n        <polyline points="21 15 16 10 5 21"/>\n      </svg>`;\n      img.parentNode.replaceChild(ph, img);\n    };\n    modalImgContainer.appendChild(img);\n  } else {\n    const ph = document.createElement(\'div\');\n    ph.className = \'modal-image-placeholder\';\n    ph.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="width:56px;height:56px;opacity:0.2">\n      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>\n      <polyline points="21 15 16 10 5 21"/>\n    </svg>`;\n    modalImgContainer.appendChild(ph);\n  }\n\n  document.getElementById(\'modal-title\').textContent = p.name;\n  document.getElementById(\'modal-author\').textContent = p.author || \'Unknown\';\n\n  const tagsEl = document.getElementById(\'modal-tags\');\n  tagsEl.innerHTML = (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join(\'\');\n\n  document.getElementById(\'modal-short-desc\').textContent = p.short_desc || \'\';\n  document.getElementById(\'modal-long-desc\').innerHTML = markdownToHtml(p.long_desc || p.short_desc || \'No description available.\');\n\n  document.getElementById(\'modal-meta\').innerHTML =\n    `v${esc(p.version)}<br>NINA 3.0+ required`;\n\n  const installBtn = document.getElementById(\'modal-install-btn\');\n  if (hasInstaller) {\n    installBtn.href = p.installer_url;\n    installBtn.style.display = \'inline-flex\';\n  } else {\n    installBtn.style.display = \'none\';\n  }\n\n  overlay.classList.add(\'open\');\n  document.body.style.overflow = \'hidden\';\n  document.getElementById(\'modal-close\').focus();\n}\n\nfunction closeModal() {\n  overlay.classList.remove(\'open\');\n  document.body.style.overflow = \'\';\n}\n\ndocument.getElementById(\'modal-close\').addEventListener(\'click\', closeModal);\noverlay.addEventListener(\'click\', e => { if (e.target === overlay) closeModal(); });\ndocument.addEventListener(\'keydown\', e => { if (e.key === \'Escape\') closeModal(); });\n\n// Search\nconst searchEl = document.getElementById(\'search\');\nconst countEl  = document.getElementById(\'count\');\nconst emptyEl  = document.getElementById(\'empty\');\n\nsearchEl.addEventListener(\'input\', () => {\n  const q = searchEl.value.toLowerCase().trim();\n  const cards = grid.querySelectorAll(\'.card\');\n  let visible = 0;\n  cards.forEach(card => {\n    const match = !q ||\n      card.dataset.name.includes(q) ||\n      card.dataset.author.includes(q) ||\n      card.dataset.tags.includes(q);\n    card.style.display = match ? \'\' : \'none\';\n    if (match) visible++;\n  });\n  countEl.textContent = visible;\n  emptyEl.classList.toggle(\'visible\', visible === 0);\n});\n'

    return f"""---
layout: default
title: NINA Plugins
permalink: /nina-plugins/
nav_order: 3
generated: {generated_at}
---
<!-- Auto-generated by scripts/generate_nina_plugins.py on {generated_at} -->
<!-- Do not edit by hand — your changes will be overwritten on the next run. -->
<style>
/* Remove wrapper max-width constraint for this full-width page */
.page-content > .wrapper {{
  max-width: none;
  padding: 0;
}}

.plugin-page-header {{
  max-width: 1400px;
  margin: 0 auto;
  padding: 48px 40px 36px;
  border-bottom: 1px solid var(--plg-border);
}}

.plugin-site-label {{
  font-family: 'Space Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.3em;
  color: var(--plg-accent);
  text-transform: uppercase;
  margin-bottom: 14px;
  opacity: 0.8;
}}

.plugin-page-header h1 {{
  font-size: clamp(2rem, 4vw, 3.5rem) !important;
  font-weight: 800 !important;
  color: var(--plg-text-bright) !important;
  line-height: 1 !important;
  letter-spacing: -0.03em !important;
  margin-bottom: 14px !important;
  border: none !important;
  padding: 0 !important;
  margin-top: 0 !important;
}}

.plugin-page-header h1 span {{ color: var(--plg-accent); }}

.plugin-subtitle {{
  font-family: 'Space Mono', monospace;
  font-size: 13px;
  color: var(--plg-text-dim);
  margin-bottom: 28px;
}}

.plugin-grid-wrap {{
  max-width: 1400px;
  margin: 0 auto;
  padding: 36px 40px 80px;
}}

.plugin-intro {{
  font-size: 0.95rem;
  color: var(--plg-text-dim);
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--plg-border);
}}

.generated-note {{
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  color: var(--plg-text-dim);
  opacity: 0.5;
  margin-top: 8px;
}}

{STYLE}
</style>

<div id="plugin-page">
  <div class="plugin-page-header">
    <div class="plugin-site-label">&#9733; N.I.N.A. Nighttime Imaging &lsquo;N&rsquo; Astronomy</div>
    <h1>Plugin <span>Directory</span></h1>
    <p class="plugin-subtitle">// Requires NINA 3.0+ &mdash; {count} plugins available, current as of {generated_friendly}</p>
    <div class="controls">
      <div class="search-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input id="search" type="text" placeholder="Search plugins, authors, tags...">
      </div>
      <div class="count-badge">Showing <span id="count">{count}</span> plugins</div>
    </div>
    <p class="generated-note">// Last updated: {generated_at}</p>
  </div>

  <div class="plugin-grid-wrap">
    <p class="plugin-intro">This is a current list of available plugins for NINA version 3.0. It is updated weekly.</p>
    <div id="grid"></div>
    <div id="empty"><p>// No plugins match your search.</p></div>
  </div>
</div>

{MODAL}

<script>
{JS.replace("__PLUGINS_JSON__", plugins_json)}
</script>
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=== NINA Plugin Page Generator ===")

    # Use a temp dir for the manifest clone so we don't litter the workspace
    tmpdir = Path(tempfile.mkdtemp(prefix="nina_manifests_"))
    try:
        clone_or_update(MANIFEST_REPO, tmpdir)
        manifests_dir = tmpdir / "manifests"

        print("  Parsing manifests …")
        plugins = parse_manifests(manifests_dir)
        print(f"  Found {len(plugins)} plugins (NINA {MIN_NINA_MAJOR}.0+)")

        print(f"  Writing → {OUTPUT_PATH}")
        OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT_PATH.write_text(build_page(plugins), encoding="utf-8")
        print("  Done ✓")

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
