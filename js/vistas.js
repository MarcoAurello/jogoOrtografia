/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* De Lado e de Cima. */

import { $, embaralhar, sortear } from './util.js?v=104';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=104';
import { SOM, tocar } from './som.js?v=104';
import { mascote, mostrar, telaJogos } from './telas.js?v=104';
import { escolherProfessorE } from './professor.js?v=104';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=104';

// ---------- De Lado e de Cima ----------
// Percepção espacial e raciocínio sobre a ordem das cores. Uma pirâmide de argolas (a peça de baixo é a maior e a de
// cima é uma bolinha) aparece vista de lado e o aluno escolhe como ela fica vista de cima: anéis um dentro do outro,
// com a peça de baixo por fora e a de cima no meio. De vez em quando o jogo inverte: mostra o alvo visto de cima e o
// aluno acha a pirâmide de lado. Acertar sobe um nível (mais peças e mais opções); errar desce um.
// As opções erradas imitam os erros comuns: virar a ordem (pôr a peça de cima por fora), trocar duas peças vizinhas
// e errar uma cor.
const VISTAS = { PERGUNTAS: 15, NIVEL_MAX: 6, PAUSA: 2000 };
const PALETA_VISTAS = [
  { nome: 'vermelho', cor: '#e53935' },
  { nome: 'azul', cor: '#1e64d2' },
  { nome: 'amarelo', cor: '#f7c600' },
  { nome: 'azul-claro', cor: '#29b6f6' },
  { nome: 'roxo', cor: '#b0186b' },
  { nome: 'verde', cor: '#2e9e5b' },
];
// quantas peças, quantas cores podem aparecer, quantas opções e se uma cor pode repetir (sem ficar encostada)
const NIVEIS_VISTAS = [
  { pecas: 2, cores: 4, opcoes: 3, repete: false },
  { pecas: 3, cores: 4, opcoes: 3, repete: false },
  { pecas: 3, cores: 5, opcoes: 4, repete: false },
  { pecas: 4, cores: 5, opcoes: 4, repete: false },
  { pecas: 4, cores: 4, opcoes: 4, repete: true },
  { pecas: 5, cores: 6, opcoes: 4, repete: true },
];
const TIPOS_VISTAS = {
  cima: { id: 'vista-cima', titulo: 'De lado para de cima', icone: '🎯', cor: '#1e64d2',
    regra: 'Vista de cima, a peça de baixo (a maior) fica por fora e a peça de cima (a menor) fica no meio; as outras vão em ordem, de fora para dentro.' },
  lado: { id: 'vista-lado', titulo: 'De cima para de lado', icone: '🗼', cor: '#e53935',
    regra: 'O anel de fora é a peça de baixo, a maior; o círculo do meio é a bolinha que fica no alto. Monte a pirâmide de baixo para cima, de fora para dentro.' },
};
let vistas = null;   // a partida em andamento

function telaVistasMenu() {
  pararVistas();
  mascote('davi-vistas', 'oi');
  mostrar('tela-vistas-menu');
}

function comecarVistas() {
  pararVistas();
  definirMissao({ id: 'vistas', vistas: true, icone: '👁️', cor: '#1e64d2', titulo: 'De Lado e de Cima' });
  definirResultados([]);
  vistas = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, modo: 'cima', seguidas: 0, viradas: 0, inverterEm: sortear([3, 4]), duracao: 1,
    acertosModo: { cima: 0, lado: 0 }, feitasModo: { cima: 0, lado: 0 }, pergunta: null, timers: [], rodando: true };
  mostrar('tela-vistas');
  proximaVistas();
}

function pararVistas() {
  if (vistas) { vistas.rodando = false; vistas.timers.forEach(clearTimeout); }
  vistas = null;
}
const depoisVistas = (ms, fn) => { const v = vistas; const t = setTimeout(() => { if (vistas === v && v.rodando) fn(); }, ms); v.timers.push(t); };
const msgVistas = (texto, tipo = '') => { $('vistas-msg').innerHTML = texto; $('vistas-msg').className = `cores-msg ${tipo}`; };

// ----- desenhos (SVG): as peças vão de baixo (0, a maior) para cima (a última, a bolinha) -----
const larguras = (n) => Array.from({ length: n }, (_, i) => 112 - i * (68 / (n - 1)));
function svgLado(pecas, animar = true) {
  const n = pecas.length, ws = larguras(n), alt = 15, vao = 2, raio = ws[n - 1] / 2;
  const h = Math.ceil((n - 1) * (alt + vao) + raio + 6);
  let y = h - 3 - alt, partes = '';
  pecas.forEach((c, i) => {
    const cor = PALETA_VISTAS[c].cor, atraso = animar ? `style="animation-delay:${i * 110}ms"` : '';
    if (i < n - 1) {
      partes += `<rect class="vistas-peca" ${atraso} x="${(120 - ws[i]) / 2}" y="${y}" width="${ws[i]}" height="${alt}" rx="${alt / 2}" fill="${cor}"/>`;
      y -= alt + vao;
    } else {
      const base = y + alt;   // a bolinha fica em cima da última argola
      partes += `<path class="vistas-peca" ${atraso} d="M${60 - raio} ${base} A${raio} ${raio} 0 0 1 ${60 + raio} ${base} Z" fill="${cor}"/>`;
    }
  });
  return `<svg class="vistas-svg lado${animar ? '' : ' parado'}" viewBox="0 0 120 ${h}" aria-hidden="true">${partes}</svg>`;
}
function svgCima(pecas, animar = true) {
  const ws = larguras(pecas.length);
  const aneis = pecas.map((c, i) => `<circle class="vistas-anel" ${animar ? `style="animation-delay:${i * 90}ms"` : ''} cx="60" cy="60" r="${ws[i] / 2}" fill="${PALETA_VISTAS[c].cor}"/>`).join('');
  return `<svg class="vistas-svg cima${animar ? '' : ' parado'}" viewBox="0 0 120 120" aria-hidden="true">${aneis}</svg>`;
}
const desenhar = (vista, pecas, animar) => (vista === 'lado' ? svgLado(pecas, animar) : svgCima(pecas, animar));
const nomes = (pecas) => pecas.map((c) => PALETA_VISTAS[c].nome).join(', ');

// pirâmide sorteada: cores diferentes (ou repetidas sem ficarem encostadas, nos níveis altos)
function sortearPecas(nv) {
  const cores = embaralhar(PALETA_VISTAS.map((_, i) => i)).slice(0, nv.cores);
  if (!nv.repete) return embaralhar(cores).slice(0, nv.pecas);
  for (;;) {
    const p = Array.from({ length: nv.pecas }, () => sortear(cores));
    if (p.every((c, i) => i === 0 || c !== p[i - 1]) && new Set(p).size >= Math.min(3, nv.pecas - 1)) return p;
  }
}

// opções erradas que imitam os erros comuns; cada uma guarda o motivo (vai para o relatório)
function opcoesVistas(pecas, nv) {
  const chave = (p) => p.join(',');
  const erradas = new Map();
  const juntar = (p, motivo) => { const k = chave(p); if (k !== chave(pecas) && !erradas.has(k)) erradas.set(k, { pecas: p, motivo }); };
  juntar([...pecas].reverse(), 'virou a ordem (a peça de cima por fora)');
  for (const i of embaralhar(pecas.slice(1).map((_, k) => k))) {
    if (pecas[i] === pecas[i + 1]) continue;
    const p = [...pecas]; [p[i], p[i + 1]] = [p[i + 1], p[i]]; juntar(p, 'trocou duas peças vizinhas');
    break;
  }
  const usadas = [...new Set([...pecas, ...embaralhar(PALETA_VISTAS.map((_, i) => i)).slice(0, nv.cores)])];
  for (let t = 0; erradas.size < nv.opcoes && t < 40; t++) {
    const i = Math.floor(Math.random() * pecas.length);
    const outra = sortear(usadas.filter((c) => c !== pecas[i] && c !== pecas[i - 1] && c !== pecas[i + 1]));
    if (outra == null) continue;
    juntar(pecas.map((c, k) => (k === i ? outra : c)), 'errou uma cor');
  }
  // a ordem virada sempre entra (é o erro mais comum); as outras são sorteadas
  const lista = [...erradas.values()];
  const escolhidas = [lista[0], ...embaralhar(lista.slice(1))].slice(0, nv.opcoes - 1);
  return embaralhar([{ pecas, certa: true }, ...escolhidas]);
}

// de vez em quando inverte: depois de 3 ou 4 perguntas normais, 1 ou 2 ao contrário
function escolherModo() {
  if (vistas.modo === 'lado') return vistas.seguidas >= vistas.duracao ? 'cima' : 'lado';
  if (vistas.feitas < vistas.inverterEm) return 'cima';
  vistas.duracao = sortear([1, 2]);
  vistas.inverterEm = vistas.feitas + vistas.duracao + sortear([3, 4]);
  return 'lado';
}

function proximaVistas() {
  if (vistas.feitas >= VISTAS.PERGUNTAS) { terminarVistas(); return; }
  const nv = NIVEIS_VISTAS[vistas.nivel - 1];
  const modo = escolherModo();   // 'cima': mostra de lado e pede de cima; 'lado': o contrário
  const virou = vistas.feitas > 0 && modo !== vistas.modo;
  if (virou) vistas.viradas++;
  vistas.seguidas = modo === vistas.modo ? vistas.seguidas + 1 : 1;
  vistas.modo = modo;
  const pecas = sortearPecas(nv);
  const opcoes = opcoesVistas(pecas, nv);
  vistas.feitas++;
  vistas.feitasModo[modo]++;
  vistas.pergunta = { pecas, opcoes, modo, nv, logoAposVirar: virou, t0: performance.now() };
  hudVistas();
  const mostra = modo === 'cima' ? 'lado' : 'cima';
  $('vistas-rotulo').textContent = mostra === 'lado' ? '👀 Vista de lado' : '👀 Vista de cima';
  $('vistas-pergunta').textContent = modo === 'cima' ? 'Como ela fica vista de cima?' : 'Como ela fica vista de lado?';
  const fig = $('vistas-figura');
  fig.className = `vistas-figura ${mostra}`;
  fig.innerHTML = desenhar(mostra, pecas, true);
  if (virou) { void fig.offsetWidth; fig.classList.add('virou'); tocar([[392, 0.08], [523, 0.08], [659, 0.12]]); }
  msgVistas(virou ? (modo === 'lado' ? '🔄 Agora ao contrário: veja de cima e ache de lado!' : '🔄 De volta: veja de lado e ache de cima!')
    : vistas.feitas === 1 ? 'A peça de baixo é a maior. Pense em como fica olhando lá de cima!' : '', virou ? 'aviso' : '');
  const r = $('vistas-respostas');
  r.innerHTML = '';
  r.className = `vistas-respostas ${modo} n${opcoes.length}`;
  opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'vistas-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${150 + i * 80}ms`;
    b.setAttribute('aria-label', `${modo === 'cima' ? 'de fora para dentro' : 'de baixo para cima'}: ${nomes(o.pecas)}`);
    b.innerHTML = desenhar(modo, o.pecas, false);
    b.onclick = () => responderVistas(o, b);
    r.append(b);
  });
}

function hudVistas() {
  $('vistas-nivel').textContent = `👁️ Nível ${vistas.nivel} de ${VISTAS.NIVEL_MAX}`;
  $('vistas-pontos').textContent = vistas.pontos;
  $('vistas-contador').textContent = `${vistas.feitas}/${VISTAS.PERGUNTAS}`;
}

function responderVistas(opcao, botao) {
  const p = vistas && vistas.pergunta;
  if (!p || p.respondida || !vistas.rodando) return;
  p.respondida = true;
  const tempo = (performance.now() - p.t0) / 1000;
  const botoes = [...document.querySelectorAll('#vistas-respostas .vistas-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const certoEl = botoes[p.opcoes.findIndex((o) => o.certa)];
  const tipo = TIPOS_VISTAS[p.modo];
  const textoRel = `${p.pecas.length} peças, de baixo para cima: ${nomes(p.pecas)}`;
  if (opcao.certa) {
    const rapidez = Math.max(0, 1 - tempo / 20);
    vistas.pontos += 10 * vistas.nivel + Math.round(rapidez * 10) + (p.logoAposVirar ? 5 : 0);
    vistas.acertos++;
    vistas.acertosModo[p.modo]++;
    botao.classList.add('certa');
    resultados.push({ m: tipo, certa: textoRel, erros: [], nivel: vistas.nivel, tempo });
    vistas.nivel = Math.min(VISTAS.NIVEL_MAX, vistas.nivel + 1);
    vistas.nivelMax = Math.max(vistas.nivelMax, vistas.nivel);
    msgVistas(p.modo === 'cima' ? '✅ Isso! A peça de baixo fica por fora e a de cima, no meio.' : '✅ Isso! O anel de fora é a peça de baixo.', 'ok');
    SOM.certo();
  } else {
    const motivo = opcao.motivo || 'errou uma cor';
    botao.classList.add('errada');
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    const f = $('vistas-figura');
    f.classList.remove('tremer', 'virou'); void f.offsetWidth; f.classList.add('tremer');
    resultados.push({ m: tipo, certa: textoRel, erros: [`escolheu ${nomes(opcao.pecas)} (${motivo})`], nivel: vistas.nivel, tempo });
    vistas.nivel = Math.max(1, vistas.nivel - 1);
    const dica = motivo.startsWith('virou') ? 'Ao contrário! A peça de baixo é a maior, então fica por fora; a bolinha de cima fica no meio.'
      : motivo === 'trocou duas peças vizinhas' ? 'Quase! Duas peças trocaram de lugar: siga a ordem de baixo para cima, de fora para dentro.'
        : 'Quase! Confira a cor de cada peça.';
    msgVistas(dica, 'erro');
    SOM.errado();
  }
  hudVistas();
  depoisVistas(VISTAS.PAUSA + (opcao.certa ? 0 : 1500), proximaVistas);
}

function terminarVistas() {
  const { acertos, feitas, pontos, nivelMax, acertosModo, feitasModo } = vistas;
  const viradas = resultados.filter((r) => r.erros.some((e) => e.includes('virou a ordem'))).length;
  pararVistas();
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} e chegou ao nível ${nivelMax} de ${VISTAS.NIVEL_MAX}.`,
    `De lado para de cima: ${acertosModo.cima} de ${feitasModo.cima}. De cima para de lado: ${acertosModo.lado} de ${feitasModo.lado}.`,
    viradas ? `Virou a ordem (pôs a peça de cima por fora) ${viradas} ${viradas === 1 ? 'vez' : 'vezes'}.` : 'Não virou a ordem nenhuma vez.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Visão de águia! 👁️' : 'Fim das pirâmides!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas}, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
}

// teclas 1 a 4 escolhem a opção no computador
document.addEventListener('keydown', (e) => {
  if (!vistas || !$('tela-vistas').classList.contains('ativa')) return;
  const b = document.querySelector(`#vistas-respostas .vistas-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

$('btn-vistas').onclick = () => { SOM.clique(); escolherProfessorE('De Lado e de Cima', telaVistasMenu); };
$('vistas-voltar').onclick = telaJogos;
$('btn-vistas-comecar').onclick = () => { SOM.clique(); comecarVistas(); };
$('vistas-sair').onclick = telaVistasMenu;

export { comecarVistas, pararVistas, telaVistasMenu };
