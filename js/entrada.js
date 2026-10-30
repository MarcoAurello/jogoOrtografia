/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Entrar na turma: código da turma → toca no nome (ou digita) → as competições da turma. Sem senha. */

import { $, seguro } from './util.js?v=152';
import { SOM } from './som.js?v=152';
import { api, guardarTokenAluno, lerTokenAluno } from './api.js?v=152';
import { aoVoltarAoInicio } from './estado.js?v=152';
import { aoTrocarAluno, entrarComoAluno, mascote, mostrar, telaInicio } from './telas.js?v=152';
import { enviarPartidas } from './partidas.js?v=152';
import { telaCompeticao } from './competicao.js?v=152';

// ---------- Entrada pela turma ----------
// A entrada do app pede só o nome, como sempre (e com o link, o aluno abre qualquer jogo). Para as competições, o aluno
// toca em "Entrar com o código da turma" (no início, no menu ☰ ou na aba Competição): digita o código que o professor
// passou e toca no nome dele (se o professor cadastrou a turma) ou digita o nome. Um nome novo entra na turma na hora
// (api/src/controllers/SessionController.ts), e as partidas passam a ficar no relatório do professor.
// O login vale até o aluno voltar à tela inicial: daí é o código da turma de novo.

let turma = null;        // { codigo, nome, alunos: [{ id, nome }] }
let escolaAntes = null;  // a escola do endereço, para voltar a ela quando o aluno sai (o aluno usa a escola da turma)

const erroTurma = (texto) => { $('erro-turma').textContent = texto; };
function passo(qual) {
  $('turma-passo-codigo').hidden = qual !== 'codigo';
  $('turma-passo-nome').hidden = qual !== 'nome';
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

// entra: pelo aluno que tocou na lista (aluno_id) ou pelo nome digitado
async function entrar(corpo) {
  erroTurma('Entrando…');
  try {
    const { token, aluno } = await api('/sessions/aluno', { metodo: 'POST', corpo: { codigo: turma.codigo, ...corpo } });
    guardarTokenAluno(token);
    // os dados da competição (ranking, e-mails dos relatórios) são os da escola da turma
    if (escolaAntes === null) escolaAntes = window.ESCOLA_ATUAL_ID || '';
    window.ESCOLA_ATUAL_ID = aluno.escola ? aluno.escola.id : '';
    erroTurma('');
    entrarComoAluno(aluno.nome, telaCompeticao);
    enviarPartidas();   // se ficou alguma partida na fila esperando o login
  } catch (err) {
    erroTurma(err.message);
    mascote('davi-login', 'triste');
    SOM.errado();
  }
}

// ---------- telas ----------
$('entrada-turma').addEventListener('submit', (e) => {
  e.preventDefault();
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
  mostrar('tela-turma');
  passo('codigo');
  setTimeout(() => $('turma-codigo').focus(), 300);
}
$('btn-entrar-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-menu-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-comp-turma').onclick = () => { SOM.clique(); telaTurma(); };
$('btn-turma-voltar').onclick = () => { SOM.clique(); telaInicio(); };

// sair da turma: apaga o login do aluno e volta para a escola do endereço
function sairDaTurma() {
  if (lerTokenAluno()) guardarTokenAluno('');
  if (escolaAntes !== null) { window.ESCOLA_ATUAL_ID = escolaAntes; escolaAntes = null; }
}
// voltar à tela inicial (ou abrir o app) tira o login da turma; "Trocar aluno" também
aoVoltarAoInicio.push(sairDaTurma);
aoTrocarAluno.push(sairDaTurma);
