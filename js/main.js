/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=241';
import { mostrar, telaInicio } from './telas.js?v=241';
import { carregarEmails, telaProfessor } from './professor.js?v=241';
import { enviarFila } from './relatorio.js?v=241';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=241';
import './chuva.js?v=241';
import './matematica.js?v=241';
import './tiro.js?v=241';
import './peso.js?v=241';
import './quiz.js?v=241';
import './luzes.js?v=241';
import './rotina.js?v=241';
import './fichas.js?v=241';
import './cores.js?v=241';
import './lados.js?v=241';
import './setas.js?v=241';
import './vistas.js?v=241';
import './dinos.js?v=241';
import './pilhas.js?v=241';
import './blocos.js?v=241';
import './lugar.js?v=241';
import './malha.js?v=241';
import './fila.js?v=241';
import './loja.js?v=241';
import './palitos.js?v=241';
import './bordas.js?v=241';
import './cadeado.js?v=241';
import './tatu.js?v=241';
import './flores.js?v=241';
import './bichos.js?v=241';
import './intervalo.js?v=241';
import './fita.js?v=241';
import './simbolos.js?v=241';
import './tabuada.js?v=241';
import './classes.js?v=241';
import './graficos.js?v=241';
import './historia.js?v=241';
import './comercio.js?v=241';
import './cartografo.js?v=241';
import './bip.js?v=241';
import './escondida.js?v=241';
import './copia.js?v=241';
import './barcos.js?v=241';
import './giro.js?v=241';
import './hora.js?v=241';
import './somando.js?v=241';
import './descobrir.js?v=241';
import './chaves.js?v=241';
import './caminho.js?v=241';
import './policia.js?v=241';
import './pontos.js?v=241';
import './pixels.js?v=241';
import './fracoes.js?v=241';
import './escola.js?v=241';
import './usuarios.js?v=241';
import { telaCasa } from './entrada.js?v=241';
import './turmas.js?v=241';
import './alunos.js?v=241';
import './testegratis.js?v=241';
import './competicao.js?v=241';

// ---------- Instalar como app ----------
let pedidoInstalacao = null;
const rodandoComoApp = () => matchMedia('(display-mode: standalone)').matches
  || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;

// Chrome/Edge no Android avisam quando dá para instalar: guardamos o pedido para o botão
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  pedidoInstalacao = e;
  $('btn-instalar').hidden = false;
});
window.addEventListener('appinstalled', () => { pedidoInstalacao = null; $('btn-instalar').hidden = true; });
if (!rodandoComoApp()) $('btn-instalar').hidden = false;

$('btn-instalar').onclick = async () => {
  if (pedidoInstalacao) {
    pedidoInstalacao.prompt();
    const { outcome } = await pedidoInstalacao.userChoice;
    pedidoInstalacao = null;
    if (outcome === 'accepted') $('btn-instalar').hidden = true;
    return;
  }
  // Sem o pedido do navegador: explica como instalar à mão
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua);
  const dentroDeApp = /FBAN|FBAV|Instagram|WhatsApp|Line\//i.test(ua);
  const passos = ios
    ? ['Abra este link no <b>Safari</b>.', 'Toque em <b>Compartilhar</b> (quadrado com a seta ⬆).', 'Escolha <b>Adicionar à Tela de Início</b>.', 'Abra pelo <b>ícone do jogo</b>.']
    : ['Abra este link no <b>Google Chrome</b> (não dentro do WhatsApp ou Instagram).', 'Toque em <b>⋮</b> no canto de cima.', 'Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial → Instalar</b>).', 'Abra pelo <b>ícone do jogo</b> na tela do celular.'];
  if (dentroDeApp) passos.unshift('⚠ Você abriu pelo navegador de outro app, que não instala jogos. Toque em <b>⋮ → Abrir no navegador</b>.');
  $('passos-instalar').innerHTML = passos.map((p) => `<li>${p}</li>`).join('');
  mostrar('tela-instalar');
};
$('btn-fechar-instalar').onclick = telaInicio;

// relatórios que ficaram sem enviar: tenta ao abrir o jogo e quando a internet voltar
window.addEventListener('online', enviarFila);
carregarEmails().then(enviarFila);

telaInicio();
// app pronto: a abertura (logo) sai com um esmaecer, depois de pelo menos 0,8 s para não piscar
setTimeout(() => {
  const splash = $('splash');
  if (!splash) return;
  splash.classList.add('sai');
  setTimeout(() => splash.remove(), 600);
}, Math.max(0, 800 - performance.now()));
// /?area=professor: a gestão nova (/gestao/) manda para cá as áreas que ainda não migraram (Área do professor antiga)
if (new URLSearchParams(location.search).get('area') === 'professor') telaProfessor();
// /?casa (ou /?casa=<id do filho>): a área da família (/gestao/familia, botão "Jogar") manda para "Quem vai jogar?".
// Sai do endereço para o recarregar da página não voltar a esta tela.
const casaDoLink = new URLSearchParams(location.search).get('casa');
if (casaDoLink !== null) { history.replaceState(null, '', location.pathname); telaCasa(casaDoLink === '1' ? '' : casaDoLink, true); }
