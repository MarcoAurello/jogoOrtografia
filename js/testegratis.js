/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Testar grátis: a pessoa cadastra o e-mail e recebe, no fim de cada jogo, o relatório em PDF. */

import { $, seguro } from './util.js?v=134';
import { SOM } from './som.js?v=134';
import { aluno } from './estado.js?v=134';
import { api, guardarTokenTeste, lerTokenTeste } from './api.js?v=134';
import { mostrar, telaJogos } from './telas.js?v=134';
import { depoisDoFim, montarPDF } from './relatorio.js?v=134';
import { parteProfessor } from './professor.js?v=134';

// ---------- Testar grátis ----------
// O botão "Teste grátis" do início (e o item do menu) abre o cadastro: nome, e-mail, quem é e o aceite (LGPD).
// Com o cadastro feito, cada jogo terminado gera o mesmo PDF do botão "Baixar PDF" e a API manda por e-mail.
// Quem já se cadastrou vai direto para os jogos; pelo menu dá para trocar o e-mail.
const CHAVE_TESTE = 'pleno-ortografia:teste';   // { nome, email } de quem está testando neste aparelho
const lerTeste = () => { try { return JSON.parse(localStorage.getItem(CHAVE_TESTE)) || null; } catch (e) { return null; } };
const guardarTeste = (t) => { try { if (t) localStorage.setItem(CHAVE_TESTE, JSON.stringify(t)); else localStorage.removeItem(CHAVE_TESTE); } catch (e) { /* sem armazenamento */ } };
const escolaDoEndereco = () => window.ESCOLA_INICIAL?.id || new URLSearchParams(location.search).get('escola') || '';

function telaTeste() {
  const atual = lerTokenTeste() ? lerTeste() : null;
  $('erro-teste').textContent = '';
  $('teste-nome').value = atual?.nome || '';
  $('teste-email').value = atual?.email || '';
  $('teste-aceite').checked = !!atual;
  $('teste-atual').hidden = !atual;
  if (atual) $('teste-atual').textContent = `📧 Os relatórios estão indo para ${atual.email}. Para trocar, digite outro e-mail.`;
  mostrar('tela-teste');
  setTimeout(() => $(atual ? 'teste-email' : 'teste-nome').focus(), 300);
}

$('form-teste').onsubmit = async (e) => {
  e.preventDefault();
  if (!$('teste-aceite').checked) { $('erro-teste').textContent = 'Marque que aceita receber os relatórios por e-mail. ✉️'; SOM.errado(); return; }
  $('erro-teste').textContent = 'Cadastrando…';
  try {
    const { token, teste } = await api('/testes', { metodo: 'POST', corpo: {
      nome: $('teste-nome').value.trim(), email: $('teste-email').value.trim(), perfil: $('teste-perfil').value, aceite: true, escola: escolaDoEndereco(),
    } });
    guardarTokenTeste(token);
    guardarTeste(teste);
    SOM.certo();
    telaJogos();
  } catch (err) { $('erro-teste').textContent = err.message; SOM.errado(); }
};
$('btn-teste-voltar').onclick = () => { SOM.clique(); $('btn-menu-inicio').click(); };

// "Teste grátis" do início: primeiro o cadastro; depois, direto para os jogos
$('btn-area-jogos').onclick = () => { SOM.clique(); if (lerTokenTeste()) telaJogos(); else telaTeste(); };
$('btn-menu-teste').onclick = () => { SOM.clique(); telaTeste(); };

// no fim de cada jogo: o PDF do relatório vai para o e-mail cadastrado (o aviso aparece na tela do fim)
depoisDoFim.push(async ({ rel, missao }) => {
  const teste = lerTeste();
  if (!lerTokenTeste() || !teste || !rel.respondidas) return;
  const aviso = $('envio-email');
  aviso.className = 'envio-email carregando';
  aviso.textContent = `📧 Mandando o relatório em PDF para ${teste.email}…`;
  aviso.hidden = false;
  try {
    const pdf = await montarPDF();
    if (!pdf) throw new Error('Este aparelho não conseguiu montar o PDF. Toque em "Baixar PDF".');
    await api('/testes/relatorio', { metodo: 'POST', comoTeste: true, corpo: {
      pdf: pdf.doc.output('datauristring'), arquivo: pdf.arquivo.replace(/\.pdf$/, ''), aluno, titulo: missao.titulo,
    } });
    aviso.className = 'envio-email ok';
    aviso.textContent = `📧 Relatório em PDF enviado para ${teste.email}. Confira a caixa de entrada (e o spam).`;
  } catch (err) {
    if (err.status === 401) { guardarTokenTeste(''); guardarTeste(null); }
    aviso.className = 'envio-email erro';
    aviso.textContent = `📧 ${err.message}`;
  }
});

// ---------- para o administrador: quem se cadastrou ----------
const PERFIS = { professor: 'Professor(a)', psicopedagogo: 'Psicopedagogo(a)', coordenacao: 'Coordenação', responsavel: 'Responsável', outro: 'Outro' };
let cadastrados = [];
async function abrirTestes() {
  parteProfessor('testes');
  $('aviso-testes').textContent = '';
  const caixa = $('lista-testes');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando os cadastros…</p>';
  try { cadastrados = await api('/testes'); } catch (err) { caixa.innerHTML = `<p class="quiz-status">${seguro(err.message)}</p>`; return; }
  caixa.innerHTML = cadastrados.length ? cadastrados.map((t) => `<div class="quiz-item"><span class="comp-item-texto">
      <span class="quiz-item-nome">${seguro(t.nome)} · ${seguro(PERFIS[t.perfil] || t.perfil)}</span>
      <span class="quiz-item-qtd">${seguro(t.email)} · ${t.relatorios} ${t.relatorios === 1 ? 'relatório' : 'relatórios'} · desde ${new Date(t.created_at).toLocaleDateString('pt-BR')}${
        t.escola_slug ? ` · /${seguro(t.escola_slug)}` : ''}</span></span></div>`).join('')
    : '<p class="quiz-status">Ninguém se cadastrou ainda.</p>';
}
$('btn-prof-testes').onclick = () => { SOM.clique(); abrirTestes(); };
$('btn-testes-copiar').onclick = async () => {
  SOM.clique();
  const lista = cadastrados.map((t) => t.email).join(', ');
  try { await navigator.clipboard.writeText(lista); $('aviso-testes').textContent = `${cadastrados.length} e-mails copiados. ✔`; }
  catch (err) { window.prompt('Copie os e-mails:', lista); }
};
