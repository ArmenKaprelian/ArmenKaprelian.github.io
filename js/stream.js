/* The home page's data stream. Rows of figures from the atlas's series (js/stream-data.js, generated) drift slowly
   leftward over the image panel, dimmed so the image stays visible. A scan line passes down the panel and lifts the
   rows it crosses; the rows near the pointer brighten to the reading green, and every row shifts a few pixels with the
   pointer's position across the page. One canvas at about 30 frames a second, paused while the panel is off screen
   or the tab is hidden. Under reduced motion it draws one still frame and runs no loop.
   Only what shows is drawn: a row behind the photo (which has no transparency) is skipped, or drawn only left of the
   photo where the photo is narrower than the panel; a row's text is drawn into its strip the first time the row shows,
   and its green strip the first time the pointer comes near. The rows are laid out once, after the font loads, and a
   resize only adds rows. */
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
  const SCAN_SPEED = 36, SCAN_REACH = 40;                // px per second; how far the scan line's lift reaches
  const NEAR_REACH = 56;                                 // how far the pointer's highlight reaches
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0, H = 0, dpr = 1, rows = [], raf = 0, last = 0, onScreen = true, ready = false;
  let coverTop = Infinity, coverLeft = 0;                // the photo's top and left edges in the panel
  const t0 = performance.now();
  const ptr = { x: 0.5, tx: 0.5, y: -999, on: false };

  // A seeded generator, so the stream is laid out the same way on every load.
  let seed = 20261028;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  const meter = document.createElement('canvas').getContext('2d');
  function setFont(g) { g.font = FONT; if ('letterSpacing' in g) g.letterSpacing = TRACK + 'px'; }

  // The next row: six items in a seeded order, their widths, and the row's own drift, strength and depth.
  function addRow() {
    const order = ITEMS.map(s => [rnd(), s]).sort((a, b) => a[0] - b[0]).map(p => p[1]).slice(0, 6);
    setFont(meter);
    const widths = order.map(s => Math.ceil(meter.measureText(s).width));
    const w = widths.reduce((a, b) => a + b + GAP, 0);
    rows.push({
      y: PITCH / 2 + 4 + rows.length * PITCH, order, widths, w, ink: null, green: null,
      off: rnd() * w,
      speed: 6 + rnd() * 12,          // px per second
      alpha: 0.07 + rnd() * 0.11,     // resting strength: dim, so the image shows through
      depth: 4 + rnd() * 14,          // how far the row follows the pointer across the page
    });
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

  function draw(now) {
    const t = (now - t0) / 1000;
    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const scanY = reduce.matches ? -999 : ((t * SCAN_SPEED) % (H + 2 * SCAN_REACH)) - SCAN_REACH;
    for (const r of rows) {
      if (r.y >= H) break;
      const top = r.y - PITCH / 2;
      const end = top >= coverTop ? coverLeft : W;       // behind the photo, only what lies left of it
      if (end <= 0) continue;
      const shift = (ptr.x - 0.5) * r.depth;
      let x = -((r.off + r.speed * (reduce.matches ? 0 : t)) % r.w) + shift;
      const lift = Math.max(0, 1 - Math.abs(r.y - scanY) / SCAN_REACH) * 0.32;
      const near = ptr.on ? Math.max(0, 1 - Math.abs(r.y - ptr.y) / NEAR_REACH) : 0;
      if (!r.ink) r.ink = strip(r, INK);
      if (near > 0.01 && !r.green) r.green = strip(r, GREEN);
      for (let xx = x; xx < end; xx += r.w) {
        ctx.globalAlpha = Math.min(1, r.alpha + lift) * (1 - near);
        if (ctx.globalAlpha > 0.01) ctx.drawImage(r.ink, xx, top, r.w, PITCH);
        if (near > 0.01) { ctx.globalAlpha = Math.min(1, r.alpha + 0.55 * near); ctx.drawImage(r.green, xx, top, r.w, PITCH); }
      }
    }
    if (scanY > -SCAN_REACH) { ctx.globalAlpha = 0.28; ctx.fillStyle = GREEN; ctx.fillRect(0, Math.round(scanY), W, 1); }
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
    ptr.tx = e.clientX / window.innerWidth;
    const r = panel.getBoundingClientRect();
    ptr.on = e.clientX >= r.left && e.clientX < r.right && e.clientY >= r.top && e.clientY < r.bottom;
    ptr.y = e.clientY - r.top;
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
