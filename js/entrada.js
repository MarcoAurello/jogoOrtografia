/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Entrar na turma: código da turma → toca no nome (ou digita) → as competições da turma. Sem senha; o aluno cadastrado
   pela família digita o PIN de 4 números dele num teclado grande (a API pede quando o aluno tem PIN).
   Jogar em casa: pela conta do responsável, "Quem vai jogar?" → o filho digita o PIN no mesmo teclado.
   O aluno cadastrado fica lembrado no aparelho (o token, nunca o PIN): no início aparece "Continuar como <nome>". */

import { $, seguro } from './util.js?v=244';
import { SOM } from './som.js?v=244';
import { api, guardarTokenAluno, lerToken, lerTokenAluno } from './api.js?v=244';
import { aoVoltarAoInicio } from './estado.js?v=244';
import { aoTrocarAluno, entrarComoAluno, mascote, mostrar, telaInicio, telaJogos } from './telas.js?v=244';
import { enviarPartidas } from './partidas.js?v=244';
import { telaCompeticao } from './competicao.js?v=244';
import { enderecoDaEscola } from './escola.js?v=244';

// ---------- Entrada pela turma ----------
// A entrada do app pede só o nome, como sempre (e com o link, o aluno abre qualquer jogo). Para as competições, o aluno
// toca em "Entrar com o código da turma" (no início, no menu ☰ ou na aba Competição): digita o código que o professor
// passou e toca no nome dele (se o professor cadastrou a turma) ou digita o nome. Um nome novo entra na turma na hora
// (api/src/controllers/SessionController.ts), e as partidas passam a ficar no relatório do professor.
// O avulso (sem PIN) perde o login ao voltar à tela inicial: daí é o código da turma de novo. O cadastrado (com PIN)
// fica lembrado até o fim do dia (o tablet da escola é dividido entre os alunos).

let modo = 'turma';      // turma (código + nome) ou casa (pela conta do responsável)
let turma = null;        // { codigo, nome, alunos: [{ id, nome }] }
let pedidoPin = null;    // o pedido de entrada que esperou o PIN ({ aluno_id } ou { nome }; em casa, { filho })
let fonte = 'conta';     // em casa: pela conta do responsável (conta) ou pelo código da família no aparelho do filho (codigo)
let codigoFamilia = '';  // o código da família em uso (fonte = codigo)
let pin = '';
const TAMANHO_PIN = 4;
let escolaAntes = null;  // a escola do endereço, para voltar a ela quando o aluno sai (o aluno usa a escola da turma)

const erroTurma = (texto) => { $('erro-turma').textContent = texto; };
function passo(qual) {
  $('turma-passo-codigo').hidden = qual !== 'codigo';
  $('turma-passo-nome').hidden = qual !== 'nome';
  $('turma-passo-pin').hidden = qual !== 'pin';
  $('turma-passo-filhos').hidden = qual !== 'filhos';
  $('turma-passo-familia').hidden = qual !== 'familia';
  // a explicação de cima acompanha o passo (antes pedia o código mesmo na hora de tocar no nome)
  $('turma-explica').innerHTML = qual === 'pin' ? 'Digite o seu <b>PIN</b> (os 4 números que a sua família escolheu).'
    : qual === 'filhos' ? 'Toque no <b>seu nome</b>. Depois é só digitar o seu PIN.'
      : qual === 'familia' ? 'Digite o <b>código da família</b> (o adulto vê na área da família). Só na primeira vez neste aparelho.'
      : qual === 'nome' ? 'Agora toque no <b>seu nome</b>. Se ele não estiver na lista, digite o nome e o sobrenome.'
        : 'Digite o <b>código da turma</b> (o professor passa). Depois é só tocar no seu nome.';
  erroTurma('');
}

async function abrirTurma(codigo) {
  erroTurma('Procurando a turma…');
  try {
    const r = await api(`/turmas/codigo/${encodeURIComponent(codigo)}/alunos`);
    turma = { ...r.turma, alunos: r.alunos };
    const temNomes = turma.alunos.length > 0;
    $('turma-nome-titulo').textContent = temNomes ? `${turma.nome} · toque no seu nome` : `${turma.nome} · digite o seu nome`;
    $('turma-alunos').innerHTML = turma.alunos
      .map((a) => `<button class="turma-aluno" type="button" data-id="${seguro(a.id)}">${seguro(a.nome)}</button>`).join('');
    $('turma-nome-rotulo').textContent = temNomes ? 'Não achou o seu nome? Digite aqui' : 'Digite o seu nome';
    $('turma-nome-digitado').value = '';
    passo('nome');
    if (!temNomes) setTimeout(() => $('turma-nome-digitado').focus(), 300);
  } catch (err) {
    passo('codigo');
    erroTurma(err.status === 404 ? 'Não achei essa turma. Confira o código com o professor. 🔎' : err.message);
    SOM.errado();
  }
}

// entra: pelo aluno que tocou na lista (aluno_id) ou pelo nome digitado; em casa, pelo filho escolhido (com o PIN)
async function entrar(corpo) {
  erroTurma('Entrando…');
  try {
    const { token, aluno } = modo !== 'casa' ? await api('/sessions/aluno', { metodo: 'POST', corpo: { codigo: turma.codigo, ...corpo } })
      : fonte === 'codigo'
        ? await api(`/familia-codigo/${encodeURIComponent(codigoFamilia)}/entrar`, { metodo: 'POST', corpo: { aluno_id: corpo.filho, pin: corpo.pin } })
        : await api(`/familia/filhos/${encodeURIComponent(corpo.filho)}/entrar`, { metodo: 'POST', corpo: { pin: corpo.pin } });
    erroTurma('');
    entrouComoAluno(token, aluno);
  } catch (err) {
    // o aluno cadastrado pela família: pede o PIN (ou avisa o erro e deixa tentar de novo)
    if (err.codigo === 'pin' || err.codigo === 'pin_errado') {
      pedirPin(corpo, err.dados.aluno, err.codigo === 'pin_errado' ? err.message : '');
      return;
    }
    // o código da família mudou enquanto a criança escolhia: pede o novo
    if (modo === 'casa' && fonte === 'codigo' && err.status === 404) { esquecerFamilia(); pedirCodigoFamilia(CODIGO_VELHO); return; }
    if (err.codigo === 'pin_bloqueado') passo(modo === 'casa' ? 'filhos' : 'nome');
    erroTurma(err.message);
    mascote('davi-login', 'triste');
    SOM.errado();
  }
}

// ---------- o PIN do aluno cadastrado (teclado numérico grande) ----------
function mostrarPin() {
  $('pin-casas').innerHTML = Array.from({ length: TAMANHO_PIN }, (_, i) => `<span class="pin-casa${i < pin.length ? ' cheia' : ''}"></span>`).join('');
}
function pedirPin(corpo, aluno, aviso) {
  const { pin: _pin, ...semPin } = corpo;
  pedidoPin = semPin;
  pin = '';
  $('turma-pin-titulo').textContent = `Olá, ${aluno ? aluno.nome : ''}!`;
  passo('pin');
  mostrarPin();
  if (aviso) { erroTurma(aviso); SOM.errado(); }
}
$('pin-teclado').onclick = (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  SOM.clique();
  if (b.dataset.n === 'apagar') pin = pin.slice(0, -1);
  else if (b.dataset.n === 'ok') { if (pin.length === TAMANHO_PIN) entrar({ ...pedidoPin, pin }); return; }
  else if (pin.length < TAMANHO_PIN) pin += b.dataset.n;
  mostrarPin();
  erroTurma('');
  if (pin.length === TAMANHO_PIN) entrar({ ...pedidoPin, pin });   // o 4º número já entra
};
// no computador, dá para digitar o PIN no teclado
document.addEventListener('keydown', (e) => {
  if ($('turma-passo-pin').hidden || !$('tela-turma').classList.contains('ativa')) return;
  if (/^\d$/.test(e.key)) $(`pin-teclado`).querySelector(`[data-n="${e.key}"]`).click();
  else if (e.key === 'Backspace') $('pin-teclado').querySelector('[data-n="apagar"]').click();
});
$('btn-turma-pin-voltar').onclick = () => { SOM.clique(); pin = ''; passo(modo === 'casa' ? 'filhos' : 'nome'); };

// depois de entrar: se a turma tem competição aberta, vai para ela; senão, direto para os jogos
// (antes o aluno sempre caía na tela de competição, que ficava vazia e sem saída quando não havia nenhuma)
async function abrirDepoisDoLogin() {
  try {
    const { lista } = await api('/sessions/aluno/competicoes', { comoAluno: true });
    if (lista.some((c) => c.aberta)) { telaCompeticao(); return; }
  } catch (e) { /* sem internet: segue para os jogos */ }
  telaJogos();
}

// ---------- telas ----------
$('entrada-turma').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!$('turma-passo-pin').hidden || !$('turma-passo-filhos').hidden) return;
  if (!$('turma-passo-familia').hidden) { $('btn-casa-codigo').click(); return; }
  if (!$('turma-passo-nome').hidden) { $('btn-turma-nome').click(); return; }
  const codigo = $('turma-codigo').value.trim().toUpperCase();
  if (codigo.length < 4) { erroTurma('Digite o código da turma (o professor passa). 🔑'); SOM.errado(); return; }
  SOM.clique();
  abrirTurma(codigo);
});
$('turma-alunos').onclick = (e) => { const b = e.target.closest('.turma-aluno'); if (b) { SOM.clique(); entrar({ aluno_id: b.dataset.id }); } };
$('btn-turma-nome').onclick = () => {
  const nome = $('turma-nome-digitado').value.trim().replace(/\s+/g, ' ');
  if (nome.length < 2) { erroTurma('Digite o seu nome. ✏️'); SOM.errado(); return; }
  SOM.clique();
  entrar({ nome });
};
$('btn-turma-trocar').onclick = () => { SOM.clique(); turma = null; $('turma-codigo').value = ''; passo('codigo'); };
function telaTurma() {
  modo = 'turma';
  $('turma-titulo-tela').textContent = '🏫 Entrar na turma';
  mostrar('tela-turma');
  passo('codigo');
  setTimeout(() => $('turma-codigo').focus(), 300);
}
$('btn-menu-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-comp-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-turma-voltar').onclick = () => { SOM.clique(); telaInicio(); };

// ---------- Jogar em casa: "Quem vai jogar?" ----------
// Duas portas, a mesma tela (cartões grandes com os filhos → o mesmo teclado do PIN, o mesmo bloqueio da turma):
// - pela conta do responsável: na gestão (/gestao/familia, botão "Jogar") o app abre com ?casa (viaConta);
// - pelo código da família, no aparelho do filho, sem a conta do pai: na primeira vez digita o código (FAM-XXXXX), que
//   fica guardado no aparelho (nunca o PIN nem a conta); daí em diante é só tocar no nome e digitar o PIN.
// filhoEscolhido: o id do filho que a área da família já escolheu (?casa=<id>), direto para o PIN.
const CHAVE_FAMILIA = 'pleno-ortografia:familia';
const CODIGO_VELHO = 'Este código da família não vale mais. Peça o código novo a um adulto. 🔑';
const lerFamilia = () => { try { return localStorage.getItem(CHAVE_FAMILIA) || ''; } catch (e) { return ''; } };
function guardarFamilia(codigo) { try { localStorage.setItem(CHAVE_FAMILIA, codigo); } catch (e) { /* sem armazenamento: pede de novo */ } }
function esquecerFamilia() { try { localStorage.removeItem(CHAVE_FAMILIA); } catch (e) { /* sem armazenamento */ } }

async function telaCasa(filhoEscolhido = '', viaConta = false) {
  modo = 'casa';
  $('turma-titulo-tela').textContent = '🏠 Quem vai jogar?';
  mostrar('tela-turma');
  $('casa-filhos').innerHTML = '';
  const guardado = lerFamilia();
  if (!viaConta && guardado) { abrirFamilia(guardado); return; }
  if (lerToken()) {
    passo('filhos');
    erroTurma('Procurando os seus filhos…');
    try { mostrarFilhos(await api('/familia/filhos'), 'conta', filhoEscolhido); return; }
    catch (err) { if (err.status !== 401 && err.status !== 403) { pedirCodigoFamilia(err.message); return; } }
  }
  pedirCodigoFamilia('');
}
function pedirCodigoFamilia(aviso) {
  passo('familia');
  $('casa-codigo').value = '';
  if (aviso) { erroTurma(aviso); SOM.errado(); }
  setTimeout(() => $('casa-codigo').focus(), 300);
}
// os filhos da família do código (só o apelido); código que não vale mais = esquece e pede o novo
async function abrirFamilia(codigo, digitado = false) {
  passo('filhos');
  erroTurma('Procurando a família…');
  try {
    const { filhos } = await api(`/familia-codigo/${encodeURIComponent(codigo)}`);
    codigoFamilia = codigo;
    guardarFamilia(codigo);
    mostrarFilhos(filhos.map((f) => ({ ...f, tem_pin: true })), 'codigo');
  } catch (err) {
    if (err.status === 404) {
      if (!digitado) esquecerFamilia();
      pedirCodigoFamilia(digitado ? 'Não achei esse código da família. Confira com um adulto. 🔎' : CODIGO_VELHO);
      return;
    }
    passo('familia');
    $('casa-codigo').value = codigo;
    erroTurma(err.message);   // sem internet ou muitas tentativas: o código guardado continua
    SOM.errado();
  }
}
function mostrarFilhos(filhos, origem, filhoEscolhido = '') {
  fonte = origem;
  $('btn-casa-trocar-familia').hidden = origem !== 'codigo';
  erroTurma(filhos.length ? '' : origem === 'codigo' ? 'Nenhum filho pode jogar ainda: peça a um adulto para criar o PIN.' : 'Nenhum filho nesta conta ainda.');
  $('casa-filhos').innerHTML = filhos.map((f) => `<button class="casa-filho" type="button" data-id="${seguro(f.id)}" data-nome="${seguro(f.nome)}"${f.tem_pin ? '' : ' disabled'}>
    <span class="casa-filho-letra" aria-hidden="true">${seguro((f.nome || '?').trim().charAt(0).toUpperCase())}</span>${seguro(f.nome)}
    ${f.tem_pin ? '' : '<small>Peça a um adulto para criar o PIN na área da família</small>'}</button>`).join('');
  const escolhido = filhos.find((f) => f.id === filhoEscolhido && f.tem_pin);
  if (escolhido) pedirPin({ filho: escolhido.id }, escolhido, '');
}
$('btn-casa-codigo').onclick = () => {
  // aceita sem o "FAM-" e em minúsculas; guarda sempre no formato FAM-XXXXX
  const letras = $('casa-codigo').value.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^FAM/, '');
  if (letras.length !== 5) { erroTurma('Digite o código da família (ex.: FAM-7K2PQ). 🔑'); SOM.errado(); return; }
  SOM.clique();
  abrirFamilia(`FAM-${letras}`, true);
};
$('btn-casa-trocar-familia').onclick = () => { SOM.clique(); esquecerFamilia(); pedirCodigoFamilia(''); };
// o adulto entra pela gestão; depois do login ele cai na área da família, que tem o botão "Jogar"
$('btn-casa-conta').onclick = () => { SOM.clique(); location.href = '/gestao/login'; };
$('btn-menu-familia').onclick = () => { SOM.clique(); location.href = '/gestao/login'; };
// "Criar a conta da família" (no menu e em "Jogar em casa"): só no endereço de uma escola que aceita cadastro de famílias.
// Fora de uma escola não há para onde levar: o cadastro é pelo link que a escola ou o professor manda.
(async () => {
  const escola = enderecoDaEscola();
  if (!escola) return;
  try {
    const pg = await api(`/cadastro-familia/publico/escola/${encodeURIComponent(escola)}`);
    if (!pg.aberta) return;
    for (const id of ['btn-menu-cadastro-familia', 'casa-cadastro']) {
      $(id).href = `/${encodeURIComponent(escola)}/cadastro`;
      $(id).hidden = false;
    }
  } catch (e) { /* escola sem página de cadastro ou sem internet: o link não aparece */ }
})();
$('casa-filhos').onclick = (e) => {
  const b = e.target.closest('.casa-filho');
  if (!b || b.disabled) return;
  SOM.clique();
  pedirPin({ filho: b.dataset.id }, { nome: b.dataset.nome }, '');
};
$('btn-menu-casa').onclick = () => { SOM.clique(); telaCasa(); };

// ---------- Lembrar o login do aluno cadastrado ----------
// Guarda o token (nunca o PIN) com a validade: pela turma até o fim do dia (o tablet da escola é dividido), em casa até
// o token vencer (30 dias, aparelho da família). Trocar o PIN derruba o token na API (e o app esquece ao conferir).
// O avulso (sem PIN) não é lembrado: perde o login ao voltar ao início, como sempre.
// Enquanto o aluno está no início, o token sai da chave do aluno "agora" (as partidas do Jogar grátis não vão para ele)
// e fica só aqui; "Continuar como..." põe de volta.
const CHAVE_LEMBRADO = 'pleno-ortografia:aluno-lembrado';
function validadeDoToken(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp * 1000; } catch (e) { return 0; }
}
function fimDoDia() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime(); }
function esquecerAluno() { try { localStorage.removeItem(CHAVE_LEMBRADO); } catch (e) { /* sem armazenamento */ } }
function lerLembrado() {
  try {
    const l = JSON.parse(localStorage.getItem(CHAVE_LEMBRADO) || 'null');
    if (l && l.token && l.ate > Date.now()) return l;
  } catch (e) { /* sem armazenamento */ }
  esquecerAluno();
  return null;
}
function lembrarAluno(token, aluno) {
  esquecerAluno();   // outro aluno entrou neste aparelho: o anterior sai
  if (!aluno.cadastrado) return;
  const vale = validadeDoToken(token);
  const ate = aluno.local === 'casa' ? vale : Math.min(vale, fimDoDia());
  try { localStorage.setItem(CHAVE_LEMBRADO, JSON.stringify({ token, ate, aluno: { nome: aluno.nome, escola: aluno.escola ? { id: aluno.escola.id } : null } })); }
  catch (e) { /* sem armazenamento: só não lembra */ }
}

// entrou (pela turma, em casa ou pelo "Continuar como"): guarda o login e segue para as competições ou os jogos
function entrouComoAluno(token, aluno, lembrar = true) {
  guardarTokenAluno(token);
  if (lembrar) lembrarAluno(token, aluno);
  // os dados da competição (ranking, e-mails dos relatórios) são os da escola do aluno
  if (escolaAntes === null) escolaAntes = window.ESCOLA_ATUAL_ID || '';
  window.ESCOLA_ATUAL_ID = aluno.escola ? aluno.escola.id : '';
  $('continuar-aluno').hidden = true;
  entrarComoAluno(aluno.nome, abrirDepoisDoLogin);
  enviarPartidas();   // se ficou alguma partida na fila esperando o login
}

// no início: "Continuar como <nome>" (confere na API se o login ainda vale: PIN trocado ou aluno desativado = esquece)
function mostrarContinuar() {
  const l = lerLembrado();
  $('continuar-aluno').hidden = !l;
  $('btn-continuar-aluno').hidden = false;
  $('erro-continuar').textContent = '';
  if (l) $('continuar-nome').textContent = l.aluno.nome;
}
$('btn-continuar-aluno').onclick = async () => {
  const l = lerLembrado();
  if (!l) { mostrarContinuar(); return; }
  SOM.clique();
  guardarTokenAluno(l.token);
  let aluno = l.aluno;
  try { aluno = (await api('/sessions/aluno', { comoAluno: true })).aluno; }
  catch (err) {
    // o login não vale mais (PIN trocado, aluno desativado): esquece e avisa; sem internet, segue com o que tem
    if (err.status === 401 || err.status === 403) {
      guardarTokenAluno('');
      esquecerAluno();
      $('btn-continuar-aluno').hidden = true;
      $('erro-continuar').textContent = `${err.message} 🔑`;
      SOM.errado();
      return;
    }
  }
  entrouComoAluno(l.token, aluno, false);
};
$('btn-nao-sou-eu').onclick = () => { SOM.clique(); esquecerAluno(); sairDaTurma(); mostrarContinuar(); };

// sair da turma: apaga o login do aluno "agora" e volta para a escola do endereço (o cadastrado continua lembrado)
function sairDaTurma() {
  if (lerTokenAluno()) guardarTokenAluno('');
  if (escolaAntes !== null) { window.ESCOLA_ATUAL_ID = escolaAntes; escolaAntes = null; }
}
// voltar à tela inicial (ou abrir o app) tira o login de agora e mostra o "Continuar como" do aluno lembrado;
// "Trocar aluno" (menu) esquece de vez
aoVoltarAoInicio.push(() => { sairDaTurma(); mostrarContinuar(); });
aoTrocarAluno.push(() => { esquecerAluno(); sairDaTurma(); mostrarContinuar(); });

export { telaCasa };
