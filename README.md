# armenkaprelian.github.io

Armen G. Kaprelian's personal site: a home page, the Visibility Atlas, the film *Who stays visible?*, and short subpages.
Plain HTML, one stylesheet and four small scripts. Nothing is built or installed: what is in this folder is what the site serves.
Served by GitHub Pages from the public repository `ArmenKaprelian.github.io` since 29 October 2026.

## What is where

| Path | What it is |
|---|---|
| `index.html` | The home page, layout A "Index" (29 October 2026): the image panel with the data stream and the photo at the left; the name, the headshot beside the bio, and the seven-row index at the right. The photo's top edge is the index's top rule, and the top block sits on the stream's 22 px rows. Below 1200 px wide or 600 px tall (phones, tablets, phones in landscape) the page stacks: the name, the bio and the index first, the stream and the photo below. On screens up to 1400 by 860 px the headshot stays at 132 px so the bio fits above the index. |
| `css/site.css` | The only stylesheet. Colours and type are the atlas's tokens. `--split` sets the image panel's share of the width; `--band` (the photo's and the index's height) is 0.7 of the panel's width, so it changes with `--split`. |
| `js/stream.js` | The data stream over the home image. Its speeds, strengths and reach are the constants at its top. |
| `js/stream-data.js` | The stream's lines. Generated: run `python3 -I tools/stream_data.py`. |
| `js/home.js` | The home page's pointer effects: the slogan's translation card over the photo (on a phone, a tap) and the preview of each index row's page in the photo's frame. |
| `js/film.js` | The film page's chapter list: a chapter starts the film there, and the chapter playing shows in green. |
| `img/` | The home photo (`home-pipeline-1982.webp`), the headshot (`headshot.jpg`, a square crop of the original), and the index's three preview pictures (`preview-atlas.webp`, `preview-film.webp`, `preview-resume.webp`, 1000 by 700). The pages without a picture show title cards written in `index.html`. |
| `film/` | The film page: the 287 s cut, as large as leaves the title and the whole chapter list in one screen, with the chapter list beneath it, and its poster frame (the teaser was taken off the site on 29 October 2026). The 287 s file is encoded from the lab's 1080p render (x264 CRF 23, preset slow, `-movflags +faststart`) with a keyframe forced at every chapter start, so a chapter jump decodes nothing before its frame. The player loads only the file's index before play (`preload="metadata"`), so the bar works before playback starts (iOS Safari loads nothing until play is tapped). |
| `atlas/` | The Visibility Atlas. Generated: run `python3 -I tools/import_atlas.py` after the lab builds its publish set. Never edit files here. |
| `resume/` | The résumé PDF. The home link adds `#view=Fit&zoom=page-fit`, so Chrome, Brave, Edge and Firefox open it with the whole page in view; Safari ignores the parameters, and on a phone the page fits the screen's width anyway. |
| `research/`, `writing/`, `contact/` | Subpages: one column, the HOME link at the bottom. |
| `favicon.svg`, `favicon-32.png`, `favicon.ico`, `apple-touch-icon.png` | The atlas mark in the reading green on the navy. |

## Common changes

- **Bio text, index, image caption, slogan card:** edit `index.html`. An index row is an `<a>` with a `data-k` key; its preview is the `.pv` element and the caption `<span>` with the same key (and the key in the two selector lists in `css/site.css`).
- **The preview pictures:** after the atlas, the film or the résumé changes, remake its picture at 1000 by 700. The atlas: a 1500 by 1050 screenshot (the lab's `motion/tools/page-probe.py --url .../atlas/ --width 1500 --height 1050 --wait 6 --shot`), scaled down. The film: `poster.jpg` cut to 10 by 7 from the left. The résumé: page 1 at 200 dpi (`pdftoppm`), the top 1700 by 1190 px, scaled and brought to 80 percent brightness (`-modulate 80`) so the page does not flash white on the dark site.
- **Film chapters:** the list in `film/index.html` follows the explainer's chapters for the full cut. A new cut needs new times there and its keyframes forced at them (`-force_key_frames` with the start times in seconds).
- **A new index row and page:** add a row to the `<nav class="index">` in `index.html` (number, page, note), change the `7` in `.index`'s `repeat(7, ...)` in `css/site.css`, then copy `writing/` to a new folder and change its title and text.
- **A new résumé:** replace `resume/kaprelian-resume.pdf`, keeping the name. The published copy leaves out the phone number: the current one is the 30 July 2026 PDF with the number's text removed from the file itself (not covered) and the line re-centred, identical elsewhere pixel for pixel. For a new one, drop the phone line from the Overleaf source before exporting.
- **The atlas after a lab publish:** in the lab, build the publish set (`motion/tools/publish-set.py`), then run `python3 -I tools/import_atlas.py` here. It copies only what the atlas loads and adds the document skeleton claude.ai adds on its own host.
- **The stream's figures after a new data release:** run `python3 -I tools/stream_data.py`.
- **Before every push:** run the lab's check in both engines, `python3 -I motion/tools/site-check.py` in the dataviz lab (about 45 s). It loads every page in Chromium and in WebKit (Safari's engine family) at phone, tablet, laptop and desktop sizes and must report zero findings. WebKit here is not iOS, so after a push that changes a page's layout, look at it once on an iPhone too.

## Rules carried over from the atlas

The atlas's design rules (`dataviz-lab/design/principles.md`) apply: IBM Plex Mono only, the navy stage, fuchsia for what you act on and green for what you read, squared corners, no em-dashes or semicolons on screen. Every figure in the stream comes from the atlas's checked series file. Under reduced motion the stream draws one still frame.

## Phones and Safari

Every page sets `viewport-fit=cover` and pads by the safe-area insets (`--safe-l`, `--safe-r`, `--safe-b` in `css/site.css`), so nothing sits under the notch or the home indicator. The home page's full-height panel uses `100dvh` with `100vh` before it for older browsers. `-webkit-text-size-adjust` stops iOS from enlarging text on rotation. Hover states apply only where the device can hover; a tap shows the live colour while the finger is down. The stream follows a mouse or a pen, never a finger; on a phone a tap on the photo shows the slogan's card. The film plays inline (`playsinline`). Checked at 375 px: no page scrolls sideways. On 29 October 2026 the home page was also checked at phone and tablet sizes in both orientations and at seven laptop and desktop sizes, and rendered in WebKitGTK 2.52 (Safari's engine family) beside Chromium: the same layout, no script errors.

## Image credits

- Home: Soviet pipeline workers on the Urengoy–Pomary–Uzhgorod pipeline, 1982. The photographer and the rights holder are not yet identified.
- Headshot: the author's own photo, cropped only.
- Film and atlas data: RFSD v3.1.0 (Bondarkov et al. 2025, CC BY 4.0).
