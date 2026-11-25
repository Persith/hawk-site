# Site do Hawk (landing page)

Página de apresentação e venda do Hawk, com os Termos de uso e a Política de Privacidade. É HTML, CSS e JS puros, sem framework e sem build.

**Ainda não está publicada.** A ideia é publicar no GitHub Pages, em `https://persith.github.io/hawk-site/`. O Mercado Pago pede esse endereço para ativar o ambiente de produção, e o Google pede a Política de Privacidade para publicar o login.

## Arquivos
- `index.html`: a landing page, com visual inspirado no site do Discord (fundo azul-marinho com estrelas, títulos grandes, seções alternadas). Ela tem:
  - o topo com uma área de trabalho de mentira e um notch que troca sozinho de estado (olhos, Claude Code, música, cronômetro, água);
  - os blocos de recursos (Música, IAs, Cronômetro e água, Dispositivos) e a grade "E tem muito mais";
  - a seção Olhos, com os 12 estilos;
  - Preços, Dúvidas, a chamada final e o rodapé.
- `pacotes.html`: os detalhes do Pacote Desenvolvedor e do Pacote LAN Local, com prints e o que cada serviço faz. O botão "Detalhes" dos cartões dos pacotes abre esta página.
- `termos.html`: Termos de uso, Reembolso (`#reembolso`) e Privacidade (`#privacidade`).
- `style.css`: os estilos das três páginas. As cores ficam em `:root` (`--bg`, `--blue`, `--eye`...).
- `loja.js`: a conta e a loja do site.
  - O botão Entrar do cabeçalho usa o Supabase Auth (Google ou e-mail e senha, a mesma conta do app). Ele também tem Criar conta e "Minha conta", com nome de usuário e Sair.
  - Todo elemento com a classe `buy` e `data-item` abre a janela de compra ("Para mim" ou "De presente"). A compra chama a função `checkout` e leva ao Mercado Pago.
  - Presentes ficam desligados por `GIFTS_READY = false` até o servidor tratar presentes (veja `docs/alinhar-hawk-com-site.md`).
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
5. **Escolher onde hospedar:**
   - **Opção A:** um repositório público novo, `Persith/hawk-site`, só com esta pasta, e o Pages ligado. O endereço fica `persith.github.io/hawk-site`.
   - **Opção B:** ligar o Pages no `Persith/hawk-releases`, que já é público, numa pasta `docs/`. O endereço fica `persith.github.io/hawk-releases`.
   - Em qualquer opção, dá para usar um domínio próprio depois.
6. **Depois de publicar:**
   - colocar o endereço nas **Redirect URLs** do Supabase, para o "Entrar com Google" voltar ao site;
   - usar o endereço no formulário **Ativar produção** do Mercado Pago;
   - usar `.../termos.html#privacidade` no Google Auth Platform.

## Ideias para melhorar
- Um vídeo ou GIF curto do notch abrindo e mostrando a música.
- Seção "Como funciona a compra", com 3 passos: baixar, testar 7 dias, comprar no app.
- Imagem de compartilhamento (`og:image`) de 1200×630 com o logo e o notch.
