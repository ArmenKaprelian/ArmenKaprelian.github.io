/* The home page's pointer effects. While a mouse or a pen is over the photo, the slogan and its translation show in a green card
   above the caption; on a phone a tap shows or hides the card. Over the index, the row under the pointer or the keyboard shows its
   page in the photo's frame and names it in the caption, only where the photo sits beside the index; the three preview pictures
   load after the page, and only there. */
(function () {
  const fig = document.querySelector('.home .photo'), index = document.querySelector('.home .index');
  if (!fig || !index) return;
  const wide = matchMedia('(min-width: 1200px) and (min-height: 600px)');   // the split layout's limits in css/site.css
  const parts = fig.querySelectorAll('[data-k]');   // each page's preview and its name in the caption, keyed like the index's rows

  fig.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') fig.classList.add('on'); });
  fig.addEventListener('pointerleave', () => fig.classList.remove('on'));
  fig.addEventListener('pointerup', e => { if (e.pointerType === 'touch') fig.classList.toggle('tapped'); });   // a tap shows or hides the slogan's card

  const show = k => {
    if (!wide.matches) k = '';
    if (k) fig.dataset.show = k; else delete fig.dataset.show;
    parts.forEach(p => p.classList.toggle('live', p.dataset.k === k));
  };
  // The row under the pointer, read on every element the pointer enters inside the index. Off the rows (the index's margins and the
  // space under its last row) the photo returns at once (the author's requests of 29 October 2026).
  index.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const a = e.target.closest('a[data-k]');
    show(a ? a.dataset.k : '');
  });
  index.addEventListener('pointerleave', () => show(''));
  index.addEventListener('focusin', e => { const a = e.target.closest('a[data-k]'); if (a) show(a.dataset.k); });
  index.addEventListener('focusout', e => { if (!index.contains(e.relatedTarget)) show(''); });
  addEventListener('pageshow', () => show(''));   // coming back to the page from one of its links

  addEventListener('load', () => {
    if (wide.matches) fig.querySelectorAll('img[data-src]').forEach(i => { i.src = i.dataset.src; });
  }, { once: true });
})();
