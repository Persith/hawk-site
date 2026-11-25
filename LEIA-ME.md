# Site do Hawk (landing page)

Página de apresentação e venda do Hawk, com os Termos de uso e a Política de Privacidade. É HTML, CSS e JS puros, sem framework e sem build.

**Ainda não está publicada.** A ideia é publicar no GitHub Pages, em `https://persith.github.io/hawk-site/`. O Mercado Pago pede esse endereço para ativar o ambiente de produção, e o Google pede a Política de Privacidade para publicar o login.

## Arquivos
- `index.html`: a landing page. Tem topo com notch e olhos que seguem o mouse, Recursos, prints, Olhos, Preços, Dúvidas e rodapé.
- `termos.html`: Termos de uso, Reembolso (`#reembolso`) e Privacidade (`#privacidade`).
- `style.css`: estilos das duas páginas. As cores ficam em `:root` (`--bg`, `--blue`, `--eye`...).
- `assets/`: logo (`hawk-icone.svg/png`, `hawk-logo-branco.svg`) e prints (`musica.png`, cortado do `prints/72`; `cronometro.png`, de `prints/113`; `agua.png`, de `prints/117`).

## Ver no PC
Na pasta `site`, rode:

```
python -m http.server 8765 --bind 127.0.0.1
```

Depois abra `http://127.0.0.1:8765`. Abrir o `index.html` com dois cliques também funciona.

## Regras
- **Prints sem dados pessoais:** nada de WhatsApp, conversas, nomes de contatos, projetos do Claude ou capas de álbum reais. As músicas dos prints usados são fictícias ("Noite Clara", "Lua Azul").
- **Olhos com personagens:** Goku, Vegeta, HAL 9000 e Banguela são marcas de terceiros. Não cite esses nomes no site; use só os estilos genéricos.
- **Textos** em português do Brasil, curtos e claros.
- **Download:** o botão aponta para `https://github.com/Persith/hawk-releases/releases/latest/download/Hawk-Setup.exe`, que é o instalador da última versão publicada.

## Falta antes de publicar
1. **Nome e CPF ou CNPJ do vendedor** em `termos.html`, na seção "Quem somos", no lugar de `[NOME COMPLETO OU RAZÃO SOCIAL]` e `[CPF OU CNPJ]`. O Decreto 7.962/2013 exige essa identificação, e ela fica pública. Se houver CNPJ, por exemplo de MEI, prefira ele.
2. **Revisar as promessas:**
   - "Todas as atualizações" na licença.
   - Pagamento com Pix, cartão ou saldo.
   - Os dados do notch ficam só no PC.
   - As descrições dos recursos.
3. **Publicar uma versão do Hawk com a Conta e Licença** pelo `scripts\publicar.ps1`. A `v2.0.2` do `hawk-releases` ainda não tem login nem compra, então quem baixar pelo site não consegue comprar.
4. **Escolher onde hospedar:**
   - **Opção A:** um repositório público novo, `Persith/hawk-site`, só com esta pasta, e o Pages ligado. O endereço fica `persith.github.io/hawk-site`.
   - **Opção B:** ligar o Pages no `Persith/hawk-releases`, que já é público, numa pasta `docs/`. O endereço fica `persith.github.io/hawk-releases`. É menos uma coisa para manter, mas o endereço é menos bonito.
   - Em qualquer opção, dá para usar um domínio próprio depois, por exemplo `hawkapp.com.br` no Registro.br.
5. **Depois de publicar:**
   - Usar o endereço no formulário **Ativar produção** do Mercado Pago (aplicação "Assistente Hawk").
   - Usar `.../termos.html#privacidade` como Política de Privacidade no Google Auth Platform.

## Ideias para melhorar
- Prévia animada de alguns estilos de olhos na seção Olhos. O `kit-olhos/` e `ui/renderer/eyes/` têm o desenho de cada um.
- Um vídeo ou GIF curto do notch abrindo e mostrando a música.
- Seção "Como funciona a compra", com 3 passos: baixar, testar 7 dias, comprar no app.
- Imagem de compartilhamento (`og:image`) de 1200×630 com o logo e o notch.
