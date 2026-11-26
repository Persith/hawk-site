/* Shared Google Identity Services (GIS) helper for assistentehawk.com.br.
   Exposes window.HawkGoogle with nonce generation (raw + SHA-256 hex) and official Google button rendering. */
(function () {
  var CLIENT_ID = '997732598914-kvkm3gqnja4b7h1l44jngi9lq2mq1til.apps.googleusercontent.com';
  var GSI_URL = 'https://accounts.google.com/gsi/client';
  var LOAD_TIMEOUT_MS = 10000;
  var LOAD_ERR_MSG = 'Não foi possível carregar o login do Google. Verifique a internet e tente de novo.';

  var gsiPromise = null;

  function isGsiReady() {
    return !!(window.google && window.google.accounts && window.google.accounts.id);
  }

  function toHex(buf) {
    var bytes = new Uint8Array(buf);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += bytes[i].toString(16).padStart(2, '0');
    }
    return out;
  }

  function newNonce() {
    if (!window.crypto || !window.crypto.getRandomValues || !window.crypto.subtle) {
      return Promise.reject(new Error('Navegador sem suporte a Web Crypto.'));
    }
    var rawBytes = new Uint8Array(32);
    window.crypto.getRandomValues(rawBytes);
    var raw = toHex(rawBytes);
    var enc = new TextEncoder().encode(raw);
    return window.crypto.subtle.digest('SHA-256', enc).then(function (digest) {
      return { raw: raw, hash: toHex(digest) };
    });
  }

  function loadGsi() {
    if (isGsiReady()) return Promise.resolve();
    if (gsiPromise) return gsiPromise;

    gsiPromise = new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        gsiPromise = null;
        reject(new Error(LOAD_ERR_MSG));
      }, LOAD_TIMEOUT_MS);

      function finishOk() {
        if (done) return;
        if (!isGsiReady()) {
          finishErr();
          return;
        }
        done = true;
        clearTimeout(timer);
        resolve();
      }

      function finishErr() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        gsiPromise = null;
        reject(new Error(LOAD_ERR_MSG));
      }

      var existing = document.querySelector('script[data-hawk-gsi="1"], script[src="' + GSI_URL + '"]');
      if (existing) {
        if (isGsiReady()) {
          finishOk();
          return;
        }
        existing.addEventListener('load', finishOk, { once: true });
        existing.addEventListener('error', finishErr, { once: true });
        return;
      }

      var s = document.createElement('script');
      s.src = GSI_URL;
      s.async = true;
      s.defer = true;
      s.dataset.hawkGsi = '1';
      s.addEventListener('load', finishOk, { once: true });
      s.addEventListener('error', function () {
        if (s.parentNode) s.parentNode.removeChild(s);
        finishErr();
      }, { once: true });
      document.head.appendChild(s);
    });

    return gsiPromise;
  }

  function renderButton(elemento, opts) {
    if (!elemento) return Promise.resolve();
    var o = opts || {};
    var onCredential = typeof o.onCredential === 'function' ? o.onCredential : function () {};
    var onError = typeof o.onError === 'function' ? o.onError : function () {};

    return loadGsi().then(function () {
      if (!elemento.isConnected && !document.body.contains(elemento)) return;

      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        nonce: o.nonceHash || '',
        callback: function (resp) {
          if (resp && typeof resp.credential === 'string' && resp.credential) {
            onCredential(resp.credential);
          } else {
            onError('Não foi possível entrar com o Google.');
          }
        },
        ux_mode: 'popup',
        auto_select: false,
        itp_support: true,
        use_fedcm_for_button: true,
      });

      var rectW = elemento.getBoundingClientRect ? elemento.getBoundingClientRect().width : 0;
      var measured = rectW || elemento.clientWidth || (elemento.parentElement && elemento.parentElement.clientWidth) || 360;
      var width = Math.min(400, Math.max(200, Math.round(measured)));

      elemento.textContent = '';
      window.google.accounts.id.renderButton(elemento, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        locale: 'pt-BR',
        width: width,
      });
    }, function (err) {
      onError((err && err.message) || LOAD_ERR_MSG);
    });
  }

  window.HawkGoogle = {
    CLIENT_ID: CLIENT_ID,
    newNonce: newNonce,
    renderButton: renderButton,
  };
})();
