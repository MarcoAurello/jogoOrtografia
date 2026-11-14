/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Ponto de entrada: importa todos os módulos, liga o botão de instalar o app e abre a primeira tela. */

// primeiro a proteção: fora do site oficial, ela interrompe o carregamento e nenhum jogo é ligado
import './licenca.js?v=287';
import { $ } from './util.js?v=287';
import { mostrar, telaInicio } from './telas.js?v=287';
import { carregarEmails, escolherProfessorE, JOGOS_DO_LINK, telaProfessor } from './professor.js?v=287';
import { aluno } from './estado.js?v=287';
import { JOGO_DO_LINK, QUIZ_DO_LINK, telaQuizMenu } from './quiz.js?v=287';
import { CARTAO_DO_JOGO } from './habilidades.js?v=287';
import { enviarFila } from './relatorio.js?v=287';
// cada jogo liga os próprios botões ao ser carregado
import './ortografia.js?v=287';
import './chuva.js?v=287';
import './matematica.js?v=287';
import './tiro.js?v=287';
import './peso.js?v=287';
import './quiz.js?v=287';
import './luzes.js?v=287';
import './rotina.js?v=287';
import './fichas.js?v=287';
import './cores.js?v=287';
import './lados.js?v=287';
import './setas.js?v=287';
import './vistas.js?v=287';
import './dinos.js?v=287';
import './pilhas.js?v=287';
import './blocos.js?v=287';
import './lugar.js?v=287';
import './malha.js?v=287';
import './fila.js?v=287';
import './loja.js?v=287';
import './palitos.js?v=287';
import './bordas.js?v=287';
import './cadeado.js?v=287';
import './tatu.js?v=287';
import './flores.js?v=287';
import './bichos.js?v=287';
import './intervalo.js?v=287';
import './fita.js?v=287';
import './simbolos.js?v=287';
import './conjuntos.js?v=287';
import './reino.js?v=287';
import './digestao.js?v=287';
import './respiracao.js?v=287';
import './tabuada.js?v=287';
import './classes.js?v=287';
import './graficos.js?v=287';
import './historia.js?v=287';
import './comercio.js?v=287';
import './cartografo.js?v=287';
import './bip.js?v=287';
import './escondida.js?v=287';
import './copia.js?v=287';
import './barcos.js?v=287';
import './giro.js?v=287';
import './hora.js?v=287';
import './somando.js?v=287';
import './descobrir.js?v=287';
import './chaves.js?v=287';
import './caminho.js?v=287';
import './policia.js?v=287';
import './pontos.js?v=287';
import './pixels.js?v=287';
import './fracoes.js?v=287';
import './escola.js?v=287';
import './usuarios.js?v=287';
import { telaCasa } from './entrada.js?v=287';
import './turmas.js?v=287';
import './alunos.js?v=287';
import './testegratis.js?v=287';
import { abrirCompDoLink } from './competicao.js?v=287';

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
// link do professor (?jogo=<id> ou ?q=<questionário>): a lista de jogos virou a tela inicial e a tela de entrada antiga,
// que seguia o link depois do login, não aparece mais; então o link é seguido aqui, ao abrir. Quem já entrou vai direto
// para o jogo; quem ainda não entrou só digita o primeiro nome (jogar é livre; o nome vai no relatório do professor),
// e o entrarComoAluno segue o link logo depois. O cadastro com e-mail do "Jogar grátis" é para adultos, não para o aluno.
const jogoDoLink = Object.hasOwn(JOGOS_DO_LINK, JOGO_DO_LINK || '') ? JOGOS_DO_LINK[JOGO_DO_LINK] : null;
if ((QUIZ_DO_LINK || jogoDoLink) && !aluno) mostrar('tela-login');
else if (QUIZ_DO_LINK) escolherProfessorE('Questionário da aula', telaQuizMenu);
else if (jogoDoLink) escolherProfessorE(jogoDoLink.nome, jogoDoLink.abrir);
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
// /?comp=<código>: o link de uma competição criada sem login abre direto na aba Competição (js/competicao.js)
abrirCompDoLink();
