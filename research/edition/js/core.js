/* The web edition of the dissertation: the script every research page loads. It mounts each figure when the
   figure nears the window (its own script and its data file are fetched then, once), handles the radio groups,
   and shows the source of a number under the pointer. No library. Figures register themselves on
   window.Edition.figs under the name in their figure element's data-fig. */
(function () {
  'use strict';
  var me = document.currentScript;
  var SRC = me && me.src ? me.src : '';                 // empty in a single-file copy, where nothing is fetched
  var BASE = SRC ? new URL('.', SRC) : null;            // .../research/edition/js/
  var V = SRC.indexOf('?v=') > 0 ? SRC.split('?v=')[1] : '';   // the build's stamp, passed on to what loads later
  var E = window.Edition = { figs: {}, have: {} };
  var labels = document.getElementById('rail').dataset;

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var motionOff = false;
  try { motionOff = sessionStorage.getItem('edition-motion') === 'off'; } catch (err) { /* Storage is optional. */ }
  E.reduced = function () { return motionOff || motionQuery.matches; };
  var motionChoice = document.querySelector('.motion-choice');
  function syncMotion() {
    if (motionChoice) {
      var input = motionChoice.querySelector('input');
      input.checked = !E.reduced();
      input.disabled = motionQuery.matches;
      motionChoice.title = motionQuery.matches ? labels.lReduced : '';
    }
    document.dispatchEvent(new Event('edition:motionchange'));
  }
  if (motionChoice) {
    motionChoice.hidden = false;
    motionChoice.querySelector('input').addEventListener('change', function (e) {
      motionOff = !e.target.checked;
      try { sessionStorage.setItem('edition-motion', motionOff ? 'off' : 'on'); } catch (err) { /* Storage is optional. */ }
      syncMotion();
    });
  }
  motionQuery.addEventListener('change', syncMotion);
  syncMotion();
  E.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  E.ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  E.scale = function (d0, d1, r0, r1) {
    var k = (r1 - r0) / (d1 - d0);
    var f = function (v) { return r0 + (v - d0) * k; };
    f.inv = function (p) { return d0 + (p - r0) / k; };
    return f;
  };
  E.svg = function (tag, attrs, parent, text) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };
  E.clear = function (node) { while (node.firstChild) node.removeChild(node.firstChild); };

  // A figure's script and data, each fetched once. In a single-file copy both are already in the page.
  var scripts = {}, datas = {};
  E.script = function (name) {
    if (E.have[name]) return Promise.resolve();
    return scripts[name] || (scripts[name] = new Promise(function (ok, no) {
      var s = document.createElement('script');
      s.src = new URL(name + '.js' + (V ? '?v=' + V : ''), BASE).href;
      s.onload = function () { ok(); };
      s.onerror = function () { delete scripts[name]; s.remove(); no(new Error('script ' + name)); };
      document.head.appendChild(s);
    }));
  };
  E.data = function (name) {
    if (datas[name]) return datas[name];
    var inl = document.getElementById('ed-data-' + name);
    datas[name] = inl ? Promise.resolve(JSON.parse(inl.textContent))
      : fetch(new URL('../data/' + name + '.json' + (V ? '?v=' + V : ''), BASE).href).then(function (r) {
        if (!r.ok) throw new Error('data ' + name);
        return r.json();
      }).catch(function (err) { delete datas[name]; throw err; });
    return datas[name];
  };

  // Radio groups: buttons with role=radio, data-set (the group) and data-v (the value). One tab stop per
  // group, the arrow keys move within it.
  E.radios = function (root, onChange) {
    var groups = {};
    Array.prototype.forEach.call(root.querySelectorAll('[role=radio]'), function (b) {
      (groups[b.dataset.set] = groups[b.dataset.set] || []).push(b);
    });
    function set(name, v, silent) {
      groups[name].forEach(function (b) {
        var on = b.dataset.v === v;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (!silent) onChange(name, v);
    }
    Object.keys(groups).forEach(function (name) {
      groups[name].forEach(function (b, i) {
        b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
        b.addEventListener('click', function () { set(name, b.dataset.v); });
        b.addEventListener('keydown', function (e) {
          var step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
          if (!step) return;
          e.preventDefault();
          var nb = groups[name][(i + step + groups[name].length) % groups[name].length];
          nb.focus();
          set(name, nb.dataset.v);
        });
      });
    });
    return { set: set };
  };

  // Mounting. Each figure element names its figure (data-fig), its script or scripts (data-script, loaded in the
  // order named) and its data (data-json).
  var figs = Array.prototype.slice.call(document.querySelectorAll('figure.fig[data-fig]'));
  var entrance = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entrance.unobserve(entry.target);
      if (E.reduced() || !entry.target.animate) return;
      entry.target.animate([{ opacity: .8, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'ease-out' });
    });
  }, { threshold: .12 }) : null;
  function mount(fig) {
    if (!fig.__mount) {
      var failure = fig.querySelector('.chart-error');
      if (failure) failure.remove();
      fig.setAttribute('aria-busy', 'true');
      var need = fig.dataset.script.split(' ').reduce(function (p, n) { return p.then(function () { return E.script(n); }); }, Promise.resolve());
      fig.__mount = Promise.all([need, E.data(fig.dataset.json)]).then(function (r) {
        fig.__api = E.figs[fig.dataset.fig](fig, r[1]);
        fig.dataset.ready = '1';
        fig.removeAttribute('aria-busy');
        if (entrance) entrance.observe(fig);
        return fig.__api;
      }).catch(function (err) {
        fig.__mount = null;
        fig.removeAttribute('aria-busy');
        var message = document.createElement('p');
        message.className = 'chart-error';
        message.setAttribute('role', 'status');
        message.appendChild(document.createTextNode(labels.lFailure + ' '));
        var retry = document.createElement('button');
        retry.type = 'button'; retry.className = 'btn'; retry.textContent = labels.lRetry;
        retry.addEventListener('click', function () { mount(fig).catch(report); });
        message.appendChild(retry); fig.appendChild(message);
        throw err;
      });
    }
    return fig.__mount;
  }
  function report(err) { console.error(err); }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        mount(e.target).catch(report);
      });
    }, { rootMargin: '600px 0px' });
    figs.forEach(function (f) { io.observe(f); });
  } else figs.forEach(function (f) { mount(f).catch(report); });

  // The source of a number: one small note, placed under the number and kept inside the window.
  var note = null, noteFor = null, noteTimer;
  function hideNote() {
    clearTimeout(noteTimer);
    if (note) note.hidden = true;
    if (noteFor) noteFor.removeAttribute('aria-describedby');
    noteFor = null;
  }
  function showNote(el) {
    clearTimeout(noteTimer);
    if (!note) {
      note = document.createElement('div');
      note.id = 'ed-number-source';
      note.className = 'ed-note';
      note.setAttribute('role', 'tooltip');
      document.body.appendChild(note);
    }
    if (noteFor && noteFor !== el) noteFor.removeAttribute('aria-describedby');
    note.textContent = el.getAttribute('data-src');
    note.hidden = false;
    var r = el.getBoundingClientRect(), w = note.offsetWidth, vw = document.documentElement.clientWidth;
    note.style.left = Math.round(E.clamp(r.left, 12, Math.max(12, vw - w - 12)) + window.scrollX) + 'px';
    var top = r.bottom + 6;
    if (top + note.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - note.offsetHeight - 6);
    note.style.top = Math.round(top + window.scrollY) + 'px';
    el.setAttribute('aria-describedby', note.id);
    noteFor = el;
  }
  function numAt(t) { return t && t.closest ? t.closest('data.num[data-src]') : null; }
  Array.prototype.forEach.call(document.querySelectorAll('data.num[data-src]'), function (el) { el.tabIndex = 0; });
  document.addEventListener('focusin', function (e) { var n = numAt(e.target); if (n) showNote(n); });
  document.addEventListener('focusout', function (e) { if (numAt(e.target) === noteFor) hideNote(); });
  document.addEventListener('pointerover', function (e) {
    if (note && note.contains(e.target)) clearTimeout(noteTimer);
    var n = numAt(e.target); if (n && e.pointerType !== 'touch') showNote(n);
  });
  document.addEventListener('pointerout', function (e) {
    if (e.pointerType === 'touch' || (note && note.contains(e.relatedTarget))) return;
    var n = numAt(e.target);
    if ((n && n !== document.activeElement) || (note && e.target === note && noteFor !== document.activeElement)) noteTimer = setTimeout(hideNote, 180);
  });
  document.addEventListener('click', function (e) { var n = numAt(e.target); if (n) showNote(n); else if (!note || !note.contains(e.target)) hideNote(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideNote(); });
  window.addEventListener('scroll', hideNote, { passive: true });
  window.addEventListener('resize', hideNote);

  // Every finding has a native deep link that can be copied or opened independently.
  Array.prototype.forEach.call(document.querySelectorAll('section.finding[id] > h2'), function (heading) {
    var link = document.createElement('a');
    link.className = 'section-link'; link.href = '#' + heading.parentNode.id;
    link.setAttribute('aria-label', labels.lPermalink); link.title = labels.lPermalink; link.textContent = '#';
    heading.appendChild(link);
  });

  // The contents: a column beside the page on a wide window, a panel behind a button on a narrow one. The
  // section in view is marked in it.
  var rail = document.getElementById('rail'), railBtn = document.querySelector('.railbtn');
  if (rail && railBtn) {
    var readerbar = document.querySelector('.readerbar');
    var currentSection = document.querySelector('.reading-section');
    var openRail = function (on) {
      rail.classList.toggle('open', on); railBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) {
        (rail.querySelector('a[aria-current="true"]') || rail.querySelector('a[aria-current="page"]')).focus();
      }
    };
    railBtn.addEventListener('click', function () { openRail(!rail.classList.contains('open')); });
    rail.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a');
      if (!link) return;
      if (link.hash && link.pathname === window.location.pathname && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        var section = document.getElementById(link.hash.slice(1));
        if (section) {
          var heading = section.querySelector('h2') || section;
          // Let the native fragment navigation finish before moving reading focus.
          requestAnimationFrame(function () { heading.tabIndex = -1; heading.focus({ preventScroll: true }); });
        }
      }
      openRail(false);
    });
    document.addEventListener('keydown', function (e) {
      if (!rail.classList.contains('open')) return;
      if (e.key === 'Escape') { openRail(false); railBtn.focus(); }
    });
    document.addEventListener('focusin', function (e) {
      if (rail.classList.contains('open') && !rail.contains(e.target) && e.target !== railBtn) openRail(false);
    });
    document.addEventListener('click', function (e) {
      if (rail.classList.contains('open') && !rail.contains(e.target) && !railBtn.contains(e.target)) openRail(false);
    });
    // The persistent rail does not need a saved drawer state when the page narrows again.
    if ('ResizeObserver' in window) new ResizeObserver(function () {
      document.documentElement.style.setProperty('--reader-height', readerbar.offsetHeight + 'px');
      if (!railBtn.getClientRects().length && rail.classList.contains('open')) openRail(false);
    }).observe(readerbar);
    var marks = {};
    Array.prototype.forEach.call(rail.querySelectorAll('ol a'), function (a) { marks[a.getAttribute('href').slice(1)] = a; });
    var sections = Object.keys(marks).map(function (id) { return document.getElementById(id); }).filter(Boolean);
    var pageName = rail.querySelector('[aria-current="page"]').textContent;
    var scheduled = false;
    function trackReading() {
      scheduled = false;
      var active = null, top = readerbar.offsetHeight + 36;
      sections.forEach(function (section) { if (section.getBoundingClientRect().top <= top) active = section; });
      // The final short section may reach the foot of the page before its heading reaches the bar.
      if (sections.length && window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2) active = sections[sections.length - 1];
      for (var id in marks) {
        if (active && id === active.id) marks[id].setAttribute('aria-current', 'true');
        else marks[id].removeAttribute('aria-current');
      }
      currentSection.textContent = active ? marks[active.id].textContent : pageName;
    }
    function requestTracking() { if (!scheduled) { scheduled = true; requestAnimationFrame(trackReading); } }
    window.addEventListener('scroll', requestTracking, { passive: true });
    window.addEventListener('resize', requestTracking);
    window.addEventListener('hashchange', requestTracking);
    if ('ResizeObserver' in window) new ResizeObserver(requestTracking).observe(document.querySelector('main.ed'));
    trackReading();
  }

  // For the lab's checks and frames: mount everything, put a figure in a named state.
  window.__edition = {
    mountAll: function () { return Promise.all(figs.map(mount)).then(function () { return figs.map(function (f) { return f.dataset.fig; }); }); },
    state: function (name, s) {
      var f = figs.filter(function (x) { return x.dataset.fig === name; })[0];
      if (!f) return Promise.reject(new Error('no figure ' + name));
      return mount(f).then(function (api) { api.state(s); return name + ':' + s; });
    }
  };
})();
