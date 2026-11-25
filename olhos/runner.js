/* Runs the Hawk app's own eye styles (copied from ui/renderer/eyes/<id>/theme.js and theme.css) inside the
   site's eye cards. In the app only one style is active, on the notch; here every card with
   class "app-eye" and data-eyes="<id>" gets its own copy, always calm (idle), and looks at the mouse.
   The CSS was copied with "body[data-eyes=" changed to ".app-eye[data-eyes=" so each card is its own scope.
   Load this file BEFORE the theme files (they call HawkEyes.register when they load). */
(function () {
  var themes = {};
  window.HawkEyes = { register: function (t) { themes[t.id] = t; } };

  var state = {
    mood: 'idle', alert: null, picking: null, scared: false, hidden: false, micMuted: false, music: false,
    edge: 'top', glow: true, light: false, eyeColor: '#e9f7ff', glintColor: '#ffffff', online: true,
    cpuBusy: false, focus: false, idleSeconds: 0, audioLevel: null,
  };
  var cards = [];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function start() {
    document.querySelectorAll('.app-eye[data-eyes]').forEach(function (box) {
      var t = themes[box.dataset.eyes];
      if (!t) return;
      var eyes = [].slice.call(box.querySelectorAll('.eye'));
      var api = {};
      try { api = t.mount(eyes, { get state() { return state; } }) || {}; } catch (e) { console.error(e); return; }
      if (api.update) api.update(state, null);
      cards.push({ box: box, api: api });
    });
    if (reduce) return;
    var raf = 0, px = 0, py = 0;
    function look() {
      raf = 0;
      cards.forEach(function (c) {
        var r = c.box.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        var dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2);
        var dist = Math.hypot(dx, dy) || 1, k = Math.min(1, dist / 180);
        var l = { x: (dx / dist) * k, y: (dy / dist) * k, dist: dist, speed: 0 };
        c.box.style.setProperty('--look-x', l.x.toFixed(3));
        c.box.style.setProperty('--look-y', l.y.toFixed(3));
        if (c.api.look) c.api.look(l);
      });
    }
    document.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY;
      if (!raf) raf = requestAnimationFrame(look);
    });
    // themes with a frame() hook animate every frame (only while the page is visible)
    if (cards.some(function (c) { return c.api.frame; })) {
      var last = performance.now();
      (function step(t) {
        var dt = Math.min(0.05, (t - last) / 1000);
        last = t;
        if (!document.hidden) cards.forEach(function (c) { if (c.api.frame) c.api.frame(t, dt); });
        requestAnimationFrame(step);
      })(last);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else setTimeout(start);
})();
