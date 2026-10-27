/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=107';
import { mostrar, telaInicio } from './telas.js?v=107';
import { carregarEmails } from './professor.js?v=107';
import { enviarFila } from './relatorio.js?v=107';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=107';
import './chuva.js?v=107';
import './matematica.js?v=107';
import './tiro.js?v=107';
import './peso.js?v=107';
import './quiz.js?v=107';
import './luzes.js?v=107';
import './rotina.js?v=107';
import './fichas.js?v=107';
import './cores.js?v=107';
import './lados.js?v=107';
import './setas.js?v=107';
import './vistas.js?v=107';
import './dinos.js?v=107';
import './simbolos.js?v=107';
import './tabuada.js?v=107';
import './classes.js?v=107';
import './graficos.js?v=107';
import './escondida.js?v=107';
import './copia.js?v=107';
import './barcos.js?v=107';
import './giro.js?v=107';
import './hora.js?v=107';
import './somando.js?v=107';
import './descobrir.js?v=107';
import './chaves.js?v=107';
import './competicao.js?v=107';

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
