/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Lanches, nutrientes e perguntas do jogo Missão Digestão. */

// ---------- nutrientes ----------
// classe: 'bom' (todo dia), 'pouco' (só um pouco: em excesso faz mal) ou 'evitar'
// forma: o desenho do personagem (sprites-digestao.js) · oNome: com artigo, para as frases · com: depois de "alimentos com"
// comeca: onde a quebra (ou a absorção) acontece de verdade, para a mensagem da saliva não deixar ideia errada
// fato: a curiosidade do Álbum, curta e conferida (5º ano, BNCC EF05CI08 e EF05CI09)
const NUTRIENTES = {
  amido: { nome: 'Amido', icone: '🍞', cor: '#e0b46c', forma: 'grao', classe: 'bom', grupo: 'Carboidrato',
    oNome: 'o amido', com: 'amido (pão, arroz, batata)', vira: 'glicose',
    comeca: 'A quebra do amido começa na boca e termina no intestino delgado, onde ele vira glicose.',
    fato: 'O amido vira glicose, o combustível do corpo e do cérebro. Prefira os integrais: têm mais fibras.' },
  proteina: { nome: 'Proteína', icone: '🥚', cor: '#e57373', forma: 'cadeia', classe: 'bom', grupo: 'Proteína',
    oNome: 'a proteína', com: 'proteína (ovo, feijão, carne, peixe)', vira: 'aminoácidos',
    comeca: 'A proteína começa a ser quebrada no estômago, pela pepsina.',
    fato: 'As proteínas viram aminoácidos, os tijolinhos que constroem músculos, pele e cabelo.' },
  mono: { nome: 'Gordura monoinsaturada', icone: '🫒', cor: '#b5c334', forma: 'gota', classe: 'bom', grupo: 'Gordura boa',
    oNome: 'a gordura monoinsaturada', com: 'gordura monoinsaturada (azeite, abacate)', vira: 'ácidos graxos e glicerol',
    comeca: 'As gorduras só são quebradas no intestino delgado, com a bile e a lipase.',
    fato: 'Do azeite e do abacate: ajuda a manter o colesterol bom e protege o coração.' },
  poli: { nome: 'Gordura poli-insaturada (ômega-3)', icone: '🐟', cor: '#4fb3e8', forma: 'gota', classe: 'bom', grupo: 'Gordura boa',
    oNome: 'o ômega-3', com: 'ômega-3 (peixe, castanhas)', vira: 'ácidos graxos e glicerol',
    comeca: 'As gorduras só são quebradas no intestino delgado, com a bile e a lipase.',
    fato: 'Do peixe e das castanhas: ajuda o coração e o cérebro. O corpo não fabrica, então precisa vir da comida.' },
  saturada: { nome: 'Gordura saturada', icone: '🥓', cor: '#f0a24e', forma: 'gota', classe: 'pouco', grupo: 'Gordura',
    oNome: 'a gordura saturada', com: 'gordura saturada (bacon, carne gorda, salgadinho)', vira: 'ácidos graxos e glicerol',
    comeca: 'As gorduras só são quebradas no intestino delgado, com a bile e a lipase.',
    fato: 'Do bacon e da carne gorda: em excesso aumenta o colesterol ruim, que pode entupir os vasos do sangue.' },
  trans: { nome: 'Gordura trans', icone: '⛔', cor: '#8d6e63', forma: 'gota', classe: 'evitar', grupo: 'Gordura ruim',
    oNome: 'a gordura trans', com: 'gordura trans (gordura hidrogenada)', vira: 'ácidos graxos e glicerol',
    comeca: 'As gorduras só são quebradas no intestino delgado, com a bile e a lipase.',
    fato: 'Vem da gordura hidrogenada. Aumenta o colesterol ruim e diminui o bom. Faz tão mal que o Brasil proibiu a gordura hidrogenada nos alimentos em 2023.' },
  acucar: { nome: 'Açúcar', icone: '🍬', cor: '#f48fb1', forma: 'cristal', classe: 'pouco', grupo: 'Carboidrato simples',
    oNome: 'o açúcar', com: 'açúcar (doce, biscoito recheado, chocolate)', vira: 'glicose e frutose',
    comeca: 'O açúcar é quebrado e absorvido no intestino delgado.',
    fato: 'Dá energia rápida, mas em excesso causa cárie e ganho de peso. A energia vem rápido e vai embora rápido.' },
  sodio: { nome: 'Sódio (sal)', icone: '🧂', cor: '#b0bec5', forma: 'cristal', classe: 'pouco', grupo: 'Mineral',
    oNome: 'o sódio', com: 'sódio (sal, salgadinho, bacon)', vira: 'não precisa ser quebrado',
    comeca: 'O sódio do sal não precisa ser quebrado: é absorvido no intestino.',
    fato: 'Um pouco de sal o corpo precisa. Em excesso, aumenta a pressão do sangue e faz mal ao coração.' },
  fibra: { nome: 'Fibras', icone: '🥬', cor: '#66bb6a', forma: 'fio', classe: 'bom', grupo: 'Fibra',
    oNome: 'as fibras', com: 'fibras (verduras, frutas, feijão, integrais)', vira: 'não são digeridas',
    comeca: 'As fibras não são digeridas: elas vão até o intestino grosso.',
    fato: 'O corpo não digere as fibras, mas elas alimentam as bactérias boas do intestino e ajudam ele a funcionar.' },
  vitaminas: { nome: 'Vitaminas', icone: '🍊', cor: '#ffa726', forma: 'orbe', classe: 'bom', grupo: 'Vitaminas',
    oNome: 'as vitaminas', com: 'vitaminas (frutas, verduras, ovo)', vira: 'não precisam ser quebradas',
    comeca: 'As vitaminas não precisam ser quebradas: são absorvidas no intestino delgado.',
    fato: 'Ajudam a defender o corpo e a cuidar dos olhos, da pele e dos ossos. As vitaminas A e D precisam de gordura para serem absorvidas.' },
};

// as três respostas da parada do Sabor (a mesma ordem das classes)
const CLASSES_DIG = {
  bom: { icone: '💚', nome: 'Faz bem', texto: 'Todo dia: fazem bem ao corpo', cor: '#2e9e5b' },
  pouco: { icone: '🟡', nome: 'Só um pouco', texto: 'Só um pouco: em excesso fazem mal', cor: '#e0a800' },
  evitar: { icone: '⛔', nome: 'Evitar', texto: 'Evitar: fazem mal ao corpo', cor: '#c62828' },
};

// o porquê de cada engano na parada do Sabor ("o que a criança escolheu>o certo")
const POR_CLASSE = {
  'bom>pouco': 'Todo dia e à vontade não: em excesso ele faz mal.',
  'bom>evitar': 'Esse faz mal ao corpo, mesmo em pouca quantidade.',
  'pouco>bom': 'Esse nutriente faz bem: o corpo precisa dele todo dia.',
  'pouco>evitar': 'Esse faz mal mesmo em pouca quantidade: o melhor é evitar.',
  'evitar>bom': 'Esse nutriente faz bem: o corpo precisa dele.',
  'evitar>pouco': 'O corpo usa um pouco dele: não precisa evitar, só não exagerar.',
};

// ---------- lanches ----------
// de: "do pão", "da carne" (para as frases) · corte: os dentes que cortam ('incisivos') ou rasgam ('caninos') aquele alimento na primeira parada
const LANCHES = [
  { id: 'sanduiche', nome: 'Sanduíche completo', icone: '🥪', cor: '#e5731f', alimentos: [
    { nome: 'Pão', de: 'do pão', icone: '🍞', corte: 'incisivos', nutrientes: ['amido'] },
    { nome: 'Carne', de: 'da carne', icone: '🥩', corte: 'caninos', nutrientes: ['proteina', 'saturada'] },
    { nome: 'Bacon', de: 'do bacon', icone: '🥓', corte: 'caninos', nutrientes: ['saturada', 'sodio'] },
    { nome: 'Ovo', de: 'do ovo', icone: '🍳', corte: 'incisivos', nutrientes: ['proteina', 'mono', 'vitaminas'] },
  ] },
  { id: 'prato', nome: 'Prato colorido', icone: '🍛', cor: '#2e9e5b', alimentos: [
    { nome: 'Arroz', de: 'do arroz', icone: '🍚', corte: 'incisivos', nutrientes: ['amido'] },
    { nome: 'Feijão', de: 'do feijão', icone: '🫘', corte: 'incisivos', nutrientes: ['proteina', 'fibra'] },
    { nome: 'Peixe', de: 'do peixe', icone: '🐟', corte: 'incisivos', nutrientes: ['proteina', 'poli'] },
    { nome: 'Salada com azeite', de: 'da salada com azeite', icone: '🥗', corte: 'incisivos', nutrientes: ['fibra', 'vitaminas', 'mono'] },
  ] },
  { id: 'natural', nome: 'Lanche natural', icone: '🥑', cor: '#7cb342', alimentos: [
    { nome: 'Pão integral', de: 'do pão integral', icone: '🍞', corte: 'incisivos', nutrientes: ['amido', 'fibra'] },
    { nome: 'Abacate', de: 'do abacate', icone: '🥑', corte: 'incisivos', nutrientes: ['mono', 'vitaminas'] },
    { nome: 'Castanhas', de: 'das castanhas', icone: '🌰', corte: 'incisivos', nutrientes: ['poli', 'proteina'] },
    { nome: 'Banana', de: 'da banana', icone: '🍌', corte: 'incisivos', nutrientes: ['fibra', 'vitaminas'] },
  ] },
  { id: 'pacote', nome: 'Lanche de pacote', icone: '🍪', cor: '#8e44ad', alimentos: [
    { nome: 'Biscoito recheado', de: 'do biscoito recheado', icone: '🍪', corte: 'incisivos', nutrientes: ['acucar', 'trans', 'amido'] },
    { nome: 'Salgadinho', de: 'do salgadinho', icone: '🥔', corte: 'incisivos', nutrientes: ['saturada', 'sodio', 'amido'] },
    { nome: 'Chocolate', de: 'do chocolate', icone: '🍫', corte: 'incisivos', nutrientes: ['acucar', 'saturada'] },
  ] },
];

// ---------- a viagem: as paradas do tubo digestório (só a Boca está pronta) ----------
const PARADAS = [
  { id: 'boca', nome: 'Boca', icone: '👄', pronta: true },
  { id: 'esofago', nome: 'Esôfago', icone: '〰️', pronta: true },
  { id: 'estomago', nome: 'Estômago', icone: '🫧', pronta: true },
  { id: 'duodeno', nome: 'Duodeno', icone: '🧪', pronta: true },
  { id: 'delgado', nome: 'Intestino delgado', icone: '🌿', pronta: true },
  { id: 'grosso', nome: 'Intestino grosso', icone: '💧', pronta: true },
];

// ---------- os dentes ----------
const DENTES = {
  incisivos: { nome: 'Incisivos', onde: 'os da frente', por: 'Os incisivos, na frente da boca, são retos e afiados: eles CORTAM o alimento.' },
  caninos: { nome: 'Caninos', onde: 'os pontudos', por: 'Os caninos são pontudos: eles RASGAM alimentos mais duros, como a carne.' },
  molares: { nome: 'Molares', onde: 'os do fundo', por: 'Os molares, no fundo da boca, são largos: eles TRITURAM (moem) o alimento.' },
};

// ---------- as perguntas da Boca ----------
// Cada parada devolve { tipo, q (pergunta), ops: [{ id, t, sub, icone, certa, por }], por (explicação da certa) }.
// As erradas são ideias erradas de verdade das crianças, nunca outra resposta que também serviria.
function perguntasBoca(nId, alimento) {
  const n = NUTRIENTES[nId];
  const dente = (id, certo) => ({ id, t: DENTES[id].nome, sub: DENTES[id].onde, icone: '🦷', certa: id === certo, por: DENTES[id].por });
  const verbo = alimento.corte === 'caninos' ? 'rasgar' : 'cortar';
  const corte = {
    tipo: 'dentes', parada: 'corte', alvo: alimento.corte,
    q: `O pedaço de ${alimento.nome.toLowerCase()} é grande demais para engolir! Que dentes vão ${verbo} o pedaço?`,
    ops: ['incisivos', 'caninos', 'molares'].map((id) => dente(id, alimento.corte)),
    por: DENTES[alimento.corte].por,
  };
  const triturar = {
    tipo: 'dentes', parada: 'triturar', alvo: 'molares',
    q: 'Agora os pedaços precisam virar uma pasta. Que dentes trituram (moem) a comida?',
    ops: ['incisivos', 'caninos', 'molares'].map((id) => dente(id, 'molares')),
    por: `${DENTES.molares.por} Mastigar bem deixa os pedaços pequenos, e assim a digestão fica mais fácil.`,
  };
  const saliva = nId === 'amido'
    ? { tipo: 'saliva', parada: 'saliva', q: 'A saliva caiu sobre o amido. O que acontece com ele?',
      ops: [
        { id: 'amilase', t: 'A amilase da saliva começa a quebrar o amido', icone: '✨', certa: true },
        { id: 'molha', t: 'Nada: a saliva só deixa ele molhado', icone: '💧', por: 'A saliva tem uma enzima, a amilase, que já começa a trabalhar no amido.' },
        { id: 'tudo', t: 'Ele vira glicose inteirinho aqui na boca', icone: '⚡', por: 'Na boca a quebra só começa: o amido fica pouco tempo aqui para virar glicose.' },
      ],
      por: 'A saliva tem amilase, uma enzima que começa a quebrar o amido em pedaços menores. A quebra só termina no intestino, onde ele vira glicose.' }
    : { tipo: 'saliva', parada: 'saliva', q: `A saliva caiu sobre ${n.oNome}. O que acontece?`,
      ops: [
        { id: 'molha', t: 'A saliva molha e amolece: vira o bolo alimentar', icone: '💧', certa: true },
        { id: 'amilase', t: `A amilase da saliva já quebra ${n.oNome}`, icone: '✨', por: `A amilase só quebra o amido. ${n.comeca}` },
        { id: 'sangue', t: `${n.oNome[0].toUpperCase()}${n.oNome.slice(1)} entra no sangue pela língua`, icone: '🩸', por: 'A língua não absorve os nutrientes: isso acontece lá no intestino.' },
      ],
      por: `A saliva molha e amolece a comida, formando o bolo alimentar. A amilase da saliva só quebra o amido. ${n.comeca}` };
  const sabor = {
    tipo: 'nutri', parada: 'sabor', q: `A língua sente o sabor! E para o corpo: como devemos comer alimentos com ${n.com}?`,
    ops: Object.entries(CLASSES_DIG).map(([id, c]) => ({ id, t: c.texto, icone: c.icone, certa: id === n.classe, por: POR_CLASSE[`${id}>${n.classe}`] })),
    por: n.fato,
  };
  const engolir = {
    tipo: 'engolir', parada: 'engolir', q: 'Hora de engolir! Para qual tubo o bolo alimentar deve ir?',
    ops: [
      // só os nomes (pedido do Marco): para onde cada tubo leva aparece na explicação, depois da resposta
      { id: 'esofago', t: 'Esôfago', icone: '🔻', certa: true },
      { id: 'traqueia', t: 'Traqueia', icone: '🔻', por: 'Cof, cof! A traqueia é o caminho do ar até os pulmões. Se a comida entra nela, a gente engasga.' },
      { id: 'nariz', t: 'Nariz', icone: '🔺', por: 'A úvula (a "campainha") e o céu da boca mole fecham o caminho do nariz quando engolimos.' },
    ],
    por: 'A epiglote é uma tampinha que fecha a traqueia quando engolimos: a comida desce pelo esôfago e o ar continua indo para os pulmões. Por isso não é bom falar de boca cheia!',
  };
  return [corte, triturar, saliva, sabor, engolir];
}

// ---------- as perguntas do Esôfago e do Estômago ----------
// O que acontece com cada nutriente no estômago (só a proteína começa a ser quebrada aqui).
function quebraNoEstomago(nId) {
  const n = NUTRIENTES[nId];
  const Nome = `${n.oNome[0].toUpperCase()}${n.oNome.slice(1)}`;
  const pepsina = { id: 'pepsina', t: `A pepsina quebra ${n.oNome}`, icone: '✂️', por: 'A pepsina só quebra proteínas.' };
  const sangue = { id: 'sangue', t: `${Nome} vai para o sangue pelo estômago`, icone: '🩸', por: 'A absorção dos nutrientes acontece quase toda no intestino delgado.' };
  if (nId === 'proteina') return {
    q: 'Você é a proteína, mergulhada no suco gástrico. O que acontece?',
    ops: [
      { id: 'pepsina', t: 'A pepsina quebra a proteína em pedaços menores', icone: '✂️', certa: true },
      { id: 'boca', t: 'Nada: a proteína já foi quebrada na boca', icone: '👄', por: 'Na boca nada quebra a proteína: a quebra começa aqui, no estômago, com a pepsina.' },
      { id: 'amino', t: 'Ela já vira aminoácidos e vai para o sangue', icone: '🩸', por: 'Aqui ela só fica em pedaços menores. Os aminoácidos aparecem no intestino delgado.' },
    ],
    por: 'A pepsina quebra a proteína em pedaços menores (peptídeos). A quebra termina no intestino delgado, onde eles viram aminoácidos.' };
  if (nId === 'amido') return {
    q: 'E o amido, mergulhado no suco gástrico?',
    ops: [
      { id: 'para', t: 'A amilase da saliva para de funcionar no ácido', icone: '⏸️', certa: true },
      { id: 'glicose', t: 'O ácido termina de transformar o amido em glicose', icone: '⚡', por: 'O estômago não quebra o amido: isso continua no intestino, com a amilase do pâncreas.' },
      pepsina,
    ],
    por: 'No ácido do estômago, a amilase da saliva para de trabalhar. A quebra do amido continua no intestino delgado, com a amilase do pâncreas.' };
  if (n.forma === 'gota') return {
    q: `E ${n.oNome}, no estômago?`,
    ops: [
      { id: 'demora', t: 'Fica mais tempo aqui e só é quebrada no intestino', icone: '⏳', certa: true },
      pepsina,
      { id: 'some', t: 'O ácido derrete a gordura e ela some', icone: '💨', por: 'O ácido não faz a gordura sumir: ela continua inteira até o intestino.' },
    ],
    por: 'As gorduras deixam a digestão mais lenta: ficam mais tempo no estômago. Elas só são quebradas no intestino delgado, com a bile e a lipase.' };
  const plural = n.oNome.startsWith('as ');
  return {
    q: `E ${n.oNome}, no estômago?`,
    ops: [
      { id: 'passa', t: `${plural ? 'Passam' : 'Passa'} pelo estômago sem ser ${plural ? 'quebradas' : 'quebrado'}`, icone: '➡️', certa: true },
      pepsina, sangue,
    ],
    por: `${n.comeca} No estômago, nada acontece com ${plural ? 'elas' : 'ele'}.` };
}

function perguntasEstomago(nId) {
  const quebra = quebraNoEstomago(nId);
  return [
    { tipo: 'esofago', parada: 'peristalse', q: 'Você está no esôfago, descendo para o estômago. O que empurra o bolo alimentar para baixo?',
      ops: [
        { id: 'ondas', t: 'Ondas de músculos que apertam o tubo', icone: '〰️', certa: true },
        { id: 'gravidade', t: 'Só a gravidade', icone: '⬇️', por: 'A gravidade ajuda, mas não é ela: os astronautas engolem até de cabeça para baixo!' },
        { id: 'saliva', t: 'A saliva escorrendo', icone: '💧', por: 'A saliva só deixa o bolo escorregadio. Quem empurra são os músculos.' },
      ],
      por: 'São os movimentos peristálticos: os músculos do esôfago apertam em ondas, de cima para baixo, e empurram o bolo. Funciona até de cabeça para baixo!' },
    { tipo: 'estomago', parada: 'suco', q: 'As paredes do estômago soltam o suco gástrico. O que tem nele?',
      ops: [
        { id: 'acido', t: 'Ácido e pepsina', icone: '🧪', certa: true },
        { id: 'saliva', t: 'Saliva e amilase', icone: '💧', por: 'A saliva é da boca. O suco gástrico é bem ácido e tem a enzima pepsina.' },
        { id: 'bile', t: 'Bile', icone: '🟢', por: 'A bile vem do fígado e só entra no intestino delgado, para ajudar com as gorduras.' },
      ],
      por: 'O suco gástrico tem ácido clorídrico (muito ácido!) e a pepsina, uma enzima que quebra proteínas.' },
    { tipo: 'estomago', parada: 'quebra', ...quebra },
    { tipo: 'estomago', parada: 'muco', q: 'O suco gástrico é muito ácido. Por que o estômago não digere a si mesmo?',
      ops: [
        { id: 'muco', t: 'Uma camada de muco protege a parede', icone: '🛡️', certa: true },
        { id: 'osso', t: 'A parede do estômago é de osso', icone: '🦴', por: 'O estômago é de músculo, não de osso. Quem protege é o muco.' },
        { id: 'fraco', t: 'O ácido não faz nada na parede', icone: '🤷', por: 'O ácido é forte! Sem o muco, ele machucaria a parede (é o que acontece numa úlcera).' },
      ],
      por: 'As paredes do estômago fazem um muco grosso que cobre tudo, como uma capa. Ele protege a parede do ácido.' },
    { tipo: 'estomago', parada: 'saida', q: 'O estômago mexeu e misturou tudo: o bolo alimentar virou quimo, uma pasta. Por qual porta o quimo segue para o intestino?',
      ops: [
        { id: 'piloro', t: 'Piloro', icone: '🚪', certa: true },
        { id: 'cardia', t: 'Cárdia', icone: '🚪', por: 'Azia! A cárdia é a porta de cima: ela fecha para o ácido não voltar para o esôfago.' },
        { id: 'esofago', t: 'Esôfago', icone: '⬆️', por: 'O esôfago é o caminho de quem chega. Voltar por ele seria vômito!' },
      ],
      por: 'O piloro é o anel de saída do estômago. Ele abre aos pouquinhos e deixa o quimo passar para o intestino delgado.' },
  ];
}

// ---------- as perguntas do Duodeno e do Intestino delgado ----------
// No duodeno chegam a bile (do fígado e da vesícula) e o suco pancreático: aqui cada nutriente termina de ser quebrado.
function quebraNoDuodeno(nId) {
  const n = NUTRIENTES[nId];
  const plural = n.oNome.startsWith('as ');
  const q = `Agora chega o suco pancreático, cheio de enzimas. O que acontece com ${n.oNome}?`;
  if (nId === 'amido') return { q, ops: [
    { id: 'glicose', t: 'A amilase do pâncreas termina a quebra: vira glicose', icone: '⚡', certa: true },
    { id: 'gordura', t: 'A bile transforma o amido em gordura', icone: '🟢', por: 'A bile só ajuda com as gorduras.' },
    { id: 'inteiro', t: 'Nada: o amido sai inteiro', icone: '🍞', por: 'O amido precisa ser quebrado para passar para o sangue: aqui ele vira glicose.' },
  ], por: 'A amilase do suco pancreático termina a quebra do amido: ele vira glicose, o açúcar pequenininho que dá energia ao corpo.' };
  if (nId === 'proteina') return { q, ops: [
    { id: 'amino', t: 'A tripsina termina a quebra: viram aminoácidos', icone: '🧱', certa: true },
    { id: 'glicose', t: 'Os pedaços viram glicose', icone: '⚡', por: 'Proteína não vira glicose: ela vira aminoácidos, os tijolinhos do corpo.' },
    { id: 'bile', t: 'A bile quebra a proteína', icone: '🟢', por: 'A bile só ajuda com as gorduras. Quem termina a proteína é a tripsina, do pâncreas.' },
  ], por: 'A tripsina do suco pancreático termina a quebra: os pedaços viram aminoácidos, os tijolinhos que constroem os músculos.' };
  if (n.forma === 'gota') return { q, ops: [
    { id: 'lipase', t: 'A lipase quebra em ácidos graxos e glicerol', icone: '✂️', certa: true },
    { id: 'amilase', t: 'A amilase quebra a gordura', icone: '⚡', por: 'A amilase só quebra o amido. A gordura precisa da lipase.' },
    { id: 'inteira', t: 'A gordura sai inteira', icone: '🫒', por: 'Inteira, a gordura não passa para o corpo: a lipase precisa quebrá-la.' },
  ], por: 'Depois da bile, a lipase do suco pancreático quebra as gotinhas em ácidos graxos e glicerol, pequenos o bastante para passar para o corpo.' };
  if (nId === 'acucar') return { q, ops: [
    { id: 'quebra', t: 'Enzimas do intestino quebram em glicose e frutose', icone: '⚡', certa: true },
    { id: 'tripsina', t: 'A tripsina transforma o açúcar em proteína', icone: '🧱', por: 'A tripsina só quebra proteínas.' },
    { id: 'gordura', t: 'Vira gordura aqui mesmo', icone: '🫒', por: 'Aqui o açúcar só é quebrado em pedaços menores: glicose e frutose.' },
  ], por: 'O açúcar comum é quebrado aqui, no intestino, em glicose e frutose: pequenos e prontos para passar ao sangue.' };
  if (nId === 'fibra') return { q, ops: [
    { id: 'nenhuma', t: 'Nenhuma enzima quebra as fibras', icone: '🥬', certa: true },
    { id: 'lipase', t: 'A lipase quebra as fibras', icone: '✂️', por: 'Nenhuma enzima do nosso corpo quebra as fibras.' },
    { id: 'glicose', t: 'As fibras viram glicose', icone: '⚡', por: 'O corpo não consegue quebrar as fibras: elas não viram glicose.' },
  ], por: 'Nenhuma enzima do corpo quebra as fibras. Elas seguem inteiras e ajudam o intestino a funcionar.' };
  return { q, ops: [
    { id: 'nao', t: `${plural ? 'Não precisam' : 'Não precisa'} ser ${plural ? 'quebradas' : 'quebrado'}`, icone: '➡️', certa: true },
    { id: 'amilase', t: `A amilase quebra ${n.oNome}`, icone: '⚡', por: 'A amilase só quebra o amido.' },
    { id: 'tripsina', t: `A tripsina quebra ${n.oNome}`, icone: '🧱', por: 'A tripsina só quebra proteínas.' },
  ], por: `${n.comeca}${nId === 'vitaminas' ? ' As vitaminas A e D vão junto com a gordura.' : ''}` };
}

function perguntasIntestino(nId) {
  const n = NUTRIENTES[nId], gordura = n.forma === 'gota', fibra = nId === 'fibra';
  const alerta = { saturada: ' Em excesso, a gordura saturada aumenta o colesterol ruim no sangue.',
    trans: ' A gordura trans aumenta o colesterol ruim no sangue e diminui o bom: por isso é melhor evitar.' }[nId] || '';
  const itens = [
    { tipo: 'intestino', parada: 'bile', q: 'Chegando ao duodeno, o começo do intestino! Que líquido verde vem do fígado e da vesícula?',
      ops: [
        { id: 'bile', t: 'Bile', icone: '🟢', certa: true },
        { id: 'saliva', t: 'Saliva', icone: '💧', por: 'A saliva fica na boca. O líquido verde é a bile, que vem do fígado e fica guardada na vesícula.' },
        { id: 'suco', t: 'Suco gástrico', icone: '🧪', por: 'O suco gástrico é do estômago. O líquido verde que vem do fígado é a bile.' },
      ],
      por: gordura ? 'A bile funciona como um detergente: separa a gota grande de gordura em gotinhas, e assim a lipase trabalha melhor.'
        : 'A bile vem do fígado e fica guardada na vesícula. Ela ajuda só com as gorduras: separa a gordura em gotinhas, como um detergente.' },
    { tipo: 'intestino', parada: 'pancreas', ...quebraNoDuodeno(nId) },
  ];
  if (fibra) {
    itens.push(
      { tipo: 'intestino', parada: 'absorcao', q: 'Agora o intestino delgado, cheio de dobrinhas. As fibras passam pela parede para o corpo?',
        ops: [
          { id: 'nao', t: 'Não: são grandes demais e seguem em frente', icone: '➡️', certa: true },
          { id: 'sangue', t: 'Sim: entram no sangue', icone: '🩸', por: 'As fibras não são quebradas, então são grandes demais para passar pela parede do intestino.' },
          { id: 'estomago', t: 'Sim: voltam para o estômago', icone: '⬅️', por: 'A comida não volta: as fibras seguem sempre em frente pelo intestino.' },
        ],
        por: 'A parede do intestino deixa passar só os nutrientes pequenos. As fibras são grandes demais: não passam e seguem em frente.' },
      { tipo: 'intestino', parada: 'fibra', q: 'As fibras não passaram para o corpo. Para onde elas vão agora?',
        ops: [
          { id: 'grosso', t: 'Para o intestino grosso', icone: '💧', certa: true },
          { id: 'sangue', t: 'Para o sangue', icone: '🩸', por: 'As fibras não entram no sangue: são grandes demais.' },
          { id: 'ficam', t: 'Ficam paradas aqui para sempre', icone: '⏸️', por: 'Nada fica parado: o intestino empurra tudo para a frente.' },
        ],
        por: 'As fibras seguem para o intestino grosso. Lá elas alimentam as bactérias boas e ajudam a formar as fezes.' });
  } else {
    itens.push(
      { tipo: 'intestino', parada: 'absorcao', q: 'Agora o intestino delgado, cheio de dobrinhas. Por onde os nutrientes passam para o corpo?',
        ops: [
          { id: 'vilosidades', t: 'Pelas vilosidades, os dedinhos da parede', icone: '🖐️', certa: true },
          { id: 'estomago', t: 'Pelo estômago', icone: '🫧', por: 'No estômago quase nada passa para o corpo. A maior parte passa aqui, no intestino delgado.' },
          { id: 'umbigo', t: 'Pelo umbigo', icone: '🔘', por: 'O umbigo não tem ligação com o intestino. Os nutrientes passam pela parede do intestino.' },
        ],
        por: (gordura ? 'As vilosidades são dedinhos da parede do intestino. As gorduras entram num vasinho branco, o vaso linfático, e depois chegam ao sangue.'
          : 'As vilosidades são dedinhos da parede do intestino, cheios de vasos de sangue. Os nutrientes pequenos passam por elas e entram no sangue.') + alerta },
      { tipo: 'circulacao', parada: 'circulacao', q: 'O sangue recebeu os nutrientes. Para onde ele leva?',
        ops: [
          { id: 'corpo', t: 'Para o corpo todo', icone: '❤️', certa: true },
          { id: 'coracao', t: 'Só para o coração', icone: '🫀', por: 'O coração é a bomba que empurra o sangue, mas o sangue leva os nutrientes para o corpo todo.' },
          { id: 'estomago', t: 'De volta para o estômago', icone: '🫧', por: 'O sangue não devolve a comida: ele entrega os nutrientes para todas as partes do corpo.' },
        ],
        por: 'O coração bombeia o sangue, que leva os nutrientes para o corpo todo: músculos, cérebro, ossos e pele.' });
  }
  return itens;
}

// ---------- as perguntas do Intestino grosso (iguais para todos: quem chega aqui é o que sobrou do lanche) ----------
function perguntasGrosso() {
  return [
    { tipo: 'grosso', parada: 'agua', q: 'O que o intestino grosso tira do que sobrou da comida?',
      ops: [
        { id: 'agua', t: 'Água', icone: '💧', certa: true },
        { id: 'proteina', t: 'Proteína', icone: '🥚', por: 'A proteína já foi absorvida lá no intestino delgado. Aqui a parede puxa a água.' },
        { id: 'saliva', t: 'Saliva', icone: '👄', por: 'A saliva é da boca. O intestino grosso puxa de volta a água do que sobrou.' },
      ],
      por: 'A parede do intestino grosso funciona como uma esponja: puxa a água de volta para o corpo, e o que sobrou fica mais firme.' },
    { tipo: 'grosso', parada: 'bacterias', q: 'Quem mora no intestino grosso e come as fibras?',
      ops: [
        { id: 'bacterias', t: 'Bactérias boas', icone: '🦠', certa: true },
        { id: 'vermes', t: 'Vermes', icone: '🪱', por: 'Vermes não deveriam morar aqui! Quem come as fibras são as bactérias boas.' },
        { id: 'ninguem', t: 'Ninguém', icone: '🤷', por: 'Moram aqui bilhões de bactérias boas, que comem as fibras.' },
      ],
      por: 'Bilhões de bactérias boas moram no intestino grosso. Elas comem as fibras e, em troca, fazem vitaminas (como a vitamina K) para o corpo.' },
    { tipo: 'fibras', parada: 'fibras', q: 'Por que comer fibras faz bem ao intestino?',
      ops: [
        { id: 'ajudam', t: 'Ajudam o intestino a funcionar e a formar as fezes', icone: '🥬', certa: true },
        { id: 'crescer', t: 'Fazem a gente crescer mais rápido', icone: '📏', por: 'Quem ajuda a crescer são as proteínas, as vitaminas e os minerais. As fibras cuidam do intestino.' },
        { id: 'nada', t: 'Não fazem nada', icone: '🤷', por: 'Fazem muito! Sem fibras, o intestino fica preguiçoso e a gente fica com prisão de ventre.' },
      ],
      por: 'As fibras dão volume e alimentam as bactérias boas: o intestino funciona melhor e as fezes se formam e saem com facilidade.' },
    { tipo: 'grosso', parada: 'saida', q: 'O que se forma no fim do intestino grosso?',
      ops: [
        { id: 'fezes', t: 'Fezes (cocô)', icone: '💩', certa: true },
        { id: 'sangue', t: 'Sangue', icone: '🩸', por: 'O sangue corre nos vasos. No fim do intestino grosso se formam as fezes.' },
        { id: 'saliva', t: 'Saliva', icone: '💧', por: 'A saliva é feita na boca. No fim do intestino grosso se formam as fezes.' },
      ],
      por: 'O que o corpo não aproveitou vira fezes, que ficam guardadas no reto e saem pelo ânus quando a gente vai ao banheiro.' },
  ];
}

// ---------- habilidades (relatório) ----------
const TIPOS_DIG = {
  dentes: { bncc: 'EF05CI06', id: 'dig-dentes', titulo: 'Dentes e mastigação', icone: '🦷', cor: '#78909c', regra: 'Incisivos cortam, caninos rasgam e molares trituram. Mastigar é a digestão mecânica.', exemplo: 'Os molares trituram o pão.' },
  saliva: { bncc: 'EF05CI06', id: 'dig-saliva', titulo: 'Saliva e enzimas', icone: '💧', cor: '#29b6f6', regra: 'A saliva molha a comida e forma o bolo alimentar; a amilase da saliva começa a quebrar o amido (digestão química).', exemplo: 'A amilase começa a quebrar o amido do pão.' },
  nutri: { bncc: 'EF05CI08', id: 'dig-nutri', titulo: 'Nutrientes e alimentação saudável', icone: '🥗', cor: '#43a047', regra: 'Fibras, vitaminas, proteínas e gorduras boas fazem bem; açúcar, sal e gordura saturada só um pouco; gordura trans, evitar.', exemplo: 'O ômega-3 do peixe faz bem ao coração.' },
  esofago: { bncc: 'EF05CI06', id: 'dig-esofago', titulo: 'Esôfago e peristaltismo', icone: '〰️', cor: '#8e24aa', regra: 'Os músculos do esôfago apertam em ondas (movimentos peristálticos) e empurram o bolo alimentar até o estômago.', exemplo: 'O bolo desce pelo esôfago empurrado pelos músculos.' },
  estomago: { bncc: 'EF05CI06', id: 'dig-estomago', titulo: 'Estômago: suco gástrico, muco e quimo', icone: '🧪', cor: '#9e9d24', regra: 'O suco gástrico (ácido e pepsina) começa a quebrar as proteínas; o muco protege a parede; o quimo sai pelo piloro.', exemplo: 'A pepsina quebra a proteína em pedaços menores.' },
  intestino: { bncc: 'EF05CI06', id: 'dig-intestino', titulo: 'Intestino delgado: bile, suco pancreático e absorção', icone: '🌿', cor: '#6d4c41', regra: 'No duodeno, a bile separa as gorduras e o suco pancreático termina a quebra; nas vilosidades, os nutrientes passam para o corpo.', exemplo: 'O amido vira glicose e passa pelas vilosidades.' },
  circulacao: { bncc: 'EF05CI07', id: 'dig-circulacao', titulo: 'Circulação: o sangue leva os nutrientes', icone: '❤️', cor: '#c62828', regra: 'O coração bombeia o sangue, que leva os nutrientes absorvidos no intestino para o corpo todo.', exemplo: 'A glicose vai pelo sangue até os músculos.' },
  grosso: { bncc: 'EF05CI06', id: 'dig-grosso', titulo: 'Intestino grosso: água, bactérias boas e fezes', icone: '💧', cor: '#2e7d32', regra: 'O intestino grosso puxa a água de volta, as bactérias boas comem as fibras e o que sobrou vira fezes.', exemplo: 'As bactérias boas comem as fibras.' },
  fibras: { bncc: 'EF05CI08', id: 'dig-fibras', titulo: 'Fibras e saúde do intestino', icone: '🥬', cor: '#558b2f', regra: 'As fibras ajudam o intestino a funcionar e a formar as fezes; elas estão nas frutas, verduras, feijão e integrais.', exemplo: 'O feijão tem fibras.' },
  engolir: { bncc: 'EF05CI06', id: 'dig-engolir', titulo: 'Engolir: esôfago e traqueia', icone: '🫁', cor: '#ab47bc', regra: 'Na hora de engolir, a epiglote fecha a traqueia e a comida desce pelo esôfago.', exemplo: 'O bolo alimentar desce pelo esôfago.' },
};

export { CLASSES_DIG, DENTES, LANCHES, NUTRIENTES, PARADAS, perguntasBoca, perguntasEstomago, perguntasGrosso, perguntasIntestino, TIPOS_DIG };
