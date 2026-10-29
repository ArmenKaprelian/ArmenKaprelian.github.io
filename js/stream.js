/* The home page's data stream. Rows of figures from the atlas's series (js/stream-data.js, generated) drift slowly
   leftward over the image panel, dimmed so the image stays visible. Under the pointer, the stream is read one figure at
   a time: the figure under the pointer shows in the reading green, fading in over 0.2 s and out over 0.6 s, while its
   row keeps drifting (the author's pick of 29 October 2026). One canvas at about 30 frames a second, paused while the
   panel is off screen or the tab is hidden. Under reduced motion it draws one still frame and runs no loop.
   Only what shows is drawn: a row behind the photo (which has no transparency) is skipped, or drawn only left of the
   photo where the photo is narrower than the panel; a row's text is drawn into its strip the first time the row shows,
   and its green strip the first time the pointer reads one of its figures. The rows are laid out once, after the font
   loads, and a resize only adds rows. */
(function () {
  const panel = document.querySelector('.visual');
  const canvas = panel && panel.querySelector('canvas.stream');
  const photo = panel && panel.querySelector('.photo');
  const ITEMS = window.STREAM_ITEMS || [];
  if (!canvas || !ITEMS.length) return;

  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);
  const INK = root.getPropertyValue('--ink').trim() || '#ECEEF1';
  const GREEN = root.getPropertyValue('--context').trim() || '#4DFF7F';
  const SIZE = 11, PITCH = 22, TRACK = 0.88;            // 11 px Plex Mono, rows 22 px apart, 8 percent tracking
  const FONT = `500 ${SIZE}px "IBM Plex Mono", monospace`;
  const GAP = 34, MARK = 8;                              // the space between items and the mark in it
  const READ_LIFT = 0.55;                                // how far the figure under the pointer rises above its row's strength
  const FADE_IN = 0.2, FADE_OUT = 0.6;                   // seconds
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0, H = 0, dpr = 1, rows = [], raf = 0, last = 0, prev = 0, onScreen = true, ready = false;
  let coverTop = Infinity, coverLeft = 0;                // the photo's top and left edges in the panel
  const t0 = performance.now();
  const ptr = { x: -999, y: -999, on: false };
  let read = [];                                         // the figure read under the pointer and the ones fading after it: {row, i, k, g}

  // A seeded generator, so the stream is laid out the same way on every load.
  let seed = 20261028;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const meter = document.createElement('canvas').getContext('2d');
  function setFont(g) { g.font = FONT; if ('letterSpacing' in g) g.letterSpacing = TRACK + 'px'; }

  // The next row: six items in a seeded order, their widths and starts, and the row's own drift and strength.
  function addRow() {
    const order = ITEMS.map(s => [rnd(), s]).sort((a, b) => a[0] - b[0]).map(p => p[1]).slice(0, 6);
    setFont(meter);
    const widths = order.map(s => Math.ceil(meter.measureText(s).width));
    const starts = []; let w = 0;
    for (const v of widths) { starts.push(w); w += v + GAP; }
    const row = {
      y: PITCH / 2 + 4 + rows.length * PITCH, order, widths, starts, w, ink: null, green: null,
      off: rnd() * w,
      speed: 6 + rnd() * 12,          // px per second
      alpha: 0.07 + rnd() * 0.11,     // resting strength: dim, so the image shows through
    };
    rnd();                            // the row's depth for the pointer's parallax, since removed: drawn so the layout stays the same
    rows.push(row);
  }

  // One row's text drawn once into an offscreen strip in one colour, items separated by the atlas mark.
  function strip(r, colour) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    c.width = Math.ceil(r.w * dpr); c.height = Math.ceil(PITCH * dpr);
    g.scale(dpr, dpr); setFont(g);
    g.fillStyle = colour; g.strokeStyle = colour; g.textBaseline = 'middle'; g.lineWidth = 1.2;
    let x = 0;
    r.order.forEach((s, i) => {
      g.fillText(s, x, PITCH / 2);
      x += r.widths[i];
      const mx = x + (GAP - MARK) / 2, my = PITCH / 2 - MARK / 2, a = 2.2;   // the mark: four corner brackets and a dot
      g.beginPath();
      g.moveTo(mx, my + a); g.lineTo(mx, my); g.lineTo(mx + a, my);
      g.moveTo(mx + MARK - a, my); g.lineTo(mx + MARK, my); g.lineTo(mx + MARK, my + a);
      g.moveTo(mx + MARK, my + MARK - a); g.lineTo(mx + MARK, my + MARK); g.lineTo(mx + MARK - a, my + MARK);
      g.moveTo(mx + a, my + MARK); g.lineTo(mx, my + MARK); g.lineTo(mx, my + MARK - a);
      g.stroke(); g.fillRect(mx + MARK / 2 - 1, my + MARK / 2 - 1, 2, 2);
      x += GAP;
    });
    return c;
  }

  function build() {
    const r = panel.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    const d = Math.min(window.devicePixelRatio || 1, 2);
    if (d !== dpr) { dpr = d; for (const row of rows) row.ink = row.green = null; }   // strips are drawn at the screen's density
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    while (PITCH / 2 + 4 + rows.length * PITCH < H) addRow();
    const p = photo && photo.getBoundingClientRect();
    coverTop = p && p.height ? p.top - r.top : Infinity; coverLeft = p ? p.left - r.left : 0;
  }

  const shiftOf = (r, t) => -(r.off + r.speed * (reduce.matches ? 0 : t));   // the row's drift, unwrapped
  const same = (a, b) => a && b && a.row === b.row && a.i === b.i && a.k === b.k;

  // The figure under the pointer: its row, its place in the row and which repeat of the row it is in. The space between two
  // figures is split at its middle, so a figure stays read until the next one is nearer and the reading never drops out.
  function figureAt(t) {
    if (!ptr.on) return null;
    const ri = Math.floor((ptr.y - 4) / PITCH), r = rows[ri];
    if (!r) return null;
    const u = ptr.x - shiftOf(r, t), k = Math.floor(u / r.w), v = u - k * r.w;
    if (v >= r.w - GAP / 2) return { row: ri, i: 0, k: k + 1 };   // the half gap before the next repeat's first figure
    let i = 0;
    while (i + 1 < r.starts.length && v >= r.starts[i + 1] - GAP / 2) i++;
    return { row: ri, i, k };
  }

  function draw(now) {
    const t = (now - t0) / 1000, dt = prev ? Math.min(0.1, (now - prev) / 1000) : 0;
    prev = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const r of rows) {
      if (r.y >= H) break;
      const top = r.y - PITCH / 2;
      const end = top >= coverTop ? coverLeft : W;       // behind the photo, only what lies left of it
      if (end <= 0) continue;
      if (!r.ink) r.ink = strip(r, INK);
      ctx.globalAlpha = r.alpha;
      for (let xx = shiftOf(r, t) % r.w; xx < end; xx += r.w) ctx.drawImage(r.ink, xx, top, r.w, PITCH);
    }
    // The figure read under the pointer, and the ones fading out after it, in green over their ink.
    const hit = figureAt(t);
    if (hit && !read.some(m => same(m, hit))) read.push({ ...hit, g: 0 });
    for (const m of read) m.g = same(m, hit) ? Math.min(1, m.g + dt / FADE_IN) : Math.max(0, m.g - dt / FADE_OUT);
    read = read.filter(m => m.g > 0 || same(m, hit));
    for (const m of read) {
      const r = rows[m.row], fw = r.widths[m.i];
      if (!r.green) r.green = strip(r, GREEN);
      ctx.globalAlpha = Math.min(1, r.alpha + READ_LIFT * m.g);
      ctx.drawImage(r.green, r.starts[m.i] * dpr, 0, fw * dpr, PITCH * dpr, shiftOf(r, t) + m.k * r.w + r.starts[m.i], r.y - PITCH / 2, fw, PITCH);
    }
    ctx.globalAlpha = 1;
  }
  const frame = () => { if (ready) draw(performance.now()); };

  function loop(now) {
    raf = 0;
    if (!onScreen || document.hidden || reduce.matches) return;
    if (now - last >= 33) { last = now; draw(now); }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (ready && !raf && !reduce.matches) raf = requestAnimationFrame(loop); }

  window.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;   // a finger scrolling the page is not a pointer to follow: on touch screens the stream only drifts
    const r = panel.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
    ptr.on = ptr.x >= 0 && ptr.x < r.width && ptr.y >= 0 && ptr.y < r.height && !(ptr.y >= coverTop && ptr.x >= coverLeft);   // over the stream, not the photo
  }, { passive: true });
  document.addEventListener('pointerleave', () => { ptr.on = false; });
  document.addEventListener('visibilitychange', start);
  new IntersectionObserver(es => { onScreen = es[0].isIntersecting; start(); }).observe(panel);
  const ro = new ResizeObserver(() => { if (ready) { build(); frame(); } });
  ro.observe(panel); if (photo) ro.observe(photo);
  reduce.addEventListener('change', () => { frame(); start(); });

  // The rows are measured in Plex Mono, so nothing is laid out before the font is in.
  document.fonts.load(FONT).finally(() => { ready = true; build(); frame(); start(); });
})();
