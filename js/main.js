/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=182';
import { mostrar, telaInicio } from './telas.js?v=182';
import { carregarEmails, telaProfessor } from './professor.js?v=182';
import { enviarFila } from './relatorio.js?v=182';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=182';
import './chuva.js?v=182';
import './matematica.js?v=182';
import './tiro.js?v=182';
import './peso.js?v=182';
import './quiz.js?v=182';
import './luzes.js?v=182';
import './rotina.js?v=182';
import './fichas.js?v=182';
import './cores.js?v=182';
import './lados.js?v=182';
import './setas.js?v=182';
import './vistas.js?v=182';
import './dinos.js?v=182';
import './pilhas.js?v=182';
import './blocos.js?v=182';
import './lugar.js?v=182';
import './malha.js?v=182';
import './fila.js?v=182';
import './loja.js?v=182';
import './palitos.js?v=182';
import './bordas.js?v=182';
import './cadeado.js?v=182';
import './tatu.js?v=182';
import './simbolos.js?v=182';
import './tabuada.js?v=182';
import './classes.js?v=182';
import './graficos.js?v=182';
import './escondida.js?v=182';
import './copia.js?v=182';
import './barcos.js?v=182';
import './giro.js?v=182';
import './hora.js?v=182';
import './somando.js?v=182';
import './descobrir.js?v=182';
import './chaves.js?v=182';
import './caminho.js?v=182';
import './policia.js?v=182';
import './pontos.js?v=182';
import './pixels.js?v=182';
import './fracoes.js?v=182';
import './escola.js?v=182';
import './usuarios.js?v=182';
import './entrada.js?v=182';
import './turmas.js?v=182';
import './alunos.js?v=182';
import './testegratis.js?v=182';
import './competicao.js?v=182';

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
// /?area=professor: a gestão nova (/gestao/) manda para cá as áreas que ainda não migraram (Área do professor antiga)
if (new URLSearchParams(location.search).get('area') === 'professor') telaProfessor();
