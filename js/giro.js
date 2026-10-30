/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Giro Imaginário. */

import { $, embaralhar, sortear } from './util.js?v=146';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=146';
import { SOM, tocar } from './som.js?v=146';
import { mascote, mostrar, telaJogos } from './telas.js?v=146';
import { escolherProfessorE } from './professor.js?v=146';
import { segundos } from './luzes.js?v=146';
import { fimDaMissao } from './relatorio.js?v=146';

// ---------- Giro Imaginário ----------
// Rotação mental e orientação espacial. Aparece uma figura colorida e um comando de giro (cada giro é 1/4 de volta,
// como as setas do caderno): "girou 2 vezes para a direita". A criança imagina a figura girando e toca, entre 4
// alternativas, em como ela ficou. As erradas são a figura girada para o lado contrário, com giros a mais ou a menos,
// sem girar e, nos níveis altos, a figura espelhada (que nenhum giro consegue fazer). Os níveis vão de 1 giro até
// "vai e volta" (ex.: 2 para a direita e depois 1 para a esquerda). Depois da resposta, a figura gira na tela.
const GIRO = { RODADAS: 10, NIVEL_MAX: 6 };
const CORES_GIRO = ['#e53935', '#43a047', '#1e88e5', '#fbc02d'];
// comandos de cada nível: cada lista é uma sequência de giros (+ direita/horário, − esquerda/anti-horário)
const NIVEIS_GIRO = [
  { comandos: [[1]], espelho: false },
  { comandos: [[2], [-1]], espelho: false },
  { comandos: [[3], [-2], [-1], [2]], espelho: true },
  { comandos: [[2, -1], [1, 1], [-1, 2], [1, -2]], espelho: true },
  { comandos: [[3, -1], [-2, 3], [-3, 1], [-1, 3]], espelho: true },
  { comandos: [[2, -1, 2], [1, 2, -1], [-2, 1, -2], [3, -2, 1]], espelho: true },
];
// as figuras (viewBox 100 × 100); cada uma tem 4 partes, pintadas com 4 cores
const FIGURAS_GIRO = {
  quadrados: (c) => `<rect x="0" y="0" width="50" height="50" fill="${c[0]}"/><rect x="50" y="0" width="50" height="50" fill="${c[1]}"/>
    <rect x="50" y="50" width="50" height="50" fill="${c[2]}"/><rect x="0" y="50" width="50" height="50" fill="${c[3]}"/>
    <path d="M50 0V100M0 50H100" stroke="#1d2b3a" stroke-width="2"/><rect x="1" y="1" width="98" height="98" fill="none" stroke="#1d2b3a" stroke-width="2"/>`,
  xis: (c) => `<path d="M0 0H100L50 50Z" fill="${c[0]}"/><path d="M100 0V100L50 50Z" fill="${c[1]}"/><path d="M100 100H0L50 50Z" fill="${c[2]}"/><path d="M0 100V0L50 50Z" fill="${c[3]}"/>
    <path d="M0 0L100 100M100 0L0 100" stroke="#1d2b3a" stroke-width="2"/><rect x="1" y="1" width="98" height="98" fill="none" stroke="#1d2b3a" stroke-width="2"/>`,
  circulo: (c) => `<path d="M50 50V4A46 46 0 0 1 96 50Z" fill="${c[0]}"/><path d="M50 50H96A46 46 0 0 1 50 96Z" fill="${c[1]}"/>
    <path d="M50 50V96A46 46 0 0 1 4 50Z" fill="${c[2]}"/><path d="M50 50H4A46 46 0 0 1 50 4Z" fill="${c[3]}"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="#1d2b3a" stroke-width="2"/><path d="M50 4V96M4 50H96" stroke="#1d2b3a" stroke-width="2"/>`,
  ampulheta: (c) => `<path d="M2 2H50V50Z" fill="${c[0]}"/><path d="M50 2H98L50 50Z" fill="${c[1]}"/><path d="M98 98H50V50Z" fill="${c[2]}"/><path d="M50 98H2L50 50Z" fill="${c[3]}"/>
    <path d="M2 2H98L2 98H98Z" fill="none" stroke="#1d2b3a" stroke-width="2" stroke-linejoin="round"/><path d="M50 2V98" stroke="#1d2b3a" stroke-width="1.5"/>`,
  cruz: (c) => `<rect x="34" y="2" width="32" height="32" fill="${c[0]}"/><rect x="66" y="34" width="32" height="32" fill="${c[1]}"/>
    <rect x="34" y="66" width="32" height="32" fill="${c[2]}"/><rect x="2" y="34" width="32" height="32" fill="${c[3]}"/>
    <path d="M34 2H66V34H98V66H66V98H34V66H2V34H34Z" fill="none" stroke="#1d2b3a" stroke-width="2"/><rect x="34" y="34" width="32" height="32" fill="#fff" stroke="#1d2b3a" stroke-width="2"/>`,
  bolinhas: (c) => `<rect x="1" y="1" width="98" height="98" rx="10" fill="#fff" stroke="#1d2b3a" stroke-width="2"/>
    <circle cx="28" cy="28" r="15" fill="${c[0]}"/><circle cx="72" cy="28" r="15" fill="${c[1]}"/><circle cx="72" cy="72" r="15" fill="${c[2]}"/><circle cx="28" cy="72" r="15" fill="${c[3]}"/>`,
};
const NOMES_FIGURA = { quadrados: 'Quadrado em 4 partes', xis: 'Quadrado em X', circulo: 'Círculo', ampulheta: 'Ampulheta', cruz: 'Cruz', bolinhas: '4 bolinhas' };
const TIPOS_GIRO = {
  um: { id: 'giro-um', titulo: 'Um giro só', icone: '↻', cor: '#1e88e5',
    regra: 'Cada giro é 1/4 de volta: para a direita, o que estava em cima vai para o lado direito (como os ponteiros do relógio).' },
  varios: { id: 'giro-varios', titulo: 'Vários giros para um lado', icone: '🔄', cor: '#43a047',
    regra: 'Girar um passo de cada vez na imaginação, contando os giros; 2 giros é meia volta, 4 giros volta ao começo.' },
  vaivem: { id: 'giro-vaivem', titulo: 'Vai e volta', icone: '🔁', cor: '#e53935',
    regra: 'Quando gira para um lado e depois para o outro, um giro para a esquerda desfaz um giro para a direita: dá para fazer a conta antes de imaginar.' },
};
let giro = null;   // a partida em andamento

// desenha a figura girada (quartos de volta, sentido horário) e, se pedir, espelhada
const figuraSVG = (tipo, cores, quartos = 0, espelho = false) =>
  `<svg viewBox="0 0 100 100" class="figura-giro" aria-hidden="true"><g transform="rotate(${quartos * 90} 50 50)${espelho ? ' translate(100 0) scale(-1 1)' : ''}">${FIGURAS_GIRO[tipo](cores)}</g></svg>`;
const setas = (n) => (n > 0 ? '↻'.repeat(n) : '↺'.repeat(-n));
const textoComando = (cmd) => cmd.map((n, i) => `${i ? (i === cmd.length - 1 ? ' e depois ' : ', depois ') : ''}<b>${Math.abs(n)} ${Math.abs(n) === 1 ? 'vez' : 'vezes'}</b> para a <b>${n > 0 ? 'direita' : 'esquerda'}</b> <span class="giro-setas">${setas(n)}</span>`).join('');
const textoSimples = (cmd) => cmd.map((n) => `${Math.abs(n)} para a ${n > 0 ? 'direita' : 'esquerda'}`).join(', depois ');
const resto4 = (n) => ((n % 4) + 4) % 4;

function telaGiroMenu() {
  pararGiro();
  mascote('davi-giro', 'oi');
  mostrar('tela-giro-menu');
}

function comecarGiro() {
  pararGiro();
  definirMissao({ id: 'giro', giro: true, icone: '🔄', cor: '#1e88e5', titulo: 'Giro Imaginário (rotação mental)' });
  definirResultados([]);
  giro = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, erros: {} };
  mostrar('tela-giro');
  novaRodadaGiro();
}

function pararGiro() {
  if (giro) { giro.rodando = false; clearInterval(giro.relogio); clearTimeout(giro.proxima); (giro.animacao || []).forEach(clearTimeout); }
  giro = null;
}
const msgGiro = (texto, tipo = '') => { $('giro-msg').innerHTML = texto; $('giro-msg').className = `giro-msg ${tipo}`; };

function novaRodadaGiro() {
  const g = giro;
  if (!g || !g.rodando) return;
  if (g.feitas >= GIRO.RODADAS) { terminarGiro(); return; }
  g.feitas++;
  const nv = NIVEIS_GIRO[g.nivel - 1];
  const cmd = sortear(nv.comandos);
  const total = resto4(cmd.reduce((s, n) => s + n, 0));
  const tipo = sortear(Object.keys(FIGURAS_GIRO));
  const cores = embaralhar(CORES_GIRO);
  // alternativas: a certa e 3 erradas, todas diferentes entre si
  const certa = { quartos: total, espelho: false };
  const erradas = [];
  const juntar = (o) => { if (!erradas.some((x) => x.quartos === o.quartos && x.espelho === o.espelho) && !(o.quartos === certa.quartos && !o.espelho)) erradas.push(o); };
  if (nv.espelho) juntar({ quartos: total, espelho: true });   // espelhada: nenhum giro faz isso
  juntar({ quartos: resto4(-total), espelho: false });           // para o lado contrário
  [1, 3, 2].forEach((d) => juntar({ quartos: resto4(total + d), espelho: false }));   // giros a mais ou a menos / sem girar
  if (nv.espelho) juntar({ quartos: resto4(total + 1), espelho: true });
  const opcoes = embaralhar([{ ...certa, certa: true }, ...erradas.slice(0, 3)]);
  Object.assign(g, { nv, cmd, total, tipo, cores, opcoes, respondendo: true, t0: performance.now(), animacao: [] });
  $('giro-nivel').textContent = `🔄 Nível ${g.nivel} de ${GIRO.NIVEL_MAX}`;
  $('giro-pontos').textContent = g.pontos;
  $('giro-contador').textContent = `Rodada ${g.feitas} de ${GIRO.RODADAS}`;
  $('giro-modelo').innerHTML = figuraSVG(tipo, cores);
  $('giro-modelo').style.setProperty('--giro', '0deg');
  $('giro-comando').innerHTML = `A figura girou ${textoComando(cmd)}. Como ela ficou?`;
  $('giro-opcoes').innerHTML = opcoes.map((o, i) =>
    `<button class="giro-opcao" type="button" data-i="${i}" aria-label="Alternativa ${i + 1}">${figuraSVG(tipo, cores, o.quartos, o.espelho)}</button>`).join('');
  msgGiro('Imagine a figura girando e toque na resposta.');
  clearInterval(g.relogio);
  g.relogio = setInterval(() => { if (giro && giro.respondendo) $('giro-tempo').textContent = `⏱ ${segundos((performance.now() - giro.t0) / 1000)}`; }, 200);
}

// tipo do erro, para o relatório
function tipoDoErroGiro(o, g) {
  if (o.espelho) return 'escolheu a figura espelhada';
  if (o.quartos === 0) return 'escolheu a figura sem girar';
  if (o.quartos === resto4(-g.total)) return 'girou para o lado contrário';
  return 'girou vezes a mais ou a menos';
}

// depois da resposta, a figura do alto gira passo a passo, mostrando o caminho certo
function animarGiro(g) {
  let angulo = 0, atraso = 300;
  const modelo = $('giro-modelo');
  for (const n of g.cmd) {
    for (let k = 0; k < Math.abs(n); k++) {
      angulo += n > 0 ? 90 : -90;
      const a = angulo;
      g.animacao.push(setTimeout(() => { modelo.style.setProperty('--giro', `${a}deg`); tocar([[n > 0 ? 523 : 440, 0.08]]); }, atraso));
      atraso += 520;
    }
  }
  return atraso;
}

$('giro-opcoes').onclick = (ev) => {
  const btn = ev.target.closest('.giro-opcao');
  const g = giro;
  if (!btn || !g || !g.respondendo) return;
  g.respondendo = false;
  clearInterval(g.relogio);
  const o = g.opcoes[Number(btn.dataset.i)];
  const tempo = (performance.now() - g.t0) / 1000;
  const tipo = g.cmd.length > 1 ? TIPOS_GIRO.vaivem : Math.abs(g.cmd[0]) > 1 ? TIPOS_GIRO.varios : TIPOS_GIRO.um;
  const certa = `${NOMES_FIGURA[g.tipo]}: girou ${textoSimples(g.cmd)}`;
  document.querySelectorAll('.giro-opcao').forEach((b) => { b.disabled = true; if (g.opcoes[Number(b.dataset.i)].certa) b.classList.add('certa'); });
  if (o.certa) {
    const bom = 2 + g.cmd.reduce((s, n) => s + Math.abs(n), 0) * 1.2;
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = 20 * g.nivel + bonus;
    g.pontos += ganho;
    g.acertos++;
    resultados.push({ m: tipo, certa, erros: [], nivel: g.nivel, tempo });
    SOM.certo();
    msgGiro(`✅ Isso! +${ganho} pontos em ${segundos(tempo)}. Veja ela girando:`, 'ok');
    g.nivel = Math.min(GIRO.NIVEL_MAX, g.nivel + 1);
  } else {
    const erro = tipoDoErroGiro(o, g);
    g.erros[erro] = (g.erros[erro] || 0) + 1;
    btn.classList.add('errada');
    resultados.push({ m: tipo, certa, erros: [erro], nivel: g.nivel, tempo });
    SOM.errado();
    msgGiro(`Não foi essa (${erro}). Veja a figura girando, passo a passo:`, 'erro');
    g.nivel = Math.max(1, g.nivel - 1);
  }
  g.nivelMax = Math.max(g.nivelMax, g.nivel);
  $('giro-pontos').textContent = g.pontos;
  const duracao = animarGiro(g);
  g.proxima = setTimeout(novaRodadaGiro, duracao + (o.certa ? 900 : 1800));
};

function terminarGiro() {
  const g = giro;
  pararGiro();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(g.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${g.pontos}. Chegou ao nível ${g.nivelMax} de ${GIRO.NIVEL_MAX}.`,
    `Acertou ${g.acertos} de ${g.feitas} giros.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: ótima rotação mental!',
    ...(tempos.length ? [`Tempo médio para responder certo: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = g.acertos === g.feitas ? 'Mestre dos giros! 🌀' : 'Fim dos giros!';
  $('fim-texto').textContent = `${aluno}, você acertou ${g.acertos} de ${g.feitas} e fez ${g.pontos} pontos!`;
}

$('btn-giro').onclick = () => { SOM.clique(); escolherProfessorE('Giro Imaginário', telaGiroMenu); };
$('giro-voltar').onclick = telaJogos;
$('btn-giro-comecar').onclick = () => { SOM.clique(); comecarGiro(); };
$('giro-sair').onclick = telaGiroMenu;

export { comecarGiro, GIRO, pararGiro, telaGiroMenu };
