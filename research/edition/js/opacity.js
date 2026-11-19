/* The Chapter 2 page's charts after the dot flow. O5: statement availability by ownership group and by legal
   form. O2: the opacity index's logistic curve, with two sliders. O3: continued availability by asset fifth.
   O4: the odds of an available statement for firms on the sanctions list, by year. Every word comes from the
   page and every printed number from the data files' strings. The settings of O2's sliders and the
   probability they give are the reader's own and are not data. */
(function () {
  'use strict';
  var E = window.Edition, C = E.chart;
  E.have.opacity = true;
  var each = C.each, whens = C.whens, pct = C.pct, scale = C.rowScale, drawTrack = C.track, drawTicks = C.ticks;
  var ACC = '#79CDBF', DEEP = '#269C96', PALE = '#C7F8E7', AMBER = '#FFB000', RED = '#E31A1C', FUCHSIA = '#DB78B1';
  var LINE = '#2E333D', DIM = '#7D889C', BELOW = '#3C4852', STAGE = '#03060E', GONE = '#8E99A8';
  var RAMP5 = ['#1C8383', '#50B5AA', '#79CDBF', '#A1E4D3', '#C7F8E7'];     // lowest fifth to highest
  var MINUS = '−', TIMES = '×';


  // ---- O5: state-related firms, and the legal form the fall sits in ----------------------------------------------
  E.figs.o5 = function (fig, d) {
    C = E.chart;
    var L = fig.dataset, st = { range: 'short', pop: 'eligible', year: 2024 };
    var yr = fig.querySelector('.yr'), hint = fig.querySelector('.hint'), charts = [];
    var SETS = { own: [['private', ACC], ['foreign_joint', DEEP], ['state', AMBER]], legal: [['llc', ACC], ['joint_stock', DEEP], ['unitary', AMBER]] };
    function yi(y) { return d.years.indexOf(y); }
    function label(y) { return d.years_s[yi(y)]; }
    function runs() { return st.range === 'long' ? C.runs(d.years, d.break_after) : [d.years.filter(function (y) { return y > d.break_after; })]; }
    function bounds() {                       // one scale for the two panels and for both counts of firms: the tens that hold every share
      var lo = 100, hi = 0;
      [].concat.apply([], runs()).forEach(function (y) {
        Object.keys(d.series).forEach(function (k) {
          ['eligible', 'registered'].forEach(function (pop) { var v = d.series[k][pop].share[yi(y)]; lo = Math.min(lo, v); hi = Math.max(hi, v); });
        });
      });
      return [Math.floor(lo / 10) * 10, Math.ceil(hi / 10) * 10];
    }
    function read() {
      var i = yi(st.year);
      yr.textContent = d.years_s[i];
      each(fig.querySelectorAll('[data-k]'), function (el) {
        var s = d.series[el.dataset.k][st.pop];
        el.querySelector('.sh').textContent = s.share_s[i];
        el.querySelector('.n').textContent = s.n_s[i];
      });
      whens(fig, st.pop);
    }
    each(fig.querySelectorAll('.panel'), function (panel) {
      var set = SETS[panel.dataset.panel], plot = panel.querySelector('.plot');
      set.forEach(function (s) { panel.querySelector('[data-k=' + s[0] + ']').querySelector('i').style.background = s[1]; });
      var ch = C.make(plot, {
        label: plot.getAttribute('aria-label'), pick: L.lPick, year: st.year, gap: 14, runs: runs, yearLabel: label,
        height: function (w) { return Math.round(E.clamp(w * 0.6, 220, 300)); },
        margins: function () { return { l: 40, r: 12, t: 26, b: 28 }; },
        draw: function (f, gA, gD, year) {
          var b = bounds(), ticks = [], t;
          f.lin(b[0], b[1]);
          for (t = b[0]; t <= b[1]; t += 10) ticks.push(t);
          C.axes(gA, f, { ticks: ticks, fmt: function (tk) { return pct(tk, tk === b[1]); }, label: label, sel: year,
            titles: st.range === 'long' ? [L.lRosstat, L.lFns] : null });
          set.forEach(function (s) {              // the falling group last, on top
            var sh = d.series[s[0]][st.pop].share;
            C.line(gD, f, d.years, sh, { stroke: s[1], 'stroke-width': s[1] === AMBER ? 3 : 2 });
            C.marks(gD, f, d.years, sh, 9, { fill: s[1], stroke: STAGE, 'stroke-width': 1.5 }, 0, year);
          });
        },
        onYear: function (y) {
          st.year = y; hint.hidden = true;
          charts.forEach(function (c) { if (c !== ch) c.set(y, true); });
          read();
        }
      });
      charts.push(ch);
    });
    var radios = E.radios(fig, function (nm, v) {
      st[nm] = v;
      charts.forEach(function (c) { c.layout(); c.set(st.year, true); });
      st.year = charts[0].year();
      read();
    });
    read();
    return {
      state: function (s) {
        st.range = s === 'long' ? 'long' : 'short';
        st.pop = s === 'registered' || s === 'registered2021' ? 'registered' : 'eligible';
        radios.set('range', st.range, true); radios.set('pop', st.pop, true);
        st.year = s === 'y2021' || s === 'registered2021' ? 2021 : s === 'y2025' ? 2025 : 2024;
        hint.hidden = s !== 'start';
        charts.forEach(function (c) { c.layout(); c.set(st.year, true); });
        read();
      }
    };
  };

  // ---- O5b: one square for each enterprise that had a statement for 2023 and none for 2024 --------------------------
  // The squares use the dot flow's three marks: solid with a statement, hollow without one, small and grey once
  // removed from the register. The counts come from the page, where the build wrote the dissertation's numbers.
  E.figs.o5b = function (fig) {
    var cv = fig.querySelector('canvas'), ctx = cv.getContext('2d'), D = fig.dataset;
    var N = +D.nAll, R = +D.nRemoved, K = +D.nKept, st = { at: 'y2024', t: 1 }, cell = 6, rows = 1, cols = 1, raf = 0;
    function mark(x, y, kind, alpha) {
      var sz = cell - 1, lw = 1, q = sz - 2;
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      if (kind === 'A') { ctx.fillStyle = ACC; ctx.fillRect(x, y, sz, sz); }
      else if (kind === 'X') { ctx.fillStyle = GONE; ctx.fillRect(x + 1, y + 1, q, q); }
      else { ctx.strokeStyle = kind === 'N' ? ACC : DIM; ctx.lineWidth = lw; ctx.strokeRect(x + lw / 2, y + lw / 2, sz - lw, sz - lw); }
    }
    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 3), i, x, y, kind;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cols * cell, rows * cell);
      for (i = 0; i < N; i++) {              // column by column: the removed enterprises first, then those still registered
        x = Math.floor(i / rows) * cell; y = (i % rows) * cell;
        kind = i < R ? 'X' : i < R + K ? 'N' : 'U';
        mark(x, y, 'A', 1 - st.t);
        mark(x, y, kind, (kind === 'X' ? 0.8 : 1) * st.t);
      }
      ctx.globalAlpha = 1;
    }
    function layout() {
      var w = cv.parentNode.clientWidth, dpr = Math.min(window.devicePixelRatio || 1, 3);
      if (!w) return;
      cell = w < 520 ? 5 : 6;
      rows = Math.ceil(N / Math.floor(Math.min(w, 780) / cell));
      for (var r = rows; r < rows + 40; r++) if (N % r === 0) { rows = r; break; }     // a full rectangle where the count allows one
      cols = Math.ceil(N / rows);
      cv.width = Math.round(cols * cell * dpr); cv.height = Math.round(rows * cell * dpr);
      cv.style.width = cols * cell + 'px'; cv.style.height = rows * cell + 'px';
      draw();
    }
    function go(to, instant) {
      cancelAnimationFrame(raf);
      whens(fig, to ? 'y2024' : 'y2023');
      if (instant || E.reduced()) { st.t = to; draw(); return; }
      var from = st.t, t0 = performance.now();
      raf = requestAnimationFrame(function tick(now) {
        var k = E.reduced() ? 1 : E.clamp((now - t0) / 700, 0, 1);
        st.t = from + (to - from) * E.ease(k);
        draw();
        if (k < 1) raf = requestAnimationFrame(tick);
      });
    }
    var radios = E.radios(fig, function (nm, v) { st.at = v; go(v === 'y2024' ? 1 : 0); });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(cv.parentNode); else window.addEventListener('resize', layout);
    layout();
    if (!E.reduced() && 'IntersectionObserver' in window) {      // once, when the figure is in view: the 2023 state, then 2024
      var watch = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        watch.disconnect();
        if (E.reduced()) return;
        st.t = 0; draw();
        setTimeout(function () { if (st.at === 'y2024') go(1); }, 500);
      }, { threshold: 0.6 });
      watch.observe(cv);
    }
    return {
      state: function (s) {
        st.at = s === 'y2023' ? 'y2023' : 'y2024';
        radios.set('at', st.at, true);
        go(st.at === 'y2024' ? 1 : 0, true);
      }
    };
  };

  // ---- O2: the opacity index and its curve -----------------------------------------------------------------------
  E.figs.o2 = function (fig, d) {
    var plot = fig.querySelector('.plot');
    var sb = fig.querySelector('[data-in=b]'), sc = fig.querySelector('[data-in=c]'), bEx = fig.querySelector('[data-act=example]');
    var oB = fig.querySelector('.ob'), oC = fig.querySelector('.oc'), oW = fig.querySelector('.om'), oP = fig.querySelector('.pr'), exline = fig.querySelector('.exline');
    var st = { b: +sb.value, c: +sc.value, ex: false }, W = 0, H = 0, m = { l: 44, r: 18, t: 16, b: 28 }, sx, sy;
    var svg = E.svg('svg', { role: 'img', 'aria-label': plot.getAttribute('aria-label') || '' }, plot);
    var gS = E.svg('g', {}, svg), gD = E.svg('g', {}, svg);
    var i22 = d.years.indexOf(2022), low = d.fifths[0], high = d.fifths[d.fifths.length - 1];
    var X1 = Math.log(low.share[i22] / (100 - low.share[i22])), X2 = X1 + Math.log(high.or[i22]);
    function P(u) { return 100 / (1 + Math.exp(-u)); }
    function signed(v) { return (v < 0 ? MINUS : '') + Math.abs(v).toFixed(1); }
    function square(x, y, size, attrs) { var a = { x: x - size / 2, y: y - size / 2, width: size, height: size }; for (var k in attrs) a[k] = attrs[k]; E.svg('rect', a, gD); }

    function layout() {
      var w = plot.clientWidth;
      if (!w) return;
      W = w; H = Math.round(E.clamp(W * 0.42, 240, 360));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      sx = E.scale(-6, 6, m.l, W - m.r); sy = E.scale(0, 100, H - m.b, m.t);
      E.clear(gS);
      [0, 25, 50, 75, 100].forEach(function (tk) {
        var yy = Math.round(sy(tk)) + 0.5;
        E.svg('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: tk === 0 ? DIM : LINE, 'stroke-width': 1 }, gS);
        E.svg('text', { x: m.l - 8, y: yy, dy: '.32em', 'text-anchor': 'end' }, gS, pct(tk, tk === 100));
      });
      [-6, -4, -2, 0, 2, 4, 6].forEach(function (tk) {
        E.svg('text', { x: sx(tk), y: H - m.b + 18, 'text-anchor': 'middle' }, gS, (tk < 0 ? MINUS : '') + Math.abs(tk));
      });
      var dstr = '', u;
      for (u = -6; u <= 6.001; u += 0.1) dstr += (dstr ? 'L' : 'M') + sx(u).toFixed(1) + ' ' + sy(P(u)).toFixed(1);
      E.svg('path', { d: dstr, fill: 'none', stroke: ACC, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, gS);
      draw();
    }
    function draw() {
      if (!W) return;
      E.clear(gD);
      var u = st.c - st.b, x = sx(u), y = sy(P(u)), base = H - m.b;
      if (st.ex) {                              // the chapter's example: the lowest fifth's share, then odds as many times as high
        var x1 = sx(X1), y1 = sy(P(X1)), x2 = sx(X2), y2 = sy(P(X2));
        E.svg('path', { d: 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'H' + x2.toFixed(1) + 'V' + y2.toFixed(1), fill: 'none', stroke: PALE, 'stroke-width': 1.5 }, gD);
        square(x1, y1, 8, { fill: PALE }); square(x2, y2, 8, { fill: PALE });
        E.svg('text', { x: x1 - 11, y: y1 - 2, 'text-anchor': 'end', 'class': 'v' }, gD, d.facts.share_q1_2022.s);
        E.svg('text', { x: x2 + 9, y: y2 + 17, 'class': 'v' }, gD, d.facts.example_q5.s);
        E.svg('text', { x: (x1 + x2) / 2, y: y1 + 16, 'text-anchor': 'middle', 'class': 's' }, gD, TIMES + ' ' + d.facts.or_q5_2022.s);
      }
      E.svg('path', { d: 'M' + m.l + ' ' + y.toFixed(1) + 'H' + x.toFixed(1) + 'V' + base, fill: 'none', stroke: BELOW, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, gD);
      square(x, y, 11, { fill: FUCHSIA, stroke: STAGE, 'stroke-width': 2 });
      var right = x < W - m.r - 64;           // the reader's value sits under the curve, where nothing else is drawn
      E.svg('text', { x: x + (right ? 11 : -11), y: y + 19, 'text-anchor': right ? 'start' : 'end', 'class': 'v you' }, gD, P(u).toFixed(1) + '%');
      oB.textContent = st.b.toFixed(1); oC.textContent = st.c.toFixed(1);
      oW.textContent = signed(st.b - st.c); oP.textContent = P(u).toFixed(1) + '%';
      bEx.setAttribute('aria-pressed', st.ex ? 'true' : 'false');
      exline.hidden = !st.ex;
    }
    sb.addEventListener('input', function () { st.b = +sb.value; draw(); });
    sc.addEventListener('input', function () { st.c = +sc.value; draw(); });
    bEx.addEventListener('click', function () { st.ex = !st.ex; draw(); });
    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(plot); else window.addEventListener('resize', layout);
    layout();
    return {
      state: function (s) {
        st.b = s === 'pressure' ? 4 : 1; st.c = 2; st.ex = s === 'example';
        sb.value = st.b; sc.value = st.c;
        draw();
      }
    };
  };

  // ---- O3: relative size and continued availability --------------------------------------------------------------
  E.figs.o3 = function (fig, d) {
    C = E.chart;
    var L = fig.dataset, st = { show: 'share', year: 2022 }, runs = C.runs(d.years);
    var key = fig.querySelector('.key'), yr = fig.querySelector('.yr'), hint = fig.querySelector('.hint'), plot = fig.querySelector('.plot');
    function yi(y) { return d.years.indexOf(y); }
    function label(y) { return d.years_s[yi(y)]; }
    var lo = 100;
    d.fifths.forEach(function (q) { q.share.forEach(function (v) { if (v != null) lo = Math.min(lo, v); }); });
    lo = Math.floor(lo / 5) * 5;
    each(key.querySelectorAll('[data-k]'), function (el) { el.querySelector('i').style.background = RAMP5[el.dataset.k - 1]; });
    function read() {
      var i = yi(st.year), odds = st.show === 'odds';
      yr.textContent = d.years_s[i];
      each(key.querySelectorAll('[data-k]'), function (el) {
        var q = d.fifths[el.dataset.k - 1];
        el.querySelector('output').textContent = !odds ? q.share_s[i] : q.or_s[i] == null ? '' : q.or_s[i] + ' (' + q.ci_s[i] + ')';
      });
      whens(fig, st.show);
    }
    var ch = C.make(plot, {
      label: plot.getAttribute('aria-label'), pick: L.lPick, year: st.year, yearLabel: label,
      runs: function () { return runs; },
      height: function (w) { return Math.round(E.clamp(w * 0.44, 250, 400)); },
      margins: function () { return { l: 44, r: 12, t: 26, b: 28 }; },
      draw: function (f, gA, gD, year) {
        var odds = st.show === 'odds', ticks = [], t;
        if (odds) { f.log(1, 5); ticks = [1, 2, 3, 4, 5]; } else { f.lin(lo, 100); for (t = lo; t <= 100; t += 5) ticks.push(t); }
        C.axes(gA, f, { ticks: ticks, base: odds ? 1 : null, fmt: function (tk) { return odds ? String(tk) : pct(tk, tk === 100); },
          label: label, sel: year, titles: [L.lRosstat, L.lFns] });
        if (odds) {
          var p = f.panels[f.panels.length - 1];
          E.svg('text', { x: p.x1, y: f.y(1) - 7, 'text-anchor': 'end', 'class': 'era' }, gA, (L.lRef || '').toUpperCase());
        }
        d.fifths.forEach(function (q, k) {
          if (odds && !k) return;
          var col = RAMP5[k], dx = odds ? (k - 2.5) * 3 : 0, vals = odds ? q.or : q.share;
          if (odds) C.bars(gD, f, d.years, q.lo, q.hi, { stroke: col, 'stroke-width': 1.5, opacity: 0.75 }, dx);
          C.line(gD, f, d.years, vals, { stroke: col, 'stroke-width': 2 }, dx);
          if (odds) C.marks(gD, f, d.years, vals, 5, { fill: col }, dx);
          C.marks(gD, f, d.years, vals, 9, { fill: col, stroke: STAGE, 'stroke-width': 1.5 }, dx, year);
        });
      },
      onYear: function (y) { st.year = y; hint.hidden = true; read(); }
    });
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; ch.redraw(); read(); });
    read();
    return {
      state: function (s) {
        st.show = s === 'odds' ? 'odds' : 'share';
        radios.set('show', st.show, true);
        st.year = s === 'y2025' ? 2025 : 2022;
        hint.hidden = s !== 'start';
        ch.set(st.year, true); ch.redraw(); read();
      }
    };
  };

  // ---- Charts of rows (the helpers are edition/js/chart.js's): a name, a track with a bar or an interval, the value ---

  // ---- O10: the twenty largest industries, 2021 against a later year -----------------------------------------------
  E.figs.o10 = function (fig, d) {
    var st = { end: '2024' }, body = fig.querySelector('tbody'), endyr = fig.querySelector('.endyr'), sc = scale(d.lo, d.hi), rows = [], ticks = [], t;
    d.industry.forEach(function (name, i) {
      var tr = document.createElement('tr'), cells = [name, d.base_s[i], '', ''].map(function (t) {
        var td = document.createElement('td'); td.textContent = t; tr.appendChild(td); return td;
      });
      var wrap = document.createElement('span'), track = document.createElement('span'), dl = document.createElement('span');
      wrap.className = 'trw'; track.className = 'track'; dl.className = 'dl';
      wrap.appendChild(track); wrap.appendChild(dl); cells[3].appendChild(wrap);
      body.appendChild(tr);
      rows.push({ end: cells[2], track: track, dl: dl });
    });
    function draw() {
      var e = d.by_end[st.end];
      endyr.textContent = d.ends_s[d.ends.indexOf(+st.end)];
      rows.forEach(function (r, i) {
        r.end.textContent = e.share_s[i]; r.dl.textContent = e.change_s[i];
        drawTrack(r.track, sc, { zero: 0, bar: [0, e.change[i]], color: e.change[i] < 0 ? AMBER : ACC });
      });
    }
    for (t = d.lo; t <= d.hi; t += 4) ticks.push(t);
    drawTicks(fig, sc, ticks, function (tk) { return (tk < 0 ? MINUS : tk > 0 ? '+' : '') + Math.abs(tk); });
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; draw(); });
    draw();
    return { state: function (s) { st.end = s === 'y2022' ? '2022' : s === 'y2023' ? '2023' : s === 'y2025' ? '2025' : '2024'; radios.set('end', st.end, true); draw(); } };
  };

  // ---- O7: firms followed from before the invasion, by 2021 asset fifth or by ownership ----------------------------
  E.figs.o7 = function (fig, d) {
    var st = { by: 'size' }, sc = scale(0, d.max);
    function draw() {
      each(fig.querySelectorAll('[data-k]'), function (el) {
        var k = el.dataset.k, r = d.rows[k];
        drawTrack(el.querySelector('.track'), sc, { bar: [0, r.share], color: r.panel === 'size' ? RAMP5[k.slice(1) - 1] : ACC });
        el.querySelector('.sh').textContent = r.share_s; el.querySelector('.a').textContent = r.absent_s; el.querySelector('.n').textContent = r.n_s;
      });
      whens(fig, st.by);
    }
    drawTicks(fig, sc, [0, 1, 2, 3, 4, 5], function (tk) { return pct(tk, tk === d.max); });
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; draw(); });
    draw();
    return { state: function (s) { st.by = s === 'own' ? 'own' : 'size'; radios.set('by', st.by, true); draw(); } };
  };

  // ---- O8: size, profitability, and liquidity, entered together or one at a time -----------------------------------
  E.figs.o8 = function (fig, d) {
    var st = { view: 'together' }, sc = scale(d.min, d.max);
    function draw() {
      each(fig.querySelectorAll('[data-k]'), function (el) {
        var r = d.views[st.view][el.dataset.k];
        drawTrack(el.querySelector('.track'), sc, { zero: 0, iv: [r.lo, r.hi], pt: r.pct, color: ACC });
        el.querySelector('.sh').textContent = r.pct_s; el.querySelector('.ivs').textContent = r.ci_s;
      });
    }
    drawTicks(fig, sc, [0, 5, 10, 15], function (tk) { return pct(tk, tk === 15); });
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; draw(); });
    draw();
    return { state: function (s) { st.view = s === 'alone' ? 'alone' : 'together'; radios.set('view', st.view, true); draw(); } };
  };

  // ---- O9: firms on the sanctions list by preceding-year statement -------------------------------------------------
  E.figs.o9 = function (fig, d) {
    var sc = scale(0.08, 4, true);
    each(fig.querySelectorAll('[data-k]'), function (el) {
      var r = d.prior[el.dataset.k];
      drawTrack(el.querySelector('.track'), sc, { zero: 1, iv: [r.lo, r.hi], pt: r.or, color: RED });
      el.querySelector('.sh').textContent = r.or_s; el.querySelector('.ivs').textContent = r.ci_s;
    });
    drawTicks(fig, sc, [0.1, 0.25, 0.5, 1, 2, 4], String);
    return { state: function () {} };
  };

  // ---- O4: firms on the sanctions list ----------------------------------------------------------------------------
  E.figs.o4 = function (fig, d) {
    C = E.chart;
    var L = fig.dataset, st = { pop: 'eligible', year: 2024 }, runs = C.runs(d.years, d.break_after);
    var yr = fig.querySelector('.yr'), oOr = fig.querySelector('.or'), oCi = fig.querySelector('.ci'), hint = fig.querySelector('.hint'), plot = fig.querySelector('.plot');
    function yi(y) { return d.years.indexOf(y); }
    function label(y) { return d.years_s[yi(y)]; }
    function read() {
      var i = yi(st.year), s = d.series.sanctions[st.pop];
      yr.textContent = d.years_s[i]; oOr.textContent = s.or_s[i]; oCi.textContent = s.ci_s[i];
    }
    var ch = C.make(plot, {
      label: plot.getAttribute('aria-label'), pick: L.lPick, year: st.year, yearLabel: label,
      runs: function () { return runs; },
      height: function (w) { return Math.round(E.clamp(w * 0.46, 260, 410)); },
      margins: function () { return { l: 44, r: 12, t: 26, b: 28 }; },
      draw: function (f, gA, gD, year) {
        var s = d.series.sanctions[st.pop], p0 = f.panels[0];
        f.log(0.2, 10);
        C.axes(gA, f, { ticks: [0.25, 0.5, 1, 2, 4, 8], base: 1, fmt: String, label: label, sel: year, titles: [L.lRosstat, L.lFns] });
        E.svg('text', { x: p0.x0 + 5, y: f.y(1) - 7, 'class': 'era' }, gA, (L.lMore || '').toUpperCase());
        E.svg('text', { x: p0.x0 + 5, y: f.y(1) + 15, 'class': 'era' }, gA, (L.lLess || '').toUpperCase());
        C.bars(gD, f, d.years, s.lo, s.hi, { stroke: RED, 'stroke-width': 2, opacity: 0.6 });
        C.line(gD, f, d.years, s.or, { stroke: RED, 'stroke-width': 1.5, opacity: 0.6 });
        C.marks(gD, f, d.years, s.or, 7, { fill: RED });
        C.marks(gD, f, d.years, s.or, 11, { fill: RED, stroke: STAGE, 'stroke-width': 2 }, 0, year);
      },
      onYear: function (y) { st.year = y; hint.hidden = true; read(); }
    });
    var radios = E.radios(fig, function (nm, v) { st[nm] = v; ch.redraw(); read(); });
    read();
    return {
      state: function (s) {
        st.pop = s === 'registered' ? 'registered' : 'eligible';
        radios.set('pop', st.pop, true);
        st.year = s === 'y2013' ? 2013 : s === 'y2025' ? 2025 : 2024;
        hint.hidden = s !== 'start';
        ch.set(st.year, true); ch.redraw(); read();
      }
    };
  };
})();
