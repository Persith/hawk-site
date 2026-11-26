# Site do Hawk (landing page)

Página de apresentação e venda do Hawk, com os Termos de uso e a Política de Privacidade. É HTML, CSS e JS puros, sem framework e sem build.

**Publicado em 25/11/2026** em **https://persith.github.io/hawk-site/**, pelo GitHub Pages do repositório público `Persith/hawk-site` (branch `main`, pasta raiz). Esse repositório contém só esta pasta.

**Para republicar depois de mudar algo aqui** (na pasta do projeto, depois de commitar):

```
git subtree split -P site -b site-pages
git push https://github.com/Persith/hawk-site.git site-pages:main
git branch -D site-pages
```

Em 1 ou 2 minutos, o Pages atualiza sozinho. A rede do PC do serviço bloqueia `api.github.com` (o `gh` não funciona lá), mas o `git push` funciona.

## Arquivos
- `index.html`: a landing page, com visual inspirado no site do Discord (fundo azul-marinho com estrelas, títulos grandes, seções alternadas). Ela tem:
  - o topo com uma área de trabalho de mentira e um notch que troca sozinho de estado (olhos, Claude Code, música, cronômetro, água);
  - os blocos de recursos (Música, IAs, Cronômetro e água, Dispositivos) e a grade "E tem muito mais";
  - a seção Olhos, com os 12 estilos;
  - Preços, Dúvidas, a chamada final e o rodapé.
- `pacotes.html`: os detalhes do Pacote Desenvolvedor (`#dev`), do Pacote LAN Local (`#lan`) e do Pacote IA (`#ia`), com prints (Desenvolvedor e LAN), mockups em HTML/CSS do notch e tabela comparativa (Pacote IA). O botão "Detalhes" dos cartões dos pacotes abre esta página.
- `resgatar.html`: página de resgate de presentes por link (`resgatar.html?c=<codigo>`). Mostra quem enviou (apelido), o recado opcional e o botão **Resgatar** depois que a pessoa entra com Google.
- `termos.html`: Termos de uso, Reembolso (`#reembolso`) e Privacidade (`#privacidade`).
- `style.css`: os estilos das páginas. As cores ficam em `:root` (`--bg`, `--blue`, `--eye`...).
- `loja.js`: a conta e a loja do site.
  - O botão Entrar do cabeçalho usa o Supabase Auth com login somente pelo Google (a mesma conta do app). Na primeira entrada, pede o nome de usuário (`apelido`) se estiver vazio, e "Minha conta" mostra **Presentes que dei**, com os links de resgate.
  - Todo elemento com a classe `buy` e `data-item` abre a janela de compra ("Para mim" ou "De presente", só com o recado opcional). A compra chama a função `checkout` e leva ao Mercado Pago; na volta, se o presente já estiver pago, mostra o link pronto para copiar ou mandar pelo WhatsApp.
- `olhos/`: os estilos de olhos copiados do app, para os cartões da seção Olhos ficarem iguais ao Hawk.
  - Os temas são `cyber`, `hal`, `led`, `eink`, `gato`, `dragao` e `equalizer`. O `temas.css` tem o CSS deles com `body[data-eyes=` trocado por `.app-eye[data-eyes=`.
  - O `runner.js` monta cada tema no seu cartão.
  - Coruja, Esbugalhados, Etéreo e Galáxia são desenhados no `style.css` (`.eyes.coruja`...). Ao mudar um tema no app, copie de novo.
- `assets/`:
  - o logo: `hawk-icone.svg/png` e `hawk-logo-branco.svg`;
  - `musica.png`: a tela de Música no modo demonstração do painel, com uma música fictícia;
  - `pacotes/`: os prints das janelas dos pacotes, tirados com dados fictícios.

## Ver no PC
Na pasta `site`, rode:

```
python -m http.server 8765 --bind 127.0.0.1
```

Depois abra `http://127.0.0.1:8765`. Abrir o `index.html` com dois cliques também funciona.

## Regras
- **Prints sem dados pessoais:** nada de WhatsApp, conversas, nomes de contatos, projetos do Claude ou capas de álbum reais. As músicas, os PCs, o celular e os arquivos dos prints são fictícios (por exemplo "Golden Hour Drive", "PC do Escritório" e "Galaxy A54").
- **Olhos com personagens:** Goku, Vegeta e Banguela saíram do projeto por causa de direito autoral, e HAL 9000 aparece só como "Lente de câmera". Não cite esses nomes no site.
- **Textos** em português do Brasil, curtos e claros.
- **Download:** o botão aponta para `https://github.com/Persith/hawk-releases/releases/latest/download/Hawk-Setup.exe`, que é o instalador da última versão publicada.

## Falta antes de publicar
1. **Endereço físico do vendedor** em `termos.html`, na seção "Quem somos". O Decreto 7.962/2013 também pede o endereço; o nome (Filipe C. Maia) e o CNPJ do MEI já estão lá. O dono vai trocar o endereço do MEI para um comercial antes.
2. **Revisar as promessas:** "Todas as atualizações"; pagamento com Pix, cartão ou saldo; os dados do notch ficam só no PC; as descrições dos recursos e dos pacotes.
3. **O servidor e o app alinhados com os preços novos** (veja `docs/alinhar-hawk-com-site.md`):
   - o catálogo com R$ 14,99, os pacotes, o Hawk Completo, os olhos a R$ 3,90 e o Galáxia;
   - o `checkout` e o `mp-webhook` aceitando pacotes, combo e presentes.

   Sem isso, os botões de comprar do site mostram "ainda não está à venda".
4. **Publicar uma versão do Hawk com a Conta e Licença** pelo `scripts\publicar.ps1`. A `v2.0.2` do `hawk-releases` ainda não tem login nem compra.
5. **Agora que está publicado:**
   - colocar o endereço nas **Redirect URLs** do Supabase, para o "Entrar com Google" voltar ao site;
   - usar o endereço no formulário **Ativar produção** do Mercado Pago;
   - usar `.../termos.html#privacidade` no Google Auth Platform.

## Ideias para melhorar
- Um vídeo ou GIF curto do notch abrindo e mostrando a música.
- Seção "Como funciona a compra", com 3 passos: baixar, testar 7 dias, comprar no app.
- Imagem de compartilhamento (`og:image`) de 1200×630 com o logo e o notch.

- **Cache:** ao mudar `style.css` ou `loja.js`, troque o `?v=` nos links das páginas HTML, senão quem já visitou continua vendo a versão antiga.
