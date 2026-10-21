# Jogos Educacionais

Jogo educativo para crianças em alfabetização, feito para o **Colégio Pleno**.
O **Plenix**, o mascote robô do Pleno, guia as missões, comemora os acertos, fica triste com os erros
e pensa junto com o aluno, explicando
cada regra da ortografia do português de um jeito simples.

Feito com HTML, CSS e JavaScript puro, sem instalação. Funciona no computador, no tablet e no celular.

São três jogos, escolhidos na tela inicial: **Jogo de Ortografia** (as missões abaixo), **Chuva de Erros** e **Chuva de Matemática**.

## Chuva de Matemática

O aluno escolhe as operações (adição, subtração, multiplicação, divisão). Uma conta cai de cada vez e ele toca
na resposta certa entre 4 opções (no computador, também pelas teclas 1 a 4) antes que ela chegue ao chão.
Cada acerto sobe um nível (de 1 a 10: números e tabuadas maiores) e cada erro ou conta que cai desce um.
Contas mais difíceis caem mais devagar (de 7 a 12 s). A rodada tem 20 contas e termina com estrelas, pontos,
nível alcançado e o relatório (PDF e e-mail) com as contas para revisar, agrupadas por operação.
As faixas de números de cada nível estão em `FAIXAS` e `FATORES` no `jogo.js`.

## Chuva de Erros

As palavras caem na tela e o aluno toca só nas escritas **certas** ou só nas **erradas** (ele escolhe antes).
Cada palavra fica de 2 a 5 segundos na tela: quanto mais rápido o aluno pega, mais rápido elas caem;
quando ele erra ou deixa passar, a chuva fica mais lenta. Cada rodada tem até 30 palavras, metade certa e metade errada,
de uma categoria ou de todas. No fim aparecem estrelas, pontos e o mesmo relatório (PDF e e-mail) das missões.

As palavras estão em `CHUVA_CATEGORIAS` no `dados.js`, como pares `['jeito certo', 'jeito errado']`.
Ficaram de fora os pares em que o "errado" também é uma palavra que existe (caro/carro, ora, pais...) e as
palavras que só se decidem dentro de uma frase (mas/mais, mau/mal, onde/aonde, porque/por que...).

## Jogo de Ortografia: missões

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
dica do Plenix quando a criança erra e **estrelas** no fim (salvas no aparelho).

## Entrada e relatório

- **Sempre que o jogo abre**, o aluno digita o **primeiro nome**. A senha da turma (`alunoPleno`) está
  desligada por enquanto; para voltar a pedir, troque `PEDIR_SENHA` para `true` no `jogo.js`
  (o último nome já vem preenchido).
  A senha é conferida no próprio aparelho (uma "portinha" para as crianças, não uma proteção de segurança).
- As estrelas ficam salvas **por aluno** no aparelho; "Trocar aluno" permite outra criança usar.
- No fim de cada missão aparece o **relatório para revisar**: principais dificuldades (por regra)
  e a lista de palavras com o jeito certo e o que o aluno tentou.
- O relatório pode ser baixado em **PDF** (gerado no próprio aparelho com a biblioteca jsPDF, em `vendor/`).

## Voz

- Sem gravações, o jogo usa a voz do aparelho com o tom mais agudo (voz de criança).
- Com as **gravações do Davi** em `audio/palavras/` e `audio/frases/`, o jogo toca a voz dele.
  A lista completa de palavras, frases e nomes de arquivo está em **`GRAVAR.md`**.

## Como jogar

Abra o `index.html` no navegador.

## Arquivos

- `index.html`, `style.css` — páginas e visual (cores do Pleno)
- `jogo.js` — telas, perguntas, sons, voz e estrelas
- `dados.js` — banco de palavras e regras de cada missão (fácil de aumentar)
- `plenix.js` + `assets/plenix/plenix_spritesheet_1x.png` — o Plenix em pixel art (folha 4x4: andando, festejando, triste, pensando), animado no `style.css`
- `assets/plenix/*.gif` — as mesmas animações em GIF (fundo branco), para usar em outros materiais
- `ferramentas/plenix.ps1` — recorta o Plenix comparando as imagens de fundo azul e roxo (em `assets/plenix-original/`)
- `ferramentas/plenix-farda.py` — veste o Plenix com a farda da Rede Estadual (camisa branca, gola azul, faixa amarela, vermelha e azul) a partir de `assets/plenix-original/plenix_spritesheet_original.png`
- `assets/logo-pleno.png` — logo do colégio
- `ferramentas/logo.ps1` — recorta o logo e deixa o fundo transparente

Para criar mais perguntas, basta adicionar itens no `dados.js`.

---

© **Marco Nunes** — Todos os direitos reservados.

## App (PWA)

O jogo pode ser instalado no celular (botão **📲 Instalar app** na tela inicial) e funciona offline.
Inclui `manifest.json`, `service-worker.js`, ícones em `icons/` e `privacidade.html` (exigida pela Google Play).

Ao alterar qualquer arquivo do jogo, aumente a versão para os aparelhos baixarem a nova.
O script troca de uma vez a `VERSAO` do `service-worker.js` e o `?v=` dos arquivos no `index.html`
e no `service-worker.js` (soma 1; para escolher o número, passe-o no fim, ex.: `... versao.ps1 20`):

```
powershell -ExecutionPolicy Bypass -File ferramentas\versao.ps1
```

- `assets/figuras/` — figuras das palavras, recortadas do cartaz por `ferramentas/figuras.ps1`
- `ferramentas/icones.ps1` — gera os ícones do app

## Relatório por e-mail (grátis, com Google Apps Script)

Na tela inicial, **🧑‍🏫 Área do professor** (senha `app0707`, em `SENHA_PROFESSOR` no `jogo.js`) guarda no aparelho
o e-mail do professor. No fim de cada missão, o relatório vai para esse e-mail, mesmo que o aluno não baixe o PDF.
Sem internet, o relatório fica numa fila no aparelho e é enviado quando a conexão voltar.

O envio é feito por `ferramentas/relatorio-email.gs`, publicado uma vez na sua conta Google:

1. Crie uma planilha no Google Drive (ela guarda uma cópia de cada relatório na aba "Relatórios")
   e abra **Extensões → Apps Script**. Apague o que estiver lá e cole o conteúdo de `ferramentas/relatorio-email.gs`.
2. **Implantar → Nova implantação → Tipo: App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
   Autorize o acesso ao Gmail e à planilha quando o Google pedir.
3. Copie o endereço do app da Web (termina em `/exec`) e cole em `URL_RELATORIO` no `jogo.js`.
   Rode `ferramentasersao.ps1` e publique o jogo.

Limite gratuito: cerca de 100 e-mails por dia numa conta Gmail comum (1.500 no Google Workspace).
Ao mudar o script, use **Implantar → Gerenciar implantações → editar → Nova versão** para o endereço continuar o mesmo.

## Publicar na VPS (Dokploy)

O `Dockerfile` monta um nginx que serve o jogo em `/ortografia/`. No Dokploy: Build Type **Dockerfile**,
domínio com path `/ortografia`, **Strip Path desligado**, porta **80** e HTTPS (Let's Encrypt).
