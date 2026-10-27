/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Esquerda e Direita. */

import { $, sortear } from './util.js?v=99';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=99';
import { SOM, tocar } from './som.js?v=99';
import { mascote, mostrar, telaJogos } from './telas.js?v=99';
import { escolherProfessorE } from './professor.js?v=99';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=99';

// ---------- Esquerda e Direita ----------
// Lateralidade, atenção e controle inibitório. A mesa tem um buraco em cada canto e uma bola de cada lado.
// No meio aparecem setas: uma seta deitada (← ou →) diz qual bola jogar e a seta em pé (↑ ou ↓) diz para onde;
// só aquela bola deve ser jogada. A partir do nível 4, às vezes aparecem duas setas em pé: as duas bolas são
// jogadas, cada uma no sentido da sua seta (mesmo sentido ou, do nível 5 em diante, sentidos opostos).
// Quanto mais rápido, mais pontos. Dois acertos seguidos sobem um nível; um erro desce.
// A bola vai com o dedo (deslizar para cima ou para baixo na metade da mesa) ou tocando no buraco;
// no computador, W/S jogam a bola da esquerda e ↑/↓ a da direita.
const LADOS = { COMANDOS: 20, NIVEL_MAX: 8 };
// tempo para responder (s), chance de vir o comando com as duas bolas e se ele pode ter sentidos opostos
const NIVEIS_LADOS = [
  { tempo: 5, dupla: 0, oposto: false },
  { tempo: 4.5, dupla: 0, oposto: false },
  { tempo: 4, dupla: 0, oposto: false },
  { tempo: 4.5, dupla: 0.3, oposto: false },
  { tempo: 4.5, dupla: 0.4, oposto: true },
  { tempo: 4, dupla: 0.5, oposto: true },
  { tempo: 3.5, dupla: 0.5, oposto: true },
  { tempo: 3, dupla: 0.5, oposto: true },
];
const TIPOS_LADOS = {
  simples: { id: 'simples', titulo: 'Uma bola: lado e direção', icone: '➡️', cor: '#1e64d2',
    regra: 'A seta deitada mostra qual bola jogar (esquerda ou direita) e a seta em pé mostra se ela vai para cima ou para baixo. Só essa bola se mexe.' },
  mesmo: { id: 'mesmo', titulo: 'Duas bolas, mesmo sentido', icone: '⏬', cor: '#0a8f6a',
    regra: 'Duas setas em pé: as duas bolas vão juntas, cada uma para onde a sua seta aponta (aqui, as duas para o mesmo lado).' },
  oposto: { id: 'oposto', titulo: 'Duas bolas, sentidos opostos', icone: '↕️', cor: '#e53935',
    regra: 'Duas setas em pé apontando para lados diferentes: a bola da esquerda segue a seta da esquerda e a da direita segue a seta da direita.' },
};
const NOME_LADO = { E: 'esquerda', D: 'direita' };
const SETA_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M6 36h50V12l38 38-38 38V64H6z"/></svg>';
const GIRO_SETA = { direita: 0, baixo: 90, esquerda: 180, cima: -90 };
let lados = null;   // a partida em andamento

function telaLadosMenu() {
  pararLados();
  mascote('davi-lados', 'oi');
  mostrar('tela-lados-menu');
}

function comecarLados() {
  pararLados();
  definirMissao({ id: 'lados', lados: true, icone: '↔️', cor: '#0a8f6a', titulo: 'Esquerda e Direita' });
  definirResultados([]);
  lados = { nivel: 1, nivelMax: 1, seguidos: 0, feitos: 0, acertos: 0, pontos: 0, cmd: null, timers: [], rodando: true, ultimo: '' };
  $('lados-setas').innerHTML = '';
  $('lados-tempo').style.transition = 'none';
  $('lados-tempo').style.width = '0';
  ['E', 'D'].forEach((l) => { $(`lados-bola-${l}`).getAnimations().forEach((a) => a.cancel()); });
  hudLados();
  msgLados('Prepare-se…');
  mostrar('tela-lados');
  let n = 3;
  const contar = () => {
    if (n === 0) { $('lados-contagem').textContent = ''; proximoLados(); return; }
    $('lados-contagem').textContent = n--;
    SOM.clique();
    depoisLados(650, contar);
  };
  contar();
}

function pararLados() {
  if (lados) { lados.rodando = false; lados.timers.forEach(clearTimeout); }
  lados = null;
  $('lados-contagem').textContent = '';
}
const depoisLados = (ms, fn) => { const j = lados; const t = setTimeout(() => { if (lados === j && j.rodando) fn(); }, ms); j.timers.push(t); return t; };
const msgLados = (texto, tipo = '') => { $('lados-msg').innerHTML = texto; $('lados-msg').className = `cores-msg ${tipo}`; };
const setaHTML = (dir, rotulo = '') => `<span class="lados-seta" style="--giro:${GIRO_SETA[dir]}deg">${SETA_SVG}${rotulo ? `<small>${rotulo}</small>` : ''}</span>`;

function hudLados() {
  $('lados-nivel').textContent = `↔️ Nível ${lados.nivel} de ${LADOS.NIVEL_MAX}`;
  $('lados-pontos').textContent = lados.pontos;
  $('lados-contador').textContent = `${lados.feitos}/${LADOS.COMANDOS}`;
}

// sorteia o próximo comando (sem repetir o anterior igualzinho)
function sortearComando(nv) {
  for (;;) {
    let cmd;
    if (Math.random() < nv.dupla) {
      const E = sortear(['cima', 'baixo']);
      const D = nv.oposto && Math.random() < 0.5 ? (E === 'cima' ? 'baixo' : 'cima') : E;
      cmd = { dupla: true, dirs: { E, D }, tipo: E === D ? TIPOS_LADOS.mesmo : TIPOS_LADOS.oposto };
    } else {
      cmd = { dupla: false, lado: sortear(['E', 'D']), dir: sortear(['cima', 'baixo']), tipo: TIPOS_LADOS.simples };
    }
    const chave = cmd.dupla ? `2${cmd.dirs.E}${cmd.dirs.D}` : `1${cmd.lado}${cmd.dir}`;
    if (chave !== lados.ultimo) { lados.ultimo = chave; return cmd; }
  }
}

const textoComando = (c) => (c.dupla
  ? `as duas bolas: esquerda para ${c.dirs.E}, direita para ${c.dirs.D}`
  : `a bola da ${NOME_LADO[c.lado]} para ${c.dir}`);

function proximoLados() {
  if (lados.feitos >= LADOS.COMANDOS) { terminarLados(); return; }
  const nv = NIVEIS_LADOS[lados.nivel - 1];
  const cmd = sortearComando(nv);
  cmd.feitos = { E: null, D: null };
  cmd.t0 = performance.now();
  cmd.limite = nv.tempo;
  lados.cmd = cmd;
  lados.feitos++;
  hudLados();
  msgLados('');
  $('lados-mesa').querySelectorAll('.lados-buraco').forEach((b) => b.classList.remove('certo', 'errado'));
  const setas = $('lados-setas');
  setas.className = `lados-setas${cmd.dupla ? ' dupla' : ''}`;
  setas.innerHTML = cmd.dupla
    ? setaHTML(cmd.dirs.E, 'E') + setaHTML(cmd.dirs.D, 'D')
    : setaHTML(cmd.lado === 'E' ? 'esquerda' : 'direita') + setaHTML(cmd.dir);
  // barra do tempo: começa cheia e esvazia até o limite
  const barra = $('lados-tempo');
  barra.style.transition = 'none';
  barra.style.width = '100%';
  void barra.offsetWidth;
  barra.style.transition = `width ${nv.tempo}s linear`;
  barra.style.width = '0';
  cmd.timer = depoisLados(nv.tempo * 1000, () => {
    const c = lados.cmd;
    if (!c || c.resolvido) return;
    const so = ['E', 'D'].filter((l) => c.feitos[l]);
    resolverLados(false, c.dupla && so.length ? `jogou só a bola da ${NOME_LADO[so[0]]}` : 'não jogou a tempo');
  });
}

// a bola vai até o buraco: antecipação (encolhe para o outro lado), viagem esticada e cai no buraco
function jogarBola(lado, dir, certo) {
  const bola = $(`lados-bola-${lado}`);
  const alvo = dir === 'cima' ? '13%' : '87%', antes = dir === 'cima' ? '53%' : '47%';
  bola.getAnimations().forEach((a) => a.cancel());
  const ida = bola.animate([
    { top: '50%', transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
    { top: antes, transform: 'translate(-50%, -50%) scale(1.15, 0.85)', opacity: 1, offset: 0.18 },
    { top: alvo, transform: 'translate(-50%, -50%) scale(0.88, 1.15)', opacity: 1, offset: 0.78 },
    { top: alvo, transform: 'translate(-50%, -50%) scale(0.25)', opacity: 0 },
  ], { duration: 380, easing: 'ease-in', fill: 'forwards' });
  const buraco = $('lados-mesa').querySelector(`.lados-buraco[data-lado="${lado}"][data-dir="${dir}"]`);
  ida.onfinish = () => {
    if (buraco) { buraco.classList.remove('certo', 'errado'); void buraco.offsetWidth; buraco.classList.add(certo ? 'certo' : 'errado'); }
    tocar(certo ? [[dir === 'cima' ? 660 : 440, 0.06]] : [[180, 0.1]]);
    // volta uma bola nova no meio (nasce pequena, passa do ponto e assenta)
    bola.animate([
      { top: '50%', transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
      { top: '50%', transform: 'translate(-50%, -50%) scale(1.15, 0.9)', opacity: 1, offset: 0.65 },
      { top: '50%', transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
    ], { duration: 320, delay: 260, easing: 'ease-out', fill: 'forwards' });
  };
}

function jogarLados(lado, dir) {
  const c = lados && lados.cmd;
  if (!c || c.resolvido || !lados.rodando || c.feitos[lado]) return;
  c.feitos[lado] = dir;
  if (!c.dupla) {
    const certo = lado === c.lado && dir === c.dir;
    jogarBola(lado, dir, certo);
    if (certo) resolverLados(true);
    else resolverLados(false, lado !== c.lado ? `jogou a bola da ${NOME_LADO[lado]} (era a da ${NOME_LADO[c.lado]})` : `jogou para ${dir} (era para ${c.dir})`);
    return;
  }
  const certo = c.dirs[lado] === dir;
  jogarBola(lado, dir, certo);
  if (!certo) resolverLados(false, `a bola da ${NOME_LADO[lado]} foi para ${dir} (era para ${c.dirs[lado]})`);
  else if (c.feitos.E && c.feitos.D) resolverLados(true);
}

function resolverLados(acertou, motivo) {
  const c = lados.cmd;
  c.resolvido = true;
  clearTimeout(c.timer);
  const tempo = (performance.now() - c.t0) / 1000;
  const barra = $('lados-tempo');
  barra.style.width = getComputedStyle(barra).width;   // congela a barra onde parou
  barra.style.transition = 'none';
  const texto = `${c.dupla ? '⬆⬇ ' : ''}Jogar ${textoComando(c)}`;
  if (acertou) {
    const rapidez = Math.max(0, 1 - tempo / c.limite);
    const ganhou = 10 * lados.nivel + Math.round(rapidez * 20);
    lados.pontos += ganhou;
    lados.acertos++;
    lados.seguidos++;
    resultados.push({ m: c.tipo, certa: texto, erros: [], nivel: lados.nivel, tempo });
    if (lados.seguidos >= 2) { lados.seguidos = 0; lados.nivel = Math.min(LADOS.NIVEL_MAX, lados.nivel + 1); }
    lados.nivelMax = Math.max(lados.nivelMax, lados.nivel);
    msgLados(`✅ Isso! +${ganhou} ${rapidez > 0.6 ? '⚡ Rapidinho!' : ''}`, 'ok');
    SOM.certo();
  } else {
    lados.seguidos = 0;
    resultados.push({ m: c.tipo, certa: texto, erros: [motivo], nivel: lados.nivel, tempo: motivo === 'não jogou a tempo' ? null : tempo });
    lados.nivel = Math.max(1, lados.nivel - 1);
    const mesa = $('lados-mesa');
    mesa.classList.remove('tremer'); void mesa.offsetWidth; mesa.classList.add('tremer');   // tremida curta: impacto do erro
    msgLados(`Ops! Era para jogar ${textoComando(c)}.`, 'erro');
    SOM.errado();
  }
  hudLados();
  depoisLados(acertou ? 900 : 1900, proximoLados);
}

// deslizar na metade da mesa (ou tocar no buraco) joga a bola daquele lado
let toqueLados = null;
$('lados-mesa').addEventListener('pointerdown', (e) => {
  if (!lados) return;
  const r = $('lados-mesa').getBoundingClientRect();
  toqueLados = { x: e.clientX, y: e.clientY, lado: e.clientX - r.left < r.width / 2 ? 'E' : 'D', buraco: e.target.closest('.lados-buraco') };
});
$('lados-mesa').addEventListener('pointerup', (e) => {
  const t = toqueLados;
  toqueLados = null;
  if (!t || !lados) return;
  const dy = e.clientY - t.y;
  if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(e.clientX - t.x) * 0.8) jogarLados(t.lado, dy < 0 ? 'cima' : 'baixo');
  else if (t.buraco) jogarLados(t.buraco.dataset.lado, t.buraco.dataset.dir);
});
$('lados-mesa').addEventListener('pointercancel', () => { toqueLados = null; });

const TECLAS_LADOS = { w: ['E', 'cima'], s: ['E', 'baixo'], ArrowUp: ['D', 'cima'], ArrowDown: ['D', 'baixo'] };
document.addEventListener('keydown', (e) => {
  if (!lados || !$('tela-lados').classList.contains('ativa')) return;
  const k = TECLAS_LADOS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k) return;
  e.preventDefault();
  jogarLados(k[0], k[1]);
});

function terminarLados() {
  const { acertos, feitos, pontos, nivelMax } = lados;
  pararLados();
  const duplas = resultados.filter((r) => r.m.id !== 'simples');
  missao.resumo = [
    `Acertou ${acertos} de ${feitos} comandos e chegou ao nível ${nivelMax} de ${LADOS.NIVEL_MAX}.`,
    ...(duplas.length ? [`Com as duas bolas: acertou ${duplas.filter((r) => !r.erros.length).length} de ${duplas.length}.`] : []),
    `Errou o lado (esquerda/direita) ${resultados.filter((r) => r.erros.some((x) => x.startsWith('jogou a bola'))).length} vez(es) e a direção (cima/baixo) ${resultados.filter((r) => r.erros.some((x) => / \(era para /.test(x))).length} vez(es).`,
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Reflexo de campeão! ⚡' : 'Fim do jogo!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitos} comandos, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
}

$('btn-lados').onclick = () => { SOM.clique(); escolherProfessorE('Esquerda e Direita', telaLadosMenu); };
$('lados-voltar').onclick = telaJogos;
$('btn-lados-comecar').onclick = () => { SOM.clique(); comecarLados(); };
$('lados-sair').onclick = telaLadosMenu;

export { comecarLados, pararLados, telaLadosMenu };
