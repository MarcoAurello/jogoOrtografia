/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Quanto Tempo Passou? */

import { $, embaralhar, sortear } from './util.js?v=277';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=277';
import { frase, pararVoz, SOM, tocar } from './som.js?v=277';
import { mascote, mostrar, telaJogos } from './telas.js?v=277';
import { escolherProfessorE } from './professor.js?v=277';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=277';

// ---------- Quanto Tempo Passou? ----------
// Medida de tempo (intervalo entre dois horários, com AM e PM): uma frase do dia a dia ("A oficina começou às 09:15 AM e
// terminou às 09:45 AM"), os dois horários em relógio digital e 4 opções de tempo ("30 minutos", "1 hora e 20 minutos").
// As erradas imitam os erros comuns: fazer a conta como número comum (10:15 − 9:40 = 75), esquecer o AM/PM ao passar
// do meio-dia, contar só os minutos (esquecer as horas), errar a hora cheia e errar por 5 ou 10 minutos.
// Níveis: na mesma hora; passando de uma hora para a outra; horas e minutos; passando do meio-dia (AM → PM); minutos
// "quebrados"; e passando da meia-noite (PM → AM, no dia seguinte). Acertou: sobe um nível; errou: desce.
const INTERVALO = { RODADAS: 10, NIVEL_MAX: 6, PAUSA: 2800 };
const NIVEIS_IN = [
  { titulo: 'Na mesma hora', gerar: () => { const h = sortear([8, 9, 10, 2, 3, 4]); const a = 5 * (1 + Math.floor(Math.random() * 6)); const b = a + 5 * (2 + Math.floor(Math.random() * (11 - a / 5 - 1))); return [h * 60 + a + (h < 7 ? 720 : 0), h * 60 + b + (h < 7 ? 720 : 0)]; } },
  { titulo: 'Passando para a hora seguinte', gerar: () => { const h = sortear([7, 8, 9, 10, 1, 2, 3, 4]) + 0; const ini = (h < 7 ? h + 12 : h) * 60 + 5 * (6 + Math.floor(Math.random() * 6)); return [ini, ini + 5 * (3 + Math.floor(Math.random() * 9))]; } },
  { titulo: 'Horas e minutos', gerar: () => { const ini = (7 + Math.floor(Math.random() * 3)) * 60 + 5 * Math.floor(Math.random() * 12); return [ini, ini + 60 * (1 + Math.floor(Math.random() * 2)) + 5 * (1 + Math.floor(Math.random() * 11))]; } },
  { titulo: 'Passando do meio-dia (AM → PM)', gerar: () => { const ini = (10 * 60) + 5 * Math.floor(Math.random() * 24); return [ini, 12 * 60 + 5 * (2 + Math.floor(Math.random() * 30))]; } },
  { titulo: 'Minutos quebrados', gerar: () => { const ini = (8 + Math.floor(Math.random() * 6)) * 60 + Math.floor(Math.random() * 60); return [ini, ini + 25 + Math.floor(Math.random() * 200)]; } },
  { titulo: 'Passando da meia-noite (PM → AM)', gerar: () => { const ini = (21 + Math.floor(Math.random() * 3)) * 60 + 5 * Math.floor(Math.random() * 12); return [ini, 24 * 60 + (5 + Math.floor(Math.random() * 3)) * 60 + 5 * Math.floor(Math.random() * 12)]; } },
];
const TIPOS_IN = NIVEIS_IN.map((c, i) => ({
  id: `intervalo${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '⏱️', cor: '#1e64d2',
  regra: i < 2
    ? 'Contar de 5 em 5 minutos até a hora cheia e depois até o fim (uma hora tem 60 minutos, não 100).'
    : 'Ir de hora cheia em hora cheia e somar os minutos do começo e do fim; ao passar do meio-dia (AM → PM) ou da meia-noite, continuar contando.',
}));
// as frases do dia a dia (começou / terminou)
const FRASES = [
  ['A oficina começou às', 'e terminou às'], ['O filme começou às', 'e acabou às'], ['A aula de natação começou às', 'e terminou às'],
  ['Ana saiu de casa às', 'e chegou na escola às'], ['O bolo entrou no forno às', 'e saiu às'], ['O jogo de futebol começou às', 'e terminou às'],
  ['Pedro começou a lição às', 'e terminou às'], ['A viagem de ônibus começou às', 'e chegou às'], ['A festa começou às', 'e terminou às'],
];
let jogo = null;   // a partida em andamento

// minutos desde a meia-noite (passa de 1440 no dia seguinte) → "09:15 AM"
function relogio(min) {
  const m = ((min % 1440) + 1440) % 1440, h24 = Math.floor(m / 60), mm = m % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return { texto: `${String(h12).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, ampm: h24 < 12 ? 'AM' : 'PM', h12, mm };
}
const duracao = (d) => {
  const h = Math.floor(d / 60), m = d % 60;
  const ph = h ? `${h} ${h === 1 ? 'hora' : 'horas'}` : '';
  const pm = m ? `${m} ${m === 1 ? 'minuto' : 'minutos'}` : '';
  return ph && pm ? `${ph} e ${pm}` : ph || pm;
};

// as 4 opções: a certa e os erros comuns (cada errada guarda o motivo)
function opcoesDe(ini, fim) {
  const certo = fim - ini, a = relogio(ini), b = relogio(fim);
  const ops = new Map([[certo, { d: certo, certa: true }]]);
  const juntar = (d, motivo) => { if (d > 0 && d < 24 * 60 && !ops.has(d) && ops.size < 4) ops.set(d, { d, motivo }); };
  // conta como número comum: 10:15 − 9:40 = 1015 − 940 = 75 (em "minutos")
  const comoNumero = (b.h12 * 100 + b.mm) - (a.h12 * 100 + a.mm);
  if (comoNumero > 0 && comoNumero !== certo) juntar(comoNumero, 'fez a conta como número comum (como se a hora tivesse 100 minutos)');
  // esqueceu o AM/PM: 01:15 PM − 11:30 AM contado como 1:15 − 11:30 (deu volta de 12 horas)
  if (a.ampm !== b.ampm) juntar(Math.abs((b.h12 % 12) * 60 + b.mm - ((a.h12 % 12) * 60 + a.mm)), 'esqueceu o AM/PM (não contou a passagem do meio-dia ou da meia-noite)');
  // contou só os minutos
  if (certo >= 60) juntar(Math.abs(b.mm - a.mm) || 60, 'contou só os minutos e esqueceu as horas');
  for (const d of embaralhar([60, -60, 10, -10, 5, -5, 15, -15])) juntar(certo + d, Math.abs(d) === 60 ? 'errou uma hora cheia' : 'errou a contagem dos minutos');
  return embaralhar([...ops.values()]);
}

function telaIntervaloMenu() {
  pararIntervalo();
  mascote('davi-intervalo', 'oi');
  mostrar('tela-intervalo-menu');
}

function comecarIntervalo() {
  pararIntervalo();
  definirMissao({ id: 'intervalo', intervalo: true, icone: '⏱️', cor: '#1e64d2', titulo: 'Quanto Tempo Passou?' });
  definirResultados([]);
  jogo = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, motivos: {}, rodada: null, timers: [], rodando: true };
  mostrar('tela-intervalo');
  proximaIntervalo();
}

function pararIntervalo() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); pararVoz(); }
  jogo = null;
}
const depois = (ms, fn) => { const p = jogo; const t = setTimeout(() => { if (jogo === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msg = (texto, tipo = '') => { $('intervalo-msg').innerHTML = texto; $('intervalo-msg').className = `cores-msg ${tipo}`; };

function hud() {
  $('intervalo-nivel').textContent = `⏱️ Nível ${jogo.nivel}`;
  $('intervalo-pontos').textContent = jogo.pontos;
  $('intervalo-contador').textContent = `${jogo.feitas}/${INTERVALO.RODADAS}`;
}

const cartaoHora = (min) => { const r = relogio(min); return `<span class="intervalo-hora">${r.texto}<small>${r.ampm}</small></span>`; };

function proximaIntervalo() {
  if (jogo.feitas >= INTERVALO.RODADAS) { terminarIntervalo(); return; }
  let ini, fim;
  do [ini, fim] = NIVEIS_IN[jogo.nivel - 1].gerar(); while (fim - ini <= 0 || fim - ini >= 24 * 60);
  jogo.feitas++;
  const [comeco, final] = sortear(FRASES);
  const outroDia = Math.floor(fim / 1440) > Math.floor(ini / 1440);
  jogo.rodada = { ini, fim, n: jogo.nivel, opcoes: opcoesDe(ini, fim), respondida: false, t0: performance.now(), outroDia };
  hud();
  const a = relogio(ini), b = relogio(fim);
  $('intervalo-frase').innerHTML = `${comeco} <b>${a.texto} ${a.ampm}</b> ${final} <b>${b.texto} ${b.ampm}</b>${outroDia ? ', <b>no dia seguinte</b>' : ', no mesmo dia'}. Quanto tempo se passou?`;
  $('intervalo-horas').innerHTML = `${cartaoHora(ini)}<span class="intervalo-seta" aria-hidden="true">→</span>${cartaoHora(fim)}`;
  const caixa = $('intervalo-opcoes');
  caixa.innerHTML = '';
  jogo.rodada.opcoes.forEach((o, i) => {
    const bt = document.createElement('button');
    bt.type = 'button';
    bt.className = 'intervalo-opcao';
    bt.dataset.tecla = i + 1;
    bt.style.animationDelay = `${i * 70}ms`;
    bt.textContent = duracao(o.d);
    bt.onclick = () => responder(o, bt);
    caixa.append(bt);
  });
  msg(jogo.feitas === 1 ? '💡 AM é antes do meio-dia; PM é depois do meio-dia.' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  depois(300, () => frase('', $('intervalo-frase').textContent.replace(/(\d\d):(\d\d)/g, '$1 e $2')));
}

function responder(opcao, botao) {
  const r = jogo && jogo.rodada;
  if (!r || r.respondida || !jogo.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#intervalo-opcoes .intervalo-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_IN[r.n - 1];
  const a = relogio(r.ini), b = relogio(r.fim);
  const certo = r.fim - r.ini;
  const certa = `${a.texto} ${a.ampm} até ${b.texto} ${b.ampm}${r.outroDia ? ' (dia seguinte)' : ''} = ${duracao(certo)}`;
  // a explicação: até a próxima hora cheia, as horas cheias do meio e o resto
  const ateCheia = (60 - (r.ini % 60)) % 60, cheias = Math.floor((r.fim - (r.ini + ateCheia)) / 60), resto = r.fim - (r.ini + ateCheia) - cheias * 60;
  const conta = r.fim - r.ini < 60 && Math.floor(r.ini / 60) === Math.floor(r.fim / 60) ? `${b.mm} − ${a.mm} = ${certo} minutos`
    : [ateCheia && `${ateCheia} min até a hora cheia`, cheias && `${cheias} ${cheias === 1 ? 'hora' : 'horas'}`, resto && `${resto} min`].filter(Boolean).join(' + ') + ` = ${duracao(certo)}`;
  pararVoz();
  if (opcao.certa) {
    jogo.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 30) * 10);
    jogo.acertos++;
    botao.classList.add('certa');
    botoes.forEach((x) => { if (x !== botao) x.classList.add('apagada'); });
    resultados.push({ m: tipo, certa, erros: [], nivel: r.n, tempo });
    jogo.nivel = Math.min(INTERVALO.NIVEL_MAX, jogo.nivel + 1);
    jogo.nivelMax = Math.max(jogo.nivelMax, jogo.nivel);
    msg(`✅ Isso! ${conta}.`, 'ok');
    SOM.certo();
    frase('', `Isso! ${duracao(certo)}!`);
  } else {
    botao.classList.add('errada');
    const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((x) => { if (x !== botao && x !== certoEl) x.classList.add('apagada'); });
    jogo.motivos[opcao.motivo] = (jogo.motivos[opcao.motivo] || 0) + 1;
    resultados.push({ m: tipo, certa, erros: [`respondeu ${duracao(opcao.d)} (${opcao.motivo})`], nivel: r.n, tempo });
    jogo.nivel = Math.max(1, jogo.nivel - 1);
    msg(`Quase! ${conta}.`, 'erro');
    SOM.errado();
    frase('', `Quase! Passaram ${duracao(certo)}.`);
  }
  hud();
  depois(INTERVALO.PAUSA + (opcao.certa ? 0 : 2200), proximaIntervalo);
}

function terminarIntervalo() {
  const { acertos, feitas, pontos, nivelMax, motivos } = jogo;
  pararIntervalo();
  const lista = Object.entries(motivos);
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} intervalos e chegou ao nível ${nivelMax} de ${INTERVALO.NIVEL_MAX} (${NIVEIS_IN[nivelMax - 1].titulo}).`,
    lista.length ? `Erros: ${lista.map(([t, n]) => `${t}: ${n}`).join('; ')}.` : 'Não errou nenhum intervalo.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Relógio na cabeça! ⏰' : 'Fim dos intervalos!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} intervalos e fez ${pontos} pontos!`;
}

document.addEventListener('keydown', (e) => {
  if (!jogo || !$('tela-intervalo').classList.contains('ativa')) return;
  const b = document.querySelector(`#intervalo-opcoes .intervalo-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: dois relógios digitais
$('intervalo-capa').innerHTML = `<span class="intervalo-capa-linha">${cartaoHora(9 * 60 + 15)}${cartaoHora(9 * 60 + 45)}</span><b class="intervalo-capa-txt">30 min?</b>`;

$('btn-intervalo').onclick = () => { SOM.clique(); escolherProfessorE('Quanto Tempo Passou?', telaIntervaloMenu); };
$('intervalo-voltar').onclick = telaJogos;
$('btn-intervalo-comecar').onclick = () => { SOM.clique(); comecarIntervalo(); };
$('intervalo-sair').onclick = telaIntervaloMenu;
$('intervalo-ouvir').onclick = () => frase('', $('intervalo-frase').textContent.replace(/(\d\d):(\d\d)/g, '$1 e $2'));

export { comecarIntervalo, INTERVALO, pararIntervalo, telaIntervaloMenu };
