/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

import { $ } from './util.js?v=183';
import { mostrar, telaInicio } from './telas.js?v=183';
import { carregarEmails, telaProfessor } from './professor.js?v=183';
import { enviarFila } from './relatorio.js?v=183';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=183';
import './chuva.js?v=183';
import './matematica.js?v=183';
import './tiro.js?v=183';
import './peso.js?v=183';
import './quiz.js?v=183';
import './luzes.js?v=183';
import './rotina.js?v=183';
import './fichas.js?v=183';
import './cores.js?v=183';
import './lados.js?v=183';
import './setas.js?v=183';
import './vistas.js?v=183';
import './dinos.js?v=183';
import './pilhas.js?v=183';
import './blocos.js?v=183';
import './lugar.js?v=183';
import './malha.js?v=183';
import './fila.js?v=183';
import './loja.js?v=183';
import './palitos.js?v=183';
import './bordas.js?v=183';
import './cadeado.js?v=183';
import './tatu.js?v=183';
import './flores.js?v=183';
import './simbolos.js?v=183';
import './tabuada.js?v=183';
import './classes.js?v=183';
import './graficos.js?v=183';
import './escondida.js?v=183';
import './copia.js?v=183';
import './barcos.js?v=183';
import './giro.js?v=183';
import './hora.js?v=183';
import './somando.js?v=183';
import './descobrir.js?v=183';
import './chaves.js?v=183';
import './caminho.js?v=183';
import './policia.js?v=183';
import './pontos.js?v=183';
import './pixels.js?v=183';
import './fracoes.js?v=183';
import './escola.js?v=183';
import './usuarios.js?v=183';
import './entrada.js?v=183';
import './turmas.js?v=183';
import './alunos.js?v=183';
import './testegratis.js?v=183';
import './competicao.js?v=183';

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
