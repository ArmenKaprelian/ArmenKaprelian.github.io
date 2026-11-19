/* The defense deck's engine. No library. A slide is a .cell holding a 1600 by 900 .slide and its .notes.
   Views: presenting (one slide scaled to the window), the overview (O), the reading form (R), the presenter window (P opens
   it; it follows this window and can drive it). The deck opens on the core path, and C widens it to the full run and back. The address carries the slide's id and step.
   M turns the motion of the charts off and on. L runs a slide's live figure. Every word a viewer sees is in the page, not here. */
(() => {
  'use strict';
  const body = document.body, stage = document.getElementById('stage');
  const cells = [...document.querySelectorAll('.cell')], slides = cells.map(c => c.querySelector('.slide'));
  const hud = document.querySelector('.hud'), clock = document.querySelector('.clock');
  const q = new URLSearchParams(location.search), isPresenter = q.has('presenter');
  let i = 0, s = 1, peer = null, started = 0, typed = '';

  const steps = k => +(slides[k].dataset.steps || 1);
  const path = k => cells[k].dataset.path;                       // c core, e extra, x backup
  const allowed = k => !body.classList.contains('core') || path(k) !== 'e';
  const view = () => ['overview', 'read', 'presenter'].find(v => body.classList.contains(v)) || 'present';

  function fit() {
    if (view() !== 'present') { stage.style.transform = ''; return; }
    const k = Math.min(innerWidth / 1600, innerHeight / 900);
    stage.style.transform = 'translate(' + Math.round((innerWidth - 1600 * k) / 2) + 'px,' + Math.round((innerHeight - 900 * k) / 2) + 'px) scale(' + k + ')';
  }

  function paint() {
    cells.forEach((c, k) => { c.classList.toggle('on', k === i); c.classList.remove('next'); });
    slides[i].querySelectorAll('[data-at]').forEach(e => e.classList.toggle('later', +e.dataset.at > s));
    const core = body.classList.contains('core');
    slides[i].querySelectorAll('.count').forEach(e => { e.textContent = core && e.dataset.core ? e.dataset.core : e.dataset.full; });
    if (isPresenter) {
      let n = i + 1; while (n < cells.length && !allowed(n)) n++;
      if (n < cells.length) cells[n].classList.add('next');
      tick();
    }
    const id = slides[i].id + (s > 1 ? '-' + s : '');
    if (location.hash.slice(1) !== id) history.replaceState(null, '', location.pathname + location.search + '#' + id);
    if (view() === 'overview' || view() === 'read') cells[i].scrollIntoView({block: 'nearest'});
  }

  // A live figure. A slide may carry a page of the web edition for its figure, kept in this file as text. L or the slide's
  // button puts it in a frame over the still chart, and L or Escape takes it away. Leaving the slide takes it away too.
  function fontRule() {                                          // the deck's own font, for the frame, which fetches nothing
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch (e) { continue; }
      for (const r of rules) {
        if (!(r instanceof CSSFontFaceRule) || !/Geist Mono/.test(r.style.getPropertyValue('font-family'))) continue;
        return sheet.href ? r.cssText.replace(/url\((["']?)([^"')]+)\1\)/g, (m, q, u) => 'url("' + new URL(u, sheet.href).href + '")') : r.cssText;
      }
    }
    return "@font-face { font-family: 'Geist Mono'; font-style: normal; font-weight: 100 900; src: url('" + new URL('../../fonts/GeistMono-Variable.woff2', document.baseURI).href + "') format('woff2'); }";
  }
  function liveFit(box) {
    const fr = box.firstChild, doc = fr.contentDocument, sl = box.parentNode;
    const fig = sl.querySelector('.fig'), read = sl.querySelector('.read'), wide = sl.classList.contains('l-wide');
    const top = fig.offsetTop, h = (wide && read ? read.offsetTop + read.offsetHeight : fig.offsetTop + fig.offsetHeight) - top;
    box.style.left = fig.offsetLeft + 'px'; box.style.top = top + 'px'; box.style.width = fig.offsetWidth + 'px'; box.style.height = h + 'px';
    const main = doc && doc.querySelector('main'); if (!main) return;
    const W = +sl.dataset.live, H = Math.ceil(main.getBoundingClientRect().height) || 1, k = Math.min(fig.offsetWidth / W, h / H);
    fr.style.width = W + 'px'; fr.style.height = H + 'px'; fr.style.transform = 'scale(' + k + ')';
    box.dataset.k = k.toFixed(3);
  }
  function liveOff(k) {
    const box = slides[k].querySelector('.livebox');
    if (box) box.remove();
    slides[k].classList.remove('is-live');
  }
  function live(on) {
    const sl = slides[i], src = document.querySelector('script.livepage[data-for="' + sl.id + '"]');
    if (!sl.dataset.live || !src || view() !== 'present') return;
    if (on === undefined) on = !sl.classList.contains('is-live');
    if (!on) { liveOff(i); window.focus(); return; }
    if (sl.querySelector('.livebox')) return;
    const box = document.createElement('div'), fr = document.createElement('iframe');
    box.className = 'livebox';
    fr.title = sl.querySelector('.livebtn') ? sl.querySelector('.livebtn').textContent : '';
    fr.style.width = sl.dataset.live + 'px'; fr.style.height = '600px';
    fr.addEventListener('load', () => {
      const w = fr.contentWindow, doc = fr.contentDocument;
      w.addEventListener('error', e => { (window.__errs || (window.__errs = [])).push('live figure: ' + e.message); });
      // The keys stay with the deck while the figure has the pointer, so an arrow key or a clicker always moves on. The figure
      // is driven with the pointer. Tab still moves within it, and Enter still presses the control that has the focus.
      w.addEventListener('keydown', e => {
        if (e.metaKey || e.ctrlKey || e.altKey || e.key === 'Tab' || e.key === 'Shift') return;
        if (e.key === 'Enter' && e.target && e.target.closest && e.target.closest('button, input, a')) return;
        e.preventDefault(); e.stopImmediatePropagation();
        window.dispatchEvent(new KeyboardEvent('keydown', {key: e.key}));
      }, true);
      liveFit(box);
      if (w.ResizeObserver) new w.ResizeObserver(() => liveFit(box)).observe(doc.querySelector('main'));
    });
    fr.srcdoc = JSON.parse(src.textContent).replace('/*deck-font*/', fontRule());
    box.appendChild(fr); sl.appendChild(box); sl.classList.add('is-live');
    liveFit(box);
  }

  function show(k, st, quiet) {
    const from = i;
    i = Math.max(0, Math.min(cells.length - 1, k)); s = Math.max(1, Math.min(steps(i), st || 1));
    if (i !== from) { liveOff(from); cells.forEach(c => c.classList.remove('play')); }
    if (i > from) cells[i].classList.add('play');                // a chart's marks arrive only when its slide is reached going forward
    paint();
    if (!quiet) tell({i, s});
  }
  function next() {
    if (!started) started = Date.now();
    if (view() === 'present' && s < steps(i)) return show(i, s + 1);
    let k = i + 1; while (k < cells.length && !allowed(k)) k++;
    if (k < cells.length) show(k, 1);
  }
  function prev() {
    if (view() === 'present' && s > 1) return show(i, s - 1);
    let k = i - 1; while (k >= 0 && !allowed(k)) k--;
    if (k >= 0) show(k, view() === 'present' ? steps(k) : 1);
  }
  function setView(v) {
    if (v !== 'present') liveOff(i);
    ['overview', 'read', 'present'].forEach(x => body.classList.toggle(x, x === v));
    fit(); paint();
  }
  function fromHash() {
    const m = /^#([A-Za-z0-9]+)(?:-(\d+))?$/.exec(location.hash);
    const k = m ? slides.findIndex(x => x.id === m[1]) : -1;
    if (k >= 0) show(k, m[2] ? +m[2] : 1, true); else paint();
  }

  // The presenter window and this one talk through postMessage, which also works for a page opened from disk.
  function tell(msg) {
    msg.deck = 1; msg.core = body.classList.contains('core'); msg.started = started;
    const to = isPresenter ? window.opener : peer;
    if (to && !to.closed) to.postMessage(msg, '*');
  }
  addEventListener('message', e => {
    const d = e.data; if (!d || d.deck !== 1) return;
    if (d.hello) { peer = e.source; return tell({i, s}); }
    if (d.started && !started) started = d.started;
    if (typeof d.core === 'boolean') body.classList.toggle('core', d.core);
    if (typeof d.i === 'number') show(d.i, d.s, true);
  });
  function tick() {
    if (!clock) return;
    const fmt = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    let plan = 0; for (let k = 0; k <= i; k++) if (allowed(k) && path(k) !== 'x') plan += +(slides[k].dataset.secs || 0);
    clock.querySelector('b').textContent = started ? fmt((Date.now() - started) / 1000) : '0:00';
    clock.querySelector('.plan i').textContent = fmt(plan);
  }

  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^\d$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) {                               // a number, then Enter: that slide of the run
      const n = +typed; typed = '';
      const hit = slides.findIndex(x => x.querySelector('.count') && +x.querySelector('.count').dataset.n === n);
      if (hit >= 0) show(hit, 1);
      return e.preventDefault();
    }
    typed = '';
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter' || k === 'ArrowDown') next();
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace' || k === 'ArrowUp') prev();
    else if (k === 'Home') show(cells.findIndex((c, n) => allowed(n)), 1);
    else if (k === 'End') { let n = cells.length - 1; while (n > 0 && (path(n) === 'x' || !allowed(n))) n--; show(n, 1); }
    else if (k === 'o' || k === 'O') { if (!isPresenter) setView(view() === 'overview' ? 'present' : 'overview'); }
    else if (k === 'r' || k === 'R') { if (!isPresenter) setView(view() === 'read' ? 'present' : 'read'); }
    else if (k === 'Escape') { if (slides[i].classList.contains('is-live')) live(false); else if (!isPresenter) setView('present'); }
    else if (k === 'l' || k === 'L') { if (!isPresenter) live(); }
    else if (k === 'c' || k === 'C') { body.classList.toggle('core'); if (!allowed(i)) next(); paint(); tell({i, s}); }
    else if (k === 'm' || k === 'M') { body.classList.toggle('still'); }
    else if (k === 'f' || k === 'F') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => 0); }
    else if (k === 'p' || k === 'P') {
      if (isPresenter) return;
      peer = window.open(location.pathname + '?presenter' + location.hash, 'deck-presenter', 'width=1280,height=860');
    } else return;
    e.preventDefault();
  });

  stage.addEventListener('click', e => {
    if (e.target.closest('.livebtn')) return live();
    if (view() !== 'overview') return;
    const c = e.target.closest('.cell'); if (!c) return;
    i = cells.indexOf(c); s = 1; setView('present'); tell({i, s});
  });
  let tx = null;
  addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive: true});
  addEventListener('touchend', e => {
    if (tx === null || view() !== 'present') return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (dx < -50) next(); else if (dx > 50) prev();
  });
  let hudTimer = 0;
  addEventListener('mousemove', () => { if (!hud) return; hud.classList.add('show'); clearTimeout(hudTimer); hudTimer = setTimeout(() => hud.classList.remove('show'), 1800); });
  addEventListener('resize', fit);
  addEventListener('hashchange', fromHash);

  if (isPresenter) {
    body.classList.remove('present'); body.classList.add('presenter');
    if (window.opener) window.opener.postMessage({deck: 1, hello: 1}, '*');
    setInterval(tick, 500);
  } else if (q.has('read')) setView('read');
  else if (q.has('overview')) setView('overview');
  if (q.has('full')) body.classList.remove('core');            // the deck opens on the core path, which is the talk. ?full opens the full run
  if (q.has('core')) body.classList.add('core');
  fit(); fromHash();
  window.__deck = {show, next, prev, setView, live, ids: slides.map(x => x.id), steps: slides.map((x, k) => steps(k)), state: () => ({i, s, view: view()})};
})();
