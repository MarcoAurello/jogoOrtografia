/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Jogo dos Gráficos. */

import { $, embaralhar, sortear } from './util.js?v=146';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=146';
import { SOM } from './som.js?v=146';
import { mascote, mostrar, telaJogos } from './telas.js?v=146';
import { escolherProfessorE } from './professor.js?v=146';
import { fimDaMissao, ultimoRelatorio } from './relatorio.js?v=146';
import { PERGUNTAS_GRAFICOS } from './dados-graficos.js?v=146';

// ---------- Jogo dos Gráficos ----------
// Leitura de gráficos (tratamento da informação). Aparece uma frase curta com dados e três gráficos: só um mostra os
// dados certos. São quatro tipos: colunas (barras em pé), barras (deitadas), linha e pizza (setores). Os gráficos errados
// imitam erros reais de leitura: valores de duas categorias trocados, um valor errado, a ordem do tempo invertida (na
// linha) e, na pizza, fatias trocadas ou de tamanho errado. Errou: o jogo explica o que está errado naquele gráfico e
// deixa tentar de novo; no segundo erro mostra o certo. Três níveis, escolhidos no menu (com estrelas, como no Jogo de
// Ortografia): no Fácil os números são pequenos e aparecem escritos nas colunas e barras; no Médio somem os números e
// entra a linha; no Difícil vêm centenas, milhares e decimais, e os gráficos errados diferem pouco (uma linha da escala).
const NIVEIS_GR = [
  { id: 'graficos-facil', nome: 'Fácil', icone: '🌱', cor: '#2e9e5b', descricao: 'Colunas, barras e pizza com números pequenos', valores: true, passos: [2, 3], fatia: [20, 25] },
  { id: 'graficos-medio', nome: 'Médio', icone: '🌿', cor: '#1e64d2', descricao: 'Entram as linhas; os números somem do gráfico', valores: false, passos: [1, 2], fatia: [10, 15, 20] },
  { id: 'graficos-dificil', nome: 'Difícil', icone: '🌳', cor: '#8e44ad', descricao: 'Centenas, milhares e diferenças pequenas', valores: false, passos: [1], fatia: [10] },
];
const POR_PARTIDA = 8;
const CORES_GR = ['#1e64d2', '#e53935', '#f7c600', '#2e9e5b', '#8e44ad'];
const TIPOS_GR = {
  colunas: { id: 'gr-colunas', titulo: 'Gráfico de colunas', icone: '📊', cor: '#1e64d2',
    regra: 'Ler a altura de cada coluna na escala do eixo (as linhas de fundo) para saber o valor de cada categoria.' },
  barras: { id: 'gr-barras', titulo: 'Gráfico de barras', icone: '📶', cor: '#00897b',
    regra: 'Ler até onde vai cada barra deitada, comparando com os números da escala embaixo.' },
  linha: { id: 'gr-linha', titulo: 'Gráfico de linha', icone: '📈', cor: '#2e9e5b',
    regra: 'Ler cada ponto na escala e acompanhar, da esquerda para a direita, se a linha sobe ou desce ao longo do tempo.' },
  pizza: { id: 'gr-pizza', titulo: 'Gráfico de pizza', icone: '🥧', cor: '#f57c00',
    regra: 'Comparar o tamanho das fatias: metade do círculo é 50%, um quarto é 25%; a fatia maior é a maior porcentagem.' },
};
let gr = null;   // a partida em andamento

const fmt = (v) => v.toLocaleString('pt-BR');
// escala "redonda" do eixo: passo 1, 2, 2,5 ou 5 (x 10, 100...) com umas 5 linhas
function passoDaEscala(max) {
  const bruto = max / 5, pot = 10 ** Math.floor(Math.log10(bruto || 1));
  return [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) || 10 * pot;
}

// ----- os gráficos errados, cada um com o motivo (vai para o feedback e para o relatório) -----
function distratores(q, nv) {
  const v = q.valores, r = q.rotulos, n = v.length, ehPizza = q.tipo === 'pizza';
  const passo = passoDaEscala(Math.max(...v));
  const opcoes = [];
  const igual = (a, b) => a.every((x, i) => x === b[i]);
  const juntar = (valores, motivo) => { if (!igual(valores, v) && !opcoes.some((o) => igual(o.valores, valores))) opcoes.push({ valores, motivo }); };
  const tentativas = [];
  // trocar os valores de duas categorias (diferentes o bastante para dar para ver)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (Math.abs(v[i] - v[j]) < (ehPizza ? 10 : passo * 0.8)) continue;
      const x = [...v]; [x[i], x[j]] = [x[j], x[i]];
      const motivo = ehPizza ? `Nesse gráfico, as fatias de ${r[i]} e ${r[j]} estão trocadas: ${r[i]} ficou com ${v[j]}% e ${r[j]} com ${v[i]}%.`
        : `Nesse gráfico, ${r[i]} aparece com ${fmt(v[j])} e ${r[j]} com ${fmt(v[i])}: os valores estão trocados.`;
      tentativas.push(() => juntar(x, motivo));
    }
  }
  // um valor errado (colunas, barras e linha) ou parte de uma fatia passada para outra (pizza)
  for (let t = 0; t < 4; t++) {
    if (ehPizza) {
      const i = Math.floor(Math.random() * n), j = (i + 1 + Math.floor(Math.random() * (n - 1))) % n, m = sortear(nv.fatia);
      if (v[i] - m < 5) continue;
      const x = [...v]; x[i] -= m; x[j] += m;
      tentativas.push(() => juntar(x, `Nesse gráfico, ${r[i]} aparece com ${x[i]}% e ${r[j]} com ${x[j]}%, mas o certo é ${r[i]} ${v[i]}% e ${r[j]} ${v[j]}%.`));
    } else {
      const i = Math.floor(Math.random() * n), novo = Math.round((v[i] + passo * sortear(nv.passos) * sortear([-1, 1])) * 10) / 10;
      if (novo < 0 || v.includes(novo)) continue;
      const x = [...v]; x[i] = novo;
      tentativas.push(() => juntar(x, `Nesse gráfico, ${r[i]} aparece com ${fmt(novo)}, mas o certo é ${fmt(v[i])}.`));
    }
  }
  // na linha, a ordem do tempo invertida
  if (q.tipo === 'linha') tentativas.push(() => juntar([...v].reverse(), `Esse gráfico está de trás para frente: começa com o valor de ${r[n - 1]} (${fmt(v[n - 1])}) e termina com o de ${r[0]} (${fmt(v[0])}).`));
  for (const f of embaralhar(tentativas)) { if (opcoes.length >= 2) break; f(); }
  // garantia: se faltar, muda mais um valor
  for (let t = 0; opcoes.length < 2 && t < 60; t++) {
    const i = t % n, x = [...v];
    if (ehPizza) { const j = (i + 1) % n; if (v[i] < 15) continue; x[i] -= 10; x[j] += 10; juntar(x, `Nesse gráfico, ${r[i]} aparece com ${x[i]}% e ${r[j]} com ${x[j]}%, mas o certo é ${r[i]} ${v[i]}% e ${r[j]} ${v[j]}%.`); }
    else { x[i] = Math.round((v[i] + passo * (Math.floor(t / n) + 1)) * 10) / 10; juntar(x, `Nesse gráfico, ${r[i]} aparece com ${fmt(x[i])}, mas o certo é ${fmt(v[i])}.`); }
  }
  return opcoes;
}

// ----- desenho dos gráficos (SVG 320 x 200; a mesma cor para cada categoria nos três) -----
const cor = (i) => CORES_GR[i % CORES_GR.length];
const curto = (txt) => (txt.length > 8 ? ' longo' : '');
// colunas e linha: categorias embaixo, escala na esquerda
function eixosVerticais(q, max, passo, L, R, T, B) {
  let s = `<text class="gr-eixo-titulo" x="6" y="15">${q.eixo || ''}</text>`;
  // linhas-guia no meio de cada intervalo (sem número), para ler valores como 25 entre o 20 e o 30
  for (let v = passo / 2; v < max; v += passo) { const y = B - (v / max) * (B - T); s += `<line class="gr-grade meia" x1="${L}" x2="${R}" y1="${y}" y2="${y}"/>`; }
  for (let v = 0; v <= max + 1e-9; v += passo) {
    const y = B - (v / max) * (B - T);
    s += `<line class="${v ? 'gr-grade' : 'gr-base'}" x1="${L}" x2="${R}" y1="${y}" y2="${y}"/><text class="gr-num" x="${L - 5}" y="${y + 3.5}">${fmt(Math.round(v * 10) / 10)}</text>`;
  }
  return s;
}
function svgColunas(q, valores, max, passo, comValores) {
  const L = 44, R = 310, T = 28, B = 166, n = valores.length, vaga = (R - L) / n, larg = vaga * 0.56;
  let s = eixosVerticais(q, max, passo, L, R, T, B);
  valores.forEach((v, i) => {
    const h = (v / max) * (B - T), x = L + vaga * i + (vaga - larg) / 2;
    s += `<rect class="gr-coluna" style="--i:${i}" x="${x}" y="${B - h}" width="${larg}" height="${Math.max(h, 0.01)}" rx="4" fill="${cor(i)}"/>`;
    if (comValores) s += `<text class="gr-valor" x="${x + larg / 2}" y="${B - h - 5}">${fmt(v)}</text>`;
    s += `<text class="gr-rotulo${curto(q.rotulos[i])}" x="${L + vaga * i + vaga / 2}" y="184">${q.rotulos[i]}</text>`;
  });
  return s;
}
function svgBarras(q, valores, max, passo, comValores) {
  const L = 86, R = 300, T = 26, B = 172, n = valores.length, vaga = (B - T) / n, alt = vaga * 0.56;
  let s = `<text class="gr-eixo-titulo" x="6" y="15">${q.eixo || ''}</text>`;
  for (let v = passo / 2; v < max; v += passo) { const x = L + (v / max) * (R - L); s += `<line class="gr-grade meia" x1="${x}" x2="${x}" y1="${T}" y2="${B}"/>`; }
  for (let v = 0; v <= max + 1e-9; v += passo) {
    const x = L + (v / max) * (R - L);
    s += `<line class="${v ? 'gr-grade' : 'gr-base'}" x1="${x}" x2="${x}" y1="${T}" y2="${B}"/><text class="gr-num meio" x="${x}" y="${B + 14}">${fmt(Math.round(v * 10) / 10)}</text>`;
  }
  valores.forEach((v, i) => {
    const w = (v / max) * (R - L), y = T + vaga * i + (vaga - alt) / 2;
    s += `<rect class="gr-barra" style="--i:${i}" x="${L}" y="${y}" width="${Math.max(w, 0.01)}" height="${alt}" rx="4" fill="${cor(i)}"/>`;
    if (comValores) s += `<text class="gr-valor inicio" x="${L + w + 5}" y="${y + alt / 2 + 4}">${fmt(v)}</text>`;
    s += `<text class="gr-rotulo fim${curto(q.rotulos[i])}" x="${L - 6}" y="${y + alt / 2 + 4}">${q.rotulos[i]}</text>`;
  });
  return s;
}
function svgLinha(q, valores, max, passo) {
  const L = 44, R = 310, T = 28, B = 166, n = valores.length, vaga = (R - L) / n;
  const pts = valores.map((v, i) => [L + vaga * i + vaga / 2, B - (v / max) * (B - T)]);
  let s = eixosVerticais(q, max, passo, L, R, T, B);
  s += `<polyline class="gr-linha" pathLength="1" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;
  pts.forEach(([x, y], i) => { s += `<circle class="gr-ponto" style="--i:${i}" cx="${x}" cy="${y}" r="5"/><text class="gr-rotulo${curto(q.rotulos[i])}" x="${x}" y="184">${q.rotulos[i]}</text>`; });
  return s;
}
function svgPizza(q, valores) {
  const cx = 92, cy = 104, raio = 80, total = valores.reduce((a, b) => a + b, 0);
  let s = '', ang = -Math.PI / 2;
  valores.forEach((v, i) => {
    if (!v) return;
    const a2 = ang + (v / total) * Math.PI * 2;
    const [x1, y1, x2, y2] = [cx + raio * Math.cos(ang), cy + raio * Math.sin(ang), cx + raio * Math.cos(a2), cy + raio * Math.sin(a2)];
    const d = v >= total ? `M${cx - raio} ${cy} a${raio} ${raio} 0 1 0 ${raio * 2} 0 a${raio} ${raio} 0 1 0 ${-raio * 2} 0`
      : `M${cx} ${cy} L${x1.toFixed(2)} ${y1.toFixed(2)} A${raio} ${raio} 0 ${a2 - ang > Math.PI ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    s += `<path class="gr-fatia" style="--i:${i}" d="${d}" fill="${cor(i)}"/>`;
    ang = a2;
  });
  s += `<circle cx="${cx}" cy="${cy}" r="${raio}" fill="none" stroke="#13294b" stroke-width="2.5"/>`;
  q.rotulos.forEach((rot, i) => {
    const y = cy - (q.rotulos.length * 26) / 2 + i * 26 + 5;
    s += `<rect x="186" y="${y}" width="16" height="16" rx="4" fill="${cor(i)}" stroke="#13294b" stroke-width="2"/><text class="gr-legenda" x="208" y="${y + 13}">${rot}</text>`;
  });
  return s;
}
function grafico(q, valores, max, passo, comValores) {
  const corpo = q.tipo === 'colunas' ? svgColunas(q, valores, max, passo, comValores) : q.tipo === 'barras' ? svgBarras(q, valores, max, passo, comValores)
    : q.tipo === 'linha' ? svgLinha(q, valores, max, passo) : svgPizza(q, valores);
  return `<svg class="gr-svg ${q.tipo}" viewBox="0 0 320 196" aria-hidden="true">${corpo}</svg>`;
}

// ----- telas -----
function telaGraficosMenu() {
  pararGraficos();
  const estrelas = lerEstrelas();
  $('graficos-niveis').innerHTML = NIVEIS_GR.map((nv, k) => `
      <button class="missao" style="--c:${nv.cor}" data-nivel="${k}" type="button">
        <span class="missao-icone">${nv.icone}</span>
        <span class="missao-titulo">${nv.nome}</span>
        <span class="missao-descricao">${nv.descricao}</span>
        <span class="missao-estrelas">${estrelasTexto(estrelas[nv.id] || 0)}</span>
      </button>`).join('');
  mascote('davi-graficos', 'oi');
  mostrar('tela-graficos-menu');
}

function comecarGraficos(k = 0) {
  pararGraficos();
  const nv = NIVEIS_GR[k];
  definirMissao({ id: nv.id, graficos: true, nivelGraficos: k, icone: '📊', cor: nv.cor, titulo: `Jogo dos Gráficos – ${nv.nome}` });
  definirResultados([]);
  // perguntas do nível alternando os tipos (colunas, barras, linha, pizza), para a partida ter de tudo
  const grupos = Object.keys(TIPOS_GR).map((t) => embaralhar(PERGUNTAS_GRAFICOS.filter((q) => q.nivel === k + 1 && q.tipo === t))).filter((g) => g.length);
  const fila = [];
  for (let i = 0; fila.length < POR_PARTIDA && grupos.some((g) => g.length); i++) { const g = grupos[i % grupos.length]; if (g.length) fila.push(g.shift()); }
  gr = { nv, fila: embaralhar(fila), idx: -1, pontos: 0, acertosDePrimeira: 0, pergunta: null, rodando: true };
  mostrar('tela-graficos');
  proximaGraficos();
}

function pararGraficos() {
  if (gr) gr.rodando = false;
  gr = null;
}
const msgGr = (texto, tipo = '') => { $('graficos-msg').innerHTML = texto; $('graficos-msg').className = `cores-msg graficos-msg ${tipo}`; };

function proximaGraficos() {
  gr.idx++;
  if (gr.idx >= gr.fila.length) { terminarGraficos(); return; }
  const q = gr.fila[gr.idx];
  const opcoes = embaralhar([{ valores: q.valores, certa: true }, ...distratores(q, gr.nv)]);
  // a mesma escala nos três gráficos (o maior valor de todos)
  const maior = Math.max(...opcoes.flatMap((o) => o.valores));
  const passo = passoDaEscala(maior), max = Math.ceil(maior / passo) * passo || passo;
  gr.pergunta = { q, opcoes, tentativas: [] };
  hudGraficos();
  const t = TIPOS_GR[q.tipo];
  $('graficos-tipo').textContent = `${t.icone} ${t.titulo}`;
  $('graficos-pergunta').textContent = q.texto;
  const caixa = $('graficos-opcoes');
  caixa.innerHTML = '';
  opcoes.forEach((o, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'graficos-opcao';
    b.style.animationDelay = `${i * 90}ms`;
    b.setAttribute('aria-label', `Gráfico ${'ABC'[i]}`);
    b.innerHTML = `<span class="graficos-letra">${'ABC'[i]}</span>${grafico(q, o.valores, max, passo, gr.nv.valores)}<small class="graficos-nota"></small>`;
    b.onclick = () => responderGraficos(o, b);
    caixa.append(b);
  });
  $('btn-graficos-proxima').hidden = true;
  msgGr(gr.idx === 0 ? (gr.nv.valores ? 'Compare os números de cada gráfico com a frase.' : 'Compare cada gráfico com a frase. Use as linhas da escala!') : '');
  $('tela-graficos').scrollTop = 0;
}

function hudGraficos() {
  $('graficos-nivel').textContent = `📊 ${gr.nv.nome} · ${gr.idx + 1}/${gr.fila.length}`;
  $('graficos-pontos').textContent = gr.pontos;
}

function responderGraficos(opcao, botao) {
  const p = gr && gr.pergunta;
  if (!p || p.resolvida || botao.disabled || !gr.rodando) return;
  const botoes = [...document.querySelectorAll('#graficos-opcoes .graficos-opcao')];
  const certoEl = botoes[p.opcoes.findIndex((o) => o.certa)];
  const resolver = () => {
    p.resolvida = true;
    botoes.forEach((b) => { b.disabled = true; if (b !== certoEl && !b.classList.contains('errada')) b.classList.add('apagada'); });
    certoEl.classList.add('certa');
    certoEl.querySelector('.graficos-nota').textContent = '✔ Este é o gráfico certo';
    const dados = p.q.rotulos.map((r, i) => `${r}: ${fmt(p.q.valores[i])}${p.q.tipo === 'pizza' ? '%' : ''}`).join(', ');
    resultados.push({ m: TIPOS_GR[p.q.tipo], certa: dados, erros: p.tentativas, nivel: gr.nv === NIVEIS_GR[0] ? 1 : gr.nv === NIVEIS_GR[1] ? 2 : 3 });
    $('btn-graficos-proxima').hidden = false;
  };
  if (opcao.certa) {
    gr.pontos += p.tentativas.length ? 5 : 10;
    if (!p.tentativas.length) gr.acertosDePrimeira++;
    SOM.certo();
    const como = { pizza: 'Cada fatia tem o tamanho certo da sua parte.', linha: 'Cada ponto está na altura certa da escala, na ordem do tempo.',
      barras: 'Cada barra vai até o número certo da escala.', colunas: 'Cada coluna chega na altura certa da escala.' }[p.q.tipo];
    msgGr(`✅ Isso! ${como}`, 'ok');
    resolver();
  } else {
    p.tentativas.push(opcao.motivo);
    botao.disabled = true;
    botao.classList.add('errada');
    botao.querySelector('.graficos-nota').textContent = `✘ ${opcao.motivo.replace(/^Nesse gráfico, |^Esse gráfico /, '').replace(/^./, (c) => c.toUpperCase())}`;
    SOM.errado();
    if (p.tentativas.length === 1) msgGr(`❌ ${opcao.motivo} Compare de novo com a frase e tente outro gráfico!`, 'erro');
    else { msgGr(`❌ ${opcao.motivo} O certo é o gráfico ${'ABC'[botoes.indexOf(certoEl)]}: veja como cada valor bate com a frase.`, 'erro'); resolver(); }
  }
  hudGraficos();
}

function terminarGraficos() {
  const { fila, pontos, acertosDePrimeira, nv } = gr;
  pararGraficos();
  const porTipo = Object.values(TIPOS_GR).map((t) => {
    const rs = resultados.filter((r) => r.m === t);
    return rs.length ? `${t.titulo}: ${rs.filter((r) => !r.erros.length).length} de ${rs.length}` : '';
  }).filter(Boolean);
  const motivos = resultados.flatMap((r) => r.erros);
  const trocas = motivos.filter((m) => /trocad/.test(m)).length, ordem = motivos.filter((m) => /trás para frente/.test(m)).length;
  missao.resumo = [
    `Nível ${nv.nome}: acertou de primeira ${acertosDePrimeira} de ${fila.length} gráficos (${porTipo.join('; ')}).`,
    motivos.length ? `Escolheu gráficos errados ${motivos.length} ${motivos.length === 1 ? 'vez' : 'vezes'}: ${trocas} com valores ou fatias trocados, ${ordem} com a ordem do tempo invertida e ${motivos.length - trocas - ordem} com um valor errado.` : 'Não escolheu nenhum gráfico errado.',
  ];
  fimDaMissao();
  const n = ultimoRelatorio.estrelas;
  $('fim-titulo').textContent = n === 3 ? 'Leitor de gráficos! 📊' : 'Fim dos gráficos!';
  $('fim-texto').textContent = `${aluno}, você acertou de primeira ${acertosDePrimeira} de ${fila.length} gráficos no nível ${nv.nome} e fez ${pontos} pontos!`;
}

$('graficos-niveis').onclick = (e) => { const b = e.target.closest('[data-nivel]'); if (b) { SOM.clique(); comecarGraficos(Number(b.dataset.nivel)); } };
$('btn-graficos-proxima').onclick = () => { SOM.clique(); proximaGraficos(); };
$('btn-graficos').onclick = () => { SOM.clique(); escolherProfessorE('Jogo dos Gráficos', telaGraficosMenu); };
$('graficos-voltar').onclick = telaJogos;
$('graficos-sair').onclick = telaGraficosMenu;

export { comecarGraficos, pararGraficos, telaGraficosMenu };
