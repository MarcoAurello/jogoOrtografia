/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* O personagem (o ar), as paradas e as perguntas do jogo Missão Respiração. */

// ---------- o personagem: o ar ----------
// Sem escolhas antes do jogo (pedido do Marco): a criança guia o próprio ar, uma nuvenzinha azul com rostinho, que
// entra trazendo pontinhos de poeira. No nariz, a poeira fica presa nos pelinhos e o ar segue limpinho.
const AR = { nome: 'Ar', icone: '💨', cor: '#81d4fa', forma: 'nuvem', oNome: 'o ar' };

// ---------- a viagem: as paradas do sistema respiratório (só a Fase 1 está pronta) ----------
const PARADAS_RESP = [
  { id: 'nariz', nome: 'Nariz', icone: '👃', pronta: true },
  { id: 'garganta', nome: 'Garganta', icone: '🗣️', pronta: true },
  { id: 'traqueia', nome: 'Traqueia', icone: '〰️', pronta: true },
  { id: 'bronquios', nome: 'Brônquios', icone: '🌳', pronta: true },
  { id: 'alveolos', nome: 'Alvéolos', icone: '🫧', pronta: true },
  { id: 'celula', nome: 'Coração e célula', icone: '❤️', pronta: true },
];

// ---------- as perguntas da Fase 1: nariz e garganta ----------
function perguntasNariz() {
  return [
    { tipo: 'nariz', parada: 'entrada', q: 'Hora de respirar! Qual é o melhor caminho para o ar entrar?',
      ops: [
        { id: 'nariz', t: 'Nariz', icone: '👃', certa: true },
        { id: 'boca', t: 'Boca', icone: '👄', por: 'A boca também deixa o ar entrar, mas sem filtro: o nariz limpa, aquece e umedece o ar.' },
        { id: 'ouvido', t: 'Ouvido', icone: '👂', por: 'O ouvido é para escutar: ele não leva ar para os pulmões.' },
      ],
      por: 'O melhor caminho é o nariz: os pelinhos e o muco limpam o ar, e ele fica quentinho e úmido antes de chegar aos pulmões.' },
    { tipo: 'nariz', parada: 'poeira', q: 'O ar entrou trazendo poeira. O que acontece com essa poeira no nariz?',
      ops: [
        { id: 'presa', t: 'Fica presa nos pelinhos e no muco', icone: '🧽', certa: true },
        { id: 'pulmoes', t: 'Vai junto até os pulmões', icone: '🫁', por: 'O nariz é um filtro: os pelinhos e o muco seguram a poeira antes de ela chegar aos pulmões.' },
        { id: 'oxigenio', t: 'Vira oxigênio', icone: '🔵', por: 'A poeira não vira oxigênio: ela fica presa no nariz e depois sai no muco ou num espirro.' },
      ],
      por: 'Os pelinhos e o muco do nariz seguram a poeira, e o ar segue mais limpinho para os pulmões. Se a poeira incomoda, a gente espirra!' },
    { tipo: 'nariz', parada: 'aquecer', q: 'Lá dentro do nariz, o que acontece com o ar?',
      ops: [
        { id: 'quente', t: 'Fica quentinho e úmido', icone: '♨️', certa: true },
        { id: 'gelado', t: 'Fica gelado', icone: '🧊', por: 'É o contrário: o nariz aquece o ar, que chega mais quentinho aos pulmões.' },
        { id: 'agua', t: 'Vira água', icone: '💧', por: 'O ar não vira água: ele só fica úmido, com um pouquinho de vapor.' },
      ],
      por: 'O nariz tem muitos vasinhos de sangue e muco: o ar fica quentinho e úmido, do jeito que os pulmões gostam.' },
    { tipo: 'garganta', parada: 'faringe', q: 'Esta é a faringe: por aqui passam o ar e a comida. Para onde o ar vai agora?',
      ops: [
        { id: 'laringe', t: 'Laringe', icone: '🔻', certa: true },
        { id: 'esofago', t: 'Esôfago', icone: '🔻', por: 'Ops, esse é o caminho da comida! O esôfago leva a comida ao estômago.' },
        { id: 'estomago', t: 'Estômago', icone: '🫧', por: 'O ar não vai para o estômago: ele vai para os pulmões, pela laringe e pela traqueia.' },
      ],
      por: 'O ar segue pela laringe e depois pela traqueia, até os pulmões. Enquanto respiramos, a epiglote fica aberta.' },
    { tipo: 'garganta', parada: 'voz', q: 'Na laringe ficam as cordas vocais. O que elas fazem quando o ar passa?',
      ops: [
        { id: 'voz', t: 'Vibram e fazem a voz', icone: '🎤', certa: true },
        { id: 'filtram', t: 'Filtram o ar', icone: '🧽', por: 'Quem filtra o ar é o nariz. As cordas vocais vibram com o ar e fazem a nossa voz.' },
        { id: 'guardam', t: 'Guardam o oxigênio', icone: '📦', por: 'Nada guarda oxigênio aqui: ele segue para os pulmões. As cordas vocais fazem a voz.' },
      ],
      por: 'Quando o ar passa, as cordas vocais vibram e fazem a voz. É por isso que falamos soltando o ar!' },
  ];
}

// ---------- as perguntas da Fase 2: traqueia e brônquios ----------
function perguntasTraqueia() {
  return [
    { tipo: 'traqueia', parada: 'cilios', q: 'Na parede da traqueia há pelinhos bem pequenos, os cílios, e muco. O que eles fazem?',
      ops: [
        { id: 'varrem', t: 'Varrem o muco com a sujeira para cima, até a garganta', icone: '🧹', certa: true },
        { id: 'empurram', t: 'Empurram o ar para baixo', icone: '⬇️', por: 'Quem puxa o ar é a respiração. Os cílios varrem o muco com a sujeira para cima, como uma escada rolante.' },
        { id: 'cocegas', t: 'Fazem cócegas para a gente rir', icone: '😆', por: 'Seria divertido, mas não! Os cílios varrem o muco com a sujeira para cima, até a garganta.' },
      ],
      por: 'Os cílios balançam juntos, como uma escada rolante, e levam o muco com a sujeira para cima, até a garganta. Assim os pulmões ficam limpinhos.' },
    { tipo: 'traqueia', parada: 'aneis', q: 'Por que a traqueia tem esses anéis duros de cartilagem?',
      ops: [
        { id: 'aberta', t: 'Para o tubo ficar sempre aberto e o ar passar', icone: '⭕', certa: true },
        { id: 'barulho', t: 'Para fazer barulho', icone: '🔔', por: 'Quem faz o som da voz são as cordas vocais. Os anéis deixam a traqueia sempre aberta.' },
        { id: 'comida', t: 'Para guardar comida', icone: '🍞', por: 'A comida não passa pela traqueia: ela vai pelo esôfago. Os anéis mantêm o tubo do ar sempre aberto.' },
      ],
      por: 'Os anéis de cartilagem são durinhos: não deixam a traqueia fechar, e o ar passa sempre. Dá para sentir os anéis tocando o pescoço, embaixo do "pomo de adão"!' },
    { tipo: 'traqueia', parada: 'tosse', q: 'Ops! Uma migalha de pão entrou pelo caminho errado. O que o corpo faz?',
      ops: [
        { id: 'tosse', t: 'Tosse: o ar sai com força e joga a migalha para fora', icone: '😮‍💨', certa: true },
        { id: 'orelha', t: 'Espirra pela orelha', icone: '👂', por: 'A orelha não tem ligação com a traqueia. Quem tira a migalha é a tosse.' },
        { id: 'nada', t: 'Nada: a migalha fica aí', icone: '🤷', por: 'O corpo se defende: a tosse sopra o ar com força e joga a migalha para fora.' },
      ],
      por: 'A tosse é um sopro forte de ar que vem dos pulmões e joga para fora o que entrou no caminho errado. Por isso não é bom comer conversando!' },
    { tipo: 'bronquios', parada: 'divisao', q: 'A traqueia se divide em dois tubos, um para cada pulmão. Como eles se chamam?',
      ops: [
        { id: 'bronquios', t: 'Brônquios', icone: '🌳', certa: true },
        { id: 'esofagos', t: 'Esôfagos', icone: '🔻', por: 'Esse é da comida! O esôfago leva a comida ao estômago. Os tubos do ar são os brônquios.' },
        { id: 'vilosidades', t: 'Vilosidades', icone: '🖐️', por: 'As vilosidades ficam no intestino. Os tubos que levam o ar a cada pulmão são os brônquios.' },
      ],
      por: 'A traqueia se divide em dois brônquios: um vai para o pulmão direito e o outro para o pulmão esquerdo.' },
    { tipo: 'bronquios', parada: 'galhos', q: 'Os galhos vão ficando cada vez mais finos, como uma árvore. Onde eles terminam?',
      ops: [
        { id: 'alveolos', t: 'Em saquinhos de ar: os alvéolos', icone: '🫧', certa: true },
        { id: 'coracao', t: 'No coração', icone: '❤️', por: 'O coração fica entre os pulmões, mas os galhos dos brônquios terminam em saquinhos de ar, os alvéolos.' },
        { id: 'estomago', t: 'No estômago', icone: '🫃', por: 'O estômago é da digestão. Os galhinhos de ar terminam em saquinhos, os alvéolos.' },
      ],
      por: 'Os brônquios se dividem em galhinhos bem finos, os bronquíolos, que terminam em milhões de saquinhos de ar: os alvéolos.' },
  ];
}

// ---------- as perguntas da Fase 3: alvéolos e a troca de gases ----------
function perguntasAlveolos() {
  return [
    { tipo: 'alveolos', parada: 'inspirar', q: 'Para o ar entrar nos pulmões, o que o diafragma (o músculo embaixo dos pulmões) faz?',
      ops: [
        { id: 'desce', t: 'Desce, e os pulmões enchem', icone: '⬇️', certa: true },
        { id: 'sobe', t: 'Sobe', icone: '⬆️', por: 'Quando o diafragma sobe, o ar sai: é a expiração. Para o ar entrar, ele desce.' },
        { id: 'parado', t: 'Fica parado', icone: '⏸️', por: 'O diafragma se mexe o tempo todo: desce para o ar entrar e sobe para o ar sair.' },
      ],
      por: 'Na inspiração, o diafragma desce e as costelas se abrem: os pulmões enchem como balões e o ar entra. Na expiração, ele sobe e o ar sai.' },
    { tipo: 'alveolos', parada: 'entra', q: 'A parede do alvéolo é bem fininha e fica colada num vasinho de sangue. O que passa do ar para o sangue?',
      ops: [
        { id: 'oxigenio', t: 'Oxigênio', icone: '🔵', certa: true },
        { id: 'gas', t: 'Gás carbônico', icone: '⚫', por: 'O gás carbônico faz o caminho contrário: sai do sangue para o ar.' },
        { id: 'poeira', t: 'Poeira', icone: '🟤', por: 'A poeira ficou presa lá no nariz e na traqueia. Quem passa para o sangue é o oxigênio.' },
      ],
      por: 'O oxigênio do ar atravessa a parede fininha do alvéolo e entra no sangue. São milhões de alvéolos fazendo isso ao mesmo tempo!' },
    { tipo: 'alveolos', parada: 'sai', q: 'E o que sai do sangue para o ar, para ir embora quando a gente expira?',
      ops: [
        { id: 'gas', t: 'Gás carbônico', icone: '⚫', certa: true },
        { id: 'oxigenio', t: 'Oxigênio', icone: '🔵', por: 'O oxigênio está entrando no sangue. O que sai é o gás carbônico, que o corpo não quer mais.' },
        { id: 'saliva', t: 'Saliva', icone: '💧', por: 'A saliva fica na boca. Do sangue para o ar sai o gás carbônico.' },
      ],
      por: 'O gás carbônico é o que sobra quando as células usam o oxigênio. Ele sai do sangue para o alvéolo e vai embora na expiração. Essa é a troca de gases!' },
    { tipo: 'circulacao', parada: 'carona', q: 'Quem leva o oxigênio pelo sangue até o corpo todo?',
      ops: [
        { id: 'hemacias', t: 'As hemácias (glóbulos vermelhos)', icone: '🔴', certa: true },
        { id: 'ossos', t: 'Os ossos', icone: '🦴', por: 'Os ossos sustentam o corpo. Quem carrega o oxigênio no sangue são as hemácias.' },
        { id: 'saliva', t: 'A saliva', icone: '💧', por: 'A saliva é da boca. No sangue, quem leva o oxigênio são as hemácias.' },
      ],
      por: 'As hemácias, os glóbulos vermelhos, carregam o oxigênio. O coração bombeia o sangue, que leva o oxigênio para o corpo todo.' },
  ];
}

// ---------- as perguntas da Fase 4: coração, célula e expiração ----------
// Fecha o ciclo e mostra as duas habilidades do 5º ano juntas: a célula usa o oxigênio (do ar) e a glicose (da comida)
// para fazer energia (EF05CI06), e o sangue distribui o oxigênio e leva embora o resíduo, o gás carbônico (EF05CI07).
function perguntasCelula() {
  return [
    { tipo: 'circulacao', parada: 'bomba', q: 'Este é o coração. O que ele faz com o sangue?',
      ops: [
        { id: 'bombeia', t: 'Bombeia: empurra o sangue para o corpo todo', icone: '❤️', certa: true },
        { id: 'filtra', t: 'Filtra o ar', icone: '🧽', por: 'Quem filtra o ar é o nariz. O coração é uma bomba que empurra o sangue para o corpo todo.' },
        { id: 'digere', t: 'Digere a comida', icone: '🍔', por: 'A comida é digerida no sistema digestório. O coração bombeia o sangue.' },
      ],
      por: 'O coração é uma bomba de músculo: a cada batida, empurra o sangue cheio de oxigênio para o corpo todo. É o "tum-tum" que a gente sente no peito!' },
    { tipo: 'celula', parada: 'energia', q: 'O sangue chegou a uma célula do músculo da perna. Para fazer energia, ela precisa de duas coisas. Quais?',
      ops: [
        { id: 'oxiglicose', t: 'Oxigênio (do ar) e glicose (da comida)', icone: '⚡', certa: true },
        { id: 'aguasal', t: 'Água e sal', icone: '🧂', por: 'Água e sal também são importantes, mas a energia vem do oxigênio junto com a glicose.' },
        { id: 'sooxigenio', t: 'Só oxigênio', icone: '🔵', por: 'Só oxigênio não basta: a célula precisa também da glicose, que veio da comida.' },
      ],
      por: 'A célula junta o oxigênio, que veio da respiração, com a glicose, que veio da digestão, e faz energia. Por isso a respiração e a digestão trabalham juntas!' },
    { tipo: 'expirar', parada: 'sobra', q: 'Quando a célula faz energia, sobra um gás que o corpo não quer. Qual é?',
      ops: [
        { id: 'gas', t: 'Gás carbônico', icone: '⚫', certa: true },
        { id: 'oxigenio', t: 'Oxigênio', icone: '🔵', por: 'O oxigênio foi usado para fazer energia. O que sobra é o gás carbônico.' },
        { id: 'poeira', t: 'Poeira', icone: '🟤', por: 'A poeira ficou lá no nariz. O que sobra na célula é o gás carbônico.' },
      ],
      por: 'O gás carbônico é o resto que sobra na célula. O sangue leva ele de volta para os pulmões, para ir embora.' },
    { tipo: 'expirar', parada: 'expirar', q: 'O sangue trouxe o gás carbônico de volta aos pulmões. Como ele sai do corpo?',
      ops: [
        { id: 'expiracao', t: 'Na expiração: o diafragma sobe e o ar sai pelo nariz', icone: '😮‍💨', certa: true },
        { id: 'suor', t: 'Pelo suor', icone: '💦', por: 'O suor ajuda a refrescar o corpo. O gás carbônico sai quando a gente solta o ar, na expiração.' },
        { id: 'xixi', t: 'Pelo xixi', icone: '🚽', por: 'O xixi leva outras sobras. O gás carbônico sai pelo ar, na expiração.' },
      ],
      por: 'Na expiração, o diafragma sobe, os pulmões esvaziam e o ar sai levando o gás carbônico. Inspira, expira: o ciclo da respiração!' },
  ];
}

// ---------- habilidades (relatório) ----------
const TIPOS_RESP = {
  celula: { bncc: 'EF05CI06', id: 'resp-celula', titulo: 'A célula usa oxigênio e glicose', icone: '⚡', cor: '#ef6c00', regra: 'A célula faz energia com o oxigênio (da respiração) e a glicose (da digestão): os dois sistemas trabalham juntos.', exemplo: 'Oxigênio + glicose = energia.' },
  expirar: { bncc: 'EF05CI07', id: 'resp-expirar', titulo: 'O gás carbônico sai: expiração', icone: '😮‍💨', cor: '#5e35b1', regra: 'O gás carbônico que sobra nas células volta pelo sangue e sai dos pulmões na expiração.', exemplo: 'Na expiração, o ar leva o gás carbônico.' },
  alveolos: { bncc: 'EF05CI06', id: 'resp-alveolos', titulo: 'Alvéolos e a troca de gases', icone: '🫧', cor: '#ad1457', regra: 'O diafragma desce e o ar entra; nos alvéolos, o oxigênio passa para o sangue e o gás carbônico sai do sangue para o ar.', exemplo: 'O oxigênio passa do alvéolo para o sangue.' },
  circulacao: { bncc: 'EF05CI07', id: 'resp-circulacao', titulo: 'O sangue leva o oxigênio', icone: '🔴', cor: '#c62828', regra: 'As hemácias carregam o oxigênio, e o coração bombeia o sangue para o corpo todo.', exemplo: 'As hemácias levam o oxigênio.' },
  traqueia: { bncc: 'EF05CI06', id: 'resp-traqueia', titulo: 'Traqueia: cílios, anéis e tosse', icone: '〰️', cor: '#c2185b', regra: 'Os anéis deixam a traqueia sempre aberta; os cílios varrem o muco com a sujeira para cima; a tosse joga para fora o que entrou errado.', exemplo: 'Os cílios varrem o muco para cima.' },
  bronquios: { bncc: 'EF05CI06', id: 'resp-bronquios', titulo: 'Brônquios e bronquíolos', icone: '🌳', cor: '#6a1b9a', regra: 'A traqueia se divide em dois brônquios, que viram galhinhos (bronquíolos) e terminam nos alvéolos.', exemplo: 'Cada brônquio leva o ar a um pulmão.' },
  nariz: { bncc: 'EF05CI06', id: 'resp-nariz', titulo: 'Nariz: filtrar, aquecer e umedecer o ar', icone: '👃', cor: '#0277bd', regra: 'O ar deve entrar pelo nariz: os pelinhos e o muco seguram poeira e germes, e o ar fica quentinho e úmido.', exemplo: 'Os pelinhos do nariz seguram a poeira.' },
  garganta: { bncc: 'EF05CI06', id: 'resp-garganta', titulo: 'Faringe, laringe e cordas vocais', icone: '🗣️', cor: '#7b1fa2', regra: 'Da faringe, o ar vai para a laringe (onde ficam as cordas vocais, que fazem a voz) e depois para a traqueia.', exemplo: 'As cordas vocais vibram quando o ar passa.' },
};

export { AR, PARADAS_RESP, perguntasAlveolos, perguntasCelula, perguntasNariz, perguntasTraqueia, TIPOS_RESP };
