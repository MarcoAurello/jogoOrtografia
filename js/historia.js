/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Cronologia da História Brasileira. */

import { $, embaralhar, seguro } from './util.js?v=241';
import { aluno, definirMissao, definirResultados, estrelasTexto, lerEstrelas, missao, resultados } from './estado.js?v=241';
import { SOM, tocar } from './som.js?v=241';
import { mascote, mostrar, telaJogos } from './telas.js?v=241';
import { escolherProfessorE } from './professor.js?v=241';
import { fimDaMissao } from './relatorio.js?v=241';
import { CONJUNTURA_HISTORIA, ERAS_HISTORIA, EVENTOS_HISTORIA, FASES_HISTORIA } from './dados-historia.js?v=241';

// ---------- Cronologia da História Brasileira ----------
// A linha do tempo já vem com 2 acontecimentos (as âncoras, com o ano à mostra). Na mão ficam de 3 a 5 cartas com
// o ano escondido: a criança toca na carta e depois no ＋ onde ela se encaixa (ou arrasta a carta até lá). Acertou:
// a carta revela o ano e o contexto, e a linha cresce. Errou: a carta balança com a cor da era certa, diz se o fato
// foi antes ou depois do vizinho e volta para a mão; no 2º erro aparece o "Consultar Arquivo" (pista) e no 3º a
// carta vai sozinha para o lugar certo (vale 0). Erro não tira pontos, só zera o combo.
// Carta no lugar certo (acertando ou colocada pelo jogo): abre o pergaminho com a conjuntura da época e o Continuar.
// Acertar de primeira desbloqueia o documento da carta no Arquivo da Nação (guardado só no aparelho).
const HISTORIA = { BASE: 100, SEM_DICA: 50, BONUS_ERA: 500, BONUS_DOCS: 300, MAX_ERROS: 3 };
const EVENTO = Object.fromEntries(EVENTOS_HISTORIA.map((e) => [e.id, e]));
const ERA = Object.fromEntries(ERAS_HISTORIA.map((e) => [e.id, e]));
let eraEscolhida = 'colonia';
let ultimaFase = 0;   // para o Jogar de novo da tela de fim
let hist = null;   // a partida em andamento

// ---------- Arquivo da Nação (no aparelho, separado por aluno) ----------
const chaveArquivo = () => 'pleno-ortografia:historia:' + (aluno || '').trim().toLowerCase();
function lerArquivo() {
  try { const a = JSON.parse(localStorage.getItem(chaveArquivo())) || {}; return { docs: a.docs || [], bonus: a.bonus || [] }; }
  catch (e) { return { docs: [], bonus: [] }; }
}
function salvarArquivo(a) { try { localStorage.setItem(chaveArquivo(), JSON.stringify(a)); } catch (e) { /* sem armazenamento */ } }

// o ano como aparece na linha (os aproximados avisam, como no livro)
const anoHTML = (ev) => `${ev.aprox ? '<small>por volta de</small> ' : ''}${ev.ano}`;
const anoTexto = (ev) => `${ev.aprox ? 'por volta de ' : ''}${ev.ano}`;
const figura = (ev) => (ev.imagem ? `<img src="${ev.imagem}" alt="" loading="lazy">` : ev.icone);
// no relatório, cada era é um grupo ("Acertos de primeira por era")
const tipoDaEra = (era) => ({ id: `historia-${era.id}`, titulo: `${era.nome} (${era.periodo})`, icone: era.icone, cor: era.cor, regra: era.regra });

// ---------- Menu: eras e fases ----------
function telaHistoriaMenu() {
  pararHistoria();
  mascote('davi-historia', 'oi');
  desenharEras();
  desenharFases();
  mostrar('tela-historia-menu');
}

function desenharEras() {
  $('historia-eras').innerHTML = ERAS_HISTORIA.map((e, i) => `
    <button class="historia-era${e.id === eraEscolhida ? ' ativa' : ''}" type="button" data-era="${e.id}" style="--c:${e.cor}"${e.disponivel ? '' : ' disabled'}>
      <span class="historia-era-icone">${e.icone}</span>
      <span class="historia-era-nome">${i + 1}. ${e.nome}</span>
      <small>${e.disponivel ? e.periodo : 'Em breve'}</small>
    </button>`).join('');
}

// todas as fases ficam abertas: o professor pode dar aula de qualquer parte da história
function desenharFases() {
  const fases = FASES_HISTORIA[eraEscolhida] || [];
  const estrelas = lerEstrelas();
  const cor = ERA[eraEscolhida].cor;
  $('historia-fases').innerHTML = fases.map((f, k) => {
    const aberta = true;
    return `<button class="missao${aberta ? '' : ' bloqueada'}" style="--c:${cor}" data-fase="${k}" type="button"${aberta ? '' : ' disabled'}>
        <span class="missao-icone">${aberta ? f.icone : '🔒'}</span>
        <span class="missao-titulo">Fase ${k + 1}</span>
        <span class="missao-descricao">${f.nome} · ${f.cartas} cartas</span>
        <span class="missao-estrelas">${aberta ? estrelasTexto(estrelas[f.id] || 0) : 'Termine a fase anterior'}</span>
      </button>`;
  }).join('');
}

$('historia-eras').onclick = (e) => {
  const b = e.target.closest('[data-era]');
  if (!b || b.disabled) return;
  SOM.clique();
  eraEscolhida = b.dataset.era;
  desenharEras();
  desenharFases();
};
$('historia-fases').onclick = (e) => {
  const b = e.target.closest('[data-fase]');
  if (!b || b.disabled) return;
  SOM.clique();
  comecarHistoria(Number(b.dataset.fase));
};

// ---------- Partida ----------
function comecarHistoria(k = 0) {
  pararHistoria();
  const era = ERA[eraEscolhida];
  const fase = FASES_HISTORIA[era.id][k];
  ultimaFase = k;
  // sorteio: as cartas da mão e 2 âncoras saem do banco da fase
  const banco = embaralhar(fase.eventos.map((id) => EVENTO[id]));
  const mao = banco.slice(0, fase.cartas);
  const linha = banco.slice(fase.cartas, fase.cartas + 2).sort((a, b) => a.ano - b.ano).map((ev) => ({ ev, ancora: true }));
  definirMissao({ id: fase.id, historia: true, icone: '📜', cor: era.cor, titulo: `Cronologia da História Brasileira – ${fase.nome}` });
  definirResultados([]);
  hist = { era, fase, k, mao, linha, total: mao.length, sel: null, tent: {}, errosDe: {}, dica: {}, combo: 0, pontos: 0,
    dePrimeira: 0, dicas: 0, sozinhas: 0, novosDocs: 0, rodando: true, lendo: false };
  mostrar('tela-historia');
  msgHistoria('Toque numa carta para ler o que aconteceu. Depois toque no <b>＋</b> onde ela se encaixa (ou arraste a carta).');
  desenharHistoria();
}

function pararHistoria() {
  if (hist) hist.rodando = false;
  hist = null;
  $('historia-pergaminho').hidden = true;
  soltarArrasto();
}
const msgHistoria = (texto, tipo = '') => { $('historia-msg').innerHTML = texto; $('historia-msg').className = `historia-msg ${tipo}`; };

function desenharHistoria() {
  const h = hist;
  if (!h) return;
  $('historia-fase').textContent = `${h.era.icone} Fase ${h.k + 1}: ${h.fase.nome}`;
  $('historia-pontos').textContent = h.pontos;
  $('historia-progresso').textContent = `Encaixadas: ${h.total - h.mao.length} de ${h.total}`;
  const mult = multiplicador(h.combo);
  $('historia-combo').textContent = mult > 1 ? `🔥 Combo x${mult}` : '';
  // linha do tempo: um ＋ antes, entre e depois de cada acontecimento
  const slot = (i) => {
    const antes = h.linha[i - 1], depois = h.linha[i];
    const rotulo = antes && depois ? `entre ${antes.ev.ano} e ${depois.ev.ano}` : antes ? `depois de ${antes.ev.ano}` : `antes de ${depois.ev.ano}`;
    return `<div class="historia-gap"><button class="historia-slot" type="button" data-pos="${i}" aria-label="Colocar ${rotulo}"><span>＋</span></button></div>`;
  };
  const item = ({ ev, ancora, novo }) => `
    <div class="historia-item${ancora ? ' ancora' : ''}${novo ? ' novo' : ''}" style="--c:${ERA[ev.era].cor}">
      <span class="historia-item-lado">
        <span class="historia-ano${ev.aprox ? ' aprox' : ''}">${anoHTML(ev)}</span>
        <button class="historia-info" type="button" data-info="${ev.id}" aria-label="Mais detalhes: ${ev.titulo}">+ detalhes</button>
      </span>
      <span class="historia-item-icone" aria-hidden="true">${figura(ev)}</span>
      <span class="historia-item-titulo">${ev.titulo}</span>
    </div>`;
  const linha = $('historia-linha');
  linha.innerHTML = h.linha.map((x, i) => slot(i) + item(x)).join('') + slot(h.linha.length);
  const novo = linha.querySelector('.historia-item.novo');
  h.linha.forEach((x) => { x.novo = false; });
  linha.classList.toggle('escolhendo', !!h.sel);
  ajustarLinha(novo);
  // a mão: só ícone e título (a frase aparece na mensagem ao tocar), o ano escondido
  $('historia-mao').innerHTML = h.mao.map((ev) => `
    <div class="historia-carta-caixa">
      <button class="historia-carta${h.sel === ev.id ? ' selecionada' : ''}" type="button" data-id="${ev.id}" style="--c:${ERA[ev.era].cor}">
        <span class="historia-carta-icone" aria-hidden="true">${figura(ev)}</span>
        <span class="historia-carta-titulo">${ev.titulo}</span>
        <span class="historia-carta-ano">? ? ? ?</span>
      </button>
      <button class="historia-info" type="button" data-info="${ev.id}" aria-label="Mais detalhes: ${ev.titulo}">+ detalhes</button>
    </div>`).join('');
  $('btn-historia-dica').hidden = !h.sel || (h.tent[h.sel] || 0) < 2 || h.dica[h.sel];
}

// a linha do tempo tem que caber na tela sem rolar: se passar da altura, fica compacta (sem os ícones e com a
// letra menor). Se nem assim couber (tela muito baixa), rola e o acontecimento novo fica à vista.
function ajustarLinha(novo) {
  const linha = $('historia-linha');
  linha.classList.remove('compacta');
  if (linha.scrollHeight > linha.clientHeight + 2) linha.classList.add('compacta');
  if (novo && linha.scrollHeight > linha.clientHeight + 2) novo.scrollIntoView({ block: 'nearest' });
}
window.addEventListener('resize', () => { if (hist && document.querySelector('#tela-historia.ativa')) ajustarLinha(); });

const multiplicador = (combo) => (combo >= 3 ? 3 : combo >= 2 ? 2 : 1);

// alternar: tocar de novo na carta escolhida tira a escolha (depois de arrastar, ela fica escolhida)
function escolherCarta(id, alternar = true) {
  const h = hist;
  if (!h || !h.rodando || h.lendo) return;
  h.sel = alternar && h.sel === id ? null : id;
  SOM.clique();
  if (h.sel) {
    const ev = EVENTO[id];
    // o que fazer já aparece no trilho (os ＋ pulsando): a mensagem fica só com o que a carta conta
    msgHistoria(`<b>${ev.icone} ${ev.titulo}:</b> ${ev.frase}`);
  }
  desenharHistoria();
}

// a carta foi colocada na posição pos da linha (0 = antes de todas)
function tentar(id, pos) {
  const h = hist;
  if (!h || !h.rodando || h.lendo) return;
  const ev = EVENTO[id];
  const antes = h.linha[pos - 1], depois = h.linha[pos];
  const certo = (!antes || antes.ev.ano < ev.ano) && (!depois || ev.ano < depois.ev.ano);
  h.errosDe[id] = h.errosDe[id] || [];
  if (certo) { acertou(ev, pos); return; }
  // errou: onde colocou vai para o relatório; a mensagem diz se o fato foi antes ou depois do vizinho
  h.tent[id] = (h.tent[id] || 0) + 1;
  h.combo = 0;
  h.errosDe[id].push(`colocou ${antes ? `depois de ${antes.ev.ano}` : 'no começo'}${depois ? ` e antes de ${depois.ev.ano}` : ''}`);
  SOM.errado();
  if (navigator.vibrate) navigator.vibrate(200);
  if (h.tent[id] >= HISTORIA.MAX_ERROS) { colocarSozinha(ev); return; }
  const ref = antes && ev.ano < antes.ev.ano ? `<b>antes</b> de “${antes.ev.titulo}” (${antes.ev.ano})` : `<b>depois</b> de “${depois.ev.titulo}” (${depois.ev.ano})`;
  const era = ERA[ev.era];
  msgHistoria(`Quase! Esse acontecimento foi ${ref}. <span class="historia-era-chip" style="--c:${era.cor}">${era.icone} ${era.nome}</span>`
    + `${h.tent[id] === 2 ? ' Toque em <b>📜 Consultar Arquivo</b> para uma pista.' : ''}`, 'erro');
  h.sel = id;
  desenharHistoria();
  // a carta balança com a aura da era certa
  const carta = $('historia-mao').querySelector(`[data-id="${id}"]`);
  if (carta) carta.classList.add('balanca');
}

function acertou(ev, pos) {
  const h = hist;
  const dePrimeira = !h.tent[ev.id];
  h.combo++;
  const mult = multiplicador(h.combo);
  const ganho = (HISTORIA.BASE + (h.dica[ev.id] ? 0 : HISTORIA.SEM_DICA)) * mult;
  h.pontos += ganho;
  h.linha.splice(pos, 0, { ev, novo: true });
  h.mao = h.mao.filter((x) => x.id !== ev.id);
  h.sel = null;
  resultados.push({ m: tipoDaEra(h.era), certa: `${anoTexto(ev)} – ${ev.titulo}`, erros: h.errosDe[ev.id] });
  let doc = '';
  if (dePrimeira) {
    h.dePrimeira++;
    const a = lerArquivo();
    if (!a.docs.includes(ev.id)) { a.docs.push(ev.id); salvarArquivo(a); h.novosDocs++; doc = ' <span class="historia-doc-novo">📜 Documento desbloqueado!</span>'; }
  }
  SOM.certo();
  msgHistoria(`✅ <b>${anoTexto(ev)}</b> — ${ev.contexto} <b>+${ganho}</b>${mult > 1 ? ` (combo x${mult})` : ''}${doc}`, 'ok');
  desenharHistoria();
  abrirPergaminho(ev, `✅ <b>+${ganho} pontos</b>${mult > 1 ? ` (combo x${mult})` : ''}${doc}`);
}

// 3º erro: a carta vai para o lugar certo e explica (vale 0, a criança nunca fica travada)
function colocarSozinha(ev) {
  const h = hist;
  const pos = h.linha.filter((x) => x.ev.ano < ev.ano).length;
  h.linha.splice(pos, 0, { ev, novo: true });
  h.mao = h.mao.filter((x) => x.id !== ev.id);
  h.sel = null;
  h.sozinhas++;
  resultados.push({ m: tipoDaEra(h.era), certa: `${anoTexto(ev)} – ${ev.titulo}`, erros: [...h.errosDe[ev.id], 'foi colocada pelo jogo'] });
  msgHistoria(`📌 O lugar certo era este: <b>${anoTexto(ev)}</b> — ${ev.contexto}`, 'erro');
  desenharHistoria();
  abrirPergaminho(ev, '📌 Depois de 3 tentativas, o jogo colocou esta carta no lugar certo. Leia e continue!');
}

// ---------- Pergaminho: a conjuntura do acontecimento (a partida espera o Continuar) ----------
// modo 'acerto': a carta acabou de entrar na linha (o Continuar segue o jogo); 'linha': o + detalhes de uma carta já
// na linha (conjuntura completa); 'mao': o + detalhes de uma carta da mão (só a descrição, sem o ano: senão entrega a resposta)
function abrirPergaminho(ev, extra, modo = 'acerto') {
  const h = hist;
  h.lendo = true;
  h.modoPergaminho = modo;
  const escondido = modo === 'mao';
  $('historia-perg-ano').innerHTML = escondido ? '? ? ? ?' : anoHTML(ev);
  $('historia-perg-ano').style.setProperty('--c', ERA[ev.era].cor);
  $('historia-perg-titulo').textContent = `${ev.icone} ${ev.titulo}`;
  $('historia-perg-texto').textContent = escondido ? ev.frase : CONJUNTURA_HISTORIA[ev.id] || ev.contexto;
  $('historia-perg-extra').innerHTML = extra;
  $('historia-pergaminho').hidden = false;
  $('btn-historia-continuar').focus();
}
$('btn-historia-continuar').onclick = () => {
  const h = hist;
  $('historia-pergaminho').hidden = true;
  SOM.clique();
  if (!h) return;
  h.lendo = false;
  if (h.modoPergaminho !== 'acerto') return;   // só estava lendo: o jogo continua de onde parou
  if (!h.mao.length) { h.rodando = false; terminarHistoria(); return; }
  msgHistoria('Escolha a próxima carta. 👇');
};
// botão + detalhes: abre o pergaminho da carta (na linha, a conjuntura completa; na mão, só a descrição)
function abrirInformacoes(id, naMao) {
  const h = hist;
  if (!h || !h.rodando || h.lendo) return;
  SOM.clique();
  abrirPergaminho(EVENTO[id], naMao ? '🔎 Coloque a carta na linha do tempo para descobrir o ano e a conjuntura completa.' : '', naMao ? 'mao' : 'linha');
}

$('btn-historia-dica').onclick = () => {
  const h = hist;
  if (!h || !h.sel) return;
  h.dica[h.sel] = true;
  h.dicas++;
  tocar([[523, 0.1], [659, 0.1], [784, 0.16]]);
  msgHistoria(`📜 <b>Arquivo:</b> ${EVENTO[h.sel].dica}`, 'dica');
  desenharHistoria();
};

function terminarHistoria() {
  const h = hist;
  if (!h) return;
  // bônus que só valem uma vez: terminar todas as fases da era e desbloquear todos os documentos dela
  const a = lerArquivo();
  const fases = FASES_HISTORIA[h.era.id];
  const estrelas = lerEstrelas();
  const bonus = [];
  if (!a.bonus.includes(h.era.id) && fases.every((f) => f.id === h.fase.id || (estrelas[f.id] || 0) > 0)) {
    a.bonus.push(h.era.id); bonus.push(`+${HISTORIA.BONUS_ERA} por completar a era ${h.era.nome}`); h.pontos += HISTORIA.BONUS_ERA;
  }
  const daEra = EVENTOS_HISTORIA.filter((e) => e.era === h.era.id);
  if (!a.bonus.includes(`${h.era.id}-docs`) && daEra.every((e) => a.docs.includes(e.id))) {
    a.bonus.push(`${h.era.id}-docs`); bonus.push(`+${HISTORIA.BONUS_DOCS} por todos os documentos da era`); h.pontos += HISTORIA.BONUS_DOCS;
  }
  if (bonus.length) salvarArquivo(a);
  const comErro = Object.entries(h.errosDe).filter(([, e]) => e.length).map(([id, e]) => `${EVENTO[id].titulo} (${e.length})`);
  pararHistoria();
  missao.extra = '';
  missao.resumo = [
    `Pontos: ${h.pontos}. Fase ${h.k + 1} do ${h.era.nome}: ${h.fase.nome}.`,
    `Encaixou ${h.dePrimeira} de ${h.total} acontecimentos de primeira.`,
    comErro.length ? `Errou a posição de: ${comErro.join(', ')}.` : 'Nenhum erro: colocou tudo na ordem certa!',
    ...(h.dicas ? [`Consultou o Arquivo (dica) ${h.dicas} ${h.dicas === 1 ? 'vez' : 'vezes'}.`] : []),
    ...(h.sozinhas ? [`${h.sozinhas} ${h.sozinhas === 1 ? 'carta foi colocada' : 'cartas foram colocadas'} pelo jogo depois de 3 erros.`] : []),
  ];
  fimDaMissao();
  $('fim-titulo').textContent = h.dePrimeira === h.total ? 'Historiador de primeira! 📜' : 'Fase concluída! 📜';
  $('fim-texto').textContent = `${aluno}, você encaixou ${h.dePrimeira} de ${h.total} de primeira e fez ${h.pontos} pontos!`
    + (h.novosDocs ? ` Ganhou ${h.novosDocs} ${h.novosDocs === 1 ? 'documento novo' : 'documentos novos'} no Arquivo da Nação.` : '')
    + (bonus.length ? ` Bônus: ${bonus.join('; ')}!` : '');
  // logo abaixo das estrelas: seguir para a próxima fase (ou era), jogar de novo ou escolher outra, sem rolar a tela
  const proxima = fases[h.k + 1];
  const proximaEra = !proxima && ERAS_HISTORIA[ERAS_HISTORIA.findIndex((e) => e.id === h.era.id) + 1];
  $('fim-acoes').innerHTML = `
    ${proxima ? `<button class="btn-grande" type="button" data-fim="proxima">▶ Próxima: ${proxima.nome}</button>`
      : proximaEra ? `<button class="btn-grande" type="button" data-fim="proxima">▶ Próxima era: ${proximaEra.nome}</button>` : ''}
    <button class="btn-sec" type="button" data-fim="repetir">🔁 Jogar de novo</button>
    <button class="btn-sec" type="button" data-fim="sair">☰ Escolher outra fase</button>`;
  $('fim-acoes').onclick = (e) => {
    const b = e.target.closest('[data-fim]');
    if (!b) return;
    SOM.clique();
    if (b.dataset.fim === 'proxima') { if (proxima) comecarHistoria(h.k + 1); else { eraEscolhida = proximaEra.id; comecarHistoria(0); } }
    else if (b.dataset.fim === 'repetir') comecarHistoria(h.k);
    else telaHistoriaMenu();
  };
  $('fim-acoes').hidden = false;
  $('fim-acoes').querySelector('.btn-grande, .btn-sec').focus({ preventScroll: true });
}
const repetirHistoria = () => comecarHistoria(ultimaFase);

// ---------- Tocar e arrastar ----------
// Tocar: escolhe a carta (click). Arrastar: depois de mexer 10 px, a carta vira um "fantasma" que segue o dedo um
// pouco acima dele (para o dedo não tapar o título); ao soltar em cima de um ＋, tenta aquela posição.
let arrasto = null;
$('historia-mao').addEventListener('pointerdown', (e) => {
  const carta = e.target.closest('.historia-carta');
  if (!carta || !hist || !hist.rodando || hist.lendo || e.button > 0) return;
  arrasto = { id: carta.dataset.id, x: e.clientX, y: e.clientY, carta, fantasma: null, mira: null, moveu: false };
});
window.addEventListener('pointermove', (e) => {
  if (!arrasto) return;
  if (!arrasto.fantasma) {
    if (Math.hypot(e.clientX - arrasto.x, e.clientY - arrasto.y) < 10) return;
    arrasto.moveu = true;
    hist.sel = arrasto.id;
    $('historia-linha').classList.add('escolhendo');
    const f = arrasto.carta.cloneNode(true);
    f.classList.add('historia-fantasma');
    f.classList.remove('balanca');
    f.style.width = `${arrasto.carta.offsetWidth}px`;
    document.body.append(f);
    arrasto.fantasma = f;
    arrasto.carta.classList.add('arrastando');
  }
  e.preventDefault();
  const f = arrasto.fantasma;
  f.style.left = `${e.clientX - f.offsetWidth / 2}px`;
  f.style.top = `${e.clientY - f.offsetHeight - 40}px`;
  // a mira é o espaço da linha mais perto do dedo
  const pos = posicaoNaLinha(e.clientX, e.clientY);
  const mira = pos == null ? null : $('historia-linha').querySelector(`.historia-slot[data-pos="${pos}"]`);
  if (mira !== arrasto.mira) { if (arrasto.mira) arrasto.mira.classList.remove('mira'); if (mira) mira.classList.add('mira'); arrasto.mira = mira; }
  rolarLinhaPerto(e.clientX, e.clientY);
}, { passive: false });
window.addEventListener('pointerup', (e) => {
  if (!arrasto) return;
  const { id, fantasma, moveu } = arrasto;
  let pos = null;
  if (fantasma) pos = posicaoNaLinha(e.clientX, e.clientY);
  soltarArrasto();
  if (!moveu) return;   // foi só um toque: o click escolhe a carta
  // o click que o navegador pode disparar logo depois de soltar não conta como toque
  ignorarCliqueAte = performance.now() + 400;
  if (pos != null) tentar(id, pos); else escolherCarta(id, false);
});
window.addEventListener('pointercancel', soltarArrasto);
// dedo em cima da linha do tempo: quantos acontecimentos ficam antes dele (pelo meio de cada um; na vertical
// conta a altura, no computador, com a linha deitada, conta a largura). Fora da linha: nenhuma posição.
function posicaoNaLinha(x, y) {
  const linha = $('historia-linha');
  const r = linha.getBoundingClientRect();
  if (x < r.left - 20 || x > r.right + 20 || y < r.top - 30 || y > r.bottom + 30) return null;
  const deitada = getComputedStyle(linha).flexDirection === 'row';
  return [...linha.querySelectorAll('.historia-item')].filter((it) => {
    const b = it.getBoundingClientRect();
    return deitada ? b.left + b.width / 2 < x : b.top + b.height / 2 < y;
  }).length;
}
function soltarArrasto() {
  if (!arrasto) return;
  if (arrasto.fantasma) arrasto.fantasma.remove();
  if (arrasto.mira) arrasto.mira.classList.remove('mira');
  arrasto.carta.classList.remove('arrastando');
  arrasto = null;
}
// perto da borda da linha do tempo, ela rola sozinha (para alcançar os ＋ que estão fora da tela)
function rolarLinhaPerto(x, y) {
  const linha = $('historia-linha');
  const r = linha.getBoundingClientRect();
  const horizontal = linha.scrollWidth > linha.clientWidth + 4;
  if (horizontal) { if (x < r.left + 50) linha.scrollLeft -= 12; else if (x > r.right - 50) linha.scrollLeft += 12; }
  else if (x >= r.left && x <= r.right) { if (y < r.top + 50) linha.scrollTop -= 12; else if (y > r.bottom - 50 && y < r.bottom + 60) linha.scrollTop += 12; }
}

let ignorarCliqueAte = 0;
$('historia-mao').onclick = (e) => {
  if (performance.now() < ignorarCliqueAte) return;
  const info = e.target.closest('.historia-info');
  if (info) { abrirInformacoes(info.dataset.info, true); return; }
  const carta = e.target.closest('.historia-carta');
  if (carta) escolherCarta(carta.dataset.id);
};
$('historia-linha').onclick = (e) => {
  const info = e.target.closest('.historia-info');
  if (info) { abrirInformacoes(info.dataset.info, false); return; }
  const slot = e.target.closest('.historia-slot');
  if (!slot || !hist) return;
  if (!hist.sel) { msgHistoria('Primeiro toque numa carta lá embaixo. 👇'); return; }
  tentar(hist.sel, Number(slot.dataset.pos));
};

// ---------- Arquivo da Nação ----------
function telaArquivo() {
  const a = lerArquivo();
  const eras = ERAS_HISTORIA.filter((e) => e.disponivel);
  const todos = EVENTOS_HISTORIA.filter((e) => ERA[e.era].disponivel);
  $('historia-arquivo-total').textContent = `${todos.filter((e) => a.docs.includes(e.id)).length} de ${todos.length} documentos`;
  $('historia-arquivo-lista').innerHTML = eras.map((era) => `
    <h3 class="historia-arquivo-era" style="--c:${era.cor}">${era.icone} ${era.nome} <small>${era.periodo}</small></h3>
    <div class="historia-arquivo-grade">${EVENTOS_HISTORIA.filter((e) => e.era === era.id).map((ev) => (a.docs.includes(ev.id) ? `
      <article class="historia-doc" style="--c:${era.cor}">
        <header><span class="historia-ano">${anoHTML(ev)}</span> ${ev.icone} <b>${ev.titulo}</b></header>
        <h4>${ev.doc.titulo}</h4>
        <p>${ev.doc.texto}</p>
        <small>Fonte: ${seguro(ev.doc.fonte)}</small>
      </article>` : `
      <article class="historia-doc trancado">
        <header>🔒 <b>Documento escondido</b></header>
        <p>Acerte um acontecimento de primeira para desbloquear.</p>
      </article>`)).join('')}</div>`).join('');
  mostrar('tela-historia-arquivo');
}

$('btn-historia').onclick = () => { SOM.clique(); escolherProfessorE('Cronologia da História Brasileira', telaHistoriaMenu); };
$('historia-voltar').onclick = telaJogos;
$('btn-historia-arquivo').onclick = () => { SOM.clique(); telaArquivo(); };
$('historia-arquivo-voltar').onclick = () => { SOM.clique(); telaHistoriaMenu(); };
$('historia-sair').onclick = telaHistoriaMenu;

export { comecarHistoria, HISTORIA, pararHistoria, repetirHistoria, telaHistoriaMenu };
