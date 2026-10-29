#!/usr/bin/env python3
"""Copy the Visibility Atlas from the lab's publish set into atlas/, ready to serve from this site.

Run from the site folder:  python3 -I tools/import_atlas.py [path to the lab's motion/publish]

The lab builds the publish set with motion/tools/publish-set.py, which checks the data (no identifier keys,
names only for firms on the five lists). This script copies only what the atlas page loads, never the
explainer's rasters, and changes one thing: claude.ai wraps every page in a document skeleton when it
publishes, so the copy gets the same skeleton (doctype, UTF-8, viewport). Without it a browser reads the
page in quirks mode and the scripts as Latin-1. It then checks that every script the page names is present.
"""
import pathlib
import re
import shutil
import sys

LAB_PUBLISH = (pathlib.Path.home() / "Documents/PhD/CGU/Dissertation/00 Full Dissertation"
               / "Claude Code/current/dataviz-lab/motion/publish")
SITE = pathlib.Path(__file__).resolve().parent.parent
DEST = SITE / "atlas"
SCRIPTS = ["motion-core", "map-layers", "charts", "pixel-field", "agent-guide", "explorer-app"]
SKELETON = ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="author" content="Armen G. Kaprelian">\n'
            '<link rel="icon" href="../favicon.svg" type="image/svg+xml">\n')   # the lab source's own head lines, which publish-set.py strips


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else LAB_PUBLISH
    page = (src / "explorer.html").read_text(encoding="utf-8")
    assert not page.lstrip().lower().startswith("<!doctype"), "the publish set's page already has a skeleton"

    if DEST.exists():
        shutil.rmtree(DEST)
    (DEST / "js").mkdir(parents=True)
    (DEST / "data").mkdir()
    (DEST / "index.html").write_text(SKELETON + page, encoding="utf-8")
    shutil.copy2(src / "agent-guide.md", DEST)
    shutil.copytree(src / "fonts", DEST / "fonts")
    for name in SCRIPTS:
        shutil.copy2(src / "js" / f"{name}.js", DEST / "js")

    # The data the atlas loads: the twins its page and scripts name, and the address files it fetches by year (.bin.gz since round 21).
    code = page + "".join((src / "js" / f"{n}.js").read_text(encoding="utf-8") for n in SCRIPTS)
    for f in sorted((src / "data").glob("*.js")):
        stem = f.stem
        if f"data/{f.name}" in code or f"'{stem}'" in code or f'"{stem}"' in code:
            shutil.copy2(f, DEST / "data")
    shutil.copytree(src / "data" / "firms", DEST / "data" / "firms")

    missing = [s for s in re.findall(r'<script[^>]+src="([^"]+)"', page) if not (DEST / s).exists()]
    assert not missing, f"scripts the page names are missing: {missing}"
    files = [p for p in DEST.rglob("*") if p.is_file()]
    print(f"atlas imported: {len(files)} files, {sum(p.stat().st_size for p in files) / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
