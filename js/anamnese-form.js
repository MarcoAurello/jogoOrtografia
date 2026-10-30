/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Anamnese: desenha as perguntas para responder e lê as respostas. Usado na Área do professor (aplicar presencial) e na
   página da família (anamnese.html, pelo link de 3 horas). Sem dependências: a página da família carrega só isto. */

export const TIPOS = {
  curta: 'Resposta curta',
  longa: 'Resposta longa (parágrafo)',
  simnao: 'Sim ou não',
  multipla: 'Múltipla escolha (uma opção)',
  escala: 'Escala de 1 a 5',
};
const ESCALA = ['1 · Nunca', '2 · Raramente', '3 · Às vezes', '4 · Frequentemente', '5 · Sempre'];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// as perguntas como campos de formulário (cada uma num cartão, numerada; as obrigatórias com *)
export function desenharPerguntas(caixa, perguntas, respostas = {}) {
  caixa.innerHTML = perguntas.map((q, i) => {
    const nome = `q-${q.id}`;
    const v = respostas[q.id];
    let campo = '';
    if (q.tipo === 'curta') campo = `<input type="text" name="${nome}" maxlength="300" value="${esc(v || '')}">`;
    else if (q.tipo === 'longa') campo = `<textarea name="${nome}" rows="4" maxlength="4000">${esc(v || '')}</textarea>`;
    else if (q.tipo === 'simnao') {
      campo = `<span class="an-opcoes an-linha">${[['sim', 'Sim'], ['nao', 'Não']].map(([val, txt]) =>
        `<label class="an-opcao"><input type="radio" name="${nome}" value="${val}"${v === val ? ' checked' : ''}> ${txt}</label>`).join('')}</span>`;
    } else if (q.tipo === 'multipla') {
      campo = `<span class="an-opcoes">${q.opcoes.map((o) =>
        `<label class="an-opcao"><input type="radio" name="${nome}" value="${esc(o)}"${v === o ? ' checked' : ''}> ${esc(o)}</label>`).join('')}</span>`;
    } else if (q.tipo === 'escala') {
      campo = `<span class="an-opcoes an-escala">${ESCALA.map((txt, k) =>
        `<label class="an-opcao"><input type="radio" name="${nome}" value="${k + 1}"${Number(v) === k + 1 ? ' checked' : ''}> ${txt}</label>`).join('')}</span>`;
    }
    return `<fieldset class="an-pergunta" data-id="${esc(q.id)}">
      <legend><b>${i + 1}.</b> ${esc(q.texto)}${q.obrigatoria ? ' <span class="an-obrig" title="Obrigatória">*</span>' : ''}</legend>${campo}</fieldset>`;
  }).join('');
}

// lê as respostas; a primeira obrigatória sem resposta vem em faltando (para rolar até ela)
export function lerRespostas(caixa, perguntas) {
  const respostas = {};
  let faltando = null;
  caixa.querySelectorAll('.an-pergunta').forEach((f) => f.classList.remove('faltando'));
  perguntas.forEach((q, i) => {
    const nome = `q-${q.id}`;
    let v = null;
    if (q.tipo === 'curta' || q.tipo === 'longa') v = (caixa.querySelector(`[name="${nome}"]`)?.value || '').trim() || null;
    else v = caixa.querySelector(`[name="${nome}"]:checked`)?.value ?? null;
    if (v !== null) respostas[q.id] = q.tipo === 'escala' ? Number(v) : v;
    else if (q.obrigatoria && !faltando) faltando = { indice: i, campo: caixa.querySelector(`.an-pergunta[data-id="${q.id}"]`) };
  });
  return { respostas, faltando };
}

// a resposta como texto (para ver uma anamnese já respondida)
export function textoDaResposta(q, v) {
  if (v === undefined || v === null || v === '') return '—';
  if (q.tipo === 'simnao') return v === 'sim' ? 'Sim' : 'Não';
  if (q.tipo === 'escala') return ESCALA[Number(v) - 1] || String(v);
  return String(v);
}

// a anamnese respondida, para ler (pergunta e resposta)
export function desenharRespondida(perguntas, respostas) {
  return `<dl class="an-respondida">${perguntas.map((q, i) =>
    `<dt><b>${i + 1}.</b> ${esc(q.texto)}</dt><dd>${esc(textoDaResposta(q, (respostas || {})[q.id]))}</dd>`).join('')}</dl>`;
}

// perguntas sugeridas para começar um modelo (a escola ajusta o que quiser)
export const SUGERIDAS = [
  { tipo: 'longa', texto: 'Como foi a gestação e o parto? (alguma intercorrência?)', obrigatoria: false },
  { tipo: 'curta', texto: 'Com que idade começou a andar e a falar?', obrigatoria: false },
  { tipo: 'simnao', texto: 'Tem algum diagnóstico ou laudo (ex.: TDAH, TEA, dislexia)?', obrigatoria: true },
  { tipo: 'longa', texto: 'Se sim, qual diagnóstico e quem acompanha (médico, psicólogo, fono...)?', obrigatoria: false },
  { tipo: 'simnao', texto: 'Usa algum medicamento de forma contínua?', obrigatoria: false },
  { tipo: 'multipla', texto: 'Como é o sono?', opcoes: ['Dorme bem', 'Demora a dormir', 'Acorda à noite', 'Dorme pouco'], obrigatoria: false },
  { tipo: 'escala', texto: 'Consegue manter a atenção numa tarefa até o fim?', obrigatoria: false },
  { tipo: 'escala', texto: 'Fica agitado(a) ou inquieto(a)?', obrigatoria: false },
  { tipo: 'escala', texto: 'Tem facilidade para fazer amigos?', obrigatoria: false },
  { tipo: 'multipla', texto: 'Como lida com frustração (perder, errar)?', opcoes: ['Aceita bem', 'Fica triste', 'Fica irritado(a)', 'Desiste'], obrigatoria: false },
  { tipo: 'longa', texto: 'Do que mais gosta de fazer? E do que não gosta?', obrigatoria: false },
  { tipo: 'longa', texto: 'Quais dificuldades a família percebe na escola (leitura, escrita, matemática...)?', obrigatoria: false },
  { tipo: 'longa', texto: 'Algo mais que a escola deva saber?', obrigatoria: false },
];
