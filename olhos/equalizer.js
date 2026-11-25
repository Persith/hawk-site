/* Hawk · tema "Espectro de Áudio (Equalizer)" (equalizer). Cada olho são 4 barras verticais finas.
   Sem som, as barras desenham um olho (mais altas no meio): o pico anda e as barras inclinam para o lado do cursor.
   Com música, viram um equalizador: seguem audioLevel (cada barra num ritmo) ou, sem medição, dançam sozinhas
   como as barrinhas do próprio Hawk. As alturas são variáveis --h0..--h3 (escala Y no CSS). Ver NOTAS.md. */
HawkEyes.register({
  id: 'equalizer',
  name: 'Espectro de Áudio (Equalizer)',
  color: true,
  glint: false,
  look: 'custom',

  mount(eyes, ctx) {
    eyes.forEach((eye, i) => {
      eye.innerHTML = '<div class="eq-eye"><div class="eq-bars"><i></i><i></i><i></i><i></i></div></div>';
      eye.dataset.side = i ? 'right' : 'left';
    });
    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    const calm = (r) => r === 'idle' || r === 'working' || r === 'done' || r === 'seen';
    let lx = 0;
    const PH = [0, 1.7, 3.1, 4.4], SP = [2.3, 3.1, 2.7, 3.6];

    // the eye drawn by the bars: a bump (the "pupil") that moves toward the cursor
    const shapeHeights = () => {
      const c = 1.5 + 1.3 * lx;
      return [0, 1, 2, 3].map((i) => 0.36 + 0.52 * Math.exp(-((i - c) ** 2) / 1.1));
    };
    // a real equalizer: the bass level, each bar with its own wobble
    const audioHeights = (lvl) => {
      const t = performance.now() / 1000;
      return [0, 1, 2, 3].map((i) => Math.max(0.12, Math.min(1, 0.16 + lvl * (0.6 + 0.4 * Math.sin(t * SP[i] + PH[i])))));
    };
    const setH = (hs) => eyes.forEach((e) => hs.forEach((h, i) => {
      const v = h.toFixed(3);
      if (e.style.getPropertyValue(`--h${i}`) !== v) e.style.setProperty(`--h${i}`, v);
    }));
    const heights = () => {
      const s = ctx.state;
      setH(s.music && s.audioLevel != null ? audioHeights(Math.max(0, Math.min(1, s.audioLevel))) : shapeHeights());
    };

    return {
      update(s) {
        const r = reaction(s);
        eyes.forEach((eye) => {
          if (eye.dataset.r !== r) eye.dataset.r = r;
          eye.classList.toggle('muted', s.micMuted && calm(r));          // low, greyish bars
          eye.classList.toggle('beat', s.music && s.audioLevel == null);  // dancing on their own
          eye.classList.toggle('audio', s.music && s.audioLevel != null); // following the measured level
          eye.classList.toggle('glow', s.glow);
          eye.classList.toggle('light', s.light);
          eye.classList.toggle('hold', s.hidden);
          eye.style.setProperty('--pick', s.picking || 'transparent');
        });
        heights();
      },
      look(l) {
        lx = l.x;
        const s = ctx.state;
        if (!(s.music && s.audioLevel != null)) heights();
      },
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
