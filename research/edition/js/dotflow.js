/* The dot flow. O1 (Chapter 2): firms registered at the end of 2019, one dot per 2,000 firms, followed through
   the yearly transitions to the data's last year among three places: statement available (a solid square), no
   statement (a hollow square) and removed from the register (a small grey square). The data file gives every
   dot's path as a string of one state per year. The dots of the 2019 cohort follow that cohort's real six-year
   histories through 2024.
   The picture is a pure function of T, the year as a real number from 0 (2019) to the last year's index: the slider, the
   play button and the lab's frame capture all call render(T). The canvas holds dots only. Every word and
   number is a page element laid over it. */
(function () {
  'use strict';
  var E = window.Edition;
  E.have.dotflow = true;
  var ACC = '#79CDBF', GONE = '#8E99A8', STAGE = '#03060E';
  var D = 0.45;          // the share of a transition over which the dots' departures are spread

  E.figs.o1 = function (fig, d) {
    var stage = fig.querySelector('.stage'), cv = stage.querySelector('canvas'), ctx = cv.getContext('2d');
    var slider = fig.querySelector('input[type=range]'), bPlay = fig.querySelector('[data-act=play]');
    var oYear = fig.querySelector('.yr'), oShare = fig.querySelector('.sh');
    var trace = fig.querySelector('.trace'), entering = stage.querySelector('.enter');
    var n = d.years.length, R = d.runs, B = d.by_year;
    var dots = [], i, r, k, t;
    // grp: the dots that light together under the pointer. A cohort dot belongs with every dot of its real
    // six-year history, a dot that entered later with the dots of its own path.
    for (r = 0; r < R.history.length; r++) for (k = 0; k < R.dots[r]; k++) dots.push({ h: R.history[r], run: r, grp: R.later[r] ? 'l' + r : 'c' + R.six[r] });
    var N = dots.length;
    var st = { T: 0, hot: null };

    // ---- slots: where each dot sits in its pile in each year ------------------------------------------
    // A pile is filled from its lowest slot. Dots that stay keep their slots. Dots that arrive take the slots
    // just left, the ones that will stay longest going lowest, and the highest dots drop into any slot still
    // empty, so a pile is always a solid block whose height is its count.
    function leave(h, t0) { var s = h[t0]; for (var u = t0 + 1; u < n; u++) if (h[u] !== s) return u; return n + 1; }
    var slot = new Int16Array(N * n).fill(-1);
    var occAt = { A: [], N: [], X: [] }, count = { A: [], N: [], X: [] };
    ['A', 'N'].forEach(function (P) {
      var occ = [];
      for (var t = 0; t < n; t++) {
        var arrive = [], s, id;
        for (s = 0; s < occ.length; s++) { id = occ[s]; if (id >= 0 && dots[id].h[t] !== P) occ[s] = -1; }
        for (id = 0; id < N; id++) if (dots[id].h[t] === P && (t === 0 || dots[id].h[t - 1] !== P)) arrive.push(id);
        arrive.sort(function (a, b) { return leave(dots[b].h, t) - leave(dots[a].h, t) || dots[a].run - dots[b].run || a - b; });
        var holes = [];
        for (s = 0; s < occ.length; s++) if (occ[s] < 0) holes.push(s);
        arrive.forEach(function (a) { if (holes.length) occ[holes.shift()] = a; else occ.push(a); });
        while (holes.length) {
          while (occ.length && occ[occ.length - 1] < 0) occ.pop();
          var hole = holes.shift();
          if (hole >= occ.length) break;
          occ[hole] = occ.pop();
        }
        while (occ.length && occ[occ.length - 1] < 0) occ.pop();
        for (s = 0; s < occ.length; s++) slot[occ[s] * n + t] = s;
        occAt[P][t] = occ.slice(); count[P][t] = occ.length;
      }
    });
    // The removed pile only grows: each year's removals lie on top of the earlier ones.
    var gone = new Int8Array(N).fill(-1), xocc = [];
    for (t = 1; t < n; t++) {
      var out = [];
      for (i = 0; i < N; i++) if (dots[i].h[t] === 'X' && dots[i].h[t - 1] !== 'X') out.push(i);
      out.sort(function (a, b) { return (dots[a].h[t - 1] < dots[b].h[t - 1] ? -1 : dots[a].h[t - 1] > dots[b].h[t - 1] ? 1 : 0) || slot[a * n + t - 1] - slot[b * n + t - 1]; });
      out.forEach(function (id) { gone[id] = t; for (var u = t; u < n; u++) slot[id * n + u] = xocc.length; xocc.push(id); });
      count.X[t] = xocc.length;
    }
    count.X[0] = 0;
    // The order in which the dots of one flow set off: from the top of their pile down.
    var delay = new Float32Array(N * n);
    for (t = 0; t < n - 1; t++) {
      var groups = {};
      for (i = 0; i < N; i++) { var a = dots[i].h[t], b = dots[i].h[t + 1]; if (a !== b) (groups[a + b] = groups[a + b] || []).push(i); }
      Object.keys(groups).forEach(function (key) {
        var g = groups[key];
        g.sort(function (p, q) { return key[0] === '-' ? slot[p * n + t + 1] - slot[q * n + t + 1] : slot[q * n + t] - slot[p * n + t]; });
        g.forEach(function (id, j) { delay[id * n + t] = g.length > 1 ? D * j / (g.length - 1) : 0; });
      });
    }

    // ---- geometry ---------------------------------------------------------------------------------------
    var W = 0, Hc = 0, c = 8, sz = 6, cols = {}, x0 = {}, yb = 0, TOP = 34, BOTTOM = 52, dpr = 1;
    function layout() {
      var w = stage.clientWidth;
      if (!w) return;
      W = w;
      var gap = W < 520 ? 12 : 40, C = 0, opts = [83, 66, 54, 44], j;
      for (j = 0; j < opts.length; j++) { C = opts[j]; c = Math.min(8, Math.floor((W - 2 * gap) / C)); if (c >= 6) break; }
      c = Math.max(4, c);
      cols.A = Math.round(C * 34 / 83); cols.N = Math.round(C * 22 / 83); cols.X = C - cols.A - cols.N;
      sz = c - (c >= 6 ? 2 : 1);
      var rows = Math.max(Math.ceil(Math.max.apply(null, count.A) / cols.A), Math.ceil(Math.max.apply(null, count.N) / cols.N), Math.ceil(count.X[n - 1] / cols.X));
      x0.A = 0; x0.N = cols.A * c + gap; x0.X = x0.N + cols.N * c + gap;
      yb = TOP + rows * c; Hc = yb + BOTTOM;
      dpr = Math.min(window.devicePixelRatio || 1, 3);
      cv.width = Math.round(W * dpr); cv.height = Math.round(Hc * dpr); cv.style.height = Hc + 'px';
      ['A', 'N', 'X'].forEach(function (P) {
        var el = stage.querySelector('.pile[data-pile=' + P + ']');
        el.style.left = x0[P] + 'px'; el.style.top = (yb + 8) + 'px'; el.style.width = (cols[P] * c + (P === 'X' ? 0 : gap - 6)) + 'px';
      });
      entering.style.left = '0px'; entering.style.top = '0px';
      render();
    }
    function px(P, s) { return x0[P] + (s % cols[P]) * c; }
    function py(P, s) { return yb - (Math.floor(s / cols[P]) + 1) * c; }
    function hash(id) { var v = Math.sin(id * 12.9898) * 43758.5453; return v - Math.floor(v); }

    // ---- drawing ----------------------------------------------------------------------------------------
    function glyph(x, y, P, alpha) {
      if (alpha <= 0) return;
      ctx.globalAlpha = alpha;
      if (P === 'A') { ctx.fillStyle = ACC; ctx.fillRect(x, y, sz, sz); }
      else if (P === 'N') { var lw = sz >= 5 ? 1.5 : 1; ctx.strokeStyle = ACC; ctx.lineWidth = lw; ctx.strokeRect(x + lw / 2, y + lw / 2, sz - lw, sz - lw); }
      else { var q = Math.max(2, sz - 2), o = (sz - q) / 2; ctx.fillStyle = GONE; ctx.fillRect(x + o, y + o, q, q); }
    }
    function render() {
      if (!W) return;
      var T = E.clamp(st.T, 0, n - 1), t0 = Math.min(Math.floor(T), n - 1), u = T - t0, t1 = Math.min(t0 + 1, n - 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, Hc);
      var hot = st.hot;
      for (var id = 0; id < N; id++) {
        var h = dots[id].h, a = h[t0], b = u > 0 ? h[t1] : a;
        if (a === '-' && b === '-') continue;
        var dim = hot && dots[id].grp !== hot ? 0.25 : 1;
        var s0 = slot[id * n + t0], s1 = slot[id * n + t1], v = 0;
        if (u > 0 && (a !== b || s0 !== s1)) v = E.ease(E.clamp((u - delay[id * n + t0]) / (1 - D), 0, 1));
        if (a === 'X') {
          glyph(px('X', s0), py('X', s0), 'X', dim * 0.8);
          continue;
        }
        if (a === b && s0 === s1) { glyph(px(a, s0), py(a, s0), a, dim); continue; }
        var X1 = px(b, s1), Y1 = py(b, s1), x, y;
        if (a === '-') {                      // entering the population: from the top edge, straight down
          var Y0 = 6 + Math.floor(hash(id) * 3) * c;
          glyph(X1, Y0 + (Y1 - Y0) * v, b, dim * E.clamp(v * 5, 0, 1));
          continue;
        }
        var X0 = px(a, s0), Yq = py(a, s0);
        if (a === b) { x = X0 + (X1 - X0) * v; y = Yq + (Y1 - Yq) * v; }
        else {                                // between piles: an arc over both
          var cx = (X0 + X1) / 2, cy = Math.min(Yq, Y1) - 40 - Math.abs(X1 - X0) * 0.12 - hash(id) * 30, w = 1 - v;
          x = w * w * X0 + 2 * w * v * cx + v * v * X1; y = w * w * Yq + 2 * w * v * cy + v * v * Y1;
        }
        var P = v < 0.5 ? a : b;
        glyph(x, y, P, dim * (P === 'X' ? 0.8 : 1));
      }
      ctx.globalAlpha = 1;
      entering.style.visibility = u > 0.02 && u < 0.98 ? 'visible' : 'hidden';
      readout(Math.round(T));
    }

    // ---- the numbers beside the picture: the data file's own strings -------------------------------------
    var shownYear = -1;
    function readout(yi) {
      if (yi === shownYear) return;
      shownYear = yi;
      oYear.textContent = d.years_s[yi];
      oShare.textContent = B.share_eligible_s[yi];
      stage.querySelector('.pile[data-pile=A] output').textContent = B.A_s[yi];
      stage.querySelector('.pile[data-pile=N] output').textContent = B.N_s[yi];
      stage.querySelector('.pile[data-pile=X] output').textContent = yi ? B.removed_cum_s[yi] : '0';
      slider.setAttribute('aria-valuetext', d.years_s[yi]);
    }

    // ---- time -------------------------------------------------------------------------------------------
    var raf = 0, anim = null, playing = false;
    // With ?profile=1 the page times its own frames while the flow plays and prints the mean and the 95th
    // percentile under the figure, for a reading in the reader's own browser.
    var prof = /[?&]profile=1(&|$)/.test(location.search) ? [] : null, lastFrame = 0;
    function showProf() {
      var s = prof.slice().sort(function (a, b) { return a - b; }), mean = s.reduce(function (a, b) { return a + b; }, 0) / s.length;
      var el = fig.querySelector('.prof'); el.hidden = false;
      el.querySelector('output').textContent = mean.toFixed(1) + ' / ' + s[Math.floor(s.length * 0.95)].toFixed(1) + ' (' + s.length + ')';
    }
    function setT(T) { st.T = E.clamp(T, 0, n - 1); slider.value = st.T; render(); }
    function stop() { cancelAnimationFrame(raf); anim = null; playing = false; lastFrame = 0; showPlay(); if (prof && prof.length) showProf(); }
    document.addEventListener('edition:motionchange', function () {
      if (!E.reduced()) return;
      var year = anim ? anim.to : Math.round(st.T);
      stop(); setT(year);
    });
    function showPlay() { bPlay.setAttribute('aria-pressed', playing ? 'true' : 'false'); bPlay.querySelector('.on').hidden = playing; bPlay.querySelector('.off').hidden = !playing; }
    function go(to, ms, then) {
      cancelAnimationFrame(raf);
      if (E.reduced() || ms <= 0) { setT(to); if (then) then(); return; }
      var from = st.T, t0 = performance.now();
      anim = { to: to };
      raf = requestAnimationFrame(function tick(now) {
        var p = E.clamp((now - t0) / ms, 0, 1);
        if (prof) { if (lastFrame) prof.push(now - lastFrame); lastFrame = now; }
        setT(from + (to - from) * p);
        if (p < 1) raf = requestAnimationFrame(tick); else { anim = null; lastFrame = 0; if (then) then(); }
      });
    }
    function play() {
      if (E.reduced()) { setT(st.T >= n - 1 ? 0 : Math.floor(st.T + 1e-6) + 1); return; }
      playing = true; showPlay();
      if (st.T >= n - 1) setT(0);
      (function next() {
        if (!playing) return;
        if (st.T >= n - 1) { stop(); return; }
        var to = Math.floor(st.T + 1e-6) + 1;
        go(to, 2600 * (to - st.T), function () { raf = requestAnimationFrame(function wait(now) { if (!playing) return; if (!wait.t) wait.t = now; if (now - wait.t < 650) raf = requestAnimationFrame(wait); else next(); }); });
      })();
    }
    bPlay.addEventListener('click', function () { if (playing) stop(); else play(); });
    slider.addEventListener('input', function () { stop(); setT(parseFloat(slider.value)); });
    slider.addEventListener('change', function () { var to = Math.round(st.T); go(to, 350 * Math.abs(to - st.T) + 1); });
    slider.addEventListener('keydown', function (e) {
      var step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (!step && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault(); stop();
      var cur = anim ? anim.to : Math.round(st.T), to = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : E.clamp(cur + step, 0, n - 1);
      go(to, 1500 * Math.abs(to - st.T));
    });
    if (E.reduced()) slider.step = 1;
    slider.max = n - 1;
    var ticks = fig.querySelector('.ticks');
    d.years_s.forEach(function (y) { var el = document.createElement('span'); el.textContent = y; ticks.appendChild(el); });

    // ---- the history under the pointer ----------------------------------------------------------------
    function dotAt(e) {
      if (st.T !== Math.round(st.T)) return -1;
      var rct = cv.getBoundingClientRect(), x = e.clientX - rct.left, y = e.clientY - rct.top, yi = Math.round(st.T), P, col, row, s;
      for (var j = 0; j < 3; j++) {
        P = 'ANX'[j];
        if (x < x0[P] || x >= x0[P] + cols[P] * c || y >= yb || y < TOP - c) continue;
        col = Math.floor((x - x0[P]) / c); row = Math.floor((yb - y) / c); s = row * cols[P] + col;
        if (P === 'X') return s < count.X[yi] ? xocc[s] : -1;
        return s < count[P][yi] ? occAt[P][yi][s] : -1;
      }
      return -1;
    }
    function showTrace(id) {
      var grp = id < 0 ? null : dots[id].grp;
      if (grp === st.hot) return;
      st.hot = grp;
      trace.querySelector('.rest').hidden = !!grp; trace.querySelector('.hit').hidden = !grp;
      if (grp) {
        var run = dots[id].run, cells = trace.querySelector('.cells'), later = R.later[run];
        E.clear(cells);
        // A cohort dot shows its real history, 2019 to 2024. A later dot shows its path from the year it entered.
        (later ? R.history[run] : R.six[run]).split('').forEach(function (ch) { var el = document.createElement('i'); el.className = ch === '-' ? 'O' : ch; cells.appendChild(el); });
        trace.querySelector('.t-cohort').hidden = later; trace.querySelector('.t-later').hidden = !later;
        trace.querySelector('output').textContent = later ? '' : R.firms_s[run];
      }
      render();
    }
    cv.addEventListener('pointermove', function (e) { showTrace(dotAt(e)); });
    cv.addEventListener('pointerdown', function (e) { showTrace(dotAt(e)); });
    cv.addEventListener('pointerleave', function () { showTrace(-1); });

    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(stage); else window.addEventListener('resize', layout);
    showPlay(); layout();
    // The flow starts once by itself when the figure is first well in view. A reader who asks for reduced
    // motion sees the last year at rest.
    var seen = false;
    if (E.reduced()) setT(n - 1);
    else if ('IntersectionObserver' in window) {
      var watch = new IntersectionObserver(function (es) {
        if (seen || !es[0].isIntersecting) return;
        seen = true; watch.disconnect();
        if (E.reduced()) return;
        if (st.T === 0 && !playing) play();
      }, { threshold: 0.6 });
      watch.observe(stage);
    }

    return {
      // Named states for the lab's frames and checks: y2019 to the last year, mid (halfway into 2022), hot.
      state: function (s) {
        stop(); seen = true; showTrace(-1);
        var m = /^y(\d{4})$/.exec(s);
        if (m) st.T = d.years.indexOf(+m[1]);
        else if (s === 'mid') st.T = 2.5;
        else if (s === 'hot') { st.T = 2; for (var q = 0; q < N; q++) if (R.six[dots[q].run] === 'NNNXXX') { showTrace(q); break; } }
        shownYear = -1; slider.value = st.T; render();
      },
      seek: function (T) { stop(); setT(T); },
      stats: function () { return { dots: N, A: count.A.slice(), N: count.N.slice(), X: count.X.slice(), cell: c, cols: cols, height: Hc }; }
    };
  };
})();
