/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Frases, palavras e histórias do jogo O Reino da Sintaxe. */

// ---------- Ponte de Lacunas ----------
// t: frase com ___ no lugar da lacuna · c: palavra certa · e: as erradas · tipo: a habilidade (TIPOS_REINO)
// por: o porquê, curto, em linguagem de criança (aparece no erro e vai para o Diário).
// As erradas são erros de verdade (concordância, sentido), nunca outra resposta que também serviria.
const LACUNAS = {
  1: [
    { tipo: 'subst', t: 'Os ___ latem no quintal.', c: 'cachorros', e: ['cachorro', 'cachorrinho'], por: '"Os" está no plural, então vem palavra no plural: os cachorros.' },
    { tipo: 'subst', t: 'A ___ dorme no sofá.', c: 'gata', e: ['gatos', 'gato'], por: '"A" é feminino e singular: a gata.' },
    { tipo: 'subst', t: 'As ___ brincam no parque.', c: 'crianças', e: ['criança', 'menino'], por: '"As" pede palavra feminina no plural: as crianças.' },
    { tipo: 'subst', t: 'Um ___ pousou na janela.', c: 'passarinho', e: ['passarinhos', 'borboleta'], por: '"Um" é masculino e singular: um passarinho.' },
    { tipo: 'subst', t: 'Comprei duas ___ na feira.', c: 'laranjas', e: ['laranja', 'limão'], por: '"Duas" é mais de uma e é feminino: duas laranjas.' },
    { tipo: 'adj', t: 'A casa nova é ___.', c: 'amarela', e: ['amarelo', 'amarelas'], por: '"Casa" é feminino e singular: a casa é amarela.' },
    { tipo: 'adj', t: 'Os balões estão ___.', c: 'cheios', e: ['cheio', 'cheias'], por: '"Balões" é masculino e plural: cheios.' },
    { tipo: 'adj', t: 'Minha mochila está ___.', c: 'pesada', e: ['pesado', 'pesadas'], por: '"Mochila" é feminino e singular: pesada.' },
    { tipo: 'adj', t: 'As flores são ___.', c: 'cheirosas', e: ['cheiroso', 'cheirosa'], por: '"Flores" é feminino e plural: cheirosas.' },
    { tipo: 'adj', t: 'O sorvete está ___.', c: 'gelado', e: ['gelada', 'gelados'], por: '"Sorvete" é masculino e singular: gelado.' },
    { tipo: 'verbo', t: 'Os meninos ___ bola.', c: 'jogam', e: ['joga', 'jogo'], por: 'Quem joga? Os meninos (mais de um): eles jogam.' },
    { tipo: 'verbo', t: 'A professora ___ uma história.', c: 'conta', e: ['contam', 'contamos'], por: 'Quem conta? A professora (uma só): ela conta.' },
    { tipo: 'verbo', t: 'Nós ___ na piscina.', c: 'nadamos', e: ['nada', 'nadam'], por: 'Com "nós", o verbo termina em -mos: nós nadamos.' },
    { tipo: 'verbo', t: 'Eu ___ suco de uva.', c: 'bebo', e: ['bebe', 'bebem'], por: 'Com "eu", o verbo fica assim: eu bebo.' },
    { tipo: 'verbo', t: 'Ontem a chuva ___ forte.', c: 'caiu', e: ['cai', 'cairá'], por: '"Ontem" já passou, então o verbo fica no passado: caiu.' },
  ],
  2: [
    { tipo: 'pont', t: 'Que dia lindo___', c: '!', e: ['?', ','], por: 'Frase que mostra alegria ou surpresa termina com ponto de exclamação (!).' },
    { tipo: 'pont', t: 'Você quer brincar comigo___', c: '?', e: ['.', '!'], por: 'É uma pergunta: termina com ponto de interrogação (?).' },
    { tipo: 'pont', t: 'Comprei maçã___ banana e uva.', c: ',', e: ['.', '?'], por: 'Numa lista, a vírgula separa as coisas: maçã, banana e uva.' },
    { tipo: 'pont', t: 'A mãe chamou___ "Hora do banho!"', c: ':', e: ['?', '!'], por: 'Antes da fala de alguém, usamos dois-pontos (:).' },
    { tipo: 'prep', t: 'Ele gosta ___ chocolate.', c: 'de', e: ['em', 'por'], por: 'Quem gosta, gosta DE alguma coisa: gosta de chocolate.' },
    { tipo: 'prep', t: 'Ela saiu ___ guarda-chuva e ficou molhada.', c: 'sem', e: ['com', 'de'], por: 'Ficou molhada porque não levou: saiu SEM guarda-chuva.' },
    { tipo: 'prep', t: 'Eu concordo ___ você.', c: 'com', e: ['de', 'em'], por: 'Quem concorda, concorda COM alguém.' },
    { tipo: 'prep', t: 'O gato subiu ___ telhado.', c: 'no', e: ['do', 'pelo'], por: 'Subiu e ficou lá em cima: subiu NO telhado (em + o).' },
    { tipo: 'conect', t: 'Estava chovendo, ___ levei o guarda-chuva.', c: 'portanto', e: ['porém', 'ou'], por: 'Levar o guarda-chuva é o resultado da chuva: PORTANTO mostra consequência.' },
    { tipo: 'conect', t: 'Eu queria brincar, ___ estava chovendo.', c: 'mas', e: ['portanto', 'por isso'], por: 'Uma coisa atrapalha a outra: MAS mostra ideia contrária.' },
    { tipo: 'conect', t: 'Fiquei em casa ___ estava doente.', c: 'porque', e: ['porém', 'portanto'], por: 'Estar doente é o motivo: PORQUE mostra a causa.' },
    { tipo: 'conect', t: 'Você prefere suco ___ leite?', c: 'ou', e: ['e', 'mas'], por: 'É para escolher uma das duas coisas: OU.' },
    { tipo: 'conect', t: 'Estudei bastante, ___ tirei nota boa.', c: 'por isso', e: ['mas', 'ou'], por: 'A nota boa veio do estudo: POR ISSO mostra consequência.' },
    { tipo: 'conect', t: 'O time treinou muito, ___ perdeu o jogo.', c: 'porém', e: ['portanto', 'porque'], por: 'Treinou e mesmo assim perdeu: PORÉM mostra ideia contrária.' },
  ],
};

// ---------- Força das Classes ----------
// f: frase com a palavra da vez entre *asteriscos* · c: a classe (ve, su, aj, pn). Nada de palavra com duas classes
// possíveis na frase (ex.: "nada", "canto").
const CLASSES = {
  1: [
    { f: 'A menina *corre* no parque.', c: 've' }, { f: 'O cachorro *late* alto.', c: 've' },
    { f: 'Nós *pulamos* corda.', c: 've' }, { f: 'O bebê *dorme* no berço.', c: 've' },
    { f: 'Meu pai *cozinha* bem.', c: 've' }, { f: 'As aves *voam* longe.', c: 've' },
    { f: 'Eu *leio* um livro.', c: 've' }, { f: 'O sol *brilha* forte.', c: 've' },
    { f: 'O *gato* subiu na árvore.', c: 'su' }, { f: 'A *escola* fica perto.', c: 'su' },
    { f: 'Ganhei uma *bicicleta*.', c: 'su' }, { f: 'O *castelo* é enorme.', c: 'su' },
    { f: 'A *girafa* come folhas.', c: 'su' }, { f: 'Bebi um copo de *água*.', c: 'su' },
    { f: 'O *dragão* soltou fogo.', c: 'su' }, { f: 'A *mesa* está suja.', c: 'su' },
    { f: 'O céu está *azul*.', c: 'aj' }, { f: 'Que bolo *gostoso*!', c: 'aj' },
    { f: 'O elefante é *grande*.', c: 'aj' }, { f: 'A sopa está *quente*.', c: 'aj' },
    { f: 'Vi um filme *engraçado*.', c: 'aj' }, { f: 'O dia está *frio*.', c: 'aj' },
    { f: 'A fada é *bondosa*.', c: 'aj' }, { f: 'O caminho é *escuro*.', c: 'aj' },
  ],
  2: [
    { f: '*Ele* chegou cedo.', c: 'pn' }, { f: '*Nós* vamos ao circo.', c: 'pn' },
    { f: '*Ela* desenha muito bem.', c: 'pn' }, { f: '*Eu* adoro música.', c: 'pn' },
    { f: '*Eles* jogaram futebol.', c: 'pn' }, { f: 'Esta é a *minha* casa.', c: 'pn' },
    { f: 'O *nosso* time venceu.', c: 'pn' }, { f: '*Você* quer pipoca?', c: 'pn' },
    { f: 'O mago *guardou* o livro.', c: 've' }, { f: 'O cavaleiro *atravessou* a ponte.', c: 've' },
    { f: 'A princesa *escreveu* uma carta.', c: 've' }, { f: 'O *reino* fica além do rio.', c: 'su' },
    { f: 'A *coruja* piscou os olhos.', c: 'su' }, { f: 'O *mapa* mostrava o tesouro.', c: 'su' },
    { f: 'A torre era *altíssima*.', c: 'aj' }, { f: 'O dragão estava *furioso*.', c: 'aj' },
    { f: 'A poção era *verde*.', c: 'aj' }, { f: 'O mago parecia *cansado*.', c: 'aj' },
  ],
};

// ---------- Sequência Narrativa ----------
// As partes já vêm na ordem certa. cena: o que aparece no palco [emoji, x de 0 a 1, altura acima do chão, tamanho].
// heroi: onde o herói fica (0 a 1). absurdo: o que o palco mostra se a parte vier antes da hora (o erro vira piada
// e mostra a falta de lógica). fundo: 'campo', 'caverna', 'casa', 'praia', 'noite' ou 'cidade'.
const HISTORIAS = {
  1: [
    { titulo: 'O tesouro da caverna', partes: [
      { t: 'Léo encontrou um mapa antigo.', fundo: 'campo', heroi: 0.35, cena: [['🗺️', 0.55, 6, 34]] },
      { t: 'Ele seguiu o mapa até uma caverna.', fundo: 'campo', heroi: 0.3, cena: [['⛰️', 0.68, 0, 96]], absurdo: 'Léo seguiu um mapa que ele ainda nem tinha!' },
      { t: 'Dentro da caverna, achou um baú.', fundo: 'caverna', heroi: 0.35, cena: [['🧰', 0.6, 0, 40]], absurdo: 'Léo achou um baú dentro de uma caverna que ele nem tinha encontrado!' },
      { t: 'Ele abriu o baú e viu moedas de ouro!', fundo: 'caverna', heroi: 0.35, cena: [['💰', 0.6, 0, 40], ['✨', 0.62, 40, 26]], absurdo: 'Léo abriu um baú que ainda nem tinha achado!' },
    ] },
    { titulo: 'O bolo de aniversário', partes: [
      { t: 'Mila separou ovos, farinha e açúcar.', fundo: 'casa', heroi: 0.3, cena: [['🥚', 0.52, 0, 30], ['🌾', 0.64, 0, 34]] },
      { t: 'Ela misturou tudo numa tigela.', fundo: 'casa', heroi: 0.3, cena: [['🥣', 0.56, 0, 38]], absurdo: 'Mila mexeu uma tigela vazia: ainda não tinha os ingredientes!' },
      { t: 'O bolo assou no forno.', fundo: 'casa', heroi: 0.3, cena: [['🔥', 0.6, 0, 34], ['🍞', 0.6, 30, 30]], absurdo: 'Foi para o forno uma massa que nem existia!' },
      { t: 'Na festa, todos comeram o bolo.', fundo: 'casa', heroi: 0.3, cena: [['🎂', 0.58, 0, 42], ['🎉', 0.75, 40, 30]], absurdo: 'Todos comeram um bolo que ainda não tinha sido feito!' },
    ] },
    { titulo: 'A sementinha', partes: [
      { t: 'Ana plantou uma semente.', fundo: 'campo', heroi: 0.35, cena: [['🌰', 0.58, 0, 26]] },
      { t: 'Ela regou a terra todos os dias.', fundo: 'campo', heroi: 0.35, cena: [['💧', 0.58, 26, 26], ['🟫', 0.58, 0, 24]], absurdo: 'Ana regou a terra... mas não tinha plantado nada!' },
      { t: 'Nasceu um broto verde.', fundo: 'campo', heroi: 0.35, cena: [['🌱', 0.58, 0, 34]], absurdo: 'Nasceu um broto sem semente e sem água!' },
      { t: 'O broto virou uma linda flor.', fundo: 'campo', heroi: 0.35, cena: [['🌻', 0.58, 0, 52]], absurdo: 'A flor apareceu antes de o broto nascer!' },
    ] },
    { titulo: 'O gatinho perdido', partes: [
      { t: 'Um gatinho se perdeu na chuva.', fundo: 'noite', heroi: 0.2, cena: [['🐱', 0.6, 0, 32], ['🌧️', 0.6, 60, 40]] },
      { t: 'Tom ouviu um miado atrás do muro.', fundo: 'noite', heroi: 0.35, cena: [['🧱', 0.6, 0, 46]], absurdo: 'Tom ouviu um miado... mas nenhum gatinho estava perdido!' },
      { t: 'Ele levou o gatinho para casa.', fundo: 'casa', heroi: 0.35, cena: [['🐱', 0.45, 34, 26], ['🏠', 0.72, 0, 60]], absurdo: 'Tom levou para casa um gatinho que ele nem tinha encontrado!' },
      { t: 'O gatinho tomou leite e dormiu.', fundo: 'casa', heroi: 0.3, cena: [['🥛', 0.52, 0, 28], ['😺', 0.66, 0, 32]], absurdo: 'O gatinho tomou leite numa casa onde ele ainda nem estava!' },
    ] },
    { titulo: 'Dia de praia', partes: [
      { t: 'A família arrumou as malas.', fundo: 'casa', heroi: 0.35, cena: [['🧳', 0.58, 0, 38]] },
      { t: 'Eles foram de carro até a praia.', fundo: 'cidade', heroi: 0.25, cena: [['🚗', 0.6, 0, 46]], absurdo: 'Foram viajar sem malas, sem nada!' },
      { t: 'As crianças fizeram um castelo de areia.', fundo: 'praia', heroi: 0.3, cena: [['🏰', 0.6, 0, 42], ['🪣', 0.75, 0, 26]], absurdo: 'Fizeram um castelo de areia... no meio da cidade!' },
      { t: 'No fim do dia, voltaram felizes.', fundo: 'praia', heroi: 0.3, cena: [['🌅', 0.65, 40, 46]], absurdo: 'Voltaram da praia antes mesmo de chegar lá!' },
    ] },
  ],
  2: [
    { titulo: 'O passeio de barco', partes: [
      { t: 'Primeiro, Rafa vestiu o colete salva-vidas.', fundo: 'praia', heroi: 0.35, cena: [['🦺', 0.55, 6, 32]] },
      { t: 'Depois, entrou no barco com o avô.', fundo: 'praia', heroi: 0.45, cena: [['🚣', 0.6, 0, 46]], absurdo: 'Rafa entrou no barco sem colete!' },
      { t: 'De repente, o vento ficou muito forte.', fundo: 'praia', heroi: 0.45, cena: [['💨', 0.7, 30, 42], ['🌊', 0.55, 0, 36]], absurdo: 'Ventou forte... em cima de um barco que nem tinha saído!' },
      { t: 'Então, eles remaram até a margem.', fundo: 'praia', heroi: 0.3, cena: [['🏝️', 0.65, 0, 52]], absurdo: 'Remaram para fugir de um vento que ainda nem tinha chegado!' },
      { t: 'Por fim, tomaram chocolate quente em casa.', fundo: 'casa', heroi: 0.35, cena: [['☕', 0.58, 0, 32]], absurdo: '"Por fim" no meio da história? Eles ainda estavam no mar!' },
    ] },
    { titulo: 'A carta para a vovó', partes: [
      { t: 'Primeiro, Bia escreveu uma carta.', fundo: 'casa', heroi: 0.35, cena: [['📝', 0.56, 6, 32]] },
      { t: 'Em seguida, colocou a carta no envelope.', fundo: 'casa', heroi: 0.35, cena: [['✉️', 0.56, 6, 32]], absurdo: 'Bia colocou no envelope uma carta que ainda nem existia!' },
      { t: 'Depois, levou o envelope ao correio.', fundo: 'cidade', heroi: 0.35, cena: [['📮', 0.6, 0, 44]], absurdo: 'Bia foi ao correio com as mãos vazias!' },
      { t: 'Dias depois, a vovó recebeu a carta.', fundo: 'casa', heroi: 0.25, cena: [['👵', 0.6, 0, 44], ['✉️', 0.48, 20, 24]], absurdo: 'A vovó recebeu uma carta que ninguém tinha mandado!' },
      { t: 'Por fim, a vovó ligou para agradecer.', fundo: 'casa', heroi: 0.3, cena: [['📞', 0.58, 6, 32]], absurdo: 'A vovó agradeceu por uma carta que ela nem tinha recebido!' },
    ] },
    { titulo: 'A lagarta comilona', partes: [
      { t: 'Era uma vez uma lagarta comilona.', fundo: 'campo', heroi: 0.25, cena: [['🐛', 0.58, 0, 34]] },
      { t: 'Ela comeu folhas por muitos dias.', fundo: 'campo', heroi: 0.25, cena: [['🐛', 0.55, 0, 34], ['🍃', 0.68, 6, 30]], absurdo: '"Ela" quem? A história ainda não falou de ninguém!' },
      { t: 'Depois, fez um casulo e dormiu.', fundo: 'campo', heroi: 0.25, cena: [['🌿', 0.58, 0, 40], ['💤', 0.64, 40, 24]], absurdo: 'Um casulo apareceu do nada: a lagarta ainda nem tinha comido!' },
      { t: 'Semanas depois, o casulo se abriu.', fundo: 'campo', heroi: 0.25, cena: [['🌿', 0.58, 0, 40], ['✨', 0.6, 40, 30]], absurdo: 'Abriu um casulo que ainda nem existia!' },
      { t: 'Finalmente, saiu uma borboleta colorida!', fundo: 'campo', heroi: 0.25, cena: [['🦋', 0.6, 40, 44]], absurdo: 'Saiu uma borboleta... de onde, se não tinha casulo?' },
    ] },
    { titulo: 'O piquenique', partes: [
      { t: 'Primeiro, Davi preparou sanduíches.', fundo: 'casa', heroi: 0.35, cena: [['🥪', 0.56, 6, 32]] },
      { t: 'Depois, estendeu a toalha no parque.', fundo: 'campo', heroi: 0.35, cena: [['🧺', 0.58, 0, 34]], absurdo: 'Davi fez um piquenique sem comida nenhuma!' },
      { t: 'Logo em seguida, começou a chover.', fundo: 'noite', heroi: 0.35, cena: [['🌧️', 0.55, 60, 46], ['🧺', 0.58, 0, 30]], absurdo: 'Choveu em cima de um piquenique que ainda nem tinha começado!' },
      { t: 'Então, ele correu para baixo de uma árvore.', fundo: 'noite', heroi: 0.6, cena: [['🌳', 0.66, 0, 80]], absurdo: 'Davi correu da chuva antes de começar a chover!' },
      { t: 'Quando a chuva parou, o piquenique continuou.', fundo: 'campo', heroi: 0.35, cena: [['🌈', 0.6, 50, 56], ['🥪', 0.56, 0, 26]], absurdo: 'A chuva parou... sem nunca ter começado!' },
    ] },
    { titulo: 'O jogo da escola', partes: [
      { t: 'Primeiro, o time treinou a semana inteira.', fundo: 'campo', heroi: 0.35, cena: [['⚽', 0.56, 0, 28]] },
      { t: 'No dia do jogo, o time entrou em campo.', fundo: 'campo', heroi: 0.35, cena: [['🥅', 0.68, 0, 50]], absurdo: 'O time foi jogar sem nunca ter treinado!' },
      { t: 'No começo, o outro time fez um gol.', fundo: 'campo', heroi: 0.35, cena: [['🥅', 0.68, 0, 50], ['⚽', 0.7, 10, 22]], absurdo: 'Saiu um gol antes de o jogo começar!' },
      { t: 'Mas, no fim, o nosso time virou o jogo.', fundo: 'campo', heroi: 0.35, cena: [['⚽', 0.55, 0, 26], ['⚽', 0.65, 0, 26]], absurdo: 'Virou o jogo? Ninguém estava perdendo ainda!' },
      { t: 'Por isso, todos comemoraram com a taça.', fundo: 'campo', heroi: 0.35, cena: [['🏆', 0.58, 6, 44]], absurdo: 'Comemoraram uma vitória que ainda não tinha acontecido!' },
    ] },
  ],
};

// ---------- Habilidades (relatório) e Diário do Lexicógrafo ----------
// Cada tipo é uma linha do relatório e uma página do Diário (regra em linguagem de criança + um exemplo).
// bncc: a habilidade da BNCC (Língua Portuguesa, anos iniciais) que o tipo trabalha; vai no resumo do relatório:
//   EF03LP07 pontuação (. ? ! e dois-pontos no discurso direto) · EF03LP08 substantivos e verbos · EF03LP09 adjetivos
//   EF04LP06 concordância verbal · EF04LP07 concordância nominal (artigo, substantivo e adjetivo)
//   EF35LP06 pronomes que retomam o nome · EF35LP08 articuladores de sentido (tempo, causa, oposição, conclusão)
const TIPOS_REINO = {
  subst: { bncc: 'EF04LP07', id: 'reino-subst', titulo: 'Concordância do substantivo', icone: '📦', cor: '#1e64d2', regra: 'A palavra combina com o artigo: o/um (masculino), a/uma (feminino), os/as (plural).', exemplo: 'Os cachorros latem.' },
  adj: { bncc: 'EF04LP07', id: 'reino-adj', titulo: 'Concordância do adjetivo', icone: '🎨', cor: '#7b4fc9', regra: 'O adjetivo combina com o nome: casa amarela, balões cheios.', exemplo: 'As flores são cheirosas.' },
  verbo: { bncc: 'EF04LP06', id: 'reino-verbo', titulo: 'Concordância do verbo', icone: '🏃', cor: '#e5731f', regra: 'O verbo combina com quem faz a ação e com o tempo: eu bebo, nós nadamos, ontem caiu.', exemplo: 'Os meninos jogam bola.' },
  pont: { bncc: 'EF03LP07', id: 'reino-pont', titulo: 'Pontuação', icone: '❗', cor: '#c2185b', regra: 'Pergunta: ?  ·  surpresa ou alegria: !  ·  lista: vírgula  ·  antes de uma fala: dois-pontos.', exemplo: 'Você quer brincar comigo?' },
  prep: { bncc: 'EF35LP08', id: 'reino-prep', titulo: 'Preposições', icone: '🔗', cor: '#00897b', regra: 'Algumas palavras pedem uma ligação certa: gostar DE, concordar COM, sair SEM.', exemplo: 'Ele gosta de chocolate.' },
  conect: { bncc: 'EF35LP08', id: 'reino-conect', titulo: 'Conectivos', icone: '🧩', cor: '#5d4037', regra: 'MAS e PORÉM: ideia contrária. PORTANTO e POR ISSO: consequência. PORQUE: causa. OU: escolha.', exemplo: 'Estava chovendo, portanto levei o guarda-chuva.' },
  ve: { bncc: 'EF03LP08', id: 'reino-cl-ve', titulo: 'Verbo', icone: '⚡', cor: '#f5a000', regra: 'Verbo é a palavra da ação (correr, pular), do estado (ser, estar) ou do tempo (chover).', exemplo: 'A menina corre no parque.' },
  su: { bncc: 'EF03LP08', id: 'reino-cl-su', titulo: 'Substantivo', icone: '🧱', cor: '#8d5a2b', regra: 'Substantivo é o nome de tudo: pessoas, bichos, lugares, objetos e sentimentos.', exemplo: 'O gato subiu na árvore.' },
  aj: { bncc: 'EF03LP09', id: 'reino-cl-aj', titulo: 'Adjetivo', icone: '❄️', cor: '#0a8fc2', regra: 'Adjetivo é a característica: como a coisa é (azul, grande, gostoso).', exemplo: 'O céu está azul.' },
  pn: { bncc: 'EF35LP06', id: 'reino-cl-pn', titulo: 'Pronome', icone: '🔄', cor: '#8e44ad', regra: 'Pronome fica no lugar do nome ou mostra de quem é: eu, ele, nós, você, minha, nosso.', exemplo: 'Ele chegou cedo.' },
  seq: { bncc: 'EF35LP08', id: 'reino-seq', titulo: 'Sequência da história', icone: '📖', cor: '#2e7d32', regra: 'Uma história tem começo, meio e fim. Palavras como Primeiro, Depois, Então e Por fim mostram a ordem.', exemplo: 'Primeiro plantou, depois regou, por fim nasceu a flor.' },
};

// ---------- Livro das Crônicas ----------
// uma página do livro do reino para cada fase concluída: a ilustração (emojis) e uma historinha para ler
const CRONICAS = {
  ponte1: { cena: '🌲🌉🌲', titulo: 'A Floresta das Pontes', texto: 'As pontes da floresta tinham sumido. O Sintaxista completou as frases, e cada palavra certa virou uma tábua. Agora os bichos atravessam o rio de novo!' },
  classes1: { cena: '👾⚡🧱', titulo: 'O Vale dos Monstrinhos', texto: 'Monstrinhos bagunceiros roubaram as palavras do vale. Com o Cajado da Coesão, o Sintaxista descobriu quem era verbo, substantivo e adjetivo, e as palavras voltaram para casa.' },
  historia1: { cena: '📖✨🌻', titulo: 'As Histórias Embaralhadas', texto: 'Um vento forte espalhou as páginas dos livros. O Sintaxista colocou cada parte no lugar: começo, meio e fim. As histórias voltaram a fazer sentido!' },
  ponte2: { cena: '⛰️🚪🔑', titulo: 'As Portas da Montanha', texto: 'Na montanha, as portas só abriam com o sinal certo. Ponto, vírgula, porém, portanto... O Sintaxista escolheu cada um e chegou ao topo.' },
  classes2: { cena: '🐉🔄🏰', titulo: 'O Dragão da Desordem', texto: 'O Dragão da Desordem queria bagunçar todas as frases do reino. Até os pronomes ele tentou esconder! O Sintaxista venceu o dragão, e o castelo ficou em paz.' },
  historia2: { cena: '👑📜🎉', titulo: 'A Grande Crônica', texto: 'Com Primeiro, Depois, Então e Por fim, o Sintaxista escreveu a grande crônica do reino. O rei leu em voz alta, e todo mundo entendeu do começo ao fim. Viva o Sintaxista Mestre!' },
};

export { CLASSES, CRONICAS, HISTORIAS, LACUNAS, TIPOS_REINO };
