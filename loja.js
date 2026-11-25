/* The site's account and shop.
   - "Entrar" in the header (#acctBtn) signs in with the same Hawk account (Supabase Auth: Google or e-mail and
     password, like the app). Signed in, it shows the e-mail and opens a small account panel (Sair).
   - Every element with class "buy" and data-item="<catalogo id>" opens the buy dialog. Signed in, the buyer picks
     "Para mim" or "De presente" (the friend's e-mail typed twice and an optional note), then the Edge Function
     "checkout" creates the order and returns the Mercado Pago link, and the page goes there.
   - A gift is sent as { item, presente: { email, recado } }. The server gives the item to that e-mail and sends
     the friend an e-mail with the note, a link to create the account and to download the Hawk
     (see docs/alinhar-hawk-com-site.md). Until the server does that, GIFTS_READY stays false and the site
     does not send a gift (the old checkout would give the item to the buyer).
   Only the publishable key is here (it is public on purpose); the Mercado Pago token stays on the server. */
(function () {
  var SUPABASE_URL = 'https://qtflyunebpskussorwjf.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_IxdUmnST3w6mZGwqg0JdTQ_S7dfWT-Y';
  var GIFTS_READY = false;
  var NOTE_MAX = 300;
  var NICK_MAX = 30;
  var PENDING = 'hawk-buy-pending'; // what to reopen after the Google sign-in comes back ("@login" or an item id)

  // what the dialog shows for each item (the price charged is always the one in the catalogo table)
  var ITEMS = {
    'licenca': ['Hawk', 'R$ 14,99'],
    'hawk-completo': ['Hawk Completo', 'R$ 29,90'],
    'pacote-dev': ['Pacote Desenvolvedor', 'R$ 7,90'],
    'pacote-lan': ['Pacote LAN Local', 'R$ 7,90'],
  };
  var EYES = {
    cyber: 'Cyberpunk HUD', hal: 'Lente de câmera', led: 'Matriz de LED', eink: 'Minimalista E-Ink',
    gato: 'Felino noturno', dragao: 'Dragão elemental', coruja: 'Coruja observadora', etereo: 'Espírito etéreo',
    googly: 'Olhos esbugalhados', equalizer: 'Espectro de áudio', galaxia: 'Galáxia',
  };
  Object.keys(EYES).forEach(function (k) { ITEMS[k] = ['Olhos: ' + EYES[k], 'R$ 3,90']; });

  var GIFT_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>';
  var ME_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  var G_ICO = '<svg class="g-ico" viewBox="0 0 24 24"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.3 6.5 2.3 11.9s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z"/></svg>';

  var sb = null;
  function client() {
    if (!sb && window.supabase) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
      });
    }
    return sb;
  }

  var dlg = document.getElementById('buyDlg');
  var box = dlg.querySelector('.buy-box');
  var acctBtn = document.getElementById('acctBtn');
  var item = '';        // '' = the account dialog (header), otherwise the item being bought
  var gift = false;     // "De presente" chosen
  var draft = { email: '', email2: '', recado: '' }; // the gift form survives a re-render
  var busy = false;
  var signup = false;  // the sign-in area shows the "Criar conta" form

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function msg(t, ok) { var m = box.querySelector('.buy-msg'); if (m) { m.textContent = t || ''; m.classList.toggle('ok', !!ok); } }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
  function session() { var c = client(); return c ? c.auth.getSession().then(function (r) { return r.data && r.data.session; }) : Promise.resolve(null); }

  // the nickname lives in the account's user_metadata.apelido (Supabase Auth), so the app can show it too
  function nickOf(s) { return (s && s.user && s.user.user_metadata && s.user.user_metadata.apelido) || ''; }
  function close() { return '<button class="buy-close" type="button" aria-label="Fechar">×</button>'; }
  function header() {
    if (!item) return close() + '<div class="buy-item">Sua conta</div><h3>' + (signup ? 'Criar conta' : 'Entrar no Hawk') + '</h3>';
    var it = ITEMS[item] || [item, ''];
    return close() + '<div class="buy-item">' + (gift ? 'Comprar de presente' : 'Comprar') + '</div><h3>' + esc(it[0]) + '</h3><div class="buy-price">' + esc(it[1]) + '</div>';
  }
  function loginForm(text) {
    return '<p>' + text + '</p>' +
      '<button class="btn btn-light" data-act="google" type="button">' + G_ICO + 'Entrar com Google</button>' +
      '<div class="buy-or">ou com e-mail</div>' +
      '<form data-act="mail"><input type="email" name="email" placeholder="E-mail" autocomplete="email" required>' +
      '<input type="password" name="pass" placeholder="Senha" autocomplete="current-password" minlength="6" required>' +
      '<div class="buy-row"><button class="btn btn-ghost" type="submit" name="mode" value="in">Entrar</button>' +
      '<button class="btn btn-ghost" type="button" data-act="signup">Criar conta</button></div></form>' +
      '<div class="buy-msg"></div>';
  }
  // "Criar conta": its own form (nickname, e-mail twice, password twice)
  function signupForm() {
    return '<p>Crie sua conta do Hawk. Ela vale para o site e para o app.</p>' +
      '<form data-act="signupform" novalidate>' +
      '<label class="buy-label" for="suNick">Nome de usuário</label>' +
      '<input id="suNick" name="nick" maxlength="' + NICK_MAX + '" autocomplete="nickname" placeholder="Como quer ser chamado?">' +
      '<label class="buy-label" for="suEmail">E-mail</label>' +
      '<input id="suEmail" type="email" name="email" autocomplete="email" placeholder="seu@email.com">' +
      '<input type="email" name="email2" autocomplete="off" placeholder="Confirme o e-mail">' +
      '<label class="buy-label" for="suPass">Senha</label>' +
      '<input id="suPass" type="password" name="pass" autocomplete="new-password" placeholder="Pelo menos 6 caracteres">' +
      '<input type="password" name="pass2" autocomplete="new-password" placeholder="Repita a senha">' +
      '<button class="btn btn-light" type="submit">Criar conta</button></form>' +
      '<div class="buy-msg"></div>' +
      '<p class="buy-fine">Já tem conta? <button class="buy-link" type="button" data-act="signin">Entrar</button></p>';
  }
  function spinBtn(b, text) {
    b.classList.add('loading');
    b.disabled = true;
    b.innerHTML = '<span class="spin" aria-hidden="true"></span>' + text;
  }

  function render() {
    if (!client()) { box.innerHTML = header() + '<p>Não foi possível carregar a conta. Verifique a internet e tente de novo.</p>'; return; }
    session().then(function (s) {
      // account dialog (header button)
      if (!item) {
        // signed in: no corner ×, just Fechar and a red Sair
        box.innerHTML = (s ? header().replace(close(), '').replace('Entrar no Hawk', 'Minha conta') : header()) + (s
          ? '<div class="buy-who"><span>Conectado como <b>' + esc(s.user.email || '') + '</b></span></div>' +
            '<form data-act="nick"><label class="buy-label" for="nick">Nome de usuário</label>' +
            '<div class="nick-row"><input id="nick" name="nick" maxlength="' + NICK_MAX + '" autocomplete="nickname" placeholder="Como quer ser chamado?" value="' + esc(nickOf(s)) + '">' +
            '<button class="btn btn-ghost" type="submit">Salvar</button></div></form>' +
            '<div class="buy-msg"></div>' +
            '<p>Suas compras pelo site vão para esta conta. No Hawk, entre com ela para usar tudo o que você comprou.</p>' +
            '<div class="buy-row"><button class="btn btn-ghost" data-act="close" type="button">Fechar</button>' +
            '<button class="btn btn-danger" data-act="out" type="button">Sair</button></div>'
          : (signup ? signupForm() : loginForm('Entre com a mesma conta que você usa no Hawk. Ainda não tem? Crie agora, ela vale para o app também.')));
        return;
      }
      // buy dialog, signed out
      if (!s) {
        box.innerHTML = header() + (signup ? signupForm() : loginForm('Entre com a sua conta do Hawk para comprar, para você ou de presente. Ainda não tem? Crie agora, ela vale para o app também.'));
        return;
      }
      // buy dialog, signed in
      var seg = '<div class="buy-seg" role="tablist">' +
        '<button type="button" data-act="me" class="' + (gift ? '' : 'on') + '">' + ME_ICO + 'Para mim</button>' +
        '<button type="button" data-act="gift" class="' + (gift ? 'on' : '') + '">' + GIFT_ICO + 'De presente</button></div>';
      var body = gift
        ? '<form data-act="giftform" novalidate>' +
          '<label class="buy-label" for="gEmail">E-mail de quem vai ganhar</label>' +
          '<input id="gEmail" type="email" name="email" placeholder="email@exemplo.com" autocomplete="off" value="' + esc(draft.email) + '">' +
          '<input type="email" name="email2" placeholder="Digite o e-mail de novo" autocomplete="off" value="' + esc(draft.email2) + '">' +
          '<label class="buy-label" for="gNote">Recado (opcional)</label>' +
          '<textarea id="gNote" name="recado" maxlength="' + NOTE_MAX + '" placeholder="Escreva uma mensagem para a pessoa">' + esc(draft.recado) + '</textarea>' +
          '<div class="buy-count"><span>' + draft.recado.length + '</span>/' + NOTE_MAX + '</div>' +
          '<p>A pessoa recebe um e-mail com o seu recado, o link para criar a conta e baixar o Hawk. O presente fica na conta dela.</p>' +
          '<button class="btn btn-light" type="submit">' + GIFT_ICO.replace('<svg', '<svg style="width:20px;height:20px"') + 'Ir para o pagamento</button></form>'
        : '<div class="buy-who"><span>Para a conta <b>' + esc(s.user.email || '') + '</b></span><button class="buy-link" data-act="out" type="button">Trocar conta</button></div>' +
          '<button class="btn btn-light" data-act="pay" type="button">Ir para o pagamento</button>';
      box.innerHTML = header() + seg + body + '<div class="buy-msg"></div>' +
        '<p class="buy-fine">Pagamento seguro pelo Mercado Pago, com Pix, cartão ou saldo.</p>';
    });
  }

  function open(id) {
    item = id || '';
    signup = false;
    if (!item) gift = false;
    render();
    if (!dlg.open) dlg.showModal();
  }

  function pay(presente) {
    if (busy) return;
    busy = true;
    msg('Abrindo o Mercado Pago…', true);
    session().then(function (s) {
      if (!s) { busy = false; render(); return; }
      var body = { item: item };
      if (presente) body.presente = presente;
      return fetch(SUPABASE_URL + '/functions/v1/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token, apikey: SUPABASE_KEY },
        body: JSON.stringify(body),
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          busy = false;
          if (res.ok && j.checkout_url) { window.location.href = j.checkout_url; return; }
          if (res.status === 404) msg('Este item ainda não está à venda. Tente de novo em breve.');
          else if (res.status === 401) { client().auth.signOut().then(render); }
          else msg(j.error || 'Não foi possível abrir o pagamento. Tente de novo.');
        });
      });
    }).catch(function () { busy = false; msg('Sem conexão. Verifique a internet e tente de novo.'); });
  }

  function sendGift(f) {
    var e1 = f.email.value.trim().toLowerCase(), e2 = f.email2.value.trim().toLowerCase();
    var note = f.recado.value.trim().slice(0, NOTE_MAX);
    if (!validEmail(e1)) { msg('Digite um e-mail válido.'); f.email.focus(); return; }
    if (e1 !== e2) { msg('Os dois e-mails não são iguais. Confira e digite de novo.'); f.email2.focus(); return; }
    session().then(function (s) {
      if (s && (s.user.email || '').toLowerCase() === e1) { msg('Esse é o seu e-mail. Para comprar para você, escolha "Para mim".'); return; }
      if (!GIFTS_READY) { msg('Os presentes estarão disponíveis em breve.'); return; }
      pay({ email: e1, recado: note });
    });
  }

  // the header button shows who is signed in
  function syncHeader() {
    session().then(function (s) {
      var ava = acctBtn.querySelector('.acct-ava'), txt = acctBtn.querySelector('.acct-txt');
      var email = s ? (s.user.email || '') : '';
      ava.hidden = !s;
      var nick = nickOf(s);
      ava.innerHTML = s ? ME_ICO : ''; // a user icon in the blue circle
      txt.textContent = s ? (nick || email.split('@')[0]) : 'Entrar';
      acctBtn.title = s ? 'Conectado como ' + email : 'Entrar na sua conta do Hawk';
    });
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button, a[data-act]');
    if (!b) return;
    if (b.classList.contains('buy-close')) { dlg.close(); return; }
    var act = b.dataset.act;
    if (act === 'pay') pay(null);
    if (act === 'me' || act === 'gift') { gift = act === 'gift'; msg(''); render(); }
    // Sair in Minha conta logs out and closes; Trocar conta (buy dialog) logs out and shows the sign-in
    if (act === 'signup' || act === 'signin') { signup = act === 'signup'; render(); }
    if (act === 'out') spinBtn(b, 'Saindo…');
    if (act === 'out') client().auth.signOut().then(function () { syncHeader(); if (item) render(); else dlg.close(); });
    if (act === 'close') dlg.close();
    if (act === 'google') {
      if (b.classList.contains('loading')) return;
      spinBtn(b, 'Abrindo o Google…');
      try { sessionStorage.setItem(PENDING, item || '@login'); } catch (err) { /* private mode: the user clicks again */ }
      var back = location.origin + location.pathname + (item ? '#precos' : '');
      client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } }).then(function (r) {
        if (r.error) { msg('Não foi possível entrar com o Google.'); render(); }
      });
    }
  });

  // keep the gift form while typing (a re-render would lose it) and count the note
  box.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.form || t.form.dataset.act !== 'giftform') return;
    draft[t.name] = t.value;
    if (t.name === 'recado') { var c = box.querySelector('.buy-count span'); if (c) c.textContent = t.value.length; }
  });

  box.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.dataset.act === 'giftform') { sendGift(f); return; }
    if (f.dataset.act === 'nick') {
      var nick = f.nick.value.trim().replace(/\s+/g, ' ').slice(0, NICK_MAX);
      if (nick.length < 2) { msg('O nome precisa ter pelo menos 2 letras.'); return; }
      msg('Salvando…', true);
      client().auth.updateUser({ data: { apelido: nick } }).then(function (r) {
        if (r.error) { msg('Não foi possível salvar. Tente de novo.'); return; }
        msg('Nome salvo!', true);
        syncHeader();
      });
      return;
    }
    if (f.dataset.act === 'signupform') {
      var nick2 = f.nick.value.trim().replace(/\s+/g, ' ').slice(0, NICK_MAX);
      var em = f.email.value.trim().toLowerCase(), em2 = f.email2.value.trim().toLowerCase();
      if (nick2.length < 2) { msg('O nome de usuário precisa ter pelo menos 2 letras.'); f.nick.focus(); return; }
      if (!validEmail(em)) { msg('Digite um e-mail válido.'); f.email.focus(); return; }
      if (em !== em2) { msg('Os dois e-mails não são iguais.'); f.email2.focus(); return; }
      if (f.pass.value.length < 6) { msg('A senha precisa ter pelo menos 6 caracteres.'); f.pass.focus(); return; }
      if (f.pass.value !== f.pass2.value) { msg('As duas senhas não são iguais.'); f.pass2.focus(); return; }
      var sb2 = f.querySelector('button[type=submit]');
      spinBtn(sb2, 'Criando a conta…');
      msg('');
      client().auth.signUp({ email: em, password: f.pass.value, options: { data: { apelido: nick2 } } }).then(function (r) {
        if (r.error) {
          sb2.classList.remove('loading'); sb2.disabled = false; sb2.textContent = 'Criar conta';
          msg(/already registered/i.test(r.error.message) ? 'Este e-mail já tem conta. Clique em Entrar.' : 'Não foi possível criar a conta. Tente de novo.');
          return;
        }
        signup = false;
        if (!(r.data && r.data.session)) {
          box.innerHTML = header() + '<p>Conta criada! Enviamos um link de confirmação para <b>' + esc(em) + '</b>. Confirme por lá e depois entre aqui com o seu e-mail e senha.</p>' +
            '<button class="btn btn-light" type="button" data-act="signin">Entrar</button>';
          return;
        }
        syncHeader();
        render();
      });
      return;
    }
    var mode = e.submitter ? e.submitter.value : 'in';
    var email = f.email.value.trim(), pass = f.pass.value;
    msg(mode === 'up' ? 'Criando a conta…' : 'Entrando…', true);
    var c = client();
    var p = mode === 'up' ? c.auth.signUp({ email: email, password: pass }) : c.auth.signInWithPassword({ email: email, password: pass });
    p.then(function (r) {
      if (r.error) {
        var t = /invalid login/i.test(r.error.message) ? 'E-mail ou senha incorretos.'
          : /already registered/i.test(r.error.message) ? 'Este e-mail já tem conta. Clique em Entrar.'
          : 'Não foi possível entrar. Confira o e-mail e a senha.';
        msg(t);
        return;
      }
      if (mode === 'up' && !(r.data && r.data.session)) { msg('Conta criada! Confirme pelo link enviado ao seu e-mail e depois clique em Entrar.', true); return; }
      syncHeader();
      render();
    });
  });

  // light-dismiss: a click on the backdrop closes the dialog
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });

  acctBtn.addEventListener('click', function () { open(''); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.buy[data-item]');
    if (!b) return;
    e.preventDefault();
    gift = false;
    draft = { email: '', email2: '', recado: '' };
    open(b.dataset.item);
  });

  window.addEventListener('pageshow', function (e) { if (e.persisted && dlg.open) render(); });
  if (client()) client().auth.onAuthStateChange(function () { syncHeader(); });
  syncHeader();

  // back from the Google sign-in: reopen the dialog the user was in
  var pending = '';
  try { pending = sessionStorage.getItem(PENDING) || ''; sessionStorage.removeItem(PENDING); } catch (err) { pending = ''; }
  if (pending && client()) {
    session().then(function () { open(pending === '@login' ? '' : (ITEMS[pending] ? pending : '')); });
  }
})();
