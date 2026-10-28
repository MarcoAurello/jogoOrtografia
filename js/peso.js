/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Peso Certo (medidas de massa). */

import { $, embaralhar, sortear } from './util.js?v=124';
import { aluno, definirMissao, definirResultados, missao, resultados } from './estado.js?v=124';
import { SOM, tocar } from './som.js?v=124';
import { mascote, mostrar, telaJogos } from './telas.js?v=124';
import { escolherProfessorE } from './professor.js?v=124';
import { entre } from './matematica.js?v=124';
import { fimDaMissao } from './relatorio.js?v=124';

// ---------- Peso Certo ----------
// Balança de dois pratos: o objeto fica no prato da esquerda e o aluno coloca pesos (em unidades diferentes)
// no prato da direita e toca em "Testar": até lá a balança fica travada e reta, sem dar pista.
// No teste ela destrava: equilibrou, acertou; faltou ou passou, perde 1 vida e pode ajustar os pesos e testar de novo.
// 10 objetos ou até acabarem as 3 vidas.
const PESO = { OBJETOS: 10, VIDAS: 3 };
const FATOR = { kg: 1e6, hg: 1e5, dag: 1e4, g: 1e3, dg: 100, cg: 10, mg: 1 };   // tudo em miligramas
const ORDEM_UNIDADES = ['kg', 'hg', 'dag', 'g', 'dg', 'cg', 'mg'];
const NOMES_OBJETO = ['Saco de arroz', 'Melancia', 'Abóbora', 'Pacote de feijão', 'Maçã', 'Queijo', 'Pão', 'Banana',
  'Clipe', 'Remédio', 'Botão', 'Grão de feijão'];
const NIVEIS_PESO = [
  { id: 'facil', titulo: 'Fácil', unidades: 'kg e g', base: 'g', objetos: [0, 1, 2, 3],
    alvos: () => [{ v: sortear([1, 1.5, 2, 2.5, 3, 4, 5]) * 1e6, u: 'kg' }],
    pesos: [['kg', 1], ['kg', 2], ['g', 500], ['g', 250], ['g', 200], ['g', 100]] },
  { id: 'medio', titulo: 'Médio', unidades: 'g, dag e hg', base: 'g', objetos: [4, 5, 6, 7],
    alvos: () => { const g = sortear([150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 750, 800]);
      return [{ v: g * 1e3, u: g % 100 === 0 && Math.random() < 0.5 ? 'hg' : 'g' }]; },
    pesos: [['hg', 1], ['hg', 2], ['hg', 5], ['dag', 1], ['dag', 2], ['dag', 5], ['g', 10], ['g', 20], ['g', 50]] },
  { id: 'dificil', titulo: 'Difícil', unidades: 'mg, cg e dg', base: 'mg', objetos: [8, 9, 10, 11],
    alvos: () => { const mg = sortear([50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500, 600, 750, 800]);
      return [{ v: mg, u: mg % 100 === 0 && Math.random() < 0.35 ? 'g' : 'mg' }]; },   // às vezes em g com vírgula (0,5 g)
    pesos: [['dg', 1], ['dg', 2], ['dg', 5], ['cg', 1], ['cg', 2], ['cg', 5], ['mg', 10], ['mg', 20], ['mg', 50]] },
];
const CATEGORIAS_PESO = {
  kg: { id: 'p-kg', titulo: 'Objetos em quilogramas (kg)', icone: '🍉', cor: '#1fa2b0',
    regra: '1 <b>kg</b> = 1000 <b>g</b>. Meio quilo (0,5 kg) são 500 g. Junte os pesos em gramas até chegar a 1000 g para cada kg.' },
  g: { id: 'p-g', titulo: 'Objetos em gramas (g)', icone: '🍎', cor: '#e0a100',
    regra: '1 <b>hg</b> = 100 g e 1 <b>dag</b> = 10 g. Transforme todos os pesos em gramas e some até dar o peso do objeto.' },
  hg: { id: 'p-hg', titulo: 'Objetos em hectogramas (hg)', icone: '🧀', cor: '#2e7d32',
    regra: '1 <b>hg</b> = 100 g. Um objeto de 3 hg pesa 300 g: dá para equilibrar com pesos em g, dag ou hg.' },
  mg: { id: 'p-mg', titulo: 'Objetos em miligramas (mg)', icone: '💊', cor: '#e53935',
    regra: '1 <b>dg</b> = 100 mg e 1 <b>cg</b> = 10 mg. Transforme tudo em miligramas e some.' },
  gdec: { id: 'p-gdec', titulo: 'Gramas com vírgula (0,5 g)', icone: '📎', cor: '#7b4fc9',
    regra: '1 g = 1000 mg, então <b>0,5 g</b> = 500 mg e <b>0,25 g</b> = 250 mg. Passe para miligramas antes de somar.' },
};
const SPRITES_PESO = {};
for (const nome of ['base', 'travessao', 'prato', 'pesos', 'objetos']) {
  SPRITES_PESO[nome] = new Image();
  SPRITES_PESO[nome].src = `assets/balanca/${nome}.png`;
}
let pesoNivel = 0;
let peso = null;   // a partida em andamento

const numeroBR = (n) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const comUnidade = (mg, u) => `${numeroBR(mg / FATOR[u])} ${u}`;

// estoque com pelo menos uma combinação exata (2 a 4 pesos) e outros pesos que sobram
function montarEstoque(alvo, nivel) {
  const tipos = nivel.pesos.map(([u, n]) => ({ u, v: n * FATOR[u] }));
  let solucao = null;
  for (let tentativa = 0; tentativa < 300 && !solucao; tentativa++) {
    const pecas = [];
    let resto = alvo;
    while (resto > 0 && pecas.length < 4) {
      const cabem = tipos.filter((t) => t.v <= resto && t.v < alvo);
      if (!cabem.length) break;
      const t = sortear(cabem.filter((x) => x.v * 4 >= resto).length ? cabem.filter((x) => x.v * 4 >= resto) : cabem);
      pecas.push(t);
      resto -= t.v;
    }
    if (resto === 0 && pecas.length >= 2) solucao = pecas;
  }
  if (!solucao) {   // garantia: maiores pesos que cabem, sem repetir o próprio alvo
    solucao = [];
    let resto = alvo;
    for (const t of [...tipos].sort((x, y) => y.v - x.v)) while (t.v < alvo && t.v <= resto) { solucao.push(t); resto -= t.v; }
  }
  const total = entre(6, 8);
  // os que sobram nunca valem o objeto inteiro (senão um peso só resolveria)
  const extras = Array.from({ length: Math.max(0, total - solucao.length) }, () => sortear(tipos.filter((t) => t.v < alvo)));
  return embaralhar([...solucao, ...extras]).map((t, i) => ({ id: i, u: t.u, v: t.v, rotulo: comUnidade(t.v, t.u) }));
}

function telaPesoMenu() {
  pararPeso();
  mascote('davi-peso', 'oi');
  $('peso-niveis').innerHTML = NIVEIS_PESO.map((n, i) =>
    `<button class="chuva-modo${i === pesoNivel ? ' ativo' : ''}" type="button" data-nivel="${i}">${n.titulo}<small>${n.unidades}</small></button>`).join('');
  mostrar('tela-peso-menu');
}
$('peso-niveis').onclick = (e) => {
  const b = e.target.closest('.chuva-modo'); if (!b) return;
  SOM.clique();
  pesoNivel = Number(b.dataset.nivel);
  document.querySelectorAll('#peso-niveis .chuva-modo').forEach((x) => x.classList.toggle('ativo', x === b));
};

function comecarPeso() {
  pararPeso();
  const nivel = NIVEIS_PESO[pesoNivel];
  definirMissao({ id: 'peso-' + nivel.id, peso: true, icone: '⚖️', cor: '#e0a100', titulo: `Peso Certo (${nivel.titulo}: ${nivel.unidades})` });
  definirResultados([]);
  peso = { nivel, vidas: PESO.VIDAS, pontos: 0, feitos: 0, equilibrados: 0, tabela: 0, inclinacao: 0.3, rodando: true,
    objeto: null, t: 0, ultimo: performance.now(), particulas: [] };
  $('peso-nivel').textContent = `⚖️ ${nivel.titulo} · ${nivel.unidades}`;
  mostrar('tela-peso');
  novoObjeto();
  requestAnimationFrame(quadroPeso);
}

function pararPeso() {
  if (peso) peso.rodando = false;
  peso = null;
  $('peso-tabela').hidden = true;
}

function hudPeso() {
  $('peso-pontos').textContent = peso.pontos;
  $('peso-vidas').textContent = '❤️'.repeat(peso.vidas) + '🤍'.repeat(PESO.VIDAS - peso.vidas);
  $('peso-vidas').setAttribute('aria-label', `${peso.vidas} vidas`);
  $('peso-contador').textContent = `Objeto ${peso.feitos} de ${PESO.OBJETOS}`;
}

function novoObjeto() {
  if (!peso || !peso.rodando) return;
  if (peso.feitos >= PESO.OBJETOS) { terminarPeso('fim'); return; }
  const nivel = peso.nivel;
  const [alvo] = nivel.alvos();
  const indice = sortear(nivel.objetos);
  peso.feitos++;
  peso.objeto = { indice, nome: NOMES_OBJETO[indice], alvo: alvo.v, u: alvo.u, rotulo: comUnidade(alvo.v, alvo.u),
    estoque: montarEstoque(alvo.v, nivel), prato: [], erros: [], resolvido: false };
  $('btn-peso-proximo').hidden = true;
  peso.testando = false;
  msgPeso(`${peso.objeto.nome}: <b>${peso.objeto.rotulo}</b>. Coloque os pesos que você acha certos e toque em <b>Testar</b>!`);
  desenharListasPeso();
  hudPeso();
}

function msgPeso(html, classe = '') {
  $('peso-msg').innerHTML = html;
  $('peso-msg').className = 'peso-msg' + (classe ? ' ' + classe : '');
}

const somaPrato = () => peso.objeto.prato.reduce((s, p) => s + p.v, 0);

// o tamanho do peso acompanha o quanto ele pesa (escala logarítmica dentro do nível: o menor ainda aparece bem)
function escalaPeso(v) {
  const valores = peso.nivel.pesos.map(([u, n]) => n * FATOR[u]);
  const min = Math.min(...valores), max = Math.max(...valores);
  return 0.4 + 0.6 * (Math.log(v / min) / Math.log(max / min || 2));
}

// o peso em si não tem número: o valor fica na plaquinha da prateleira (e na lista do prato)
function botaoPeso(p, comRotulo) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'peso-btn' + (comRotulo ? '' : ' so-peso');
  const e = escalaPeso(p.v);
  b.innerHTML = `<span class="peso-sprite" style="background-position-x:${(ORDEM_UNIDADES.indexOf(p.u) / 6) * 100}%;`
    + `width:${Math.round(40 * e)}px;height:${Math.round(43 * e)}px"></span>${comRotulo ? p.rotulo : ''}`;
  b.setAttribute('aria-label', p.rotulo);
  return b;
}

function desenharListasPeso() {
  const o = peso.objeto;
  const naBalanca = new Set(o.prato.map((p) => p.id));
  // prateleiras: uma para cada valor (do maior para o menor), com os pesos em pé e a plaquinha do valor
  const grupos = new Map();
  for (const p of o.estoque) {
    if (!grupos.has(p.rotulo)) grupos.set(p.rotulo, { v: p.v, rotulo: p.rotulo, pesos: [] });
    if (!naBalanca.has(p.id)) grupos.get(p.rotulo).pesos.push(p);
  }
  $('peso-estoque').innerHTML = '';
  for (const grupo of [...grupos.values()].sort((x, y) => y.v - x.v)) {
    const prat = document.createElement('div');
    prat.className = 'prateleira' + (grupo.pesos.length ? '' : ' vazia');
    const pesos = document.createElement('div');
    pesos.className = 'prateleira-pesos';
    for (const p of grupo.pesos) {
      const b = botaoPeso(p, false);
      ligarArraste(b, p);
      pesos.append(b);
    }
    prat.append(pesos);
    prat.insertAdjacentHTML('beforeend', `<div class="prateleira-tabua"><span class="prateleira-placa">${grupo.rotulo}</span></div>`);
    $('peso-estoque').append(prat);
  }
  $('btn-peso-testar').hidden = !o.prato.length || o.resolvido || peso.travado;
  $('peso-prato').innerHTML = '';
  for (const p of o.prato) {
    const b = botaoPeso(p, true);
    b.onclick = () => tirarPeso(p);
    $('peso-prato').append(b);
  }
}

// tocar coloca o peso; arrastar até a balança também (o clique depois de arrastar é ignorado)
function ligarArraste(botao, p) {
  let inicio = null, fantasma = null, arrastou = false;
  botao.onpointerdown = (e) => { inicio = { x: e.clientX, y: e.clientY }; arrastou = false; botao.setPointerCapture(e.pointerId); };
  botao.onpointermove = (e) => {
    if (!inicio) return;
    if (!fantasma && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 8) {
      arrastou = true;
      fantasma = botao.cloneNode(true);
      fantasma.classList.add('peso-fantasma');
      document.body.append(fantasma);
    }
    if (fantasma) {
      fantasma.style.left = `${e.clientX}px`;
      fantasma.style.top = `${e.clientY}px`;
      const r = $('peso-arena').getBoundingClientRect();
      $('peso-arena').classList.toggle('alvo-drop', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom);
    }
  };
  botao.onpointerup = (e) => {
    if (fantasma) {
      const r = $('peso-arena').getBoundingClientRect();
      fantasma.remove();
      fantasma = null;
      $('peso-arena').classList.remove('alvo-drop');
      if (e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) colocarPeso(p);
    }
    inicio = null;
  };
  botao.onpointercancel = () => { if (fantasma) fantasma.remove(); fantasma = null; inicio = null; $('peso-arena').classList.remove('alvo-drop'); };
  botao.onclick = () => { if (!arrastou) colocarPeso(p); arrastou = false; };
}

function colocarPeso(p) {
  const o = peso && peso.objeto;
  if (!o || o.resolvido || peso.travado || o.prato.some((x) => x.id === p.id)) return;
  o.prato.push(p);
  tocar([[520, 0.06], [390, 0.08]]);
  desenharListasPeso();
  msgPeso('Quando achar que está certo, toque em <b>⚖️ Testar</b>.');
}

// destrava a balança e mostra o resultado
function testarPeso() {
  const o = peso && peso.objeto;
  if (!o || o.resolvido || peso.travado || !o.prato.length) return;
  peso.testando = true;
  $('btn-peso-testar').hidden = true;
  const soma = somaPrato();
  if (soma === o.alvo) equilibrou();
  else errouTeste(soma < o.alvo ? 'faltou' : 'passou');
}

function tirarPeso(p) {
  const o = peso && peso.objeto;
  if (!o || o.resolvido || peso.travado) return;
  o.prato = o.prato.filter((x) => x.id !== p.id);
  SOM.clique();
  desenharListasPeso();
  msgPeso('Peso tirado. Ajuste e toque em <b>⚖️ Testar</b>.');
}

function equilibrou() {
  const o = peso.objeto;
  o.resolvido = true;
  $('btn-peso-testar').hidden = true;
  peso.equilibrados++;
  const ganhou = 100 + (o.erros.length ? 0 : 50) + peso.vidas * 10;
  peso.pontos += ganhou;
  const base = peso.nivel.base;
  const partes = o.prato.map((p) => p.rotulo).join(' + ');
  const emBase = comUnidade(o.alvo, base);
  const conta = o.u === base ? `${partes} = ${emBase}` : `${partes} = ${emBase} = ${o.rotulo}`;
  msgPeso(`⚖️ Equilibrou! ${conta} <span class="peso-ganho">+${ganhou}</span>`, 'certo');
  resultados.push({ m: categoriaDoObjeto(o), certa: `${o.nome}: ${o.rotulo}`, erros: o.erros.slice() });
  $('peso-arena').classList.add('certo');
  for (let i = 0; i < 40; i++) {
    peso.particulas.push({ x: 0.5, y: 0.35, vx: (Math.random() - 0.5) * 0.9, vy: -Math.random() * 0.8 - 0.2, cor: sortear(['#f9c62b', '#1fa2b0', '#e53935', '#2e9e5b', '#ffffff']), vida: 1 });
  }
  SOM.vitoria();
  hudPeso();
  $('btn-peso-proximo').textContent = peso.feitos >= PESO.OBJETOS ? 'Ver resultado ⭐' : 'Próximo objeto ➜';
  $('btn-peso-proximo').hidden = false;
}

function errouTeste(tipo) {
  const o = peso.objeto;
  o.erros.push(`${o.prato.map((p) => p.rotulo).join(' + ')} (${tipo === 'faltou' ? 'faltou para' : 'passou de'} ${o.rotulo})`);
  peso.vidas--;
  peso.travado = true;
  msgPeso(tipo === 'faltou'
    ? 'Errou: faltou peso! ⬅️ A balança pendeu para o objeto. Perdeu uma vida.'
    : 'Errou: passou do ponto! ➡️ A balança pendeu para os pesos. Perdeu uma vida.', 'erro');
  $('peso-arena').classList.remove('erro');
  void $('peso-arena').offsetWidth;
  $('peso-arena').classList.add('erro');
  SOM.errado();
  hudPeso();
  const rodada = peso;
  setTimeout(() => {
    if (peso !== rodada) return;
    $('peso-arena').classList.remove('erro');
    if (peso.vidas <= 0) {
      resultados.push({ m: categoriaDoObjeto(o), certa: `${o.nome}: ${o.rotulo}`, erros: [...o.erros, 'não equilibrou'] });
      o.resolvido = true;
      terminarPeso('vidas');
      return;
    }
    // trava de novo: os pesos continuam no prato para o aluno ajustar e testar outra vez
    peso.travado = false;
    peso.testando = false;
    desenharListasPeso();
    msgPeso('A balança travou de novo. Ajuste os pesos e teste outra vez!');
  }, 1800);
}

function categoriaDoObjeto(o) {
  if (o.u === 'g' && o.alvo < 1000) return CATEGORIAS_PESO.gdec;
  return CATEGORIAS_PESO[o.u] || CATEGORIAS_PESO.g;
}

function terminarPeso(motivo) {
  const { equilibrados, feitos, pontos, tabela } = peso;
  pararPeso();
  missao.extra = tabela ? `Usou a tabela de conversão ${tabela} ${tabela === 1 ? 'vez' : 'vezes'}.` : 'Não usou a tabela de conversão.';
  fimDaMissao();
  $('fim-titulo').textContent = motivo === 'vidas' ? 'Acabaram as vidas!' : equilibrados === feitos ? 'Equilíbrio perfeito!' : 'Fim da balança!';
  $('fim-texto').textContent = `${aluno}, você equilibrou ${equilibrados} de ${feitos} objetos e fez ${pontos} pontos!`;
}

// ----- desenho da balança -----
function quadroPeso(agora) {
  if (!peso || !peso.rodando) return;
  const dt = Math.min(0.05, (agora - peso.ultimo) / 1000);
  peso.ultimo = agora;
  peso.t += dt;
  // inclinação: positiva = prato da esquerda (objeto) mais pesado
  const o = peso.objeto;
  let alvoInc = 0;   // travada e reta enquanto o aluno monta a combinação
  if (o && (peso.testando || o.resolvido)) {
    const soma = somaPrato();
    alvoInc = soma === o.alvo ? 0 : soma < o.alvo ? 0.32 * Math.min(1, (o.alvo - soma) / o.alvo * 1.5 + 0.15) : -0.32 * Math.min(1, (soma - o.alvo) / o.alvo * 1.5 + 0.25);
  }
  peso.inclinacao += (alvoInc - peso.inclinacao) * Math.min(1, dt * 5);
  peso.particulas = peso.particulas.filter((p) => p.vida > 0);
  for (const p of peso.particulas) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1.2 * dt; p.vida -= dt * 0.7; }
  desenharPeso();
  requestAnimationFrame(quadroPeso);
}

function desenharPeso() {
  const cv = $('peso-canvas');
  const W = cv.clientWidth || 400, H = W * 0.75;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const g = cv.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, W, H);
  const k = W / 220;
  const S = SPRITES_PESO;
  const o = peso.objeto;
  const pronto = (img) => img.complete && img.naturalWidth;
  const cx = W / 2, cy = H * 0.6;
  const a = -peso.inclinacao;   // rotação do travessão no canvas
  const meio = 60.5 * k;        // distância do eixo até a articulação de cada ponta
  const ponta = (lado) => ({ x: cx + Math.cos(a) * meio * lado, y: cy + Math.sin(a) * meio * lado });

  // sombra no chão, suporte e travessão girando no eixo
  g.fillStyle = 'rgba(19, 60, 80, 0.10)';
  g.beginPath(); g.ellipse(cx, cy + 38 * k, 26 * k, 4 * k, 0, 0, Math.PI * 2); g.fill();
  // travada: dois calços listrados (amarelo e preto) segurando o travessão reto
  const travada = o && !peso.testando && !o.resolvido;
  const mostraTrava = travada && Math.abs(peso.inclinacao) < 0.03;   // só depois que o travessão voltou a ficar reto
  if (mostraTrava) {
    for (const lado of [-1, 1]) {
      const x0 = cx + lado * 52 * k - 5 * k, y0 = cy + 4 * k, alt = 34 * k, larg = 10 * k;
      g.save();
      g.beginPath(); g.rect(x0, y0, larg, alt); g.clip();
      g.fillStyle = '#f9c62b'; g.fillRect(x0, y0, larg, alt);
      g.fillStyle = '#22364a';
      for (let s = -larg; s < alt; s += 7 * k) {
        g.beginPath(); g.moveTo(x0, y0 + s); g.lineTo(x0 + larg, y0 + s - larg); g.lineTo(x0 + larg, y0 + s - larg + 3.5 * k); g.lineTo(x0, y0 + s + 3.5 * k); g.fill();
      }
      g.restore();
      g.strokeStyle = '#22364a'; g.lineWidth = 2; g.strokeRect(x0, y0, larg, alt);
    }
  }
  if (pronto(S.base)) g.drawImage(S.base, cx - 19.5 * k, cy - 8 * k, 40 * k, 46 * k);
  if (pronto(S.travessao)) {
    g.save(); g.translate(cx, cy); g.rotate(a);
    g.drawImage(S.travessao, -65.5 * k, -5.5 * k, 132 * k, 12 * k);
    g.restore();
  }

  // pratos apoiados nas pontas (ficam sempre na horizontal) e o que está em cima deles
  for (const lado of [-1, 1]) {
    const p = ponta(lado);
    const topo = p.y - 19 * k;   // a haste do prato encaixa na articulação
    if (pronto(S.prato)) g.drawImage(S.prato, p.x - 32 * k, topo, 64 * k, 20 * k);
    if (lado === -1 && o && pronto(S.objetos)) {
      const tam = 34 * k;
      g.drawImage(S.objetos, o.indice * 36, 0, 36, 36, p.x - tam / 2, topo + 7 * k - tam, tam, tam);
      // etiqueta com o peso do objeto, em cima dele
      g.font = `800 ${Math.round(12 * k)}px Nunito, Arial, sans-serif`;
      const tw = g.measureText(o.rotulo).width + 14 * k;
      const ey = topo + 7 * k - tam - 12 * k;
      g.fillStyle = '#ffffff'; g.strokeStyle = '#1fa2b0'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(p.x - tw / 2, ey - 9 * k, tw, 18 * k, 5 * k); g.fill(); g.stroke();
      g.fillStyle = '#22364a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(o.rotulo, p.x, ey);
    }
    if (lado === 1 && o && pronto(S.pesos)) {
      // fileiras de pesos (do maior para o menor) que cabem na largura do prato
      const largura = 58 * k;
      const tamanhos = o.prato.map((q) => { const tw = 22 * k * escalaPeso(q.v); return { q, tw, th: tw * 30 / 28 }; })
        .sort((x, y) => y.tw - x.tw);
      const fileiras = [];
      for (const t of tamanhos) {
        const f = fileiras[fileiras.length - 1];
        if (f && f.w + t.tw <= largura) { f.itens.push(t); f.w += t.tw; } else fileiras.push({ itens: [t], w: t.tw });
      }
      let base = topo + 6 * k;
      for (const f of fileiras) {
        let x = p.x - f.w / 2;
        const alt = Math.max(...f.itens.map((t) => t.th));
        for (const t of f.itens) {
          g.drawImage(S.pesos, ORDEM_UNIDADES.indexOf(t.q.u) * 28, 0, 28, 30, x, base - t.th, t.tw, t.th);
          x += t.tw;
        }
        base -= alt;
      }
    }
  }

  // travada: cadeado grande no eixo e faixa no alto; no teste, o ponteiro fica verde e de pé quando equilibra
  if (mostraTrava) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${Math.round(24 * k)}px sans-serif`;
    g.fillText('🔒', cx, cy - 20 * k);
    const texto = '🔒 Balança travada · toque em Testar';
    g.font = `800 ${Math.round(10 * k)}px Nunito, Arial, sans-serif`;
    const tw = g.measureText(texto).width + 16 * k;
    g.fillStyle = 'rgba(34, 54, 74, 0.88)';
    g.beginPath(); g.roundRect(cx - tw / 2, 5 * k, tw, 16 * k, 8 * k); g.fill();
    g.fillStyle = '#ffffff'; g.fillText(texto, cx, 13 * k);
  }
  g.save(); g.translate(cx, cy); g.rotate(a);
  g.fillStyle = travada ? 'rgba(0, 0, 0, 0)' : Math.abs(peso.inclinacao) < 0.01 ? '#2e9e5b' : '#e53935';
  g.beginPath(); g.moveTo(-3 * k, -7 * k); g.lineTo(3 * k, -7 * k); g.lineTo(0, -24 * k); g.closePath(); g.fill();
  g.restore();

  // confete do equilíbrio
  for (const p of peso.particulas) {
    g.globalAlpha = Math.max(0, p.vida);
    g.fillStyle = p.cor;
    g.fillRect(p.x * W, p.y * H, 4 * k, 4 * k);
  }
  g.globalAlpha = 1;
}

$('btn-tabela').onclick = () => { if (!peso) return; peso.tabela++; SOM.clique(); $('peso-tabela').hidden = false; };
$('btn-tabela-fechar').onclick = () => { $('peso-tabela').hidden = true; };
$('peso-tabela').onclick = (e) => { if (e.target === $('peso-tabela')) $('peso-tabela').hidden = true; };
$('btn-peso-testar').onclick = () => testarPeso();
$('btn-peso-proximo').onclick = () => { $('peso-arena').classList.remove('certo'); novoObjeto(); };

$('btn-peso').onclick = () => { SOM.clique(); escolherProfessorE('Peso Certo', telaPesoMenu); };
$('peso-voltar').onclick = telaJogos;
$('btn-peso-comecar').onclick = () => { SOM.clique(); comecarPeso(); };
$('peso-sair').onclick = telaPesoMenu;

export { comecarPeso, pararPeso, telaPesoMenu };
