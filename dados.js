/* Banco de palavras das missões.
   tipo 'completar': mostra a palavra com uma lacuna (_) e a criança escolhe a letra certa.
   tipo 'escolher':  mostra as formas de escrever e a criança escolhe a certa (acentos).
   tipo 'detetive':  três palavras, uma está errada: a criança acha o "monstro". */
const MISSOES = [
  {
    id: 's-ss', titulo: 'S ou SS?', icone: '🐍', cor: '#0095d9', tipo: 'completar', opcoes: ['S', 'SS'],
    regra: 'Um <b>S</b> sozinho entre duas vogais fica fraquinho e faz som de <b>Z</b>: ca<b>s</b>a, me<b>s</b>a. Para o som forte de S entre vogais, use dois: o<b>ss</b>o, ma<b>ss</b>a. E nenhuma palavra começa com SS!',
    perguntas: [
      { molde: 'ca_a', resp: 'S', fig: '🏠' }, { molde: 'me_a', resp: 'S', fig: '🪑' },
      { molde: 'ro_a', resp: 'S', fig: '🌹' }, { molde: 'va_o', resp: 'S', fig: '🏺' },
      { molde: 'cami_a', resp: 'S', fig: '👕' }, { molde: 'o_o', resp: 'SS', fig: '🦴' },
      { molde: 'ma_a', resp: 'SS', fig: '🍝' }, { molde: 'pá_aro', resp: 'SS', fig: '🐦' },
      { molde: 'pe_oa', resp: 'SS', fig: '🧍' }, { molde: 'a_ado', resp: 'SS', fig: '🍗' },
    ],
  },
  {
    id: 'c-cedilha', titulo: 'Ç ou C?', icone: '🤡', cor: '#e53935', tipo: 'completar', opcoes: ['Ç', 'C'],
    regra: 'O <b>Ç</b> só anda de mãos dadas com <b>A, O e U</b>: palha<b>ç</b>o, a<b>ç</b>úcar, cabe<b>ç</b>a. Com <b>E e I</b> usamos o C normal: <b>c</b>edo, <b>c</b>irco. Nenhuma palavra começa com Ç!',
    perguntas: [
      { molde: 'palha_o', resp: 'Ç', fig: '🤡' }, { molde: 'a_úcar', resp: 'Ç', fig: '🍬' },
      { molde: 'cabe_a', resp: 'Ç', fig: '🙂' }, { molde: 'for_a', resp: 'Ç', fig: '💪' },
      { molde: 'cora_ão', resp: 'Ç', fig: '❤️' }, { molde: 'ma_ã', resp: 'Ç', fig: '🍎' },
      { molde: '_irco', resp: 'C', fig: '🎪' }, { molde: '_edo', resp: 'C', fig: '🌅' },
      { molde: '_ebola', resp: 'C', fig: '🧅' }, { molde: '_inema', resp: 'C', fig: '🎬' },
    ],
  },
  {
    id: 'r-rr', titulo: 'R ou RR?', icone: '🐶', cor: '#e0a100', tipo: 'completar', opcoes: ['R', 'RR'],
    regra: 'Um <b>R</b> sozinho entre vogais faz a língua tremer: ara<b>r</b>a, jaca<b>r</b>é. Dois <b>RR</b> juntinhos fazem o som forte: cacho<b>rr</b>o, te<b>rr</b>a. Nenhuma palavra começa com RR!',
    perguntas: [
      { molde: 'cacho_o', resp: 'RR', fig: '🐶' }, { molde: 'ca_o', resp: 'RR', fig: '🚗' },
      { molde: 'te_a', resp: 'RR', fig: '🌍' }, { molde: 'ga_afa', resp: 'RR', fig: '🍾' },
      { molde: 'to_e', resp: 'RR', fig: '🗼' }, { molde: 'a_ara', resp: 'R', fig: '🦜' },
      { molde: 'jaca_é', resp: 'R', fig: '🐊' }, { molde: 'pe_a', resp: 'R', fig: '🍐' },
      { molde: 'ba_ata', resp: 'R', fig: '🪳' }, { molde: 'pi_ulito', resp: 'R', fig: '🍭' },
    ],
  },
  {
    id: 'm-n', titulo: 'M ou N?', icone: '🥁', cor: '#1e4fb8', tipo: 'completar', opcoes: ['M', 'N'],
    regra: '<b>Antes de P e B, só M no meu coração!</b> Ta<b>m</b>bor, ca<b>m</b>po. Antes das outras letras, usamos o <b>N</b>: de<b>n</b>te, ve<b>n</b>to.',
    perguntas: [
      { molde: 'ta_bor', resp: 'M', fig: '🥁' }, { molde: 'ca_po', resp: 'M', fig: '🌾' },
      { molde: 'po_ba', resp: 'M', fig: '🕊️' }, { molde: 'lâ_pada', resp: 'M', fig: '💡' },
      { molde: 'sa_ba', resp: 'M', fig: '💃' }, { molde: 'de_te', resp: 'N', fig: '🦷' },
      { molde: 've_to', resp: 'N', fig: '🌬️' }, { molde: 'mo_tanha', resp: 'N', fig: '⛰️' },
      { molde: 'pa_da', resp: 'N', fig: '🐼' }, { molde: 'ba_co', resp: 'N', fig: '🪑' },
    ],
  },
  {
    id: 'g-j', titulo: 'G ou J?', icone: '🦒', cor: '#c62828', tipo: 'completar', opcoes: ['G', 'J'],
    regra: 'Com <b>A, O e U</b>, o G tem som de "guê": <b>g</b>ato. Com <b>E e I</b>, o G pode ter som de "jê": <b>g</b>elo, <b>g</b>irafa. Mas o <b>J</b> também aparece: <b>j</b>anela, <b>j</b>iboia. Na dúvida, lembre da palavra que você já viu escrita!',
    perguntas: [
      { molde: '_irafa', resp: 'G', fig: '🦒' }, { molde: '_elo', resp: 'G', fig: '🧊' },
      { molde: '_ato', resp: 'G', fig: '🐱' }, { molde: '_irassol', resp: 'G', fig: '🌻' },
      { molde: '_ente', resp: 'G', fig: '👨‍👩‍👧' }, { molde: '_anela', resp: 'J', fig: '🪟' },
      { molde: '_acaré', resp: 'J', fig: '🐊' }, { molde: '_oaninha', resp: 'J', fig: '🐞' },
      { molde: 'laran_a', resp: 'J', fig: '🍊' }, { molde: '_iboia', resp: 'J', fig: '🐍' },
    ],
  },
  {
    id: 'x-ch', titulo: 'X ou CH?', icone: '☕', cor: '#0b3d91', tipo: 'completar', opcoes: ['X', 'CH'],
    regra: '<b>X</b> e <b>CH</b> podem ter o mesmo som: <b>ch</b>uva e <b>x</b>ícara. Uma dica que ajuda muito: depois de <b>ai, ei, ou</b>, quase sempre é <b>X</b>: cai<b>x</b>a, pei<b>x</b>e.',
    perguntas: [
      { molde: '_uva', resp: 'CH', fig: '🌧️' }, { molde: '_ave', resp: 'CH', fig: '🔑' },
      { molde: '_apéu', resp: 'CH', fig: '🎩' }, { molde: '_ocolate', resp: 'CH', fig: '🍫' },
      { molde: 'bola_a', resp: 'CH', fig: '🍪' }, { molde: '_ícara', resp: 'X', fig: '☕' },
      { molde: 'abaca_i', resp: 'X', fig: '🍍' }, { molde: 'pei_e', resp: 'X', fig: '🐟' },
      { molde: 'bru_a', resp: 'X', fig: '🧙' }, { molde: 'cai_a', resp: 'X', fig: '📦' },
    ],
  },
  {
    id: 'acentos', titulo: 'Acentos e til', icone: '🍞', cor: '#0a8fc2', tipo: 'escolher',
    regra: 'O <b>til (~)</b> deixa o som "pelo nariz": p<b>ã</b>o, m<b>ã</b>o. O <b>acento</b> muda o som da vogal: av<b>ó</b> (a vovó) e av<b>ô</b> (o vovô) são pessoas diferentes! Sem eles, a palavra fica errada.',
    perguntas: [
      { opcoes: ['pão', 'pao'], resp: 'pão', fig: '🍞' }, { opcoes: ['mão', 'mao'], resp: 'mão', fig: '✋' },
      { opcoes: ['avó', 'avô', 'avo'], resp: 'avó', fig: '👵' }, { opcoes: ['avô', 'avó', 'avo'], resp: 'avô', fig: '👴' },
      { opcoes: ['café', 'cafe'], resp: 'café', fig: '☕' }, { opcoes: ['limão', 'limao'], resp: 'limão', fig: '🍋' },
      { opcoes: ['pé', 'pe'], resp: 'pé', fig: '🦶' }, { opcoes: ['sofá', 'sofa'], resp: 'sofá', fig: '🛋️' },
      { opcoes: ['ônibus', 'onibus'], resp: 'ônibus', fig: '🚌' }, { opcoes: ['balão', 'balao'], resp: 'balão', fig: '🎈' },
    ],
  },
  {
    id: 'detetive', titulo: 'Detetive de Erros', icone: '🔍', cor: '#e07b00', tipo: 'detetive',
    regra: 'Caça aos <b>monstros da escrita</b>! Em cada rodada, uma palavra está escrita errada. Lembre: nenhuma palavra começa com <b>SS, Ç ou RR</b>, e antes de <b>P e B</b> vem <b>M</b>. Ache o monstro!',
    perguntas: [
      { palavras: ['mesa', 'osso', 'ssapo'], errada: 'ssapo', certa: 'sapo', dica: 'Nenhuma palavra começa com SS!' },
      { palavras: ['circo', 'çapato', 'palhaço'], errada: 'çapato', certa: 'sapato', dica: 'Nenhuma palavra começa com Ç!' },
      { palavras: ['rrato', 'terra', 'arara'], errada: 'rrato', certa: 'rato', dica: 'Nenhuma palavra começa com RR!' },
      { palavras: ['tanbor', 'campo', 'vento'], errada: 'tanbor', certa: 'tambor', dica: 'Antes de P e B, só M!' },
      { palavras: ['gato', 'jelo', 'janela'], errada: 'jelo', certa: 'gelo', dica: 'Gelo se escreve com G.' },
      { palavras: ['rosa', 'kaza', 'vaso'], errada: 'kaza', certa: 'casa', dica: 'Casa começa com C, e o S entre vogais tem som de Z.' },
      { palavras: ['cachoro', 'carro', 'torre'], errada: 'cachoro', certa: 'cachorro', dica: 'Para o som forte de R entre vogais, use RR!' },
      { palavras: ['cedo', 'çebola', 'cabeça'], errada: 'çebola', certa: 'cebola', dica: 'Com E e I usamos C, não Ç.' },
      { palavras: ['xuva', 'peixe', 'chave'], errada: 'xuva', certa: 'chuva', dica: 'Chuva se escreve com CH.' },
      { palavras: ['mão', 'pao', 'café'], errada: 'pao', certa: 'pão', dica: 'Faltou o til (~)!' },
    ],
  },
];

const ELOGIOS = ['Muito bem!', 'Isso aí!', 'Mandou bem!', 'Arrasou!', 'Perfeito!', 'Show de bola!', 'Acertou!'];

// Figuras do cartaz (assets/figuras/<missao>-<n>.jpg), na mesma ordem das perguntas acima.
// A figura do "_uva" (chuva) no cartaz é um cacho de uvas e confundiria a criança: fica a nuvem.
const SEM_FIGURA = ['x-ch-0'];
for (const m of MISSOES) {
  if (!['c-cedilha', 'r-rr', 'm-n', 'g-j', 'x-ch', 'acentos'].includes(m.id)) continue;
  m.perguntas.forEach((p, i) => {
    if (!SEM_FIGURA.includes(`${m.id}-${i}`)) p.img = `assets/figuras/${m.id}-${i}.jpg`;
  });
}

/* Chuva de Erros: pares [jeito certo, jeito errado]. As palavras caem na tela e o aluno toca
   só nas certas ou só nas erradas. Ficaram de fora os pares em que o "errado" também é uma
   palavra que existe (caro/carro, coreto, ora, país/pais, viajem, fero, aros) e as palavras
   que só se decidem numa frase (mas/mais, mau/mal, há/a, onde/aonde, porque, sessão/seção...). */
const CHUVA_CATEGORIAS = [
  {
    id: 's-z', titulo: 'S, SS, C, Ç e Z', icone: '🐍', cor: '#0095d9',
    regra: 'Um <b>S</b> entre vogais tem som de <b>Z</b>: ca<b>s</b>a, avi<b>s</b>o. Para o som forte, usamos <b>SS, C ou Ç</b>: pa<b>ss</b>eio, <b>c</b>idade, a<b>ç</b>úcar. Na dúvida, lembre da palavra escrita!',
    pares: [['casa', 'caza'], ['certeza', 'certesa'], ['cidade', 'sidade'], ['açúcar', 'asúcar'], ['necessário', 'nescessário'],
      ['exceção', 'excessão'], ['assunto', 'asunto'], ['passeio', 'paceio'], ['profissão', 'profisão'], ['pesquisa', 'pesquiza'],
      ['análise', 'analize'], ['aviso', 'avizo'], ['princesa', 'princeza'], ['beleza', 'belesa'], ['natureza', 'naturesa'],
      ['começar', 'comesar'], ['cansaço', 'cansasso'], ['doce', 'dosse'], ['crescer', 'crecer'], ['desenho', 'dezenho']],
  },
  {
    id: 'g-j', titulo: 'G e J', icone: '🦒', cor: '#c62828',
    regra: 'Antes de <b>E e I</b>, o G e o J podem ter o mesmo som: <b>g</b>entil, <b>j</b>eito. Palavras com <b>-agem</b> e <b>-ugem</b> usam G (viagem, ferrugem); os verbos com <b>-jar</b> usam J (viajar).',
    pares: [['jeito', 'geito'], ['viajar', 'viagar'], ['garagem', 'garage'], ['tigela', 'tijela'], ['berinjela', 'beringela'],
      ['laranjeira', 'larangeira'], ['ferrugem', 'ferrujem'], ['coragem', 'corajem'], ['gentil', 'jentil'], ['ginástica', 'jinástica'],
      ['relógio', 'relójio'], ['sujeira', 'sugeira'], ['girafa', 'jirafa'], ['jiboia', 'giboia'], ['fugir', 'fujir'],
      ['injeção', 'ingeção'], ['objetivo', 'obgetivo'], ['rejeitar', 'regeitar'], ['proteger', 'protejer']],
  },
  {
    id: 'x-ch', titulo: 'X e CH', icone: '☕', cor: '#0b3d91',
    regra: '<b>X</b> e <b>CH</b> podem ter o mesmo som. Depois de <b>EN</b> no começo, quase sempre é X (<b>enx</b>ergar, <b>enx</b>ame), menos nas palavras que vêm de cheio e charco (enchente, encharcar). Depois de <b>ai, ei, ou</b>, também é X: abai<b>x</b>ar.',
    pares: [['enxergar', 'enchergar'], ['enxame', 'enchame'], ['enchente', 'enxente'], ['chuchu', 'xuxu'], ['chuva', 'xuva'],
      ['chave', 'xave'], ['mexer', 'mecher'], ['mexido', 'mechido'], ['xícara', 'chícara'], ['lagartixa', 'lagarticha'],
      ['cachorro', 'caxorro'], ['pechincha', 'pechicha'], ['flecha', 'flexa'], ['encharcar', 'enxarcar'], ['faxina', 'fachina'],
      ['puxar', 'puchar'], ['cochilo', 'coxilo'], ['mochila', 'moxila'], ['cheiro', 'xeiro'], ['abaixar', 'abaichar']],
  },
  {
    id: 'r-rr', titulo: 'R e RR', icone: '🐶', cor: '#e0a100',
    regra: 'Um <b>R</b> sozinho entre vogais é fraquinho: ba<b>r</b>ata. Para o som forte entre vogais, use <b>RR</b>: te<b>rr</b>a, ga<b>rr</b>afa.',
    pares: [['barata', 'barrata'], ['cachorro', 'cachoro'], ['terra', 'tera'], ['corrida', 'corida'], ['arrumar', 'arumar'],
      ['garrafa', 'garafa'], ['borracha', 'boraxa'], ['carreira', 'careira'], ['barriga', 'bariga'], ['sorriso', 'soriso'],
      ['arroz', 'aroz'], ['socorro', 'socoro'], ['correr', 'corer'], ['terreno', 'tereno'], ['irregular', 'iregular'], ['guerra', 'guera']],
  },
  {
    id: 'm-n', titulo: 'M antes de P e B', icone: '🥁', cor: '#1e4fb8',
    regra: '<b>Antes de P e B, só M!</b> ta<b>m</b>bém, se<b>m</b>pre, so<b>m</b>bra. Antes das outras letras, usamos <b>N</b>: e<b>n</b>quanto, mu<b>n</b>do.',
    pares: [['também', 'tanbém'], ['sempre', 'senpre'], ['campo', 'canpo'], ['bombeiro', 'bonbeiro'], ['emprego', 'enprego'],
      ['limpeza', 'linpeza'], ['comprar', 'conprar'], ['importante', 'inportante'], ['embora', 'enbora'], ['tempo', 'tenpo'],
      ['lâmpada', 'lanpada'], ['sombra', 'sonbra'], ['ambulância', 'anbulância'], ['computador', 'conputador'], ['brinquedo', 'brimquedo'],
      ['amendoim', 'amendoin'], ['ninguém', 'ninguem'], ['mundo', 'mumdo'], ['enquanto', 'enquando'], ['atenção', 'atensão']],
  },
  {
    id: 'h', titulo: 'H inicial', icone: '🏠', cor: '#0a8fc2',
    regra: 'O <b>H</b> no começo da palavra não tem som, mas faz parte dela: <b>h</b>oje, <b>h</b>istória, <b>h</b>ospital. É preciso lembrar como a palavra é escrita!',
    pares: [['hoje', 'oje'], ['homem', 'omem'], ['história', 'istória'], ['hospital', 'ospital'], ['humano', 'umano'],
      ['herói', 'erói'], ['higiene', 'igiene'], ['habilidade', 'abilidade'], ['honesto', 'onesto'], ['hábito', 'ábito'],
      ['herança', 'erança'], ['horário', 'orário'], ['horta', 'orta'], ['horizonte', 'orizonte'], ['humilde', 'umilde'],
      ['hóspede', 'óspede'], ['hipótese', 'ipótese'], ['helicóptero', 'elicóptero'], ['harmonia', 'armonia']],
  },
  {
    id: 'acentos', titulo: 'Acentuação', icone: '🍞', cor: '#e53935',
    regra: 'O <b>acento</b> faz parte da palavra e muda o som da vogal: voc<b>ê</b>, l<b>á</b>pis, <b>ô</b>nibus. Sem ele, a palavra fica errada.',
    pares: [['você', 'voce'], ['avó', 'avo'], ['avô', 'avo'], ['pássaro', 'passaro'], ['médico', 'medico'],
      ['lápis', 'lapis'], ['fácil', 'facil'], ['difícil', 'dificil'], ['ônibus', 'onibus'], ['último', 'ultimo'],
      ['também', 'tambem'], ['ninguém', 'ninguem'], ['português', 'portugues'], ['matemática', 'matematica'], ['ciência', 'ciencia'],
      ['família', 'familia'], ['água', 'agua'], ['saúde', 'saude'], ['herói', 'heroi']],
  },
  {
    id: 'escola', titulo: 'Palavras da escola', icone: '🎒', cor: '#2e7d32',
    regra: 'Palavras que usamos todo dia na escola: profe<b>ss</b>or, <b>c</b>aderno, exer<b>c</b>ício. Olhe bem cada letra e cada acento!',
    pares: [['professor', 'profesor'], ['aluno', 'alúno'], ['escola', 'iscola'], ['caderno', 'quaderno'], ['lousa', 'louza'],
      ['caneta', 'canetta'], ['borracha', 'boraxa'], ['biblioteca', 'bibliotéca'], ['exercício', 'exercicio'], ['matéria', 'materia'],
      ['aprendizagem', 'aprendisagem'], ['conhecimento', 'conhicimento'], ['disciplina', 'diciplina'], ['educação', 'educasão'], ['português', 'portugês'],
      ['geografia', 'geográfia'], ['história', 'istoria'], ['ciências', 'ciencias'], ['interpretação', 'enterpretação'], ['questionário', 'questionario']],
  },
  {
    id: 'dificeis', titulo: 'Palavras difíceis', icone: '🧠', cor: '#e07b00',
    regra: 'Palavras que pegam muita gente: e<b>x</b>emplo (X com som de Z), e<b>xc</b>elente, adole<b>sc</b>ente, <b>pr</b>oblema, cabel<b>ei</b>reiro. Leia devagar, letra por letra!',
    pares: [['exagero', 'esagero'], ['exemplo', 'ezemplo'], ['experiência', 'experiencia'], ['excelente', 'exelente'], ['adolescente', 'adolecente'],
      ['ascensão', 'asensão'], ['consciência', 'conciência'], ['crescimento', 'crecimento'], ['desenvolvimento', 'dezenvolvimento'], ['privilégio', 'previlégio'],
      ['empecilho', 'impecilho'], ['companhia', 'compania'], ['espontâneo', 'espontanio'], ['beneficente', 'beneficiente'], ['meteorologia', 'metereologia'],
      ['reivindicar', 'reinvindicar'], ['mendigo', 'mendingo'], ['cabeleireiro', 'cabelereiro'], ['problema', 'poblema'], ['perspectiva', 'prespectiva']],
  },
];
