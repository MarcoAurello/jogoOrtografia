/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Jogo da Hora. */

import { $, embaralhar, sortear } from './util.js?v=119';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=119';
import { SOM, tocar } from './som.js?v=119';
import { mascote, mostrar, telaJogos } from './telas.js?v=119';
import { escolherProfessorE } from './professor.js?v=119';
import { segundos } from './luzes.js?v=119';
import { fimDaMissao } from './relatorio.js?v=119';

// ---------- Jogo da Hora ----------
// Ler as horas no relógio de ponteiros e no digital (orientação temporal). As rodadas alternam: aparece a hora
// digital e a criança escolhe, entre 4 relógios de ponteiros, o que marca essa hora; ou aparece um relógio de
// ponteiros e ela escolhe a hora digital certa. As alternativas erradas são as confusões mais comuns: ponteiros
// trocados, uma hora a mais ou a menos, minutos errados e, nos níveis de dia e noite, AM e PM trocados.
// Níveis: horas cheias, e meia, quartos, de 5 em 5 minutos e, por fim, dia e noite com AM e PM (e a hora de 24 h ao lado,
// para ensinar: 3:00 PM = 15:00).
// Errou 2 vezes seguidas: uma janelinha ensina a ler o relógio.
const HORA = { RODADAS: 12, NIVEL_MAX: 6 };
const NIVEIS_HORA = [
  { minutos: [0], dia: false, titulo: 'Horas cheias' },
  { minutos: [0, 30], dia: false, titulo: 'Horas e meia' },
  { minutos: [0, 15, 30, 45], dia: false, titulo: 'Quartos de hora' },
  { minutos: Array.from({ length: 12 }, (_, i) => i * 5), dia: false, titulo: 'De 5 em 5 minutos' },
  { minutos: [0, 30], dia: true, dica: true, titulo: 'AM e PM' },
  { minutos: Array.from({ length: 12 }, (_, i) => i * 5), dia: true, titulo: 'AM/PM de 5 em 5' },
];
const TIPOS_HORA = {
  paraAnalogico: { id: 'hora-analogico', titulo: 'Da hora digital para o relógio de ponteiros', icone: '🕒', cor: '#1e88e5',
    regra: 'O ponteiro pequeno mostra a hora e o grande mostra os minutos: cada número que o grande passa vale 5 minutos (no 3 são 15, no 6 são 30, no 9 são 45). AM é antes do meio-dia e PM é depois.' },
  paraDigital: { id: 'hora-digital', titulo: 'Do relógio de ponteiros para a hora digital', icone: '🔢', cor: '#e53935',
    regra: 'Primeiro o ponteiro pequeno (a hora: o último número que ele passou), depois o grande (os minutos, contando de 5 em 5). AM é antes do meio-dia e PM é depois.' },
};
let hora = null;   // a partida em andamento

const doisDig = (n) => String(n).padStart(2, '0');
const diurno = (h) => h >= 6 && h < 18;
// AM: da meia-noite ao meio-dia (madrugada e manhã); PM: do meio-dia à meia-noite (tarde e noite)
const amPm = (h) => (h < 12 ? 'AM' : 'PM');
const parteDoDia = (h) => (h < 6 ? 'madrugada' : h < 12 ? 'manhã' : h < 18 ? 'tarde' : 'noite');
// hora digital: de 1 a 12 nos primeiros níveis; nos de AM e PM, a hora cheia de 24 h (16:00, 20:30)
const hora24 = (t) => `${doisDig(t.h)}:${doisDig(t.m)}`;
const hora12 = (t) => `${t.h % 12 || 12}:${doisDig(t.m)} ${amPm(t.h)}`;
const digital = (t, dia) => (dia ? hora24(t) : `${t.h % 12 || 12}:${doisDig(t.m)}`);
const chave = (t, dia) => (dia ? `${t.h}:${t.m}` : `${t.h % 12}:${t.m}`);

// relógio de ponteiros em SVG (com ☀️ ou 🌙 nos níveis de dia e noite)
function relogioSVG(t, dia) {
  const ah = ((t.h % 12) + t.m / 60) * 30, am = t.m * 6;
  const numeros = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1, a = (n * 30 - 90) * Math.PI / 180;
    return `<text x="${(50 + Math.cos(a) * 37).toFixed(1)}" y="${(50 + Math.sin(a) * 37 + 4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#13294b">${n}</text>`;
  }).join('');
  const marcas = Array.from({ length: 60 }, (_, i) => {
    const a = (i * 6) * Math.PI / 180, r1 = i % 5 ? 45 : 43;
    return `<line x1="${(50 + Math.sin(a) * r1).toFixed(1)}" y1="${(50 - Math.cos(a) * r1).toFixed(1)}" x2="${(50 + Math.sin(a) * 47).toFixed(1)}" y2="${(50 - Math.cos(a) * 47).toFixed(1)}" stroke="#13294b" stroke-width="${i % 5 ? 0.6 : 1.4}"/>`;
  }).join('');
  const icone = dia ? `<text x="88" y="14" font-size="16" text-anchor="middle">${diurno(t.h) ? '☀️' : '🌙'}</text>
    <rect x="1" y="2" width="24" height="13" rx="6" fill="${t.h < 12 ? '#fff3c4' : '#e3ecff'}" stroke="#13294b" stroke-width="1"/>
    <text x="13" y="12" font-size="9" font-weight="800" text-anchor="middle" fill="#13294b">${amPm(t.h)}</text>` : '';
  return `<svg viewBox="0 0 100 100" class="relogio" aria-hidden="true">
    <circle cx="50" cy="50" r="48" fill="#fff" stroke="#13294b" stroke-width="2.5"/>${marcas}${numeros}
    <line x1="50" y1="50" x2="${(50 + Math.sin(ah * Math.PI / 180) * 22).toFixed(1)}" y2="${(50 - Math.cos(ah * Math.PI / 180) * 22).toFixed(1)}" stroke="#13294b" stroke-width="4.5" stroke-linecap="round"/>
    <line x1="50" y1="50" x2="${(50 + Math.sin(am * Math.PI / 180) * 34).toFixed(1)}" y2="${(50 - Math.cos(am * Math.PI / 180) * 34).toFixed(1)}" stroke="#e53935" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="3" fill="#13294b"/>${icone}</svg>`;
}
// nos níveis de AM e PM, embaixo da hora de 24 h aparece a parte do dia e, no primeiro deles, a conta pronta (16:00 = 4:00 PM)
const digitalHTML = (t, nv) => `<span class="relogio-digital">${digital(t, nv.dia)}</span>${nv.dia
  ? `<span class="hora-periodo">${nv.dica ? `= ${hora12(t)} · ` : ''}${diurno(t.h) ? '☀️' : '🌙'} ${parteDoDia(t.h)}</span>` : ''}`;

// alternativas erradas: ponteiros trocados, uma hora a mais ou a menos, minutos errados e o período trocado
function erradasHora(t, nv) {
  const lista = [];
  const juntar = (h, m, motivo) => {
    const c = { h: ((h % 24) + 24) % 24, m: ((m % 60) + 60) % 60, motivo };
    if (!nv.dia && c.h >= 12) c.h -= 12;
    if ([t, ...lista].some((x) => chave(x, nv.dia) === chave(c, nv.dia))) return;
    lista.push(c);
  };
  if (t.m % 5 === 0) {   // ponteiros trocados: o pequeno lido como minutos e o grande como hora
    const hh = (t.m / 5) || 12, mm = (t.h % 12) * 5;
    juntar(nv.dia && !diurno(t.h) ? (hh % 12) + 12 : hh, mm, 'trocou os ponteiros');
  }
  if (nv.dia) juntar(t.h + 12, t.m, 'trocou AM e PM');
  juntar(t.h + 1, t.m, 'errou a hora (uma a mais)');
  juntar(t.h - 1, t.m, 'errou a hora (uma a menos)');
  const passo = nv.minutos.length > 1 ? (nv.minutos[1] - nv.minutos[0]) : 30;
  juntar(t.h, 60 - t.m, 'errou os minutos');
  juntar(t.h, t.m + passo, 'errou os minutos');
  juntar(t.h, t.m - passo, 'errou os minutos');
  juntar(t.h, t.m + 30, 'errou os minutos');
  juntar(t.h + 2, t.m, 'errou a hora');
  return lista.slice(0, 3);
}

function telaHoraMenu() {
  pararHora();
  mascote('davi-hora', 'oi');
  mostrar('tela-hora-menu');
}

function comecarHora() {
  pararHora();
  definirMissao({ id: 'hora', hora: true, icone: '🕒', cor: '#1e88e5', titulo: 'Jogo da Hora (relógio de ponteiros e digital)' });
  definirResultados([]);
  hora = { nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, erros: {}, errosSeguidos: 0, ajudas: 0 };
  mostrar('tela-hora');
  novaRodadaHora();
}

function pararHora() {
  if (hora) { hora.rodando = false; clearInterval(hora.relogio); clearTimeout(hora.proxima); }
  hora = null;
  $('hora-ajuda').hidden = true;
}
const msgHora = (texto, tipo = '') => { $('hora-msg').innerHTML = texto; $('hora-msg').className = `hora-msg ${tipo}`; };

function novaRodadaHora() {
  const r = hora;
  if (!r || !r.rodando) return;
  if (r.feitas >= HORA.RODADAS) { terminarHora(); return; }
  r.feitas++;
  const nv = NIVEIS_HORA[r.nivel - 1];
  const paraAnalogico = r.feitas % 2 === 1;   // as rodadas alternam os dois sentidos
  // hora sorteada: de 1 a 12 (sem dia e noite) ou de 0 a 23 (com AM e PM; as da tarde e da noite, de 13 a 23, saem mais)
  const t = { h: !nv.dia ? 1 + Math.floor(Math.random() * 12) : Math.random() < 0.7 ? 13 + Math.floor(Math.random() * 11) : Math.floor(Math.random() * 13), m: sortear(nv.minutos) };
  const opcoes = embaralhar([{ ...t, certa: true }, ...erradasHora(t, nv)]);
  Object.assign(r, { nv, t, paraAnalogico, opcoes, respondendo: true, t0: performance.now() });
  $('hora-nivel').textContent = `🕒 Nível ${r.nivel} de ${HORA.NIVEL_MAX}`;
  $('hora-pontos').textContent = r.pontos;
  $('hora-contador').textContent = `Rodada ${r.feitas} de ${HORA.RODADAS} · ${nv.titulo}`;
  $('hora-pergunta').innerHTML = paraAnalogico
    ? `<div class="hora-alvo digital">${digitalHTML(t, nv)}</div><p>Qual relógio marca esta hora?</p>`
    : `<div class="hora-alvo analogico">${relogioSVG(t, nv.dia)}</div><p>Que horas o relógio está marcando?</p>`;
  $('hora-opcoes').className = `hora-opcoes ${paraAnalogico ? 'de-relogios' : 'de-digitais'}`;
  $('hora-opcoes').innerHTML = opcoes.map((o, i) =>
    `<button class="hora-opcao" type="button" data-i="${i}" aria-label="Alternativa ${i + 1}${paraAnalogico ? '' : ': ' + digital(o, nv.dia)}">${paraAnalogico ? relogioSVG(o, nv.dia) : digitalHTML(o, nv)}</button>`).join('');
  msgHora(paraAnalogico ? 'Ponteiro <b>pequeno</b> = hora · ponteiro <b style="color:#e53935">grande</b> = minutos.' : 'Leia primeiro o ponteiro pequeno, depois o grande.');
  clearInterval(r.relogio);
  r.relogio = setInterval(() => { if (hora && hora.respondendo) $('hora-tempo').textContent = `⏱ ${segundos((performance.now() - hora.t0) / 1000)}`; }, 200);
}

$('hora-opcoes').onclick = (ev) => {
  const btn = ev.target.closest('.hora-opcao');
  const r = hora;
  if (!btn || !r || !r.respondendo) return;
  r.respondendo = false;
  clearInterval(r.relogio);
  const o = r.opcoes[Number(btn.dataset.i)];
  const tempo = (performance.now() - r.t0) / 1000;
  const tipo = r.paraAnalogico ? TIPOS_HORA.paraAnalogico : TIPOS_HORA.paraDigital;
  const certaTxt = `${digital(r.t, r.nv.dia)}${r.nv.dia ? ` (${hora12(r.t)}, ${parteDoDia(r.t.h)})` : ''}`;
  document.querySelectorAll('.hora-opcao').forEach((b) => { b.disabled = true; if (r.opcoes[Number(b.dataset.i)].certa) b.classList.add('certa'); });
  const explica = `O ponteiro pequeno aponta para a hora e o grande ${r.t.m ? `está no ${r.t.m / 5}, que vale ${r.t.m} minutos` : 'está no 12 (hora certinha)'}: <b>${certaTxt}</b>.`
    + (r.nv.dia ? ` ${r.t.h > 12 ? `Depois do meio-dia, tire 12: ${r.t.h} − 12 = ${r.t.h - 12}, então o ponteiro pequeno fica no ${r.t.h - 12}. ` : ''}${amPm(r.t.h)} porque é ${r.t.h < 12 ? 'antes' : 'depois'} do meio-dia.` : '');
  if (o.certa) {
    const bom = 3 + (r.nivel >= 4 ? 2 : 0);
    const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
    const ganho = 20 * r.nivel + bonus;
    r.pontos += ganho;
    r.acertos++;
    r.errosSeguidos = 0;
    resultados.push({ m: tipo, certa: certaTxt, erros: [], nivel: r.nivel, tempo });
    SOM.certo();
    msgHora(`✅ Isso! ${certaTxt}. +${ganho} pontos em ${segundos(tempo)}`, 'ok');
    r.nivel = Math.min(HORA.NIVEL_MAX, r.nivel + 1);
  } else {
    r.erros[o.motivo] = (r.erros[o.motivo] || 0) + 1;
    r.errosSeguidos++;
    btn.classList.add('errada');
    resultados.push({ m: tipo, certa: certaTxt, erros: [`escolheu ${digital(o, r.nv.dia)} (${o.motivo})`], nivel: r.nivel, tempo });
    SOM.errado();
    msgHora(`Não foi essa (${o.motivo}). ${explica}`, 'erro');
    r.nivel = Math.max(1, r.nivel - 1);
  }
  r.nivelMax = Math.max(r.nivelMax, r.nivel);
  $('hora-pontos').textContent = r.pontos;
  // errou 2 vezes seguidas: antes da próxima rodada, a janelinha ensina a ler o relógio
  if (r.errosSeguidos >= 2) { r.errosSeguidos = 0; r.proxima = setTimeout(mostrarAjudaHora, 2600); return; }
  r.proxima = setTimeout(novaRodadaHora, o.certa ? 1500 : 3000);
};

function mostrarAjudaHora() {
  const r = hora;
  if (!r || !r.rodando) return;
  r.ajudas++;
  $('hora-ajuda').hidden = false;
  tocar([[523, 0.1], [659, 0.1], [784, 0.16]]);
  $('btn-hora-entendi').focus();
}
$('btn-hora-entendi').onclick = () => {
  $('hora-ajuda').hidden = true;
  SOM.clique();
  if (hora && hora.rodando) novaRodadaHora();
};
// os dois relógios de exemplo da janelinha
$('hora-ajuda-exemplos').innerHTML = `<div>${relogioSVG({ h: 3, m: 0 }, false)}<span>3:00</span></div><div>${relogioSVG({ h: 3, m: 30 }, false)}<span>3:30</span></div>`;

function terminarHora() {
  const r = hora;
  pararHora();
  const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
  const erros = Object.entries(r.erros);
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${r.pontos}. Chegou ao nível ${r.nivelMax} de ${HORA.NIVEL_MAX} (${NIVEIS_HORA[r.nivelMax - 1].titulo}).`,
    `Acertou ${r.acertos} de ${r.feitas} rodadas.`,
    erros.length ? `Erros: ${erros.map(([t, n]) => `${t} (${n})`).join(', ')}.` : 'Nenhum erro: já lê as horas muito bem!',
    ...(r.ajudas ? [`Precisou da explicação de como ler o relógio ${r.ajudas} ${r.ajudas === 1 ? 'vez' : 'vezes'} (depois de 2 erros seguidos).`] : []),
    ...(tempos.length ? [`Tempo médio para responder certo: ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = r.acertos === r.feitas ? 'Dono do tempo! ⏰' : 'Fim do Jogo da Hora!';
  $('fim-texto').textContent = `${aluno}, você acertou ${r.acertos} de ${r.feitas} e fez ${r.pontos} pontos!`;
}

$('btn-hora').onclick = () => { SOM.clique(); escolherProfessorE('Jogo da Hora', telaHoraMenu); };
$('hora-voltar').onclick = telaJogos;
$('btn-hora-comecar').onclick = () => { SOM.clique(); comecarHora(); };
$('hora-sair').onclick = telaHoraMenu;

export { comecarHora, HORA, pararHora, telaHoraMenu };
