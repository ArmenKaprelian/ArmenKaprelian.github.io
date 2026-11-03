#!/usr/bin/env python3
"""Validate or import an explicitly named atlas publish set.

  python3 -B -I tools/import_atlas.py SOURCE --check
  python3 -B -I tools/import_atlas.py SOURCE --write

--check (the default) validates asset closure without writing files. --write stages
and validates the import before replacing atlas/. The previous atlas is retained
outside the public site in ../import-backups/ (or --backup-dir). No Git command runs.
The publish set must already have passed publish-set.py's data/privacy checks.
"""
import argparse
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import unquote, urlsplit

SITE = Path(__file__).resolve().parent.parent
SCRIPTS = ['motion-core', 'map-layers', 'charts', 'pixel-field', 'agent-guide', 'explorer-app']
SKELETON = ('<!doctype html>\n<html lang="en">\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="author" content="Armen G. Kaprelian">\n'
            '<link rel="icon" href="../favicon.svg" type="image/svg+xml">\n')


class PageAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'img', 'source', 'video', 'audio', 'iframe') and attrs.get('src'):
            self.refs.append(attrs['src'])
        if tag == 'video' and attrs.get('poster'):
            self.refs.append(attrs['poster'])
        if tag == 'link' and attrs.get('href'):
            self.refs.append(attrs['href'])


def local_ref(value):
    url = urlsplit(unquote(value))
    if url.scheme or url.netloc or not url.path:
        return None
    return url.path


def within(root, relative):
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f'asset leaves its root: {relative}')
    if not path.is_file():
        raise ValueError(f'missing asset: {relative}')
    return path


def references(name, text):
    refs = []
    if name.endswith('.html'):
        parser = PageAssets()
        parser.feed(text)
        refs.extend(parser.refs)
    # Inline styles and CSS files, including locally served fonts.
    refs.extend(re.findall(r'url\(\s*[\'\"]?([^\s\)\'\"]+)', text))
    if name.endswith('.js'):
        # Atlas lazy loaders use literal document-relative paths; annual binaries
        # are resolved separately from the firms manifest below.
        refs.extend(re.findall(r'''["'`](\b(?:data|js|fonts|css)/[^"'`\s]+)["'`]''', text))
    return [ref for value in refs if (ref := local_ref(value)) is not None]


def asset_plan(root, page, site):
    """Resolve the atlas's loaded files and manifest-addressed annual binaries."""
    required = {'agent-guide.md', 'data/firms.js', *(f'js/{name}.js' for name in SCRIPTS)}
    fonts = root / 'fonts'
    if not fonts.is_dir():
        raise ValueError('missing fonts directory')
    required.update(str(p.relative_to(root)) for p in fonts.rglob('*') if p.is_file())
    queue = [('index.html', page)]
    scanned = set()
    while queue or required - scanned:
        if queue:
            name, text = queue.pop()
        else:
            name = sorted(required - scanned)[0]
            path = within(root, name)
            scanned.add(name)
            if path.suffix not in ('.js', '.css', '.html'):
                continue
            text = path.read_text(encoding='utf-8')
        for ref in references(name, text):
            # Root navigation is not copied. The skeleton's one site-level asset
            # is validated against the destination site, never against an archive.
            if ref == '../favicon.svg' and name == 'index.html':
                within(site, 'favicon.svg')
                continue
            base = Path(name).parent if name.endswith('.css') else Path('.')
            path = within(root, str(base / ref))
            required.add(str(path.relative_to(root)))
    manifest_text = within(root, 'data/firms.js').read_text(encoding='utf-8')
    match = re.search(r'window\.MOTION_DATA(?:\["firms"\]|\.firms)\s*=\s*', manifest_text)
    if not match:
        raise ValueError('cannot read the firms data twin')
    manifest = json.loads(manifest_text[match.end():].strip().removesuffix(';'))
    if set(map(str, manifest['years'])) != set(manifest['files']):
        raise ValueError('firms manifest years and annual files differ')
    for name in [manifest['coords']['file'], *manifest['files'].values()]:
        if not name.startswith('firms/'):
            raise ValueError(f'firm address file is outside data/firms: {name}')
        path = within(root, 'data/' + name)
        required.add(str(path.relative_to(root)))
    return sorted(required)


def import_atlas(source, site=SITE, write=False, backup_dir=None):
    source, site = Path(source).resolve(), Path(site).resolve()
    dest = site / 'atlas'
    if dest.is_symlink() or (dest.exists() and not dest.is_dir()):
        raise ValueError('atlas destination must be a directory, not a link or file')
    page = (source / 'explorer.html').read_text(encoding='utf-8')
    if page.lstrip().lower().startswith('<!doctype'):
        raise ValueError('publish-set page already has a document skeleton')
    page = SKELETON + page
    files = asset_plan(source, page, site)
    result = {'files': len(files) + 1, 'bytes': len(page.encode()) + sum((source / name).stat().st_size for name in files), 'backup': None}
    if not write:
        return result
    backups = Path(backup_dir).resolve() if backup_dir else site.parent / 'import-backups'
    if backups.is_relative_to(site):
        raise ValueError('backup directory must be outside the public site')
    stage = Path(tempfile.mkdtemp(prefix='.atlas-stage-', dir=site.parent))
    previous = None
    try:
        (stage / 'index.html').write_text(page, encoding='utf-8')
        for name in files:
            target = stage / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source / name, target)
        if asset_plan(stage, (stage / 'index.html').read_text(encoding='utf-8'), site) != files:
            raise ValueError('staged asset closure differs from the checked source')
        if dest.exists():
            backups.mkdir(parents=True, exist_ok=True)
            previous = Path(tempfile.mkdtemp(prefix='atlas-', dir=backups))
            previous.rmdir()  # This empty directory was allocated by this invocation.
            dest.rename(previous)
        try:
            stage.rename(dest)
        except BaseException:
            if previous is not None:
                previous.rename(dest)
            raise
        result['backup'] = str(previous) if previous else None
        return result
    finally:
        if stage.exists():
            shutil.rmtree(stage)  # Only this invocation's staging directory.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='publish set already checked by publish-set.py')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--check', action='store_true', help='validate without writing (default)')
    mode.add_argument('--write', action='store_true', help='stage, validate and replace atlas/')
    parser.add_argument('--backup-dir', type=Path, help='recovery directory outside the public site')
    args = parser.parse_args()
    try:
        result = import_atlas(args.source, write=args.write, backup_dir=args.backup_dir)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        parser.exit(1, f'atlas import refused: {exc}\n')
    print(f"atlas {'imported' if args.write else 'checked; nothing written'}: {result['files']} files, {result['bytes'] / 1e6:.1f} MB")
    if result['backup']:
        print('previous atlas retained: ' + result['backup'])


if __name__ == '__main__':
    main()
