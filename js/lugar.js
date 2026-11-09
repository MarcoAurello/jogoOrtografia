/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Cada Coisa no Seu Lugar. */

import { $, embaralhar, sortear } from './util.js?v=246';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=246';
import { frase, pararVoz, SOM, tocar } from './som.js?v=246';
import { mascote, mostrar, telaJogos } from './telas.js?v=246';
import { escolherProfessorE } from './professor.js?v=246';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=246';

// ---------- Cada Coisa no Seu Lugar ----------
// Autonomia e vida diária: um ambiente aparece desenhado em cima (praia, banheiro, cozinha...) com a pergunta falada
// ("O que levamos para a praia?") e embaixo vêm 3 objetos. Só um combina com o lugar. Errou: o objeto treme, a voz
// pede para tentar de novo e ele fica apagado; a criança tenta até achar (sem punição, como pede o público pequeno).
// Os errados nunca servem para aquele lugar: cada objeto diz em quais lugares ele é usado (o chinelo serve na praia,
// na piscina e no banheiro, então nunca aparece como errado nesses três).
// Pensado também para alunos com deficiência intelectual: muitas rodadas curtas (todos os lugares e depois alguns de novo), figuras grandes, tudo falado em voz alta,
// e o objeto errado fica cinza e sai do jogo (a escolha seguinte fica mais fácil, sem frustrar).
const LUGAR = { RODADAS: 16, PAUSA: 2300 };

// os lugares: desenho, pergunta e cor do relatório
const LUGARES = [
  { id: 'praia', nome: 'Praia', icone: '🏖️', cor: '#f5a524', pergunta: 'O que nós levamos para a praia?' },
  { id: 'banheiro', nome: 'Banheiro', icone: '🛁', cor: '#1fa2b0', pergunta: 'O que nós usamos no banheiro?' },
  { id: 'cozinha', nome: 'Cozinha', icone: '🍳', cor: '#d97706', pergunta: 'O que nós usamos na cozinha?' },
  { id: 'quarto', nome: 'Quarto', icone: '🛏️', cor: '#6d5dd3', pergunta: 'O que nós usamos no quarto, na hora de dormir?' },
  { id: 'escola', nome: 'Escola', icone: '🏫', cor: '#2e9e5b', pergunta: 'O que nós levamos para a escola?' },
  { id: 'parque', nome: 'Parque', icone: '🌳', cor: '#3fae5a', pergunta: 'O que nós levamos para brincar no parque?' },
  { id: 'piscina', nome: 'Piscina', icone: '🏊', cor: '#1e64d2', pergunta: 'O que nós usamos na piscina?' },
  { id: 'chuva', nome: 'Dia de chuva', icone: '🌧️', cor: '#5b6b82', pergunta: 'O que nós usamos num dia de chuva?' },
  { id: 'frio', nome: 'Dia de frio', icone: '❄️', cor: '#3b82c4', pergunta: 'O que nós vestimos num dia de frio?' },
  { id: 'mercado', nome: 'Mercado', icone: '🛒', cor: '#e5731f', pergunta: 'O que nós usamos no mercado?' },
  { id: 'medico', nome: 'Médico', icone: '🩺', cor: '#e53935', pergunta: 'O que o médico usa no consultório?' },
  { id: 'festa', nome: 'Festa de aniversário', icone: '🎉', cor: '#c2185b', pergunta: 'O que tem numa festa de aniversário?' },
];
// objetos: figura, nome e os lugares onde ele é usado (o primeiro é o lugar "dele")
const OBJETOS = [
  ['⛱️', 'Guarda-sol', 'praia'], ['🪣', 'Baldinho de areia', 'praia'], ['🧴', 'Protetor solar', 'praia piscina parque'],
  ['🩴', 'Chinelo', 'praia piscina banheiro'], ['🕶️', 'Óculos de sol', 'praia piscina parque'],
  ['🪥', 'Escova de dentes', 'banheiro'], ['🧼', 'Sabonete', 'banheiro'], ['🧻', 'Papel higiênico', 'banheiro'],
  ['🍳', 'Frigideira', 'cozinha'], ['🥄', 'Colher', 'cozinha festa'], ['🫖', 'Chaleira', 'cozinha'], ['🥣', 'Tigela', 'cozinha'],
  ['🧸', 'Ursinho de pelúcia', 'quarto'], ['⏰', 'Despertador', 'quarto'], ['🌙', 'Luz de dormir', 'quarto'],
  ['✏️', 'Lápis', 'escola'], ['📒', 'Caderno', 'escola'], ['🎒', 'Mochila', 'escola parque'], ['🖍️', 'Giz de cera', 'escola festa'],
  ['🚲', 'Bicicleta', 'parque'], ['🪁', 'Pipa', 'parque praia'], ['⚽', 'Bola', 'parque praia escola'], ['🛴', 'Patinete', 'parque'],
  ['🥽', 'Óculos de natação', 'piscina'], ['🛟', 'Boia', 'piscina praia'], ['🩱', 'Maiô', 'piscina praia'],
  ['☂️', 'Guarda-chuva', 'chuva'], ['👢', 'Galocha', 'chuva'],
  ['🧣', 'Cachecol', 'frio'], ['🧤', 'Luvas', 'frio'], ['🧥', 'Casaco', 'frio chuva'],
  ['🛒', 'Carrinho de compras', 'mercado'], ['🛍️', 'Sacola', 'mercado'], ['👛', 'Carteira', 'mercado'],
  ['🌡️', 'Termômetro', 'medico'], ['🩺', 'Estetoscópio', 'medico'], ['🩹', 'Curativo', 'medico banheiro'], ['💉', 'Vacina', 'medico'],
  ['🎂', 'Bolo', 'festa'], ['🎈', 'Balão', 'festa parque'], ['🎁', 'Presente', 'festa'],
].map(([fig, nome, lugares]) => ({ fig, nome, lugares: lugares.split(' ') }));
// cada lugar vira uma "regra" no relatório (acertos por lugar)
const TIPOS_LUGAR = Object.fromEntries(LUGARES.map((l) => [l.id, {
  id: `lugar-${l.id}`, titulo: l.nome, icone: l.icone, cor: l.cor,
  regra: `Saber o que usamos em ${l.nome.toLowerCase()}: ligar o objeto ao lugar e à situação do dia a dia.`,
}]));

// os desenhos dos lugares (viewBox 300 x 200), sem mostrar nenhum dos objetos das respostas
const CENAS = {
  praia: `<rect width="300" height="200" fill="#7dd3fc"/><circle cx="235" cy="45" r="26" fill="#facc15"/>
    <path d="M0 105 Q75 95 150 108 T300 104 L300 140 L0 140Z" fill="#3b82f6"/><path d="M0 118 Q80 110 160 122 T300 118 L300 140 L0 140Z" fill="#60a5fa"/>
    <path d="M0 132 Q150 112 300 132 L300 200 L0 200Z" fill="#fde047"/><circle cx="60" cy="170" r="4" fill="#f59e0b"/><circle cx="210" cy="160" r="3" fill="#f59e0b"/>
    <path d="M110 165 l14 -6 l-4 13z" fill="#fb7185"/><path d="M40 60 q8 -6 16 0 q8 -6 16 0" stroke="#fff" stroke-width="3" fill="none"/>`,
  banheiro: `<rect width="300" height="200" fill="#e0f2fe"/><g stroke="#bae6fd" stroke-width="2">${[30, 60, 90, 120].map((y) => `<line x1="0" y1="${y}" x2="300" y2="${y}"/>`).join('')}</g>
    <rect y="140" width="300" height="60" fill="#f1f5f9"/><rect x="105" y="18" width="90" height="70" rx="35" fill="#93c5fd" stroke="#60a5fa" stroke-width="6"/>
    <path d="M125 30 L140 30 L122 75Z" fill="#fff" opacity=".55"/><path d="M95 118 Q150 156 205 118 L212 100 L88 100Z" fill="#fff" stroke="#cbd5e1" stroke-width="4"/>
    <rect x="142" y="82" width="16" height="18" rx="3" fill="#94a3b8"/><rect x="18" y="108" width="62" height="58" rx="10" fill="#fff" stroke="#cbd5e1" stroke-width="4"/>
    <rect x="232" y="40" width="10" height="70" fill="#94a3b8"/><path d="M226 40 h40 v8 h-40z" fill="#94a3b8"/><g fill="#7dd3fc"><circle cx="258" cy="60" r="3"/><circle cx="250" cy="72" r="3"/><circle cx="262" cy="80" r="3"/></g>`,
  cozinha: `<rect width="300" height="200" fill="#fef3c7"/><rect x="110" y="18" width="80" height="66" rx="5" fill="#bae6fd" stroke="#fff" stroke-width="6"/>
    <line x1="150" y1="18" x2="150" y2="84" stroke="#fff" stroke-width="4"/><line x1="110" y1="51" x2="190" y2="51" stroke="#fff" stroke-width="4"/>
    <rect y="112" width="300" height="88" fill="#d97706"/><rect y="104" width="300" height="14" fill="#f59e0b"/>
    <rect x="20" y="130" width="70" height="56" rx="4" fill="#b45309"/><rect x="210" y="130" width="70" height="56" rx="4" fill="#b45309"/>
    <circle cx="80" cy="158" r="4" fill="#fde68a"/><circle cx="220" cy="158" r="4" fill="#fde68a"/>
    <rect x="22" y="22" width="60" height="44" rx="4" fill="#fcd34d" stroke="#b45309" stroke-width="3"/><rect x="218" y="22" width="60" height="44" rx="4" fill="#fcd34d" stroke="#b45309" stroke-width="3"/>`,
  quarto: `<rect width="300" height="200" fill="#ede9fe"/><path d="M60 30 l3 8 h9 l-7 5 l2 8 l-7 -5 l-7 5 l2 -8 l-7 -5 h9z" fill="#fcd34d"/>
    <path d="M230 40 l2 6 h6 l-5 4 l2 6 l-5 -4 l-5 4 l2 -6 l-5 -4 h6z" fill="#fcd34d"/><path d="M150 26 a16 16 0 1 0 14 24 a12 12 0 1 1 -14 -24z" fill="#fde68a"/>
    <rect x="30" y="110" width="240" height="56" rx="8" fill="#818cf8"/><rect x="20" y="72" width="24" height="110" rx="5" fill="#4338ca"/>
    <rect x="82" y="108" width="188" height="54" rx="6" fill="#c7d2fe"/><rect x="50" y="94" width="52" height="28" rx="9" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="34" y="166" width="10" height="20" fill="#4338ca"/><rect x="256" y="166" width="10" height="20" fill="#4338ca"/>`,
  escola: `<rect width="300" height="200" fill="#ecfdf5"/><rect x="40" y="22" width="220" height="96" rx="8" fill="#065f46" stroke="#854d0e" stroke-width="8"/>
    <text x="150" y="84" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="42" fill="#a7f3d0">A B C</text>
    <text x="150" y="108" text-anchor="middle" font-family="Fredoka, sans-serif" font-size="16" fill="#a7f3d0">1 + 1 = 2</text>
    <rect x="20" y="146" width="260" height="14" rx="3" fill="#b45309"/><rect x="34" y="160" width="10" height="40" fill="#92400e"/><rect x="256" y="160" width="10" height="40" fill="#92400e"/>`,
  parque: `<rect width="300" height="200" fill="#e0f2fe"/><circle cx="50" cy="40" r="24" fill="#facc15"/>
    <path d="M-20 200 Q80 100 200 200Z" fill="#4ade80"/><path d="M100 200 Q220 84 320 200Z" fill="#22c55e"/>
    <rect x="238" y="104" width="14" height="50" fill="#78350f"/><circle cx="245" cy="96" r="28" fill="#15803d"/>
    <path d="M70 120 L90 60 L110 120" stroke="#ef4444" stroke-width="6" fill="none"/><line x1="90" y1="60" x2="90" y2="104" stroke="#334155" stroke-width="2"/>
    <rect x="82" y="104" width="16" height="5" rx="2" fill="#334155"/><path d="M150 40 q10 -6 20 0 q10 -6 20 0" stroke="#fff" stroke-width="4" fill="none"/>`,
  piscina: `<rect width="300" height="200" fill="#bae6fd"/><rect y="0" width="300" height="70" fill="#7dd3fc"/><circle cx="250" cy="34" r="20" fill="#facc15"/>
    <rect x="20" y="70" width="260" height="120" rx="14" fill="#e2e8f0"/><rect x="34" y="82" width="232" height="96" rx="10" fill="#38bdf8"/>
    <path d="M40 110 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0" stroke="#e0f2fe" stroke-width="3" fill="none"/><path d="M40 140 q20 -8 40 0 t40 0 t40 0 t40 0 t40 0" stroke="#e0f2fe" stroke-width="3" fill="none"/>
    <g stroke="#94a3b8" stroke-width="5" fill="none"><path d="M240 60 v40"/><path d="M262 60 v40"/></g><g stroke="#94a3b8" stroke-width="3"><line x1="240" y1="74" x2="262" y2="74"/><line x1="240" y1="88" x2="262" y2="88"/></g>`,
  chuva: `<rect width="300" height="200" fill="#94a3b8"/><g fill="#64748b"><circle cx="70" cy="40" r="24"/><circle cx="100" cy="32" r="28"/><circle cx="130" cy="44" r="22"/>
    <circle cx="200" cy="44" r="22"/><circle cx="228" cy="34" r="26"/><circle cx="256" cy="46" r="20"/></g>
    <g stroke="#e0f2fe" stroke-width="3" stroke-linecap="round">${[[60, 80], [100, 96], [140, 76], [190, 92], [230, 80], [270, 98], [80, 120], [160, 118], [250, 124]].map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x - 6}" y2="${y + 16}"/>`).join('')}</g>
    <rect y="150" width="300" height="50" fill="#475569"/><ellipse cx="90" cy="172" rx="34" ry="7" fill="#7dd3fc" opacity=".7"/><ellipse cx="220" cy="180" rx="26" ry="6" fill="#7dd3fc" opacity=".7"/>`,
  frio: `<rect width="300" height="200" fill="#dbeafe"/><path d="M0 120 L60 60 L110 110 L170 40 L240 115 L300 70 L300 200 L0 200Z" fill="#93c5fd"/>
    <path d="M150 58 L170 40 L190 60 L178 56 L170 64 L160 56Z" fill="#fff"/><path d="M45 75 L60 60 L74 76 L62 72Z" fill="#fff"/>
    <rect y="150" width="300" height="50" fill="#f8fafc"/><g fill="#fff" stroke="#bfdbfe" stroke-width="1">${[[40, 30], [120, 20], [210, 28], [270, 40], [90, 100], [250, 130], [30, 135], [180, 128]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5"/>`).join('')}</g>
    <circle cx="230" cy="168" r="18" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><circle cx="230" cy="138" r="12" fill="#fff" stroke="#cbd5e1" stroke-width="2"/><circle cx="226" cy="135" r="2" fill="#334155"/><circle cx="234" cy="135" r="2" fill="#334155"/><path d="M230 139 l7 2 l-7 2z" fill="#f97316"/>`,
  mercado: `<rect width="300" height="200" fill="#fff7ed"/><rect x="0" y="0" width="300" height="22" fill="#e5731f"/>
    ${[40, 90, 140].map((y, i) => `<rect x="20" y="${y + 30}" width="260" height="6" fill="#92400e"/>${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => `<rect x="${28 + k * 32}" y="${y + 6}" width="22" height="24" rx="3" fill="${['#ef4444', '#22c55e', '#3b82f6', '#facc15', '#a855f7'][(k + i) % 5]}"/>`).join('')}`).join('')}
    <rect x="0" y="184" width="300" height="16" fill="#fed7aa"/>`,
  medico: `<rect width="300" height="200" fill="#f0f9ff"/><rect x="118" y="18" width="64" height="64" rx="10" fill="#fff" stroke="#fecaca" stroke-width="4"/>
    <path d="M140 30 h20 v14 h14 v20 h-14 v14 h-20 v-14 h-14 v-20 h14z" fill="#ef4444"/>
    <rect x="30" y="120" width="170" height="22" rx="6" fill="#bfdbfe"/><rect x="30" y="112" width="44" height="14" rx="6" fill="#fff" stroke="#cbd5e1" stroke-width="2"/>
    <rect x="44" y="142" width="8" height="44" fill="#64748b"/><rect x="178" y="142" width="8" height="44" fill="#64748b"/>
    <rect x="222" y="96" width="56" height="90" rx="6" fill="#e2e8f0" stroke="#94a3b8" stroke-width="3"/><line x1="222" y1="140" x2="278" y2="140" stroke="#94a3b8" stroke-width="3"/>`,
  festa: `<rect width="300" height="200" fill="#fdf2f8"/><path d="M0 18 Q150 60 300 18" stroke="#9d174d" stroke-width="2" fill="none"/>
    ${[20, 50, 80, 110, 140, 170, 200, 230, 260].map((x, i) => { const y = 18 + 42 * (1 - ((x - 150) / 150) ** 2) * 0.62; return `<path d="M${x} ${y} l16 0 l-8 18z" fill="${['#f43f5e', '#facc15', '#22c55e', '#3b82f6', '#a855f7'][i % 5]}"/>`; }).join('')}
    <g>${[[40, 90, '#f43f5e'], [80, 120, '#3b82f6'], [250, 100, '#22c55e'], [210, 70, '#facc15'], [120, 80, '#a855f7'], [180, 130, '#f97316']].map(([x, y, c]) => `<rect x="${x}" y="${y}" width="8" height="8" rx="2" fill="${c}" transform="rotate(25 ${x} ${y})"/>`).join('')}</g>
    <rect x="40" y="150" width="220" height="14" rx="4" fill="#f9a8d4"/><rect x="40" y="164" width="220" height="10" fill="#fbcfe8"/><rect x="60" y="174" width="8" height="26" fill="#be185d"/><rect x="232" y="174" width="8" height="26" fill="#be185d"/>`,
};
const cenaSVG = (id) => `<svg class="lugar-svg" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${LUGARES.find((l) => l.id === id).nome}">${CENAS[id]}</svg>`;

let lugar = null;   // a partida em andamento

// um objeto certo do lugar e dois errados (de lugares diferentes entre si, para não confundir)
function opcoesDoLugar(l) {
  const certo = sortear(OBJETOS.filter((o) => o.lugares[0] === l.id));
  const errados = [];
  for (const o of embaralhar(OBJETOS.filter((o) => !o.lugares.includes(l.id)))) {
    if (errados.length < 2 && !errados.some((e) => e.lugares[0] === o.lugares[0])) errados.push(o);
  }
  return embaralhar([{ ...certo, certa: true }, ...errados]);
}

// todos os lugares embaralhados e, para completar as rodadas, mais uma volta (sem repetir o mesmo lugar em seguida)
function filaDeLugares() {
  const fila = [];
  while (fila.length < LUGAR.RODADAS) {
    const volta = embaralhar(LUGARES);
    if (fila.length && volta[0] === fila[fila.length - 1]) volta.push(volta.shift());
    fila.push(...volta);
  }
  return fila.slice(0, LUGAR.RODADAS);
}

function telaLugarMenu() {
  pararLugar();
  mascote('davi-lugar', 'oi');
  mostrar('tela-lugar-menu');
}

function comecarLugar() {
  pararLugar();
  definirMissao({ id: 'lugar', lugar: true, icone: '🏠', cor: '#f08a24', titulo: 'Cada Coisa no Seu Lugar' });
  definirResultados([]);
  lugar = { fila: filaDeLugares(), feitas: 0, primeira: 0, pontos: 0, rodada: null, timers: [], rodando: true };
  mostrar('tela-lugar');
  proximoLugar();
}

function pararLugar() {
  if (lugar) { lugar.rodando = false; lugar.timers.forEach(clearTimeout); pararVoz(); }
  lugar = null;
}
const depoisLugar = (ms, fn) => { const p = lugar; const t = setTimeout(() => { if (lugar === p && p.rodando) fn(); }, ms); p.timers.push(t); };
const msgLugar = (texto, tipo = '') => { $('lugar-msg').innerHTML = texto; $('lugar-msg').className = `cores-msg ${tipo}`; };
const falarPergunta = () => { if (lugar && lugar.rodada) frase(`lugar-${lugar.rodada.l.id}`, lugar.rodada.l.pergunta); };

function hudLugar() {
  $('lugar-pontos').textContent = lugar.pontos;
  $('lugar-contador').textContent = `${lugar.feitas}/${lugar.fila.length}`;
  const prontas = lugar.feitas - (lugar.rodada && !lugar.rodada.achou ? 1 : 0);
  $('lugar-barra').style.width = `${(prontas / lugar.fila.length) * 100}%`;
}

function proximoLugar() {
  if (lugar.feitas >= lugar.fila.length) { terminarLugar(); return; }
  const l = lugar.fila[lugar.feitas];
  lugar.feitas++;
  lugar.rodada = { l, opcoes: opcoesDoLugar(l), erros: [], achou: false, t0: performance.now() };
  hudLugar();
  $('lugar-cena').innerHTML = cenaSVG(l.id);
  $('lugar-nome').textContent = `${l.icone} ${l.nome}`;
  $('lugar-pergunta').textContent = l.pergunta;
  msgLugar('');
  tocar([[523, 0.07], [659, 0.09]]);
  const caixa = $('lugar-opcoes');
  caixa.innerHTML = '';
  lugar.rodada.opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lugar-opcao';
    b.dataset.tecla = i + 1;
    b.style.animationDelay = `${i * 90}ms`;
    b.innerHTML = `<span class="lugar-fig" aria-hidden="true">${o.fig}</span><span class="lugar-obj">${o.nome}</span>`;
    b.onclick = () => escolherLugar(o, b);
    caixa.append(b);
  });
  depoisLugar(350, falarPergunta);
}

function escolherLugar(obj, botao) {
  const r = lugar && lugar.rodada;
  if (!r || r.achou || botao.disabled || !lugar.rodando) return;
  if (obj.certa) {
    r.achou = true;
    const tempo = (performance.now() - r.t0) / 1000;
    [...document.querySelectorAll('#lugar-opcoes .lugar-opcao')].forEach((b) => { b.disabled = true; if (b !== botao) b.classList.add('apagada'); });
    botao.classList.add('certa');
    lugar.pontos += [10, 5, 2][r.erros.length];
    if (!r.erros.length) lugar.primeira++;
    resultados.push({ m: TIPOS_LUGAR[r.l.id], certa: `${r.l.nome}: ${obj.nome}`, erros: r.erros.map((n) => `escolheu ${n}`), tempo });
    msgLugar(`✅ Muito bem! ${obj.fig} ${obj.nome}!`, 'ok');
    SOM.certo();
    frase('', `Muito bem! ${obj.nome}!`);
    hudLugar();
    depoisLugar(LUGAR.PAUSA, proximoLugar);
  } else {
    r.erros.push(obj.nome);
    botao.disabled = true;
    botao.classList.add('errada');
    msgLugar(`${obj.fig} ${obj.nome} não. Tente outra vez!`, 'erro');
    SOM.errado();
    frase('', `${obj.nome} não. Tente outra vez!`);
  }
}

function terminarLugar() {
  const { primeira, feitas, pontos } = lugar;
  const lugaresComErro = resultados.filter((r) => r.erros.length).map((r) => r.m.titulo);
  pararLugar();
  missao.resumo = [
    `Acertou de primeira ${primeira} de ${feitas} lugares.`,
    lugaresComErro.length ? `Precisou tentar de novo em: ${lugaresComErro.join(', ')}.` : 'Ligou todos os objetos ao lugar certo sem errar.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Tudo no lugar certo! 🏆' : 'Fim dos lugares!';
  $('fim-texto').textContent = `${aluno}, você acertou de primeira ${primeira} de ${feitas} lugares e fez ${pontos} pontos!`;
}

// teclas 1 a 3 escolhem o objeto no computador
document.addEventListener('keydown', (e) => {
  if (!lugar || !$('tela-lugar').classList.contains('ativa')) return;
  const b = document.querySelector(`#lugar-opcoes .lugar-opcao[data-tecla="${e.key}"]`);
  if (b && !b.disabled) b.click();
});

// capa do cartão: a praia com o guarda-sol
$('lugar-capa').innerHTML = `${cenaSVG('praia')}<span class="lugar-capa-fig" aria-hidden="true">⛱️</span>`;

$('btn-lugar').onclick = () => { SOM.clique(); escolherProfessorE('Cada Coisa no Seu Lugar', telaLugarMenu); };
$('lugar-voltar').onclick = telaJogos;
$('btn-lugar-comecar').onclick = () => { SOM.clique(); comecarLugar(); };
$('lugar-sair').onclick = telaLugarMenu;
$('lugar-ouvir').onclick = falarPergunta;

export { comecarLugar, LUGAR, pararLugar, telaLugarMenu };
