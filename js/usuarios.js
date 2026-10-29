/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Usuários: o administrador e a coordenação cadastram quem entra na Área do professor (pela API). */

import { $, seguro } from './util.js?v=136';
import { SOM } from './som.js?v=136';
import { api } from './api.js?v=136';
import { parteProfessor, usuarioAtual } from './professor.js?v=136';

// ---------- Usuários ----------
// O administrador escolhe a escola e cadastra coordenação, professores (ou outro administrador);
// a coordenação cadastra só na própria escola. A pessoa recebe uma senha provisória e cria a dela no primeiro acesso.
const NOME_DO_PERFIL = { admin: 'Administrador', coordenacao: 'Coordenação', professor: 'Professor' };
const avisoUsuario = (texto, ok = false) => { $('aviso-usuario').textContent = texto; $('aviso-usuario').classList.toggle('aviso-ok', ok); };
const souAdmin = () => usuarioAtual()?.perfil === 'admin';

async function abrirUsuarios() {
  parteProfessor('usuarios');
  avisoUsuario('');
  $('form-usuario').reset();
  $('campo-usuario-escola').hidden = !souAdmin();
  $('usuario-perfil').innerHTML = `<option value="professor">Professor</option><option value="coordenacao">Coordenação</option>${
    souAdmin() ? '<option value="admin">Administrador (plataforma)</option>' : ''}`;
  if (souAdmin()) {
    try {
      const escolas = await api('/escolas');
      $('usuario-escola').innerHTML = escolas.map((e) => `<option value="${seguro(e.id)}">${seguro(e.nome)} (/${seguro(e.slug)})</option>`).join('')
        + '<option value="">Sem escola (plataforma principal)</option>';
    } catch (err) { avisoUsuario(err.message); }
  }
  await listarUsuarios();
}

async function listarUsuarios() {
  const caixa = $('lista-usuarios');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando os usuários…</p>';
  let lista;
  try { lista = await api(`/usuarios${souAdmin() && $('usuario-escola').value ? `?escola=${encodeURIComponent($('usuario-escola').value)}` : ''}`); }
  catch (err) { caixa.innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; return; }
  caixa.innerHTML = lista.length ? '' : '<p class="quiz-status">Ninguém cadastrado ainda: cadastre aqui em cima.</p>';
  for (const u of lista) {
    const item = document.createElement('div');
    item.className = `quiz-item usuario-item${u.ativo ? '' : ' inativo'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(u.nome)}${u.ativo ? '' : ' (desativado)'}</span>
      <span class="quiz-item-qtd">${seguro(u.email)} · ${NOME_DO_PERFIL[u.perfil]}${u.escola ? ` · ${seguro(u.escola.nome)}` : ''}${u.primeiro_login ? ' · ainda não entrou' : ''}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    if (u.id !== usuarioAtual()?.id) {
      botao(u.ativo ? '⏸️ Desativar' : '▶️ Ativar', () => alterar(u, { ativo: !u.ativo }, u.ativo ? `${u.nome} não entra mais.` : `${u.nome} pode entrar de novo.`));
      botao('🔑 Senha nova', () => {
        const senha = window.prompt(`Senha provisória para ${u.nome} (8 caracteres ou mais). No próximo acesso, o app pede para criar a senha definitiva:`);
        if (senha) alterar(u, { senha }, `Senha provisória de ${u.nome} trocada. Passe a senha nova para o próximo acesso.`);
      });
    }
    item.append(botoes);
    caixa.append(item);
  }
}

async function alterar(u, dados, mensagem) {
  SOM.clique();
  try { await api(`/usuarios/${u.id}`, { metodo: 'PUT', corpo: dados }); avisoUsuario(`${mensagem} ✔`, true); await listarUsuarios(); }
  catch (err) { avisoUsuario(err.message); SOM.errado(); }
}

$('form-usuario').onsubmit = async (e) => {
  e.preventDefault();
  avisoUsuario('Cadastrando…');
  try {
    const u = await api('/usuarios', { metodo: 'POST', corpo: {
      nome: $('usuario-nome').value.trim(), email: $('usuario-email').value.trim(), senha: $('usuario-senha').value,
      perfil: $('usuario-perfil').value, escola_id: souAdmin() ? $('usuario-escola').value || null : undefined,
    } });
    SOM.certo();
    const escola = $('usuario-escola').value;
    $('form-usuario').reset();
    if (souAdmin()) $('usuario-escola').value = escola;
    avisoUsuario(`Cadastro de ${u.nome} feito! Passe o e-mail e a senha provisória para o primeiro acesso. ✔`, true);
    await listarUsuarios();
  } catch (err) { avisoUsuario(err.message); SOM.errado(); }
};
$('usuario-escola').onchange = () => { SOM.clique(); listarUsuarios(); };
$('btn-prof-usuarios').onclick = () => { SOM.clique(); abrirUsuarios(); };
