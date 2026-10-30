/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Popup do administrador (criar/editar escola, cadastrar usuário): abre por cima da lista e fecha sem perder o lugar. */

import { $ } from './util.js?v=149';

// Fecha no ✕ e em Cancelar (botões passados em fechar), com Esc ou tocando fora do cartão. Enquanto está aberto, a
// página atrás não rola. Ao fechar, o foco volta para o botão que abriu (quem usa teclado não se perde).
export function criarPopup(id, { fechar = [] } = {}) {
  const fundo = $(id);
  let origem = null;
  const aberto = () => !fundo.hidden;
  function fecharPopup() {
    if (!aberto()) return;
    fundo.hidden = true;
    if (!document.querySelector('.adm-popup:not([hidden])')) document.body.classList.remove('com-popup');
    if (origem && document.contains(origem)) origem.focus();
    origem = null;
  }
  function abrirPopup(quemAbriu = null, focar = null) {
    origem = quemAbriu || document.activeElement;
    fundo.hidden = false;
    document.body.classList.add('com-popup');
    fundo.scrollTop = 0;   // quem rola é a camada escura (style.css .adm-popup)
    // o foco não pode rolar a tela sozinho no celular (o teclado sobe e esconde o resto): rola só até o campo
    if (focar) setTimeout(() => $(focar).focus({ preventScroll: true }), 50);
  }
  fechar.forEach((b) => { $(b).addEventListener('click', fecharPopup); });
  fundo.addEventListener('mousedown', (ev) => { if (ev.target === fundo) fecharPopup(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && aberto()) fecharPopup(); });
  return { abrir: abrirPopup, fechar: fecharPopup, aberto };
}

// ---------- apoio às listas com filtro (o mesmo comportamento em todas as telas de cadastro) ----------
export const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// busca: redesenha 150 ms depois da última tecla (não pisca a cada letra)
export function ligarBusca(id, aoMudar) {
  let espera = 0;
  $(id).addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(aoMudar, 150); });
}
// filtro em select (sem rolagem lateral, o celular abre a lista nativa); aoEscolher(valor) redesenha a lista.
// contar(f) põe a quantidade em cada opção: "✅ Ativos (14)" (o texto base fica em data-rotulo)
export function ligarFiltro(id, aoEscolher) {
  const sel = $(id);
  sel.addEventListener('change', () => aoEscolher(sel.value));
  return {
    valor: () => sel.value,
    escolher: (v) => { sel.value = v; },
    contar: (f) => [...sel.options].forEach((o) => { if (o.dataset.rotulo) o.textContent = `${o.dataset.rotulo} (${f(o.value)})`; }),
  };
}
// "12 turmas" ou "Mostrando 3 de 12 turmas"
export function mostrarContagem(id, mostrando, total, filtrando, [um, varios]) {
  $(id).textContent = !total ? '' : filtrando ? `Mostrando ${mostrando} de ${total} ${varios}` : `${total} ${total === 1 ? um : varios}`;
}
// lista sem itens: sem nada cadastrado (textoVazio) ou nada no filtro (com o botão Limpar filtros)
export function listaSemItens(caixa, nadaCadastrado, textoVazio, limpar) {
  caixa.innerHTML = `<p class="quiz-status">${nadaCadastrado ? textoVazio : 'Nada com esse filtro.'}</p>`;
  if (nadaCadastrado) return;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn-sec btn-pequeno adm-limpar-filtro';
  b.textContent = 'Limpar filtros';
  b.onclick = limpar;
  caixa.append(b);
}
