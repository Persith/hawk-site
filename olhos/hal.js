/* Hawk · tema "HAL 9000 / Lente de Câmera" (hal). Lente redonda com aro metálico, vidro convexo e núcleo que brilha.
   Um obturador de 6 lâminas fecha com o microfone mudo (e "pisca" de vez em quando); o brilho pulsa com os graves.
   O visual inteiro está no theme.css; aqui só o DOM e os atributos de estado. Detalhes em NOTAS.md. */
HawkEyes.register({
  id: 'hal',
  name: 'HAL 9000 / Lente de Câmera',
  color: true,
  glint: true,
  look: 'custom', // the lens stays put: the core turns toward the cursor and the reflection slides the other way

  mount(eyes, ctx) {
    const uid = Math.random().toString(36).slice(2, 7);
    const blades = [0, 1, 2, 3, 4, 5].map((i) => `<g transform="rotate(${i * 60})"><path class="hal-blade" d="M-62 0H62V-72H-62Z"/></g>`).join('');
    const svg = (k) => `<svg class="hal-svg" viewBox="-50 -50 100 100" aria-hidden="true">
      <defs>
        <linearGradient id="hal-bz-${k}" x1="0" y1="0" x2="1" y2="1"><stop class="hal-bz0" offset="0"/><stop class="hal-bz1" offset="0.5"/><stop class="hal-bz2" offset="1"/></linearGradient>
        <radialGradient id="hal-gl-${k}"><stop class="hal-gl0" offset="0"/><stop class="hal-gl1" offset="1"/></radialGradient>
        <radialGradient id="hal-co-${k}"><stop class="hal-co0" offset="0"/><stop class="hal-co1" offset="0.28"/><stop class="hal-co2" offset="0.62"/><stop class="hal-co3" offset="1"/></radialGradient>
        <clipPath id="hal-cl-${k}"><circle r="39"/></clipPath>
      </defs>
      <circle class="hal-bezel" r="49" fill="url(#hal-bz-${k})"/>
      <circle class="hal-mount" r="42.5"/>
      <g clip-path="url(#hal-cl-${k})">
        <circle class="hal-glass" r="39" fill="url(#hal-gl-${k})"/>
        <g class="hal-core"><circle class="hal-glow" r="31" fill="url(#hal-co-${k})"/><circle class="hal-hot" r="5.5"/></g>
        <circle class="hal-smile" cy="18" r="25"/>
        <g class="hal-blades">${blades}</g>
      </g>
      <circle class="hal-rim" r="39"/>
      <g class="hal-reflex"><path d="M-28-15A32 32 0 0 1 2-31"/><circle cx="-19" cy="-25.5" r="2.7"/></g>
    </svg>`;
    eyes.forEach((eye, i) => {
      eye.innerHTML = `<div class="hal-eye">${svg(uid + i)}</div>`;
      eye.dataset.side = i ? 'right' : 'left';
    });

    const setData = (el, k, v) => { if (el.dataset[k] !== v) el.dataset[k] = v; };
    const setVar = (el, k, v) => { if (el.style.getPropertyValue(k) !== v) el.style.setProperty(k, v); };
    // the reading of the moment, in the Hawk's priority (LEIA-ME §4)
    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    const apply = (s) => eyes.forEach((eye) => {
      setData(eye, 'r', reaction(s));
      eye.classList.toggle('glow', s.glow);
      eye.classList.toggle('light', s.light);
      eye.classList.toggle('hold', s.hidden);
      eye.classList.toggle('muted', s.micMuted);
      // the bass: the measured level moves the glow; without a measurement, music gets a synthetic ~120 bpm beat
      eye.classList.toggle('beat', s.music && s.audioLevel == null);
      setVar(eye, '--hal-lvl', s.music && s.audioLevel != null ? Math.max(0, Math.min(1, s.audioLevel)).toFixed(2) : '0');
      setVar(eye, '--pick', s.picking || 'transparent');
    });

    return {
      update(s) { apply(s); },
      destroy() {
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
