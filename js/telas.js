/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Telas e navegação: moldura, mascote, troca de telas, encaixe na tela, login, menu do topo, barra inferior e filtro dos jogos. */

import { $, embaralhar } from './util.js?v=244';
import { lerTokenAluno } from './api.js?v=244';
import { aluno, aoVoltarAoInicio, CHAVE_ALUNO, definirAluno, definirUltimoNome, PEDIR_SENHA, SENHA_TURMA, ultimoNome } from './estado.js?v=244';
import { frase, pararVoz, SOM } from './som.js?v=244';
import { escolherProfessorE, irParaGestao, JOGOS_DO_LINK } from './professor.js?v=244';
import { pararChuva } from './chuva.js?v=244';
import { pararMat } from './matematica.js?v=244';
import { desenharTiro, pararTiro, tiro } from './tiro.js?v=244';
import { pararPeso } from './peso.js?v=244';
import { JOGO_DO_LINK, QUIZ_DO_LINK, telaQuizMenu } from './quiz.js?v=244';
import { pararLuz } from './luzes.js?v=244';
import { pararRotina } from './rotina.js?v=244';
import { pararFichas } from './fichas.js?v=244';
import { pararEscondida } from './escondida.js?v=244';
import { pararCopia } from './copia.js?v=244';
import { pararBarcos } from './barcos.js?v=244';
import { pararGiro } from './giro.js?v=244';
import { pararHora } from './hora.js?v=244';
import { pararSomando } from './somando.js?v=244';
import { pararDescobrir } from './descobrir.js?v=244';
import { pararChaves } from './chaves.js?v=244';
import { pararCaminho } from './caminho.js?v=244';
import { pararPolicia } from './policia.js?v=244';
import { pararPontos } from './pontos.js?v=244';
import { pararPixels } from './pixels.js?v=244';
import { pararFracoes } from './fracoes.js?v=244';
import { telaCompeticao } from './competicao.js?v=244';
import { pararCores } from './cores.js?v=244';
import { pararLados } from './lados.js?v=244';
import { pararSetas } from './setas.js?v=244';
import { pararVistas } from './vistas.js?v=244';
import { pararDinos } from './dinos.js?v=244';
import { pararPilhas } from './pilhas.js?v=244';
import { pararBlocos } from './blocos.js?v=244';
import { pararLugar } from './lugar.js?v=244';
import { pararMalha } from './malha.js?v=244';
import { pararFila } from './fila.js?v=244';
import { pararLoja } from './loja.js?v=244';
import { pararPalitos } from './palitos.js?v=244';
import { pararBordas } from './bordas.js?v=244';
import { pararCadeado } from './cadeado.js?v=244';
import { pararTatu } from './tatu.js?v=244';
import { pararFlores } from './flores.js?v=244';
import { pararBichos } from './bichos.js?v=244';
import { pararIntervalo } from './intervalo.js?v=244';
import { pararFita } from './fita.js?v=244';
import { pararSimbolos } from './simbolos.js?v=244';
import { pararTabuada } from './tabuada.js?v=244';
import { pararClasses } from './classes.js?v=244';
import { pararGraficos } from './graficos.js?v=244';
import { pararHistoria } from './historia.js?v=244';
import { pararComercio } from './comercio.js?v=244';
import { pararCartografo } from './cartografo.js?v=244';
import { pararBip } from './bip.js?v=244';
import { HAB_CRIANCA, JOGOS_HAB, NOME_HAB } from './habilidades.js?v=244';

// ---------- Moldura: lápis, livros, estrelas e bolinhas ----------
const ENFEITES = {
  lapis: (c) => `<svg viewBox="0 0 40 120" width="34"><rect x="8" y="22" width="24" height="70" rx="3" fill="${c}" stroke="#0b2e66" stroke-width="3"/><rect x="8" y="10" width="24" height="14" rx="3" fill="#e53935" stroke="#0b2e66" stroke-width="3"/><rect x="8" y="22" width="24" height="6" fill="#c9c9c9" stroke="#0b2e66" stroke-width="2"/><path d="M8 92 L20 116 L32 92 Z" fill="#f6d2a4" stroke="#0b2e66" stroke-width="3"/><path d="M16 108 L20 116 L24 108 Z" fill="#0b2e66"/></svg>`,
  livro: (c) => `<svg viewBox="0 0 80 90" width="56"><rect x="8" y="6" width="62" height="78" rx="6" fill="${c}" stroke="#0b2e66" stroke-width="3.5"/><rect x="62" y="10" width="10" height="70" rx="3" fill="#fff" stroke="#0b2e66" stroke-width="3"/><rect x="18" y="20" width="38" height="16" rx="3" fill="#fff" opacity=".85"/><line x1="16" y1="6" x2="16" y2="84" stroke="#0b2e66" stroke-width="3"/></svg>`,
  estrela: (c) => `<svg viewBox="0 0 60 60" width="40"><path d="M30 4 L37 22 L56 22 L41 34 L47 54 L30 42 L13 54 L19 34 L4 22 L23 22 Z" fill="${c}" stroke="#0b2e66" stroke-width="3.5" stroke-linejoin="round"/></svg>`,
  bolinha: (c) => `<svg viewBox="0 0 60 40" width="46"><path d="M8 24 Q4 6 24 8 Q36 2 48 12 Q60 26 44 32 Q30 40 18 34 Q10 32 8 24 Z" fill="${c}" stroke="#0b2e66" stroke-width="3"/></svg>`,
  brilho: (c) => `<svg viewBox="0 0 40 40" width="24"><path d="M20 2 Q22 18 38 20 Q22 22 20 38 Q18 22 2 20 Q18 18 20 2 Z" fill="${c}" stroke="#0b2e66" stroke-width="2.5"/></svg>`,
};
const POSICOES = [
  ['bolinha', '#f7df1c', 1, 3, -20], ['lapis', '#f7df1c', 9, 1, 35], ['brilho', '#3cc8e8', 17, 4, 0], ['livro', '#3cc8e8', 22, 1, -8],
  ['estrela', '#f7df1c', 36, 2, 10], ['estrela', '#f7df1c', 70, 2, -10], ['lapis', '#f7df1c', 63, 1, -35], ['livro', '#3cc8e8', 80, 1, 8],
  ['bolinha', '#e53935', 92, 3, 15], ['bolinha', '#1565c0', 1, 32, 20], ['lapis', '#e53935', 1, 55, -10], ['bolinha', '#e53935', 2, 84, -15],
  ['lapis', '#f7df1c', 95, 55, 15], ['bolinha', '#f7df1c', 94, 32, -20], ['bolinha', '#1565c0', 95, 85, 10], ['brilho', '#e53935', 8, 92, 0],
  ['estrela', '#3cc8e8', 88, 92, 12], ['brilho', '#f7df1c', 50, 96, 0],
];
$('moldura').innerHTML = POSICOES.map(([tipo, cor, x, y, giro], i) =>
  `<div class="enfeite" style="left:${x}%;top:${y}%;transform:rotate(${giro}deg);--giro:${giro}deg;animation-delay:${(i % 6) * -1}s">${ENFEITES[tipo](cor)}</div>`).join('');

// ---------- Plenix, o mascote ----------
// estado: 'oi', 'pensando', 'acertou', 'triste' ou 'festa' (as animações estão no style.css)
function mascote(area, estado) {
  $(area).innerHTML = plenixHTML(estado);
}


// ---------- Telas ----------
function mostrar(id) {
  document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  encaixarDepois();
}

// ---------- Encaixe na tela ----------
// Jogo em andamento não rola: a tela do jogo (.tela-jogo) ocupa a altura visível do aparelho (descontada a barra
// do topo) e as áreas com proporção fixa (data-encaixe = largura/altura: transferidor, balança) encolhem ou
// crescem para caber o que fica embaixo delas. Recalcula ao girar o aparelho, ao mudar o tamanho da janela e
// quando a barra do navegador aparece ou some.
// aba ativa da barra inferior para cada tela
const ABA_DA_TELA = {
  'tela-teste': 'inicio',
  'tela-turma': 'inicio',
  'tela-inicio': 'inicio', 'tela-jogos': 'jogos', 'tela-missoes': 'jogos', 'tela-regra': 'jogos', 'tela-chuva-menu': 'jogos',
  'tela-mat-menu': 'jogos', 'tela-tiro-menu': 'jogos', 'tela-peso-menu': 'jogos', 'tela-luzes-menu': 'jogos', 'tela-fim': 'jogos',
  'tela-rotina-menu': 'jogos', 'tela-fichas-menu': 'jogos', 'tela-escondida-menu': 'jogos', 'tela-copia-menu': 'jogos', 'tela-barcos-menu': 'jogos', 'tela-giro-menu': 'jogos', 'tela-hora-menu': 'jogos', 'tela-somando-menu': 'jogos', 'tela-descobrir-menu': 'jogos', 'tela-chaves-menu': 'jogos', 'tela-caminho-menu': 'jogos', 'tela-policia-menu': 'jogos', 'tela-pontos-menu': 'jogos', 'tela-pixels-menu': 'jogos', 'tela-fracoes-menu': 'jogos', 'tela-taxi-menu': 'jogos', 'tela-cores-menu': 'jogos', 'tela-lados-menu': 'jogos', 'tela-setas-menu': 'jogos', 'tela-vistas-menu': 'jogos', 'tela-dinos-menu': 'jogos', 'tela-pilhas-menu': 'jogos', 'tela-blocos-menu': 'jogos', 'tela-lugar-menu': 'jogos', 'tela-malha-menu': 'jogos', 'tela-fila-menu': 'jogos', 'tela-loja-menu': 'jogos', 'tela-palitos-menu': 'jogos', 'tela-bordas-menu': 'jogos', 'tela-cadeado-menu': 'jogos', 'tela-tatu-menu': 'jogos', 'tela-flores-menu': 'jogos', 'tela-bichos-menu': 'jogos', 'tela-intervalo-menu': 'jogos', 'tela-fita-menu': 'jogos', 'tela-simbolos-menu': 'jogos', 'tela-tabuada-menu': 'jogos', 'tela-classes-menu': 'jogos', 'tela-graficos-menu': 'jogos', 'tela-historia-menu': 'jogos', 'tela-historia-arquivo': 'jogos', 'tela-comercio-menu': 'jogos', 'tela-comercio-passaporte': 'jogos', 'tela-cartografo-menu': 'jogos', 'tela-cartografo-diario': 'jogos', 'tela-bip-menu': 'jogos', 'tela-quiz-menu': 'quiz', 'tela-competicao': 'competicao', 'tela-professor': 'professor', 'tela-instalar': 'inicio',
};
function encaixarTela() {
  const tela = document.querySelector('.tela.ativa');
  const emJogo = !!tela && tela.classList.contains('tela-jogo');
  document.body.classList.toggle('em-jogo', emJogo);
  // na lista de jogos o fundo fica turquesa claro (da marca), de "parque de jogos", para as capas coloridas se destacarem
  document.body.classList.toggle('na-lista-jogos', !!tela && tela.id === 'tela-jogos');
  // barra inferior: aparece depois do login e fora das partidas
  const barra = $('barra-inferior');
  // na tela de entrada (vídeo), antes de entrar, só os dois botões: teste grátis e código da turma
  barra.hidden = !tela || tela.id === 'tela-login' || (tela.id === 'tela-inicio' && !aluno) || emJogo;
  // saiu da tela do vídeo: pausa (senão continua tocando por trás)
  const video = $('video-inicio');
  if (video && !video.paused && tela && tela.id !== 'tela-inicio') video.pause();
  document.body.classList.toggle('com-barra', !barra.hidden);
  // menu: quem já entrou não precisa de "Testar grátis" nem de "Entrar na turma"; sem ninguém, não há aluno para trocar
  $('btn-menu-teste').hidden = !!aluno;
  $('btn-menu-turma').hidden = !!aluno;
  $('btn-trocar').hidden = !aluno;
  // o WhatsApp (contato comercial) não aparece para o aluno que entrou pela turma: ele cobria os botões
  document.body.classList.toggle('sem-whats', !!(aluno && lerTokenAluno()));
  const aba = tela ? ABA_DA_TELA[tela.id] : '';
  barra.querySelectorAll('.aba').forEach((b) => {
    b.classList.toggle('ativa', b.dataset.aba === aba);
    if (b.dataset.aba === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  if (!tela) return;
  // altura livre = altura visível menos o que fica acima da tela (barra do topo e margens)
  const alto = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const acima = tela.getBoundingClientRect().top + window.scrollY;
  document.documentElement.style.setProperty('--livre', `${Math.floor(alto - acima - 6)}px`);
  for (const el of tela.querySelectorAll('[data-encaixe]')) {
    el.style.width = '';
    if (!emJogo) continue;
    const sobra = tela.clientHeight - (tela.scrollHeight - el.offsetHeight);   // altura que sobra para a área
    const proporcao = Number(el.dataset.encaixe);
    el.style.width = `${Math.max(120, Math.min(el.parentElement.clientWidth, Math.floor(sobra * proporcao)))}px`;
  }
  // celular deitado e o jogo não cabe (ou a área ficou pequena demais): pede para virar o aparelho
  // (as telas com data-girar="nao" só rolam por dentro, sem o aviso)
  const naoCabe = emJogo && tela.dataset.girar !== 'nao' && (tela.scrollHeight > tela.clientHeight + 2
    || [...tela.querySelectorAll('[data-encaixe]')].some((el) => el.offsetWidth < 200));
  document.body.classList.toggle('girar', naoCabe && window.innerWidth > window.innerHeight);
  if (typeof tiro !== 'undefined' && tiro) desenharTiro();
}
let encaixeAgendado = 0;
function encaixarDepois() {
  clearTimeout(encaixeAgendado);
  encaixeAgendado = setTimeout(encaixarTela, 40);   // espera a tela nova montar
}
window.addEventListener('resize', encaixarDepois);
if (window.visualViewport) window.visualViewport.addEventListener('resize', encaixarDepois);
// o conteúdo muda de tamanho (botões de resposta que aparecem, lista de pesos, perguntas): reencaixa.
// A tela de jogo tem altura fixa, então observa cada parte dela, e não só a página.
const observador = new ResizeObserver(encaixarDepois);
observador.observe(document.querySelector('main'));
document.querySelectorAll('.tela-jogo > *').forEach((el) => observador.observe(el));
// também quando aparecem ou somem botões e listas (fora das áreas animadas, que mudam a cada quadro)
const vigia = new MutationObserver(encaixarDepois);
document.querySelectorAll('.tela-jogo > *:not(.chuva-arena):not(.tiro-arena):not(.peso-arena):not(.luz-palco)')
  .forEach((el) => vigia.observe(el, { childList: true, attributes: true, attributeFilter: ['hidden'] }));

function telaLogin() {
  mascote('davi-login', 'oi');
  $('erro-login').textContent = '';
  $('login-senha').value = '';
  $('campo-senha').hidden = !PEDIR_SENHA;
  $('login-senha').required = PEDIR_SENHA;
  if (!$('login-nome').value) $('login-nome').value = ultimoNome;
  mostrar('tela-login');
  setTimeout(() => $('login-nome').focus(), 300);
}

// tela com a lista de jogos (Português e Matemática); o questionário tem botão próprio na tela inicial
// sem aluno (não fez o teste grátis nem entrou pela turma): volta para a tela de entrada, que não pede mais o nome
function telaJogos() {
  if (!aluno) return telaInicio();
  $('jogos-titulo').textContent = `👋 Oi, ${aluno.split(' ')[0]}!`;
  mostrar('tela-jogos');
}

// voltar à tela inicial tira o login da turma (e a competição): para entrar de novo, é o código da turma outra vez.
// A tela inicial é a do vídeo, que começa sozinho; a tela do nome (tela-login) não aparece mais.
function telaInicio() {
  aoVoltarAoInicio.forEach((f) => f());
  mostrar('tela-inicio');
  tocarVideoInicio();
}

// tenta com som; o navegador costuma bloquear som antes de um toque, então começa mudo e mostra "Toque para ouvir"
function tocarVideoInicio() {
  const v = $('video-inicio');
  v.muted = false;
  v.play().then(() => { $('video-som').hidden = true; }).catch(() => {
    v.muted = true;
    v.play().catch(() => { /* sem vídeo (offline): fica a capa */ });
    $('video-som').hidden = false;
  });
}
const ligarSomDoVideo = () => { const v = $('video-inicio'); v.muted = false; $('video-som').hidden = true; v.play().catch(() => {}); };
$('video-som').onclick = ligarSomDoVideo;
$('video-inicio').addEventListener('volumechange', () => { if (!$('video-inicio').muted) $('video-som').hidden = true; });

$('form-login').onsubmit = (e) => {
  e.preventDefault();
  const nome = $('login-nome').value.trim().replace(/\s+/g, ' ');
  if (nome.length < 2) { $('erro-login').textContent = 'Digite o seu nome.'; return; }
  if (PEDIR_SENHA && $('login-senha').value.trim() !== SENHA_TURMA) {
    $('erro-login').textContent = 'Senha incorreta. Peça a senha para o professor! 🔒';
    mascote('davi-login', 'triste');
    SOM.errado();
    return;
  }
  entrarComoAluno(nome);
};

// depois do login (pelo nome ou pela turma): guarda o aluno e segue para onde o link mandou, ou para o início.
// depois: para onde ir em vez do início (o login pela turma vai para as competições da turma)
function entrarComoAluno(nome, depois = null) {
  definirAluno(nome);
  definirUltimoNome(aluno);
  try { localStorage.setItem(CHAVE_ALUNO, aluno); } catch (err) { /* sem armazenamento */ }
  SOM.certo();
  // o link do professor (questionário ou jogo) vale mais que o destino padrão de quem entrou (turma ou teste grátis)
  if (QUIZ_DO_LINK) { escolherProfessorE('Questionário da aula', telaQuizMenu); return; }   // veio pelo link de um questionário
  const doLink = Object.hasOwn(JOGOS_DO_LINK, JOGO_DO_LINK || '') ? JOGOS_DO_LINK[JOGO_DO_LINK] : null;
  if (doLink) { telaJogos(); escolherProfessorE(doLink.nome, doLink.abrir); return; }       // veio pelo link de um jogo
  if (depois) { depois(); return; }
  if (ABA_DO_LINK && ABA_DO_LINK !== 'inicio') { abrirAba(ABA_DO_LINK); return; }             // veio da barra de baixo do manual
  telaInicio();
  frase('ola');   // apresentação gravada pelo Davi (se existir)
}

// menu lateral: abre no ☰ e desliza da esquerda sobre um fundo escuro; fecha ao escolher um item, no ✕, ao tocar no
// fundo ou com Esc. O fundo e o painel vão para o fim do <body>: dentro do topo (que tem transform e z-index) o
// "position: fixed" não cobriria a tela toda nem ficaria por cima da barra de baixo
document.body.append($('menu-app-fundo'), $('menu-app-lista'));
const abrirMenu = (aberto) => {
  const estava = !$('menu-app-lista').hidden;
  $('menu-app-lista').hidden = !aberto;
  $('menu-app-fundo').hidden = !aberto;
  $('btn-menu').setAttribute('aria-expanded', String(aberto));
  document.body.classList.toggle('menu-aberto', aberto);
  if (aberto) $('menu-fechar').focus();
  else if (estava) $('btn-menu').focus({ preventScroll: true });   // o foco volta para o ☰ (teclado e leitor de tela)
};
$('btn-menu').onclick = (e) => { e.stopPropagation(); abrirMenu($('menu-app-lista').hidden); };
$('menu-app-lista').addEventListener('click', (e) => { if (e.target.closest('.menu-item')) abrirMenu(false); });
$('menu-fechar').onclick = () => { SOM.clique(); abrirMenu(false); };
// "Outras opções", embaixo do "Jogar grátis" na tela inicial: abre o mesmo menu
$('btn-outras-opcoes').onclick = () => { SOM.clique(); abrirMenu(true); };
$('menu-app-fundo').onclick = () => abrirMenu(false);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('menu-app-lista').hidden) abrirMenu(false); });

function pararJogos() { pararFracoes(); pararPixels(); pararPontos(); pararPolicia(); pararCaminho(); pararChaves(); pararDescobrir(); pararSomando(); pararHora(); pararGiro(); pararBarcos(); pararCopia(); pararEscondida(); pararChuva(); pararMat(); pararTiro(); pararPeso(); pararLuz(); pararRotina(); pararFichas(); pararCores(); pararLados(); pararSetas(); pararVistas(); pararDinos(); pararPilhas(); pararBlocos(); pararLugar(); pararMalha(); pararFila(); pararLoja(); pararPalitos(); pararBordas(); pararCadeado(); pararTatu(); pararFlores(); pararBichos(); pararIntervalo(); pararFita(); pararSimbolos(); pararTabuada(); pararClasses(); pararGraficos(); pararHistoria(); pararComercio(); pararCartografo(); pararBip(); pararVoz(); }
const irParaInicio = () => { pararJogos(); $('escolha-prof').hidden = true; telaInicio(); };
$('btn-logo-inicio').onclick = irParaInicio;
$('btn-menu-inicio').onclick = irParaInicio;
// ?aba=jogos (ou quiz, competicao, professor): a barra de baixo do manual abre o app direto naquela aba, depois do nome
const ABA_DO_LINK = new URLSearchParams(location.search).get('aba');
function abrirAba(aba) {
  if (aba === 'inicio') telaInicio();
  else if (aba === 'jogos') telaJogos();
  else if (aba === 'quiz') escolherProfessorE('Questionário da aula', telaQuizMenu);
  else if (aba === 'competicao') telaCompeticao();
  else if (aba === 'professor') irParaGestao();
  else telaInicio();
}
$('barra-inferior').onclick = (e) => {
  const aba = e.target.closest('.aba');
  if (!aba) return;
  SOM.clique();
  pararJogos();
  $('escolha-prof').hidden = true;
  abrirAba(aba.dataset.aba);
};

$('btn-trocar').onclick = () => {
  definirAluno(null);
  definirUltimoNome('');
  try { localStorage.removeItem(CHAVE_ALUNO); } catch (e) { /* sem armazenamento */ }
  $('login-nome').value = '';
  aoTrocarAluno.forEach((f) => f());   // o login pela turma sai também (js/entrada.js)
  telaInicio();
};
// quem precisa saber que o aluno saiu (sem telas.js depender desses módulos)
const aoTrocarAluno = [];

// ---------- Lista de jogos: grade de capas e "Qual habilidade você quer treinar agora?" ----------
// a cada vez que a página abre, os jogos aparecem numa ordem sorteada: jogos diferentes ficam no topo
const listaDeJogos = document.querySelector('#tela-jogos .escolha-jogos');
const cartoesDeJogo = embaralhar([...listaDeJogos.querySelectorAll('.jogo-card')]);
listaDeJogos.append(...cartoesDeJogo);
const habDoCartao = (c) => JOGOS_HAB[c.id]?.h || [];
// a capa ocupa o cartão inteiro e o nome fica sempre à vista embaixo (no tablet não existe "passar o mouse"); o resumo
// do jogo vira a dica do mouse. ⭐ marca os jogos que mais treinam a habilidade escolhida; ↗, os que abrem outro site
for (const c of cartoesDeJogo) {
  if (JOGOS_HAB[c.id]) c.title = JOGOS_HAB[c.id].r;
  c.insertAdjacentHTML('beforeend', '<span class="jogo-card-forte" aria-hidden="true" hidden>⭐</span>');
  if (c.tagName === 'A') {
    c.insertAdjacentHTML('beforeend', '<span class="jogo-card-externo" aria-hidden="true">↗</span>');
    c.setAttribute('aria-label', `${c.querySelector('.jogo-card-nome').textContent} (abre outro site)`);
  }
}

// os botões: só as habilidades que algum jogo trabalha, as que têm mais jogos primeiro. As 10 primeiras ficam à vista e
// o resto abre no "＋ Mais" (menos opções de cara cansa menos); com "Todos" e "Surpresa" são 12 botões, que fecham as
// linhas no PC (6 por linha) e no celular (2 por linha)
const HAB_A_VISTA = 10;
const qtdDaHab = {};
for (const c of cartoesDeJogo) for (const h of habDoCartao(c)) qtdDaHab[h] = (qtdDaHab[h] || 0) + 1;
const habsDaLista = Object.keys(qtdDaHab).filter((h) => HAB_CRIANCA[h]).sort((a, b) => qtdDaHab[b] - qtdDaHab[a]);
const botaoHab = (valor, [icone, nome, cor], extra = '') => `<button class="hab" type="button" data-hab="${valor}"`
  + ` style="--h:${cor}" aria-pressed="false"${extra}><span class="hab-icone" aria-hidden="true">${icone}</span>`
  + `<span class="hab-nome">${nome}</span><span class="hab-check" aria-hidden="true">✓</span></button>`;
$('habilidades-botoes').innerHTML = botaoHab('', ['🌈', 'Todos os jogos', '#22364a'])
  + habsDaLista.map((h, i) => botaoHab(h, HAB_CRIANCA[h], ` title="${NOME_HAB[h]} · ${qtdDaHab[h]} jogos"${i >= HAB_A_VISTA ? ' data-extra' : ''}`)).join('')
  + '<button class="hab hab-surpresa" type="button" id="hab-surpresa"><span class="hab-icone" aria-hidden="true">🎲</span>'
  + '<span class="hab-nome">Surpresa!</span></button>';
// as matérias (pedido do Marco): uma linha própria acima das habilidades; filtram pela categoria do cartão (data-tema)
const MATERIAS = { portugues: ['📚', 'Português', '#1565c0'], matematica: ['➗', 'Matemática', '#e53935'],
  geografia: ['🌎', 'Geografia', '#2e7d32'], historia: ['📜', 'História', '#8d5a2b'] };
const temaDoCartao = (c) => (c.dataset.tema || '').split(' ');
$('materias-botoes').innerHTML = Object.entries(MATERIAS).map(([tema, dados]) => botaoHab(`tema:${tema}`, dados,
  ` title="${cartoesDeJogo.filter((c) => temaDoCartao(c).includes(tema)).length} jogos"`)).join('');
const habExtras = [...$('habilidades-botoes').querySelectorAll('[data-extra]')];
habExtras.forEach((b) => { b.hidden = true; });
$('hab-mais').hidden = !habExtras.length;
$('hab-mais').onclick = () => {
  SOM.clique();
  const abrir = $('hab-mais').getAttribute('aria-expanded') !== 'true';
  // fechando, a habilidade escolhida continua à vista mesmo se for uma das "a mais"
  habExtras.forEach((b) => { b.hidden = !abrir && b.getAttribute('aria-pressed') !== 'true'; });
  $('hab-mais').setAttribute('aria-expanded', String(abrir));
  $('hab-mais').textContent = abrir ? '－ Menos habilidades' : '＋ Mais habilidades';
};

// a escolha (habilidade ou "tema:<matéria>") vale enquanto o app está aberto (voltar de um jogo mantém); abrir o app de
// novo mostra todos
let habEscolhida = '';
function filtrarJogos() {
  // com uma matéria: os jogos dela, na ordem sorteada. Com uma habilidade: só os jogos que a treinam, primeiro os que a
  // têm como foco principal (a primeira da lista dele)
  const tema = habEscolhida.startsWith('tema:') ? habEscolhida.slice(5) : '';
  const forca = (c) => (tema ? -1 : habDoCartao(c).indexOf(habEscolhida));
  const lista = tema ? cartoesDeJogo.filter((c) => temaDoCartao(c).includes(tema))
    : habEscolhida ? cartoesDeJogo.filter((c) => forca(c) >= 0).sort((a, b) => forca(a) - forca(b)) : cartoesDeJogo;
  for (const c of cartoesDeJogo) {
    c.hidden = !lista.includes(c);
    c.classList.remove('sorteado');
    c.querySelector('.jogo-card-forte').hidden = !(habEscolhida && forca(c) === 0);
  }
  listaDeJogos.append(...lista);
  for (const b of document.querySelectorAll('#tela-jogos .hab[data-hab]')) b.setAttribute('aria-pressed', String(b.dataset.hab === habEscolhida));
  listaDeJogos.classList.remove('entrando');
  void listaDeJogos.offsetWidth;   // reinicia a animação de entrada das capas
  listaDeJogos.classList.add('entrando');
  const [icone, nome] = MATERIAS[tema] || HAB_CRIANCA[habEscolhida] || ['🌈', 'Todos os jogos'];
  $('jogos-mostrando').innerHTML = `<b>${icone} ${nome}</b>: ${lista.length} jogos`
    + (habEscolhida && !tema ? ` <span class="jogos-tecnico">(${NOME_HAB[habEscolhida]}) · ⭐ = treina mais essa habilidade</span>` : '');
}

// Surpresa: sorteia um dos jogos à vista e o destaca (não abre sozinho: a criança ainda decide se quer jogar)
function sortearJogo() {
  const visiveis = cartoesDeJogo.filter((c) => !c.hidden);
  visiveis.forEach((c) => c.classList.remove('sorteado'));
  const c = visiveis[Math.floor(Math.random() * visiveis.length)];
  if (!c) return;
  c.classList.add('sorteado');
  c.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  c.focus({ preventScroll: true });
  $('jogos-mostrando').innerHTML = `<b>🎲 Que tal:</b> ${c.querySelector('.jogo-card-nome').textContent}? Toque na capa para jogar.`;
}

document.querySelector('#tela-jogos .pergunta-hab').addEventListener('click', (e) => {
  const b = e.target.closest('.hab');
  if (!b) return;
  SOM.clique();
  if (b.id === 'hab-surpresa') { sortearJogo(); return; }
  habEscolhida = b.dataset.hab;
  filtrarJogos();
});
filtrarJogos();
$('btn-area-jogos').onclick = () => { SOM.clique(); telaJogos(); };

$('jogos-voltar').onclick = telaInicio;

export { aoTrocarAluno, entrarComoAluno, mascote, mostrar, telaInicio, telaJogos };
