/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Entrar na turma (depois do nome): código da turma → toca no nome → 3 figuras (a senha de criança). */

import { $, seguro } from './util.js?v=136';
import { SOM } from './som.js?v=136';
import { api, guardarTokenAluno, lerTokenAluno } from './api.js?v=136';
import { aoTrocarAluno, entrarComoAluno, mascote, mostrar, telaInicio } from './telas.js?v=136';
import { enviarPartidas } from './partidas.js?v=136';

// ---------- Entrada pela turma ----------
// A entrada do app pede só o nome, como sempre. Quem tem turma toca em "Entrar com o código da turma" (no início ou no
// menu ☰): digita o código (o professor passa), toca no nome e nas 3 figuras, e as partidas passam a ficar guardadas.
// O aparelho lembra a turma: das outras vezes é só tocar no nome e nas figuras. As figuras seguem a ordem da API
// (api/src/models/Aluno.ts). Quem não entra na turma joga só com o nome (as partidas não ficam guardadas).
const FIGURAS = ['🐶', '🐱', '🐸', '🍎', '⭐', '🚗', '🌻', '⚽', '🎈'];
const NOMES_FIGURAS = ['cachorro', 'gato', 'sapo', 'maçã', 'estrela', 'carro', 'girassol', 'bola', 'balão'];
const CHAVE_TURMA = 'pleno-ortografia:turma';   // { codigo, nome } da turma deste aparelho
const lerTurma = () => { try { return JSON.parse(localStorage.getItem(CHAVE_TURMA)) || null; } catch (e) { return null; } };
const guardarTurma = (t) => { try { if (t) localStorage.setItem(CHAVE_TURMA, JSON.stringify(t)); else localStorage.removeItem(CHAVE_TURMA); } catch (e) { /* sem armazenamento */ } };

let turma = null;        // { codigo, nome, alunos: [{ id, nome }] }
let escolhido = null;    // o aluno que tocou no nome
let figuras = [];        // as figuras tocadas até agora

const erroTurma = (texto) => { $('erro-turma').textContent = texto; };
function passo(qual) {
  $('turma-passo-codigo').hidden = qual !== 'codigo';
  $('turma-passo-nome').hidden = qual !== 'nome';
  $('turma-passo-figuras').hidden = qual !== 'figuras';
  erroTurma('');
}

async function abrirTurma(codigo) {
  erroTurma('Procurando a turma…');
  try {
    const r = await api(`/turmas/codigo/${encodeURIComponent(codigo)}/alunos`);
    turma = { ...r.turma, alunos: r.alunos };
    guardarTurma({ codigo: turma.codigo, nome: turma.nome });
    $('turma-nome-titulo').textContent = `${turma.nome} · toque no seu nome`;
    $('turma-alunos').innerHTML = turma.alunos.length
      ? turma.alunos.map((a) => `<button class="turma-aluno" type="button" data-id="${seguro(a.id)}">${seguro(a.nome)}</button>`).join('')
      : '<p class="quiz-status">A turma ainda não tem alunos. Peça ao professor para cadastrar.</p>';
    passo('nome');
  } catch (err) {
    if (err.status === 404) guardarTurma(null);
    passo('codigo');
    erroTurma(err.status === 404 ? 'Não achei essa turma. Confira o código com o professor. 🔎' : err.message);
    SOM.errado();
  }
}

function escolherAluno(id) {
  escolhido = turma.alunos.find((a) => a.id === id);
  if (!escolhido) return;
  figuras = [];
  $('turma-aluno-nome').textContent = escolhido.nome;
  desenharFiguras();
  passo('figuras');
  mascote('davi-login', 'oi');
}
function desenharFiguras() {
  $('figuras-escolhidas').innerHTML = [0, 1, 2].map((i) => `<span>${figuras[i] != null ? FIGURAS[figuras[i]] : ''}</span>`).join('');
}

async function tocarFigura(i) {
  if (figuras.length >= 3) return;
  figuras.push(i);
  SOM.clique();
  desenharFiguras();
  if (figuras.length < 3) return;
  erroTurma('Conferindo…');
  try {
    const { token, aluno } = await api('/sessions/aluno', { metodo: 'POST', corpo: { codigo: turma.codigo, aluno_id: escolhido.id, figuras } });
    guardarTokenAluno(token);
    erroTurma('');
    entrarComoAluno(aluno.nome);
    enviarPartidas();   // se ficou alguma partida na fila esperando o login
  } catch (err) {
    figuras = [];
    desenharFiguras();
    erroTurma(err.message);
    mascote('davi-login', 'triste');
    SOM.errado();
  }
}

// ---------- telas ----------
$('entrada-turma').addEventListener('submit', (e) => {
  e.preventDefault();
  const codigo = $('turma-codigo').value.trim().toUpperCase();
  if (codigo.length < 4) { erroTurma('Digite o código da turma (o professor passa). 🔑'); SOM.errado(); return; }
  SOM.clique();
  abrirTurma(codigo);
});
$('turma-alunos').onclick = (e) => { const b = e.target.closest('.turma-aluno'); if (b) { SOM.clique(); escolherAluno(b.dataset.id); } };
$('figuras-grade').innerHTML = FIGURAS.map((f, i) => `<button class="figura" type="button" data-i="${i}" aria-label="${NOMES_FIGURAS[i]}">${f}</button>`).join('');
$('figuras-grade').onclick = (e) => { const b = e.target.closest('.figura'); if (b) tocarFigura(Number(b.dataset.i)); };
$('btn-figuras-apagar').onclick = () => { SOM.clique(); figuras = figuras.slice(0, -1); desenharFiguras(); erroTurma(''); };
$('btn-figuras-voltar').onclick = () => { SOM.clique(); passo('nome'); };
$('btn-turma-trocar').onclick = () => { SOM.clique(); guardarTurma(null); turma = null; $('turma-codigo').value = ''; passo('codigo'); };
// a tela "Entrar na turma": o aparelho já tem turma → a lista de nomes; senão, o código
function telaTurma() {
  mostrar('tela-turma');
  const salva = lerTurma();
  if (salva) { $('turma-codigo').value = salva.codigo; abrirTurma(salva.codigo); }
  else { passo('codigo'); setTimeout(() => $('turma-codigo').focus(), 300); }
}
$('btn-entrar-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-menu-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-turma-voltar').onclick = () => { SOM.clique(); telaInicio(); };

// no início, o botão mostra a turma de quem já entrou
function botaoDaTurma() {
  const salva = lerTurma();
  $('btn-entrar-turma').textContent = lerTokenAluno() && salva ? `🏫 Turma ${salva.nome} ✔` : '🏫 Entrar com o código da turma';
}
botaoDaTurma();
new MutationObserver(botaoDaTurma).observe($('tela-inicio'), { attributes: true, attributeFilter: ['class', 'hidden', 'style'] });

// "Trocar aluno": o aluno da turma sai (o token dele), mas a turma fica no aparelho para o próximo
aoTrocarAluno.push(() => { guardarTokenAluno(''); botaoDaTurma(); });

// ao abrir o app com o aluno já logado: confere se o login ainda vale (aluno desativado, turma encerrada...)
if (lerTokenAluno()) api('/sessions/aluno', { comoAluno: true }).catch(() => { /* 401: api.js já apagou o token */ });
