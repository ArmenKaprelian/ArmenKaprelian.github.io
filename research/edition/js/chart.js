/* Shared drawing for the edition's figures. Charts by year: runs of years side by side on one vertical scale,
   grid lines and year labels, lines that break where a value is missing, interval bars, square marks, and one
   selected year that the pointer, a tap or the arrow keys move. Charts of rows: a track with a bar or an
   interval. It holds no words: a chart's labels are passed in from the page, and its numbers are the data
   files' strings. */
(function () {
  'use strict';
  var E = window.Edition;
  E.have.chart = true;
  var LINE = '#2E333D', DIM = '#7D889C';
  var C = E.chart = {};

  // Small helpers the figures' scripts share.
  C.each = function (list, fn) { Array.prototype.forEach.call(list, fn); };
  C.whens = function (root, on) { C.each(root.querySelectorAll('[data-when]'), function (el) { el.hidden = el.dataset.when !== on; }); };
  C.pct = function (tk, top) { return tk + (top ? '%' : ''); };
  C.signed = function (v, digits) { return (v < 0 ? '\u2212' : v > 0 ? '+' : '') + Math.abs(v).toFixed(digits); };
  // Round limits and ticks for a linear axis that holds lo to hi.
  C.nice = function (lo, hi) {
    var steps = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50], st = steps[steps.length - 1], i, t = [], v;
    for (i = 0; i < steps.length; i++) if ((hi - lo) / steps[i] <= 6) { st = steps[i]; break; }
    var a = Math.floor(lo / st + 1e-9) * st, b = Math.ceil(hi / st - 1e-9) * st;
    for (v = a; v <= b + st / 2; v += st) t.push(Math.round(v / st) * st);
    return { lo: a, hi: b, step: st, ticks: t, digits: st < 0.1 ? 2 : st < 1 ? 1 : 0 };
  };

  // Charts of rows: a name, a track that holds a bar or an interval with its estimate, and the value. The rows
  // and their words are in the page. A track is positioned in percent of its own width, so it follows the
  // layout without a redraw.
  C.rowScale = function (lo, hi, log) {
    var f = log ? Math.log : function (v) { return v; };
    return function (v) { return 100 * (f(v) - f(lo)) / (f(hi) - f(lo)); };
  };
  function piece(track, cls, left, width, color) {
    var i = document.createElement('i');
    i.className = cls;
    i.style.left = left + '%';
    if (width != null) i.style.width = width + '%';
    if (color) i.style.background = color;
    track.appendChild(i);
  }
  C.track = function (track, sc, o) {       // o: zero (a reference line, or several), bar [from, to], iv [low, high], pt (the estimate), color
    E.clear(track);
    if (o.zero != null) [].concat(o.zero).forEach(function (z) { piece(track, 'zero', sc(z)); });
    if (o.bar) piece(track, 'bar', Math.min(sc(o.bar[0]), sc(o.bar[1])), Math.abs(sc(o.bar[1]) - sc(o.bar[0])), o.color);
    if (o.iv) piece(track, 'iv', sc(o.iv[0]), sc(o.iv[1]) - sc(o.iv[0]), o.color);
    if (o.pt != null) piece(track, 'pt', sc(o.pt), null, o.color);
  };
  C.ticks = function (root, sc, ticks, fmt) {
    C.each(root.querySelectorAll('.ticks'), function (track) {
      E.clear(track);
      ticks.forEach(function (tk) { var b = document.createElement('b'); b.style.left = sc(tk) + '%'; b.textContent = fmt(tk); track.appendChild(b); });
    });
  };

  // Runs of consecutive years. A new run starts after a missing year and after breakAfter (the provider change).
  C.runs = function (years, breakAfter) {
    var out = [], cur = [];
    years.forEach(function (y, i) {
      if (i && (y !== years[i - 1] + 1 || years[i - 1] === breakAfter)) { out.push(cur); cur = []; }
      cur.push(y);
    });
    out.push(cur);
    return out;
  };

  // The geometry of one chart: a panel per run, every year the same width, one vertical scale set by lin or log.
  C.frame = function (W, H, m, runs, gap) {
    var n = 0, x = m.l, f = { W: W, H: H, m: m, y0: H - m.b, y1: m.t, panels: [] };
    runs.forEach(function (r) { n += r.length; });
    f.pitch = (W - m.l - m.r - gap * (runs.length - 1)) / n;
    runs.forEach(function (r) { f.panels.push({ x0: x, x1: x + f.pitch * r.length, years: r }); x += f.pitch * r.length + gap; });
    f.x = function (year) {
      for (var i = 0; i < f.panels.length; i++) {
        var k = f.panels[i].years.indexOf(year);
        if (k >= 0) return f.panels[i].x0 + f.pitch * (k + 0.5);
      }
      return null;
    };
    f.nearest = function (px) {
      var best = null, gapTo = Infinity;
      f.panels.forEach(function (p) { p.years.forEach(function (y) { var g = Math.abs(f.x(y) - px); if (g < gapTo) { gapTo = g; best = y; } }); });
      return best;
    };
    f.lin = function (lo, hi) { f.y = E.scale(lo, hi, f.y0, f.y1); f.lo = lo; f.hi = hi; };
    f.log = function (lo, hi) {
      var s = E.scale(Math.log(lo), Math.log(hi), f.y0, f.y1);
      f.y = function (v) { return s(Math.log(v)); };
      f.lo = lo; f.hi = hi;
    };
    return f;
  };

  // Grid lines, tick labels, year labels and a title over each panel. o: ticks, fmt(tick), base (the tick drawn
  // stronger), label(year), sel (the selected year, set in the ink where it has a label), titles (one per panel, optional).
  C.axes = function (g, f, o) {
    f.panels.forEach(function (p, pi) {
      o.ticks.forEach(function (tk) {
        var yy = Math.round(f.y(tk)) + 0.5;
        E.svg('line', { x1: p.x0, x2: p.x1, y1: yy, y2: yy, stroke: tk === o.base ? DIM : LINE, 'stroke-width': 1 }, g);
        if (!pi) E.svg('text', { x: f.m.l - 8, y: yy, dy: '.32em', 'text-anchor': 'end' }, g, o.fmt(tk));
      });
      if (o.titles && o.titles[pi]) E.svg('text', { x: p.x0, y: f.y1 - 10, 'class': 'era' }, g, o.titles[pi].toUpperCase());
      var step = Math.max(1, Math.ceil(42 / f.pitch)), last = p.years.length - 1;
      p.years.forEach(function (y, k) {          // counted back from the last year, so the latest year is always named
        if ((last - k) % step === 0) E.svg('text', { x: f.x(y), y: f.y0 + 18, 'text-anchor': 'middle', 'class': y === o.sel ? 'v' : '' }, g, o.label(y));
      });
    });
  };

  function add(a, extra) { for (var k in extra) a[k] = extra[k]; return a; }

  // A series is an array of values in the order of years. dx moves a series sideways, for intervals that would
  // otherwise lie on top of each other.
  C.line = function (g, f, years, vals, attrs, dx) {
    f.panels.forEach(function (p) {
      var d = '', pen = false;
      p.years.forEach(function (y) {
        var v = vals[years.indexOf(y)];
        if (v == null) { pen = false; return; }
        d += (pen ? 'L' : 'M') + (f.x(y) + (dx || 0)).toFixed(1) + ' ' + f.y(v).toFixed(1);
        pen = true;
      });
      if (d) E.svg('path', add({ d: d, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'square' }, attrs), g);
    });
  };
  C.bars = function (g, f, years, lo, hi, attrs, dx) {
    years.forEach(function (y, i) {
      var x = f.x(y);
      if (x == null || lo[i] == null) return;
      x = Math.round(x + (dx || 0)) + 0.5;
      E.svg('line', add({ x1: x, x2: x, y1: f.y(Math.max(lo[i], f.lo)), y2: f.y(Math.min(hi[i], f.hi)) }, attrs), g);
    });
  };
  C.marks = function (g, f, years, vals, size, attrs, dx, only) {
    years.forEach(function (y, i) {
      var x = f.x(y);
      if (x == null || vals[i] == null || (only != null && y !== only)) return;
      E.svg('rect', add({ x: x + (dx || 0) - size / 2, y: f.y(vals[i]) - size / 2, width: size, height: size }, attrs), g);
    });
  };

  // One chart in a .plot element. o: label (what the chart is, for a screen reader), pick (the name of its year
  // control), year (the year selected at the start), height(w), margins(w), gap, runs(), yearLabel(year),
  // draw(frame, gAxes, gData, year), onYear(year).
  C.make = function (plot, o) {
    var svg = E.svg('svg', { role: 'img', 'aria-label': o.label || '' }, plot);
    var gA = E.svg('g', {}, svg), gD = E.svg('g', {}, svg);
    var guide = E.svg('line', { stroke: DIM, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
    var hit = E.svg('rect', { 'class': 'hit', fill: 'transparent', tabindex: 0, role: 'slider', 'aria-label': o.pick || '' }, svg);
    var f = null, year = o.year, all = [];

    function redraw() {
      if (!f) return;
      E.clear(gA); E.clear(gD);
      o.draw(f, gA, gD, year);
      var x = Math.round(f.x(year)) + 0.5;
      guide.setAttribute('x1', x); guide.setAttribute('x2', x); guide.setAttribute('y1', f.y1); guide.setAttribute('y2', f.y0);
      hit.setAttribute('aria-valuenow', all.indexOf(year));
      hit.setAttribute('aria-valuetext', o.yearLabel(year));
    }
    function layout() {
      var w = plot.clientWidth;
      if (!w) return;
      var H = o.height(w), m = o.margins(w), runs = o.runs();
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
      f = C.frame(w, H, m, runs, o.gap == null ? 26 : o.gap);
      all = [].concat.apply([], runs);
      if (all.indexOf(year) < 0) year = all[all.length - 1];
      hit.setAttribute('x', m.l); hit.setAttribute('y', m.t - 6);
      hit.setAttribute('width', Math.max(0, w - m.l - m.r)); hit.setAttribute('height', H - m.t - m.b + 12);
      hit.setAttribute('aria-valuemin', 0); hit.setAttribute('aria-valuemax', all.length - 1);
      redraw();
    }
    function set(y, quiet) {
      if (y === year || all.indexOf(y) < 0) return;
      year = y;
      redraw();
      if (!quiet && o.onYear) o.onYear(y);
    }
    function at(e) {
      var r = svg.getBoundingClientRect();
      set(f.nearest((e.clientX - r.left) * (f.W / r.width)));
    }
    hit.addEventListener('pointermove', function (e) { if (f && (e.pointerType === 'mouse' || e.buttons)) at(e); });
    hit.addEventListener('pointerdown', function (e) { if (f) at(e); });
    hit.addEventListener('keydown', function (e) {
      var i = all.indexOf(year), k = e.key;
      var n = k === 'ArrowRight' || k === 'ArrowUp' ? i + 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? i - 1 : k === 'Home' ? 0 : k === 'End' ? all.length - 1 : null;
      if (n == null) return;
      e.preventDefault();
      set(all[E.clamp(n, 0, all.length - 1)]);
    });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(plot); else window.addEventListener('resize', layout);
    layout();
    return { layout: layout, redraw: redraw, set: set, year: function () { return year; } };
  };
})();
