/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Turmas na Área do professor: criar turma (com código), cadastrar alunos, ver as figuras e as últimas partidas. */

import { $, seguro } from './util.js?v=136';
import { SOM } from './som.js?v=136';
import { api } from './api.js?v=136';
import { parteProfessor, usuarioAtual } from './professor.js?v=136';
import { abrirFicha, abrirPainelTurma } from './painel.js?v=136';

// ---------- Turmas ----------
// O professor cria a turma e fica ligado a ela; a coordenação cria e escolhe os professores. Cada turma tem um código
// (os alunos digitam na entrada) e cada aluno, uma senha de 3 figuras, que o professor vê aqui para mostrar ao aluno.
const FIGURAS = ['🐶', '🐱', '🐸', '🍎', '⭐', '🚗', '🌻', '⚽', '🎈'];   // a mesma ordem de js/entrada.js e da API
const figurasDe = (senha) => String(senha || '').split(',').map((i) => FIGURAS[Number(i)] || '?').join(' ');
const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const avisoTurma = (texto, ok = false) => { $('aviso-turma').textContent = texto; $('aviso-turma').classList.toggle('aviso-ok', ok); };
const avisoAlunos = (texto, ok = false) => { $('aviso-alunos').textContent = texto; $('aviso-alunos').classList.toggle('aviso-ok', ok); };
const coordena = () => ['coordenacao', 'admin'].includes(usuarioAtual()?.perfil);

let turmaAberta = null;

async function abrirTurmas() {
  parteProfessor('turmas');
  $('turmas-lista-parte').hidden = false;
  $('turma-detalhe').hidden = true;
  $('form-turma').reset();
  avisoTurma('');
  // a coordenação escolhe os professores da turma
  $('campo-turma-professores').hidden = !coordena();
  if (coordena()) {
    try {
      const professores = (await api('/usuarios')).filter((u) => u.perfil === 'professor' && u.ativo);
      $('turma-professores').innerHTML = professores.length
        ? professores.map((p) => `<label class="turma-prof"><input type="checkbox" value="${seguro(p.id)}"> ${seguro(p.nome)}</label>`).join('')
        : '<p class="quiz-status">Nenhum professor cadastrado ainda (👥 Usuários).</p>';
    } catch (err) { avisoTurma(err.message); }
  }
  await listarTurmas();
}

async function listarTurmas() {
  const caixa = $('lista-turmas');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando as turmas…</p>';
  let turmas;
  try { turmas = await api('/turmas'); } catch (err) { caixa.innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; return; }
  caixa.innerHTML = turmas.length ? '' : '<p class="quiz-status">Nenhuma turma ainda: crie a primeira aqui em cima.</p>';
  for (const t of turmas) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `quiz-item turma-item${t.ativa ? '' : ' inativo'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">🏫 ${seguro(t.nome)}${t.ativa ? '' : ' (encerrada)'}</span>
      <span class="quiz-item-qtd">Código <b>${seguro(t.codigo)}</b> · ${t.alunos} ${t.alunos === 1 ? 'aluno' : 'alunos'}${
        t.professores?.length ? ` · ${t.professores.map((p) => seguro(p.nome)).join(', ')}` : ''}</span></span><span class="turma-abrir">›</span>`;
    item.onclick = () => { SOM.clique(); abrirTurma(t); };
    caixa.append(item);
  }
}

$('form-turma').onsubmit = async (e) => {
  e.preventDefault();
  avisoTurma('Criando…');
  try {
    const professores = [...document.querySelectorAll('#turma-professores input:checked')].map((c) => c.value);
    const t = await api('/turmas', { metodo: 'POST', corpo: { nome: $('turma-nome').value.trim(), professores } });
    SOM.certo();
    $('form-turma').reset();
    avisoTurma(`Turma criada! Código para os alunos: ${t.codigo} ✔`, true);
    await listarTurmas();
  } catch (err) { avisoTurma(err.message); SOM.errado(); }
};

// ---------- uma turma: código, alunos (com as figuras) e as últimas partidas ----------
async function abrirTurma(t) {
  turmaAberta = t;
  parteProfessor('turmas');
  $('turmas-lista-parte').hidden = true;
  $('turma-detalhe').hidden = false;
  $('turma-det-nome').textContent = `🏫 ${t.nome}`;
  $('turma-det-codigo').textContent = t.codigo;
  $('btn-turma-encerrar').textContent = t.ativa ? '⏸️ Encerrar turma' : '▶️ Reabrir turma';
  $('form-alunos').reset();
  avisoAlunos('');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await Promise.all([listarAlunos(), listarPartidas()]);
}

async function listarAlunos() {
  const caixa = $('lista-alunos-turma');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando os alunos…</p>';
  let alunos;
  try { ({ alunos } = await api(`/turmas/${turmaAberta.id}/alunos`)); } catch (err) { caixa.innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; return; }
  caixa.innerHTML = alunos.length ? '' : '<p class="quiz-status">Nenhum aluno ainda: cadastre aqui em cima (um nome por linha).</p>';
  for (const a of alunos) {
    const item = document.createElement('div');
    item.className = `quiz-item aluno-item${a.ativo ? '' : ' inativo'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(a.nome)}${a.ativo ? '' : ' (desativado)'}</span>
      <span class="aluno-figuras" title="Senha de figuras">${figurasDe(a.senha_figuras)}</span>
      <span class="quiz-item-qtd">${a.partidas} ${a.partidas === 1 ? 'partida' : 'partidas'}${a.ultima_partida ? ` · última em ${dataHora(a.ultima_partida)}` : ' · ainda não jogou'}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    botao('📈 Ficha', () => { SOM.clique(); abrirFicha(a.id, () => abrirTurma(turmaAberta)); });
    botao('🔑 Novas figuras', () => alterarAluno(a, { novaSenha: true }, `${a.nome} ganhou figuras novas. Mostre a nova senha para o aluno.`));
    botao(a.ativo ? '⏸️ Desativar' : '▶️ Ativar', () => alterarAluno(a, { ativo: !a.ativo }, a.ativo ? `${a.nome} saiu da lista da turma.` : `${a.nome} voltou para a turma.`));
    item.append(botoes);
    caixa.append(item);
  }
}

async function alterarAluno(a, dados, mensagem) {
  SOM.clique();
  try { await api(`/alunos/${a.id}`, { metodo: 'PUT', corpo: dados }); avisoAlunos(`${mensagem} ✔`, true); await listarAlunos(); }
  catch (err) { avisoAlunos(err.message); SOM.errado(); }
}

async function listarPartidas() {
  const caixa = $('partidas-turma');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando as partidas…</p>';
  let partidas;
  try { partidas = await api(`/turmas/${turmaAberta.id}/partidas?limite=30`); } catch (err) { caixa.innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; return; }
  caixa.innerHTML = partidas.length ? partidas.map((p) => `<div class="partida-item">
      <span class="partida-quem">${seguro(p.aluno?.nome || '?')}</span>
      <span class="partida-jogo">${p.resumo?.competicao ? '🏆 ' : ''}${seguro(p.titulo)}</span>
      <span class="partida-nota">${p.acertos}/${p.total} ${'⭐'.repeat(p.estrelas)} · ${dataHora(p.jogada_em)}</span></div>`).join('')
    : '<p class="quiz-status">Nenhuma partida ainda. Quando os alunos jogarem (entrando pela turma), elas aparecem aqui.</p>';
}

$('form-alunos').onsubmit = async (e) => {
  e.preventDefault();
  const nomes = $('alunos-nomes').value.split('\n').map((n) => n.trim()).filter(Boolean);
  avisoAlunos('Cadastrando…');
  try {
    const { criados, repetidos } = await api(`/turmas/${turmaAberta.id}/alunos`, { metodo: 'POST', corpo: { nomes } });
    SOM.certo();
    $('form-alunos').reset();
    avisoAlunos(`${criados.length} ${criados.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}${
      repetidos.length ? ` (já estavam na turma: ${repetidos.join(', ')})` : ''}. As figuras de cada um estão na lista. ✔`, true);
    await listarAlunos();
  } catch (err) { avisoAlunos(err.message); SOM.errado(); }
};
$('btn-turma-copiar').onclick = async () => {
  SOM.clique();
  try { await navigator.clipboard.writeText(turmaAberta.codigo); avisoAlunos(`Código ${turmaAberta.codigo} copiado.`, true); }
  catch (err) { window.prompt('Copie o código:', turmaAberta.codigo); }
};
$('btn-turma-encerrar').onclick = async () => {
  SOM.clique();
  try {
    turmaAberta = await api(`/turmas/${turmaAberta.id}`, { metodo: 'PUT', corpo: { ativa: !turmaAberta.ativa } });
    $('btn-turma-encerrar').textContent = turmaAberta.ativa ? '⏸️ Encerrar turma' : '▶️ Reabrir turma';
    avisoAlunos(turmaAberta.ativa ? 'Turma reaberta: os alunos voltam a entrar. ✔' : 'Turma encerrada: os alunos não entram mais (as partidas ficam guardadas). ✔', true);
  } catch (err) { avisoAlunos(err.message); SOM.errado(); }
};
$('btn-turma-atualizar').onclick = () => { SOM.clique(); listarAlunos(); listarPartidas(); };
$('btn-turma-painel').onclick = () => { SOM.clique(); abrirPainelTurma(turmaAberta.id, () => abrirTurma(turmaAberta)); };
$('btn-turmas-voltar').onclick = () => { SOM.clique(); abrirTurmas(); };
$('btn-prof-turmas').onclick = () => { SOM.clique(); abrirTurmas(); };
