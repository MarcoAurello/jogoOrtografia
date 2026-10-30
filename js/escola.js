/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Escolas: o mesmo app com o logo, as cores e o nome de cada escola (pedagociagamificada.com.br/<escola>). */

import { $, seguro } from './util.js?v=151';
import { SOM } from './som.js?v=151';
import { carregarEmails, parteProfessor, telaProfessor } from './professor.js?v=151';
import { definirUrlRelatorio, URL_PRINCIPAL } from './relatorio.js?v=151';
import { api, definirEscolaDoAdmin } from './api.js?v=151';
import { criarPopup, ligarFiltro } from './popup.js?v=151';

// ---------- Escolas ----------
// O endereço diz a escola: pedagociagamificada.com.br/escolaExemplo (ou ?escola=escolaExemplo, para testar em outro
// endereço). A configuração da escola (nome, slogan, cores, logo e o script da planilha dela) fica no banco de dados:
// a página /<escola> já vem do servidor com ela (window.ESCOLA_INICIAL); com ?escola= ou sem internet, o app pede à API
// ou usa a cópia do aparelho. O administrador cria e edita as escolas na Área do professor (login de administrador).
// Com o script próprio, a escola tem os seus e-mails, questionários, competições e relatórios; sem ele, usa a planilha
// principal. Escola com o teste grátis vencido (ou desativada) fica bloqueada. O app instalado lembra a escola.
const CHAVE_ESCOLA = 'pleno-ortografia:escola';          // a escola do app instalado
const CHAVE_CONFIGS = 'pleno-ortografia:escolas';        // cópia das configurações (para abrir sem internet)
const CHAVE_VISUAL = 'pleno-ortografia:visual';         // cores e nome de cada escola, lidos no <head> antes de desenhar a página
const CHAVE_PLANILHA = 'pleno-ortografia:planilha';      // de qual planilha são as cópias abaixo (e-mails e questionários)
const COPIAS_DA_PLANILHA = ['pleno-ortografia:emails', 'pleno-ortografia:questionarios'];
const RESERVADOS = new Set(['js', 'assets', 'icons', 'audio', 'vendor', 'docs', 'ferramentas', 'manual', 'privacidade', 'index', 'jogoortografia', 'ortografia', 'api']);

const lerJSON = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; } };
const gravar = (chave, valor) => { try { localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } };
const valido = (id) => /^[A-Za-z0-9_-]{3,40}$/.test(id) && !RESERVADOS.has(id.toLowerCase());

// qual escola: ?escola=..., ou o último pedaço do endereço (/escolaExemplo); no app instalado, a que ele lembra
function escolaDoEndereco() {
  const doParametro = new URLSearchParams(location.search).get('escola');
  if (doParametro && valido(doParametro)) return doParametro;
  const pedaco = location.pathname.split('/').filter(Boolean).pop() || '';
  if (valido(pedaco) && !pedaco.includes('.')) return pedaco;
  const instalado = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  if (instalado) { try { return localStorage.getItem(CHAVE_ESCOLA) || ''; } catch (e) { return ''; } }
  return '';
}

// cor mais escura (para títulos e bordas)
function escurecer(hex, f = 0.62) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function clarear(hex, f = 0.45) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * f));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
const corValida = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

let escolaAtual = null;
// a marca original fica escondida (classe posta no <head>) até a da escola entrar
const liberarTela = () => document.documentElement.classList.remove('escola-pendente');
function aplicarEscola(cfg) {
  if (!cfg) return;
  escolaAtual = cfg;
  const vars = {};
  if (corValida(cfg.cor)) {
    Object.assign(vars, { '--primaria': cfg.cor, '--primaria-escura': escurecer(cfg.cor), '--azul': cfg.cor, '--azul-claro': clarear(cfg.cor) });
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cfg.cor);
  }
  if (corValida(cfg.destaque)) vars['--amarelo'] = cfg.destaque;
  Object.entries(vars).forEach(([v, valor]) => document.documentElement.style.setProperty(v, valor));
  gravar(CHAVE_VISUAL, { ...lerJSON(CHAVE_VISUAL, {}), [cfg.id.toLowerCase()]: { vars, cor: corValida(cfg.cor) ? cfg.cor : '#1fa2b0', nome: cfg.nome } });
  if (cfg.logo) document.querySelectorAll('.topo .logo').forEach((img) => { img.src = cfg.logo; img.alt = cfg.nome; });
  document.querySelectorAll('.escola-nome').forEach((el) => { el.textContent = cfg.nome; el.hidden = false; });
  if (cfg.slogan) document.querySelectorAll('.slogan').forEach((el) => { el.textContent = cfg.slogan; });
  document.title = `${cfg.nome} — Jogos Psicopedagógicos`;
  document.body.classList.add('com-escola');
  // a planilha da escola: e-mails, questionários, competições e relatórios só dela
  conferirPlanilha(cfg.script || URL_PRINCIPAL);
  if (definirUrlRelatorio(cfg.script || URL_PRINCIPAL)) carregarEmails();
  gravar(CHAVE_ESCOLA, cfg.id);
  instalacaoDaEscola(cfg);
  mostrarBloqueio(cfg);
  liberarTela();
}

// teste grátis vencido ou escola desativada: tudo bloqueado, com o caminho para falar com a plataforma
function mostrarBloqueio(cfg) {
  document.getElementById('escola-bloqueio')?.remove();
  if (!cfg.bloqueada) return;
  const aviso = document.createElement('div');
  aviso.id = 'escola-bloqueio';
  aviso.className = 'escola-bloqueio';
  aviso.setAttribute('role', 'alertdialog');
  aviso.innerHTML = `<div class="cartao"><p class="escola-bloqueio-icone">🔒</p>
    <h2 class="chuva-pergunta">O acesso de ${seguro(cfg.nome)} está pausado</h2>
    <p>O período de teste grátis de 14 dias terminou. Para continuar usando os jogos e os relatórios, fale com a Pedagogia Gamificada.</p>
    <a class="btn-grande" href="https://wa.me/5581985503305?text=${encodeURIComponent(`Olá! Quero ativar o plano da ${cfg.nome}.`)}" target="_blank" rel="noopener">💬 Falar no WhatsApp</a></div>`;
  document.body.append(aviso);
}

// app instalado com a cara da escola: nome, ícone (o logo) e cor no Android (manifest) e no iPhone (ícone e título),
// abrindo direto no endereço da escola
async function instalacaoDaEscola(cfg) {
  const icone = async (lado) => {
    if (!cfg.logo) return '';
    const img = new Image();
    img.src = cfg.logo;
    await img.decode();
    const tela = document.createElement('canvas');
    tela.width = tela.height = lado;
    const ctx = tela.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, lado, lado);
    const caixa = lado * 0.78, escala = Math.min(caixa / img.width, caixa / img.height);
    const w = img.width * escala, h = img.height * escala;
    ctx.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
    return tela.toDataURL('image/png');
  };
  try {
    const [i180, i192, i512] = await Promise.all([icone(180), icone(192), icone(512)]);
    const inicio = location.href.split('#')[0];
    const manifesto = {
      id: inicio, name: cfg.nome, short_name: cfg.nome.length > 14 ? cfg.nome.split(' ')[0] : cfg.nome, lang: 'pt-BR',
      start_url: inicio, scope: `${location.origin}/`, display: 'standalone', orientation: 'any',
      background_color: '#eef4f6', theme_color: corValida(cfg.cor) ? cfg.cor : '#1fa2b0', categories: ['education', 'kids', 'games'],
      icons: i192 ? [{ src: i192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: i512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: i512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }]
        : [{ src: `${location.origin}/icons/icon-192.png`, sizes: '192x192', type: 'image/png' }, { src: `${location.origin}/icons/icon-512.png`, sizes: '512x512', type: 'image/png' }],
    };
    document.querySelector('link[rel="manifest"]').href = URL.createObjectURL(new Blob([JSON.stringify(manifesto)], { type: 'application/manifest+json' }));
    if (i180) document.querySelector('link[rel="apple-touch-icon"]').href = i180;
    document.querySelector('meta[name="apple-mobile-web-app-title"]').content = cfg.nome;
  } catch (e) { /* logo que não carrega: fica o ícone da plataforma */ }
}

// configuração da escola: a que veio na página (servidor); senão a cópia do aparelho na hora e depois a da API
const guardarCopia = (cfg) => gravar(CHAVE_CONFIGS, { ...lerJSON(CHAVE_CONFIGS, {}), [cfg.id.toLowerCase()]: cfg });
async function carregarEscola(id) {
  const inicial = window.ESCOLA_INICIAL;
  if (inicial && inicial.id.toLowerCase() === id.toLowerCase()) { guardarCopia(inicial); aplicarEscola(inicial); return; }
  aplicarEscola(lerJSON(CHAVE_CONFIGS, {})[id.toLowerCase()]);
  try {
    const escola = await api(`/escolas/${encodeURIComponent(id)}/marca`);
    guardarCopia(escola);
    aplicarEscola(escola);
  } catch (e) { /* sem internet: fica com a cópia */ }
  finally { liberarTela(); }   // escola que não existe (ou sem internet na 1ª vez): abre com a marca da plataforma
}

// trocou de planilha (outra escola, ou voltou para a principal): apaga as cópias da planilha anterior,
// para os e-mails e questionários de uma escola nunca aparecerem em outra
function conferirPlanilha(url) {
  let antes = '';
  try { antes = localStorage.getItem(CHAVE_PLANILHA) || ''; } catch (e) { return; }
  if (antes === url) return;
  try { COPIAS_DA_PLANILHA.forEach((k) => localStorage.removeItem(k)); localStorage.setItem(CHAVE_PLANILHA, url); } catch (e) { /* sem armazenamento */ }
}

const ESCOLA_DO_ENDERECO = escolaDoEndereco();
window.ESCOLA_ATUAL_ID = ESCOLA_DO_ENDERECO;   // os pedidos de dados (js/api.js) vão com a escola
if (ESCOLA_DO_ENDERECO) carregarEscola(ESCOLA_DO_ENDERECO);
else { conferirPlanilha(URL_PRINCIPAL); liberarTela(); }

// ---------- Administrador: criar e editar escolas (Área do professor com o login de administrador) ----------
// link de uma escola: /<escola> no próprio endereço do sistema (o nginx entende, no computador e na VPS, em qualquer
// domínio); no GitHub Pages, sem o nginx, ?escola=<escola>
const linkDaEscola = (id) => (location.hostname.endsWith('github.io')
  ? `${location.origin}${location.pathname.replace(/[^/]*$/, '')}?escola=${id}` : `${location.origin}/${id}`);

// avisos: os do formulário ficam no popup; os da lista (link copiado, plano ativado, escola criada) ficam acima da lista
const avisoEscola = (texto, ok = false) => { $('aviso-escola').textContent = texto; $('aviso-escola').classList.toggle('aviso-ok', ok); };
const avisoLista = (texto, ok = false) => { $('aviso-escolas').textContent = texto; $('aviso-escolas').classList.toggle('aviso-ok', ok); };
const ERROS_ESCOLA = {
  endereco: 'Endereço inválido: use de 3 a 40 letras, números ou hífen, sem espaço (ex.: colegioNovo).',
  nome: 'Digite o nome da escola.',
};
const dataCurta = (d) => new Date(d).toLocaleDateString('pt-BR');
// situação do plano, para o filtro: teste, ativo, bloqueada (o teste acabou) ou desativada
function situacaoChave(e) {
  if (!e.ativa) return 'desativada';
  if (e.plano === 'ativo') return 'ativo';
  return e.bloqueada ? 'bloqueada' : 'teste';
}
// situação do plano: ativo, teste (até quando) ou bloqueada
function situacao(e) {
  if (!e.ativa) return '🔒 desativada';
  if (e.plano === 'ativo') return '✅ plano ativo';
  return e.bloqueada ? `🔒 teste acabou em ${dataCurta(e.teste_ate)}` : `⏳ teste até ${dataCurta(e.teste_ate)}`;
}

let escolasDoBanco = [];
let editandoId = '';   // id (no banco) da escola em edição
async function abrirPainelEscolas() {
  parteProfessor('escolas');
  avisoLista('');
  await listarEscolas();
}

// ---------- lista com busca e filtro ----------
// a busca ignora acentos e maiúsculas e procura no nome e no endereço; os botões filtram pela situação do plano
// (cada um mostra quantas escolas tem). Tudo no aparelho, sem pedir de novo ao servidor.
const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function listarEscolas() {
  $('lista-escolas').innerHTML = '<p class="quiz-status carregando">Buscando as escolas…</p>';
  $('escolas-contagem').textContent = '';
  try { escolasDoBanco = await api('/escolas'); }
  catch (err) { escolasDoBanco = []; avisoLista(err.message); }
  desenharEscolas();
}

function desenharEscolas() {
  const caixa = $('lista-escolas');
  const busca = semAcento($('escolas-busca').value.trim());
  const daBusca = escolasDoBanco.filter((e) => !busca || semAcento(e.nome).includes(busca) || semAcento(e.slug).includes(busca));
  // a quantidade em cada opção: quantas escolas da busca atual têm aquela situação
  filtroEscolas.contar((f) => (f === 'todas' ? daBusca.length : daBusca.filter((e) => situacaoChave(e) === f).length));
  const situacaoEscolhida = filtroEscolas.valor();
  const lista = situacaoEscolhida === 'todas' ? daBusca : daBusca.filter((e) => situacaoChave(e) === situacaoEscolhida);
  const filtrando = !!busca || situacaoEscolhida !== 'todas';
  $('escolas-contagem').textContent = escolasDoBanco.length
    ? (filtrando ? `Mostrando ${lista.length} de ${escolasDoBanco.length} escolas` : `${escolasDoBanco.length} ${escolasDoBanco.length === 1 ? 'escola' : 'escolas'}`) : '';
  caixa.innerHTML = '';
  if (!escolasDoBanco.length) {
    caixa.innerHTML = '<p class="quiz-status">Nenhuma escola ainda. Toque em <b>＋ Nova escola</b> para criar a primeira.</p>';
    return;
  }
  if (!lista.length) {
    caixa.innerHTML = '<p class="quiz-status">Nenhuma escola com esse filtro.</p>';
    const limpar = document.createElement('button');
    limpar.type = 'button';
    limpar.className = 'btn-sec btn-pequeno adm-limpar-filtro';
    limpar.textContent = 'Limpar filtros';
    limpar.onclick = () => { SOM.clique(); limparFiltros(); };
    caixa.append(limpar);
    return;
  }
  for (const e of lista) {
    const item = document.createElement('div');
    item.className = 'quiz-item escola-item';
    item.style.borderLeftColor = corValida(e.cor) ? e.cor : '';
    item.innerHTML = `<img class="escola-logo-mini" src="${seguro(e.logo || 'assets/logo-pg-168.png')}" alt="">
      <span class="comp-item-texto"><span class="quiz-item-nome">${seguro(e.nome)}</span>
      <span class="quiz-item-qtd">/${seguro(e.slug)} · ${situacao(e)} · ${e.usuarios} ${e.usuarios === 1 ? 'usuário' : 'usuários'}${e.script ? ' · planilha própria' : ' · planilha principal'}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    // o administrador entra na escola e faz tudo como a coordenação dela (turmas, professores, competições...)
    botao('🚪 Entrar na escola', () => { SOM.clique(); definirEscolaDoAdmin(e.id); telaProfessor(); });
    botao('📋 Copiar link', async () => {
      const link = linkDaEscola(e.slug);
      try { await navigator.clipboard.writeText(link); avisoLista(`Link copiado: ${link}`, true); } catch (err) { window.prompt('Copie o link:', link); }
    });
    botao('👁️ Abrir', () => window.open(linkDaEscola(e.slug), '_blank', 'noopener'));
    botao('✏️ Editar', (ev) => { SOM.clique(); abrirModalEscola(e, ev.currentTarget); });
    if (e.plano === 'teste') {
      botao('✅ Ativar plano', () => mudarPlano(e, { plano: 'ativo', ativa: true }, `${e.nome} com o plano ativo.`));
      botao('⏳ +14 dias', () => mudarPlano(e, { teste_ate: new Date(Math.max(Date.now(), new Date(e.teste_ate).getTime()) + 14 * 864e5).toISOString(), ativa: true },
        `Teste de ${e.nome} estendido por mais 14 dias.`));
    }
    botao(e.ativa ? '⏸️ Desativar' : '▶️ Reativar', () => {
      if (e.ativa && !window.confirm(`Desativar "${e.nome}"? A escola, os professores e os alunos dela ficam sem acesso até você reativar.`)) return;
      mudarPlano(e, { ativa: !e.ativa }, e.ativa ? `${e.nome} desativada.` : `${e.nome} reativada.`);
    });
    item.append(botoes);
    caixa.append(item);
  }
}

const filtroEscolas = ligarFiltro('escolas-chips', () => { SOM.clique(); desenharEscolas(); });
function limparFiltros() { $('escolas-busca').value = ''; filtroEscolas.escolher('todas'); desenharEscolas(); $('escolas-busca').focus(); }
let esperaBusca = 0;
$('escolas-busca').addEventListener('input', () => { clearTimeout(esperaBusca); esperaBusca = setTimeout(desenharEscolas, 150); });

async function mudarPlano(e, dados, mensagem) {
  SOM.clique();
  try { await api(`/escolas/${e.id}`, { metodo: 'PUT', corpo: dados }); avisoLista(`${mensagem} ✔`, true); await listarEscolas(); }
  catch (err) { avisoLista(err.message); SOM.errado(); }
}

let logoEscolhido = '';
function limparFormEscola() {
  $('form-escola').reset();
  editandoId = '';
  $('escola-id').disabled = false;
  $('escola-cor').value = '#1fa2b0';
  $('escola-destaque').value = '#f9c62b';
  logoEscolhido = '';
  $('escola-logo-previa').hidden = true;
  $('btn-escola-salvar').textContent = '🏫 Criar escola';
  $('escola-modal-titulo').textContent = '🏫 Nova escola';
  avisoEscola('');
  previaEscola();
}
function editarEscola(e) {
  limparFormEscola();
  editandoId = e.id;
  $('escola-id').value = e.slug;
  $('escola-id').disabled = true;   // o endereço não muda (os links já foram mandados)
  $('escola-nome').value = e.nome;
  $('escola-slogan').value = e.slogan || '';
  if (corValida(e.cor)) $('escola-cor').value = e.cor;
  if (corValida(e.destaque)) $('escola-destaque').value = e.destaque;
  $('escola-script').value = e.script || '';
  logoEscolhido = e.logo || '';
  $('escola-logo-previa').src = logoEscolhido;
  $('escola-logo-previa').hidden = !logoEscolhido;
  $('btn-escola-salvar').textContent = '💾 Salvar alterações';
  $('escola-modal-titulo').textContent = `✏️ Editar ${e.nome}`;
  previaEscola();
}

// ---------- popup de criar / editar (js/popup.js) ----------
const popupEscola = criarPopup('escola-modal', { fechar: ['btn-escola-fechar', 'btn-escola-cancelar'] });
function abrirModalEscola(escola = null, origem = null) {
  if (escola) editarEscola(escola); else limparFormEscola();
  popupEscola.abrir(origem, escola ? 'escola-nome' : 'escola-id');
}
const fecharModalEscola = () => popupEscola.fechar();
$('btn-escola-nova').onclick = (ev) => { SOM.clique(); abrirModalEscola(null, ev.currentTarget); };

// prévia: a barra do topo com o logo, o nome e as cores escolhidas
function previaEscola() {
  const cor = $('escola-cor').value, destaque = $('escola-destaque').value;
  $('escola-previa').style.setProperty('--cor', cor);
  $('escola-previa').style.setProperty('--destaque', destaque);
  $('escola-previa-logo').src = logoEscolhido || 'assets/logo-pg-168.png';
  $('escola-previa-nome').textContent = $('escola-nome').value.trim() || 'Nome da escola';
  $('escola-previa-slogan').textContent = $('escola-slogan').value.trim() || 'Jogos com relatórios de desempenho';
}
['escola-nome', 'escola-slogan', 'escola-cor', 'escola-destaque'].forEach((id) => { $(id).addEventListener('input', previaEscola); });

// o logo vira uma imagem pequena (até 240 px), guardada no banco de dados
$('escola-logo').onchange = () => {
  const arq = $('escola-logo').files[0];
  if (!arq) return;
  const leitor = new FileReader();
  leitor.onload = () => {
    const img = new Image();
    img.onload = () => {
      const lado = 240, escala = Math.min(1, lado / Math.max(img.width, img.height));
      const tela = document.createElement('canvas');
      tela.width = Math.round(img.width * escala);
      tela.height = Math.round(img.height * escala);
      tela.getContext('2d').drawImage(img, 0, 0, tela.width, tela.height);
      logoEscolhido = tela.toDataURL('image/png');
      if (logoEscolhido.length > 45000) logoEscolhido = tela.toDataURL('image/webp', 0.85);
      if (logoEscolhido.length > 45000) logoEscolhido = tela.toDataURL('image/jpeg', 0.8);
      $('escola-logo-previa').src = logoEscolhido;
      $('escola-logo-previa').hidden = false;
      previaEscola();
    };
    img.src = leitor.result;
  };
  leitor.readAsDataURL(arq);
};

$('form-escola').onsubmit = async (ev) => {
  ev.preventDefault();
  const id = $('escola-id').value.trim();
  const nome = $('escola-nome').value.trim();
  if (!valido(id)) { avisoEscola(ERROS_ESCOLA.endereco); return; }
  if (!nome) { avisoEscola(ERROS_ESCOLA.nome); return; }
  const editando = !!editandoId;
  avisoEscola('Salvando…');
  try {
    const dados = { nome, slogan: $('escola-slogan').value.trim(), cor: $('escola-cor').value, destaque: $('escola-destaque').value,
      logo: logoEscolhido, script: $('escola-script').value.trim() };
    if (editando) await api(`/escolas/${editandoId}`, { metodo: 'PUT', corpo: dados });
    else await api('/escolas', { metodo: 'POST', corpo: { ...dados, slug: id } });
    SOM.certo();
    const link = linkDaEscola(id);
    fecharModalEscola();
    avisoLista(`${editando ? 'Alterações salvas' : 'Escola criada, com 14 dias de teste grátis'}! Endereço: ${link} ✔`, true);
    await listarEscolas();
  } catch (err) { avisoEscola(err.message); SOM.errado(); }
};
$('btn-prof-escolas').onclick = () => { SOM.clique(); abrirPainelEscolas(); };

// importar da planilha do Google: escolas, e-mails, questionários e competições que ainda não estão no banco
$('btn-importar-planilha').onclick = async () => {
  SOM.clique();
  const aviso = $('aviso-importar');
  aviso.classList.remove('aviso-ok');
  aviso.textContent = 'Importando da planilha… (pode levar um minuto)';
  $('btn-importar-planilha').disabled = true;
  try {
    const r = await api('/admin/importar-planilha', { metodo: 'POST', corpo: {} });
    const linhas = r.resumos.map((x) => `${x.origem}: ${x.emails} e-mails, ${x.questionarios} questionários, ${x.competicoes} competições (${x.participacoes} no ranking)${
      x.erros.length ? ` · avisos: ${x.erros.join('; ')}` : ''}`);
    aviso.textContent = `✔ ${r.escolasNovas.length ? `Escolas novas: ${r.escolasNovas.join(', ')}. ` : ''}${linhas.join(' | ')}${r.erros.length ? ` · ${r.erros.join('; ')}` : ''}`;
    aviso.classList.add('aviso-ok');
    SOM.certo();
    await listarEscolas();
  } catch (err) { aviso.textContent = err.message; SOM.errado(); }
  finally { $('btn-importar-planilha').disabled = false; }
};

export { escolaAtual };
