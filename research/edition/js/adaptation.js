/* The Chapter 3 page's figures. A1: recorded sales by ownership at the start of a window, and the difference in
   revenue growth by end year. A2: the four-digit industries of the replacement test, in two arrangements, with
   the saved estimates. A3 and A6: estimates by the year measured and the outcome year. A4: a thousand squares
   for the opening sales of firms with foreign or joint ownership, by status three years later. A5: the
   adaptation boundary, with three sliders and a point the reader moves. Every word comes from the page and
   every printed number from the data files' strings. The settings of A5 are the reader's own and are not data. */
(function () {
  'use strict';
  var E = window.Edition, C = E.chart;
  E.have.adaptation = true;
  var each = C.each, whens = C.whens, signed = C.signed;
  var ACC = '#79CDBF', DEEP = '#269C96', PALE = '#C7F8E7', AMBER = '#FFB000', FUCHSIA = '#DB78B1', SLATE = '#6B7482', GONE = '#8E99A8';
  var LINE = '#2E333D', DIM = '#7D889C', BELOW = '#3C4852', STAGE = '#03060E';

  // ---- A1: recorded sales by ownership at the start of the window, trillion 2021 rubles --------------------------
  E.figs.a1 = function (fig, d) {
    var st = { w: 'w2021' }, sc = C.rowScale(0, 225);
    function draw() {
      var t = d.totals[st.w];
      each(fig.querySelectorAll('[data-k]'), function (el) {
        var k = el.dataset.k.split('_'), g = t[k[0]], open = k[1] === 'open', chg = el.querySelector('.chg');
        C.track(el.querySelector('.track'), sc, { bar: [0, open ? g.open : g.close], color: open ? SLATE : g.change < 0 ? AMBER : ACC });
        el.querySelector('.sh').textContent = open ? g.open_s : g.close_s;
        if (chg) chg.textContent = g.change_s;
      });
      each(fig.querySelectorAll('.y0'), function (o) { o.textContent = t.start; });
      each(fig.querySelectorAll('.y1'), function (o) { o.textContent = t.end; });
    }
    C.ticks(fig, sc, [0, 50, 100, 150, 200], String);
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; draw(); });
    draw();
    return { state: function (s) { st.w = s === 'early' ? 'w2015' : 'w2021'; radios.set('w', st.w, true); draw(); } };
  };

  // ---- A1: the difference in revenue growth by end year ------------------------------------------------------------
  E.figs.a1g = function (fig, d) {
    var L = fig.dataset, st = { h: 'h3', year: 2024 }, plot = fig.querySelector('.plot'), hint = fig.querySelector('.hint');
    var yr = fig.querySelector('.yr'), oM = fig.querySelector('.om'), oP = fig.querySelector('.op'), posLine = fig.querySelector('.posline');
    function yi(y) { return d.ends.indexOf(y); }
    function label(y) { return d.ends_s[yi(y)]; }
    function runs() {
      var g = d.growth[st.h], have = d.ends.filter(function (y, i) { return g.main.est[i] != null || g.pos.est[i] != null; });
      return [have.filter(function (y) { return y <= 2018; }), have.filter(function (y) { return y > 2018; })];
    }
    function read() {
      var i = yi(st.year), g = d.growth[st.h];
      yr.textContent = d.ends_s[i];
      oM.textContent = g.main.est_s[i] == null ? '' : g.main.est_s[i] + ' (' + g.main.ci_s[i] + ')';
      posLine.hidden = g.pos.est_s[i] == null;
      oP.textContent = g.pos.est_s[i] == null ? '' : g.pos.est_s[i] + ' (' + g.pos.ci_s[i] + ')';
    }
    var ch = C.make(plot, {
      label: plot.getAttribute('aria-label'), pick: L.lPick, year: st.year, yearLabel: label, runs: runs,
      height: function (w) { return Math.round(E.clamp(w * 0.44, 250, 390)); },
      margins: function () { return { l: 44, r: 16, t: 16, b: 28 }; },
      draw: function (f, gA, gD, year) {
        var g = d.growth[st.h];
        f.lin(-20, 20);
        C.axes(gA, f, { ticks: [-20, -10, 0, 10, 20], base: 0, fmt: function (tk) { return signed(tk, 0); }, label: label, sel: year });
        C.bars(gD, f, d.ends, g.main.lo, g.main.hi, { stroke: ACC, 'stroke-width': 2, opacity: 0.6 });
        C.line(gD, f, d.ends, g.main.est, { stroke: ACC, 'stroke-width': 1.5, opacity: 0.6 });
        C.marks(gD, f, d.ends, g.main.est, 8, { fill: ACC });
        C.bars(gD, f, d.ends, g.pos.lo, g.pos.hi, { stroke: PALE, 'stroke-width': 1.5, opacity: 0.8 }, 10);
        C.marks(gD, f, d.ends, g.pos.est, 8, { fill: STAGE, stroke: PALE, 'stroke-width': 1.5 }, 10);
        C.marks(gD, f, d.ends, g.main.est, 11, { fill: ACC, stroke: STAGE, 'stroke-width': 2 }, 0, year);
      },
      onYear: function (y) { st.year = y; hint.hidden = true; read(); }
    });
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; ch.layout(); st.year = ch.year(); read(); });
    read();
    return {
      state: function (s) {
        st.h = s === 'h1' ? 'h1' : s === 'h2' ? 'h2' : 'h3';
        radios.set('h', st.h, true);
        ch.layout(); ch.set(s === 'y2025' ? 2025 : s === 'h1' ? 2022 : 2024, true);
        st.year = ch.year(); hint.hidden = s !== 'start'; read();
      }
    };
  };

  // ---- A3 and A6: estimates by the year a firm is followed from and the outcome year -----------------------------
  // One run of outcome years for each reference year. A key is the reference year times 10,000 plus the outcome year.
  function refChart(fig, get, key0, color) {
    var L = fig.dataset, plot = fig.querySelector('.plot'), hint = fig.querySelector('.hint');
    var oFrom = fig.querySelector('.from'), oTo = fig.querySelector('.to'), oE = fig.querySelector('.est'), oC = fig.querySelector('.ivs');
    function keys(s) { return s.ref.map(function (r, i) { return r * 10000 + s.end[i]; }); }
    function label(k) { return String(k % 10000); }
    function runs() {
      var s = get(), k = keys(s), by = {}, order = [];
      s.ref.forEach(function (r, i) { if (!by[r]) { by[r] = []; order.push(r); } by[r].push(k[i]); });
      return order.map(function (r) { return by[r]; });
    }
    function read(k) {
      var s = get(), i = keys(s).indexOf(k);
      oFrom.textContent = s.ref[i]; oTo.textContent = s.end[i]; oE.textContent = s.est_s[i]; oC.textContent = s.ci_s[i];
    }
    var ch = C.make(plot, {
      label: plot.getAttribute('aria-label'), pick: L.lPick, year: key0, yearLabel: label, runs: runs, gap: 30,
      height: function (w) { return Math.round(E.clamp(w * 0.4, 240, 360)); },
      margins: function () { return { l: 52, r: 12, t: 26, b: 28 }; },
      draw: function (f, gA, gD, key) {
        var s = get(), k = keys(s), n = C.nice(Math.min.apply(null, s.lo.concat([0])), Math.max.apply(null, s.hi.concat([0]))), last = Math.max.apply(null, s.ref);
        f.lin(n.lo, n.hi);
        C.axes(gA, f, { ticks: n.ticks, base: 0, fmt: function (tk) { return signed(tk, n.digits); }, label: label, sel: key,
          titles: f.panels.map(function (p) { return (L.lFrom || '') + ' ' + Math.floor(p.years[0] / 10000); }) });
        f.panels.forEach(function (p) {              // the latest reference year in the figure's colour, the earlier ones quieter
          var col = Math.floor(p.years[0] / 10000) === last ? color : SLATE, idx = p.years.map(function (y) { return k.indexOf(y); });
          var pick = function (a) { return idx.map(function (i) { return a[i]; }); };
          C.bars(gD, f, p.years, pick(s.lo), pick(s.hi), { stroke: col, 'stroke-width': 2, opacity: 0.65 });
          C.line(gD, f, p.years, pick(s.est), { stroke: col, 'stroke-width': 1.5, opacity: 0.65 });
          C.marks(gD, f, p.years, pick(s.est), 8, { fill: col });
          C.marks(gD, f, p.years, pick(s.est), 11, { fill: col, stroke: STAGE, 'stroke-width': 2 }, 0, key);
        });
      },
      onYear: function (k) { hint.hidden = true; read(k); }
    });
    read(ch.year());
    return { redraw: function () { ch.layout(); read(ch.year()); }, set: function (k, start) { ch.set(k, true); hint.hidden = !start; read(ch.year()); } };
  }

  E.figs.a3 = function (fig, d) {
    var st = { out: 'growth' };
    var rc = refChart(fig, function () { return d.private[st.out]; }, 20212024, ACC);
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; whens(fig, st.out); rc.redraw(); });
    whens(fig, st.out);
    return { state: function (s) { st.out = s === 'margin' ? 'margin' : 'growth'; radios.set('out', st.out, true); whens(fig, st.out); rc.redraw(); rc.set(20212024, s === 'start'); } };
  };

  E.figs.a6 = function (fig, d) {
    var st = { res: 'inventory', out: 'revenue' };
    function mode() { each(fig.querySelectorAll('[data-when]'), function (el) { el.hidden = el.dataset.when !== st.res && el.dataset.when !== st.out; }); }
    var rc = refChart(fig, function () { return d.annual[st.res][st.out]; }, 20212022, ACC);
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; mode(); rc.redraw(); });
    mode();
    return {
      state: function (s) {
        st.res = s === 'cash' || s === 'cashmargin' ? 'cash' : 'inventory';
        st.out = s === 'margin' || s === 'cashmargin' ? 'margin' : 'revenue';
        radios.set('res', st.res, true); radios.set('out', st.out, true);
        mode(); rc.redraw(); rc.set(st.res === 'cash' ? 20212024 : 20212022, s === 'start');
      }
    };
  };

  // ---- A4: a thousand squares, each a thousandth of the opening sales of firms with foreign or joint ownership --
  // Marks as in the Chapter 2 page: solid with a statement, hollow when still registered without one, small and
  // grey once dissolved. The lightest solid squares are the sales of firms later recorded as privately owned.
  E.figs.a4 = function (fig, d) {
    var cv = fig.querySelector('canvas'), ctx = cv.getContext('2d'), st = { w: 'w2021', at: 'end', t: 1 }, cell = 10, rows = 20, cols = 50, raf = 0;
    var KIND = { private: ['solid', PALE], fj: ['solid', ACC], other: ['solid', DEEP], registered: ['hollow', ACC], dissolved: ['small', GONE] };
    function mark(x, y, kind, color, alpha) {
      var sz = cell - 2;
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      if (kind === 'solid') { ctx.fillStyle = color; ctx.fillRect(x, y, sz, sz); }
      else if (kind === 'hollow') { ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.75, y + 0.75, sz - 1.5, sz - 1.5); }
      else { ctx.fillStyle = color; ctx.fillRect(x + 2, y + 2, sz - 4, sz - 4); }
    }
    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 3), s = d.status[st.w], i = 0, x, y, kd;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cols * cell, rows * cell);
      s.key.forEach(function (key, g) {            // column by column, one status after another
        for (var j = 0; j < s.squares[g]; j++, i++) {
          x = Math.floor(i / rows) * cell; y = (i % rows) * cell; kd = KIND[key];
          mark(x, y, 'solid', ACC, 1 - st.t);
          mark(x, y, kd[0], kd[1], (kd[0] === 'small' ? 0.8 : 1) * st.t);
        }
      });
      ctx.globalAlpha = 1;
    }
    function layout() {
      var w = cv.parentNode.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (!w) return;
      rows = w < 520 ? 25 : 20; cols = 1000 / rows; cell = Math.floor(E.clamp(w / cols, 6, 11));
      cv.width = Math.round(cols * cell * dpr); cv.height = Math.round(rows * cell * dpr);
      cv.style.width = cols * cell + 'px'; cv.style.height = rows * cell + 'px';
      draw();
    }
    function read() {
      var s = d.status[st.w];
      each(fig.querySelectorAll('[data-st]'), function (el) { el.querySelector('output').textContent = s.pct_s[s.key.indexOf(el.dataset.st)]; });
      each(fig.querySelectorAll('.y0'), function (o) { o.textContent = s.start; });
      each(fig.querySelectorAll('.y1'), function (o) { o.textContent = s.end; });
      whens(fig, st.at);
    }
    function go(to, instant) {
      cancelAnimationFrame(raf);
      read();
      if (instant || E.reduced()) { st.t = to; draw(); return; }
      var from = st.t, t0 = performance.now();
      raf = requestAnimationFrame(function tick(now) {
        var k = E.reduced() ? 1 : E.clamp((now - t0) / 700, 0, 1);
        st.t = from + (to - from) * E.ease(k);
        draw();
        if (k < 1) raf = requestAnimationFrame(tick);
      });
    }
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; if (nm === 'at') go(v === 'end' ? 1 : 0); else { read(); draw(); } });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(cv.parentNode); else window.addEventListener('resize', layout);
    read(); layout();
    if (!E.reduced() && 'IntersectionObserver' in window) {      // once, when the figure is in view: the opening year, then three years later
      var watch = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        watch.disconnect();
        if (E.reduced()) return;
        st.t = 0; draw();
        setTimeout(function () { if (st.at === 'end') go(1); }, 500);
      }, { threshold: 0.6 });
      watch.observe(cv);
    }
    return {
      state: function (s) {
        st.w = s === 'early' ? 'w2015' : 'w2021'; st.at = s === 'opening' ? 'start' : 'end';
        radios.set('w', st.w, true); radios.set('at', st.at, true);
        go(st.at === 'end' ? 1 : 0, true);
      }
    };
  };

  // ---- A5: the adaptation boundary in the leading case of Figure 3.1 -----------------------------------------------
  // s*(r) = (k0 / r + k1) / (1 + q). A firm at exposure r and capacity s adapts when (1 + q) s r covers k0 + k1 r.
  E.figs.a5 = function (fig) {
    var plot = fig.querySelector('.plot'), D = fig.dataset, base = { q: +D.q, k0: +D.k0, k1: +D.k1 };
    var inp = { q: fig.querySelector('[data-in=q]'), k0: fig.querySelector('[data-in=k0]'), k1: fig.querySelector('[data-in=k1]') };
    var out = { q: fig.querySelector('.oq'), k0: fig.querySelector('.ok0'), k1: fig.querySelector('.ok1'), r: fig.querySelector('.orr'), s: fig.querySelector('.oss'),
      b: fig.querySelector('.obd'), pay: fig.querySelector('.opay') };
    var st = { q: base.q, k0: base.k0, k1: base.k1, r: 0.6, s: 0.6 }, W = 0, H = 0, m = { l: 44, r: 16, t: 14, b: 30 }, sx, sy, drag = false;
    var svg = E.svg('svg', { role: 'group', 'aria-label': plot.getAttribute('aria-label') || '' }, plot);
    var gS = E.svg('g', {}, svg), gD = E.svg('g', {}, svg);
    var controls = E.svg('g', {}, svg);
    var zone = E.svg('rect', { 'class': 'zone', fill: 'transparent' }, controls);
    var handle = E.svg('rect', { 'class': 'handle', tabindex: 0, role: 'slider', 'aria-label': D.lPoint, 'aria-valuemin': 0, 'aria-valuemax': 1, width: 13, height: 13, fill: FUCHSIA, stroke: STAGE, 'stroke-width': 2 }, controls);
    function bound(r, p) { return r === 0 ? Infinity : (p.k0 / r + p.k1) / (1 + p.q); }
    // Each control has at most two decimal places, so this payoff has at most six. An exact tie adapts.
    function payoff(r, s, p) { return Math.round(((1 + p.q) * s * r - p.k0 - p.k1 * r) * 1e6) / 1e6; }
    // Start exactly where the boundary enters the chart (or the feasible region) and end at full exposure.
    function curve(p, ceiling, shade) {
      var denominator = Math.round((ceiling * (1 + p.q) - p.k1) * 1e4) / 1e4;
      if (denominator <= 0 || p.k0 > denominator) return '';
      var start = p.k0 / denominator, path = 'M' + sx(start).toFixed(1) + ' ' + sy(ceiling).toFixed(1);
      for (var i = 1; i <= 100; i++) {
        var r = start + (1 - start) * i / 100;
        path += 'L' + sx(r).toFixed(1) + ' ' + sy(bound(r, p)).toFixed(1);
      }
      return shade ? path + 'L' + sx(1).toFixed(1) + ' ' + sy(ceiling).toFixed(1) + 'Z' : path;
    }
    function layout() {
      var w = plot.clientWidth;
      if (!w) return;
      W = w; H = Math.round(E.clamp(W * 0.5, 250, 400));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      sx = E.scale(0, 1, m.l, W - m.r); sy = E.scale(0, 1.08, H - m.b, m.t);
      E.clear(gS);
      [0, 0.5, 1].forEach(function (tk) {
        var yy = Math.round(sy(tk)) + 0.5;
        E.svg('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: tk === 0 ? DIM : LINE, 'stroke-width': 1, 'stroke-dasharray': tk === 1 ? '4 3' : '' }, gS);
        E.svg('text', { x: m.l - 8, y: yy, dy: '.32em', 'text-anchor': 'end' }, gS, String(tk));
        E.svg('text', { x: sx(tk), y: H - m.b + 18, 'text-anchor': 'middle' }, gS, String(tk));
      });
      E.svg('line', { x1: m.l + 0.5, x2: m.l + 0.5, y1: sy(1.08), y2: sy(0), stroke: DIM, 'stroke-width': 1 }, gS);
      zone.setAttribute('x', m.l); zone.setAttribute('y', sy(1)); zone.setAttribute('width', W - m.l - m.r); zone.setAttribute('height', sy(0) - sy(1));
      draw();
    }
    function draw() {
      if (!W) return;
      E.clear(gD);
      var same = st.q === base.q && st.k0 === base.k0 && st.k1 === base.k1, sb = bound(st.r, st);
      var pay = payoff(st.r, st.s, st), feasible = payoff(st.r, 1, st) >= 0;
      var reg = curve(st, 1, true);
      if (reg) E.svg('path', { d: reg, fill: ACC, 'fill-opacity': 0.16 }, gD);
      if (!same) E.svg('path', { d: curve(base, 1.08, false), fill: 'none', stroke: DIM, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, gD);
      E.svg('path', { d: curve(st, 1.08, false), fill: 'none', stroke: ACC, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, gD);
      handle.setAttribute('x', sx(st.r) - 6.5); handle.setAttribute('y', sy(st.s) - 6.5);
      handle.setAttribute('aria-valuenow', st.r);
      handle.setAttribute('aria-valuetext', D.lExposure + ' ' + st.r.toFixed(2) + ', ' + D.lCapacity + ' ' + st.s.toFixed(2));
      out.q.textContent = st.q.toFixed(2); out.k0.textContent = st.k0.toFixed(2); out.k1.textContent = st.k1.toFixed(2);
      out.r.textContent = st.r.toFixed(2); out.s.textContent = st.s.toFixed(2);
      out.b.textContent = feasible ? sb.toFixed(2) : '';
      out.pay.textContent = signed(pay, 2);
      each(fig.querySelectorAll('[data-when]'), function (el) {
        var w = el.dataset.when;
        el.hidden = !(w === (pay >= 0 ? 'adapts' : 'waits') || w === (feasible ? 'bound' : 'nobound'));
      });
    }
    function put(e) {
      var b = svg.getBoundingClientRect();
      st.r = E.clamp(Math.round(sx.inv((e.clientX - b.left) * (W / b.width)) * 100) / 100, 0, 1);
      st.s = E.clamp(Math.round(sy.inv((e.clientY - b.top) * (H / b.height)) * 100) / 100, 0, 1);
      draw();
    }
    controls.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || e.button !== 0) return;
      drag = true;
      controls.setPointerCapture(e.pointerId);
      handle.focus({ preventScroll: true });
      put(e);
      e.preventDefault();
    });
    controls.addEventListener('pointermove', function (e) { if (drag && e.isPrimary) put(e); });
    controls.addEventListener('lostpointercapture', function () { drag = false; });
    handle.addEventListener('keydown', function (e) {
      var k = e.key, dr = k === 'ArrowRight' ? 0.02 : k === 'ArrowLeft' ? -0.02 : 0, ds = k === 'ArrowUp' ? 0.02 : k === 'ArrowDown' ? -0.02 : 0;
      if (!dr && !ds) return;
      e.preventDefault();
      st.r = E.clamp(Math.round((st.r + dr) * 100) / 100, 0, 1); st.s = E.clamp(Math.round((st.s + ds) * 100) / 100, 0, 1);
      draw();
    });
    Object.keys(inp).forEach(function (k) { inp[k].addEventListener('input', function () { st[k] = +inp[k].value; draw(); }); });
    fig.querySelector('[data-act=reset]').addEventListener('click', function () {
      Object.keys(inp).forEach(function (k) { st[k] = base[k]; inp[k].value = base[k]; });
      draw();
    });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(plot); else window.addEventListener('resize', layout);
    layout();
    return {
      state: function (s) {
        st.q = s === 'longer' ? 0.7 : base.q; st.k0 = s === 'costly' ? 0.3 : base.k0; st.k1 = base.k1;
        st.r = s === 'low' ? 0.12 : 0.6; st.s = s === 'low' ? 0.9 : s === 'below' ? 0.35 : 0.6;
        Object.keys(inp).forEach(function (k) { inp[k].value = st[k]; });
        draw();
      }
    };
  };

  // ---- A2: the industries of the replacement test ------------------------------------------------------------------
  // Two arrangements of the same circles: by the industry's foreign share (across) against the loss at firms with
  // foreign or joint ownership (up), then that loss (across) against the change in other firms' sales (up). Both
  // changes are in percent of the industry's opening sales, on an inverse hyperbolic sine scale of a tenth of the value.
  E.figs.a2 = function (fig, d) {
    var L = fig.dataset, plot = fig.querySelector('.plot'), st = { w: 'w2021', view: 'match', t: 1, hot: -1 }, W = 0, H = 0, m = { l: 50, r: 16, t: 14, b: 32 }, raf = 0;
    var svg = E.svg('svg', { role: 'group', 'aria-label': plot.getAttribute('aria-label') || '' }, plot);
    var gS = E.svg('g', {}, svg), gC = E.svg('g', {}, svg), ring = E.svg('circle', { fill: 'none', stroke: FUCHSIA, 'stroke-width': 2, 'pointer-events': 'none' }, svg);
    var zone = E.svg('rect', { 'class': 'hit', fill: 'transparent', tabindex: 0, role: 'slider', 'aria-label': L.lPick, 'aria-valuemin': 1 }, svg);
    var nodes = [], triangles = [], pos = [];
    var rest = fig.querySelector('.rest'), hit = fig.querySelector('.hit2'), o = { nm: fig.querySelector('.inm'), cd: fig.querySelector('.icd'), s1: fig.querySelector('.is1'),
      s2: fig.querySelector('.is2'), s3: fig.querySelector('.is3') };
    function ash(v) { v = v / 10; return Math.log(v + Math.sqrt(v * v + 1)); }
    var LOSS = [-60, 100], OTHER = [-100, d.cap], xs, xl, yl, yo;
    function lerp(a, b, t) { return a + (b - a) * t; }
    function plain(v) { return (v < 0 ? '\u2212' : '') + Math.abs(v); }      // a loss is read off its axis without a plus sign
    function place() {
      var p = d.windows[st.w], t = st.t, R = E.clamp(W * 0.034, 11, 34), i, x, y, r;
      pos = [];
      for (i = 0; i < p.n; i++) {
        x = lerp(xs(p.share[i]), xl(ash(E.clamp(p.x[i], LOSS[0], LOSS[1]))), t);
        y = lerp(yl(ash(E.clamp(p.x[i], LOSS[0], LOSS[1]))), yo(ash(E.clamp(p.y[i], OTHER[0], OTHER[1]))), t);
        r = Math.max(1.6, p.r[i] * R);
        nodes[i].setAttribute('cx', x.toFixed(1)); nodes[i].setAttribute('cy', y.toFixed(1)); nodes[i].setAttribute('r', r.toFixed(1));
        if (triangles[i]) {
          var offScale = st.view === 'match' && t === 1;
          nodes[i].style.display = offScale ? 'none' : '';
          triangles[i].style.display = offScale ? '' : 'none';
          if (offScale) {
            var side = Math.max(4, r);
            triangles[i].setAttribute('points', x + ',' + y + ' ' + (x - side) + ',' + (y + 2 * side) + ' ' + (x + side) + ',' + (y + 2 * side));
            y += side;
            r = side;
          }
        }
        pos.push([x, y, r]);
      }
      if (st.hot >= 0 && pos[st.hot]) { ring.setAttribute('cx', pos[st.hot][0]); ring.setAttribute('cy', pos[st.hot][1]); ring.setAttribute('r', pos[st.hot][2] + 3); ring.style.display = ''; }
      else ring.style.display = 'none';
    }
    function tick(g, x1, y1, x2, y2, strong) { E.svg('line', { x1: x1, x2: x2, y1: y1, y2: y2, stroke: strong ? DIM : LINE, 'stroke-width': 1 }, g); }
    function axes() {
      E.clear(gS);
      var match = st.view === 'match', x0 = m.l, x1 = W - m.r, y0 = H - m.b, y1 = m.t;
      (match ? [-100, -30, -10, 0, 10, 30, 100, 300] : [-30, -10, 0, 10, 30, 100]).forEach(function (v) {
        var yy = Math.round((match ? yo : yl)(ash(v))) + 0.5, top = match && v === d.cap;
        tick(gS, x0, yy, x1, yy, v === 0);
        E.svg('text', { x: x0 - 8, y: yy, dy: '.32em', 'text-anchor': 'end' }, gS, (match ? signed(v, 0) : plain(v)) + (top ? '%' : ''));
      });
      (match ? [-30, -10, 0, 10, 30, 100] : [0, 25, 50, 75, 100]).forEach(function (v) {
        var xx = Math.round(match ? xl(ash(v)) : xs(v)) + 0.5;
        if (match && v === 0) tick(gS, xx, y0, xx, y1, true);
        E.svg('text', { x: xx, y: y0 + 18, 'text-anchor': 'middle' }, gS, plain(v) + (v === 100 ? '%' : ''));
      });
      if (match) {                              // one ruble gained by other firms per ruble lost
        var ax = xl(ash(LOSS[0])), ay = yo(ash(LOSS[0])), bx = xl(ash(LOSS[1])), by = yo(ash(LOSS[1])), deg = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
        E.svg('line', { x1: ax, y1: ay, x2: bx, y2: by, stroke: PALE, 'stroke-width': 1.5, 'stroke-dasharray': '5 4' }, gS);
        E.svg('text', { x: ax + 10, y: ay - 7, 'class': 'era', transform: 'rotate(' + deg.toFixed(2) + ' ' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ')' }, gS, (L.lOne || '').toUpperCase());   // set along the line, at its lower end
      }
    }
    function build() {
      var p = d.windows[st.w], i;
      E.clear(gC); nodes = []; triangles = [];
      for (i = 0; i < p.n; i++) {
        nodes.push(E.svg('circle', { fill: ACC, 'fill-opacity': 0.3, stroke: ACC, 'stroke-opacity': 0.85, 'stroke-width': 1 }, gC));
        if (p.y[i] > d.cap) triangles[i] = E.svg('polygon', { 'class': 'above-scale', fill: ACC, stroke: ACC }, gC);
      }
      st.hot = -1;
      zone.setAttribute('aria-valuemax', p.n);
      zone.setAttribute('aria-valuenow', 1);
    }
    function layout() {
      var w = plot.clientWidth;
      if (!w) return;
      W = w; H = Math.round(E.clamp(W * 0.62, 300, 560));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      xs = E.scale(0, 100, m.l, W - m.r); xl = E.scale(ash(LOSS[0]), ash(LOSS[1]), m.l, W - m.r);
      yl = E.scale(ash(LOSS[0]), ash(LOSS[1]), H - m.b, m.t); yo = E.scale(ash(OTHER[0]), ash(OTHER[1]), H - m.b, m.t);
      zone.setAttribute('x', m.l); zone.setAttribute('y', m.t); zone.setAttribute('width', W - m.l - m.r); zone.setAttribute('height', H - m.t - m.b);
      axes(); place();
    }
    function estimates() {
      var e = d.estimates[st.w], sc = C.rowScale(-1.5, 1.5);
      each(fig.querySelectorAll('[data-k]'), function (el) {
        var r = e[el.dataset.k];
        C.track(el.querySelector('.track'), sc, { zero: [0, 1], iv: [Math.max(r.lo, -1.5), Math.min(r.hi, 1.5)], pt: r.est, color: ACC });
        el.querySelector('.sh').textContent = r.est_s; el.querySelector('.ivs').textContent = r.ci_s;
      });
      C.ticks(fig, sc, [-1, 0, 1], function (tk) { return signed(tk, 0); });
      each(fig.querySelectorAll('.nind'), function (x) { x.textContent = d.windows[st.w].n; });
      each(fig.querySelectorAll('[data-when]'), function (el) { el.hidden = el.dataset.when !== st.view && el.dataset.when !== st.w; });
    }
    function show(i) {
      var p = d.windows[st.w];
      st.hot = i;
      rest.hidden = i >= 0; hit.hidden = i < 0;
      if (i >= 0) {
        o.nm.textContent = d.titles[p.code[i]]; o.cd.textContent = p.code[i];
        o.s1.textContent = p.share[i].toFixed(1) + '%'; o.s2.textContent = signed(-p.x[i], 1) + '%'; o.s3.textContent = signed(p.y[i], 1) + '%';
        zone.setAttribute('aria-valuenow', i + 1);
        zone.setAttribute('aria-valuetext', hit.textContent.trim());
      }
      place();
    }
    function nearest(e) {
      var b = svg.getBoundingClientRect(), x = (e.clientX - b.left) * (W / b.width), y = (e.clientY - b.top) * (H / b.height), best = -1, gap = Infinity, i, g;
      for (i = 0; i < pos.length; i++) {
        g = Math.hypot(pos[i][0] - x, pos[i][1] - y);
        if (g <= Math.max(14, pos[i][2]) && g < gap) { gap = g; best = i; }
      }
      return best;
    }
    function go(to, instant) {
      cancelAnimationFrame(raf);
      axes(); estimates();
      if (instant || E.reduced()) { st.t = to; place(); return; }
      var from = st.t, t0 = performance.now();
      raf = requestAnimationFrame(function step(now) {
        var k = E.reduced() ? 1 : E.clamp((now - t0) / 900, 0, 1);
        st.t = from + (to - from) * E.ease(k);
        place();
        if (k < 1) raf = requestAnimationFrame(step);
      });
    }
    zone.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { var i = nearest(e); if (i !== st.hot) show(i); } });
    zone.addEventListener('pointerdown', function (e) { show(nearest(e)); });
    zone.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && document.activeElement !== zone) show(-1); });
    zone.addEventListener('focus', function () { if (st.hot < 0) show(0); });
    zone.addEventListener('blur', function () { show(-1); });
    zone.addEventListener('keydown', function (e) {
      var last = d.windows[st.w].n - 1, i = st.hot;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i++;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i--;
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = last;
      else return;
      e.preventDefault();
      show(E.clamp(i, 0, last));
    });
    var radios = E.radios(fig, function (nm, v) {
      st[nm] = v;
      if (nm === 'w') { build(); show(-1); estimates(); place(); } else go(v === 'match' ? 1 : 0);
    });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(plot); else window.addEventListener('resize', layout);
    build(); estimates(); layout();
    return {
      state: function (s) {
        st.w = s === 'early' ? 'w2015' : 'w2021'; st.view = s === 'share' ? 'share' : 'match';
        radios.set('w', st.w, true); radios.set('view', st.view, true);
        build(); go(st.view === 'match' ? 1 : 0, true);
        show(s === 'hot' ? 0 : -1);
      }
    };
  };
})();
