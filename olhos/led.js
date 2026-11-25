/* Hawk · tema "Matriz de LED (8-bit)" (led). Cada olho é uma grade 7×7 de LEDs: um disco aceso fraco com uma
   pupila 3×3 bem acesa que pula de célula em célula atrás do mouse. Mini-ícones desenhados na grade: "!" nos
   alertas, coração e "^" no done, nota com música, "X" sem internet, "Z" com o PC ocioso.
   O JS só decide quais LEDs acendem (classes .dim / .on); cor, brilho e piscadas ficam no theme.css. */
HawkEyes.register({
  id: 'led',
  name: 'Matriz de LED (8-bit)',
  color: true,
  glint: false,
  look: 'custom',

  mount(eyes, ctx) {
    const N = 7;
    const bits = (rows) => rows.join('').split('').map((ch) => (ch === '#' ? 1 : 0));
    const MASK = bits(['..###..', '.#####.', '#######', '#######', '#######', '.#####.', '..###..']);
    const ICON = {
      excl: bits(['..###..', '..###..', '..###..', '..###..', '.......', '..###..', '..###..']),
      note: bits(['...##..', '...#.#.', '...#..#', '...#...', '.###...', '####...', '.##....']),
      heart: bits(['.......', '.##.##.', '#######', '#######', '.#####.', '..###..', '...#...']),
      happy: bits(['.......', '..###..', '.#####.', '##...##', '#.....#', '.......', '.......']),
      x: bits(['#.....#', '.#...#.', '..#.#..', '...#...', '..#.#..', '.#...#.', '#.....#']),
      z: bits(['.......', '.#####.', '....#..', '...#...', '..#....', '.#####.', '.......']),
      shut: bits(['.......', '.......', '.......', '#.....#', '.#...#.', '..###..', '.......']),
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');

    // the DOM: 49 LEDs per eye (the row index drives the top-to-bottom blink in the CSS)
    const cells = eyes.map((eye, i) => {
      eye.dataset.side = i ? 'right' : 'left';
      const grid = document.createElement('div');
      grid.className = 'led-grid';
      const list = [];
      for (let k = 0; k < N * N; k++) {
        const c = document.createElement('i');
        c.style.setProperty('--row', String(Math.floor(k / N)));
        grid.append(c);
        list.push(c);
      }
      eye.append(grid);
      return list;
    });
    const shown = eyes.map(() => new Array(N * N).fill(-1));
    const paint = (i, pat) => {
      for (let k = 0; k < pat.length; k++) {
        if (shown[i][k] === pat[k]) continue;
        shown[i][k] = pat[k];
        cells[i][k].className = pat[k] === 2 ? 'on' : pat[k] === 1 ? 'dim' : '';
      }
    };

    // patterns: 0 off (only the residual glow), 1 dim, 2 lit
    const eyeWith = (px, py) => {
      const p = MASK.slice();
      for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
          const x = 3 + px + c, y = 3 + py + r;
          if (x >= 0 && x < N && y >= 0 && y < N && MASK[y * N + x]) p[y * N + x] = 2;
        }
      }
      return p;
    };
    const full = () => MASK.map((m) => (m ? 2 : 0));
    const glyph = (name) => ICON[name].map((b) => (b ? 2 : 0));
    const blank = () => new Array(N * N).fill(0);

    const reaction = (s) => (s.scared ? 'scared' : s.picking ? 'picking' : s.alert || s.mood);
    const calm = (r) => r === 'idle' || r === 'working' || r === 'done' || r === 'seen';
    // the theme's own overlays (only over the calm states, so an alert is never hidden)
    const overlay = (s, r) => (!calm(r) ? '' : !s.online ? 'offline' : r === 'idle' && s.idleSeconds >= 120 ? 'sleepy' : s.music ? 'music' : '');

    let lx = 0, ly = 0, heartUntil = 0, mode = '', t0 = 0, timer = 0;
    const lookCell = () => [Math.max(-2, Math.min(2, Math.round(lx * 2.2))), Math.max(-2, Math.min(2, Math.round(ly * 2.2)))];

    function compute(i, s, now) {
      const r = reaction(s), ov = overlay(s, r), since = now - t0, still = reduce.matches;
      const cyc = (on, off) => since % (on + off) < on;
      const [px, py] = lookCell();
      if (r === 'picking') return full();
      if (r === 'scared') {
        const p = full();
        p[3 * N + 3 + (still ? 0 : [0, -2, 0, 2][Math.floor(since / 220) % 4])] = 0;
        return p;
      }
      if (r === 'attention' || r === 'battery' || r === 'timer') return cyc(1300, 1000) ? glyph('excl') : eyeWith(px, py);
      if (r === 'whatsapp') return i === 0 && cyc(2000, 3000) ? glyph('excl') : eyeWith(px, py);
      if (ov === 'offline' && cyc(2000, 3000)) return still || Math.floor(since / 400) % 2 === 0 ? glyph('x') : blank();
      if (ov === 'sleepy') return i === 0 || (!still && Math.floor(since / 900) % 2) ? glyph('shut') : glyph('z');
      if (ov === 'music' && i === 0 && cyc(2000, 3000)) return glyph('note');
      if (r === 'done') return now < heartUntil ? glyph('heart') : glyph('happy');
      if (r === 'seen') return glyph('happy');
      if (r === 'working' && !still) return eyeWith([-2, -1, 0, 1, 2, 1, 0, -1][Math.floor(since / 170) % 8], 0);
      return eyeWith(px, py);
    }
    // a 10 Hz tick only while something changes by itself (icons, scan); never while hidden
    const needsTick = (s, now) => {
      const r = reaction(s);
      return !s.hidden && (['scared', 'attention', 'battery', 'timer', 'whatsapp', 'working'].includes(r) || overlay(s, r) !== '' || (r === 'done' && now < heartUntil));
    };
    function render() {
      const s = ctx.state, now = performance.now();
      if (!s.hidden) eyes.forEach((_, i) => paint(i, compute(i, s, now)));
      const need = needsTick(s, now);
      if (need && !timer) timer = setInterval(render, 100);
      if (!need && timer) { clearInterval(timer); timer = 0; }
    }

    const apply = (s) => eyes.forEach((eye) => {
      if (eye.dataset.r !== reaction(s)) eye.dataset.r = reaction(s);
      eye.classList.toggle('glow', s.glow);
      eye.classList.toggle('light', s.light);
      eye.classList.toggle('hold', s.hidden);
      eye.style.setProperty('--pick', s.picking || 'transparent');
    });

    return {
      update(s) {
        apply(s);
        const key = reaction(s) + '|' + overlay(s, reaction(s));
        if (key !== mode) { mode = key; t0 = performance.now(); }
        render();
      },
      look(l) { lx = l.x; ly = l.y; render(); },
      event(name) {
        if (name === 'done') { heartUntil = performance.now() + 2000; render(); }
      },
      destroy() {
        clearInterval(timer);
        timer = 0;
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
