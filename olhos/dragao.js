/* Hawk · tema "Dragão Elemental" (dragao). Olho de réptil com pálpebra pesada de escamas e íris incandescente
   com fenda. O elemento muda com o sistema: fogo (CPU em uso / trabalhando), gelo (modo foco ou microfone mudo) e
   trovão por ~3 s quando chega mensagem do WhatsApp. Cor e partículas trocam em ~500 ms (CSS). Ver NOTAS.md. */
HawkEyes.register({
  id: 'dragao',
  name: 'Dragão Elemental',
  color: true,
  glint: false,
  look: 'custom',

  mount(eyes, ctx) {
    const uid = Math.random().toString(36).slice(2, 7);
    // slightly oversized slanted almond so the iris and lid completely fill head.png's cutout with zero background bleed
    const OPEN = ['M-60-20C-22-52 38-40 60 18C38 52-34 54-60-20Z', 'M60-20C22-52-38-40-60 18C-38 52 34 54 60-20Z'];
    const LOW = ['M-62 12C-24-22 34-10 62 34L80 90H-80Z', 'M62 12C24-22-34-10-62 34L-80 90H80Z'];
    const fx = `
      <g class="dg-embers"><circle cx="-18" cy="-30" r="3.4"/><circle cx="4" cy="-36" r="2.6"/><circle cx="22" cy="-28" r="3"/><circle cx="-4" cy="-24" r="2.2"/></g>
      <g class="dg-frost"><path d="M-40-30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M38-20l1.6 4.8 4.8 1.6-4.8 1.6-1.6 4.8-1.6-4.8-4.8-1.6 4.8-1.6z"/><path d="M-30 30l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z"/><path d="M30 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/></g>
      <g class="dg-sparks"><path d="M-52-36l8 9-5 2 8 10"/><path d="M50-38l-7 8 5 3-8 9"/><path d="M-6-50l3 9-5 1 4 9"/></g>`;
    eyes.forEach((eye, i) => {
      const k = `${uid}${i}`;
      eye.innerHTML = `<div class="dg-eye"><svg class="dg-svg" viewBox="-60 -50 120 100" aria-hidden="true">
        <defs>
          <radialGradient id="dg-ir-${k}" cx="0.5" cy="0.55" r="0.55"><stop class="dg-s0" offset="0"/><stop class="dg-s1" offset="0.45"/><stop class="dg-s2" offset="1"/></radialGradient>
          <radialGradient id="dg-fl-${k}"><stop class="dg-f0" offset="0"/><stop class="dg-f1" offset="1"/></radialGradient>
          <pattern id="dg-sc-${k}" width="12" height="9" patternUnits="userSpaceOnUse"><path class="dg-scale" d="M0 9A6 6 0 0 1 12 9M-6 4.5A6 6 0 0 1 6 4.5M6 4.5A6 6 0 0 1 18 4.5"/></pattern>
          <filter id="dg-gl-${k}" x="-35%" y="-35%" width="170%" height="170%"><feGaussianBlur in="SourceGraphic" stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="dg-cl-${k}"><path d="${OPEN[i]}"/></clipPath>
        </defs>
        <g clip-path="url(#dg-cl-${k})">
          <rect class="dg-base" x="-66" y="-56" width="132" height="112"/>
          <g class="dg-ball" filter="url(#dg-gl-${k})">
            <ellipse class="dg-iris" rx="64" ry="56" fill="url(#dg-ir-${k})"/>
            <circle class="dg-fire" cy="6" r="36" fill="url(#dg-fl-${k})"/>
          </g>
          <g class="dg-pupil-g">
            <path class="dg-pupil"/>
          </g>
          <path class="dg-low" d="${LOW[i]}"/>
          <g class="dg-lid"><path class="dg-lidskin" d="M-90-170H90V-14Q0-4-90-14Z"/><path class="dg-lidscales" d="M-90-170H90V-14Q0-4-90-14Z" fill="url(#dg-sc-${k})"/><path class="dg-lidedge" d="M-90-14Q0-4 90-14"/></g>
        </g>
        <path class="dg-rim" d="${OPEN[i]}"/>
        <g class="dg-fx">${fx}</g>
      </svg></div>`;
      eye.dataset.side = i ? 'right' : 'left';
    });

    const timers = new Set();
    let thunderUntil = 0;
    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    // the element: thunder for a moment when a message arrives, else fire (CPU / working) > ice (focus / muted)
    const element = (s) => {
      const r = reaction(s);
      if (r === 'whatsapp' && performance.now() < thunderUntil) return 'thunder';
      if (!['idle', 'working', 'done', 'seen'].includes(r)) return '';
      if (s.cpuBusy || s.mood === 'working') return 'fire';
      if (s.focus || s.micMuted) return 'ice';
      return '';
    };
    const apply = () => {
      const s = ctx.state, r = reaction(s), el = element(s);
      eyes.forEach((eye) => {
        if (eye.dataset.r !== r) eye.dataset.r = r;
        if (eye.dataset.el !== el) eye.dataset.el = el;
        eye.classList.toggle('glow', s.glow);
        eye.classList.toggle('light', s.light);
        eye.classList.toggle('hold', s.hidden);
        eye.style.setProperty('--pick', s.picking || 'transparent');
      });
    };

    return {
      update() { apply(); },
      event(name, data) {
        if (name === 'notify' && data && data.kind === 'whatsapp') {
          thunderUntil = performance.now() + 3000;
          apply();
          const t = setTimeout(() => { timers.delete(t); apply(); }, 3050);
          timers.add(t);
        }
      },
      destroy() {
        timers.forEach(clearTimeout);
        timers.clear();
        eyes.forEach((e) => {
          e.replaceChildren();
          e.removeAttribute('data-r');
          e.removeAttribute('data-el');
          e.removeAttribute('data-side');
          e.removeAttribute('style');
          e.className = 'eye';
        });
      },
    };
  },
});
