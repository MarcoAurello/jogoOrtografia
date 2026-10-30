/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Plano de Objetivos Psicopedagógicos do aluno: a lista de planos (um por ciclo), o editor (identificação, objetivos e
   metas montados livremente, parceria família/escola, status) e o PDF para o relatório. Padrão das telas de cadastro. */

import { $, seguro } from './util.js?v=151';
import { SOM } from './som.js?v=151';
import { api } from './api.js?v=151';
import { JOGOS_DO_LINK, usuarioAtual } from './professor.js?v=151';
import { criarPopup } from './popup.js?v=151';

const STATUS = { elaboracao: '📝 Em elaboração', ativo: '▶️ Ativo', concluido: '✅ Concluído' };
const DIAS = [['seg', 'Seg'], ['ter', 'Ter'], ['qua', 'Qua'], ['qui', 'Qui'], ['sex', 'Sex'], ['sab', 'Sáb'], ['dom', 'Dom']];
const ADEQUACOES = ['Mais tempo nas avaliações', 'Sentar perto do professor', 'Instruções curtas, uma de cada vez', 'Uso de material concreto',
  'Avaliação oral quando possível', 'Pausas durante as atividades', 'Reforço positivo frequente', 'Menos estímulos visuais no material',
  'Leitura das questões em voz alta', 'Agenda/rotina visual'];
const dataBR = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const aviso = (id) => (texto, ok = false) => { $(id).textContent = texto; $(id).classList.toggle('aviso-ok', ok); };
const avisoPlanos = aviso('aviso-planos');
const avisoPlano = aviso('aviso-plano');
const nomeDoJogo = (id) => JOGOS_DO_LINK[id]?.nome || id;

let aluno = null;        // { id, nome, nome_completo }
let podeEditar = false;
let editando = null;     // o plano aberto no editor (null = novo)
let aoMudar = null;      // avisa a lista de alunos (o "plano ativo" pode ter mudado)

// ---------- popup: os planos do aluno ----------
const popupPlanos = criarPopup('planos-modal', { fechar: ['btn-planos-fechar', 'btn-planos-cancelar'] });
export async function abrirPlanos(a, origem, depois = null) {
  aluno = a;
  aoMudar = depois;
  avisoPlanos('');
  $('planos-modal-titulo').textContent = `🎯 Planos de objetivos · ${a.nome}`;
  $('lista-planos').innerHTML = '<p class="quiz-status carregando">Buscando os planos…</p>';
  popupPlanos.abrir(origem);
  await listar();
}
let planos = [];
async function listar() {
  const caixa = $('lista-planos');
  let r;
  try { r = await api(`/alunos/${aluno.id}/planos`); } catch (err) { caixa.innerHTML = ''; avisoPlanos(err.message); return; }
  planos = r.planos;
  podeEditar = r.pode_editar;
  $('btn-plano-novo').hidden = !podeEditar;
  caixa.innerHTML = planos.length ? '' : `<p class="quiz-status">Nenhum plano ainda.${podeEditar ? ' Toque em <b>＋ Novo plano</b>.' : ''}</p>`;
  for (const p of planos) {
    const item = document.createElement('div');
    item.className = `quiz-item plano-item plano-${p.status}`;
    item.innerHTML = `<span class="comp-item-texto"><span class="quiz-item-nome">🎯 ${seguro(p.ciclo || 'Plano sem ciclo')} <small>${STATUS[p.status]}</small></span>
      <span class="quiz-item-qtd">${p.objetivos.length} ${p.objetivos.length === 1 ? 'objetivo' : 'objetivos'} · ${seguro(p.profissional_nome)} · atualizado em ${dataBR(p.atualizado_em)}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, classe, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = classe; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    botao(podeEditar ? '✏️ Abrir' : '👁️ Ver', 'quiz-link', (ev) => { SOM.clique(); abrirEditor(p, ev.currentTarget); });
    botao('📄 PDF', 'quiz-link', () => { SOM.clique(); baixarPDF(p); });
    if (podeEditar) {
      botao('🗑️ Apagar', 'quiz-excluir', async () => {
        if (!window.confirm(`Apagar o plano "${p.ciclo || 'sem ciclo'}"? Não dá para desfazer.`)) return;
        try { await api(`/planos/${p.id}`, { metodo: 'DELETE' }); avisoPlanos('Plano apagado. ✔', true); await listar(); if (aoMudar) aoMudar(); }
        catch (err) { avisoPlanos(err.message); }
      });
    }
    item.append(botoes);
    caixa.append(item);
  }
}
$('btn-plano-novo').onclick = (ev) => { SOM.clique(); abrirEditor(null, ev.currentTarget); };

// ---------- popup: o editor do plano ----------
const popupPlano = criarPopup('plano-modal', { fechar: ['btn-plano-fechar', 'btn-plano-cancelar'] });
function abrirEditor(plano, origem) {
  editando = plano;
  avisoPlano('');
  const novo = !plano;
  $('plano-modal-titulo').textContent = novo ? `🎯 Novo plano · ${aluno.nome}` : `🎯 ${plano.ciclo || 'Plano'} · ${aluno.nome}`;
  $('plano-aluno').value = aluno.nome_completo || aluno.nome;
  $('plano-profissional').value = plano?.profissional_nome || usuarioAtual()?.nome || '';
  $('plano-ciclo').value = plano?.ciclo || '';
  $('plano-foco').value = plano?.foco || '';
  $('plano-familia').value = plano?.orientacoes_familia || '';
  $('plano-adequacoes-texto').value = plano?.adequacoes_texto || '';
  const marcadas = new Set(plano?.adequacoes_escola || []);
  // as sugestões do sistema e as que o plano já tinha (se alguém mudou a lista no futuro)
  const todas = [...ADEQUACOES, ...[...marcadas].filter((x) => !ADEQUACOES.includes(x))];
  $('plano-adequacoes').innerHTML = todas.map((x) => `<label class="an-opcao"><input type="checkbox" value="${seguro(x)}"${marcadas.has(x) ? ' checked' : ''}> ${seguro(x)}</label>`).join('');
  document.querySelectorAll('input[name="plano-status"]').forEach((r) => { r.checked = r.value === (plano?.status || 'elaboracao'); });
  $('plano-objetivos').innerHTML = '';
  (plano?.objetivos?.length ? plano.objetivos : [null]).forEach((o) => blocoObjetivo(o));
  // quem só vê (não mexe no aluno): tudo travado, sem salvar
  $('form-plano').querySelectorAll('input, textarea, select').forEach((c) => { if (c.id !== 'plano-aluno') c.disabled = !podeEditar; });
  ['btn-plano-salvar', 'btn-plano-objetivo'].forEach((id) => { $(id).hidden = !podeEditar; });
  $('form-plano').querySelectorAll('.plano-obj-botoes').forEach((b) => { b.hidden = !podeEditar; });
  popupPlano.abrir(origem, podeEditar ? (novo ? 'plano-ciclo' : null) : null);
}

// um bloco de objetivo/meta: área, descrição, jogos do sistema + recursos, indicador, prazo e dias
function blocoObjetivo(o = null) {
  const div = document.createElement('fieldset');
  div.className = 'plano-objetivo';
  if (o?.id) div.dataset.id = o.id;
  const jogos = new Set(o?.jogos || []);
  div.innerHTML = `<legend><span class="plano-obj-num"></span>
      <span class="plano-obj-botoes"><button type="button" class="quiz-link" data-acao="subir" aria-label="Subir">↑</button>
      <button type="button" class="quiz-link" data-acao="descer" aria-label="Descer">↓</button>
      <button type="button" class="quiz-tirar" data-acao="tirar">✕ tirar</button></span></legend>
    <label class="campo campo-jogo"><span>Área de desenvolvimento / categoria</span>
      <input type="text" class="po-area" maxlength="80" list="plano-areas" placeholder="Escolha ou escreva"></label>
    <label class="campo campo-jogo"><span>Descrição do objetivo</span>
      <textarea class="po-descricao" rows="2" maxlength="2000" placeholder="Ex.: Ler palavras com sílabas complexas com 80% de acerto"></textarea></label>
    <details class="po-jogos-caixa"${jogos.size ? ' open' : ''}><summary>🎮 Jogos do sistema <span class="po-jogos-qtd"></span></summary>
      <div class="plano-checks po-jogos">${Object.entries(JOGOS_DO_LINK).map(([id, j]) =>
        `<label class="an-opcao"><input type="checkbox" value="${seguro(id)}"${jogos.has(id) ? ' checked' : ''}> ${seguro(j.nome)}</label>`).join('')}</div></details>
    <label class="campo campo-jogo"><span>Outras estratégias e recursos (materiais táteis, offline)</span>
      <textarea class="po-recursos" rows="2" maxlength="1000"></textarea></label>
    <label class="campo campo-jogo"><span>Indicador de sucesso / forma de avaliação</span>
      <textarea class="po-indicador" rows="2" maxlength="1000" placeholder="Como você vai medir se foi alcançado?"></textarea></label>
    <div class="plano-grade">
      <label class="campo campo-jogo"><span>Prazo / frequência</span>
        <input type="text" class="po-prazo" maxlength="80" placeholder="Ex.: 8 semanas, 2x por semana"></label>
      <div class="campo campo-jogo"><span>Dias da semana</span>
        <div class="plano-dias">${DIAS.map(([v, txt]) => `<label class="an-opcao"><input type="checkbox" class="po-dia" value="${v}"${(o?.dias || []).includes(v) ? ' checked' : ''}> ${txt}</label>`).join('')}</div></div>
    </div>`;
  div.querySelector('.po-area').value = o?.area || '';
  div.querySelector('.po-descricao').value = o?.descricao || '';
  div.querySelector('.po-recursos').value = o?.recursos || '';
  div.querySelector('.po-indicador').value = o?.indicador || '';
  div.querySelector('.po-prazo').value = o?.prazo || '';
  const contar = () => { const n = div.querySelectorAll('.po-jogos input:checked').length; div.querySelector('.po-jogos-qtd').textContent = n ? `(${n} escolhido${n === 1 ? '' : 's'})` : ''; };
  div.querySelector('.po-jogos').addEventListener('change', contar);
  contar();
  div.querySelector('.plano-obj-botoes').onclick = (ev) => {
    const acao = ev.target.closest('button')?.dataset.acao;
    if (acao === 'tirar' && (!div.querySelector('.po-descricao').value.trim() || window.confirm('Tirar este objetivo do plano?'))) div.remove();
    else if (acao === 'subir' && div.previousElementSibling) div.parentElement.insertBefore(div, div.previousElementSibling);
    else if (acao === 'descer' && div.nextElementSibling) div.parentElement.insertBefore(div.nextElementSibling, div);
    numerar();
  };
  $('plano-objetivos').append(div);
  numerar();
  return div;
}
function numerar() { [...$('plano-objetivos').children].forEach((b, i) => { b.querySelector('.plano-obj-num').textContent = `Objetivo ${i + 1}`; }); }
$('btn-plano-objetivo').onclick = () => {
  SOM.clique();
  const b = blocoObjetivo();
  b.scrollIntoView({ behavior: 'smooth', block: 'center' });
  b.querySelector('.po-area').focus({ preventScroll: true });
};

// o plano como está no editor (para salvar e para o PDF)
function lerEditor() {
  return {
    profissional_nome: $('plano-profissional').value.trim(), ciclo: $('plano-ciclo').value.trim(), foco: $('plano-foco').value.trim(),
    objetivos: [...$('plano-objetivos').children].map((b) => ({
      id: b.dataset.id, area: b.querySelector('.po-area').value.trim(), descricao: b.querySelector('.po-descricao').value.trim(),
      jogos: [...b.querySelectorAll('.po-jogos input:checked')].map((c) => c.value), recursos: b.querySelector('.po-recursos').value.trim(),
      indicador: b.querySelector('.po-indicador').value.trim(), prazo: b.querySelector('.po-prazo').value.trim(),
      dias: [...b.querySelectorAll('.po-dia:checked')].map((c) => c.value),
    })).filter((o) => o.area || o.descricao),
    orientacoes_familia: $('plano-familia').value.trim(),
    adequacoes_escola: [...$('plano-adequacoes').querySelectorAll('input:checked')].map((c) => c.value),
    adequacoes_texto: $('plano-adequacoes-texto').value.trim(),
    status: document.querySelector('input[name="plano-status"]:checked')?.value || 'elaboracao',
  };
}
$('form-plano').onsubmit = async (ev) => {
  ev.preventDefault();
  const dados = lerEditor();
  const blocos = [...$('plano-objetivos').children];
  blocos.forEach((b) => b.classList.remove('faltando'));
  const semDescricao = blocos.find((b) => b.querySelector('.po-area').value.trim() && !b.querySelector('.po-descricao').value.trim());
  if (semDescricao) {
    avisoPlano(`${semDescricao.querySelector('.plano-obj-num').textContent}: escreva a descrição do objetivo.`);
    semDescricao.classList.add('faltando');
    semDescricao.scrollIntoView({ behavior: 'smooth', block: 'center' });
    SOM.errado();
    return;
  }
  if (dados.status !== 'elaboracao' && !dados.objetivos.length) { avisoPlano('Para ativar o plano, adicione pelo menos um objetivo.'); SOM.errado(); return; }
  avisoPlano('Salvando…');
  try {
    if (editando) await api(`/planos/${editando.id}`, { metodo: 'PUT', corpo: dados });
    else await api(`/alunos/${aluno.id}/planos`, { metodo: 'POST', corpo: dados });
    SOM.certo();
    popupPlano.fechar();
    avisoPlanos(dados.status === 'ativo' ? 'Plano salvo e ativo (se havia outro ativo, ele passou a concluído). ✔' : 'Plano salvo. ✔', true);
    await listar();
    if (aoMudar) aoMudar();
  } catch (err) { avisoPlano(err.message); SOM.errado(); }
};
$('btn-plano-pdf').onclick = () => { SOM.clique(); baixarPDF({ ...lerEditor(), atualizado_em: editando?.atualizado_em || new Date() }); };

// ---------- PDF do plano (jsPDF, o mesmo do relatório) ----------
// a fonte padrão do PDF só tem letras latinas: emojis e setas saem
const paraPDF = (t) => String(t ?? '').replace(/→/g, '->').replace(/[^\u0000-ÿ–—•]/g, '').replace(/[ \t]+/g, ' ').trim();
function baixarPDF(p) {
  const lib = window.jspdf;
  if (!lib || !lib.jsPDF) { avisoPlano('Não deu para gerar o PDF neste aparelho.'); return; }
  const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
  const AZUL = [19, 119, 132], TEXTO = [34, 54, 74], CINZA = [100, 116, 139];
  const L = 18, LARG = 210 - 2 * L;
  let y = 18;
  const pagina = (alt) => { if (y + alt > 280) { doc.addPage(); y = 20; } };
  const texto = (t, tam = 10.5, estilo = 'normal', cor = TEXTO, recuo = 0) => {
    if (!paraPDF(t)) return;
    doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...cor);
    for (const l of doc.splitTextToSize(paraPDF(t), LARG - recuo)) { pagina(tam * 0.5); doc.text(l, L + recuo, y); y += tam * 0.45; }
  };
  const campo = (rot, v) => { if (paraPDF(v)) { texto(rot, 9.5, 'bold', CINZA); texto(v, 10.5); y += 1.5; } };
  const secao = (t) => { y += 3; pagina(14); texto(t, 13, 'bold', AZUL); doc.setDrawColor(...AZUL); doc.setLineWidth(0.3); doc.line(L, y - 2, L + LARG, y - 2); y += 2; };
  texto('Plano de Objetivos Psicopedagógicos', 18, 'bold', AZUL);
  texto(`${STATUS[p.status] || ''} · atualizado em ${dataBR(p.atualizado_em)}`, 9.5, 'normal', CINZA);
  secao('1. Identificação e parâmetros');
  campo('Aluno', aluno.nome_completo || aluno.nome);
  campo('Profissional responsável', p.profissional_nome);
  campo('Ciclo / período', p.ciclo);
  campo('Abordagem / foco principal', p.foco);
  secao('2. Objetivos e metas');
  if (!p.objetivos.length) texto('Nenhum objetivo ainda.', 10.5, 'italic', CINZA);
  p.objetivos.forEach((o, i) => {
    pagina(20);
    texto(`Objetivo ${i + 1}${o.area ? `: ${o.area}` : ''}`, 11.5, 'bold', TEXTO);
    texto(o.descricao, 10.5, 'normal', TEXTO, 3);
    const jogos = (o.jogos || []).map(nomeDoJogo).join(', ');
    if (jogos) texto(`Jogos do sistema: ${jogos}`, 10, 'normal', TEXTO, 3);
    if (o.recursos) texto(`Outros recursos: ${o.recursos}`, 10, 'normal', TEXTO, 3);
    if (o.indicador) texto(`Indicador de sucesso: ${o.indicador}`, 10, 'normal', TEXTO, 3);
    const dias = (o.dias || []).map((d) => DIAS.find(([v]) => v === d)?.[1]).filter(Boolean).join(', ');
    if (o.prazo || dias) texto(`Prazo / frequência: ${[o.prazo, dias].filter(Boolean).join(' · ')}`, 10, 'normal', TEXTO, 3);
    y += 2;
  });
  secao('3. Plano de parceria');
  campo('Orientações e atividades para casa (família)', p.orientacoes_familia);
  campo('Adequações e sugestões para a escola', [...(p.adequacoes_escola || []).map((x) => `• ${x}`), p.adequacoes_texto].filter(Boolean).join('\n'));
  y += 14; pagina(24);
  doc.setDrawColor(...CINZA); doc.setLineWidth(0.3);
  doc.line(L, y, L + 75, y); doc.line(L + LARG - 75, y, L + LARG, y);
  y += 4;
  texto('Profissional responsável', 9, 'normal', CINZA);
  y -= 4; doc.text('Responsável pelo aluno', L + LARG - 75, y); y += 8;
  texto('Documento de uso da equipe escolar e da família. Contém dados pessoais do aluno (LGPD).', 8.5, 'italic', CINZA);
  const nome = `plano-objetivos-${aluno.nome}-${p.ciclo || ''}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '').toLowerCase();
  doc.save(`${nome}.pdf`);
}
