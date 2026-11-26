/* The site's account and shop.
   - "Entrar" in the header (#acctBtn) signs in with Google (Supabase Auth PKCE, same account as the Hawk app).
   - First sign-in prompts for the user's nickname (user_metadata.apelido) if missing; it can be edited anytime
     inside "Minha conta", which also lists "Presentes que dei" with copyable/WhatsApp gift links.
   - Every element with class "buy" and data-item="<catalogo id>" opens the buy dialog ("Para mim" or "De presente"
     with an optional plain-text note), calls checkout, and sends the buyer to Mercado Pago.
   Only the publishable key is here (it is public on purpose); the Mercado Pago token stays on the server. */
(function () {
  var SUPABASE_URL = 'https://qtflyunebpskussorwjf.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_IxdUmnST3w6mZGwqg0JdTQ_S7dfWT-Y';
  var DOWNLOAD_URL = 'https://github.com/Persith/hawk-releases/releases/latest/download/Hawk-Setup.exe';
  var NOTE_MAX = 300;
  var NICK_MAX = 30;
  var PENDING = 'hawk-buy-pending'; // what to reopen after Google sign-in ("@login" or an item id)

  // what the dialog shows for each item (the price charged is always the one in the catalogo table)
  var ITEMS = {
    'licenca': ['Hawk', 'R$ 14,99'],
    'hawk-completo': ['Hawk Completo', 'R$ 29,90'],
    'pacote-dev': ['Pacote Desenvolvedor', 'R$ 7,90'],
    'pacote-lan': ['Pacote LAN Local', 'R$ 7,90'],
    'pacote-ia': ['Pacote IA', 'R$ 5,90'],
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
  var item = '';          // '' = account dialog, otherwise item id
  var gift = false;       // "De presente" selected
  var draft = { recado: '' };
  var busy = false;
  var nickSkipped = false;
  var returnOrder = null; // { id, retStatus } when back from Mercado Pago
  var returnPollTimer = 0;

  function esc(t) {
    return String(t).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function msg(t, ok) {
    var m = box.querySelector('.buy-msg');
    if (m) { m.textContent = t || ''; m.classList.toggle('ok', !!ok); }
  }
  function session() {
    var c = client();
    return c ? c.auth.getSession().then(function (r) { return r.data && r.data.session; }) : Promise.resolve(null);
  }
  function nickOf(s) {
    return (s && s.user && s.user.user_metadata && typeof s.user.user_metadata.apelido === 'string'
      ? s.user.user_metadata.apelido.trim()
      : '');
  }
  function needsFirstNick(s) { return !!(s && !nickOf(s) && !nickSkipped); }
  function itemName(id) { return (ITEMS[id] && ITEMS[id][0]) || id; }
  function giftLinkFor(code) { return new URL('resgatar.html?c=' + encodeURIComponent(code), location.href).toString(); }
  function whatsappHref(link) {
    return 'https://wa.me/?text=' + encodeURIComponent('Te dei um presente no Hawk! Resgate aqui: ' + link);
  }
  function formatDateBR(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  }
  function close() { return '<button class="buy-close" type="button" aria-label="Fechar">×</button>'; }
  function header() {
    if (returnOrder) {
      return close() + '<div class="buy-item">Pagamento</div><h3>Resumo do pedido</h3>';
    }
    if (!item) return close() + '<div class="buy-item">Sua conta</div><h3>Entrar no Hawk</h3>';
    var it = ITEMS[item] || [item, ''];
    return close() + '<div class="buy-item">' + (gift ? 'Comprar de presente' : 'Comprar') + '</div><h3>' + esc(it[0]) + '</h3><div class="buy-price">' + esc(it[1]) + '</div>';
  }
  function googleLoginMarkup(text) {
    return '<p>' + text + '</p>' +
      '<button class="btn btn-light" data-act="google" type="button">' + G_ICO + 'Entrar com Google</button>' +
      '<div class="buy-msg"></div>';
  }
  function firstNickMarkup(email) {
    return '<p>Conectado como <b>' + esc(email || '') + '</b>. Escolha um nome de usuário para aparecer nos presentes que você enviar.</p>' +
      '<form data-act="firstnick" novalidate>' +
      '<label class="buy-label" for="nickFirst">Nome de usuário</label>' +
      '<input id="nickFirst" name="nick" maxlength="' + NICK_MAX + '" autocomplete="nickname" placeholder="Como quer ser chamado?">' +
      '<div class="buy-row"><button class="btn btn-light" type="submit">Continuar</button>' +
      '<button class="btn btn-ghost" type="button" data-act="skipnick">Agora não</button></div></form>' +
      '<div class="buy-msg"></div>';
  }
  function spinBtn(b, text) {
    b.classList.add('loading');
    b.disabled = true;
    b.innerHTML = '<span class="spin" aria-hidden="true"></span>' + text;
  }
  function copyText(text, btn) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) return;
    navigator.clipboard.writeText(text).then(function () {
      if (!btn) return;
      var orig = btn.dataset.orig || btn.textContent;
      btn.dataset.orig = orig;
      btn.textContent = 'Link copiado!';
      clearTimeout(btn._cpTimer);
      btn._cpTimer = setTimeout(function () { btn.textContent = orig; }, 1600);
    }, function () {});
  }

  function renderGiftsList(container) {
    container.textContent = 'Carregando presentes…';
    client()
      .from('pedidos')
      .select('id, item, status, criado_em, presente_codigo, presente_aplicado_em')
      .eq('presente', true)
      .order('criado_em', { ascending: false })
      .limit(20)
      .then(function (res) {
        if (!container.isConnected) return;
        if (res.error) {
          container.textContent = 'Não foi possível carregar seus presentes.';
          return;
        }
        var rows = Array.isArray(res.data) ? res.data : [];
        if (rows.length === 0) {
          container.textContent = 'Você ainda não comprou nenhum presente.';
          return;
        }
        container.textContent = '';
        rows.forEach(function (r) {
          var card = document.createElement('div');
          card.className = 'gift-card';

          var top = document.createElement('div');
          top.className = 'gift-top';

          var title = document.createElement('strong');
          title.textContent = itemName(r.item);

          var badge = document.createElement('span');
          badge.className = 'gift-badge';
          if (r.status === 'pago' && r.presente_aplicado_em) {
            badge.classList.add('done');
            badge.textContent = 'Resgatado';
          } else if (r.status === 'pago') {
            badge.classList.add('ready');
            badge.textContent = 'Pronto para enviar';
          } else if (r.status === 'pendente') {
            badge.classList.add('wait');
            badge.textContent = 'Aguardando pagamento';
          } else {
            badge.classList.add('cancel');
            badge.textContent = 'Cancelado';
          }
          top.append(title, badge);
          card.appendChild(top);

          var meta = document.createElement('div');
          meta.className = 'gift-meta';
          var dt = formatDateBR(r.criado_em);
          if (r.status === 'pago' && r.presente_aplicado_em) {
            meta.textContent = (dt ? 'Comprado em ' + dt + ' · ' : '') + 'Resgatado em ' + formatDateBR(r.presente_aplicado_em);
          } else {
            meta.textContent = dt ? 'Comprado em ' + dt : '';
          }
          card.appendChild(meta);

          if (r.status === 'pago' && !r.presente_aplicado_em && r.presente_codigo) {
            var link = giftLinkFor(r.presente_codigo);
            var acts = document.createElement('div');
            acts.className = 'gift-actions';

            var cpBtn = document.createElement('button');
            cpBtn.type = 'button';
            cpBtn.className = 'btn btn-ghost btn-sm';
            cpBtn.textContent = 'Copiar link';
            cpBtn.addEventListener('click', function () { copyText(link, cpBtn); });

            var waLink = document.createElement('a');
            waLink.className = 'btn btn-light btn-sm';
            waLink.href = whatsappHref(link);
            waLink.target = '_blank';
            waLink.rel = 'noopener noreferrer';
            waLink.textContent = 'Enviar pelo WhatsApp';

            acts.append(cpBtn, waLink);
            card.appendChild(acts);
          }

          container.appendChild(card);
        });
      });
  }

  function renderReturnOrder(s) {
    clearTimeout(returnPollTimer);
    if (!s) {
      box.innerHTML = header() + googleLoginMarkup('Entre com sua conta Google para ver os detalhes do seu pedido.');
      return;
    }
    box.innerHTML = header() + '<p>Consultando pedido…</p>';
    client()
      .from('pedidos')
      .select('id, item, status, presente, presente_codigo, presente_aplicado_em, criado_em')
      .eq('id', returnOrder.id)
      .maybeSingle()
      .then(function (res) {
        if (!dlg.open || !returnOrder) return;
        var p = res.data;
        if (!p) {
          box.innerHTML = header() + '<p>Pedido não encontrado nesta conta.</p>' +
            '<div class="buy-row"><button class="btn btn-ghost" data-act="account" type="button">Minha conta</button>' +
            '<button class="btn btn-light" data-act="close" type="button">Fechar</button></div>';
          return;
        }

        var wrap = document.createElement('div');
        var head = document.createElement('div');
        head.innerHTML = close() + '<div class="buy-item">' + (p.presente ? 'Presente' : 'Compra') + '</div>';
        var h3 = document.createElement('h3');
        h3.textContent = itemName(p.item);
        head.appendChild(h3);
        wrap.appendChild(head);

        if (p.presente) {
          if (p.status === 'pago' && p.presente_codigo) {
            var link = giftLinkFor(p.presente_codigo);
            var info = document.createElement('p');
            info.textContent = p.presente_aplicado_em
              ? 'Este presente já foi resgatado.'
              : 'Pagamento aprovado! Mande este link para quem vai ganhar:';
            wrap.appendChild(info);

            if (!p.presente_aplicado_em) {
              var input = document.createElement('input');
              input.type = 'text';
              input.readOnly = true;
              input.value = link;
              input.addEventListener('focus', function () { input.select(); });
              wrap.appendChild(input);

              var acts = document.createElement('div');
              acts.className = 'buy-row';
              var cpBtn = document.createElement('button');
              cpBtn.type = 'button';
              cpBtn.className = 'btn btn-ghost';
              cpBtn.textContent = 'Copiar link';
              cpBtn.addEventListener('click', function () { copyText(link, cpBtn); });

              var wa = document.createElement('a');
              wa.className = 'btn btn-light';
              wa.href = whatsappHref(link);
              wa.target = '_blank';
              wa.rel = 'noopener noreferrer';
              wa.textContent = 'Enviar pelo WhatsApp';
              acts.append(cpBtn, wa);
              wrap.appendChild(acts);
            }
          } else if (p.status === 'pendente' && returnOrder.retStatus !== 'failure') {
            var pend = document.createElement('p');
            pend.textContent = 'Pagamento em análise… O link aparece em "Minha conta" (Presentes que dei) assim que o pagamento for aprovado.';
            wrap.appendChild(pend);

            var pendRow = document.createElement('div');
            pendRow.className = 'buy-row';
            var refBtn = document.createElement('button');
            refBtn.type = 'button';
            refBtn.className = 'btn btn-light';
            refBtn.textContent = 'Atualizar';
            refBtn.addEventListener('click', function () { render(); });

            var accBtn = document.createElement('button');
            accBtn.type = 'button';
            accBtn.className = 'btn btn-ghost';
            accBtn.dataset.act = 'account';
            accBtn.textContent = 'Minha conta';
            pendRow.append(refBtn, accBtn);
            wrap.appendChild(pendRow);

            returnPollTimer = setTimeout(function () { if (dlg.open && returnOrder) render(); }, 3500);
          } else {
            var fail = document.createElement('p');
            fail.textContent = 'O pagamento não foi concluído.';
            wrap.appendChild(fail);
            var retryRow = document.createElement('div');
            retryRow.className = 'buy-row';
            var retryBtn = document.createElement('button');
            retryBtn.type = 'button';
            retryBtn.className = 'btn btn-light';
            retryBtn.textContent = 'Tentar de novo';
            retryBtn.addEventListener('click', function () {
              var retryItem = p.item;
              returnOrder = null;
              gift = true;
              open(retryItem);
            });
            retryRow.appendChild(retryBtn);
            wrap.appendChild(retryRow);
          }
        } else {
          var selfMsg = document.createElement('p');
          if (p.status === 'pago' || returnOrder.retStatus === 'approved') {
            selfMsg.textContent = 'Pagamento aprovado! O item já está na sua conta. Se o Hawk estiver aberto, ele atualiza em instantes.';
          } else if (p.status === 'pendente' && returnOrder.retStatus !== 'failure') {
            selfMsg.textContent = 'Pagamento em análise… Assim que for confirmado, o item será liberado na sua conta.';
          } else {
            selfMsg.textContent = 'O pagamento não foi concluído.';
          }
          wrap.appendChild(selfMsg);

          var selfRow = document.createElement('div');
          selfRow.className = 'buy-row';
          var dlBtn = document.createElement('a');
          dlBtn.className = 'btn btn-light';
          dlBtn.href = DOWNLOAD_URL;
          dlBtn.textContent = 'Baixar o Hawk';
          var clBtn = document.createElement('button');
          clBtn.type = 'button';
          clBtn.className = 'btn btn-ghost';
          clBtn.dataset.act = 'close';
          clBtn.textContent = 'Fechar';
          selfRow.append(dlBtn, clBtn);
          wrap.appendChild(selfRow);
        }

        box.replaceChildren(wrap);
      });
  }

  function render() {
    if (!client()) {
      box.innerHTML = header() + '<p>Não foi possível carregar a conta. Verifique a internet e tente de novo.</p>';
      return;
    }
    session().then(function (s) {
      if (returnOrder) {
        renderReturnOrder(s);
        return;
      }

      if (needsFirstNick(s)) {
        var whoEmail = s.user.email || '';
        box.innerHTML = close() + '<div class="buy-item">Bem-vindo ao Hawk</div><h3>Escolha seu nome</h3>' + firstNickMarkup(whoEmail);
        var nf = box.querySelector('#nickFirst');
        if (nf) nf.focus();
        return;
      }

      // account dialog (header button)
      if (!item) {
        box.innerHTML = (s ? header().replace(close(), '').replace('Entrar no Hawk', 'Minha conta') : header()) + (s
          ? '<div class="buy-who"><span>Conectado como <b>' + esc(s.user.email || '') + '</b></span></div>' +
            '<form data-act="nick"><label class="buy-label" for="nick">Nome de usuário</label>' +
            '<div class="nick-row"><input id="nick" name="nick" maxlength="' + NICK_MAX + '" autocomplete="nickname" placeholder="Como quer ser chamado?" value="' + esc(nickOf(s)) + '">' +
            '<button class="btn btn-ghost" type="submit">Salvar</button></div></form>' +
            '<div class="buy-msg"></div>' +
            '<div class="gifts-sec"><h4>Presentes que dei</h4><div class="gifts-list" id="giftsList"></div></div>' +
            '<div class="buy-row"><button class="btn btn-ghost" data-act="close" type="button">Fechar</button>' +
            '<button class="btn btn-danger" data-act="out" type="button">Sair</button></div>'
          : googleLoginMarkup('Entre com sua conta Google para usar o mesmo cadastro no site e no Hawk.'));
        if (s) {
          var gl = document.getElementById('giftsList');
          if (gl) renderGiftsList(gl);
        }
        return;
      }

      // buy dialog, signed out
      if (!s) {
        box.innerHTML = header() + googleLoginMarkup('Entre com sua conta Google para comprar, para você ou de presente.');
        return;
      }

      // buy dialog, signed in
      var seg = '<div class="buy-seg" role="tablist">' +
        '<button type="button" data-act="me" class="' + (gift ? '' : 'on') + '">' + ME_ICO + 'Para mim</button>' +
        '<button type="button" data-act="gift" class="' + (gift ? 'on' : '') + '">' + GIFT_ICO + 'De presente</button></div>';
      var body = gift
        ? '<form data-act="giftform" novalidate>' +
          '<label class="buy-label" for="gNote">Recado (opcional)</label>' +
          '<textarea id="gNote" name="recado" maxlength="' + NOTE_MAX + '" placeholder="Escreva uma mensagem para a pessoa">' + esc(draft.recado) + '</textarea>' +
          '<div class="buy-count"><span>' + draft.recado.length + '</span>/' + NOTE_MAX + '</div>' +
          '<p>Depois do pagamento, você recebe um link para mandar para quem vai ganhar.</p>' +
          '<button class="btn btn-light" type="submit">' + GIFT_ICO.replace('<svg', '<svg style="width:20px;height:20px"') + 'Ir para o pagamento</button></form>'
        : '<div class="buy-who"><span>Para a conta <b>' + esc(s.user.email || '') + '</b></span><button class="buy-link" data-act="out" type="button">Trocar conta</button></div>' +
          '<button class="btn btn-light" data-act="pay" type="button">Ir para o pagamento</button>';
      box.innerHTML = header() + seg + body + '<div class="buy-msg"></div>' +
        '<p class="buy-fine">Pagamento seguro pelo Mercado Pago, com Pix, cartão ou saldo.</p>';
    });
  }

  function open(id) {
    returnOrder = null;
    clearTimeout(returnPollTimer);
    item = id || '';
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
      var body = {
        item: item,
        return_url: location.origin + location.pathname,
      };
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
    var note = f.recado.value.trim().slice(0, NOTE_MAX);
    pay({ recado: note });
  }

  function syncHeader() {
    session().then(function (s) {
      var ava = acctBtn.querySelector('.acct-ava'), txt = acctBtn.querySelector('.acct-txt');
      var email = s ? (s.user.email || '') : '';
      ava.hidden = !s;
      var nick = nickOf(s);
      ava.innerHTML = s ? ME_ICO : '';
      txt.textContent = s ? (nick || email.split('@')[0]) : 'Entrar';
      acctBtn.title = s ? 'Conectado como ' + email : 'Entrar com Google';
    });
  }

  function saveNick(raw, onDone) {
    var nick = String(raw || '').trim().replace(/\s+/g, ' ').slice(0, NICK_MAX);
    if (nick.length < 2) {
      msg('O nome precisa ter pelo menos 2 letras.');
      return;
    }
    msg('Salvando…', true);
    client().auth.updateUser({ data: { apelido: nick } }).then(function (r) {
      if (r.error) { msg('Não foi possível salvar. Tente de novo.'); return; }
      msg('Nome salvo!', true);
      syncHeader();
      if (onDone) onDone();
    });
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest('button, a[data-act]');
    if (!b) return;
    if (b.classList.contains('buy-close')) {
      if (b.closest('.buy-box').querySelector('[data-act="firstnick"]')) nickSkipped = true;
      returnOrder = null;
      clearTimeout(returnPollTimer);
      dlg.close();
      return;
    }
    var act = b.dataset.act;
    if (act === 'pay') pay(null);
    if (act === 'me' || act === 'gift') { gift = act === 'gift'; msg(''); render(); }
    if (act === 'skipnick') { nickSkipped = true; render(); }
    if (act === 'account') { returnOrder = null; clearTimeout(returnPollTimer); item = ''; gift = false; render(); }
    if (act === 'out') {
      spinBtn(b, 'Saindo…');
      client().auth.signOut().then(function () {
        nickSkipped = false;
        syncHeader();
        if (item) render(); else dlg.close();
      });
    }
    if (act === 'close') { returnOrder = null; clearTimeout(returnPollTimer); dlg.close(); }
    if (act === 'google') {
      if (b.classList.contains('loading')) return;
      spinBtn(b, 'Abrindo o Google…');
      try { sessionStorage.setItem(PENDING, item || '@login'); } catch (err) { /* private mode */ }
      var back = location.origin + location.pathname + (item ? '#precos' : '');
      client().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back } }).then(function (r) {
        if (r.error) { msg('Não foi possível entrar com o Google.'); render(); }
      });
    }
  });

  box.addEventListener('input', function (e) {
    var t = e.target;
    if (!t.form || t.form.dataset.act !== 'giftform') return;
    draft[t.name] = t.value;
    if (t.name === 'recado') {
      var c = box.querySelector('.buy-count span');
      if (c) c.textContent = t.value.length;
    }
  });

  box.addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target;
    if (f.dataset.act === 'giftform') { sendGift(f); return; }
    if (f.dataset.act === 'nick') { saveNick(f.nick.value); return; }
    if (f.dataset.act === 'firstnick') { saveNick(f.nick.value, render); return; }
  });

  dlg.addEventListener('click', function (e) {
    if (e.target === dlg) {
      returnOrder = null;
      clearTimeout(returnPollTimer);
      dlg.close();
    }
  });

  acctBtn.addEventListener('click', function () { open(''); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.buy[data-item]');
    if (!b) return;
    e.preventDefault();
    gift = false;
    draft = { recado: '' };
    open(b.dataset.item);
  });

  window.addEventListener('pageshow', function (e) { if (e.persisted && dlg.open) render(); });
  if (client()) client().auth.onAuthStateChange(function () { syncHeader(); });
  syncHeader();

  var params = new URLSearchParams(location.search);
  var pedidoParam = params.get('pedido');
  if (pedidoParam && client()) {
    returnOrder = {
      id: pedidoParam,
      retStatus: (params.get('s') || params.get('collection_status') || params.get('status') || '').toLowerCase(),
    };
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (err) { /* ignore */ }
    render();
    if (!dlg.open) dlg.showModal();
    return;
  }

  var pending = '';
  try { pending = sessionStorage.getItem(PENDING) || ''; sessionStorage.removeItem(PENDING); } catch (err) { pending = ''; }
  if (pending && client()) {
    session().then(function () { open(pending === '@login' ? '' : (ITEMS[pending] ? pending : '')); });
  } else if (client()) {
    // First visit right after Google sign-in without a pending dialog
    session().then(function (s) {
      if (needsFirstNick(s) && !dlg.open) open('');
    });
  }
})();
