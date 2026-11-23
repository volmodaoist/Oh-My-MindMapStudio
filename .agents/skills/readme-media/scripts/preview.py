"""Build a local Markdown preview with GIF assets. Requires Python Markdown."""
from __future__ import annotations

import argparse
import html
import shutil
from pathlib import Path

import markdown
from markdown.extensions.toc import slugify_unicode

ROOT = Path(__file__).resolve().parents[5]
PAGES = {
    "README.md": "index.html",
    "README.zh-CN.md": "zh.html",
    "docs/user-guide.md": "docs/user-guide.html",
    "docs/user-guide.zh-CN.md": "docs/user-guide.zh-CN.html",
    "docs/community.md": "docs/community.html",
}
STYLE = """
:root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#252a34;font:16px/1.75 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
nav{position:sticky;top:0;background:#ffffffee;border-bottom:1px solid #e5e7eb;padding:12px 24px;z-index:1;display:flex;gap:20px;align-items:center;font-size:14px}nav span{margin-right:auto;color:#757b86}
main{max-width:1104px;margin:32px auto 64px;padding:40px 48px;background:white;border:1px solid #e5e7eb;border-radius:12px}h1{font-size:32px;line-height:1.3;margin-top:0}h2{font-size:24px;border-bottom:1px solid #e7e9ed;padding-bottom:8px;margin-top:36px}h3{font-size:19px;line-height:1.5}a{color:#4964af;text-decoration:none}a:hover{text-decoration:underline}p{margin:16px 0}li{margin:5px 0}img{max-width:100%;height:auto}p:has(img[src$='.gif']) img{display:block;border:1px solid #e5e7eb;border-radius:8px}
code{font-size:.87em;background:#f2f4f7;border-radius:4px;padding:2px 5px}pre{overflow:auto;background:#f5f7fa;border:1px solid #e5e7eb;border-radius:8px;padding:18px;line-height:1.55}pre code{padding:0;background:none}table{border-collapse:collapse;width:100%;font-size:14px}th,td{border:1px solid #e2e6ec;padding:8px 12px;text-align:left}th{background:#f6f8fa}blockquote{border-left:3px solid #d7ddea;margin-left:0;padding-left:16px;color:#6a7280}
details{border:1px solid #e5e7eb;border-radius:8px;padding:10px 14px;margin:14px 0}summary{cursor:pointer;color:#4964af;font-size:14px}details img{display:block;margin-top:12px;border:1px solid #e5e7eb;border-radius:6px}
@media(max-width:720px){main{margin:0;border:0;border-radius:0;padding:24px 18px}nav{padding:10px 18px}h1{font-size:27px}table{display:block;overflow:auto}}
"""


def build(destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / "assets", destination / "assets", dirs_exist_ok=True)
    for source, output in PAGES.items():
        text = (ROOT / source).read_text()
        # Preserve relative paths while changing previewable Markdown targets to HTML.
        for path in PAGES:
            filename = Path(path).name
            replacement = Path(PAGES[path]).name
            text = text.replace(filename + ")", replacement + ")")
        body = markdown.markdown(text, extensions=["tables", "fenced_code", "sane_lists", "toc"],
                                 extension_configs={"toc": {"slugify": slugify_unicode}})
        relative_root = "../" if output.startswith("docs/") else ""
        title = "Oh-My-Mindmap-Studio · Obsidian 思维导图 / Mind Map Plugin"
        page = f"""<!doctype html><html lang="{'zh-CN' if 'zh' in output else 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Obsidian mind map plugin, Markdown mindmap editing, wikilink completion, Mermaid, TikZJax and Beyond-CodeTab."><title>{html.escape(title)}</title><style>{STYLE}</style></head><body><nav><span>Local README preview · 未提交预览</span><a href="{relative_root}index.html">English</a><a href="{relative_root}zh.html">简体中文</a></nav><main>{body}</main></body></html>"""
        target = destination / output
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(page)
    # Reference links outside the preview pages resolve to repository files served locally.
    for path in (ROOT / "docs").glob("*.md"):
        if str(path.relative_to(ROOT)) not in PAGES:
            shutil.copy2(path, destination / "docs" / path.name)
    for name in ["LICENSE", "Makefile"]:
        shutil.copy2(ROOT / name, destination / name)
    (destination / "vendor").mkdir(exist_ok=True)
    shutil.copy2(ROOT / "vendor/THIRD-PARTY-NOTICES.md", destination / "vendor/THIRD-PARTY-NOTICES.md")
    (destination / "docs/agents").mkdir(exist_ok=True)
    shutil.copy2(ROOT / "docs/agents/process.md", destination / "docs/agents/process.md")
    print(destination / "index.html")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("/tmp/mindmap-readme-preview"))
    build(parser.parse_args().output)
