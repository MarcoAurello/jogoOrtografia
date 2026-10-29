/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=136';
import { mostrar, telaInicio } from './telas.js?v=136';
import { carregarEmails } from './professor.js?v=136';
import { enviarFila } from './relatorio.js?v=136';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=136';
import './chuva.js?v=136';
import './matematica.js?v=136';
import './tiro.js?v=136';
import './peso.js?v=136';
import './quiz.js?v=136';
import './luzes.js?v=136';
import './rotina.js?v=136';
import './fichas.js?v=136';
import './cores.js?v=136';
import './lados.js?v=136';
import './setas.js?v=136';
import './vistas.js?v=136';
import './dinos.js?v=136';
import './simbolos.js?v=136';
import './tabuada.js?v=136';
import './classes.js?v=136';
import './graficos.js?v=136';
import './escondida.js?v=136';
import './copia.js?v=136';
import './barcos.js?v=136';
import './giro.js?v=136';
import './hora.js?v=136';
import './somando.js?v=136';
import './descobrir.js?v=136';
import './chaves.js?v=136';
import './caminho.js?v=136';
import './policia.js?v=136';
import './pontos.js?v=136';
import './pixels.js?v=136';
import './fracoes.js?v=136';
import './escola.js?v=136';
import './usuarios.js?v=136';
import './entrada.js?v=136';
import './turmas.js?v=136';
import './testegratis.js?v=136';
import './competicao.js?v=136';

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
