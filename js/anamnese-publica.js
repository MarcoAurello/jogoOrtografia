/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* A página da família (anamnese.html?t=<token>): mostra o questionário e envia as respostas. O link vale 3 horas e uma
   resposta só (a API confere). Nada fica guardado no aparelho. */

import { desenharPerguntas, lerRespostas } from './anamnese-form.js?v=146';

const $ = (id) => document.getElementById(id);
const token = new URLSearchParams(location.search).get('t') || '';
let perguntas = [];
const corValida = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

function falha(texto) {
  $('an-status').classList.remove('carregando');
  $('an-status').textContent = texto;
  $('an-form').hidden = true;
}

async function abrir() {
  if (!token) { falha('Link incompleto. Abra o link exatamente como a escola mandou.'); return; }
  let r, dados = {};
  try {
    r = await fetch(`/api/anamnese-publica/${encodeURIComponent(token)}`);
    dados = await r.json();
  } catch (e) { falha('Sem internet agora. Tente de novo quando a conexão voltar.'); return; }
  if (!r.ok) { falha(dados.message || 'Este link não vale mais. Peça um novo à escola.'); return; }
  perguntas = dados.perguntas;
  // a marca da escola (nome, logo e cor)
  if (dados.escola) {
    $('an-escola').textContent = dados.escola.nome;
    if (dados.escola.logo) $('an-logo').src = dados.escola.logo;
    if (corValida(dados.escola.cor)) document.documentElement.style.setProperty('--an-cor', dados.escola.cor);
  }
  $('an-titulo').textContent = dados.titulo;
  document.title = `${dados.titulo} · ${dados.escola ? dados.escola.nome : 'Escola'}`;
  const ate = new Date(dados.expira_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  $('an-intro').innerHTML = `Este questionário é sobre <b></b>. Responda com calma: o link vale até <b>${ate}</b> e aceita uma resposta só.
    As perguntas com <span class="an-obrig">*</span> são obrigatórias.`;
  $('an-intro').querySelector('b').textContent = dados.aluno || 'o(a) aluno(a)';
  desenharPerguntas($('an-perguntas'), perguntas);
  $('an-consentimento-linha').hidden = !dados.precisa_consentimento;
  $('an-status').hidden = true;
  $('an-form').hidden = false;
}

const aviso = (t) => { $('an-aviso').textContent = t; };
$('an-form').onsubmit = async (ev) => {
  ev.preventDefault();
  const { respostas, faltando } = lerRespostas($('an-perguntas'), perguntas);
  if (faltando) {
    aviso(`Responda a pergunta ${faltando.indice + 1} (obrigatória).`);
    faltando.campo.classList.add('faltando');
    faltando.campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if ($('an-quem').value.trim().length < 3) { aviso('Digite o seu nome.'); $('an-quem').focus(); return; }
  if (!$('an-consentimento-linha').hidden && !$('an-consentimento').checked) { aviso('Marque a autorização para enviar.'); $('an-consentimento').focus(); return; }
  aviso('Enviando…');
  $('an-enviar').disabled = true;
  try {
    const r = await fetch(`/api/anamnese-publica/${encodeURIComponent(token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ respostas, respondida_por_nome: $('an-quem').value.trim(), consentimento: $('an-consentimento').checked }),
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) { aviso(dados.message || 'Não deu para enviar. Tente de novo.'); $('an-enviar').disabled = false; return; }
    $('an-form').hidden = true;
    $('an-fim').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    aviso('Sem internet agora: as respostas continuam aqui. Tente enviar de novo quando a conexão voltar.');
    $('an-enviar').disabled = false;
  }
};

abrir();
