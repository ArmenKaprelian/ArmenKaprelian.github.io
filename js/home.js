/* The home page's pointer effects. While a mouse or a pen is over the photo, the slogan and its translation show in a green card
   above the caption; on a phone a tap shows or hides the card. Over the index, the row under the pointer or the keyboard shows its
   page in the photo's frame and names it in the caption, only where the photo sits beside the index; the three preview pictures
   load after the page, and only there. */
(function () {
  const fig = document.querySelector('.home .photo'), index = document.querySelector('.home .index');
  if (!fig || !index) return;
  const wide = matchMedia('(min-width: 1200px) and (min-height: 600px)');   // the split layout's limits in css/site.css

  fig.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') fig.classList.add('on'); });
  fig.addEventListener('pointerleave', () => fig.classList.remove('on'));
  fig.addEventListener('pointerup', e => { if (e.pointerType === 'touch') fig.classList.toggle('tapped'); });   // a tap shows or hides the slogan's card

  const show = k => { if (k && wide.matches) fig.dataset.show = k; else delete fig.dataset.show; };
  index.querySelectorAll('a[data-k]').forEach(a => {
    a.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') show(a.dataset.k); });
    a.addEventListener('focus', () => show(a.dataset.k));
  });
  index.addEventListener('pointerleave', () => show(''));
  index.addEventListener('focusout', e => { if (!index.contains(e.relatedTarget)) show(''); });
  addEventListener('pageshow', () => show(''));   // coming back to the page from one of its links

  addEventListener('load', () => {
    if (wide.matches) fig.querySelectorAll('img[data-src]').forEach(i => { i.src = i.dataset.src; });
  }, { once: true });
})();
