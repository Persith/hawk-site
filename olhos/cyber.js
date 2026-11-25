/* Hawk · tema "Cyberpunk / HUD Tático" (cyber). Íris de 3 anéis em neon sobre uma telinha escura com scanline.
   Os anéis giram em sentidos opostos com o mouse, o núcleo desliza para o cursor; "notify" dá um glitch de ~250 ms.
   Todo o visual está no theme.css; aqui só o DOM, os atributos de estado e os eventos. Detalhes em NOTAS.md. */
HawkEyes.register({
  id: 'cyber',
  name: 'Cyberpunk / HUD Tático',
  color: true,
  glint: true,
  look: 'custom',

  mount(eyes, ctx) {
    const ART = `<svg viewBox="-50 -50 100 100" aria-hidden="true">
      <g class="cy-r1"><g class="cy-spin1"><circle class="cy-ring1" r="44.5"/><path class="cy-ticks" d="M0-50V-40M0 40V50M-50 0H-40M40 0H50"/></g></g>
      <g class="cy-r2"><g class="cy-spin2"><circle class="cy-ring2" r="33"/></g></g>
      <g class="cy-r3"><g class="cy-spin3"><circle class="cy-ring3" r="22"/></g></g>
      <g class="cy-core"><circle class="cy-dot" r="9"/></g>
      <path class="cy-arc" d="M-31 13A33 33 0 0 1 31 13"/>
      <path class="cy-check" d="M-25 0L-8 17L25-17"/>
    </svg>`;
    eyes.forEach((eye, i) => {
      eye.innerHTML = `<div class="cy-eye"><div class="cy-screen"></div><div class="cy-art">${ART}</div>`
        + `<div class="cy-slice cy-s1">${ART}</div><div class="cy-slice cy-s2">${ART}</div></div>`;
      eye.dataset.side = i ? 'right' : 'left';
    });

    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const timers = new Set();
    const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); };
    // a short reaction: (re)start a class on both eyes and take it off after `ms`
    const pulseClass = (cls, ms) => eyes.forEach((e) => {
      e.classList.remove(cls); void e.offsetWidth; e.classList.add(cls);
      later(() => e.classList.remove(cls), ms);
    });

    // the reading of the moment, in the Hawk's priority (LEIA-ME §4)
    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    const apply = (s) => eyes.forEach((eye) => {
      eye.dataset.r = reaction(s);
      eye.classList.toggle('glow', s.glow);
      eye.classList.toggle('light', s.light);
      eye.classList.toggle('hold', s.hidden);
      eye.style.setProperty('--pick', s.picking || 'transparent');
    });

    // the mouse turns the rings: the angle follows look.x and keeps adding up with the speed
    let angle = 0, lastX = 0;
    return {
      update(s) { apply(s); },
      look(l) {
        const dx = l.x - lastX;
        lastX = l.x;
        if (!dx) return;
        angle += dx * 150 + Math.sign(dx) * Math.min(1, l.speed / 3000) * 14;
        eyes.forEach((e) => e.style.setProperty('--cy-a', angle.toFixed(1)));
      },
      event(name) {
        if (ctx.state.hidden || reduce.matches) return;
        if (name === 'notify') pulseClass('cy-glitch', 260);
        if (name === 'done') pulseClass('cy-ok', 1700);
      },
      destroy() {
        timers.forEach(clearTimeout);
        timers.clear();
        eyes.forEach((e) => {
          e.replaceChildren();
          e.removeAttribute('data-r');
          e.removeAttribute('data-side');
          e.removeAttribute('style');
          e.className = 'eye';
        });
      },
    };
  },
});
