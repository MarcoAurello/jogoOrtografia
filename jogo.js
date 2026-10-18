/* Jogo de Ortografia do Pleno — Developed by Davi Miguel */
(() => {
  const $ = (id) => document.getElementById(id);
  const embaralhar = (lista) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

  // ---------- Estrelas salvas no aparelho ----------
  const CHAVE = 'pleno-ortografia:estrelas';
  const lerEstrelas = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch (e) { return {}; } };
  const salvarEstrelas = (id, n) => {
    const e = lerEstrelas();
    e[id] = Math.max(e[id] || 0, n);
    try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch (err) { /* sem armazenamento */ }
  };
  const estrelasTexto = (n) => [1, 2, 3].map((i) => `<span class="${i <= n ? '' : 'apagada'}">⭐</span>`).join('');

  // ---------- Sons (sem arquivos) ----------
  let somLigado = true, audio = null;
  function tocar(notas) {
    if (!somLigado) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      let t = audio.currentTime;
      for (const [freq, dur, tipo = 'triangle'] of notas) {
        const o = audio.createOscillator(), v = audio.createGain();
        o.type = tipo; o.frequency.value = freq;
        v.gain.setValueAtTime(0.15, t);
        v.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.connect(v); v.connect(audio.destination);
        o.start(t); o.stop(t + dur);
        t += dur * 0.8;
      }
    } catch (e) { /* sem áudio */ }
  }
  const SOM = {
    certo: () => tocar([[660, 0.12], [880, 0.2]]),
    errado: () => tocar([[220, 0.25, 'square']]),
    vitoria: () => tocar([[523, 0.14], [659, 0.14], [784, 0.14], [1047, 0.35]]),
    clique: () => tocar([[440, 0.06]]),
  };
  $('btn-som').onclick = () => {
    somLigado = !somLigado;
    $('btn-som').textContent = somLigado ? '🔊' : '🔇';
    $('btn-som').setAttribute('aria-label', somLigado ? 'Som ligado' : 'Som desligado');
    if (!somLigado && window.speechSynthesis) speechSynthesis.cancel();
  };

  // ---------- Voz: lê a palavra em português ----------
  function falar(texto) {
    if (!somLigado || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const f = new SpeechSynthesisUtterance(texto);
    f.lang = 'pt-BR';
    f.rate = 0.8;
    const voz = speechSynthesis.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
    if (voz) f.voice = voz;
    speechSynthesis.speak(f);
  }
  if (window.speechSynthesis) speechSynthesis.getVoices();

  // ---------- Moldura: lápis, livros, estrelas e bolinhas ----------
  const ENFEITES = {
    lapis: (c) => `<svg viewBox="0 0 40 120" width="34"><rect x="8" y="22" width="24" height="70" rx="3" fill="${c}" stroke="#5b1650" stroke-width="3"/><rect x="8" y="10" width="24" height="14" rx="3" fill="#ff8fb1" stroke="#5b1650" stroke-width="3"/><rect x="8" y="22" width="24" height="6" fill="#c9c9c9" stroke="#5b1650" stroke-width="2"/><path d="M8 92 L20 116 L32 92 Z" fill="#f6d2a4" stroke="#5b1650" stroke-width="3"/><path d="M16 108 L20 116 L24 108 Z" fill="#5b1650"/></svg>`,
    livro: (c) => `<svg viewBox="0 0 80 90" width="56"><rect x="8" y="6" width="62" height="78" rx="6" fill="${c}" stroke="#5b1650" stroke-width="3.5"/><rect x="62" y="10" width="10" height="70" rx="3" fill="#fff" stroke="#5b1650" stroke-width="3"/><rect x="18" y="20" width="38" height="16" rx="3" fill="#fff" opacity=".85"/><line x1="16" y1="6" x2="16" y2="84" stroke="#5b1650" stroke-width="3"/></svg>`,
    estrela: (c) => `<svg viewBox="0 0 60 60" width="40"><path d="M30 4 L37 22 L56 22 L41 34 L47 54 L30 42 L13 54 L19 34 L4 22 L23 22 Z" fill="${c}" stroke="#5b1650" stroke-width="3.5" stroke-linejoin="round"/></svg>`,
    bolinha: (c) => `<svg viewBox="0 0 60 40" width="46"><path d="M8 24 Q4 6 24 8 Q36 2 48 12 Q60 26 44 32 Q30 40 18 34 Q10 32 8 24 Z" fill="${c}" stroke="#5b1650" stroke-width="3"/></svg>`,
    brilho: (c) => `<svg viewBox="0 0 40 40" width="24"><path d="M20 2 Q22 18 38 20 Q22 22 20 38 Q18 22 2 20 Q18 18 20 2 Z" fill="${c}" stroke="#5b1650" stroke-width="2.5"/></svg>`,
  };
  const POSICOES = [
    ['bolinha', '#f7df1c', 1, 3, -20], ['lapis', '#f7df1c', 9, 1, 35], ['brilho', '#3cc8e8', 17, 4, 0], ['livro', '#3cc8e8', 22, 1, -8],
    ['estrela', '#f7df1c', 36, 2, 10], ['estrela', '#f7df1c', 70, 2, -10], ['lapis', '#f7df1c', 63, 1, -35], ['livro', '#3cc8e8', 80, 1, 8],
    ['bolinha', '#a2238e', 92, 3, 15], ['bolinha', '#a2238e', 1, 32, 20], ['lapis', '#ff8fb1', 1, 55, -10], ['bolinha', '#a2238e', 2, 84, -15],
    ['lapis', '#f7df1c', 95, 55, 15], ['bolinha', '#f7df1c', 94, 32, -20], ['bolinha', '#a2238e', 95, 85, 10], ['brilho', '#a2238e', 8, 92, 0],
    ['estrela', '#3cc8e8', 88, 92, 12], ['brilho', '#f7df1c', 50, 96, 0],
  ];
  $('moldura').innerHTML = POSICOES.map(([tipo, cor, x, y, giro], i) =>
    `<div class="enfeite" style="left:${x}%;top:${y}%;transform:rotate(${giro}deg);--giro:${giro}deg;animation-delay:${(i % 6) * -1}s">${ENFEITES[tipo](cor)}</div>`).join('');

  // ---------- Davi ----------
  function davi(area, humor, efeito) {
    $(area).innerHTML = daviSVG(humor);
    if (efeito) { $(area).classList.remove('pula', 'balanca'); void $(area).offsetWidth; $(area).classList.add(efeito); }
  }

  // ---------- Telas ----------
  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function telaInicio() { davi('davi-inicio', 'oi'); mostrar('tela-inicio'); }

  function telaMissoes() {
    const estrelas = lerEstrelas();
    $('grade-missoes').innerHTML = MISSOES.map((m) => `
      <button class="missao" style="--c:${m.cor}" data-id="${m.id}" type="button">
        <span class="missao-icone">${m.icone}</span>
        <span class="missao-titulo">${m.titulo}</span>
        <span class="missao-estrelas">${estrelasTexto(estrelas[m.id] || 0)}</span>
      </button>`).join('');
    const total = Object.values(estrelas).reduce((s, n) => s + n, 0);
    $('total-estrelas').textContent = `Você já ganhou ${total} de ${MISSOES.length * 3} estrelas ⭐`;
    mostrar('tela-missoes');
  }

  $('grade-missoes').onclick = (e) => {
    const b = e.target.closest('.missao'); if (!b) return;
    SOM.clique();
    telaRegra(MISSOES.find((m) => m.id === b.dataset.id));
  };

  // ---------- Missão ----------
  let missao = null, fila = [], idx = 0, errosNaPergunta = 0, errosTotal = 0, acertosDePrimeira = 0;

  function telaRegra(m) {
    missao = m;
    $('regra-icone').textContent = m.icone;
    $('regra-titulo').textContent = m.titulo;
    $('tela-regra').style.setProperty('--c', m.cor);
    $('regra-texto').innerHTML = m.regra;
    davi('davi-regra', 'oi');
    mostrar('tela-regra');
  }

  function comecarMissao() {
    fila = embaralhar(missao.perguntas);
    idx = 0; errosTotal = 0; acertosDePrimeira = 0;
    $('barra-titulo').textContent = `${missao.icone} ${missao.titulo}`;
    $('tela-pergunta').style.setProperty('--c', missao.cor);
    mostrar('tela-pergunta');
    mostrarPergunta();
  }

  // palavra certa de cada pergunta (para ouvir e para mostrar no fim)
  function palavraCerta(p) {
    if (missao.tipo === 'completar') return p.molde.replace('_', p.resp.toLowerCase());
    if (missao.tipo === 'escolher') return p.resp;
    return p.certa;
  }

  function balao(html, estado) {
    const b = $('balao-jogo');
    b.innerHTML = html;
    b.className = 'balao balao-cima' + (estado ? ' ' + estado : '');
  }

  function desenharProgresso() {
    $('progresso').innerHTML = fila.map((_, i) => `<i class="${i < idx ? 'feita' : i === idx ? 'atual' : ''}"></i>`).join('');
  }

  function mostrarPergunta() {
    const p = fila[idx];
    errosNaPergunta = 0;
    desenharProgresso();
    $('btn-proxima').hidden = true;
    $('opcoes').innerHTML = '';
    $('palavra').innerHTML = '';
    davi('davi-jogo', 'feliz');

    if (missao.tipo === 'detetive') {
      $('figura').textContent = '🔍';
      $('btn-ouvir').hidden = true;
      $('enunciado').textContent = 'Qual palavra está escrita ERRADA?';
      balao('Uma dessas palavras é um <b>monstro da escrita</b>! Toque nela para capturar. 👾');
      for (const w of embaralhar(p.palavras)) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'opcao palavra-op'; b.textContent = w;
        b.style.setProperty('--c', missao.cor);
        b.onclick = () => responder(b, w === p.errada);
        $('opcoes').append(b);
      }
      return;
    }

    // figura do cartaz (foto/ilustração) quando existe; senão, o emoji
    if (p.img) $('figura').innerHTML = `<img src="${p.img}" alt="" width="240" height="240">`;
    else $('figura').textContent = p.fig;
    $('btn-ouvir').hidden = false;

    if (missao.tipo === 'completar') {
      $('enunciado').textContent = 'Qual letra completa a palavra?';
      const [antes, depois] = p.molde.split('_');
      const letras = [...antes].map((l) => `<span class="letra">${l.toUpperCase()}</span>`).join('')
        + `<span class="letra lacuna" id="lacuna">?</span>`
        + [...depois].map((l) => `<span class="letra">${l.toUpperCase()}</span>`).join('');
      $('palavra').innerHTML = letras;
      balao('Olhe a figura, ouça a palavra e escolha a letra que falta! 👀');
      for (const op of missao.opcoes) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'opcao'; b.textContent = op;
        b.style.setProperty('--c', missao.cor);
        b.onclick = () => responder(b, op === p.resp, op);
        $('opcoes').append(b);
      }
    } else {
      $('enunciado').textContent = 'Qual é o jeito certo de escrever?';
      balao('Olhe bem os <b>acentos</b> e o <b>til</b>! ✨');
      for (const op of embaralhar(p.opcoes)) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'opcao palavra-op'; b.textContent = op;
        b.style.setProperty('--c', missao.cor);
        b.onclick = () => responder(b, op === p.resp);
        $('opcoes').append(b);
      }
    }
  }

  function responder(botao, acertou, letra) {
    const p = fila[idx];
    if (acertou) {
      SOM.certo();
      if (errosNaPergunta === 0) acertosDePrimeira++;
      document.querySelectorAll('#opcoes .opcao').forEach((b) => { b.disabled = true; });
      botao.classList.add(missao.tipo === 'detetive' ? 'monstro' : 'certa');
      const certa = palavraCerta(p);
      if (missao.tipo === 'completar') {
        const lacuna = $('lacuna');
        lacuna.textContent = letra;
        lacuna.classList.add('preenchida');
      }
      if (missao.tipo === 'detetive') {
        $('palavra').innerHTML = [...certa].map((l) => `<span class="letra lacuna preenchida">${l.toUpperCase()}</span>`).join('');
        balao(`👾 Monstro capturado! O certo é <b>${certa.toUpperCase()}</b>.<br>${p.dica}`, 'certo');
      } else {
        balao(`${sortear(ELOGIOS)} 🎉 Escreve-se <b>${certa.toUpperCase()}</b>.`, 'certo');
      }
      davi('davi-jogo', 'festa', 'pula');
      falar(certa);
      $('btn-proxima').textContent = idx === fila.length - 1 ? 'Ver resultado ⭐' : 'Próxima ➜';
      $('btn-proxima').hidden = false;
      $('btn-proxima').focus({ preventScroll: true });
    } else {
      SOM.errado();
      errosNaPergunta++; errosTotal++;
      botao.classList.add('errada');
      botao.disabled = true;
      davi('davi-jogo', 'pensando', 'balanca');
      if (missao.tipo === 'detetive') {
        balao(`Hmm… <b>${botao.textContent.toUpperCase()}</b> está certinha! O monstro é outra. 🔍`, 'errado');
      } else {
        balao(`Quase! Tente de novo. 💡<br>${missao.regra}`, 'errado');
      }
    }
  }

  function proxima() {
    idx++;
    if (idx < fila.length) mostrarPergunta();
    else fimDaMissao();
  }

  function fimDaMissao() {
    const n = errosTotal <= 1 ? 3 : errosTotal <= 4 ? 2 : 1;
    salvarEstrelas(missao.id, n);
    SOM.vitoria();
    $('fim-titulo').textContent = n === 3 ? 'Missão perfeita!' : 'Missão cumprida!';
    $('fim-estrelas').innerHTML = estrelasTexto(n);
    $('fim-texto').textContent = `Você acertou ${acertosDePrimeira} de ${fila.length} de primeira na missão "${missao.titulo}"!`;
    davi('davi-fim', 'festa', 'pula');
    mostrar('tela-fim');
    soltarConfete();
    falar(n === 3 ? 'Parabéns! Missão perfeita!' : 'Parabéns! Missão cumprida!');
  }

  function soltarConfete() {
    const c = $('confete');
    c.innerHTML = '';
    const itens = ['⭐', '🎉', '✨', '💜', '💛', '💙'];
    for (let i = 0; i < 36; i++) {
      const s = document.createElement('span');
      s.textContent = sortear(itens);
      s.style.left = Math.random() * 100 + '%';
      s.style.animationDuration = 2 + Math.random() * 2.5 + 's';
      s.style.animationDelay = Math.random() * 0.8 + 's';
      c.append(s);
    }
    setTimeout(() => { c.innerHTML = ''; }, 5500);
  }

  // ---------- Botões ----------
  $('btn-jogar').onclick = () => { SOM.clique(); telaMissoes(); };
  $('voltar-inicio').onclick = telaInicio;
  $('btn-comecar').onclick = () => { SOM.clique(); comecarMissao(); };
  $('regra-voltar').onclick = telaMissoes;
  $('sair-missao').onclick = telaMissoes;
  $('btn-proxima').onclick = proxima;
  $('btn-ouvir').onclick = () => falar(palavraCerta(fila[idx]));
  $('btn-repetir').onclick = () => comecarMissao();
  $('btn-outras').onclick = telaMissoes;

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

  telaInicio();
})();
