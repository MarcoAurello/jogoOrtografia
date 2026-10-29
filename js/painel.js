/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Painel do professor: a turma inteira numa tela e a ficha de cada aluno (evolução, habilidades, antes × depois), com PDF. */

import { $, seguro } from './util.js?v=133';
import { SOM } from './som.js?v=133';
import { api } from './api.js?v=133';
import { parteProfessor } from './professor.js?v=133';
import { NOME_HAB } from './habilidades.js?v=133';

// ---------- Painel ----------
// Os números vêm da API (api/src/services/painel.ts). "Acerto" é acertos de primeira ÷ respondidas, como nos relatórios.
// As cores seguem o semáforo: verde (80% ou mais), amarelo (60 a 79%) e vermelho (abaixo de 60%, dificuldade).
const PERIODOS = [[7, '7 dias'], [30, '30 dias'], [90, '90 dias'], [365, '1 ano']];
const COR = { ok: '#2e9e5b', medio: '#f2a900', ruim: '#e53935', texto: '#13294b', grade: '#dce9f8', linha: '#1fa2b0', cinza: '#64748b' };
const corDoAcerto = (p) => (p == null ? COR.grade : p >= 80 ? COR.ok : p >= 60 ? COR.medio : COR.ruim);
const nomeHab = (h) => NOME_HAB[h] || h;
const porcento = (p) => (p == null ? '—' : `${p}%`);
const dataCurta = (d) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—');
const semanaRotulo = (s) => new Date(`${String(s).slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
const fonte = (tam, peso = 700) => `${peso} ${tam}px Nunito, Arial, sans-serif`;

let vista = null;     // { tipo: 'turma' | 'aluno', id, dados, voltar }
let dias = 30;

// ---------- gráficos (canvas no dobro do tamanho: nítidos na tela e no PDF) ----------
function tela(w, h, titulo) {
  const c = document.createElement('canvas');
  c.width = w * 2; c.height = h * 2;
  c.style.width = '100%'; c.style.maxWidth = `${w}px`;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
  g.fillStyle = COR.texto; g.font = fonte(15, 800); g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(titulo, 14, 18);
  return { c, g, w, h };
}

// barras deitadas: uma por item, com o % de acerto e a cor do semáforo
function graficoBarras(titulo, itens) {
  const w = 460, h = 46 + itens.length * 30 + 12;
  const { c, g } = tela(w, h, titulo);
  const x0 = 180, x1 = w - 52;
  itens.forEach((it, i) => {
    const y = 48 + i * 30;
    g.font = fonte(12); g.fillStyle = COR.texto; g.textAlign = 'right';
    let rotulo = it.rotulo;
    while (g.measureText(rotulo).width > x0 - 16 && rotulo.length > 4) rotulo = `${rotulo.slice(0, -2)}…`;
    g.fillText(rotulo, x0 - 8, y);
    g.fillStyle = COR.grade; g.fillRect(x0, y - 9, x1 - x0, 18);
    g.fillStyle = corDoAcerto(it.valor); g.fillRect(x0, y - 9, ((it.valor || 0) / 100) * (x1 - x0), 18);
    g.fillStyle = COR.texto; g.textAlign = 'left'; g.font = fonte(12, 800);
    g.fillText(porcento(it.valor), x1 + 6, y);
  });
  return c;
}

// evolução por semana: barras de partidas (cinza) e a linha do % de acerto
function graficoSemanas(titulo, semanas) {
  const w = 480, h = 250;
  const { c, g } = tela(w, h, titulo);
  const x0 = 40, x1 = w - 20, y0 = 210, y1 = 44;
  g.font = fonte(10); g.fillStyle = COR.cinza; g.textAlign = 'right';
  for (const v of [0, 50, 100]) {
    const y = y0 - (v / 100) * (y0 - y1);
    g.strokeStyle = COR.grade; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke();
    g.fillText(`${v}%`, x0 - 4, y);
  }
  if (!semanas.length) return c;
  const passo = (x1 - x0) / semanas.length;
  const maxPartidas = Math.max(...semanas.map((s) => s.partidas), 1);
  semanas.forEach((s, i) => {
    const xm = x0 + passo * (i + 0.5);
    const altura = (s.partidas / maxPartidas) * (y0 - y1) * 0.45;
    g.fillStyle = '#e8eef5'; g.fillRect(xm - Math.min(18, passo * 0.3), y0 - altura, Math.min(36, passo * 0.6), altura);
    g.fillStyle = COR.cinza; g.textAlign = 'center'; g.font = fonte(10);
    g.fillText(semanaRotulo(s.semana), xm, y0 + 12);
    g.fillText(semanas.length > 8 ? String(s.partidas) : `${s.partidas} ${s.partidas === 1 ? 'partida' : 'partidas'}`, xm, y0 + 25);
  });
  const pontos = semanas.map((s, i) => [x0 + passo * (i + 0.5), s.acerto == null ? null : y0 - (s.acerto / 100) * (y0 - y1)]);
  g.strokeStyle = COR.linha; g.lineWidth = 3; g.beginPath();
  let comecou = false;
  for (const [x, y] of pontos) { if (y == null) continue; if (comecou) g.lineTo(x, y); else { g.moveTo(x, y); comecou = true; } }
  g.stroke(); g.lineWidth = 1;
  semanas.forEach((s, i) => {
    const [x, y] = pontos[i];
    if (y == null) return;
    g.fillStyle = corDoAcerto(s.acerto); g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill();
    g.fillStyle = COR.texto; g.font = fonte(11, 800); g.textAlign = 'center'; g.fillText(`${s.acerto}%`, x, y - 12);
  });
  return c;
}

// radar das habilidades (3 ou mais): quanto mais longe do centro, maior o acerto
function graficoRadar(titulo, habs) {
  const w = 540, h = 400;
  const { c, g } = tela(w, h, titulo);
  const cx = w / 2, cy = 214, raio = 118, n = habs.length;
  const ponto = (i, r) => [cx + r * Math.cos(-Math.PI / 2 + (2 * Math.PI * i) / n), cy + r * Math.sin(-Math.PI / 2 + (2 * Math.PI * i) / n)];
  g.strokeStyle = COR.grade;
  for (const nivel of [0.25, 0.5, 0.75, 1]) {
    g.beginPath();
    for (let i = 0; i <= n; i++) { const [x, y] = ponto(i % n, raio * nivel); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  g.fillStyle = 'rgba(31, 162, 176, 0.25)'; g.strokeStyle = COR.linha; g.lineWidth = 2.5; g.beginPath();
  habs.forEach((hb, i) => { const [x, y] = ponto(i, raio * ((hb.acerto || 0) / 100)); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
  g.closePath(); g.fill(); g.stroke(); g.lineWidth = 1;
  habs.forEach((hb, i) => {
    const [x, y] = ponto(i, raio + 22);
    g.fillStyle = COR.texto; g.font = fonte(11, 800);
    g.textAlign = Math.abs(x - cx) < 10 ? 'center' : x > cx ? 'left' : 'right';
    let rotulo = nomeHab(hb.habilidade);
    while (g.measureText(rotulo).width > 118 && rotulo.length > 4) rotulo = `${rotulo.slice(0, -2)}…`;
    g.fillText(rotulo, x, y - 6);
    g.fillStyle = corDoAcerto(hb.acerto); g.fillText(porcento(hb.acerto), x, y + 8);
  });
  return c;
}

// ---------- telas ----------
const blocos = (lista) => `<div class="painel-numeros">${lista.map(([valor, rotulo]) => `<div class="painel-numero"><b>${seguro(String(valor))}</b><span>${seguro(rotulo)}</span></div>`).join('')}</div>`;
const periodoTexto = () => PERIODOS.find(([d]) => d === dias)[1].replace('1 ano', '12 meses');

function desenharTurma(d) {
  const caixa = $('dados-conteudo');
  caixa.innerHTML = `<h3 class="chuva-pergunta">📊 ${seguro(d.turma.nome)} · últimos ${periodoTexto()}</h3>
    ${blocos([[`${d.resumo.jogaram}/${d.resumo.alunos}`, 'alunos jogaram'], [d.resumo.partidas, 'partidas'], [porcento(d.resumo.acerto), 'de acerto'], [d.resumo.minutos, 'minutos jogando']])}
    ${d.dificuldades.length ? `<div class="painel-alerta"><b>⚠️ Mais dificuldade da turma</b>${d.dificuldades.map((h) => `<p><b>${seguro(nomeHab(h.habilidade))}</b>: ${porcento(h.acerto)} de acerto${
      h.comDificuldade ? ` · ${h.comDificuldade} ${h.comDificuldade === 1 ? 'aluno abaixo' : 'alunos abaixo'} de 60%` : ''}</p>`).join('')}</div>` : ''}
    ${d.semJogar.length ? `<p class="painel-aviso">😴 Não jogaram no período: ${d.semJogar.map(seguro).join(', ')}</p>` : ''}
    <div class="painel-grafico" id="graf-semanas"></div>
    <div class="painel-grafico" id="graf-habs"></div>
    <h4 class="turma-subtitulo">👧 Alunos <small>toque para ver a ficha</small></h4>
    <div class="painel-tabela">${d.alunos.map((a) => `<button class="painel-aluno" type="button" data-id="${seguro(a.id)}">
      <span class="painel-aluno-nome">${seguro(a.nome)}</span>
      <span class="painel-aluno-acerto" style="--cor:${corDoAcerto(a.acerto)}">${porcento(a.acerto)}</span>
      <span class="painel-aluno-info">${a.partidas} ${a.partidas === 1 ? 'partida' : 'partidas'} · ${a.minutos} min · última ${dataCurta(a.ultima)}</span></button>`).join('')}</div>`;
  d.graficos = [];
  if (d.semanas.length) { const g = graficoSemanas('Acerto da turma por semana', d.semanas); $('graf-semanas').append(g); d.graficos.push(g); }
  if (d.habilidades.length) {
    const g = graficoBarras('Acerto por habilidade (menor primeiro)', d.habilidades.map((h) => ({ rotulo: nomeHab(h.habilidade), valor: h.acerto })));
    $('graf-habs').append(g); d.graficos.push(g);
  }
  if (!d.resumo.partidas) caixa.insertAdjacentHTML('beforeend', '<p class="quiz-status">Nenhuma partida no período. Quando os alunos jogarem (entrando pela turma), os gráficos aparecem aqui.</p>');
}

function desenharAluno(d) {
  const caixa = $('dados-conteudo');
  const comparaveis = d.habilidades.filter((h) => h.antes != null && h.depois != null);
  caixa.innerHTML = `<h3 class="chuva-pergunta">📈 ${seguro(d.aluno.nome)} · ${seguro(d.turma.nome)}</h3>
    <p class="painel-sub">Últimos ${periodoTexto()}</p>
    ${blocos([[d.resumo.partidas, 'partidas'], [porcento(d.resumo.acerto), 'de acerto'], [d.resumo.minutos, 'minutos jogando'], [dataCurta(d.resumo.ultima), 'última partida']])}
    <div class="painel-grafico" id="graf-semanas"></div>
    <div class="painel-grafico" id="graf-habs"></div>
    ${comparaveis.length ? `<h4 class="turma-subtitulo">↕️ Antes × depois <small>1ª metade × 2ª metade do período</small></h4>
      <div class="painel-comparacao">${comparaveis.map((h) => {
        const dif = h.depois - h.antes;
        return `<div class="painel-comp-linha"><span>${seguro(nomeHab(h.habilidade))}</span><span>${h.antes}% → <b>${h.depois}%</b></span>
          <span class="painel-dif ${dif > 0 ? 'subiu' : dif < 0 ? 'desceu' : ''}">${dif > 0 ? '▲' : dif < 0 ? '▼' : '='} ${Math.abs(dif)}</span></div>`;
      }).join('')}</div>` : ''}
    ${d.jogos.length ? `<h4 class="turma-subtitulo">🎮 Jogos que mais jogou</h4><div class="painel-comparacao">${d.jogos.slice(0, 6).map((j) => `<div class="painel-comp-linha">
      <span>${seguro(j.titulo)}</span><span>${j.partidas} ${j.partidas === 1 ? 'partida' : 'partidas'}</span><span style="color:${corDoAcerto(j.acerto)}"><b>${porcento(j.acerto)}</b></span></div>`).join('')}</div>` : ''}
    ${d.revisar.length ? `<h4 class="turma-subtitulo">📚 Para revisar <small>o que mais errou no período</small></h4><div class="painel-revisar">${d.revisar.map((r) => `<div class="painel-revisar-item">
      <b>${seguro(r.certa)}</b> <span class="painel-revisar-vezes">${r.vezes}×</span>
      <span class="painel-revisar-tipo">${seguro(r.tipo)} · ${seguro(r.jogo)}</span>
      ${r.respostas.length ? `<span class="painel-revisar-erro">respondeu: ${r.respostas.map(seguro).join(' · ')}</span>` : ''}</div>`).join('')}</div>` : ''}`;
  d.graficos = [];
  if (d.semanas.length) { const g = graficoSemanas('Evolução: acerto por semana', d.semanas); $('graf-semanas').append(g); d.graficos.push(g); }
  if (d.habilidades.length >= 3) { const g = graficoRadar('Habilidades', d.habilidades.slice(0, 10)); $('graf-habs').append(g); d.graficos.push(g); }
  else if (d.habilidades.length) {
    const g = graficoBarras('Habilidades', d.habilidades.map((h) => ({ rotulo: nomeHab(h.habilidade), valor: h.acerto })));
    $('graf-habs').append(g); d.graficos.push(g);
  }
  if (!d.resumo.partidas) caixa.insertAdjacentHTML('beforeend', '<p class="quiz-status">Nenhuma partida no período.</p>');
}

async function carregar() {
  $('dados-conteudo').innerHTML = '<p class="quiz-status carregando">Calculando…</p>';
  document.querySelectorAll('.periodo-botao').forEach((b) => b.classList.toggle('ativo', Number(b.dataset.dias) === dias));
  try {
    vista.dados = await api(vista.tipo === 'turma' ? `/turmas/${vista.id}/painel?dias=${dias}` : `/alunos/${vista.id}/ficha?dias=${dias}`);
    if (vista.tipo === 'turma') desenharTurma(vista.dados); else desenharAluno(vista.dados);
  } catch (err) { $('dados-conteudo').innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; }
}

// abre o painel de uma turma (voltar: volta para a turma) ou a ficha de um aluno (voltar: volta para o painel)
function abrirPainelTurma(turmaId, voltar) {
  vista = { tipo: 'turma', id: turmaId, voltar };
  parteProfessor('dados');
  carregar();
}
function abrirFicha(alunoId, voltar) {
  vista = { tipo: 'aluno', id: alunoId, voltar };
  parteProfessor('dados');
  carregar();
}

$('periodo-botoes').innerHTML = PERIODOS.map(([d, t]) => `<button class="periodo-botao" type="button" data-dias="${d}">${t}</button>`).join('');
$('periodo-botoes').onclick = (e) => { const b = e.target.closest('.periodo-botao'); if (b && vista) { SOM.clique(); dias = Number(b.dataset.dias); carregar(); } };
$('dados-conteudo').onclick = (e) => {
  const b = e.target.closest('.painel-aluno');
  if (!b || !vista) return;
  SOM.clique();
  const turmaId = vista.id, voltarTurma = vista.voltar;
  abrirFicha(b.dataset.id, () => abrirPainelTurma(turmaId, voltarTurma));
};
$('btn-dados-voltar').onclick = () => { SOM.clique(); if (vista?.voltar) vista.voltar(); };
$('btn-dados-pdf').onclick = () => { SOM.clique(); if (vista?.dados) baixarPDFdoPainel(vista); };

// ---------- PDF (jsPDF, o mesmo do relatório da partida) ----------
// a fonte padrão do PDF só tem as letras latinas: a seta vira "->" e o resto (emoji) sai
const paraPDF = (t) => String(t ?? '').replace(/→/g, '->').replace(/[^\u0000-ÿ–—•]/g, '').replace(/\s+/g, ' ').trim();
async function baixarPDFdoPainel({ tipo, dados: d }) {
  const lib = window.jspdf;
  if (!lib || !lib.jsPDF) { window.print(); return; }
  const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
  const AZUL = [19, 119, 132], TEXTO = [34, 54, 74], CINZA = [100, 116, 139];
  const L = 18, LARG = 210 - 2 * L;
  let y = 18;
  const pagina = (alt) => { if (y + alt > 280) { doc.addPage(); y = 20; } };
  const texto = (t, tam = 11, estilo = 'normal', cor = TEXTO) => {
    doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...cor);
    for (const l of doc.splitTextToSize(paraPDF(t), LARG)) { pagina(tam * 0.5); doc.text(l, L, y); y += tam * 0.45; }
  };
  const titulo = tipo === 'turma' ? `Painel da turma ${d.turma.nome}` : `Ficha de ${d.aluno.nome}`;
  texto(titulo, 20, 'bold', AZUL);
  texto(`${tipo === 'turma' ? '' : `Turma ${d.turma.nome} · `}Últimos ${periodoTexto()} · gerado em ${new Date().toLocaleDateString('pt-BR')}`, 10.5, 'normal', CINZA);
  y += 2; doc.setDrawColor(...AZUL); doc.setLineWidth(0.6); doc.line(L, y, L + LARG, y); y += 7;
  if (tipo === 'turma') {
    texto(`Alunos que jogaram: ${d.resumo.jogaram} de ${d.resumo.alunos}    Partidas: ${d.resumo.partidas}    Acerto: ${porcento(d.resumo.acerto)}    Minutos: ${d.resumo.minutos}`, 11, 'bold');
    if (d.dificuldades.length) { y += 2; texto('Mais dificuldade da turma', 13, 'bold', AZUL); d.dificuldades.forEach((h) => texto(`• ${nomeHab(h.habilidade)}: ${porcento(h.acerto)} de acerto${h.comDificuldade ? ` (${h.comDificuldade} abaixo de 60%)` : ''}`)); }
    if (d.semJogar.length) { y += 2; texto(`Não jogaram no período: ${d.semJogar.join(', ')}`, 10.5, 'italic', CINZA); }
  } else {
    texto(`Partidas: ${d.resumo.partidas}    Acerto: ${porcento(d.resumo.acerto)}    Minutos: ${d.resumo.minutos}    Última: ${dataCurta(d.resumo.ultima)}`, 11, 'bold');
  }
  y += 4;
  for (const g of d.graficos || []) {
    const larg = g.width / 2 === 480 ? LARG : Math.min(LARG, 140), alt = (larg * g.height) / g.width;   // o semanal na largura toda
    pagina(alt + 4);
    doc.addImage(g.toDataURL('image/png'), 'PNG', L + (LARG - larg) / 2, y, larg, alt, undefined, 'FAST');
    y += alt + 5;
  }
  if (tipo === 'turma') {
    texto('Alunos', 13, 'bold', AZUL);
    d.alunos.forEach((a) => texto(`${a.nome}: ${a.partidas} partidas · ${porcento(a.acerto)} de acerto · ${a.minutos} min · última ${dataCurta(a.ultima)}`, 10.5));
  } else {
    const comparaveis = d.habilidades.filter((h) => h.antes != null && h.depois != null);
    if (comparaveis.length) {
      texto('Antes × depois (1ª metade × 2ª metade do período)', 13, 'bold', AZUL);
      comparaveis.forEach((h) => texto(`${nomeHab(h.habilidade)}: ${h.antes}% → ${h.depois}% (${h.depois - h.antes >= 0 ? '+' : ''}${h.depois - h.antes})`, 10.5));
      y += 2;
    }
    if (d.revisar.length) {
      texto('Para revisar', 13, 'bold', AZUL);
      d.revisar.forEach((r) => texto(`• ${r.certa} (${r.vezes}x) · ${r.tipo}${r.respostas.length ? ` · respondeu: ${r.respostas.join(', ')}` : ''}`, 10));
    }
  }
  y += 4;
  texto('São indicadores para apoiar o acompanhamento pedagógico, não um diagnóstico.', 9, 'italic', CINZA);
  const nome = (tipo === 'turma' ? `painel-${d.turma.nome}` : `ficha-${d.aluno.nome}`).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  doc.save(`${nome}.pdf`);
}

export { abrirFicha, abrirPainelTurma };
