/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Robô Bip: os blocos de programação, os mundos e os níveis (separado da lógica do jogo). */

// Os blocos. cat: a cor (como no Scratch): movimento azul, repetição laranja, condição amarela.
// codigo: como o bloco fica no "Ver código" (estilo Portugol, o português das aulas de programação)
export const BLOCOS = {
  andar: { nome: 'andar', icone: '⬆️', cat: 'movimento', codigo: 'andar()' },
  esq: { nome: 'virar à esquerda', icone: '↩️', cat: 'movimento', codigo: 'virarEsquerda()' },
  dir: { nome: 'virar à direita', icone: '↪️', cat: 'movimento', codigo: 'virarDireita()' },
  repita: { nome: 'repita', icone: '🔁', cat: 'repeticao', codigo: 'para i de 1 ate {n} faca', fim: 'fimpara', container: true },
  enquanto: { nome: 'enquanto', icone: '🔄', cat: 'condicao', codigo: 'enquanto ({cond}) faca', fim: 'fimenquanto', container: true },
};
// as condições do "enquanto" (o Bip olha o tabuleiro antes de cada volta)
export const CONDICOES = {
  naoChegou: { nome: 'não chegar na ⭐', codigo: 'nao chegouNaEstrela()' },
  livre: { nome: 'o caminho à frente estiver livre', codigo: 'caminhoLivre()' },
};

// Os mundos: um conceito novo por mundo. ensina: o que aparece ao terminar um nível do mundo.
// Níveis: o tabuleiro em texto ('.' chão, '#' obstáculo, 'M' moeda, 'F' estrela, 'R' onde o Bip começa),
// dir: para onde ele olha no começo (0 cima, 1 direita, 2 baixo, 3 esquerda), meta: o menor número de blocos
// (é a 2ª estrela), novo: o bloco que aparece pela primeira vez, dica: a ajuda quando o programa dá errado.
export const MUNDOS_BIP = [
  { id: 'bip-1', nome: 'Primeiros passos', icone: '👣', conceito: 'Sequência', blocos: ['andar', 'esq', 'dir'],
    ensina: 'Um programa é uma SEQUÊNCIA de ordens: o robô faz uma de cada vez, na ordem em que estão escritas.',
    niveis: [
      { nome: 'Olá, Bip!', objetivo: 'Leve o Bip até a estrela ⭐.', dir: 1, meta: 4, novo: 'andar',
        grade: ['.....', '.....', 'R...F', '.....', '.....'], dica: 'Conte as casas até a estrela: um ⬆️ andar para cada casa.' },
      { nome: 'A primeira curva', objetivo: 'Ande, vire e chegue à estrela.', dir: 1, meta: 8, novo: 'dir',
        grade: ['#####', 'R..##', '##.##', '##..F', '#####'], dica: 'Quando o caminho dobrar, use ↪️ virar à direita ou ↩️ virar à esquerda. Virar não sai do lugar!' },
      { nome: 'A moeda brilhante', objetivo: 'Passe pela moeda 🪙 e vá até a estrela.', dir: 1, meta: 5,
        grade: ['.....', '.R.M.', '.....', '...F.', '.....'], dica: 'O Bip pega a moeda sozinho quando passa por cima dela.' },
      { nome: 'Zigue-zague', objetivo: 'Siga o caminho entre as pedras.', dir: 1, meta: 9,
        grade: ['R.##.', '#.#F.', '#...#', '#####'], dica: 'Imagine que você é o Bip: para onde você está olhando depois de cada virada?' },
      { nome: 'Duas moedas', objetivo: 'Pegue as duas moedas e chegue à estrela.', dir: 1, meta: 8,
        grade: ['.....', 'R.M..', '#...#', 'F.M..', '.....'], dica: 'Pegue a moeda de cima, desça até a de baixo e depois vá para a estrela.' },
    ] },
  { id: 'bip-2', nome: 'Repetir é mais fácil', icone: '🔁', conceito: 'Repetição', blocos: ['andar', 'esq', 'dir', 'repita'],
    ensina: 'O bloco REPITA faz o mesmo pedaço do programa várias vezes: menos blocos, mesmo resultado.',
    niveis: [
      { nome: 'O corredor comprido', objetivo: 'Chegue à estrela usando só 2 blocos!', dir: 1, meta: 2, novo: 'repita',
        grade: ['########', 'R......F', '########'], dica: 'Coloque um 🔁 repita e, DENTRO dele, um ⬆️ andar. Ajuste o número com o − e o +.' },
      { nome: 'Fila de moedas', objetivo: 'Pegue todas as moedas com poucos blocos.', dir: 1, meta: 2,
        grade: ['.........', 'R.M.M.M.F', '.........'], dica: 'As moedas estão no caminho: é só repetir o andar o número certo de vezes.' },
      { nome: 'O quadrado', objetivo: 'Dê a volta nas pedras até a estrela.', dir: 1, meta: 5,
        grade: ['R...', '.##.', '.##.', 'F...'], dica: 'Repare: "andar, andar, andar, virar" acontece mais de uma vez. Coloque isso dentro de um 🔁 repita.' },
      { nome: 'A escada', objetivo: 'Suba a escada até a estrela.', dir: 1, meta: 5,
        grade: ['####F', '###..', '##..#', '#..##', 'R.###'], dica: 'Cada degrau é: andar, virar à esquerda, andar, virar à direita. Repita o degrau!' },
      { nome: 'Volta das moedas', objetivo: 'Pegue as três moedas e termine na estrela.', dir: 1, meta: 5,
        grade: ['R.M', 'F#.', 'M.M'], dica: '"andar, andar, virar à direita" se repete 3 vezes. Depois, só falta um passo.' },
    ] },
  { id: 'bip-3', nome: 'Enquanto...', icone: '🔄', conceito: 'Enquanto', blocos: ['andar', 'esq', 'dir', 'repita', 'enquanto'],
    ensina: 'O bloco ENQUANTO repete até a condição deixar de ser verdade: o Bip não precisa saber quantas vezes.',
    niveis: [
      { nome: 'Sem contar', objetivo: 'Chegue à estrela sem contar as casas.', dir: 1, meta: 2, novo: 'enquanto',
        grade: ['##########', 'R........F', '##########'], dica: 'Use 🔄 enquanto "não chegar na ⭐" com um ⬆️ andar dentro. O Bip para sozinho!' },
      { nome: 'Até a parede', objetivo: 'Ande até a parede, vire e continue.', dir: 1, meta: 4,
        grade: ['R.....', '#####.', 'F.....'], dica: 'Toque no 🔄 enquanto para trocar a condição para "o caminho à frente estiver livre".' },
      { nome: 'Corredor de moedas', objetivo: 'Pegue as moedas e chegue à estrela.', dir: 1, meta: 2,
        grade: ['###########', 'RM.M.M.M.MF', '###########'], dica: 'Um 🔄 enquanto "não chegar na ⭐" com um ⬆️ andar resolve tudo.' },
      { nome: 'O caracol', objetivo: 'Entre no caracol até a estrela.', dir: 1, meta: 4,
        grade: ['R....', '####.', '..F#.', '.###.', '.....'], dica: 'Dentro de um 🔄 enquanto "não chegar", coloque outro 🔄 enquanto "livre" com andar, e depois um virar à direita.' },
    ] },
];
