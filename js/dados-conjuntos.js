/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Universo dos Conjuntos: os cenários, os objetos e os conjuntos (com o critério de cada um). */

// Cada cenário tem os objetos (sem categoria visível) e os conjuntos com a regra escrita para o aluno.
// A relação é N:N: cada objeto lista as letras dos conjuntos a que pertence (é a tabela objeto × conjunto do projeto).
// `ser` completa a frase "O chinelo ___" / "O chinelo não ___" nas explicações; `notas` explicam os casos que dependem
// do critério (ex.: o pé de pato vai nos pés, mas aqui não é calçado). Para um cenário novo, basta acrescentar aqui.
// Objeto: id, nome, g ('o' ou 'a', para "o chinelo"/"a bola"), emoji ou svg (viewBox 0 0 64 64), em (letras dos conjuntos).
const T = 'stroke="#13294b" stroke-width="3" stroke-linejoin="round"';
const SVG = {
  pePato: `<path d="M25 6h14l3 16 13 32-11-4-6 7-6-7-6 7-6-7-11 4 13-32z" fill="#ffb300" ${T}/><path d="M32 30v24M24 34l-4 16M40 34l4 16" stroke="#c77c00" stroke-width="2"/>`,
  toalha: `<rect x="12" y="6" width="40" height="52" rx="5" fill="#fff" ${T}/><path d="M14 18h36M14 30h36M14 42h36" stroke="#1e88e5" stroke-width="6"/>`,
  pa: `<rect x="29" y="3" width="7" height="30" rx="3" fill="#8d6e63" ${T}/><path d="M17 31h30l-4 20a11 11 0 0 1-22 0z" fill="#e53935" ${T}/>`,
  tabua: `<rect x="6" y="14" width="42" height="38" rx="8" fill="#d69a62" ${T}/><rect x="46" y="27" width="13" height="12" rx="6" fill="#d69a62" ${T}/><circle cx="53" cy="33" r="2.5" fill="#13294b"/>`,
};

export const CENARIOS = [
  {
    id: 'praia', nome: 'Praia', icone: '🏖️', cor: '#0a8fb8', fundo: 'linear-gradient(180deg, #8fd8f5 0%, #8fd8f5 26%, #3fb4dc 26%, #3fb4dc 34%, #f9e3a7 34%, #f3d58a 100%)',
    descricao: 'Um dia na praia · 11 objetos · 5 conjuntos',
    conjuntos: [
      { s: 'A', nome: 'Calçados', icone: '👟', cor: '#e5484d', ser: 'é calçado', regra: 'Objetos feitos para usar nos pés como calçado: chinelos, tênis, sandálias e sapatos.' },
      { s: 'B', nome: 'Brinquedos', icone: '🧸', cor: '#7b4fc9', ser: 'é brinquedo', regra: 'Objetos cuja função principal, neste cenário, é brincar ou jogar.' },
      { s: 'C', nome: 'Itens de praia', icone: '🏝️', cor: '#e5731f', ser: 'é item de praia', regra: 'Objetos que podem ser levados para aproveitar um dia comum na praia.' },
      { s: 'D', nome: 'Natação e mergulho', icone: '🏊', cor: '#1e64d2', ser: 'é de natação ou mergulho', regra: 'Objetos usados para nadar, flutuar ou olhar debaixo d’água.' },
      { s: 'E', nome: 'Proteção solar', icone: '☀️', cor: '#c99700', ser: 'protege do sol', regra: 'Objetos que protegem o corpo ou os olhos do sol.' },
    ],
    objetos: [
      { id: 'chinelo', nome: 'chinelo', g: 'o', emoji: '🩴', em: 'AC' },
      { id: 'pe-de-pato', nome: 'pé de pato', g: 'o', svg: SVG.pePato, em: 'CD' },
      { id: 'bola', nome: 'bola', g: 'a', emoji: '🏐', em: 'BC' },
      { id: 'boia', nome: 'boia', g: 'a', emoji: '🛟', em: 'CD' },
      { id: 'oculos', nome: 'óculos de sol', g: 'os', emoji: '🕶️', em: 'CE' },
      { id: 'toalha', nome: 'toalha', g: 'a', svg: SVG.toalha, em: 'C' },
      { id: 'protetor', nome: 'protetor solar', g: 'o', emoji: '🧴', em: 'CE' },
      { id: 'guarda-sol', nome: 'guarda-sol', g: 'o', emoji: '⛱️', em: 'CE' },
      { id: 'balde', nome: 'balde', g: 'o', emoji: '🪣', em: 'BC' },
      { id: 'pa', nome: 'pá de areia', g: 'a', svg: SVG.pa, em: 'BC' },
      { id: 'mascara', nome: 'máscara de mergulho', g: 'a', emoji: '🤿', em: 'CD' },
    ],
    notas: {
      'pe-de-pato:A': 'O pé de pato vai nos pés, mas aqui ele é equipamento de natação, não calçado comum.',
      'boia:B': 'Nesta praia, a boia é equipamento de flutuação, não brinquedo. Com outra regra, poderia ser brinquedo aquático.',
    },
  },
  {
    id: 'escola', nome: 'Escola', icone: '🏫', cor: '#2e7d32', fundo: 'linear-gradient(180deg, #2f5d46 0%, #2f5d46 22%, #c8a26b 22%, #e9d3a8 100%)',
    descricao: 'Material escolar · 12 objetos · 4 conjuntos',
    conjuntos: [
      { s: 'A', nome: 'Riscam o papel', icone: '✍️', cor: '#e5484d', ser: 'risca o papel', regra: 'Objetos que deixam marca no papel quando você passa a ponta: servem para escrever ou desenhar.' },
      { s: 'B', nome: 'Para colorir', icone: '🎨', cor: '#7b4fc9', ser: 'serve para colorir', regra: 'Objetos usados para pintar ou colorir um desenho. Neste jogo, a caneta é de escrever.' },
      { s: 'C', nome: 'Feitos de papel', icone: '📄', cor: '#1e64d2', ser: 'é feito de papel', regra: 'Objetos feitos de papel: folhas, cadernos e livros.' },
      { s: 'D', nome: 'Cortar, medir ou prender', icone: '🛠️', cor: '#e5731f', ser: 'serve para cortar, medir ou prender', regra: 'Ferramentas usadas para cortar, medir ou prender papéis.' },
    ],
    objetos: [
      { id: 'lapis', nome: 'lápis de cor', g: 'o', emoji: '✏️', em: 'AB' },
      { id: 'caneta', nome: 'caneta', g: 'a', emoji: '🖊️', em: 'A' },
      { id: 'giz', nome: 'giz de cera', g: 'o', emoji: '🖍️', em: 'AB' },
      { id: 'pincel', nome: 'pincel', g: 'o', emoji: '🖌️', em: 'AB' },
      { id: 'regua', nome: 'régua', g: 'a', emoji: '📏', em: 'D' },
      { id: 'tesoura', nome: 'tesoura', g: 'a', emoji: '✂️', em: 'D' },
      { id: 'caderno', nome: 'caderno', g: 'o', emoji: '📓', em: 'C' },
      { id: 'livro', nome: 'livro', g: 'o', emoji: '📕', em: 'C' },
      { id: 'folha', nome: 'folha', g: 'a', emoji: '📄', em: 'C' },
      { id: 'mochila', nome: 'mochila', g: 'a', emoji: '🎒', em: '' },
      { id: 'clipe', nome: 'clipe', g: 'o', emoji: '📎', em: 'D' },
      { id: 'tachinha', nome: 'tachinha', g: 'a', emoji: '📌', em: 'D' },
    ],
    notas: {
      'caneta:B': 'A caneta risca o papel, mas neste jogo ela é de escrever, não de colorir.',
      'mochila:A': 'A mochila guarda o material, mas não está em nenhum destes conjuntos.',
    },
  },
  {
    id: 'cozinha', nome: 'Cozinha', icone: '🍳', cor: '#c2185b', fundo: 'linear-gradient(180deg, #fde7ef 0%, #fde7ef 30%, #f5f5f5 30%, #e0e0e0 100%)',
    descricao: 'Utensílios de cozinha · 12 objetos · 5 conjuntos',
    conjuntos: [
      { s: 'A', nome: 'Recipientes', icone: '🫙', cor: '#1e64d2', ser: 'é recipiente', regra: 'Objetos com um espaço para pôr comida ou bebida dentro.' },
      { s: 'B', nome: 'Para cortar', icone: '🔪', cor: '#e5484d', ser: 'é usado para cortar', regra: 'Objetos usados para cortar alimentos: a faca corta e a tábua apoia o corte.' },
      { s: 'C', nome: 'Preparo', icone: '👩‍🍳', cor: '#e5731f', ser: 'é usado no preparo', regra: 'Objetos usados para preparar a comida antes de servir (cortar, mexer, cozinhar).' },
      { s: 'D', nome: 'Vão à mesa', icone: '🍽️', cor: '#2e7d32', ser: 'vai à mesa', regra: 'Objetos que ficam na mesa quando a família come. A panela fica no fogão.' },
      { s: 'E', nome: 'Vão ao fogo', icone: '🔥', cor: '#c99700', ser: 'vai ao fogo', regra: 'Objetos que podem ir ao fogo do fogão.' },
    ],
    objetos: [
      { id: 'faca', nome: 'faca', g: 'a', emoji: '🔪', em: 'BCD' },
      { id: 'colher', nome: 'colher', g: 'a', emoji: '🥄', em: 'CD' },
      { id: 'garfo', nome: 'garfo', g: 'o', emoji: '🍴', em: 'D' },
      { id: 'tabua', nome: 'tábua', g: 'a', svg: SVG.tabua, em: 'BC' },
      { id: 'panela', nome: 'panela', g: 'a', emoji: '🍲', em: 'ACE' },
      { id: 'frigideira', nome: 'frigideira', g: 'a', emoji: '🍳', em: 'ACE' },
      { id: 'xicara', nome: 'xícara', g: 'a', emoji: '☕', em: 'AD' },
      { id: 'prato', nome: 'prato', g: 'o', emoji: '🍽️', em: 'AD' },
      { id: 'tigela', nome: 'tigela', g: 'a', emoji: '🥣', em: 'AD' },
      { id: 'pote', nome: 'pote', g: 'o', emoji: '🫙', em: 'A' },
      { id: 'copo', nome: 'copo', g: 'o', emoji: '🥛', em: 'AD' },
      { id: 'saleiro', nome: 'saleiro', g: 'o', emoji: '🧂', em: 'AD' },
    ],
    notas: {
      'tabua:A': 'A tábua apoia o alimento, mas não tem um espaço para pôr comida dentro.',
      'panela:D': 'Neste jogo, a panela fica no fogão: a comida vai para a mesa no prato ou na tigela.',
      'colher:C': 'A colher serve para mexer a comida (preparo) e também vai à mesa.',
    },
  },
  {
    id: 'esportes', nome: 'Esportes', icone: '🏟️', cor: '#1565c0', fundo: 'linear-gradient(180deg, #bfe3ff 0%, #bfe3ff 24%, #4caf50 24%, #43a047 100%)',
    descricao: 'Quadra e campo · 12 objetos · 5 conjuntos',
    conjuntos: [
      { s: 'A', nome: 'Bolas', icone: '⚽', cor: '#e5731f', ser: 'é bola', regra: 'Bolas de qualquer esporte.' },
      { s: 'B', nome: 'Proteção', icone: '🛡️', cor: '#1e64d2', ser: 'protege o corpo', regra: 'Objetos que protegem alguma parte do corpo durante o esporte.' },
      { s: 'C', nome: 'Vestir ou calçar', icone: '👕', cor: '#7b4fc9', ser: 'é de vestir ou calçar', regra: 'Objetos que a pessoa veste ou calça no corpo para jogar.' },
      { s: 'D', nome: 'Futebol', icone: '🥅', cor: '#2e7d32', ser: 'é próprio do futebol', regra: 'Equipamentos próprios de um jogo de futebol.' },
      { s: 'E', nome: 'Prêmios', icone: '🏆', cor: '#c99700', ser: 'é prêmio', regra: 'O que o time ou o atleta ganha quando vence.' },
    ],
    objetos: [
      { id: 'futebol', nome: 'bola de futebol', g: 'a', emoji: '⚽', em: 'AD' },
      { id: 'basquete', nome: 'bola de basquete', g: 'a', emoji: '🏀', em: 'A' },
      { id: 'volei', nome: 'bola de vôlei', g: 'a', emoji: '🏐', em: 'A' },
      { id: 'bola-tenis', nome: 'bola de tênis', g: 'a', emoji: '🎾', em: 'A' },
      { id: 'raquete', nome: 'raquete', g: 'a', emoji: '🏸', em: '' },
      { id: 'luva-goleiro', nome: 'luva de goleiro', g: 'a', emoji: '🧤', em: 'BCD' },
      { id: 'luva-boxe', nome: 'luva de boxe', g: 'a', emoji: '🥊', em: 'BC' },
      { id: 'capacete', nome: 'capacete', g: 'o', emoji: '⛑️', em: 'BC' },
      { id: 'tenis', nome: 'tênis (calçado)', g: 'o', emoji: '👟', em: 'C' },
      { id: 'gol', nome: 'gol', g: 'o', emoji: '🥅', em: 'D' },
      { id: 'trofeu', nome: 'troféu', g: 'o', emoji: '🏆', em: 'E' },
      { id: 'medalha', nome: 'medalha', g: 'a', emoji: '🥇', em: 'E' },
    ],
    notas: {
      'tenis:B': 'O tênis é calçado, mas neste jogo não conta como equipamento de proteção.',
      'raquete:A': 'A raquete bate na bola, mas não está em nenhum destes conjuntos.',
    },
  },
  {
    id: 'parque', nome: 'Parque', icone: '🌳', cor: '#558b2f', fundo: 'linear-gradient(180deg, #c9ecff 0%, #c9ecff 28%, #9ccc65 28%, #7cb342 100%)',
    descricao: 'Passeio no parque · 12 objetos · 5 conjuntos',
    conjuntos: [
      { s: 'A', nome: 'Têm rodas', icone: '🛞', cor: '#455a64', ser: 'tem rodas', regra: 'Objetos que andam sobre rodas.' },
      { s: 'B', nome: 'Lazer', icone: '🎉', cor: '#e5731f', ser: 'é de lazer', regra: 'Objetos usados para brincar ou passear por diversão no parque.' },
      { s: 'C', nome: 'Seres vivos', icone: '🌱', cor: '#2e7d32', ser: 'é ser vivo', regra: 'Plantas e animais: nascem, crescem e se alimentam.' },
      { s: 'D', nome: 'Ficam no ar', icone: '☁️', cor: '#1e88e5', ser: 'voa ou fica no ar', regra: 'O que voa ou fica no ar, lá no céu.' },
      { s: 'E', nome: 'Parquinho', icone: '🛝', cor: '#c2185b', ser: 'é brinquedo de parquinho', regra: 'Brinquedos presos no chão do parquinho.' },
    ],
    objetos: [
      { id: 'bicicleta', nome: 'bicicleta', g: 'a', emoji: '🚲', em: 'AB' },
      { id: 'patinete', nome: 'patinete', g: 'o', emoji: '🛴', em: 'AB' },
      { id: 'skate', nome: 'skate', g: 'o', emoji: '🛹', em: 'AB' },
      { id: 'onibus', nome: 'ônibus', g: 'o', emoji: '🚌', em: 'A' },
      { id: 'pipa', nome: 'pipa', g: 'a', emoji: '🪁', em: 'BD' },
      { id: 'balao', nome: 'balão', g: 'o', emoji: '🎈', em: 'BD' },
      { id: 'escorregador', nome: 'escorregador', g: 'o', emoji: '🛝', em: 'BE' },
      { id: 'carrossel', nome: 'carrossel', g: 'o', emoji: '🎠', em: 'BE' },
      { id: 'arvore', nome: 'árvore', g: 'a', emoji: '🌳', em: 'C' },
      { id: 'flor', nome: 'flor', g: 'a', emoji: '🌷', em: 'C' },
      { id: 'pato', nome: 'pato', g: 'o', emoji: '🦆', em: 'CD' },
      { id: 'cachorro', nome: 'cachorro', g: 'o', emoji: '🐕', em: 'C' },
    ],
    notas: {
      'onibus:B': 'O ônibus tem rodas, mas leva as pessoas ao parque: aqui não é de lazer.',
      'pato:D': 'O pato é ser vivo e também voa: por isso está nos dois conjuntos.',
    },
  },
];
