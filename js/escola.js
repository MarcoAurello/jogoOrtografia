/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Escolas: o mesmo app com o logo, as cores e o nome de cada escola (pedagociagamificada.com.br/<escola>). */

import { $, seguro } from './util.js?v=129';
import { SOM } from './som.js?v=129';
import { carregarEmails, parteProfessor, SENHA_ADMIN } from './professor.js?v=129';
import { CHAVE_RELATORIO, definirUrlRelatorio, URL_PRINCIPAL } from './relatorio.js?v=129';

// ---------- Escolas ----------
// O endereço diz a escola: pedagociagamificada.com.br/escolaExemplo (ou ?escola=escolaExemplo, para testar em outro
// endereço). A configuração da escola (nome, slogan, cores, logo e o script da planilha dela) vem daqui (as escolas que
// já vêm prontas no app) ou da aba "Escolas" da planilha principal, onde o administrador cria escolas novas pelo app
// (Área do professor com a senha de administrador). Com o script próprio, a escola tem os seus e-mails, questionários,
// competições e relatórios; sem ele, usa a planilha principal. O app instalado lembra a escola.
const ESCOLAS_PRONTAS = {
  escolaexemplo: { id: 'escolaExemplo', nome: 'Escola Exemplo', slogan: 'Aprender é uma aventura!', cor: '#2e7d32', destaque: '#ffb300',
    logo: 'assets/escolas/escola-exemplo.svg', script: '' },
};
const CHAVE_ESCOLA = 'pleno-ortografia:escola';          // a escola do app instalado
const CHAVE_CONFIGS = 'pleno-ortografia:escolas';        // cópia das configurações (para abrir sem internet)
const CHAVE_VISUAL = 'pleno-ortografia:visual';         // cores e nome de cada escola, lidos no <head> antes de desenhar a página
const CHAVE_PLANILHA = 'pleno-ortografia:planilha';      // de qual planilha são as cópias abaixo (e-mails e questionários)
const COPIAS_DA_PLANILHA = ['pleno-ortografia:emails', 'pleno-ortografia:questionarios'];
const RESERVADOS = new Set(['js', 'assets', 'icons', 'audio', 'vendor', 'docs', 'ferramentas', 'manual', 'privacidade', 'index', 'jogoortografia', 'ortografia', 'api']);
const DOMINIO = 'https://pedagociagamificada.com.br';

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
  liberarTela();
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

// configuração da escola: a cópia do aparelho na hora; depois confere com a planilha principal
async function carregarEscola(id) {
  const pronta = ESCOLAS_PRONTAS[id.toLowerCase()];
  const copias = lerJSON(CHAVE_CONFIGS, {});
  aplicarEscola(pronta || copias[id.toLowerCase()]);
  if (pronta || !URL_PRINCIPAL) { liberarTela(); return; }
  try {
    const r = await fetch(`${URL_PRINCIPAL}?acao=escola&id=${encodeURIComponent(id)}`);
    const j = await r.json();
    if (!j.ok || !j.escola) return;
    gravar(CHAVE_CONFIGS, { ...lerJSON(CHAVE_CONFIGS, {}), [id.toLowerCase()]: j.escola });
    aplicarEscola(j.escola);
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
if (ESCOLA_DO_ENDERECO) carregarEscola(ESCOLA_DO_ENDERECO);
else { conferirPlanilha(URL_PRINCIPAL); liberarTela(); }

// ---------- Administrador: criar e editar escolas (Área do professor com a senha de administrador) ----------
// link de uma escola: no domínio da plataforma, /<escola>; em outro endereço (teste), ?escola=<escola>
const linkDaEscola = (id) => (location.hostname.endsWith('pedagociagamificada.com.br') ? `${location.origin}/${id}`
  : location.hostname === 'localhost' || location.hostname.endsWith('github.io') ? `${location.origin}${location.pathname}?escola=${id}` : `${DOMINIO}/${id}`);

async function chamarAdmin(dados) {
  const r = await fetch(URL_PRINCIPAL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ chave: CHAVE_RELATORIO, senha: SENHA_ADMIN, ...dados }) });
  const j = await r.json();
  if (!j.ok) throw new Error(j.erro || 'erro');
  return j;
}
const avisoEscola = (texto, ok = false) => { $('aviso-escola').textContent = texto; $('aviso-escola').classList.toggle('aviso-ok', ok); };
const ERROS_ESCOLA = {
  endereco: 'Endereço inválido: use de 3 a 40 letras, números ou hífen, sem espaço (ex.: colegioNovo).',
  nome: 'Digite o nome da escola.',
  senha: 'A planilha não aceitou a senha de administrador: confira a SENHA_ADMIN no script do Google.',
  logo: 'O logo ficou grande demais. Use uma imagem mais simples.',
};

let escolasDaPlanilha = [];
async function abrirPainelEscolas() {
  parteProfessor('escolas');
  limparFormEscola();
  await listarEscolas();
}

async function listarEscolas() {
  const caixa = $('lista-escolas');
  caixa.innerHTML = '<p class="quiz-status carregando">Buscando as escolas…</p>';
  try { escolasDaPlanilha = (await chamarAdmin({ acao: 'escolasAdmin' })).lista || []; }
  catch (err) { escolasDaPlanilha = []; avisoEscola(ERROS_ESCOLA[String(err.message)] || 'Não deu para buscar as escolas da planilha (sem internet ou script desatualizado).'); }
  const todas = [...Object.values(ESCOLAS_PRONTAS).map((e) => ({ ...e, pronta: true })),
    ...escolasDaPlanilha.filter((e) => !ESCOLAS_PRONTAS[e.id.toLowerCase()])];
  caixa.innerHTML = '';
  for (const e of todas) {
    const item = document.createElement('div');
    item.className = 'quiz-item escola-item';
    item.style.borderLeftColor = corValida(e.cor) ? e.cor : '';
    item.innerHTML = `<img class="escola-logo-mini" src="${seguro(e.logo || 'assets/logo-pg-168.png')}" alt="">
      <span class="comp-item-texto"><span class="quiz-item-nome">${seguro(e.nome)}</span>
      <span class="quiz-item-qtd">/${seguro(e.id)}${e.pronta ? ' · já vem no app' : ''}${e.script ? ' · planilha própria' : ' · planilha principal'}</span></span>`;
    const botoes = document.createElement('span');
    botoes.className = 'comp-item-botoes';
    const botao = (txt, acao) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'quiz-link'; b.textContent = txt; b.onclick = acao; botoes.append(b); };
    botao('📋 Copiar link', async () => {
      const link = linkDaEscola(e.id);
      try { await navigator.clipboard.writeText(link); avisoEscola(`Link copiado: ${link}`, true); } catch (err) { window.prompt('Copie o link:', link); }
    });
    botao('👁️ Abrir', () => window.open(linkDaEscola(e.id), '_blank', 'noopener'));
    if (!e.pronta) botao('✏️ Editar', () => editarEscola(e));
    item.append(botoes);
    caixa.append(item);
  }
}

let logoEscolhido = '';
function limparFormEscola() {
  $('form-escola').reset();
  $('escola-id').disabled = false;
  $('escola-cor').value = '#1fa2b0';
  $('escola-destaque').value = '#f9c62b';
  logoEscolhido = '';
  $('escola-logo-previa').hidden = true;
  $('btn-escola-salvar').textContent = '🏫 Criar escola';
  avisoEscola('');
  previaEscola();
}
function editarEscola(e) {
  limparFormEscola();
  $('escola-id').value = e.id;
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
  previaEscola();
  $('form-escola').scrollIntoView({ behavior: 'smooth' });
}

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

// o logo vira uma imagem pequena (até 240 px), guardada na própria planilha
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
  const editando = $('escola-id').disabled;
  if (!editando && (ESCOLAS_PRONTAS[id.toLowerCase()] || escolasDaPlanilha.some((e) => e.id.toLowerCase() === id.toLowerCase()))) {
    avisoEscola(`Já existe uma escola com o endereço /${id}. Escolha outro ou toque em Editar.`);
    return;
  }
  avisoEscola('Salvando na planilha…');
  try {
    await chamarAdmin({ acao: 'salvarEscola', escola: { id, nome, slogan: $('escola-slogan').value.trim(), cor: $('escola-cor').value,
      destaque: $('escola-destaque').value, logo: logoEscolhido, script: $('escola-script').value.trim() } });
    SOM.certo();
    const link = linkDaEscola(id);
    limparFormEscola();
    avisoEscola(`${editando ? 'Alterações salvas' : 'Escola criada'}! Endereço: ${link} ✔`, true);
    await listarEscolas();
  } catch (err) { avisoEscola(ERROS_ESCOLA[String(err.message)] || 'Não deu para salvar (sem internet ou script desatualizado).'); }
};
$('btn-escola-limpar').onclick = () => { SOM.clique(); limparFormEscola(); };
$('btn-prof-escolas').onclick = () => { SOM.clique(); abrirPainelEscolas(); };

export { escolaAtual };
