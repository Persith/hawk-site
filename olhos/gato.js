/* Hawk · tema "Gato / Felino Noturno" (gato). Olho amendoado com íris esmeralda e centro dourado (dourado inteiro
   quando trabalhando) e pupila em fenda vertical que dilata, bem redonda, quando o cursor chega muito perto ou
   quando uma música começa; volta à fenda devagar (~600 ms). A forma da pupila é o "d" do <path>, animado em CSS.
   Detalhes em NOTAS.md. */
HawkEyes.register({
  id: 'gato',
  name: 'Gato / Felino Noturno',
  color: true,
  glint: true,
  look: 'custom', // the iris and the pupil turn inside the almond

  mount(eyes, ctx) {
    eyes.forEach((eye, i) => {
      eye.innerHTML = `<div class="gt-eye"><svg class="gt-svg" viewBox="-60 -50 120 100" aria-hidden="true">
        <g class="gt-ball">
          <path class="gt-pupil"/>
          <circle class="gt-glint" cx="${i ? 15 : -17}" cy="-13" r="6.2"/>
          <circle class="gt-glint gt-glint2" cx="${i ? 10 : -11}" cy="13" r="3.4"/>
        </g>
      </svg></div>`;
      eye.dataset.side = i ? 'right' : 'left';
    });

    const timers = new Set();
    let near = false, musicUntil = 0;
    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    const apply = () => {
      const s = ctx.state;
      // dilate: the cursor very close, a song just started, or loud bass
      const dilate = near || performance.now() < musicUntil || (s.music && s.audioLevel != null && s.audioLevel > 0.6);
      eyes.forEach((eye) => {
        const r = reaction(s);
        if (eye.dataset.r !== r) eye.dataset.r = r;
        eye.classList.toggle('dilate', dilate);
        eye.classList.toggle('glow', s.glow);
        eye.classList.toggle('light', s.light);
        eye.classList.toggle('hold', s.hidden);
        eye.style.setProperty('--pick', s.picking || 'transparent');
      });
    };

    return {
      update() { apply(); },
      look(l) {
        const n = l.dist < 60;
        if (n !== near) { near = n; apply(); }
      },
      event(name, data) {
        if (name === 'music' && data.playing) {
          musicUntil = performance.now() + 2000;
          apply();
          const t = setTimeout(() => { timers.delete(t); apply(); }, 2050);
          timers.add(t);
        }
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
