/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Alunos e anamnese (Área do professor): os alunos da escola (com ou sem turma), o cadastro, a anamnese (presencial ou
   pelo link de 3 horas para a família) e os modelos de anamnese. Segue o padrão das telas de cadastro (js/popup.js). */

import { $, seguro } from './util.js?v=151';
import { SOM } from './som.js?v=151';
import { api } from './api.js?v=151';
import { parteProfessor, usuarioAtual } from './professor.js?v=151';
import { abrirFicha } from './painel.js?v=151';
import { criarPopup, ligarBusca, ligarFiltro, listaSemItens, mostrarContagem, semAcento } from './popup.js?v=151';
import { desenharPerguntas, desenharRespondida, lerRespostas, SUGERIDAS, TIPOS } from './anamnese-form.js?v=151';
import { BANCO_ANAMNESE, NOMES_MODELOS } from './dados-anamnese.js?v=151';
import { abrirPlanos } from './planos.js?v=151';

// Quem vê e quem mexe (a API confere tudo de novo): a coordenação mexe em todos os alunos da escola; o professor VÊ os
// alunos e as anamneses da escola, mas só mexe (cadastro, anamnese, ficha) nos alunos das turmas dele.
const sou = (p) => usuarioAtual()?.perfil === p;
const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const horaBR = (d) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const idade = (nasc) => {
  if (!nasc) return '';
  const n = new Date(`${nasc}T12:00:00`), h = new Date();
  let anos = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) anos -= 1;
  return anos >= 0 && anos < 120 ? `${anos} ${anos === 1 ? 'ano' : 'anos'}` : '';
};
const aviso = (id) => (texto, ok = false) => { $(id).textContent = texto; $(id).classList.toggle('aviso-ok', ok); };
const avisoLista = aviso('aviso-alunos-esc');
const avisoAlunoForm = aviso('aviso-aluno-form');
const avisoAplicar = aviso('aviso-aplicar');
const avisoLink = aviso('aviso-link-an');
const avisoVer = aviso('aviso-ver-aluno');
const avisoModelos = aviso('aviso-modelos');
const avisoModelo = aviso('aviso-modelo');
const avisoBanco = aviso('aviso-banco');

let alunos = [];
let turmasVisiveis = [];   // as turmas que a pessoa enxerga (para ligar o aluno)
let modelos = [];
let escolas = [];   // o administrador (fora de uma escola) escolhe a escola do aluno
const SEM_TURMA = '__sem__';
const adminFora = () => sou('admin');   // dentro de uma escola, o administrador aparece como coordenação

// ================= Alunos =================
async function abrirAlunos() {
  parteProfessor('alunos');
  avisoLista('');
  $('lista-alunos-esc').innerHTML = '<p class="quiz-status carregando">Buscando os alunos…</p>';
  $('alunos-esc-contagem').textContent = '';
  try {
    [alunos, turmasVisiveis, modelos] = await Promise.all([api('/alunos'), api('/turmas'), api('/anamneses/modelos')]);
    escolas = adminFora() ? await api('/escolas') : [];
  } catch (err) { alunos = []; avisoLista(err.message); }
  $('campo-alunos-esc-escola').hidden = !adminFora();
  if (adminFora()) {
    const antesEscola = $('alunos-esc-escola').value;
    $('alunos-esc-escola').innerHTML = '<option value="todos" data-rotulo="🏫 Todas as escolas">🏫 Todas as escolas</option>'
      + escolas.map((e) => `<option value="${seguro(e.id)}" data-rotulo="${seguro(e.nome)}">${seguro(e.nome)}</option>`).join('');
    if ([...$('alunos-esc-escola').options].some((o) => o.value === antesEscola)) $('alunos-esc-escola').value = antesEscola;
  }
  // o filtro de turma: as turmas que aparecem nos alunos (o professor vê alunos de outras turmas da escola)
  const turmas = new Map();
  alunos.forEach((a) => a.turmas.forEach((t) => turmas.set(t.id, t.nome)));
  const antes = $('alunos-esc-turma').value;
  $('alunos-esc-turma').innerHTML = '<option value="todos" data-rotulo="🏫 Todas as turmas">🏫 Todas as turmas</option>'
    + [...turmas.entries()].sort((a, b) => a[1].localeCompare(b[1])).map(([id, nome]) => `<option value="${seguro(id)}" data-rotulo="${seguro(nome)}">${seguro(nome)}</option>`).join('')
    + `<option value="${SEM_TURMA}" data-rotulo="🚫 Sem turma">🚫 Sem turma</option>`;
  if ([...$('alunos-esc-turma').options].some((o) => o.value === antes)) $('alunos-esc-turma').value = antes;
  // professor sem turma não cadastra aluno (o aluno dele precisa estar numa turma dele)
  $('btn-aluno-novo').hidden = sou('professor') && !turmasVisiveis.length;
  desenharAlunos();
}

const filtroTurma = ligarFiltro('alunos-esc-turma', () => { SOM.clique(); desenharAlunos(); });
const filtroEscola = ligarFiltro('alunos-esc-escola', () => { SOM.clique(); desenharAlunos(); });
const daEscola = (a, f) => (f === 'todos' || !adminFora() ? true : a.escola_id === f);
const filtroAnamnese = ligarFiltro('alunos-esc-anamnese', () => { SOM.clique(); desenharAlunos(); });
ligarBusca('alunos-esc-busca', () => desenharAlunos());
const daTurma = (a, f) => (f === 'todos' ? true : f === SEM_TURMA ? !a.turmas.length : a.turmas.some((t) => t.id === f));
const daAnamnese = (a, f) => (f === 'todos' ? true : f === 'com' ? a.anamneses > 0 : !a.anamneses);

function desenharAlunos() {
  const caixa = $('lista-alunos-esc');
  const busca = semAcento($('alunos-esc-busca').value.trim());
  const fe = filtroEscola.valor();
  const base = alunos.filter((a) => daEscola(a, fe) && (!busca || [a.nome, a.nome_completo, a.responsavel_nome].some((x) => semAcento(x).includes(busca))));
  const ft = filtroTurma.valor(), fa = filtroAnamnese.valor();
  filtroTurma.contar((f) => base.filter((a) => daTurma(a, f) && daAnamnese(a, fa)).length);
  filtroAnamnese.contar((f) => base.filter((a) => daTurma(a, ft) && daAnamnese(a, f)).length);
  const lista = base.filter((a) => daTurma(a, ft) && daAnamnese(a, fa));
  if (adminFora()) filtroEscola.contar((f) => alunos.filter((a) => daEscola(a, f)).length);
  mostrarContagem('alunos-esc-contagem', lista.length, alunos.length, !!busca || ft !== 'todos' || fa !== 'todos' || (adminFora() && fe !== 'todos'), ['aluno', 'alunos']);
  caixa.innerHTML = '';
  if (!lista.length) {
    listaSemItens(caixa, !alunos.length, 'Nenhum aluno ainda. Toque em <b>＋ Novo aluno</b> (ou cadastre pela turma).', () => {
      SOM.clique(); $('alunos-esc-busca').value = ''; filtroTurma.escolher('todos'); filtroAnamnese.escolher('todos'); filtroEscola.escolher('todos'); desenharAlunos();
    });
    return;
  }
  for (const a of lista) {
    const item = document.createElement('div');
    item.className = `quiz-item aluno-item${a.ativo ? '' : ' inativo'}`;
    const extras = [a.nome_completo && a.nome_completo !== a.nome ? a.nome_completo : '', idade(a.data_nascimento)].filter(Boolean).join(' · ');
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">${seguro(a.nome)}${extras ? ` <small>· ${seguro(extras)}</small>` : ''}</span>
      <span class="quiz-item-qtd">🏫 ${a.turmas.length ? a.turmas.map((t) => seguro(t.nome)).join(', ') : 'sem turma'} · ${
        a.anamneses ? `🧩 ${a.anamneses} ${a.anamneses === 1 ? 'anamnese' : 'anamneses'} (última em ${dataBR(a.ultima_anamnese)})` : '⏳ sem anamnese'}${
        a.plano_ativo ? ' · 🎯 plano ativo' : ''}${
        a.observacoes ? ` · 📝 ${a.observacoes} ${a.observacoes === 1 ? 'observação' : 'observações'}` : ''}${
        a.responsavel_nome ? ` · 👪 ${seguro(a.responsavel_nome)}` : ''}${a.escola ? ` · 🏛️ ${seguro(a.escola)}` : ''}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    botao('👁️ Ver', (ev) => { SOM.clique(); verAluno(a.id, ev.currentTarget); });
    botao('🎯 Plano de objetivos', (ev) => { SOM.clique(); abrirPlanos(a, ev.currentTarget, () => abrirAlunos()); });
    if (a.pode_editar) {
      botao('📝 Observação', (ev) => { SOM.clique(); verAluno(a.id, ev.currentTarget, true); });
      botao('🧩 Anamnese', (ev) => { SOM.clique(); abrirAplicar(a, ev.currentTarget); });
      botao('🔗 Link para a família', (ev) => { SOM.clique(); abrirLink(a, ev.currentTarget); });
      botao('✏️ Cadastro', (ev) => { SOM.clique(); abrirCadastro(a, ev.currentTarget); });
      if (a.turmas.length) botao('📈 Ficha', () => { SOM.clique(); abrirFicha(a.id, () => abrirAlunos()); });
    }
    item.append(botoes);
    caixa.append(item);
  }
}

// ---------- popup: cadastro do aluno ----------
const popupAluno = criarPopup('aluno-modal', { fechar: ['btn-aluno-fechar', 'btn-aluno-cancelar'] });
let editandoAluno = null;
function abrirCadastro(aluno, origem) {
  editandoAluno = aluno;
  $('form-aluno').reset();
  avisoAlunoForm('');
  $('aluno-modal-titulo').textContent = aluno ? `✏️ ${aluno.nome}` : '👧 Novo aluno';
  if (aluno) {
    $('aluno-nome').value = aluno.nome;
    $('aluno-nome-completo').value = aluno.nome_completo || '';
    $('aluno-nascimento').value = aluno.data_nascimento || '';
    $('aluno-responsavel').value = aluno.responsavel_nome || '';
    $('aluno-contato').value = aluno.responsavel_contato || '';
    $('aluno-observacoes').value = aluno.observacoes || '';
  }
  // o administrador (fora de uma escola) escolhe a escola; um aluno já cadastrado continua na escola dele
  $('campo-aluno-escola').hidden = !adminFora() || !!aluno;
  if (adminFora() && !aluno) {
    $('aluno-escola').innerHTML = '<option value="">Escolha a escola…</option>'
      + escolas.filter((e) => e.ativa).map((e) => `<option value="${seguro(e.id)}">${seguro(e.nome)}</option>`).join('');
    const doFiltro = filtroEscola.valor();
    if (doFiltro !== 'todos') $('aluno-escola').value = doFiltro;
  }
  mostrarTurmasDoCadastro(aluno);
  popupAluno.abrir(origem, adminFora() && !aluno ? 'aluno-escola' : 'aluno-nome');
}
// turmas: as que a pessoa enxerga (o professor, só as dele; o administrador, as da escola escolhida); as outras turmas
// do aluno ficam como estão
function mostrarTurmasDoCadastro(aluno) {
  const marcadas = new Set((aluno?.turmas || []).map((t) => t.id));
  const escolaId = aluno ? aluno.escola_id : $('aluno-escola').value;
  const opcoes = turmasVisiveis.filter((t) => (t.ativa || marcadas.has(t.id)) && (!adminFora() || t.escola_id === escolaId));
  $('aluno-turmas').innerHTML = opcoes.length
    ? opcoes.map((t) => `<label class="turma-prof"><input type="checkbox" value="${seguro(t.id)}"${marcadas.has(t.id) ? ' checked' : ''}> ${seguro(t.nome)}</label>`).join('')
    : '<p class="quiz-status">Nenhuma turma ainda.</p>';
  const deOutros = (aluno?.turmas || []).filter((t) => !turmasVisiveis.some((v) => v.id === t.id));
  $('aluno-turmas-dica').textContent = [
    sou('professor') ? 'Você liga o aluno às suas turmas.' : 'Sem nenhuma turma marcada, o aluno fica só mapeado para análise (não entra no jogo).',
    deOutros.length ? `Também está em: ${deOutros.map((t) => t.nome).join(', ')}.` : ''].filter(Boolean).join(' ');
}
$('aluno-escola').onchange = () => mostrarTurmasDoCadastro(null);
$('btn-aluno-novo').onclick = (ev) => { SOM.clique(); abrirCadastro(null, ev.currentTarget); };
$('form-aluno').onsubmit = async (ev) => {
  ev.preventDefault();
  const cadastro = { nome_completo: $('aluno-nome-completo').value, data_nascimento: $('aluno-nascimento').value,
    responsavel_nome: $('aluno-responsavel').value, responsavel_contato: $('aluno-contato').value, observacoes: $('aluno-observacoes').value };
  const turmas = [...$('aluno-turmas').querySelectorAll('input:checked')].map((c) => c.value);
  if (sou('professor') && !turmas.length) { avisoAlunoForm('Marque pelo menos uma das suas turmas.'); SOM.errado(); return; }
  if (adminFora() && !editandoAluno && !$('aluno-escola').value) { avisoAlunoForm('Escolha a escola do aluno.'); $('aluno-escola').focus(); SOM.errado(); return; }
  avisoAlunoForm('Salvando…');
  try {
    if (editandoAluno) await api(`/alunos/${editandoAluno.id}`, { metodo: 'PUT', corpo: { nome: $('aluno-nome').value, cadastro, turmas } });
    else await api('/alunos', { metodo: 'POST', corpo: { nome: $('aluno-nome').value, ...cadastro, turmas, escola_id: $('aluno-escola').value || undefined } });
    SOM.certo();
    popupAluno.fechar();
    await abrirAlunos();
    avisoLista(editandoAluno ? 'Cadastro salvo. ✔' : 'Aluno cadastrado. ✔', true);
  } catch (err) { avisoAlunoForm(err.message); SOM.errado(); }
};

// ---------- popup: aplicar a anamnese (presencial) ----------
const popupAplicar = criarPopup('aplicar-modal', { fechar: ['btn-aplicar-fechar', 'btn-aplicar-cancelar'] });
let aplicandoAluno = null;
const modelosAtivos = () => modelos.filter((m) => m.ativo);
function opcoesDeModelo(sel) {
  const ativos = modelosAtivos();
  sel.innerHTML = ativos.length ? ativos.map((m) => `<option value="${seguro(m.id)}">${seguro(m.titulo)} (${m.perguntas.length} perguntas)</option>`).join('')
    : '<option value="">Nenhum modelo: crie em 🧩 Modelos de anamnese</option>';
  return ativos.length > 0;
}
function abrirAplicar(aluno, origem) {
  aplicandoAluno = aluno;
  avisoAplicar('');
  $('aplicar-modal-titulo').textContent = `🧩 Anamnese de ${aluno.nome}`;
  const tem = opcoesDeModelo($('aplicar-modelo'));
  $('aplicar-quem').value = usuarioAtual()?.nome || '';
  $('aplicar-consentimento').checked = false;
  $('aplicar-consentimento-linha').hidden = !!aluno.consentimento_em;
  $('btn-aplicar-salvar').disabled = !tem;
  mostrarPerguntasDoModelo();
  popupAplicar.abrir(origem, 'aplicar-modelo');
}
function mostrarPerguntasDoModelo() {
  const m = modelos.find((x) => x.id === $('aplicar-modelo').value);
  if (m) desenharPerguntas($('aplicar-perguntas'), m.perguntas);
  else $('aplicar-perguntas').innerHTML = '<p class="quiz-status">Crie um modelo em <b>🧩 Modelos de anamnese</b> primeiro.</p>';
}
$('aplicar-modelo').onchange = mostrarPerguntasDoModelo;
$('form-aplicar').onsubmit = async (ev) => {
  ev.preventDefault();
  const m = modelos.find((x) => x.id === $('aplicar-modelo').value);
  if (!m) return;
  if (!aplicandoAluno.consentimento_em && !$('aplicar-consentimento').checked) {
    avisoAplicar('Confirme que o responsável autorizou o registro (LGPD).'); $('aplicar-consentimento').focus(); SOM.errado(); return;
  }
  const { respostas, faltando } = lerRespostas($('aplicar-perguntas'), m.perguntas);
  if (faltando) {
    avisoAplicar(`Responda a pergunta ${faltando.indice + 1} (obrigatória, marcada em vermelho).`);
    faltando.campo.classList.add('faltando');
    faltando.campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    SOM.errado();
    return;
  }
  avisoAplicar('Salvando…');
  try {
    await api(`/alunos/${aplicandoAluno.id}/anamneses`, { metodo: 'POST', corpo: { modelo_id: m.id, respostas,
      respondida_por_nome: $('aplicar-quem').value, consentimento: $('aplicar-consentimento').checked } });
    SOM.certo();
    popupAplicar.fechar();
    await abrirAlunos();
    avisoLista(`Anamnese de ${aplicandoAluno.nome} salva. ✔`, true);
  } catch (err) { avisoAplicar(err.message); SOM.errado(); }
};

// ---------- popup: link para a família (3 horas, uma resposta) ----------
const popupLink = criarPopup('link-modal', { fechar: ['btn-link-fechar', 'btn-link-cancelar'] });
let linkAluno = null;
function abrirLink(aluno, origem) {
  linkAluno = aluno;
  avisoLink('');
  $('link-modal-titulo').textContent = `🔗 Link para a família de ${aluno.nome}`;
  $('btn-link-gerar').disabled = !opcoesDeModelo($('link-modelo'));
  $('btn-link-gerar').hidden = false;
  $('link-pronto').hidden = true;
  popupLink.abrir(origem, 'link-modelo');
}
$('form-link').onsubmit = async (ev) => {
  ev.preventDefault();
  avisoLink('Gerando…');
  try {
    const { token, expira_em: expira } = await api(`/alunos/${linkAluno.id}/anamneses/link`, { metodo: 'POST', corpo: { modelo_id: $('link-modelo').value } });
    const url = `${location.origin}/anamnese.html?t=${encodeURIComponent(token)}`;
    $('link-url').value = url;
    $('link-expira').textContent = horaBR(expira);
    const msg = `Olá! A escola pediu para você responder um questionário sobre ${linkAluno.nome.split(' ')[0]}. O link vale até ${horaBR(expira)}: ${url}`;
    $('btn-link-whats').href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
    $('link-pronto').hidden = false;
    $('btn-link-gerar').hidden = true;
    avisoLink('');
    SOM.certo();
  } catch (err) { avisoLink(err.message); SOM.errado(); }
};
$('btn-link-copiar').onclick = async () => {
  SOM.clique();
  try { await navigator.clipboard.writeText($('link-url').value); avisoLink('Link copiado! Cole no WhatsApp ou e-mail da família.', true); }
  catch (e) { $('link-url').select(); }
};

// ---------- popup: ver o aluno (cadastro e o histórico de anamneses) ----------
const popupVer = criarPopup('ver-aluno-modal', { fechar: ['btn-ver-aluno-fechar', 'btn-ver-aluno-cancelar'] });
const STATUS = { respondida: '✅ respondida', pendente: '⏳ aguardando a família', expirada: '⌛ link expirou', cancelada: '🚫 link cancelado' };
let alunoVisto = null;   // { id, origem, pode_editar } do aluno aberto no "Ver"
let editandoObs = null;
async function verAluno(id, origem, irParaObservacao = false) {
  avisoVer('');
  $('ver-aluno-dados').innerHTML = '<p class="quiz-status carregando">Buscando…</p>';
  $('ver-aluno-anamneses').innerHTML = '';
  $('ver-aluno-obs').innerHTML = '';
  limparObs();
  popupVer.abrir(origem);
  let r;
  try { r = await api(`/alunos/${id}`); } catch (err) { $('ver-aluno-dados').innerHTML = ''; avisoVer(err.message); return; }
  const a = r.aluno;
  alunoVisto = { id, origem, pode_editar: r.pode_editar };
  $('ver-aluno-titulo').textContent = `👧 ${a.nome}`;
  $('obs-nova').hidden = !r.pode_editar;   // escreve quem mexe no aluno; quem só vê, só lê
  listarObservacoes();
  if (irParaObservacao && r.pode_editar) {
    setTimeout(() => { $('ver-aluno-obs-titulo').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('obs-texto').focus({ preventScroll: true }); }, 200);
  }
  const linha = (rot, v) => (v ? `<dt>${rot}</dt><dd>${seguro(v)}</dd>` : '');
  $('ver-aluno-dados').innerHTML = `<dl class="an-dados">${linha('Nome completo', a.nome_completo)}${
    linha('Nascimento', a.data_nascimento ? `${dataBR(`${a.data_nascimento}T12:00:00`)} (${idade(a.data_nascimento)})` : '')}${
    linha('Turmas', a.turmas.map((t) => t.nome).join(', ') || 'sem turma')}${linha('Responsável', a.responsavel_nome)}${
    linha('Contato', a.responsavel_contato)}${linha('Observações', a.observacoes)}${
    linha('Autorização (LGPD)', a.consentimento_em ? `registrada em ${dataBR(a.consentimento_em)}` : 'ainda não registrada')}</dl>`;
  const caixa = $('ver-aluno-anamneses');
  if (!r.anamneses.length) { caixa.innerHTML = '<p class="quiz-status">Nenhuma anamnese ainda.</p>'; return; }
  // (continua abaixo: o histórico das anamneses)
  caixa.innerHTML = '';
  r.anamneses.forEach((x, i) => {
    const d = document.createElement('details');
    d.className = 'an-historico';
    d.open = i === 0 && x.status === 'respondida';
    const quando = x.status === 'respondida' ? `em ${horaBR(x.respondida_em)} por ${seguro(x.respondida_por_nome || '')}${x.via === 'link' ? ' (pelo link)' : ''}`
      : x.status === 'pendente' ? `link vale até ${horaBR(x.expira_em)}` : `criado em ${horaBR(x.criada_em)}`;
    d.innerHTML = `<summary><b>${seguro(x.titulo)}</b> · ${STATUS[x.status] || x.status} · <small>${quando}</small></summary>${
      x.status === 'respondida' ? desenharRespondida(x.perguntas, x.respostas) : ''}`;
    if (x.status === 'pendente' && r.pode_editar) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-excluir';
      b.textContent = '🚫 Cancelar este link';
      b.onclick = async () => {
        if (!window.confirm('Cancelar este link? A família não conseguirá mais responder por ele.')) return;
        try { await api(`/anamneses/${x.id}/cancelar`, { metodo: 'PUT', corpo: {} }); verAluno(id, origem); } catch (err) { avisoVer(err.message); }
      };
      d.append(b);
    }
    caixa.append(d);
  });
}

// ---------- observações de evolução (dentro do "Ver" do aluno) ----------
const CATEGORIAS_OBS = { evolucao: '📈 Evolução', aprendizagem: '📚 Aprendizagem', comportamento: '🙂 Comportamento', social: '🤝 Relacionamento',
  familia: '👪 Família', saude: '🩺 Saúde', outro: '📝 Outro' };
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
function limparObs() {
  editandoObs = null;
  $('obs-data').value = hojeISO();
  $('obs-data').max = hojeISO();
  $('obs-categoria').value = 'evolucao';
  $('obs-texto').value = '';
  $('btn-obs-salvar').textContent = '💾 Salvar observação';
  $('btn-obs-cancelar-edicao').hidden = true;
}
async function listarObservacoes() {
  const caixa = $('ver-aluno-obs');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando as observações…</p>';
  let lista;
  try { lista = await api(`/alunos/${alunoVisto.id}/observacoes`); } catch (err) { caixa.innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; return; }
  caixa.innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhuma observação ainda.</p>';
  for (const o of lista) {
    const item = document.createElement('div');
    item.className = 'obs-item';
    item.innerHTML = `<div class="obs-topo"><b>${dataBR(`${o.data}T12:00:00`)}</b> · ${CATEGORIAS_OBS[o.categoria] || o.categoria} · <small>${seguro(o.autor_nome)}</small></div>
      <p class="obs-texto">${seguro(o.texto)}</p>`;
    if (o.pode_editar) {
      const botoes = document.createElement('div');
      botoes.className = 'obs-botoes';
      const b1 = document.createElement('button');
      b1.type = 'button'; b1.className = 'quiz-link'; b1.textContent = '✏️ Editar';
      b1.onclick = () => {
        SOM.clique();
        editandoObs = o;
        $('obs-data').value = o.data; $('obs-categoria').value = o.categoria; $('obs-texto').value = o.texto;
        $('btn-obs-salvar').textContent = '💾 Salvar alteração';
        $('btn-obs-cancelar-edicao').hidden = false;
        $('ver-aluno-obs-titulo').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('obs-texto').focus({ preventScroll: true });
      };
      const b2 = document.createElement('button');
      b2.type = 'button'; b2.className = 'quiz-excluir'; b2.textContent = '🗑️ Apagar';
      b2.onclick = async () => {
        if (!window.confirm('Apagar esta observação? Não dá para desfazer.')) return;
        try { await api(`/observacoes/${o.id}`, { metodo: 'DELETE' }); avisoVer('Observação apagada. ✔', true); listarObservacoes(); }
        catch (err) { avisoVer(err.message); }
      };
      botoes.append(b1, b2);
      item.append(botoes);
    }
    caixa.append(item);
  }
}
$('btn-obs-salvar').onclick = async () => {
  const texto = $('obs-texto').value.trim();
  if (texto.length < 3) { avisoVer('Escreva a observação.'); $('obs-texto').focus(); SOM.errado(); return; }
  const corpo = { data: $('obs-data').value, categoria: $('obs-categoria').value, texto };
  avisoVer('Salvando…');
  const eraEdicao = !!editandoObs;
  try {
    if (editandoObs) await api(`/observacoes/${editandoObs.id}`, { metodo: 'PUT', corpo });
    else await api(`/alunos/${alunoVisto.id}/observacoes`, { metodo: 'POST', corpo });
    SOM.certo();
    avisoVer(eraEdicao ? 'Observação alterada. ✔' : 'Observação salva. ✔', true);
    limparObs();
    listarObservacoes();
    const a = alunos.find((x) => x.id === alunoVisto.id);
    if (a && !eraEdicao) { a.observacoes = (a.observacoes || 0) + 1; desenharAlunos(); }
  } catch (err) { avisoVer(err.message); SOM.errado(); }
};
$('btn-obs-cancelar-edicao').onclick = () => { SOM.clique(); limparObs(); };

// ================= Modelos de anamnese =================
async function abrirModelos() {
  parteProfessor('anamnese');
  avisoModelos('');
  $('lista-modelos').innerHTML = '<p class="quiz-status carregando">Buscando os modelos…</p>';
  try { modelos = await api('/anamneses/modelos'); } catch (err) { modelos = []; avisoModelos(err.message); }
  desenharModelos();
}
const filtroModelos = ligarFiltro('modelos-situacao', () => { SOM.clique(); desenharModelos(); });
ligarBusca('modelos-busca', () => desenharModelos());
const situacaoModelo = (m, f) => (f === 'todos' ? true : f === 'ativo' ? m.ativo : !m.ativo);
const possoEditarModelo = (m) => m.meu || !sou('professor');
function desenharModelos() {
  const caixa = $('lista-modelos');
  const busca = semAcento($('modelos-busca').value.trim());
  const base = modelos.filter((m) => !busca || semAcento(m.titulo).includes(busca));
  filtroModelos.contar((f) => base.filter((m) => situacaoModelo(m, f)).length);
  const f = filtroModelos.valor();
  const lista = base.filter((m) => situacaoModelo(m, f));
  mostrarContagem('modelos-contagem', lista.length, modelos.length, !!busca || f !== 'ativo', ['modelo', 'modelos']);
  caixa.innerHTML = '';
  if (!lista.length) {
    listaSemItens(caixa, !modelos.length, 'Nenhum modelo ainda. Toque em <b>＋ Novo modelo</b> (dá para começar com as perguntas sugeridas).',
      () => { SOM.clique(); $('modelos-busca').value = ''; filtroModelos.escolher('todos'); desenharModelos(); });
    return;
  }
  for (const m of lista) {
    const item = document.createElement('div');
    item.className = `quiz-item${m.ativo ? '' : ' inativo'}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">🧩 ${seguro(m.titulo)}${m.ativo ? '' : ' (arquivado)'}</span>
      <span class="quiz-item-qtd">${m.perguntas.length} ${m.perguntas.length === 1 ? 'pergunta' : 'perguntas'}${m.meu ? ' · criado por você' : ''} · atualizado em ${dataBR(m.atualizado_em)}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    if (possoEditarModelo(m)) {
      botao('✏️ Editar', (ev) => { SOM.clique(); abrirModelo(m, ev.currentTarget); });
      botao(m.ativo ? '🗄️ Arquivar' : '♻️ Usar de novo', async () => {
        SOM.clique();
        try { await api(`/anamneses/modelos/${m.id}`, { metodo: 'PUT', corpo: { ativo: !m.ativo } }); await abrirModelos();
          avisoModelos(m.ativo ? `"${m.titulo}" arquivado (as anamneses já feitas continuam guardadas). ✔` : `"${m.titulo}" voltou para a lista. ✔`, true); }
        catch (err) { avisoModelos(err.message); }
      });
    } else botao('👁️ Ver perguntas', (ev) => { SOM.clique(); abrirModelo(m, ev.currentTarget, true); });
    item.append(botoes);
    caixa.append(item);
  }
}

// ---------- popup: editor do modelo (cada pergunta: texto, tipo, opções, obrigatória, subir/descer/tirar) ----------
const popupModelo = criarPopup('modelo-modal', { fechar: ['btn-modelo-fechar', 'btn-modelo-cancelar'] });
let editandoModelo = null;
function blocoPergunta(q = { tipo: 'curta', texto: '', opcoes: [], obrigatoria: false }, soLer = false) {
  const div = document.createElement('div');
  div.className = 'quiz-bloco an-bloco';
  if (q.id) div.dataset.id = q.id;
  div.innerHTML = `<div class="quiz-bloco-topo"><span></span><span class="an-bloco-botoes">
      <button type="button" class="quiz-link" data-acao="subir" aria-label="Subir">↑</button>
      <button type="button" class="quiz-link" data-acao="descer" aria-label="Descer">↓</button>
      <button class="quiz-tirar" type="button" data-acao="tirar">✕ tirar</button></span></div>
    <textarea class="an-texto" rows="2" maxlength="300" placeholder="Escreva a pergunta"></textarea>
    <select class="an-tipo adm-select">${Object.entries(TIPOS).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
    <textarea class="an-opcoes-campo" rows="3" placeholder="Uma opção por linha"></textarea>
    <label class="an-obrig-linha"><input type="checkbox" class="an-obrigatoria"> Obrigatória</label>`;
  div.querySelector('.an-texto').value = q.texto;
  div.querySelector('.an-tipo').value = q.tipo;
  div.querySelector('.an-opcoes-campo').value = (q.opcoes || []).join('\n');
  div.querySelector('.an-obrigatoria').checked = !!q.obrigatoria;
  const mostrarOpcoes = () => { div.querySelector('.an-opcoes-campo').hidden = !['multipla', 'varias'].includes(div.querySelector('.an-tipo').value); };
  div.querySelector('.an-tipo').onchange = mostrarOpcoes;
  mostrarOpcoes();
  div.querySelector('.an-bloco-botoes').onclick = (ev) => {
    const acao = ev.target.closest('button')?.dataset.acao;
    if (acao === 'tirar') div.remove();
    else if (acao === 'subir' && div.previousElementSibling) div.parentElement.insertBefore(div, div.previousElementSibling);
    else if (acao === 'descer' && div.nextElementSibling) div.parentElement.insertBefore(div.nextElementSibling, div);
    numerar();
  };
  if (soLer) {
    div.querySelectorAll('textarea, select, input').forEach((c) => { c.disabled = true; });
    div.querySelector('.an-bloco-botoes').hidden = true;
  }
  $('modelo-perguntas').append(div);
  numerar();
  return div;
}
function numerar() { [...$('modelo-perguntas').children].forEach((b, i) => { b.querySelector('.quiz-bloco-topo span').textContent = `Pergunta ${i + 1}`; }); }
function abrirModelo(m, origem, soLer = false) {
  editandoModelo = m;
  avisoModelo('');
  $('modelo-modal-titulo').textContent = m ? (soLer ? `🧩 ${m.titulo}` : `✏️ ${m.titulo}`) : '🧩 Novo modelo de anamnese';
  $('modelo-titulo').value = m ? m.titulo : '';
  $('modelo-titulo').disabled = soLer;
  $('modelo-perguntas').innerHTML = '';
  (m ? m.perguntas : []).forEach((q) => blocoPergunta(q, soLer));
  ['btn-modelo-banco', 'btn-modelo-pergunta', 'btn-modelo-sugeridas', 'btn-modelo-salvar'].forEach((id) => { $(id).hidden = soLer; });
  popupModelo.abrir(origem, soLer ? null : 'modelo-titulo');
}
$('btn-modelo-novo').onclick = (ev) => { SOM.clique(); abrirModelo(null, ev.currentTarget); };
// ---------- popup: banco de perguntas (js/dados-anamnese.js) por cima do editor do modelo ----------
// O professor marca as perguntas que quer (por assunto, por modelo de origem ou pela busca) e elas entram no fim do
// modelo; as que já estão no modelo (mesmo texto) aparecem marcadas e não se repetem.
const popupBanco = criarPopup('banco-modal', { fechar: ['btn-banco-fechar', 'btn-banco-cancelar'] });
const BANCO = BANCO_ANAMNESE.flatMap((s, i) => s.perguntas.map((q, k) => ({ ...q, secao: s.secao, chave: `${i}-${k}` })));
const marcadasNoBanco = new Set();
const textosDoModelo = () => new Set([...$('modelo-perguntas').querySelectorAll('.an-texto')].map((x) => semAcento(x.value.trim())));
function abrirBanco(origem) {
  marcadasNoBanco.clear();
  avisoBanco('');
  $('banco-busca').value = '';
  $('banco-secao').innerHTML = '<option value="todas">📂 Todos os assuntos</option>'
    + BANCO_ANAMNESE.map((s) => `<option value="${seguro(s.secao)}">${seguro(s.secao)} (${s.perguntas.length})</option>`).join('');
  $('banco-modelo').innerHTML = '<option value="todos">📄 Todos os modelos</option>'
    + Object.entries(NOMES_MODELOS).map(([n, nome]) => `<option value="${n}">Só do ${nome} (${BANCO.filter((q) => q.m.includes(Number(n))).length})</option>`).join('');
  desenharBanco();
  popupBanco.abrir(origem, 'banco-busca');
}
function desenharBanco() {
  const busca = semAcento($('banco-busca').value.trim());
  const secao = $('banco-secao').value, modelo = Number($('banco-modelo').value) || 0;
  const jaNoModelo = textosDoModelo();
  const lista = BANCO.filter((q) => (secao === 'todas' || q.secao === secao) && (!modelo || q.m.includes(modelo))
    && (!busca || semAcento(`${q.texto} ${q.opcoes.join(' ')}`).includes(busca)));
  const caixa = $('banco-lista');
  caixa.innerHTML = '';
  if (!lista.length) { caixa.innerHTML = '<p class="quiz-status">Nenhuma pergunta com esse filtro.</p>'; atualizarBotaoBanco(); return; }
  const porSecao = new Map();
  lista.forEach((q) => { if (!porSecao.has(q.secao)) porSecao.set(q.secao, []); porSecao.get(q.secao).push(q); });
  for (const [nome, qs] of porSecao) {
    const grupo = document.createElement('fieldset');
    grupo.className = 'banco-secao';
    const livres = qs.filter((q) => !jaNoModelo.has(semAcento(q.texto)));
    grupo.innerHTML = `<legend>${seguro(nome)} <small>(${qs.length})</small></legend>`;
    if (livres.length > 1) {
      const todas = document.createElement('button');
      todas.type = 'button'; todas.className = 'quiz-link banco-todas';
      const todasMarcadas = livres.every((q) => marcadasNoBanco.has(q.chave));
      todas.textContent = todasMarcadas ? 'Desmarcar todas' : 'Marcar todas';
      todas.onclick = () => { livres.forEach((q) => (todasMarcadas ? marcadasNoBanco.delete(q.chave) : marcadasNoBanco.add(q.chave))); desenharBanco(); };
      grupo.append(todas);
    }
    for (const q of qs) {
      const ja = jaNoModelo.has(semAcento(q.texto));
      const l = document.createElement('label');
      l.className = `banco-pergunta${ja ? ' ja' : ''}`;
      l.innerHTML = `<input type="checkbox"${ja || marcadasNoBanco.has(q.chave) ? ' checked' : ''}${ja ? ' disabled' : ''}>
        <span><span class="banco-texto">${seguro(q.texto)}</span>
        <small>${seguro(TIPOS[q.tipo])}${q.opcoes.length ? `: ${seguro(q.opcoes.join(' · '))}` : ''}${ja ? ' · já está no modelo' : ''}</small></span>`;
      if (!ja) l.querySelector('input').onchange = (ev) => { (ev.target.checked ? marcadasNoBanco.add(q.chave) : marcadasNoBanco.delete(q.chave)); atualizarBotaoBanco(); };
      grupo.append(l);
    }
    caixa.append(grupo);
  }
  atualizarBotaoBanco();
}
function atualizarBotaoBanco() {
  const n = marcadasNoBanco.size;
  $('btn-banco-adicionar').textContent = n ? `＋ Adicionar ${n} ${n === 1 ? 'pergunta' : 'perguntas'}` : '＋ Adicionar';
  $('btn-banco-adicionar').disabled = !n;
}
ligarBusca('banco-busca', () => desenharBanco());
$('banco-secao').onchange = () => { SOM.clique(); desenharBanco(); };
$('banco-modelo').onchange = () => { SOM.clique(); desenharBanco(); };
$('btn-modelo-banco').onclick = (ev) => { SOM.clique(); abrirBanco(ev.currentTarget); };
$('form-banco').onsubmit = (ev) => {
  ev.preventDefault();
  const escolhidas = BANCO.filter((q) => marcadasNoBanco.has(q.chave));   // na ordem do banco (por assunto)
  if (!escolhidas.length) return;
  escolhidas.forEach((q) => blocoPergunta({ tipo: q.tipo, texto: q.texto, opcoes: q.opcoes, obrigatoria: false }));
  if (!$('modelo-titulo').value.trim()) $('modelo-titulo').value = 'Anamnese psicopedagógica';
  SOM.certo();
  popupBanco.fechar();
  avisoModelo(`${escolhidas.length} ${escolhidas.length === 1 ? 'pergunta adicionada' : 'perguntas adicionadas'} do banco: ajuste o texto, a ordem ou marque as obrigatórias.`, true);
};
$('btn-modelo-pergunta').onclick = () => { SOM.clique(); blocoPergunta().querySelector('.an-texto').focus(); };
$('btn-modelo-sugeridas').onclick = () => {
  SOM.clique();
  SUGERIDAS.forEach((q) => blocoPergunta(q));
  if (!$('modelo-titulo').value.trim()) $('modelo-titulo').value = 'Anamnese de entrada';
  avisoModelo(`${SUGERIDAS.length} perguntas sugeridas adicionadas: ajuste, tire ou mude a ordem como quiser.`, true);
};
$('form-modelo').onsubmit = async (ev) => {
  ev.preventDefault();
  const blocos = [...$('modelo-perguntas').children];
  blocos.forEach((b) => b.classList.remove('faltando'));
  const perguntas = blocos.map((b) => ({
    id: b.dataset.id, texto: b.querySelector('.an-texto').value.trim(), tipo: b.querySelector('.an-tipo').value,
    opcoes: b.querySelector('.an-opcoes-campo').value.split('\n').map((o) => o.trim()).filter(Boolean),
    obrigatoria: b.querySelector('.an-obrigatoria').checked,
  }));
  const ruim = perguntas.findIndex((q) => !q.texto || (['multipla', 'varias'].includes(q.tipo) && q.opcoes.length < 2));
  if (!perguntas.length) { avisoModelo('Adicione pelo menos uma pergunta.'); return; }
  if (ruim >= 0) {
    avisoModelo(perguntas[ruim].texto ? `Pergunta ${ruim + 1}: a pergunta de opções precisa de pelo menos 2 opções (uma por linha).` : `Pergunta ${ruim + 1}: escreva a pergunta.`);
    blocos[ruim].classList.add('faltando');
    blocos[ruim].scrollIntoView({ behavior: 'smooth', block: 'center' });
    SOM.errado();
    return;
  }
  avisoModelo('Salvando…');
  try {
    const corpo = { titulo: $('modelo-titulo').value.trim(), perguntas };
    if (editandoModelo) await api(`/anamneses/modelos/${editandoModelo.id}`, { metodo: 'PUT', corpo });
    else await api('/anamneses/modelos', { metodo: 'POST', corpo });
    SOM.certo();
    popupModelo.fechar();
    await abrirModelos();
    avisoModelos(`Modelo "${corpo.titulo}" salvo. ✔`, true);
  } catch (err) { avisoModelo(err.message); SOM.errado(); }
};

$('btn-prof-alunos').onclick = () => { SOM.clique(); abrirAlunos(); };
// "Aluno" no cadastro de Usuários: o aluno não é usuário (não tem e-mail nem senha); abre esta tela já no cadastro
window.addEventListener('abrir-novo-aluno', async () => { await abrirAlunos(); abrirCadastro(null, $('btn-aluno-novo')); });
$('btn-prof-anamnese').onclick = () => { SOM.clique(); abrirModelos(); };
