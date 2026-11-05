/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Cartógrafo do Vale: o território fictício (uma grade), as camadas e as missões (separado da lógica do jogo). */

// O Vale do Rio Claro é fictício e feito para ensinar: tudo sai desta grade de 12 colunas × 14 linhas (norte em cima),
// então o relevo, o rio, a vegetação, a lupa e as respostas das missões nunca se contradizem.
export const COLUNAS = 12, LINHAS = 14;

// altitude de cada quadradinho: 0 planície, 1 colinas baixas, 2 planalto/serra, 3 montanha
const ALTITUDE = [
  '333321112233',
  '333221111233',
  '332211111222',
  '322111111122',
  '221111111112',
  '211111211111',
  '111110211111',
  '111110011111',
  '111111001111',
  '211111100111',
  '221111110011',
  '222111111001',
  '222211111100',
  '222221111000',
];
// vegetação e uso do solo: F floresta, L lavoura, C campo (vegetação rasteira), R rocha (pouca vegetação),
// U vila, A água (lagoa)
const USO = [
  'FFFFFCCCCCRR',
  'FFFFFCCCCCRR',
  'FFFFCCCCCCCC',
  'FFFCLLCCCCCC',
  'FFFFLLLCCCCC',
  'CLLFFLFCCCCC',
  'LLLLFFFLCCCC',
  'LLLLFFLLLCCC',
  'LLLLLFFUULCC',
  'CLLLLLLFFLCC',
  'CCLLLLLLFULC',
  'CCCLLLLLLFFL',
  'CCCCLLLLLLAA',
  'CCCCCLLLLAAA',
];
// o Rio Claro, da nascente (na montanha) até a Lagoa Grande: [coluna, linha]
export const RIO = [[1, 1], [2, 2], [2, 3], [3, 4], [4, 5], [5, 6], [5, 7], [6, 8], [7, 9], [8, 10], [9, 11], [10, 12]];
export const NASCENTE = [1, 1];

// as faixas de altitude e um metro "simulado" por quadradinho (varia um pouco para não ficar tudo igual)
export const NIVEIS = [
  { nome: 'Planície', cor: '#8bc34a', base: 90 },
  { nome: 'Colinas', cor: '#ffe082', base: 320 },
  { nome: 'Planalto', cor: '#ffb74d', base: 640 },
  { nome: 'Montanha', cor: '#a1887f', base: 980 },
];
export const USOS = {
  F: { nome: 'Floresta', cor: '#2e7d32', icone: '🌲' },
  L: { nome: 'Lavoura', cor: '#f9a825', icone: '🌾' },
  C: { nome: 'Campo', cor: '#c5e1a5', icone: '🌿' },
  R: { nome: 'Rocha', cor: '#d7ccc8', icone: '🪨' },
  U: { nome: 'Vila', cor: '#9e9e9e', icone: '🏘️' },
  A: { nome: 'Lagoa', cor: '#64b5f6', icone: '💧' },
};

// Cidades e estradas (a camada humana). pessoas: moradores (simulado); o tipo define o símbolo no mapa
export const LUGARES = [
  { id: 'vila', nome: 'Vila do Vale', tipo: 'vila', pessoas: 3000, celulas: [[7, 8], [8, 8]] },
  { id: 'beirario', nome: 'Beira-Rio', tipo: 'bairro', pessoas: 800, celulas: [[9, 10]] },
  { id: 'sitio', nome: 'Sítio do Planalto', tipo: 'sitio', pessoas: 12, celulas: [[10, 4]] },
  { id: 'fazenda', nome: 'Fazenda Boa Safra', tipo: 'sitio', pessoas: 30, celulas: [[2, 9]] },
];
export const ESTRADAS = [
  { nome: 'Estrada principal', pts: [[11, 6], [9, 7], [8, 8]] },
  { nome: 'Estrada da fazenda', pts: [[0, 9], [4, 9], [5, 8]] },
  { nome: 'Estrada do planalto', pts: [[8, 8], [8, 5], [10, 4], [11, 2]] },
];
// os quadradinhos por onde cada estrada passa (amostrando a linha)
const naEstrada = new Map();
for (const e of ESTRADAS) for (let i = 0; i < e.pts.length - 1; i++) {
  const [a, b] = [e.pts[i], e.pts[i + 1]];
  for (let s = 0; s <= 20; s++) {
    const c = Math.round(a[0] + (b[0] - a[0]) * s / 20), l = Math.round(a[1] + (b[1] - a[1]) * s / 20);
    naEstrada.set(`${c},${l}`, e.nome);
  }
}
const lugarDe = new Map(LUGARES.flatMap((lg) => lg.celulas.map(([c, l]) => [`${c},${l}`, lg])));

// cada quadradinho com tudo o que ele tem (a lupa e as missões leem daqui)
const noRio = new Set(RIO.map(([c, l]) => `${c},${l}`));
const distanciaDaAgua = (c, l) => {
  let d = 99;
  for (let ll = 0; ll < LINHAS; ll++) for (let cc = 0; cc < COLUNAS; cc++) {
    if (noRio.has(`${cc},${ll}`) || USO[ll][cc] === 'A') d = Math.min(d, Math.max(Math.abs(cc - c), Math.abs(ll - l)));
  }
  return d;
};
export const CELULAS = [];
for (let l = 0; l < LINHAS; l++) for (let c = 0; c < COLUNAS; c++) {
  const nivel = Number(ALTITUDE[l][c]);
  CELULAS.push({ c, l, nivel, metros: NIVEIS[nivel].base + ((c * 7 + l * 13) % 6) * 25, uso: USO[l][c],
    rio: noRio.has(`${c},${l}`), lagoa: USO[l][c] === 'A', nascente: c === NASCENTE[0] && l === NASCENTE[1], agua: distanciaDaAgua(c, l),
    estrada: naEstrada.get(`${c},${l}`) || null, lugar: lugarDe.get(`${c},${l}`) || null });
}
export const celula = (c, l) => CELULAS[l * COLUNAS + c];

// as camadas: o que cada uma mostra (e ensina)
export const CAMADAS = {
  relevo: { nome: 'Relevo', icone: '⛰️', ensina: 'As cores mostram a altitude: do verde (baixo) ao marrom (montanha).' },
  agua: { nome: 'Água', icone: '🌊', ensina: 'Rios, nascentes e lagoas: a água sempre desce do alto para o baixo.' },
  vegetacao: { nome: 'Vegetação', icone: '🌲', ensina: 'Florestas, lavouras, campos e vilas: como a terra é usada.' },
  cidades: { nome: 'Cidades', icone: '🏘️', ensina: 'Onde as pessoas moram e por onde passam as estradas.' },
};

// Missões. tipo 'legenda': completar a legenda (ensina as cores e símbolos); tipo 'ponto': escolher A, B ou C no mapa;
// tipo 'rota': escolher o trajeto A, B ou C. camadas: as que ajudam (aparecem na missão). certa: a opção certa.
// cada opção tem a explicação (o porquê de estar certa ou errada); aprendi: vai para o Diário de campo.
export const FASES_CARTOGRAFO = [
  { id: 'cartografo-1', nome: 'O Vale do Rio Claro', icone: '⛰️', camadas: ['relevo', 'agua'], missoes: [
    { tipo: 'legenda', titulo: 'Restaure a legenda do mapa', camadas: ['relevo', 'agua'],
      pergunta: 'A chuva apagou a legenda! Ligue as camadas, olhe o mapa e coloque cada nome no seu lugar.',
      itens: [
        { id: 'planicie', nome: 'Planície (terra baixa)', amostra: 'nivel0', dica: 'É a cor das terras baixas, perto da Lagoa Grande.' },
        { id: 'montanha', nome: 'Montanha (terra alta)', amostra: 'nivel3', dica: 'Fica nos cantos de cima do mapa, as partes mais altas.' },
        { id: 'rio', nome: 'Rio', amostra: 'rio', dica: 'É a linha azul que atravessa o vale.' },
        { id: 'nascente', nome: 'Nascente', amostra: 'nascente', dica: 'É onde o rio começa, no alto da montanha.' },
      ],
      distrator: 'Estrada',
      aprendi: 'Num mapa, as cores mostram a altitude (verde é baixo, marrom é alto) e as linhas azuis mostram os rios.' },
    { tipo: 'ponto', titulo: 'Onde nasce o Rio Claro?', camadas: ['relevo', 'agua'],
      pergunta: 'Os moradores querem proteger a nascente do rio. Em qual ponto ela fica?',
      pontos: { A: [1, 1], B: [10, 12], C: [5, 7] }, certa: 'A',
      explica: {
        A: 'Isso! A nascente fica no alto da montanha: a água da chuva se junta ali e começa a descer, formando o rio.',
        B: 'Aqui é a Lagoa Grande, onde o rio termina (a foz). O rio nasce do lado oposto, no alto.',
        C: 'Aqui o rio já está no meio do caminho. Siga a linha azul subindo até onde ela começa.',
      },
      dica: 'A água sempre desce do alto para o baixo. Ligue o ⛰️ Relevo e procure onde o rio está mais alto.',
      aprendi: 'Os rios nascem nas partes altas do relevo e correm para as partes baixas, até um lago ou o mar.' },
    { tipo: 'ponto', titulo: 'Onde construir a torre de vigia?', camadas: ['relevo', 'agua'],
      pergunta: 'O guarda do vale quer uma torre num lugar alto e bem perto do rio, para vigiar quem passa de barco. Onde?',
      pontos: { A: [11, 0], B: [6, 6], C: [7, 8] }, certa: 'B',
      explica: {
        A: 'É o ponto mais alto do mapa, mas fica muito longe do rio: de lá não daria para vigiar os barcos.',
        B: 'Perfeito! É um morro de planalto colado no rio: alto para enxergar longe e perto da água.',
        C: 'Fica ao lado do rio, mas é uma planície baixa: a torre não enxergaria longe.',
      },
      dica: 'Precisa ser alto (cor laranja ou marrom) E estar encostado na linha azul. Use as duas camadas juntas.',
      aprendi: 'Cruzar camadas ajuda a decidir: o relevo diz se o lugar é alto, e a hidrografia diz se está perto da água.' },
  ] },
  { id: 'cartografo-2', nome: 'A colheita do vale', icone: '🌾', camadas: ['relevo', 'agua', 'vegetacao'], missoes: [
    { tipo: 'legenda', titulo: 'Restaure a legenda da vegetação', camadas: ['vegetacao'],
      pergunta: 'A legenda da vegetação também apagou! Ligue a camada 🌲 e coloque cada nome no lugar.',
      itens: [
        { id: 'floresta', nome: 'Floresta', amostra: 'usoF', dica: 'Verde escuro, com árvores: nas montanhas e na beira do rio.' },
        { id: 'lavoura', nome: 'Lavoura (plantação)', amostra: 'usoL', dica: 'Amarelo com listras, como fileiras de plantação.' },
        { id: 'campo', nome: 'Campo (vegetação baixa)', amostra: 'usoC', dica: 'Verde clarinho: capim e arbustos, no planalto.' },
        { id: 'vila', nome: 'Vila', amostra: 'usoU', dica: 'Cinza, com casinhas: onde as pessoas moram.' },
      ],
      distrator: 'Deserto',
      aprendi: 'O mapa de uso do solo mostra como a terra é ocupada: florestas, plantações, campos e cidades.' },
    { tipo: 'ponto', titulo: 'Onde abrir uma nova plantação?', camadas: ['relevo', 'agua', 'vegetacao'],
      pergunta: 'Uma família quer plantar milho num terreno baixo, perto da água e sem derrubar floresta. Qual ponto?',
      pontos: { A: [2, 1], B: [7, 10], C: [10, 4] }, certa: 'B',
      explica: {
        A: 'É montanha com floresta: o terreno é íngreme (difícil de plantar) e seria preciso derrubar a mata.',
        B: 'Ótima escolha! Terreno baixo e mais plano, ao lado do rio para regar, sem derrubar nenhuma árvore.',
        C: 'É um campo plano, mas fica muito longe da água: as plantas ficariam sem irrigação.',
      },
      dica: 'Junte as três camadas: baixo (⛰️ verde ou amarelo), perto do 🌊 rio e sem 🌲 floresta.',
      aprendi: 'A agricultura prefere terrenos planos e baixos, com água por perto. Derrubar a mata não é a única saída.' },
    { tipo: 'rota', titulo: 'Qual estrada levar a colheita até a vila?', camadas: ['relevo', 'vegetacao'],
      pergunta: 'A colheita precisa chegar à vila 🏘️. A estrada não pode cortar a floresta da beira do rio nem subir a serra. Qual trajeto?',
      rotas: { A: [[1, 9], [2, 9], [6, 9], [7, 8]], B: [[1, 9], [3, 8], [4, 7], [5, 7], [6, 8], [7, 8]], C: [[1, 9], [0, 5], [1, 3], [4, 3], [6, 5], [7, 8]] },
      certa: 'A',
      explica: {
        A: 'Isso! O trajeto passa pelas lavouras, num terreno baixo: não derruba a mata e não precisa subir a serra.',
        B: 'Esse caminho corta a floresta da beira do rio (a mata ciliar), que protege a água contra a terra que desce com a chuva.',
        C: 'Esse caminho sobe a serra: a estrada ficaria íngreme, cara de construir e perigosa para os caminhões.',
      },
      dica: 'Ligue 🌲 Vegetação e ⛰️ Relevo: procure o caminho que só passa por lavoura (amarelo) e terra baixa.',
      aprendi: 'A mata ciliar (floresta na beira do rio) protege a água. Estradas e plantações devem respeitá-la.' },
  ] },
  { id: 'cartografo-3', nome: 'A cidade cresce', icone: '🏘️', camadas: ['relevo', 'agua', 'vegetacao', 'cidades'], missoes: [
    { tipo: 'legenda', titulo: 'Restaure a legenda da cidade', camadas: ['cidades'],
      pergunta: 'Agora o mapa mostra onde as pessoas vivem. Ligue a camada 🏘️ e coloque cada nome no lugar.',
      itens: [
        { id: 'estrada', nome: 'Estrada', amostra: 'estrada', dica: 'É a linha cinza com tracinhos brancos, por onde passam os carros.' },
        { id: 'cidade', nome: 'Cidade (muita gente)', amostra: 'vila', dica: 'É o maior grupo de casas, a Vila do Vale.' },
        { id: 'bairro', nome: 'Bairro', amostra: 'bairro', dica: 'É um grupo menor de casas, separado da vila.' },
        { id: 'sitio', nome: 'Sítio ou fazenda', amostra: 'sitio', dica: 'Casinha sozinha no campo: mora pouca gente.' },
      ],
      distrator: 'Aeroporto',
      aprendi: 'Mapas também mostram a ocupação humana: cidades, bairros, sítios e as estradas que ligam tudo.' },
    { tipo: 'ponto', titulo: 'Onde construir a ponte?', camadas: ['agua', 'cidades'],
      pergunta: 'A estrada da fazenda termina no rio. Onde construir a ponte para ela chegar à Vila do Vale?',
      pontos: { A: [6, 8], B: [10, 12], C: [2, 3] }, certa: 'A',
      explica: {
        A: 'Isso! Ali o rio é estreito e a estrada da fazenda e a vila ficam uma de cada lado: a ponte é curta e liga as duas.',
        B: 'Aqui é a Lagoa Grande: muito larga para uma ponte, e nenhuma estrada chega até ela.',
        C: 'Aqui o rio é estreito, mas fica no alto da serra, longe das estradas e da vila: a ponte não ligaria nada.',
      },
      dica: 'Ligue 🌊 Água e 🏘️ Cidades: procure onde a estrada para no rio, bem em frente à vila.',
      aprendi: 'Pontes são construídas onde as estradas precisam atravessar a água, de preferência onde o rio é mais estreito.' },
    { tipo: 'ponto', titulo: 'Onde há risco de enchente?', camadas: ['relevo', 'agua', 'cidades'],
      pergunta: 'Vem aí uma semana de muita chuva. Qual lugar com moradores corre MAIS risco de alagar?',
      pontos: { A: [9, 10], B: [10, 4], C: [2, 9] }, certa: 'A',
      explica: {
        A: 'Isso! O bairro Beira-Rio fica numa planície (terra baixa), colado no rio: quando o rio enche, a água chega nas casas.',
        B: 'O Sítio do Planalto fica no alto e longe do rio: a água da chuva escorre para baixo, não sobe até lá.',
        C: 'A fazenda fica em terreno mais alto e longe do rio: é difícil a enchente chegar lá.',
      },
      dica: 'Cruze três camadas: terra baixa (⛰️ verde), colada no 🌊 rio e com 🏘️ gente morando.',
      aprendi: 'Áreas baixas e coladas aos rios (as planícies de inundação) alagam nas cheias. Morar ali é perigoso.' },
    { tipo: 'ponto', titulo: 'Onde construir o hospital?', camadas: ['relevo', 'agua', 'cidades'],
      pergunta: 'O vale vai ganhar um hospital: perto de muita gente, ao lado de uma estrada e fora da enchente. Onde?',
      pontos: { A: [9, 10], B: [8, 7], C: [11, 2] }, certa: 'B',
      explica: {
        A: 'Tem gente perto, mas o Beira-Rio alaga nas cheias: o hospital ficaria ilhado justo quando mais precisam dele.',
        B: 'Perfeito! Fica colado na Vila do Vale (onde mora mais gente), na estrada principal e num terreno que não alaga.',
        C: 'Tem estrada, mas fica longe de quase todo mundo, lá no planalto: as pessoas demorariam a chegar.',
      },
      dica: 'Ligue 🏘️ Cidades para achar onde mora mais gente e ⛰️ Relevo + 🌊 Água para fugir da enchente.',
      aprendi: 'Serviços como hospitais e escolas devem ficar perto da população, com acesso fácil e longe de áreas de risco.' },
  ] },
  { id: 'cartografo-4', nome: 'O lugar que parecia perfeito', icone: '🤔', camadas: ['relevo', 'agua', 'vegetacao', 'cidades'], missoes: [
    { tipo: 'ponto', titulo: 'O condomínio à beira da lagoa', camadas: ['relevo', 'agua', 'cidades'],
      pergunta: 'Uma empresa quer construir casas num terreno plano e com vista para a água. Parece perfeito... Qual você recomenda?',
      pontos: { A: [10, 11], B: [10, 7], C: [1, 1] }, certa: 'B',
      explica: {
        A: 'Parece perfeito, mas é uma armadilha: é plano porque é a planície do rio, colada na lagoa. Nas cheias, alaga!',
        B: 'Boa escolha! É mais alto que o rio (não alaga), fica ao lado da estrada principal e perto da vila.',
        C: 'É no topo da montanha: íngreme, sem estrada e é onde nasce o rio, que precisa ser protegido.',
      },
      dica: 'Desconfie do óbvio: ligue o ⛰️ Relevo e veja se o terreno "bonito" é baixo demais.',
      aprendi: 'Nem todo lugar plano e perto da água é bom para morar: planícies junto a rios e lagoas alagam nas cheias.' },
    { tipo: 'ponto', titulo: 'Plantar até a beira do rio?', camadas: ['agua', 'vegetacao'],
      pergunta: 'Um fazendeiro quer plantar bem na beira do rio, "para a água ficar pertinho". Onde ele deveria plantar?',
      pontos: { A: [8, 9], B: [5, 10], C: [0, 13] }, certa: 'B',
      explica: {
        A: 'Parece prático, mas é a mata ciliar: derrubá-la deixa a terra cair no rio, que fica raso e barrento.',
        B: 'Isso! É lavoura a poucos passos do rio: tem água por perto e a floresta da beira do rio continua de pé.',
        C: 'Aqui fica longe demais da água: as plantas sofreriam na seca.',
      },
      dica: 'Ligue 🌲 Vegetação: a floresta colada no 🌊 rio deve ficar. Procure lavoura perto, mas não colada.',
      aprendi: 'A mata ciliar protege o rio. Plantar perto da água é bom, mas sem derrubar a floresta da margem.' },
    { tipo: 'ponto', titulo: 'De onde tirar água de beber?', camadas: ['agua', 'vegetacao', 'cidades'],
      pergunta: 'A vila precisa de água limpa para beber. A lagoa é grande e fica perto... De onde a água deve vir?',
      pontos: { A: [10, 12], B: [2, 3], C: [8, 10] }, certa: 'B',
      explica: {
        A: 'Parece prática, mas a lagoa recebe tudo o que escorre da vila, do bairro e das lavouras: é a água mais suja do vale.',
        B: 'Isso! Perto da nascente, na serra coberta de floresta, a água ainda não passou por casas nem plantações: é a mais limpa.',
        C: 'Aqui o rio acabou de passar pela vila e pelo bairro: a água já recebeu sujeira deles.',
      },
      dica: 'A água desce do alto para o baixo e carrega o que encontra. Procure um trecho ANTES das 🏘️ casas.',
      aprendi: 'A água mais limpa fica perto das nascentes protegidas por floresta, antes de passar por cidades e lavouras.' },
  ] },
];
