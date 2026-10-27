/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=104';
import { mostrar, telaInicio } from './telas.js?v=104';
import { carregarEmails } from './professor.js?v=104';
import { enviarFila } from './relatorio.js?v=104';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=104';
import './chuva.js?v=104';
import './matematica.js?v=104';
import './tiro.js?v=104';
import './peso.js?v=104';
import './quiz.js?v=104';
import './luzes.js?v=104';
import './rotina.js?v=104';
import './fichas.js?v=104';
import './cores.js?v=104';
import './lados.js?v=104';
import './setas.js?v=104';
import './vistas.js?v=104';
import './dinos.js?v=104';
import './simbolos.js?v=104';
import './tabuada.js?v=104';
import './classes.js?v=104';
import './graficos.js?v=104';
import './escondida.js?v=104';
import './copia.js?v=104';
import './barcos.js?v=104';
import './giro.js?v=104';
import './hora.js?v=104';
import './somando.js?v=104';
import './descobrir.js?v=104';
import './competicao.js?v=104';

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
