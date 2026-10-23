# Jogos Educacionais

Jogo educativo para crianças em alfabetização, feito para o **Colégio Pleno**.
O **Plenix**, o mascote robô do Pleno, guia as missões, comemora os acertos, fica triste com os erros
e pensa junto com o aluno, explicando
cada regra da ortografia do português de um jeito simples.

Feito com HTML, CSS e JavaScript puro, sem instalação. Funciona no computador, no tablet e no celular.

A tela inicial tem dois caminhos: **🎮 Jogos** (a lista, com filtro Português ou Matemática: **Jogo de Ortografia**,
**Chuva de Erros**, **Chuva de Matemática**, **Tiro Certo** e **Peso Certo**) e **📝 Questionário da aula**. Lema: *o aluno joga, o professor analisa*.

## Questionário da aula

O professor cria questionários na Área do professor (ou numa aba "Q: nome" da planilha). O aluno escolhe um,
responde uma pergunta por vez com as 4 respostas sempre embaralhadas e vê na hora se acertou (e qual era a certa).
No fim aparecem estrelas, o resultado e o relatório (tela, PDF e e-mail) com as perguntas que errou.

Cada questionário tem um **link** (botão "🔗 Copiar link" na Área do professor): o endereço do jogo com `?q=<id da aba>`.
Quem abre o link digita o nome, escolhe o professor e cai direto naquele questionário, sem ver os outros jogos.
O link é do site onde o professor copiou (ex.: o endereço publicado), e deixa de funcionar se a aba for excluída.

A **planilha modelo** (`assets/modelo-questionario.xlsx`, botão "📥 Baixar planilha modelo") tem a aba "Perguntas"
(A pergunta, B certa em verde, C a E erradas em vermelho, com 2 exemplos) e a aba "Como usar". Ela é gerada por
`ferramentas/modelo-questionario.py`. Linhas de cabeçalho repetidas são ignoradas.

## Somando as Cores (coordenadas e cálculo)

Fica em **Psicopedagogia**. Uma tabela de cores (linhas A, B, C… e colunas 1, 2, 3…) e, em cima, bolinhas com o valor
de cada cor. A conta usa casas da tabela (ex.: `A2 + C3`): o aluno acha a cor de cada casa, troca pelo valor e toca na
resposta entre 4 opções (no computador, também pelas teclas 1 a 4). Tocar numa casa da conta acende a linha e a coluna (dica,
contada no relatório). Acertar sobe um nível e errar desce um. São 8 níveis, em `NIVEIS_CORES` no `js/cores.js`: a tabela vai de
4x4 a 5x5, de 3 a 6 cores, os valores crescem, a conta passa de 2 para 3 casas e entram a subtração e a multiplicação
(`A1 × B2 + C3`). As respostas erradas imitam os erros comuns: trocar a linha pela coluna (ler A2 como B1), olhar a casa
vizinha ou errar a conta. O relatório mostra qual foi o erro. A rodada tem 15 contas.

## Esquerda e Direita (lateralidade e atenção)

Fica em **Psicopedagogia**. A mesa tem um buraco em cada canto e uma bola de cada lado (azul à esquerda, vermelha à direita).
No meio aparecem setas: a seta deitada (← ou →) diz **qual bola** jogar e a seta em pé (↑ ou ↓) diz **para onde**; só essa
bola deve ir. A partir do nível 4 aparecem às vezes **duas setas em pé**: as duas bolas vão, cada uma no sentido da sua seta
(mesmo sentido; do nível 5 em diante, também sentidos opostos). A bola vai deslizando o dedo para cima ou para baixo na
metade da mesa, ou tocando no buraco; no computador, **W/S** jogam a bola da esquerda e **↑/↓** a da direita.
Uma barra mostra o tempo de cada comando (de 5 s no nível 1 a 3 s no nível 8, em `NIVEIS_LADOS` no `js/lados.js`) e quanto mais
rápido, mais pontos. Dois acertos seguidos sobem um nível; um erro desce. A rodada tem 20 comandos, e o relatório separa os
erros de lado (esquerda/direita), de direção (cima/baixo), de tempo e de jogar só uma das duas bolas.

## Setas e Cores (atenção, memória e flexibilidade)

Fica em **Psicopedagogia**, baseado na folha de atividades de setas coloridas. Em cima fica a legenda: cada seta tem uma cor
(ex.: roxo = ↑, verde = ↓). No meio aparece uma fila de setas e embaixo as faixas de cores: o aluno troca cada seta pela cor
dela e toca na faixa certa, na mesma ordem (no computador, também pelas teclas 1 a 4). **A cada 3 ou 4 perguntas a legenda
muda** (nenhuma seta fica com a cor de antes), com aviso e os quadrados virando como cartas: o aluno precisa largar as cores
antigas e olhar de novo. Acertar sobe um nível e errar desce um. São 7 níveis, em `NIVEIS_SETAS` no `js/setas.js`: de 1 a 6
setas, só ↑ ↓ ← → no começo e as diagonais ↗ ↙ a partir do nível 3, com 3 faixas para escolher e 4 a partir do nível 4.
As faixas erradas imitam os erros comuns: usar as cores de antes (logo depois da mudança), confundir a seta com a do lado
oposto (↑ com ↓), trocar a ordem e olhar a seta errada. A rodada tem 15 perguntas, e o relatório conta também quantas
vezes as cores mudaram e quantos erros vieram logo depois da mudança.

## De Lado e de Cima (percepção espacial)

Fica em **Psicopedagogia**, baseado na folha de atividades das pirâmides de argolas. Uma pirâmide aparece **vista de lado**
(a peça de baixo é a maior e a de cima é uma bolinha) e o aluno escolhe como ela fica **vista de cima**: anéis um dentro do
outro, com a peça de baixo por fora e a de cima no meio (no computador, também pelas teclas 1 a 4). **De vez em quando o jogo
inverte**: depois de 3 ou 4 perguntas normais, vêm 1 ou 2 ao contrário (mostra o alvo de cima e o aluno acha a pirâmide de
lado), com aviso e a figura virando. As peças caem e quicam ao empilhar e os anéis abrem do centro. Acertar sobe um nível e
errar desce um. São 6 níveis, em `NIVEIS_VISTAS` no `js/vistas.js`: de 2 a 5 peças, 3 opções e depois 4, e nos níveis altos
uma cor pode se repetir (sem ficar encostada). As opções erradas imitam os erros comuns: virar a ordem (pôr a peça de cima
por fora), trocar duas peças vizinhas e errar uma cor. A rodada tem 15 perguntas, e o relatório separa os acertos de cada
sentido (de lado para de cima e de cima para de lado) e conta quantas vezes o aluno virou a ordem.

## Peso Certo (medidas de massa)

Balança de dois pratos: o objeto fica no prato da esquerda e o aluno coloca no da direita (tocando ou arrastando) os pesos
que acha que equilibram o objeto e toca em **⚖️ Testar**. Até o teste a balança fica travada e reta (🔒), sem dar pista.
No teste ela destrava: se equilibrou, aparece a conta (ex.: `1 dg + 5 cg + 5 cg = 200 mg`); se faltou ou passou,
perde 1 de 3 vidas, vê para que lado a balança pendeu e pode ajustar os pesos e testar de novo. Os pesos ficam em
prateleiras com plaquinhas de valor, o tamanho de cada peso acompanha o quanto ele pesa, e tocar num peso do prato o devolve.
Níveis escolhidos no menu: Fácil (kg e g), Médio (g, dag e hg) e Difícil (mg, cg e dg, às vezes em g com vírgula).
O estoque tem de 6 a 8 pesos e sempre uma combinação exata. O botão "📏 Tabela" mostra a escada de conversão, e o
relatório diz quantas vezes ela foi usada. Sprites desenhados por `ferramentas/balanca-sprites.py` (em `assets/balanca/`).

## Tiro Certo (ângulos)

O círculo é um transferidor: 0° à esquerda (onde fica o canhão), 90° em cima, 180° à direita e 270° embaixo.
Um míssil de cada vez entra pela borda numa marca de ângulo e voa em linha reta até o canhão. O aluno escolhe
entre 4 ângulos (no computador, também pelas teclas 1 a 4); o canhão mira naquela marca e só o ângulo por onde
o míssil entrou o derruba. Começa com 4 tiros e cada acerto vale +1 tiro. A partida acaba quando os tiros acabam,
quando um míssil chega ao canhão ou depois de 20 mísseis. Os níveis (1 a 5) usam ângulos de 90°, 45°, 30°, 15° e 10°:
acertar de primeira sobe um nível, errar desce. As opções erradas são ângulos vizinhos e o espelhado (360° − x).
Os sprites em pixel art são desenhados por `ferramentas/tiro-sprites.py` (gravam em `assets/tiro/`).

## Chuva de Matemática

O aluno escolhe as operações (adição, subtração, multiplicação, divisão). Uma conta cai de cada vez e ele toca
na resposta certa entre 4 opções (no computador, também pelas teclas 1 a 4) antes que ela chegue ao chão.
Cada acerto sobe um nível (de 1 a 10: números e tabuadas maiores) e cada erro ou conta que cai desce um.
Contas mais difíceis caem mais devagar (de 7 a 12 s). A rodada tem 20 contas e termina com estrelas, pontos,
nível alcançado e o relatório (PDF e e-mail) com as contas para revisar, agrupadas por operação.
As faixas de números de cada nível estão em `FAIXAS` e `FATORES` no `js/matematica.js`.

## Chuva de Erros

As palavras caem na tela e o aluno toca só nas escritas **certas** ou só nas **erradas** (ele escolhe antes).
Cada palavra fica de 2 a 5 segundos na tela: quanto mais rápido o aluno pega, mais rápido elas caem;
quando ele erra ou deixa passar, a chuva fica mais lenta. Cada rodada tem até 30 palavras, metade certa e metade errada,
de uma categoria ou de todas. No fim aparecem estrelas, pontos e o mesmo relatório (PDF e e-mail) das missões.

As palavras estão em `CHUVA_CATEGORIAS` no `dados.js`, como pares `['jeito certo', 'jeito errado']`.
Ficaram de fora os pares em que o "errado" também é uma palavra que existe (caro/carro, ora, pais...) e as
palavras que só se decidem dentro de uma frase (mas/mais, mau/mal, onde/aonde, porque/por que...).

## Jogo de Ortografia: níveis

O aluno escolhe só o nível (as missões por regra não aparecem mais); cada rodada tem 20 perguntas misturando regras:

- **Fácil:** as palavras com figura das missões abaixo (completar a letra, acentos e Detetive de Erros).
- **Médio:** as palavras da Chuva de Erros do dia a dia (S/SS/C/Ç/Z, G/J, X/CH, R/RR, M antes de P e B, H, acentos).
- **Difícil:** as palavras da escola, as difíceis e as palavras longas (10 letras ou mais) da Chuva de Erros.

No Médio e no Difícil cada par da Chuva vira "qual é o jeito certo?" ou o Detetive (achar a palavra errada entre três).
As estrelas ficam por nível. As palavras do Fácil estão em `MISSOES`, as do Médio e do Difícil em `CHUVA_CATEGORIAS` (`dados.js`).

### Palavras do nível Fácil

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
  desligada por enquanto; para voltar a pedir, troque `PEDIR_SENHA` para `true` no `js/estado.js`
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
- `js/` — o código do jogo, em módulos ES (carregados por `<script type="module" src="js/main.js">`, sem build):
  - `main.js` — ponto de entrada: carrega os módulos, botão de instalar o app e primeira tela
  - `util.js` — ajudantes (`$`, sortear, embaralhar, texto seguro para HTML)
  - `estado.js` — o aluno, as estrelas salvas no aparelho e a partida em andamento (`missao`, `resultados`);
    os outros módulos trocam essas variáveis pelas funções `definirAluno`, `definirMissao`, `definirResultados`...
  - `som.js` — sons e voz (gravações em `audio/` ou a voz do aparelho)
  - `telas.js` — telas e navegação: moldura, Plenix, troca de telas, encaixe na tela, login, menu, barra inferior e filtro dos jogos
  - `professor.js` — área do professor e planilha: e-mails do relatório, questionários, links dos jogos, leitura de CSV/XLSX
  - `relatorio.js` — fim do jogo: textos, gráficos, envio por e-mail (com fila sem internet), confete e PDF
  - um arquivo por jogo: `ortografia.js`, `chuva.js` (Chuva de Erros), `matematica.js` (Chuva de Matemática), `tiro.js`,
    `peso.js`, `quiz.js` (questionário do aluno), `luzes.js` (Jogo do Reflexo 1 e 2), `rotina.js`, `fichas.js`,
    `cores.js` (Somando as Cores), `lados.js` (Esquerda e Direita), `setas.js` (Setas e Cores) e `vistas.js` (De Lado e de Cima). Cada um tem as telas `telaXMenu`, `comecarX`, `pararX`
    e liga os próprios botões (ids com o prefixo do jogo, ex.: `cores-`, `lados-`)
  - os imports levam o mesmo `?v=` do `index.html` (o `ferramentas/versao.ps1` troca todos); ao criar um módulo novo,
    ponha-o também na lista `ARQUIVOS` do `service-worker.js`
- `dados.js` — banco de palavras e regras de cada missão (fácil de aumentar)
- `plenix.js` + `assets/plenix/plenix_spritesheet_1x.png` — o Plenix em pixel art (folha 4x4: andando, festejando, triste, pensando), animado no `style.css`
- `assets/plenix/*.gif` — as mesmas animações em GIF (fundo branco), para usar em outros materiais
- `ferramentas/plenix.ps1` — recorta o Plenix comparando as imagens de fundo azul e roxo (em `assets/plenix-original/`)
- `ferramentas/plenix-farda.py` — veste o Plenix com a farda da Rede Estadual (camisa branca, gola azul, faixa amarela, vermelha e azul) a partir de `assets/plenix-original/plenix_spritesheet_original.png`
- `assets/logo-pg.png` — logo da Pedagogia Gamificada (marca do app; recorte redondo de `assets/logo-pg-original.png`)
- `ferramentas/logo.ps1` — recorta o logo e deixa o fundo transparente

Para criar mais perguntas, basta adicionar itens no `dados.js`.

---

© **Davi e Marco** — Todos os direitos reservados.

## App (PWA)

O jogo pode ser instalado no celular (botão **📲 Instalar app** na tela inicial) e funciona offline.
Inclui `manifest.json`, `service-worker.js`, ícones em `icons/` e `privacidade.html` (exigida pela Google Play).

Ao alterar qualquer arquivo do jogo, aumente a versão para os aparelhos baixarem a nova.
O script troca de uma vez a `VERSAO` do `service-worker.js` e o `?v=` dos arquivos no `index.html`,
no `service-worker.js` e nos imports de `js/` (soma 1; para escolher o número, passe-o no fim, ex.: `... versao.ps1 20`):

```
powershell -ExecutionPolicy Bypass -File ferramentas\versao.ps1
```

- `assets/figuras/` — figuras das palavras, recortadas do cartaz por `ferramentas/figuras.ps1`
- `ferramentas/icones.ps1` — gera os ícones do app

## Planilha do professor: e-mails, questionários e relatórios (grátis, com Google Apps Script)

Não há banco de dados: uma planilha do Google guarda tudo, por meio do script `ferramentas/relatorio-email.gs`.

| Aba da planilha | O que guarda |
|---|---|
| **E-mails** | a lista de professores que recebem relatórios: coluna A o nome, coluna B o e-mail (o script cria a aba vazia na primeira vez) |
| **Q: nome** (uma por questionário) | coluna A a pergunta, B a resposta certa, C a E as respostas erradas (a 1ª linha pode ser cabeçalho) |
| **Relatórios** | uma linha por relatório enviado |

Nada de e-mail é cadastrado no app: antes de abrir cada jogo, o aluno escolhe na lista da aba "E-mails" para qual professor
vai o relatório (o aparelho lembra a última escolha). No fim de cada atividade, o relatório vai para esse e-mail,
mesmo que o aluno não baixe o PDF. O script só envia para e-mails que estão na lista.
Na tela inicial, **🧑‍🏫 Área do professor** (senha `app0707`, em `SENHA_PROFESSOR` no `js/professor.js` e no script) mostra
a lista de e-mails, com cadastro e remoção (grava direto na aba "E-mails"), e cria ou exclui questionários (enviando uma planilha `.xlsx`/`.csv` ou digitando as perguntas).
Cada aparelho guarda uma cópia da lista e dos questionários para funcionar sem internet.
Sem internet, o relatório fica numa fila no aparelho e é enviado quando a conexão voltar.
Também dá para criar um questionário direto na planilha: é só criar uma aba com o nome começando por `Q: `.

Para publicar o script (uma vez):

1. Crie uma planilha no Google Drive e abra **Extensões → Apps Script**. Apague o que estiver lá e cole o
   conteúdo de `ferramentas/relatorio-email.gs`.
2. **Implantar → Nova implantação → Tipo: App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**.
   Autorize o acesso ao Gmail e à planilha quando o Google pedir.
3. Copie o endereço do app da Web (termina em `/exec`) e cole em `URL_RELATORIO` no `js/relatorio.js`.
   Rode `ferramentas\versao.ps1` e publique o jogo.

Limite gratuito: cerca de 100 e-mails por dia numa conta Gmail comum (1.500 no Google Workspace).
Ao mudar o script, use **Implantar → Gerenciar implantações → editar → Nova versão** para o endereço continuar o mesmo.

## Publicar na VPS (Dokploy)

O `Dockerfile` monta um nginx que serve o jogo em `/ortografia/`. No Dokploy: Build Type **Dockerfile**,
domínio com path `/ortografia`, **Strip Path desligado**, porta **80** e HTTPS (Let's Encrypt).
