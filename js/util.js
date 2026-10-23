/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ajudantes usados por todo o jogo: atalho do getElementById, sorteio, embaralhar e texto seguro para HTML. */

const $ = (id) => document.getElementById(id);
const embaralhar = (lista) => {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

// escapa texto digitado (nome do aluno) antes de colocar no HTML
const seguro = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const semHTML = (t) => String(t).replace(/<[^>]+>/g, '');

export { $, embaralhar, seguro, semHTML, sortear };
