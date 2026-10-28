/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Fichas Coloridas. */

import { $, embaralhar } from './util.js?v=120';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=120';
import { SOM, tocar } from './som.js?v=120';
import { mascote, mostrar, telaJogos } from './telas.js?v=120';
import { escolherProfessorE } from './professor.js?v=120';
import { fimDaMissao } from './relatorio.js?v=120';

// ---------- Fichas Coloridas ----------
// Agrupar e trocar (a ideia do valor posicional, em base 3), cálculo e atenção. A criança joga contra o Plenix:
// na sua vez tira uma cartela e ganha essa quantidade de fichas vermelhas (1 ponto). Tocando em 3 fichas iguais, elas
// viram 1 ficha da cor seguinte: 3 vermelhas = 1 azul (3 pontos), 3 azuis = 1 amarela (9 pontos). Ao terminar toca em
// "Pronto"; se ainda dava para trocar, conta como esquecimento (atenção). Nos níveis Médio e Difícil o jogo pergunta
// quantos pontos ela tem (uma das respostas erradas é o número de fichas: o erro de contar fichas sem olhar o valor).
const FICHAS = { MAX_JOGADAS: 16 };
const CORES_FICHA = [
  { id: 'vermelha', nome: 'vermelha', plural: 'vermelhas', valor: 1, cor: '#e53935' },
  { id: 'azul', nome: 'azul', plural: 'azuis', valor: 3, cor: '#1e88e5' },
  { id: 'amarela', nome: 'amarela', plural: 'amarelas', valor: 9, cor: '#fbc02d' },
];
const NIVEIS_FICHAS = [
  { id: 'facil', titulo: 'Fácil', resumo: 'cartelas 1 a 3 · 1 amarela', max: 3, meta: 1, pergunta: false },
  { id: 'medio', titulo: 'Médio', resumo: 'cartelas 1 a 6 · 2 amarelas', max: 6, meta: 2, pergunta: true },
  { id: 'dificil', titulo: 'Difícil', resumo: 'cartelas 1 a 9 · 2 amarelas', max: 9, meta: 2, pergunta: true },
];
const TIPOS_FICHAS = {
  troca: { id: 'troca', titulo: 'Trocar 3 fichas iguais', icone: '🔁', cor: '#e53935',
    regra: 'Toda vez que junta 3 fichas iguais, troca pela ficha seguinte: 3 vermelhas = 1 azul e 3 azuis = 1 amarela. É a mesma ideia de juntar 10 unidades em 1 dezena.' },
  conta: { id: 'conta', titulo: 'Contar os pontos', icone: '🔢', cor: '#1e88e5',
    regra: 'Cada cor vale um tanto: vermelha 1, azul 3 e amarela 9. Para saber os pontos, multiplica cada cor pelo valor e soma (não é o número de fichas).' },
};
let fichasNivel = 1;
let fichas = null;   // a partida em andamento
const pontosDe = (m) => m.vermelha + m.azul * 3 + m.amarela * 9;
const podeTrocar = (m) => m.vermelha >= 3 || m.azul >= 3;

function telaFichasMenu() {
  pararFichas();
  mascote('davi-fichas', 'oi');
  $('fichas-niveis').innerHTML = NIVEIS_FICHAS.map((n, i) =>
    `<button class="chuva-modo${i === fichasNivel ? ' ativo' : ''}" type="button" data-nivel="${i}">${n.titulo}<small>${n.resumo}</small></button>`).join('');
  mostrar('tela-fichas-menu');
}
$('fichas-niveis').onclick = (e) => {
  const b = e.target.closest('.chuva-modo'); if (!b) return;
  SOM.clique();
  fichasNivel = Number(b.dataset.nivel);
  document.querySelectorAll('#fichas-niveis .chuva-modo').forEach((x) => x.classList.toggle('ativo', x === b));
};

function comecarFichas() {
  pararFichas();
  const nivel = NIVEIS_FICHAS[fichasNivel];
  definirMissao({ id: 'fichas-' + nivel.id, fichas: true, icone: '🔴', cor: '#e53935', titulo: `Fichas Coloridas (${nivel.titulo}: ${nivel.resumo})` });
  definirResultados([]);
  fichas = { nivel, rodando: true, aluno: { vermelha: 0, azul: 0, amarela: 0 }, rival: { vermelha: 0, azul: 0, amarela: 0 },
    jogadas: 0, trocas: 0, esquecimentos: 0, contasCertas: 0, contas: 0, selecao: [], fase: 'tirar', timers: [] };
  $('fichas-titulo').textContent = `🔴 ${nivel.titulo}`;
  $('fichas-meta').textContent = `Meta: ${'🟡'.repeat(nivel.meta)}`;
  mostrar('tela-fichas');
  desenharFichas();
  vezDoAluno();
}

function pararFichas() {
  if (fichas) { fichas.rodando = false; fichas.timers.forEach(clearTimeout); }
  fichas = null;
}
const depoisFichas = (ms, fn) => { const f = fichas; const t = setTimeout(() => { if (fichas === f && f.rodando) fn(); }, ms); f.timers.push(t); };
const msgFichas = (texto, tipo = '') => { $('fichas-msg').innerHTML = texto; $('fichas-msg').className = `fichas-msg ${tipo}`; };

// bandeja do aluno (fichas que dá para tocar) e a do Plenix (só para ver)
function desenharFichas() {
  const m = fichas.aluno;
  $('fichas-bandeja').innerHTML = CORES_FICHA.slice().reverse().map((c) => `
      <div class="fichas-linha" data-cor="${c.id}">
        <span class="fichas-rotulo">${c.plural} <b>×${c.valor}</b></span>
        <div class="fichas-pilha">${Array.from({ length: m[c.id] }, (_, i) =>
          `<button class="ficha" type="button" data-cor="${c.id}" data-i="${i}" style="--cor:${c.cor}" aria-label="Ficha ${c.nome}, vale ${c.valor}">${c.valor}</button>`).join('')
          || `<span class="ficha-vaga" style="--cor:${c.cor}" aria-hidden="true">${c.valor}</span>`}</div>
      </div>`).join('');
  const r = fichas.rival;
  $('fichas-rival').innerHTML = `<span class="fichas-rival-nome">🤖 Plenix</span>`
    + CORES_FICHA.slice().reverse().map((c) => `<span class="fichas-mini" style="--cor:${c.cor}">${r[c.id]}</span>`).join('')
    + `<span class="fichas-rival-pts">${pontosDe(r)} pts</span>`;
  fichas.selecao = [];
}

function vezDoAluno() {
  fichas.fase = 'tirar';
  $('btn-fichas-tirar').hidden = false;
  $('btn-fichas-tirar').disabled = false;
  $('btn-fichas-pronto').hidden = true;
  $('fichas-pergunta').hidden = true;
  msgFichas('Sua vez! Toque em <b>🃏 Tirar cartela</b>.');
}

function virarCartela(n) {
  const c = $('fichas-cartela');
  c.classList.remove('virou');
  void c.offsetWidth;
  c.classList.add('virou');
  c.innerHTML = `<span>${n}</span>`;
}

$('btn-fichas-tirar').onclick = () => {
  if (!fichas || fichas.fase !== 'tirar') return;
  const n = 1 + Math.floor(Math.random() * fichas.nivel.max);
  fichas.jogadas++;
  fichas.fase = 'trocar';
  fichas.t0 = performance.now();
  fichas.esqueceuNestaJogada = false;
  fichas.trocasNestaJogada = 0;
  fichas.cartela = n;
  $('btn-fichas-tirar').disabled = true;
  virarCartela(n);
  tocar([[392, 0.08], [523, 0.1]]);
  // as fichas vermelhas caem uma a uma na bandeja
  for (let i = 0; i < n; i++) {
    depoisFichas(250 + i * 140, () => {
      fichas.aluno.vermelha++;
      desenharFichas();
      const nova = $('fichas-bandeja').querySelector('.fichas-linha[data-cor="vermelha"] .ficha:last-child');
      if (nova) nova.classList.add('caiu');
      tocar([[660 + i * 30, 0.05]]);
    });
  }
  depoisFichas(300 + n * 140, () => {
    $('btn-fichas-tirar').hidden = true;
    $('btn-fichas-pronto').hidden = false;
    msgFichas(`Você ganhou <b>${n}</b> ficha${n === 1 ? '' : 's'} vermelha${n === 1 ? '' : 's'}! Toque em <b>3 fichas iguais</b> para trocar. Depois, <b>✔ Pronto</b>.`);
  });
};

// tocar em fichas: 3 iguais selecionadas viram 1 da cor seguinte (as amarelas não trocam)
$('fichas-bandeja').onclick = (e) => {
  const b = e.target.closest('.ficha');
  if (!b || !fichas || fichas.fase !== 'trocar') return;
  const cor = b.dataset.cor;
  if (cor === 'amarela') { msgFichas('A amarela é a ficha mais valiosa: ela não troca. 🟡'); return; }
  const chave = `${cor}-${b.dataset.i}`;
  if (fichas.selecao.length && !fichas.selecao[0].startsWith(cor)) {   // trocou de cor: recomeça a seleção
    fichas.selecao = [];
    $('fichas-bandeja').querySelectorAll('.ficha.escolhida').forEach((x) => x.classList.remove('escolhida'));
  }
  if (fichas.selecao.includes(chave)) {
    fichas.selecao = fichas.selecao.filter((x) => x !== chave);
    b.classList.remove('escolhida');
    return;
  }
  fichas.selecao.push(chave);
  b.classList.add('escolhida');
  tocar([[523 + fichas.selecao.length * 80, 0.06]]);
  if (fichas.selecao.length === 3) trocarFichas(cor);
};

function trocarFichas(cor) {
  const i = CORES_FICHA.findIndex((c) => c.id === cor);
  const proxima = CORES_FICHA[i + 1];
  fichas.fase = 'animando';
  // as 3 fichas se juntam (antecipação) e viram 1 da cor seguinte (encaixe com quique)
  $('fichas-bandeja').querySelectorAll('.ficha.escolhida').forEach((x) => x.classList.add('juntando'));
  depoisFichas(320, () => {
    fichas.aluno[cor] -= 3;
    fichas.aluno[proxima.id]++;
    fichas.trocas++;
    fichas.trocasNestaJogada++;
    desenharFichas();
    const nova = $('fichas-bandeja').querySelector(`.fichas-linha[data-cor="${proxima.id}"] .ficha:last-child`);
    if (nova) nova.classList.add('nasceu');
    tocar([[523, 0.08], [784, 0.14]]);
    if (fichas.aluno.amarela >= fichas.nivel.meta) {   // chegou na meta: trava os botões e termina
      fichas.fase = 'fim';
      $('btn-fichas-pronto').hidden = true;
      msgFichas('🏆 Você juntou as amarelas!', 'ok');
      depoisFichas(800, () => fimFichas('aluno'));
      return;
    }
    fichas.fase = 'trocar';
    msgFichas(`3 ${CORES_FICHA[i].plural} viraram 1 <b>${proxima.nome}</b>! ${podeTrocar(fichas.aluno) ? 'Ainda dá para trocar mais.' : 'Agora toque em <b>✔ Pronto</b>.'}`, 'ok');
  });
}

$('btn-fichas-pronto').onclick = () => {
  if (!fichas || fichas.fase !== 'trocar') return;
  if (podeTrocar(fichas.aluno)) {
    // esqueceu uma troca: avisa (conta uma vez por jogada) e deixa trocar
    if (!fichas.esqueceuNestaJogada) { fichas.esqueceuNestaJogada = true; fichas.esquecimentos++; }
    SOM.errado();
    const bandeja = $('fichas-bandeja');
    bandeja.classList.remove('tremer');
    void bandeja.offsetWidth;
    bandeja.classList.add('tremer');
    const cor = fichas.aluno.vermelha >= 3 ? 'vermelhas' : 'azuis';
    msgFichas(`Ainda dá para trocar! Você tem 3 ou mais fichas <b>${cor}</b>. 👀`, 'erro');
    return;
  }
  const tempo = (performance.now() - fichas.t0) / 1000;
  const m = fichas.aluno;
  const texto = `Cartela ${fichas.cartela}: ficou com ${m.amarela} amarela${m.amarela === 1 ? '' : 's'}, ${m.azul} azu${m.azul === 1 ? 'l' : 'is'} e ${m.vermelha} vermelha${m.vermelha === 1 ? '' : 's'}`;
  resultados.push({ m: TIPOS_FICHAS.troca, certa: texto, erros: fichas.esqueceuNestaJogada ? ['tocou em Pronto ainda com uma troca para fazer'] : [], tempo });
  if (fichas.nivel.pergunta) perguntarPontos(texto); else vezDoPlenix();
};

// quantos pontos? a resposta certa, o número de fichas (erro comum) e uma vizinha
function perguntarPontos(texto) {
  fichas.fase = 'pergunta';
  $('btn-fichas-pronto').hidden = true;
  const m = fichas.aluno, certo = pontosDe(m), qtd = m.vermelha + m.azul + m.amarela;
  const opcoes = new Set([certo]);
  if (qtd !== certo) opcoes.add(qtd);
  for (const d of [3, 1, -1, -3, 9, 2]) { if (opcoes.size >= 3) break; if (certo + d > 0) opcoes.add(certo + d); }
  $('fichas-opcoes').innerHTML = embaralhar([...opcoes]).map((v) => `<button class="mat-resposta" type="button" data-v="${v}">${v}</button>`).join('');
  $('fichas-pergunta').hidden = false;
  msgFichas('Conte: vermelha vale 1, azul vale 3, amarela vale 9.');
  fichas.textoConta = texto;
  fichas.t1 = performance.now();
}
$('fichas-opcoes').onclick = (e) => {
  const b = e.target.closest('.mat-resposta');
  if (!b || !fichas || fichas.fase !== 'pergunta') return;
  const m = fichas.aluno, certo = pontosDe(m), v = Number(b.dataset.v), qtd = m.vermelha + m.azul + m.amarela;
  fichas.contas++;
  const conta = `${m.amarela}×9 + ${m.azul}×3 + ${m.vermelha}×1 = ${certo} pontos`;
  if (v === certo) {
    fichas.contasCertas++;
    b.classList.add('certa');
    SOM.certo();
    msgFichas(`✅ Isso! ${conta}.`, 'ok');
    resultados.push({ m: TIPOS_FICHAS.conta, certa: conta, erros: [] });
  } else {
    b.classList.add('errada');
    SOM.errado();
    msgFichas(`Quase! ${conta}.`, 'erro');
    resultados.push({ m: TIPOS_FICHAS.conta, certa: conta, erros: [v === qtd && qtd !== certo ? `respondeu ${v} (contou as fichas, sem o valor de cada cor)` : `respondeu ${v}`] });
  }
  fichas.fase = 'animando';
  depoisFichas(1600, vezDoPlenix);
};

// vez do Plenix: tira uma cartela e faz as trocas sozinho, devagar, para a criança acompanhar
function vezDoPlenix() {
  $('fichas-pergunta').hidden = true;
  $('btn-fichas-pronto').hidden = true;
  $('btn-fichas-tirar').hidden = false;
  $('btn-fichas-tirar').disabled = true;
  if (fichas.jogadas >= FICHAS.MAX_JOGADAS) { fimFichas('tempo'); return; }
  fichas.fase = 'plenix';
  const n = 1 + Math.floor(Math.random() * fichas.nivel.max);
  msgFichas(`🤖 Vez do Plenix…`);
  depoisFichas(700, () => {
    virarCartela(n);
    fichas.rival.vermelha += n;
    desenharFichas();
    msgFichas(`🤖 O Plenix tirou <b>${n}</b> e ganhou ${n} vermelha${n === 1 ? '' : 's'}.`);
    const passo = () => {
      const r = fichas.rival;
      if (r.vermelha >= 3) { r.vermelha -= 3; r.azul++; msgFichas('🤖 O Plenix trocou 3 vermelhas por 1 azul.'); }
      else if (r.azul >= 3) { r.azul -= 3; r.amarela++; msgFichas('🤖 O Plenix trocou 3 azuis por 1 amarela.'); }
      else { if (r.amarela >= fichas.nivel.meta) fimFichas('plenix'); else depoisFichas(700, vezDoAluno); return; }
      desenharFichas();
      tocar([[392, 0.06], [494, 0.08]]);
      depoisFichas(900, passo);
    };
    depoisFichas(1000, passo);
  });
}

function fimFichas(quem) {
  const f = fichas;
  pararFichas();
  missao.extra = '';
  missao.resumo = [
    quem === 'aluno' ? `Ganhou do Plenix! Juntou ${f.nivel.meta} amarela${f.nivel.meta === 1 ? '' : 's'} em ${f.jogadas} jogadas.`
      : quem === 'plenix' ? `O Plenix chegou primeiro desta vez (${f.jogadas} jogadas). O aluno terminou com ${pontosDe(f.aluno)} pontos.`
        : `A partida acabou depois de ${f.jogadas} jogadas, com ${pontosDe(f.aluno)} pontos.`,
    `Fez ${f.trocas} troca${f.trocas === 1 ? '' : 's'}; esqueceu de trocar em ${f.esquecimentos} de ${f.jogadas} jogadas.`,
    ...(f.contas ? [`Contou os pontos certo em ${f.contasCertas} de ${f.contas} perguntas.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = quem === 'aluno' ? 'Você venceu! 🏆' : 'O Plenix venceu desta vez!';
  $('fim-texto').textContent = `${aluno}, você fez ${f.trocas} trocas e terminou com ${pontosDe(f.aluno)} pontos!`;
}

$('btn-fichas').onclick = () => { SOM.clique(); escolherProfessorE('Fichas Coloridas', telaFichasMenu); };
$('fichas-voltar').onclick = telaJogos;
$('btn-fichas-comecar').onclick = () => { SOM.clique(); comecarFichas(); };
$('fichas-sair').onclick = telaFichasMenu;

export { comecarFichas, pararFichas, telaFichasMenu };
