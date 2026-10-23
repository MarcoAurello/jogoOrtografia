/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Telas e navegação: moldura, mascote, troca de telas, encaixe na tela, login, menu do topo, barra inferior e filtro dos jogos. */

import { $ } from './util.js?v=69';
import { aluno, CHAVE_ALUNO, definirAluno, definirUltimoNome, PEDIR_SENHA, SENHA_TURMA, ultimoNome } from './estado.js?v=69';
import { frase, pararVoz, SOM } from './som.js?v=69';
import { escolherProfessorE, JOGOS_DO_LINK, telaProfessor } from './professor.js?v=69';
import { pararChuva } from './chuva.js?v=69';
import { pararMat } from './matematica.js?v=69';
import { desenharTiro, pararTiro, tiro } from './tiro.js?v=69';
import { pararPeso } from './peso.js?v=69';
import { JOGO_DO_LINK, QUIZ_DO_LINK, telaQuizMenu } from './quiz.js?v=69';
import { pararLuz } from './luzes.js?v=69';
import { pararRotina } from './rotina.js?v=69';
import { pararFichas } from './fichas.js?v=69';
import { pararCores } from './cores.js?v=69';
import { pararLados } from './lados.js?v=69';
import { pararSetas } from './setas.js?v=69';
import { pararVistas } from './vistas.js?v=69';

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
  'tela-inicio': 'inicio', 'tela-jogos': 'jogos', 'tela-missoes': 'jogos', 'tela-regra': 'jogos', 'tela-chuva-menu': 'jogos',
  'tela-mat-menu': 'jogos', 'tela-tiro-menu': 'jogos', 'tela-peso-menu': 'jogos', 'tela-luzes-menu': 'jogos', 'tela-fim': 'jogos',
  'tela-rotina-menu': 'jogos', 'tela-fichas-menu': 'jogos', 'tela-cores-menu': 'jogos', 'tela-lados-menu': 'jogos', 'tela-setas-menu': 'jogos', 'tela-vistas-menu': 'jogos', 'tela-quiz-menu': 'quiz', 'tela-professor': 'professor', 'tela-instalar': 'inicio',
};
function encaixarTela() {
  const tela = document.querySelector('.tela.ativa');
  const emJogo = !!tela && tela.classList.contains('tela-jogo');
  document.body.classList.toggle('em-jogo', emJogo);
  // barra inferior: aparece depois do login e fora das partidas
  const barra = $('barra-inferior');
  barra.hidden = !tela || tela.id === 'tela-login' || emJogo;
  document.body.classList.toggle('com-barra', !barra.hidden);
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
  const naoCabe = emJogo && (tela.scrollHeight > tela.clientHeight + 2
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
function telaJogos() {
  if (!aluno) return telaLogin();
  mostrar('tela-jogos');
}

function telaInicio() {
  if (!aluno) return telaLogin();
  $('nome-saudacao').textContent = aluno;
  mascote('davi-inicio', 'oi');
  mostrar('tela-inicio');
}

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
  definirAluno(nome);
  definirUltimoNome(aluno);
  try { localStorage.setItem(CHAVE_ALUNO, aluno); } catch (err) { /* sem armazenamento */ }
  SOM.certo();
  if (QUIZ_DO_LINK) { escolherProfessorE('Questionário da aula', telaQuizMenu); return; }   // veio pelo link de um questionário
  const doLink = Object.hasOwn(JOGOS_DO_LINK, JOGO_DO_LINK || '') ? JOGOS_DO_LINK[JOGO_DO_LINK] : null;
  if (doLink) { telaJogos(); escolherProfessorE(doLink.nome, doLink.abrir); return; }       // veio pelo link de um jogo
  telaInicio();
  frase('ola');   // apresentação gravada pelo Davi (se existir)
};

// menu suspenso do topo: abre e fecha no botão; fecha ao escolher um item, ao tocar fora ou com Esc
const abrirMenu = (aberto) => {
  $('menu-app-lista').hidden = !aberto;
  $('btn-menu').setAttribute('aria-expanded', String(aberto));
};
$('btn-menu').onclick = (e) => { e.stopPropagation(); abrirMenu($('menu-app-lista').hidden); };
$('menu-app-lista').addEventListener('click', (e) => { if (e.target.closest('.menu-item')) abrirMenu(false); });
document.addEventListener('click', (e) => { if (!e.target.closest('#menu-app')) abrirMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirMenu(false); });

function pararJogos() { pararChuva(); pararMat(); pararTiro(); pararPeso(); pararLuz(); pararRotina(); pararFichas(); pararCores(); pararLados(); pararSetas(); pararVistas(); pararVoz(); }
const irParaInicio = () => { pararJogos(); $('escolha-prof').hidden = true; telaInicio(); };
$('btn-logo-inicio').onclick = irParaInicio;
$('btn-menu-inicio').onclick = irParaInicio;
$('barra-inferior').onclick = (e) => {
  const aba = e.target.closest('.aba');
  if (!aba) return;
  SOM.clique();
  pararJogos();
  $('escolha-prof').hidden = true;
  if (aba.dataset.aba === 'inicio') telaInicio();
  else if (aba.dataset.aba === 'jogos') telaJogos();
  else if (aba.dataset.aba === 'quiz') escolherProfessorE('Questionário da aula', telaQuizMenu);
  else telaProfessor();
};

$('btn-trocar').onclick = () => {
  definirAluno(null);
  definirUltimoNome('');
  try { localStorage.removeItem(CHAVE_ALUNO); } catch (e) { /* sem armazenamento */ }
  $('login-nome').value = '';
  telaLogin();
};

// filtro dos jogos por tema (ao abrir o app, todos os jogos aparecem)
function filtrarTema(tema) {
  $('filtro-tema').value = tema;
  // um jogo pode estar em mais de um tema (data-tema com os temas separados por espaço)
  document.querySelectorAll('.escolha-jogos .jogo-card').forEach((c) => { c.hidden = tema !== 'todos' && !c.dataset.tema.split(' ').includes(tema); });
}
$('filtro-tema').onchange = () => { SOM.clique(); filtrarTema($('filtro-tema').value); };
// cada opção do menu mostra quantos jogos tem a categoria
const cartoesDeJogo = [...document.querySelectorAll('.escolha-jogos .jogo-card')];
for (const op of $('filtro-tema').options) {
  const n = op.value === 'todos' ? cartoesDeJogo.length : cartoesDeJogo.filter((c) => c.dataset.tema.split(' ').includes(op.value)).length;
  op.textContent = `${op.textContent} (${n})`;
}
filtrarTema('todos');
$('btn-area-jogos').onclick = () => { SOM.clique(); telaJogos(); };
$('jogos-voltar').onclick = telaInicio;

export { mascote, mostrar, telaInicio, telaJogos };
