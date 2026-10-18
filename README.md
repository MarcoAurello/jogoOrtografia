# Jogo de Ortografia do Pleno

Jogo educativo para crianças em alfabetização, feito para o **Colégio Pleno**.
O **Davi Miguel**, aluno do quarto ano (personagem de uniforme: blusa cinza e calça roxa), guia as missões e explica
cada regra da ortografia do português de um jeito simples.

Feito com HTML, CSS e JavaScript puro, sem instalação. Funciona no computador, no tablet e no celular.

## Missões

| Missão | O que treina |
|---|---|
| S ou SS? | S entre vogais com som de Z (casa) e SS para o som forte (osso) |
| Ç ou C? | Ç só com A, O e U (palhaço); C com E e I (circo) |
| R ou RR? | R fraquinho entre vogais (arara) e RR forte (cachorro) |
| M ou N? | Antes de P e B, só M (tambor); N antes das outras letras (dente) |
| G ou J? | G com som de "guê" e "jê" (gato, gelo) e palavras com J (janela) |
| X ou CH? | X e CH com o mesmo som; depois de ai/ei/ou quase sempre X (caixa) |
| Acentos e til | pão, mão, avó e avô, café… |
| Detetive de Erros | achar a "palavra monstro" (ssapo, çebola, tanbor…) |
| 🌟 Todas as palavras | as 80 palavras misturadas (dá para terminar no meio e ver o relatório) |

Cada missão tem 10 palavras com figura, botão para **ouvir a palavra** (voz do navegador),
dica do Davi quando a criança erra e **estrelas** no fim (salvas no aparelho).

## Entrada e relatório

- Ao abrir, o aluno digita o **primeiro nome** e a **senha da turma: `alunoPleno`**.
  A senha é conferida no próprio aparelho (uma "portinha" para as crianças, não uma proteção de segurança).
- As estrelas ficam salvas **por aluno** no aparelho; "Trocar aluno" permite outra criança usar.
- No fim de cada missão aparece o **relatório para revisar**: principais dificuldades (por regra)
  e a lista de palavras com o jeito certo e o que o aluno tentou.
- O relatório pode ser baixado em **PDF** (gerado no próprio aparelho com a biblioteca jsPDF, em `vendor/`).

## Como jogar

Abra o `index.html` no navegador.

## Arquivos

- `index.html`, `style.css` — páginas e visual (cores do Pleno)
- `jogo.js` — telas, perguntas, sons, voz e estrelas
- `dados.js` — banco de palavras e regras de cada missão (fácil de aumentar)
- `davi.js` — desenho do Davi em SVG, com expressões
- `assets/logo-pleno.png` — logo do colégio
- `ferramentas/logo.ps1` — recorta o logo e deixa o fundo transparente

Para criar mais perguntas, basta adicionar itens no `dados.js`.

---

Projeto desenvolvido por **Davi Miguel** — 4º ano — Colégio Pleno.

© **Marco Nunes** — Todos os direitos reservados.

## App (PWA)

O jogo pode ser instalado no celular (botão **📲 Instalar app** na tela inicial) e funciona offline.
Inclui `manifest.json`, `service-worker.js`, ícones em `icons/` e `privacidade.html` (exigida pela Google Play).

Ao alterar qualquer arquivo do jogo, aumente a `VERSAO` em `service-worker.js`
para os aparelhos baixarem a versão nova.

- `assets/figuras/` — figuras das palavras, recortadas do cartaz por `ferramentas/figuras.ps1`
- `ferramentas/icones.ps1` — gera os ícones do app
