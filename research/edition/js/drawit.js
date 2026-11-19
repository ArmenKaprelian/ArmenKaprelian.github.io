/* H1, the hub's opening figure. The reader draws the share of eligible firms with an available statement for
   2022 to 2024, then the data appear. The part of the chart to draw in is marked as such: tinted, cornered in
   the colour of what the reader acts on, with a question mark over each year and a mark that shows the gesture
   until the first stroke. After the data appear, three controls change what is counted, what is shown and the
   years, and the reader can draw again. Every word on the figure comes from the page (data-l-* attributes),
   every printed number from the data file's strings. The reader's guess stays in this closure: it is never
   written to the address, to storage or to an attribute. */
(function () {
  'use strict';
  var E = window.Edition;
  E.have.drawit = true;
  var ACC = '#79CDBF', PALE = '#C7F8E7', DEEP = '#1C8383', LINE = '#2E333D', DIM = '#7D889C', BELOW = '#3C4852', FUCHSIA = '#DB78B1', STAGE = '#03060E';

  E.figs.h1 = function (fig, d) {
    var plot = fig.querySelector('.plot'), sec = fig.closest('section');
    var reads = sec.querySelectorAll('.reads'), after = sec.querySelector('.after'), first = fig.querySelector('.first');
    var bShow = fig.querySelector('[data-act=show]'), bSkip = fig.querySelector('[data-act=skip]'), bAgain = fig.querySelector('[data-act=again]');
    var again = fig.querySelector('.again'), tryit = fig.querySelector('.tryit'), oDone = fig.querySelector('.done');
    var you = sec.querySelector('.you');
    var L = fig.dataset;
    var GY = [2022, 2023, 2024], Y0 = 2021;
    var st = { phase: 'draw', pop: 'eligible', show: 'share', range: 'short', guess: {}, prog: 1, seenReg: false };
    var W = 0, H = 0, m = { l: 40, r: 58, t: 24, b: 28 }, sx, sy, raf = 0, dragging = false;
    var clipId = 'h1clip' + Math.round(Math.random() * 1e6);

    var svg = E.svg('svg', { role: 'img', 'aria-label': fig.getAttribute('aria-label') || '' }, plot);
    var gStatic = E.svg('g', {}, svg), gDyn = E.svg('g', { 'pointer-events': 'none' }, svg);
    var ghost = E.svg('g', { 'pointer-events': 'none' }, svg), ghostLine = E.svg('path', { fill: 'none', stroke: FUCHSIA, 'stroke-width': 2, 'stroke-dasharray': '5 4', opacity: 0.55 }, ghost);
    var ghostMark = E.svg('rect', { width: 13, height: 13, fill: STAGE, stroke: FUCHSIA, 'stroke-width': 2 }, ghost), demoRaf = 0, demoFixed = null;
    var zone = E.svg('rect', { 'class': 'zone', fill: 'transparent' }, svg);
    var handles = GY.map(function (y) {
      return E.svg('rect', { 'class': 'handle', tabindex: 0, role: 'slider', 'aria-label': (L.lGuess || '') + ' ' + y,
        'aria-valuemin': 0, 'aria-valuemax': 100, width: 13, height: 13, 'pointer-events': 'none', stroke: FUCHSIA, 'stroke-width': 2 }, svg);
    });

    function yi(y) { return d.years.indexOf(y); }
    function at(pop, key, y) { return d[pop][key][yi(y)]; }
    var YA = d.years[0], YZ = d.years[d.years.length - 1];
    function span() { return st.range === 'long' ? [YA, YZ] : [2019, YZ]; }
    function complete() { return GY.every(function (y) { return st.guess[y] != null; }); }
    function shareView() { return st.show === 'share'; }

    function layout() {
      var w = plot.clientWidth;
      if (!w) return;
      W = w; H = Math.round(E.clamp(W * 0.5, 250, 430));
      m.r = shareView() ? 58 : 112;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      var s = span();
      sx = E.scale(s[0], s[1], m.l, W - m.r);
      sy = shareView() ? E.scale(0, 100, H - m.b, m.t) : E.scale(0, st.range === 'long' ? 5.5e6 : 4.5e6, H - m.b, m.t);
      zone.setAttribute('x', sx(Y0 + 0.5)); zone.setAttribute('y', m.t - 10);
      zone.setAttribute('width', Math.max(0, sx(GY[2] + 0.5) - sx(Y0 + 0.5))); zone.setAttribute('height', H - m.b - m.t + 20);
      drawStatic(); draw(); demo();
    }

    function drawStatic() {
      E.clear(gStatic);
      var s = span(), ticks, i, y, t;
      if (shareView()) ticks = [0, 25, 50, 75, 100];
      else { ticks = []; for (t = 0; t <= (st.range === 'long' ? 5 : 4); t++) ticks.push(t * 1e6); }
      ticks.forEach(function (tk) {
        var yy = Math.round(sy(tk)) + 0.5;
        E.svg('line', { x1: m.l, x2: W - m.r, y1: yy, y2: yy, stroke: tk === 0 ? DIM : LINE, 'stroke-width': 1 }, gStatic);
        E.svg('text', { x: m.l - 8, y: yy, dy: '.32em', 'text-anchor': 'end' }, gStatic, shareView() ? tk + (tk === 100 ? '%' : '') : String(tk / 1e6));
      });
      if (!shareView()) E.svg('text', { x: 0, y: m.t - 10, 'text-anchor': 'start', 'class': 'era' }, gStatic, (L.lMillion || '').toUpperCase());
      var pitch = (W - m.l - m.r) / (s[1] - s[0]), step = Math.max(1, Math.ceil(44 / pitch));
      for (y = s[0]; y <= s[1]; y++) {
        if ((s[1] - y) % step) continue;
        E.svg('text', { x: sx(y), y: H - m.b + 18, 'text-anchor': 'middle' }, gStatic, d.years_s[yi(y)]);
      }
      if (st.range === 'long') {
        var bx = Math.round(sx(2018.5)) + 0.5;
        E.svg('line', { x1: bx, x2: bx, y1: m.t - 4, y2: H - m.b, stroke: BELOW, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, gStatic);
        E.svg('text', { x: bx - 7, y: m.t - 8, 'text-anchor': 'end', 'class': 'era' }, gStatic, (L.lRosstat || '').toUpperCase());
        E.svg('text', { x: bx + 7, y: m.t - 8, 'text-anchor': 'start', 'class': 'era' }, gStatic, (L.lFns || '').toUpperCase());
      }
    }

    // A line through the years of the current span, broken where the provider changes and where a year has
    // no value (2011 has no rate).
    function series(parent, pop, key, color, width) {
      var s = span(), parts = st.range === 'long' ? [[s[0], 2018], [2019, s[1]]] : [[s[0], s[1]]];
      parts.forEach(function (p) {
        var dstr = '', pen = false, y, v;
        for (y = p[0]; y <= p[1]; y++) {
          v = at(pop, key, y);
          if (v == null) { pen = false; continue; }
          dstr += (pen ? 'L' : 'M') + sx(y).toFixed(1) + ' ' + sy(v).toFixed(1);
          pen = true;
        }
        if (dstr) E.svg('path', { d: dstr, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linejoin': 'round', 'stroke-linecap': 'square' }, parent);
      });
    }
    function square(parent, x, y, size, fill) { E.svg('rect', { x: x - size / 2, y: y - size / 2, width: size, height: size, fill: fill }, parent); }
    function corners(parent, x, y, w, h) {            // the site's corner marks around the part to draw in
      var c = 12, d = 'M' + x + ' ' + (y + c) + 'V' + y + 'H' + (x + c) + 'M' + (x + w - c) + ' ' + y + 'H' + (x + w) + 'V' + (y + c) +
        'M' + (x + w) + ' ' + (y + h - c) + 'V' + (y + h) + 'H' + (x + w - c) + 'M' + (x + c) + ' ' + (y + h) + 'H' + x + 'V' + (y + h - c);
      E.svg('path', { d: d, fill: 'none', stroke: FUCHSIA, 'stroke-width': 2.5 }, parent);
    }
    // The gesture, shown until the first stroke: a mark that travels across the three years, trailing a dashed
    // line from the 2021 value. It rises and falls by the same amount, so it suggests no answer.
    function demoAt(t) {
      var v0 = at('eligible', 'share', Y0), k = E.clamp(t / 0.8, 0, 1), x = sx(Y0) + (sx(GY[2]) - sx(Y0)) * k;
      var y = sy(v0) + Math.sin(k * Math.PI * 2) * Math.min(46, (H - m.b - m.t) * 0.16);
      ghostMark.setAttribute('x', x - 6.5); ghostMark.setAttribute('y', y - 6.5);
      ghostLine.setAttribute('d', 'M' + sx(Y0).toFixed(1) + ' ' + sy(v0).toFixed(1) + 'L' + x.toFixed(1) + ' ' + y.toFixed(1));
    }
    function demo() {
      cancelAnimationFrame(demoRaf);
      var on = st.phase === 'draw' && !Object.keys(st.guess).length && W;
      ghost.style.display = on ? '' : 'none';
      if (!on) return;
      if (demoFixed != null || E.reduced()) { demoAt(demoFixed != null ? demoFixed : 0.5); return; }
      demoRaf = requestAnimationFrame(function step(now) {
        if (E.reduced()) { demoAt(0.5); return; }
        if (st.phase !== 'draw' || Object.keys(st.guess).length) { ghost.style.display = 'none'; return; }
        demoAt((now % 3200) / 3200);
        demoRaf = requestAnimationFrame(step);
      });
    }
    // The key above the chart names the lines once there are two or more. Its words are in the page.
    var key = fig.querySelector('.key');
    function showKey(entries) {
      key.hidden = !entries.length;
      Array.prototype.forEach.call(key.querySelectorAll('[data-k]'), function (el) {
        var hit = entries.filter(function (e) { return e[0] === el.dataset.k; })[0];
        el.hidden = !hit;
        if (hit) el.querySelector('i').style.background = hit[1];
      });
    }

    function draw() {
      if (!W) return;
      E.clear(gDyn);
      var v0 = at('eligible', 'share', Y0), pts, i, y;
      if (st.phase === 'draw') {
        showKey([]);
        var zx = Math.round(sx(Y0 + 0.5)), zw = Math.round(sx(GY[2] + 0.5)) - zx, zy = m.t - 6, zh = H - m.b - m.t + 6;
        E.svg('rect', { x: zx, y: zy, width: zw, height: zh, fill: FUCHSIA, 'fill-opacity': 0.07 }, gDyn);
        corners(gDyn, zx, zy, zw, zh);
        GY.forEach(function (yy) { var x = Math.round(sx(yy)) + 0.5; E.svg('line', { x1: x, x2: x, y1: m.t, y2: H - m.b, stroke: BELOW, 'stroke-width': 1, 'stroke-dasharray': '2 3' }, gDyn); });
        square(gDyn, sx(Y0), sy(v0), 8, ACC);
        E.svg('text', { x: sx(Y0), y: sy(v0) - 12, 'text-anchor': 'middle', 'class': 'v' }, gDyn, at('eligible', 'share_s', Y0));
        if (!Object.keys(st.guess).length) E.svg('text', { x: zx + zw / 2, y: zy + 24, 'text-anchor': 'middle', 'class': 'hint' }, gDyn, (L.lHint || '').toUpperCase());
        GY.forEach(function (yy) {                  // a question mark over a year not yet drawn, the reader's value over a year drawn
          var set = st.guess[yy] != null;
          E.svg('text', { x: sx(yy), y: sy(set ? st.guess[yy] : v0) - 14, 'text-anchor': 'middle', 'class': 'v you' }, gDyn, set ? st.guess[yy] + '%' : '?');
        });
      } else {
        var clip = E.svg('clipPath', { id: clipId }, gDyn);
        E.svg('rect', { x: m.l - 8, y: 0, width: (W - m.l + 60) * E.ease(st.prog), height: H }, clip);
        var g = E.svg('g', { 'clip-path': 'url(#' + clipId + ')' }, gDyn), s = span();
        if (shareView()) {
          var sel = st.pop, other = sel === 'eligible' ? 'registered' : 'eligible';
          if (other === 'eligible' || st.seenReg) series(g, other, 'share', DEEP, 2);
          series(g, sel, 'share', ACC, 2.5);
          showKey(st.seenReg ? [[sel, ACC], [other, DEEP]] : []);
          [Y0, GY[2], s[1]].filter(function (yy, k, a) { return a.indexOf(yy) === k; }).forEach(function (yy) {
            var x = sx(yy), yv = sy(at(sel, 'share', yy));
            square(g, x, yv, 7, ACC);
            if (yy === s[1]) E.svg('text', { x: x + 9, y: yv, dy: '.32em', 'class': 'v' }, g, at(sel, 'share_s', yy));
            else E.svg('text', { x: x, y: yv - 11, 'text-anchor': 'middle', 'class': 'v' }, g, at(sel, 'share_s', yy));
          });
        } else {
          var oth = st.pop === 'eligible' ? 'registered' : 'eligible';
          series(g, oth, 'n', DEEP, 2);
          series(g, st.pop, 'n', PALE, 2.5);
          series(g, st.pop, 'a', ACC, 2.5);
          showKey([[st.pop, PALE], [oth, DEEP], ['statements', ACC]]);
          [['n', PALE], ['a', ACC]].forEach(function (k) {
            var x = sx(s[1]), yv = sy(at(st.pop, k[0], s[1]));
            square(g, x, yv, 7, k[1]);
            E.svg('text', { x: x + 9, y: yv, dy: '.32em', 'class': 'v' }, g, at(st.pop, k[0] + '_s', s[1]));
          });
        }
      }
      // The reader's line: from the 2021 value through the years drawn so far.
      var showGuess = st.phase === 'draw' || (st.range === 'short' && shareView() && !st.seenReg && complete());
      if (showGuess) {
        pts = [sx(Y0).toFixed(1) + ' ' + sy(v0).toFixed(1)];
        for (i = 0; i < GY.length; i++) { if (st.guess[GY[i]] == null) break; pts.push(sx(GY[i]).toFixed(1) + ' ' + sy(st.guess[GY[i]]).toFixed(1)); }
        if (pts.length > 1) E.svg('path', { d: 'M' + pts.join('L'), fill: 'none', stroke: FUCHSIA, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-dasharray': st.phase === 'draw' ? '' : '5 4' }, gDyn);
        if (st.phase !== 'draw' && complete()) {      // the reader's last value stays beside the data, under or over its point, away from the data's line
          var gy = sy(st.guess[GY[2]]), under = st.guess[GY[2]] <= at('eligible', 'share', GY[2]);
          E.svg('text', { x: sx(GY[2]), y: gy + (under ? 22 : -13), 'text-anchor': 'middle', 'class': 'v you' }, gDyn, st.guess[GY[2]] + '%');
        }
      }
      handles.forEach(function (h, k) {
        var yy = GY[k], set = st.guess[yy] != null, v = set ? st.guess[yy] : v0;
        h.style.display = showGuess && (st.phase === 'draw' || set) ? '' : 'none';
        h.setAttribute('x', sx(yy) - 5.5); h.setAttribute('y', sy(v) - 5.5);
        h.setAttribute('fill', set ? FUCHSIA : '#03060E');
        h.setAttribute('opacity', set ? 1 : 0.55);
        h.setAttribute('aria-valuenow', Math.round(v));
        h.setAttribute('tabindex', st.phase === 'draw' ? 0 : -1);
      });
      zone.style.display = st.phase === 'draw' ? '' : 'none';
    }

    function sync() {
      var shown = st.phase === 'shown', key = shareView() ? st.pop : 'counts';
      bShow.disabled = !complete();
      first.hidden = shown; after.hidden = !shown; again.hidden = !shown; tryit.hidden = shown;
      oDone.textContent = GY.filter(function (y) { return st.guess[y] != null; }).length;
      Array.prototype.forEach.call(reads, function (el) { el.hidden = !shown; });
      Array.prototype.forEach.call(sec.querySelectorAll('[data-when]'), function (p) {
        p.hidden = !(p.dataset.when === key || (p.dataset.when === 'long' && st.range === 'long'));
      });
      if (you) {
        you.hidden = !(shown && complete());
        if (complete()) {
          var g = st.guess[2024], was = at('eligible', 'share', Y0), expected = g < was - 1 ? 'fall' : g > was + 1 ? 'rise' : 'flat';
          you.querySelector('[data-you]').textContent = g + '%';
          Array.prototype.forEach.call(you.querySelectorAll('[data-verdict]'), function (el) { el.hidden = el.dataset.verdict !== expected; });
          you.querySelector('[data-close]').hidden = Math.abs(g - at('eligible', 'share', 2024)) > 2;
        }
      }
      demo();
    }

    function reveal(instant) {
      st.phase = 'shown';
      sync();
      cancelAnimationFrame(raf);
      if (instant || E.reduced()) { st.prog = 1; draw(); return; }
      var t0 = performance.now();
      st.prog = 0; draw();
      raf = requestAnimationFrame(function tick(now) {
        st.prog = E.reduced() ? 1 : E.clamp((now - t0) / 1100, 0, 1);
        draw();
        if (st.prog < 1) raf = requestAnimationFrame(tick);
      });
    }

    // Drawing: a press or a stroke across the three years sets each year the pointer crosses.
    function put(e) {
      var r = svg.getBoundingClientRect();
      var x = (e.clientX - r.left) * (W / r.width), y = (e.clientY - r.top) * (H / r.height);
      var yr = E.clamp(Math.round(sx.inv(x)), GY[0], GY[2]);
      st.guess[yr] = Math.round(E.clamp(sy.inv(y), 0, 100));
      sync(); draw();
    }
    zone.addEventListener('pointerdown', function (e) { if (st.phase !== 'draw') return; dragging = true; zone.setPointerCapture(e.pointerId); put(e); e.preventDefault(); });
    zone.addEventListener('pointermove', function (e) { if (dragging) put(e); });
    ['pointerup', 'pointercancel'].forEach(function (t) { zone.addEventListener(t, function () { dragging = false; }); });
    handles.forEach(function (h, k) {
      h.addEventListener('keydown', function (e) {
        if (st.phase !== 'draw') return;
        var step = e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowDown' || e.key === 'ArrowLeft' ? -1 : e.key === 'PageUp' ? 10 : e.key === 'PageDown' ? -10 : 0;
        if (!step) return;
        e.preventDefault();
        var yy = GY[k], prev = k && st.guess[GY[k - 1]] != null ? st.guess[GY[k - 1]] : Math.round(at('eligible', 'share', Y0));
        st.guess[yy] = E.clamp((st.guess[yy] != null ? st.guess[yy] : prev) + step, 0, 100);
        sync(); draw();
      });
    });
    bShow.addEventListener('click', function () { reveal(false); });
    bSkip.addEventListener('click', function () { st.guess = {}; reveal(false); });
    bAgain.addEventListener('click', function () {                 // back to the empty chart, for another try
      cancelAnimationFrame(raf);
      st = { phase: 'draw', pop: 'eligible', show: 'share', range: 'short', guess: {}, prog: 1, seenReg: false };
      radios.set('pop', 'eligible', true); radios.set('show', 'share', true); radios.set('range', 'short', true);
      sync(); layout();
    });
    var radios = E.radios(after, function (nm, v) {
      st[nm] = v;
      if (nm === 'pop' && v === 'registered') st.seenReg = true;
      sync(); layout();
    });

    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(plot); else window.addEventListener('resize', layout);
    sync(); layout();

    return {
      // Named states for the lab's frames and checks.
      state: function (s) {
        cancelAnimationFrame(raf);
        demoFixed = 0.5;                                   // the gesture mark held still, so a frame can be taken again
        st = { phase: 'draw', pop: 'eligible', show: 'share', range: 'short', guess: {}, prog: 1, seenReg: false };
        radios.set('pop', 'eligible', true); radios.set('show', 'share', true); radios.set('range', 'short', true);
        if (s !== 'start') st.guess = { 2022: 58, 2023: 54, 2024: 51 };
        if (s === 'half') st.guess = { 2022: 58 };
        if (s === 'skipped') st.guess = {};
        if (s !== 'start' && s !== 'drawn' && s !== 'half') st.phase = 'shown';
        if (s === 'start') showKey([]);
        if (s === 'registered') { st.pop = 'registered'; st.seenReg = true; radios.set('pop', 'registered', true); }
        if (s === 'counts' || s === 'longcounts') { st.show = 'counts'; radios.set('show', 'counts', true); }
        if (s === 'long' || s === 'longcounts') { st.range = 'long'; radios.set('range', 'long', true); }
        sync(); layout();
      }
    };
  };
})();
