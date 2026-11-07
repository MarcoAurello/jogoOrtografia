/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Metro, Centímetro e Milímetro. */

import { $, embaralhar, sortear } from './util.js?v=242';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=242';
import { frase, pararVoz, SOM, tocar } from './som.js?v=242';
import { mascote, mostrar, telaJogos } from './telas.js?v=242';
import { escolherProfessorE } from './professor.js?v=242';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=242';

// ---------- Metro, Centímetro e Milímetro ----------
// Medidas de comprimento e conversão: uma trena mostra a fita inteira ("3 m e 80 cm"); a tesoura corta um pedaço do fim
// ("40 cm", em vermelho) e a pergunta é quanto sobra, numa unidade pedida (cm, mm ou "m e cm"). 4 opções, uma certa.
// Por dentro tudo é em milímetros. As erradas imitam os erros comuns: somar em vez de tirar, achar que 1 m tem 10 cm,
// achar que 1 cm tem 100 mm, esquecer os metros e errar a conta por pouco. Acertou: sobe um nível; errou: desce.
const FITA = { RODADAS: 10, NIVEL_MAX: 6, PAUSA: 2700 };
const entre = (a, b, passo = 1) => a + passo * Math.floor(Math.random() * (Math.floor((b - a) / passo) + 1));
// cada nível: a fita (como é escrita), o corte e a unidade da resposta
const NIVEIS_FI = [
  { titulo: 'Tudo em centímetros', gerar: () => ({ total: { mm: entre(50, 150, 10) * 10, como: 'cm' }, corte: { mm: entre(10, 40, 5) * 10, como: 'cm' }, resp: 'cm' }) },
  { titulo: 'Metros e centímetros', gerar: () => ({ total: { mm: entre(2, 5) * 1000, como: 'm' }, corte: { mm: entre(20, 90, 10) * 10, como: 'cm' }, resp: 'cm' }) },
  { titulo: 'Fita em "m e cm"', gerar: () => ({ total: { mm: entre(1, 4) * 1000 + entre(10, 90, 10) * 10, como: 'mcm' }, corte: { mm: entre(15, 95, 5) * 10, como: 'cm' }, resp: 'cm' }) },
  { titulo: 'Centímetros e milímetros', gerar: () => ({ total: { mm: entre(10, 40) * 10, como: 'cm' }, corte: { mm: entre(15, 95, 5), como: 'mm' }, resp: 'mm' }) },
  { titulo: 'Resposta em "m e cm"', gerar: () => ({ total: { mm: entre(2, 6) * 1000, como: 'm' }, corte: { mm: entre(25, 175, 5) * 10, como: 'cm' }, resp: 'mcm' }) },
  { titulo: 'Metro, centímetro e milímetro', gerar: () => sortear([
    () => ({ total: { mm: entre(1, 3) * 1000 + entre(10, 90, 10) * 10, como: 'mcm' }, corte: { mm: entre(12, 48, 2) * 10, como: 'mm' }, resp: 'cm' }),
    () => ({ total: { mm: entre(1, 2) * 1000, como: 'm' }, corte: { mm: entre(15, 95, 5) * 10 + entre(1, 9), como: 'mm' }, resp: 'mm' }),
    () => ({ total: { mm: entre(3, 6) * 1000, como: 'm' }, corte: { mm: entre(1, 2) * 1000, como: 'm' }, resp: 'cm' }),
  ])() },
];
const TIPOS_FI = NIVEIS_FI.map((c, i) => ({
  id: `fita${i + 1}`, titulo: `Nível ${i + 1}: ${c.titulo}`, icone: '📏', cor: '#c99700',
  regra: 'Passar tudo para a mesma unidade antes de tirar: 1 m = 100 cm e 1 cm = 10 mm (logo, 1 m = 1000 mm).',
}));
let jogo = null;   // a partida em andamento

// escrever uma medida (em mm) do jeito pedido
function escrever(mm, como) {
  if (como === 'mm') return `${mm} mm`;
  if (como === 'cm') return `${mm / 10} cm`;
  if (como === 'm') return `${mm / 1000} m`;
  const m = Math.floor(mm / 1000), cm = (mm % 1000) / 10;   // "m e cm"
  return m && cm ? `${m} m e ${cm} cm` : m ? `${m} m` : `${cm} cm`;
}
const cabe = (mm, como) => mm > 0 && (como === 'mm' || mm % 10 === 0);   // cm e "m e cm" não têm milímetro sobrando
const falado = (t) => t.replace(/ mm/g, ' milímetros').replace(/ cm/g, ' centímetros').replace(/(\d) m\b/g, (_, d) => `${d} ${d === '1' ? 'metro' : 'metros'}`);

// as 4 opções: a certa e os erros comuns (cada errada guarda o motivo)
function opcoesDe(r) {
  const T = r.total.mm, C = r.corte.mm, certo = T - C;
  const ops = new Map([[certo, { mm: certo, certa: true }]]);
  const juntar = (mm, motivo) => { if (cabe(mm, r.resp) && !ops.has(mm) && ops.size < 4) ops.set(mm, { mm, motivo }); };
  const metros = Math.floor(T / 1000), resto = T % 1000;
  if (r.total.como !== 'cm' && metros) juntar(metros * 100 + resto - C, 'achou que 1 metro tem 10 centímetros');
  if (r.total.como === 'mcm' && resto > C) juntar(resto - C, 'esqueceu os metros');
  if (r.corte.como === 'mm' && r.total.como === 'cm') juntar(T * 10 - C, 'achou que 1 centímetro tem 100 milímetros');
  if (r.corte.como === 'mm' && r.total.como !== 'cm') juntar(T - C * 10, 'confundiu milímetros com centímetros no corte');
  juntar(T + C, 'somou em vez de tirar');
  const passo = r.resp === 'mm' ? 10 : 100;   // 10 mm ou 10 cm
  for (const d of embaralhar([passo, -passo, 2 * passo, -2 * passo, passo / 2, -passo / 2])) juntar(certo + d, 'errou a conta por pouco');
  return embaralhar([...ops.values()]);
}

// a trena: fita amarela com marquinhas e o pedaço cortado (do fim) em vermelho, com a tesoura no corte
function trenaSVG(r, mostrarSobra = false) {
  const L = 300, x0 = 16, y = 34, alt = 30;
  const xc = x0 + L * (1 - r.corte.mm / r.total.mm);
  let marcas = '';
  for (let i = 0; i <= 40; i++) { const x = x0 + (L * i) / 40; marcas += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + (i % 5 ? 7 : 13)}" stroke="#13294b" stroke-width="${i % 5 ? 0.8 : 1.4}"/>`; }
  return `<svg class="fita-svg" viewBox="0 0 ${L + 60} 110" role="img" aria-label="Fita de ${escrever(r.total.mm, r.total.como)}, cortando ${escrever(r.corte.mm, r.corte.como)}">
    <text x="${x0 + L / 2}" y="20" text-anchor="middle" class="fita-rotulo">${escrever(r.total.mm, r.total.como)} antes do corte</text>
    <rect x="${x0}" y="${y}" width="${L}" height="${alt}" rx="3" fill="#ffe14d" stroke="#13294b" stroke-width="2"/>${marcas}
    <rect x="${xc}" y="${y}" width="${x0 + L - xc}" height="${alt}" fill="#e5191f" opacity=".35"/>
    <rect x="${x0 + L}" y="${y - 6}" width="34" height="${alt + 12}" rx="6" fill="#2b2b2b"/><rect x="${x0 + L + 8}" y="${y + 2}" width="18" height="${alt - 4}" rx="3" fill="#f5d10a"/>
    <line x1="${xc}" y1="${y - 10}" x2="${xc}" y2="${y + alt + 10}" stroke="#e5191f" stroke-width="2.5" stroke-dasharray="4 3"/>
    <text x="${xc}" y="${y - 12}" text-anchor="middle" font-size="18">✂️</text>
    <text x="${(xc + x0 + L) / 2}" y="${y + alt + 26}" text-anchor="middle" class="fita-corte">Corte: ${escrever(r.corte.mm, r.corte.como)}</text>
    ${mostrarSobra ? `<text x="${(x0 + xc) / 2}" y="${y + alt + 26}" text-anchor="middle" class="fita-sobra">Sobra: ${escrever(r.total.mm - r.corte.mm, r.resp)}</text>` : ''}
  </svg>`;
}

function telaFitaMenu() {
  pararFita();
  mascote('davi-fita', 'oi');
  mostrar('tela-fita-menu');
}

function comecarFita() {
  pararFita();
  definirMissao({ id: 'fita', fita: true, icone: '📏', cor: '#c99700', titulo: 'Metro, Centímetro e Milímetro' });
  definirResultados([]);
  jogo = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, motivos: {}, rodada: null, timers: [], rodando: true };
  mostrar('tela-fita');
  proximaFita();
}

function pararFita() {
  if (jogo) { jogo.rodando = false; jogo.timers.forEach(clearTimeout); pararVoz(); }
  jogo = null;
}
const depois = (ms, fn) => { const p = jogo; const t = setTimeout(() => { if (jogo === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msg = (texto, tipo = '') => { $('fita-msg').innerHTML = texto; $('fita-msg').className = `cores-msg ${tipo}`; };
const NOME_UNIDADE = { cm: 'centímetros', mm: 'milímetros', mcm: 'metros e centímetros' };

function hud() {
  $('fita-nivel').textContent = `📏 Nível ${jogo.nivel}`;
  $('fita-pontos').textContent = jogo.pontos;
  $('fita-contador').textContent = `${jogo.feitas}/${FITA.RODADAS}`;
}

function proximaFita() {
  if (jogo.feitas >= FITA.RODADAS) { terminarFita(); return; }
  let r;
  do r = NIVEIS_FI[jogo.nivel - 1].gerar(); while (r.corte.mm >= r.total.mm || !cabe(r.total.mm - r.corte.mm, r.resp));
  jogo.feitas++;
  r.opcoes = opcoesDe(r);
  jogo.rodada = { ...r, n: jogo.nivel, respondida: false, t0: performance.now() };
  hud();
  $('fita-pergunta').innerHTML = `Uma fita mede <b>${escrever(r.total.mm, r.total.como)}</b>. Depois de cortar <b>${escrever(r.corte.mm, r.corte.como)}</b>, quantos <b>${NOME_UNIDADE[r.resp]}</b> sobram?`;
  $('fita-trena').innerHTML = trenaSVG(r);
  const caixa = $('fita-opcoes');
  caixa.innerHTML = '';
  r.opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'intervalo-opcao fita-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 70}ms`;
    b.textContent = escrever(o.mm, r.resp);
    b.onclick = () => responder(o, b);
    caixa.append(b);
  });
  msg(jogo.feitas === 1 ? '💡 1 m = 100 cm · 1 cm = 10 mm' : '');
  tocar([[523, 0.07], [659, 0.09]]);
  depois(300, () => frase('', falado($('fita-pergunta').textContent)));
}

function responder(opcao, botao) {
  const r = jogo && jogo.rodada;
  if (!r || r.respondida || !jogo.rodando) return;
  r.respondida = true;
  const tempo = (performance.now() - r.t0) / 1000;
  const botoes = [...document.querySelectorAll('#fita-opcoes .fita-opcao')];
  botoes.forEach((b) => { b.disabled = true; });
  const tipo = TIPOS_FI[r.n - 1];
  const sobra = r.total.mm - r.corte.mm;
  // a conta na unidade da resposta (o "m e cm" faz a conta em centímetros)
  const u = r.resp === 'mm' ? 'mm' : 'cm';
  // (a conversão só aparece quando a fita veio em outra unidade: nada de "100 cm = 100 cm")
  const converte = r.total.como === u ? '' : `${escrever(r.total.mm, r.total.como)} = ${escrever(r.total.mm, u)}; `;
  const conta = `${converte}${escrever(r.total.mm, u)} − ${escrever(r.corte.mm, u)} = ${escrever(sobra, u)}`
    + (r.resp === 'mcm' ? ` = ${escrever(sobra, 'mcm')}` : '');
  const certa = `Fita de ${escrever(r.total.mm, r.total.como)}, corte de ${escrever(r.corte.mm, r.corte.como)}: sobra ${escrever(sobra, r.resp)}`;
  $('fita-trena').innerHTML = trenaSVG(r, true);
  pararVoz();
  if (opcao.certa) {
    jogo.pontos += 10 * r.n + Math.round(Math.max(0, 1 - tempo / 30) * 10);
    jogo.acertos++;
    botao.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao) b.classList.add('apagada'); });
    resultados.push({ m: tipo, certa, erros: [], nivel: r.n, tempo });
    jogo.nivel = Math.min(FITA.NIVEL_MAX, jogo.nivel + 1);
    jogo.nivelMax = Math.max(jogo.nivelMax, jogo.nivel);
    msg(`✅ Isso! ${conta}.`, 'ok');
    SOM.certo();
    frase('', falado(`Isso! Sobram ${escrever(sobra, r.resp)}!`));
  } else {
    botao.classList.add('errada');
    const certoEl = botoes[r.opcoes.findIndex((o) => o.certa)];
    if (certoEl) certoEl.classList.add('certa');
    botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
    jogo.motivos[opcao.motivo] = (jogo.motivos[opcao.motivo] || 0) + 1;
    resultados.push({ m: tipo, certa, erros: [`respondeu ${escrever(opcao.mm, r.resp)} (${opcao.motivo})`], nivel: r.n, tempo });
    jogo.nivel = Math.max(1, jogo.nivel - 1);
    msg(`Quase! ${conta}.`, 'erro');
    SOM.errado();
    frase('', falado(`Quase! Sobram ${escrever(sobra, r.resp)}.`));
  }
  hud();
  depois(FITA.PAUSA + (opcao.certa ? 0 : 2200), proximaFita);
}

function terminarFita() {
  const { acertos, feitas, pontos, nivelMax, motivos } = jogo;
  pararFita();
  const lista = Object.entries(motivos);
  missao.resumo = [
    `Acertou ${acertos} de ${feitas} cortes e chegou ao nível ${nivelMax} de ${FITA.NIVEL_MAX} (${NIVEIS_FI[nivelMax - 1].titulo}).`,
    lista.length ? `Erros: ${lista.map(([t, n]) => `${t}: ${n}`).join('; ')}.` : 'Não errou nenhum corte.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Costureira de primeira! ✂️' : 'Fim dos cortes!';
  $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} cortes e fez ${pontos} pontos!`;
}

document.addEventListener('keydown', (e) => {
  if (!jogo || !$('tela-fita').classList.contains('ativa')) return;
  const b = document.querySelector(`#fita-opcoes .fita-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: a trena com o corte
$('fita-capa').innerHTML = trenaSVG({ total: { mm: 3000, como: 'm' }, corte: { mm: 1000, como: 'm' }, resp: 'cm' });

$('btn-fita').onclick = () => { SOM.clique(); escolherProfessorE('Metro, Centímetro e Milímetro', telaFitaMenu); };
$('fita-voltar').onclick = telaJogos;
$('btn-fita-comecar').onclick = () => { SOM.clique(); comecarFita(); };
$('fita-sair').onclick = telaFitaMenu;
$('fita-ouvir').onclick = () => frase('', falado($('fita-pergunta').textContent));

export { comecarFita, FITA, pararFita, telaFitaMenu };
