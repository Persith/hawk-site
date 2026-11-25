/* Hawk · tema "Minimalista E-Ink" (eink). Só contorno fino, preto e branco puro, sem brilho nem degradê.
   O humor vem da pálpebra: uma linha reta por cima de cada olho, na altura e na inclinação do estado
   (o que fica acima dela some). Os alertas usam só o traço, na cor obrigatória. Detalhes em NOTAS.md. */
HawkEyes.register({
  id: 'eink',
  name: 'Minimalista E-Ink',
  color: true,
  glint: false,
  look: 'custom', // the pupil moves inside the outline; the lid stays

  mount(eyes) {
    const uid = Math.random().toString(36).slice(2, 7);
    eyes.forEach((eye, i) => {
      const k = `${uid}${i}`;
      eye.innerHTML = `<svg class="ei-svg" viewBox="-50 -50 100 100" aria-hidden="true">
        <defs><clipPath id="ei-c-${k}"><rect class="ei-cut" x="-75" y="0" width="150" height="140"/></clipPath></defs>
        <g clip-path="url(#ei-c-${k})">
          <circle class="ei-fill" r="40"/>
          <circle class="ei-outline" r="40"/>
          <circle class="ei-pupil" r="11"/>
        </g>
        <line class="ei-lid" x1="-48" x2="48" y1="0" y2="0"/>
        <path class="ei-arc" d="M-35 12Q0-38 35 12"/>
      </svg>`;
      eye.dataset.side = i ? 'right' : 'left';
    });

    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    const apply = (s) => eyes.forEach((eye) => {
      const r = reaction(s);
      if (eye.dataset.r !== r) eye.dataset.r = r;
      eye.classList.toggle('light', s.light);
      eye.classList.toggle('hold', s.hidden);
      eye.style.setProperty('--pick', s.picking || 'transparent');
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
