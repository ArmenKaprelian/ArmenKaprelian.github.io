# armenkaprelian.github.io

Armen G. Kaprelian's personal site: a home page, the Visibility Atlas, the film *Who stays visible?*, and short subpages.
Plain HTML, one stylesheet and three small scripts. Nothing is built or installed: what is in this folder is what the site serves.
Served by GitHub Pages from the public repository `ArmenKaprelian.github.io` since 29 October 2026.

## What is where

| Path | What it is |
|---|---|
| `index.html` | The home page: the image panel with the data stream at the left, the name, the two bio lines, the headshot and the numbered menu at the right. |
| `css/site.css` | The only stylesheet. Colours and type are the atlas's tokens. `--split` sets the image panel's share of the width. |
| `js/stream.js` | The data stream over the home image. Its speeds, strengths and reach are the constants at its top. |
| `js/stream-data.js` | The stream's lines. Generated: run `python3 -I tools/stream_data.py`. |
| `js/film.js` | The film page's chapter list: a chapter starts the film there, and the chapter playing shows in green. |
| `img/` | The home photo (`home-pipeline-1982.webp`) and the headshot (`headshot.jpg`, a square crop of the original). |
| `film/` | The film page: the 287 s cut with its chapter list and the 46 s teaser (720p, both players the window's width), and their poster frames. The 287 s file is encoded from the lab's 1080p render (x264 CRF 23, preset slow, `-movflags +faststart`) with a keyframe forced at every chapter start, so a chapter jump decodes nothing before its frame; the teaser is the lab's 720p copy. Both players load only the file's index before play (`preload="metadata"`), so the bar works before playback starts. |
| `atlas/` | The Visibility Atlas. Generated: run `python3 -I tools/import_atlas.py` after the lab builds its publish set. Never edit files here. |
| `resume/` | The résumé PDF. The home link adds `#view=Fit&zoom=page-fit`, so Chrome, Brave, Edge and Firefox open it with the whole page in view; Safari ignores the parameters, and on a phone the page fits the screen's width anyway. |
| `research/`, `writing/`, `contact/` | Subpages: one column, the HOME link at the bottom. |
| `favicon.svg`, `favicon-32.png`, `favicon.ico`, `apple-touch-icon.png` | The atlas mark in the reading green on the navy. |

## Common changes

- **Bio text, menu, image caption:** edit `index.html`.
- **Film chapters:** the list in `film/index.html` follows the explainer's chapters for the full cut. A new cut needs new times there and its keyframes forced at them (`-force_key_frames` with the start times in seconds).
- **A new menu item and page:** add an `<li>` to the `<ol class="menu">` in `index.html`, then copy `writing/` to a new folder and change its title and text. The numbers follow the order of the list.
- **A new résumé:** replace `resume/kaprelian-resume.pdf`, keeping the name. The published copy leaves out the phone number: the current one is the 30 July 2026 PDF with the number's text removed from the file itself (not covered) and the line re-centred, identical elsewhere pixel for pixel. For a new one, drop the phone line from the Overleaf source before exporting.
- **The atlas after a lab publish:** in the lab, build the publish set (`motion/tools/publish-set.py`), then run `python3 -I tools/import_atlas.py` here. It copies only what the atlas loads and adds the document skeleton claude.ai adds on its own host.
- **The stream's figures after a new data release:** run `python3 -I tools/stream_data.py`.

## Rules carried over from the atlas

The atlas's design rules (`dataviz-lab/design/principles.md`) apply: IBM Plex Mono only, the navy stage, fuchsia for what you act on and green for what you read, squared corners, no em-dashes or semicolons on screen. Every figure in the stream comes from the atlas's checked series file. Under reduced motion the stream draws one still frame.

## Phones and Safari

Every page sets `viewport-fit=cover` and pads by the safe-area insets (`--safe-l`, `--safe-r`, `--safe-b` in `css/site.css`), so nothing sits under the notch or the home indicator. The home page's full-height panel uses `100dvh` with `100vh` before it for older browsers. `-webkit-text-size-adjust` stops iOS from enlarging text on rotation. Hover states apply only where the device can hover; a tap shows the live colour while the finger is down. The stream follows a mouse or a pen, never a finger. The film plays inline (`playsinline`). Checked at 375 px: no page scrolls sideways.

## Image credits

- Home: Soviet pipeline workers on the Urengoy–Pomary–Uzhgorod pipeline, 1982. The photographer and the rights holder are not yet identified.
- Headshot: the author's own photo, cropped only.
- Film and atlas data: RFSD v3.1.0 (Bondarkov et al. 2025, CC BY 4.0).
