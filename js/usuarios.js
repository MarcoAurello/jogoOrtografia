/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Usuários: o administrador e a coordenação cadastram quem entra na Área do professor (pela API). */

import { $, seguro } from './util.js?v=152';
import { SOM } from './som.js?v=152';
import { api } from './api.js?v=152';
import { parteProfessor, usuarioAtual } from './professor.js?v=152';
import { criarPopup, ligarFiltro } from './popup.js?v=152';

// ---------- Usuários ----------
// O administrador cadastra coordenação, professores (com escola ou avulsos) e outros administradores; a coordenação
// cadastra só na própria escola. A pessoa recebe uma senha provisória e cria a dela no primeiro acesso.
// A tela segue o padrão das telas de cadastro: "＋ Novo usuário" abre o popup; a lista tem busca e filtros.
const NOME_DO_PERFIL = { admin: 'Administrador', coordenacao: 'Coordenação', professor: 'Professor' };
const avisoUsuario = (texto, ok = false) => { $('aviso-usuario').textContent = texto; $('aviso-usuario').classList.toggle('aviso-ok', ok); };
const avisoLista = (texto, ok = false) => { $('aviso-usuarios').textContent = texto; $('aviso-usuarios').classList.toggle('aviso-ok', ok); };
const souAdmin = () => usuarioAtual()?.perfil === 'admin' && !usuarioAtual()?.adminNaEscola;
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const SEM_ESCOLA = '__sem__';   // valor do filtro "Sem escola (avulsos)"

let usuarios = [];
let escolas = [];
const situacaoDe = (u) => (!u.ativo ? 'desativado' : u.primeiro_login ? 'novo' : 'ativo');

async function abrirUsuarios() {
  parteProfessor('usuarios');
  avisoLista('');
  const admin = souAdmin();
  // o filtro de escola e o perfil Administrador só existem para o administrador
  $('campo-usuarios-filtro-escola').hidden = !admin;
  $('usuarios-chips-perfil').querySelector('option[value="admin"]').hidden = !admin;
  if (admin) {
    try { escolas = await api('/escolas'); } catch (err) { escolas = []; avisoLista(err.message); }
    const antes = $('usuarios-filtro-escola').value;
    $('usuarios-filtro-escola').innerHTML = '<option value="">🏫 Todas as escolas</option>'
      + escolas.map((e) => `<option value="${seguro(e.id)}">${seguro(e.nome)}</option>`).join('')
      + `<option value="${SEM_ESCOLA}">Sem escola (administradores e avulsos)</option>`;
    $('usuarios-filtro-escola').value = antes;
  }
  await listarUsuarios();
}

async function listarUsuarios() {
  $('lista-usuarios').innerHTML = '<p class="quiz-status carregando">Buscando os usuários…</p>';
  $('usuarios-contagem').textContent = '';
  try { usuarios = await api('/usuarios'); } catch (err) { usuarios = []; avisoLista(err.message); }
  desenharUsuarios();
}

// ---------- lista com busca e filtros (tudo no aparelho, sem pedir de novo ao servidor) ----------
function desenharUsuarios() {
  const caixa = $('lista-usuarios');
  const busca = semAcento($('usuarios-busca').value.trim());
  const escola = souAdmin() ? $('usuarios-filtro-escola').value : '';
  const base = usuarios.filter((u) => (!busca || semAcento(u.nome).includes(busca) || semAcento(u.email).includes(busca))
    && (!escola || (escola === SEM_ESCOLA ? !u.escola_id : u.escola_id === escola)));
  const perfil = filtroPerfil.valor(), situacao = filtroSituacao.valor();
  const doPerfil = perfil === 'todos' ? base : base.filter((u) => u.perfil === perfil);
  const lista = situacao === 'todos' ? doPerfil : doPerfil.filter((u) => situacaoDe(u) === situacao);
  // a quantidade em cada opção segue os outros filtros (busca, escola e o outro select)
  const daSituacao = situacao === 'todos' ? base : base.filter((u) => situacaoDe(u) === situacao);
  filtroPerfil.contar((f) => (f === 'todos' ? daSituacao.length : daSituacao.filter((u) => u.perfil === f).length));
  filtroSituacao.contar((f) => (f === 'todos' ? doPerfil.length : doPerfil.filter((u) => situacaoDe(u) === f).length));
  const filtrando = !!busca || !!escola || perfil !== 'todos' || situacao !== 'todos';
  $('usuarios-contagem').textContent = usuarios.length
    ? (filtrando ? `Mostrando ${lista.length} de ${usuarios.length} usuários` : `${usuarios.length} ${usuarios.length === 1 ? 'usuário' : 'usuários'}`) : '';
  caixa.innerHTML = '';
  if (!usuarios.length) {
    caixa.innerHTML = '<p class="quiz-status">Ninguém cadastrado ainda. Toque em <b>＋ Novo usuário</b>.</p>';
    return;
  }
  if (!lista.length) {
    caixa.innerHTML = '<p class="quiz-status">Nenhum usuário com esse filtro.</p>';
    const limpar = document.createElement('button');
    limpar.type = 'button';
    limpar.className = 'btn-sec btn-pequeno adm-limpar-filtro';
    limpar.textContent = 'Limpar filtros';
    limpar.onclick = () => { SOM.clique(); limparFiltros(); };
    caixa.append(limpar);
    return;
  }
  for (const u of lista) {
    const item = document.createElement('div');
    item.className = `quiz-item usuario-item${u.ativo ? '' : ' inativo'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(u.nome)}${u.ativo ? '' : ' (desativado)'}</span>
      <span class="quiz-item-qtd">${seguro(u.email)} · ${NOME_DO_PERFIL[u.perfil]}${u.escola ? ` · ${seguro(u.escola.nome)}` : u.perfil === 'professor' ? ' · avulso' : ''}${u.primeiro_login ? ' · ainda não entrou' : ''}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    if (u.id !== usuarioAtual()?.id) {
      botao('🔑 Senha nova', () => {
        const senha = window.prompt(`Senha provisória para ${u.nome} (8 caracteres ou mais). No próximo acesso, o app pede para criar a senha definitiva:`, senhaAleatoria());
        if (senha) alterar(u, { senha }, `Senha provisória de ${u.nome} trocada. Passe a senha nova para o próximo acesso.`);
      });
      botao(u.ativo ? '⏸️ Desativar' : '▶️ Ativar', () => {
        if (u.ativo && !window.confirm(`Desativar ${u.nome}? A pessoa não entra mais até você ativar de novo.`)) return;
        alterar(u, { ativo: !u.ativo }, u.ativo ? `${u.nome} não entra mais.` : `${u.nome} pode entrar de novo.`);
      });
    }
    item.append(botoes);
    caixa.append(item);
  }
}

const filtroPerfil = ligarFiltro('usuarios-chips-perfil', () => { SOM.clique(); desenharUsuarios(); });
const filtroSituacao = ligarFiltro('usuarios-chips-situacao', () => { SOM.clique(); desenharUsuarios(); });
function limparFiltros() {
  $('usuarios-busca').value = '';
  $('usuarios-filtro-escola').value = '';
  filtroPerfil.escolher('todos');
  filtroSituacao.escolher('todos');
  desenharUsuarios();
  $('usuarios-busca').focus();
}
$('usuarios-filtro-escola').onchange = () => { SOM.clique(); desenharUsuarios(); };
let esperaBusca = 0;
$('usuarios-busca').addEventListener('input', () => { clearTimeout(esperaBusca); esperaBusca = setTimeout(desenharUsuarios, 150); });

async function alterar(u, dados, mensagem) {
  SOM.clique();
  try { await api(`/usuarios/${u.id}`, { metodo: 'PUT', corpo: dados }); avisoLista(`${mensagem} ✔`, true); await listarUsuarios(); }
  catch (err) { avisoLista(err.message); SOM.errado(); }
}

// ---------- popup de cadastro (js/popup.js) ----------
const popupUsuario = criarPopup('usuario-modal', { fechar: ['btn-usuario-fechar', 'btn-usuario-cancelar'] });
// senha provisória fácil de ditar: sem letras que se confundem (0/O, 1/l/I)
const senhaAleatoria = () => Array.from({ length: 10 }, () => 'abcdefghjkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 31)]).join('');

function abrirNovoUsuario(origem) {
  const admin = souAdmin();
  $('form-usuario').reset();
  avisoUsuario('');
  $('usuario-perfil').innerHTML = `<option value="professor">Professor</option><option value="coordenacao">Coordenação</option>${
    admin ? '<option value="admin">Administrador (plataforma)</option>' : ''}<option value="aluno">Aluno (vai para Alunos e anamnese)</option>`;
  if (admin) {
    $('usuario-escola').innerHTML = escolas.map((e) => `<option value="${seguro(e.id)}">${seguro(e.nome)} (/${seguro(e.slug)})</option>`).join('')
      + '<option value="">Sem escola (professor avulso)</option>';
    // já vem com a escola escolhida no filtro da lista
    const doFiltro = $('usuarios-filtro-escola').value;
    if (doFiltro && doFiltro !== SEM_ESCOLA) $('usuario-escola').value = doFiltro;
    else if (doFiltro === SEM_ESCOLA) $('usuario-escola').value = '';
  }
  $('usuario-senha').value = senhaAleatoria();
  mostrarCampoEscola();
  popupUsuario.abrir(origem, 'usuario-nome');
}
// a escola só aparece para o administrador, e não para o perfil Administrador (que é da plataforma)
function mostrarCampoEscola() { $('campo-usuario-escola').hidden = !souAdmin() || $('usuario-perfil').value === 'admin'; }
// o aluno não é usuário (não tem e-mail nem senha: entra com o código da turma); o cadastro dele fica em
// "Alunos e anamnese" (js/alunos.js), que abre já no popup de aluno novo
$('usuario-perfil').onchange = () => {
  if ($('usuario-perfil').value === 'aluno') { popupUsuario.fechar(); window.dispatchEvent(new Event('abrir-novo-aluno')); return; }
  mostrarCampoEscola();
};
$('btn-usuario-gerar-senha').onclick = () => { SOM.clique(); $('usuario-senha').value = senhaAleatoria(); $('usuario-senha').focus(); };
$('btn-usuario-novo').onclick = (ev) => { SOM.clique(); abrirNovoUsuario(ev.currentTarget); };

$('form-usuario').onsubmit = async (e) => {
  e.preventDefault();
  avisoUsuario('Cadastrando…');
  try {
    const u = await api('/usuarios', { metodo: 'POST', corpo: {
      nome: $('usuario-nome').value.trim(), email: $('usuario-email').value.trim(), senha: $('usuario-senha').value,
      perfil: $('usuario-perfil').value, escola_id: souAdmin() ? $('usuario-escola').value || null : undefined,
    } });
    SOM.certo();
    const senha = $('usuario-senha').value;
    popupUsuario.fechar();
    avisoLista(`Cadastro de ${u.nome} feito! Passe para a pessoa o e-mail ${u.email} e a senha provisória ${senha}. ✔`, true);
    await listarUsuarios();
  } catch (err) { avisoUsuario(err.message); SOM.errado(); }
};
$('btn-prof-usuarios').onclick = () => { SOM.clique(); abrirUsuarios(); };
