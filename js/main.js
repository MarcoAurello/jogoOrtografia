/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=181';
import { mostrar, telaInicio } from './telas.js?v=181';
import { carregarEmails, telaProfessor } from './professor.js?v=181';
import { enviarFila } from './relatorio.js?v=181';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=181';
import './chuva.js?v=181';
import './matematica.js?v=181';
import './tiro.js?v=181';
import './peso.js?v=181';
import './quiz.js?v=181';
import './luzes.js?v=181';
import './rotina.js?v=181';
import './fichas.js?v=181';
import './cores.js?v=181';
import './lados.js?v=181';
import './setas.js?v=181';
import './vistas.js?v=181';
import './dinos.js?v=181';
import './pilhas.js?v=181';
import './blocos.js?v=181';
import './lugar.js?v=181';
import './malha.js?v=181';
import './fila.js?v=181';
import './loja.js?v=181';
import './palitos.js?v=181';
import './bordas.js?v=181';
import './cadeado.js?v=181';
import './tatu.js?v=181';
import './simbolos.js?v=181';
import './tabuada.js?v=181';
import './classes.js?v=181';
import './graficos.js?v=181';
import './escondida.js?v=181';
import './copia.js?v=181';
import './barcos.js?v=181';
import './giro.js?v=181';
import './hora.js?v=181';
import './somando.js?v=181';
import './descobrir.js?v=181';
import './chaves.js?v=181';
import './caminho.js?v=181';
import './policia.js?v=181';
import './pontos.js?v=181';
import './pixels.js?v=181';
import './fracoes.js?v=181';
import './escola.js?v=181';
import './usuarios.js?v=181';
import './entrada.js?v=181';
import './turmas.js?v=181';
import './alunos.js?v=181';
import './testegratis.js?v=181';
import './competicao.js?v=181';

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
