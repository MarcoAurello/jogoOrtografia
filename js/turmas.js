/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Turmas na Área do professor: criar turma (com código), cadastrar alunos (se quiser) e ver as últimas partidas. */

import { $, seguro } from './util.js?v=151';
import { SOM } from './som.js?v=151';
import { api } from './api.js?v=151';
import { parteProfessor, usuarioAtual } from './professor.js?v=151';
import { abrirFicha, abrirPainelTurma } from './painel.js?v=151';
import { criarPopup, ligarBusca, ligarFiltro, listaSemItens, mostrarContagem, semAcento } from './popup.js?v=151';

// ---------- Turmas ----------
// O professor cria a turma e fica ligado a ela; a coordenação cria e escolhe os professores. Cada turma tem um código:
// o aluno entra com ele e toca no nome (se o professor cadastrou os alunos aqui) ou digita o nome, sem senha.
// Quem digita um nome novo entra na lista da turma sozinho.
// Padrão das telas de cadastro: "＋ Nova turma" e "＋ Cadastrar alunos" abrem popups; as listas têm busca e filtros.
const dataHora = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const avisoTurma = (texto, ok = false) => { $('aviso-turma').textContent = texto; $('aviso-turma').classList.toggle('aviso-ok', ok); };
const avisoAlunos = (texto, ok = false) => { $('aviso-alunos').textContent = texto; $('aviso-alunos').classList.toggle('aviso-ok', ok); };
const avisoTurmas = (texto, ok = false) => { $('aviso-turmas').textContent = texto; $('aviso-turmas').classList.toggle('aviso-ok', ok); };
const avisoAlunosForm = (texto, ok = false) => { $('aviso-alunos-form').textContent = texto; $('aviso-alunos-form').classList.toggle('aviso-ok', ok); };
const coordena = () => ['coordenacao', 'admin'].includes(usuarioAtual()?.perfil);

let turmaAberta = null;

let turmas = [];
async function abrirTurmas() {
  parteProfessor('turmas');
  $('turmas-lista-parte').hidden = false;
  $('turma-detalhe').hidden = true;
  avisoTurmas('');
  await listarTurmas();
}

async function listarTurmas() {
  $('lista-turmas').innerHTML = '<p class="quiz-status carregando">Buscando as turmas…</p>';
  $('turmas-contagem').textContent = '';
  try { turmas = await api('/turmas'); } catch (err) { turmas = []; avisoTurmas(err.message); }
  desenharTurmas();
}

// ---------- lista de turmas: busca (nome, código, professor) e situação ----------
const chipsTurmas = ligarFiltro('turmas-chips', () => { SOM.clique(); desenharTurmas(); });
ligarBusca('turmas-busca', () => desenharTurmas());
const situacaoTurma = (t) => (t.ativa ? 'ativa' : 'encerrada');
function desenharTurmas() {
  const caixa = $('lista-turmas');
  const busca = semAcento($('turmas-busca').value.trim());
  const daBusca = turmas.filter((t) => !busca || [t.nome, t.codigo, ...(t.professores || []).map((p) => p.nome)].some((x) => semAcento(x).includes(busca)));
  chipsTurmas.contar((f) => (f === 'todos' ? daBusca.length : daBusca.filter((t) => situacaoTurma(t) === f).length));
  const f = chipsTurmas.valor();
  const lista = f === 'todos' ? daBusca : daBusca.filter((t) => situacaoTurma(t) === f);
  mostrarContagem('turmas-contagem', lista.length, turmas.length, !!busca || f !== 'ativa', ['turma', 'turmas']);
  caixa.innerHTML = '';
  if (!lista.length) {
    listaSemItens(caixa, !turmas.length, 'Nenhuma turma ainda. Toque em <b>＋ Nova turma</b>.',
      () => { SOM.clique(); $('turmas-busca').value = ''; chipsTurmas.escolher('todos'); desenharTurmas(); });
    return;
  }
  for (const t of lista) {
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

// ---------- popup: nova turma / editar turma ----------
// A coordenação (e o administrador dentro da escola) escolhe os professores: uma turma pode ter vários professores.
// Editar (nome e professores) é só para a coordenação; o professor cria a turma dele e fica ligado a ela.
const popupTurma = criarPopup('turma-modal', { fechar: ['btn-turma-fechar', 'btn-turma-cancelar'] });
let editandoTurma = null;   // a turma em edição (null = turma nova)
async function abrirPopupTurma(turma, origem) {
  editandoTurma = turma;
  $('form-turma').reset();
  avisoTurma('');
  $('turma-modal-titulo').textContent = turma ? `✏️ Editar ${turma.nome}` : '🏫 Nova turma';
  $('btn-turma-salvar').textContent = turma ? '💾 Salvar' : '🏫 Criar turma';
  $('turma-modal-dica').textContent = turma
    ? 'Marque todos os professores que dão aula nesta turma: cada um vê os alunos, o painel e as competições dela.'
    : 'A turma ganha um código na hora. Os alunos podem ser cadastrados depois (ou só digitam o nome ao entrar).';
  if (turma) $('turma-nome').value = turma.nome;
  $('campo-turma-professores').hidden = !coordena();
  popupTurma.abrir(origem, 'turma-nome');
  if (!coordena()) return;
  $('turma-professores').innerHTML = '<p class="quiz-status carregando">Buscando os professores…</p>';
  try {
    const marcados = new Set((turma?.professores || []).map((p) => p.id));
    const professores = (await api('/usuarios')).filter((u) => u.perfil === 'professor' && (u.ativo || marcados.has(u.id)));
    $('turma-professores').innerHTML = professores.length
      ? professores.map((p) => `<label class="turma-prof"><input type="checkbox" value="${seguro(p.id)}"${marcados.has(p.id) ? ' checked' : ''}> ${seguro(p.nome)}${p.ativo ? '' : ' (desativado)'}</label>`).join('')
      : '<p class="quiz-status">Nenhum professor cadastrado ainda (👥 Usuários).</p>';
  } catch (err) { avisoTurma(err.message); }
}
$('btn-turma-nova').onclick = (ev) => { SOM.clique(); abrirPopupTurma(null, ev.currentTarget); };
$('btn-turma-editar').onclick = (ev) => { SOM.clique(); abrirPopupTurma(turmaAberta, ev.currentTarget); };
$('form-turma').onsubmit = async (e) => {
  e.preventDefault();
  const nome = $('turma-nome').value.trim();
  const professores = [...document.querySelectorAll('#turma-professores input:checked')].map((x) => x.value);
  if (editandoTurma && coordena() && !professores.length
    && !window.confirm('Nenhum professor marcado: só a coordenação vai ver esta turma. Salvar assim?')) return;
  avisoTurma(editandoTurma ? 'Salvando…' : 'Criando…');
  try {
    if (editandoTurma) {
      await api(`/turmas/${editandoTurma.id}`, { metodo: 'PUT', corpo: { nome, ...(coordena() ? { professores } : {}) } });
      SOM.certo();
      popupTurma.fechar();
      // relê a turma (com os professores novos) e mostra de novo
      const atual = (await api('/turmas')).find((x) => x.id === editandoTurma.id);
      if (atual) { mostrarCabecalhoTurma(atual); turmaAberta = atual; }
      avisoAlunos('Turma atualizada. ✔', true);
      return;
    }
    const t = await api('/turmas', { metodo: 'POST', corpo: { nome, professores } });
    SOM.certo();
    popupTurma.fechar();
    avisoTurmas(`Turma ${t.nome} criada! Código para os alunos: ${t.codigo} ✔`, true);
    await listarTurmas();
  } catch (err) { avisoTurma(err.message); SOM.errado(); }
};
// o topo da turma aberta: nome, professores e o botão Editar (só a coordenação)
function mostrarCabecalhoTurma(t) {
  $('turma-det-nome').textContent = `🏫 ${t.nome}`;
  $('turma-det-profs').textContent = t.professores?.length ? `👩‍🏫 ${t.professores.map((p) => p.nome).join(', ')}` : '👩‍🏫 Sem professor (só a coordenação vê)';
  $('btn-turma-editar').hidden = !coordena();
}

// ---------- uma turma: código, alunos (com as figuras) e as últimas partidas ----------
async function abrirTurma(t) {
  turmaAberta = t;
  parteProfessor('turmas');
  $('turmas-lista-parte').hidden = true;
  $('turma-detalhe').hidden = false;
  mostrarCabecalhoTurma(t);
  $('turma-det-codigo').textContent = t.codigo;
  $('btn-turma-encerrar').textContent = t.ativa ? '⏸️ Encerrar turma' : '▶️ Reabrir turma';
  avisoAlunos('');
  $('alunos-busca').value = '';
  chipsAlunos.escolher('ativo');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await Promise.all([listarAlunos(), listarPartidas()]);
}

let alunos = [];
async function listarAlunos() {
  $('lista-alunos-turma').innerHTML = '<p class="quiz-status carregando">Buscando os alunos…</p>';
  $('alunos-contagem').textContent = '';
  try { ({ alunos } = await api(`/turmas/${turmaAberta.id}/alunos`)); } catch (err) { alunos = []; avisoAlunos(err.message); }
  desenharAlunos();
}

// ---------- alunos da turma: busca e filtros (na turma, ainda não jogaram, desativados) ----------
const chipsAlunos = ligarFiltro('alunos-chips', () => { SOM.clique(); desenharAlunos(); });
ligarBusca('alunos-busca', () => desenharAlunos());
const doFiltroAluno = (a, f) => (f === 'todos' ? true : f === 'ativo' ? a.ativo : f === 'desativado' ? !a.ativo : a.ativo && !a.partidas);
function desenharAlunos() {
  const caixa = $('lista-alunos-turma');
  const busca = semAcento($('alunos-busca').value.trim());
  const daBusca = alunos.filter((a) => !busca || semAcento(a.nome).includes(busca));
  chipsAlunos.contar((f) => daBusca.filter((a) => doFiltroAluno(a, f)).length);
  const f = chipsAlunos.valor();
  const lista = daBusca.filter((a) => doFiltroAluno(a, f));
  mostrarContagem('alunos-contagem', lista.length, alunos.length, !!busca || f !== 'ativo', ['aluno', 'alunos']);
  caixa.innerHTML = '';
  if (!lista.length) {
    listaSemItens(caixa, !alunos.length, 'Nenhum aluno ainda. Toque em <b>＋ Cadastrar alunos</b> ou só passe o código da turma: cada aluno digita o nome ao entrar.',
      () => { SOM.clique(); $('alunos-busca').value = ''; chipsAlunos.escolher('todos'); desenharAlunos(); });
    return;
  }
  for (const a of lista) {
    const item = document.createElement('div');
    item.className = `quiz-item aluno-item${a.ativo ? '' : ' inativo'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(a.nome)}${a.ativo ? '' : ' (desativado)'}</span>
      <span class="quiz-item-qtd">${a.partidas} ${a.partidas === 1 ? 'partida' : 'partidas'}${a.ultima_partida ? ` · última em ${dataHora(a.ultima_partida)}` : ' · ainda não jogou'}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    botao('📈 Ficha', () => { SOM.clique(); abrirFicha(a.id, () => abrirTurma(turmaAberta)); });
    botao(a.ativo ? '⏸️ Desativar' : '▶️ Ativar', () => alterarAluno(a, { ativo: !a.ativo }, a.ativo ? `${a.nome} saiu da lista da turma.` : `${a.nome} voltou para a turma.`));
    item.append(botoes);
    caixa.append(item);
  }
}

async function alterarAluno(a, dados, mensagem) {
  SOM.clique();
  // ativar/desativar vale só nesta turma (o aluno continua na escola e nas outras turmas dele)
  try { await api(`/alunos/${a.id}`, { metodo: 'PUT', corpo: { ...dados, turma: turmaAberta.id } }); avisoAlunos(`${mensagem} ✔`, true); await listarAlunos(); }
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

// ---------- popup: cadastrar alunos (um por linha; o contador mostra quantos nomes já tem) ----------
const popupAlunos = criarPopup('alunos-modal', { fechar: ['btn-alunos-fechar', 'btn-alunos-cancelar'] });
const nomesDigitados = () => $('alunos-nomes').value.split('\n').map((n) => n.trim()).filter(Boolean);
$('alunos-nomes').addEventListener('input', () => {
  const n = nomesDigitados().length;
  $('alunos-qtd-digitados').textContent = n ? `${n} ${n === 1 ? 'nome' : 'nomes'} na lista.` : 'Dica: dá para colar a lista inteira de uma planilha.';
});
$('btn-alunos-novos').onclick = (ev) => {
  SOM.clique();
  $('form-alunos').reset();
  avisoAlunosForm('');
  $('alunos-qtd-digitados').textContent = 'Dica: dá para colar a lista inteira de uma planilha.';
  $('alunos-modal-titulo').textContent = `👧 Cadastrar alunos · ${turmaAberta.nome}`;
  popupAlunos.abrir(ev.currentTarget, 'alunos-nomes');
};
$('form-alunos').onsubmit = async (e) => {
  e.preventDefault();
  const nomes = nomesDigitados();
  avisoAlunosForm('Cadastrando…');
  try {
    const { criados, repetidos } = await api(`/turmas/${turmaAberta.id}/alunos`, { metodo: 'POST', corpo: { nomes } });
    SOM.certo();
    popupAlunos.fechar();
    avisoAlunos(`${criados.length} ${criados.length === 1 ? 'aluno cadastrado' : 'alunos cadastrados'}${
      repetidos.length ? ` (já estavam na turma: ${repetidos.join(', ')})` : ''}. Eles entram com o código da turma e tocam no nome. ✔`, true);
    await listarAlunos();
  } catch (err) { avisoAlunosForm(err.message); SOM.errado(); }
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
