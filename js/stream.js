/* The home page's data stream. Rows of figures from the atlas's series (js/stream-data.js, generated) drift slowly
   leftward over the image panel, dimmed so the image stays visible. A scan line passes down the panel and lifts the
   rows it crosses; the rows near the pointer brighten to the reading green, and every row shifts a few pixels with the
   pointer's position across the page. One canvas at about 30 frames a second, paused while the panel is off screen
   or the tab is hidden. Under reduced motion it draws one still frame and runs no loop. */
(function () {
  const panel = document.querySelector('.visual');
  const canvas = panel && panel.querySelector('canvas.stream');
  const ITEMS = window.STREAM_ITEMS || [];
  if (!canvas || !ITEMS.length) return;

  const ctx = canvas.getContext('2d');
  const root = getComputedStyle(document.documentElement);
  const INK = root.getPropertyValue('--ink').trim() || '#ECEEF1';
  const GREEN = root.getPropertyValue('--context').trim() || '#4DFF7F';
  const SIZE = 11, PITCH = 22, TRACK = 0.88;            // 11 px Plex Mono, rows 22 px apart, 8 percent tracking
  const FONT = `500 ${SIZE}px "IBM Plex Mono", monospace`;
  const SCAN_SPEED = 36, SCAN_REACH = 40;                // px per second; how far the scan line's lift reaches
  const NEAR_REACH = 56;                                 // how far the pointer's highlight reaches
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  let W = 0, H = 0, dpr = 1, rows = [], raf = 0, last = 0, onScreen = true;
  const t0 = performance.now();
  const ptr = { x: 0.5, tx: 0.5, y: -999, on: false };

  // A seeded generator, so the stream is laid out the same way on every load.
  let seed = 20261028;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // One row's text drawn once into an offscreen strip per colour, items separated by the atlas mark.
  function strip(items, colour) {
    const c = document.createElement('canvas'), g = c.getContext('2d');
    const GAP = 34, MARK = 8;
    g.font = FONT; if ('letterSpacing' in g) g.letterSpacing = TRACK + 'px';
    const widths = items.map(s => Math.ceil(g.measureText(s).width));
    const w = widths.reduce((a, b) => a + b + GAP, 0);
    c.width = Math.ceil(w * dpr); c.height = Math.ceil(PITCH * dpr);
    g.scale(dpr, dpr); g.font = FONT; if ('letterSpacing' in g) g.letterSpacing = TRACK + 'px';
    g.fillStyle = colour; g.strokeStyle = colour; g.textBaseline = 'middle'; g.lineWidth = 1.2;
    let x = 0;
    items.forEach((s, i) => {
      g.fillText(s, x, PITCH / 2);
      x += widths[i];
      const mx = x + (GAP - MARK) / 2, my = PITCH / 2 - MARK / 2, a = 2.2;   // the mark: four corner brackets and a dot
      g.beginPath();
      g.moveTo(mx, my + a); g.lineTo(mx, my); g.lineTo(mx + a, my);
      g.moveTo(mx + MARK - a, my); g.lineTo(mx + MARK, my); g.lineTo(mx + MARK, my + a);
      g.moveTo(mx + MARK, my + MARK - a); g.lineTo(mx + MARK, my + MARK); g.lineTo(mx + MARK - a, my + MARK);
      g.moveTo(mx + a, my + MARK); g.lineTo(mx, my + MARK); g.lineTo(mx, my + MARK - a);
      g.stroke(); g.fillRect(mx + MARK / 2 - 1, my + MARK / 2 - 1, 2, 2);
      x += GAP;
    });
    return { canvas: c, w };
  }

  function build() {
    const r = panel.getBoundingClientRect();
    W = Math.round(r.width); H = Math.round(r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    seed = 20261028; rows = [];
    for (let y = PITCH / 2 + 4; y < H; y += PITCH) {
      const order = ITEMS.map(s => [rnd(), s]).sort((a, b) => a[0] - b[0]).map(p => p[1]).slice(0, 6);
      const ink = strip(order, INK), green = strip(order, GREEN);
      rows.push({
        y, ink, green, w: ink.w,
        off: rnd() * ink.w,
        speed: 6 + rnd() * 12,          // px per second
        alpha: 0.07 + rnd() * 0.11,     // resting strength: dim, so the image shows through
        depth: 4 + rnd() * 14,          // how far the row follows the pointer across the page
      });
    }
  }

  function draw(now) {
    const t = (now - t0) / 1000;
    ptr.x += (ptr.tx - ptr.x) * 0.08;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const scanY = reduce.matches ? -999 : ((t * SCAN_SPEED) % (H + 2 * SCAN_REACH)) - SCAN_REACH;
    for (const r of rows) {
      const shift = (ptr.x - 0.5) * r.depth;
      let x = -((r.off + r.speed * (reduce.matches ? 0 : t)) % r.w) + shift;
      const lift = Math.max(0, 1 - Math.abs(r.y - scanY) / SCAN_REACH) * 0.32;
      const near = ptr.on ? Math.max(0, 1 - Math.abs(r.y - ptr.y) / NEAR_REACH) : 0;
      const top = r.y - PITCH / 2;
      for (let xx = x; xx < W; xx += r.w) {
        ctx.globalAlpha = Math.min(1, r.alpha + lift) * (1 - near);
        if (ctx.globalAlpha > 0.01) ctx.drawImage(r.ink.canvas, xx, top, r.w, PITCH);
        if (near > 0.01) { ctx.globalAlpha = Math.min(1, r.alpha + 0.55 * near); ctx.drawImage(r.green.canvas, xx, top, r.w, PITCH); }
      }
    }
    if (scanY > -SCAN_REACH) { ctx.globalAlpha = 0.28; ctx.fillStyle = GREEN; ctx.fillRect(0, Math.round(scanY), W, 1); }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    raf = 0;
    if (!onScreen || document.hidden || reduce.matches) return;
    if (now - last >= 33) { last = now; draw(now); }
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf && !reduce.matches) raf = requestAnimationFrame(loop); }

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
  new ResizeObserver(() => { build(); draw(performance.now()); }).observe(panel);
  reduce.addEventListener('change', () => { draw(performance.now()); start(); });

  document.fonts.load(FONT).finally(() => { build(); draw(performance.now()); start(); });
})();
