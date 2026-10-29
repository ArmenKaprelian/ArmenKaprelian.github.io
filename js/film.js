/* The film page's chapter list. A chapter starts the film at its first frame and brings the player into view; the chapter
   playing is marked. The 244 s cut has a keyframe on every chapter start, so a jump decodes nothing before the frame it shows.
   One listener on timeupdate (about four times a second), and the list is touched only when the chapter changes. */
(function () {
  const video = document.querySelector('.film video'), list = document.querySelector('.film .chapters');
  if (!video || !list) return;
  const buttons = [...list.querySelectorAll('button')], starts = buttons.map(b => +b.dataset.t);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let current = -1;

  function mark() {
    let k = -1;
    if (video.currentTime > 0 || !video.paused) starts.forEach((s, i) => { if (video.currentTime >= s) k = i; });
    if (k === current) return;
    if (current >= 0) buttons[current].removeAttribute('aria-current');
    if (k >= 0) buttons[k].setAttribute('aria-current', 'true');
    current = k;
  }

  buttons.forEach((b, i) => b.addEventListener('click', () => {
    video.currentTime = starts[i];
    const p = video.play(); if (p) p.catch(() => {});
    const r = video.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) video.scrollIntoView({ block: 'nearest', behavior: reduce.matches ? 'auto' : 'smooth' });
  }));
  video.addEventListener('timeupdate', mark);
  video.addEventListener('seeked', mark);
})();
