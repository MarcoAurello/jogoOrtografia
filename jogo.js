/* Jogo de Ortografia do Pleno — © Marco Nunes. Todos os direitos reservados. */
(() => {
  const $ = (id) => document.getElementById(id);
  const embaralhar = (lista) => {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const sortear = (lista) => lista[Math.floor(Math.random() * lista.length)];

  // escapa texto digitado (nome do aluno) antes de colocar no HTML
  const seguro = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const semHTML = (t) => String(t).replace(/<[^>]+>/g, '');

  // ---------- Aluno (nome + senha da turma) ----------
  // A senha é conferida no próprio aparelho: é uma "portinha" para as crianças, não uma proteção real.
  const SENHA_TURMA = 'alunoPleno';
  const CHAVE_ALUNO = 'pleno-ortografia:aluno';
  // sempre pede nome e senha ao abrir o jogo; o último nome já vem preenchido para facilitar
  let aluno = null;
  let ultimoNome = '';
  try { ultimoNome = localStorage.getItem(CHAVE_ALUNO) || ''; } catch (e) { ultimoNome = ''; }

  // ---------- Estrelas salvas no aparelho (separadas por aluno) ----------
  const chaveEstrelas = () => 'pleno-ortografia:estrelas:' + (aluno || '').trim().toLowerCase();
  const lerEstrelas = () => { try { return JSON.parse(localStorage.getItem(chaveEstrelas())) || {}; } catch (e) { return {}; } };
  const salvarEstrelas = (id, n) => {
    const e = lerEstrelas();
    e[id] = Math.max(e[id] || 0, n);
    try { localStorage.setItem(chaveEstrelas(), JSON.stringify(e)); } catch (err) { /* sem armazenamento */ }
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
    if (!somLigado) pararVoz();
  };

  // ---------- Voz ----------
  // 1) Se existir a gravação do Davi (audio/palavras/<nome>.mp3, .m4a ou .wav), toca a gravação.
  // 2) Senão, usa a voz do aparelho com o tom mais agudo, para soar como criança.
  //    (a lista de arquivos para gravar está em GRAVAR.md)
  const EXTENSOES = ['mp3', 'm4a', 'wav'];
  const naoExiste = new Set();   // arquivos que já sabemos que não existem (não tenta de novo)
  let audioAtual = null;

  // nome do arquivo de cada palavra: minúsculo e sem acento; avó e avô ficam diferentes
  function arquivoDaPalavra(palavra) {
    const especiais = { 'avó': 'avo-agudo', 'avô': 'avo-circunflexo' };
    const p = palavra.toLowerCase();
    return especiais[p] || p.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
  }

  function tocarGravacao(pasta, nome) {
    return new Promise((ok) => {
      const tentativas = EXTENSOES.map((e) => `audio/${pasta}/${nome}.${e}`).filter((s) => !naoExiste.has(s));
      const tentar = () => {
        const src = tentativas.shift();
        if (!src) return ok(false);
        const a = new Audio(src);
        let resolvido = false;
        const falhou = (marcar) => { if (resolvido) return; resolvido = true; if (marcar) naoExiste.add(src); tentar(); };
        a.onerror = () => falhou(true);
        a.play()
          .then(() => { if (resolvido) return; resolvido = true; audioAtual = a; ok(true); })
          .catch((e) => {
            if (e && e.name === 'NotAllowedError') { resolvido = true; ok(false); return; }   // navegador bloqueou o som
            falhou(true);
          });
      };
      tentar();
    });
  }

  function vozDoAparelho(texto) {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const f = new SpeechSynthesisUtterance(texto);
    f.lang = 'pt-BR';
    f.rate = 0.92;
    f.pitch = 1.6;   // tom mais agudo: parece voz de criança
    const vozes = speechSynthesis.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('pt'));
    // vozes mais suaves soam mais infantis com o tom agudo
    const preferida = vozes.find((v) => /francisca|luciana|thalita|maria|vitoria|female|feminina/i.test(v.name))
      || vozes.find((v) => /pt.br/i.test(v.lang)) || vozes[0];
    if (preferida) f.voice = preferida;
    speechSynthesis.speak(f);
  }
  if (window.speechSynthesis) speechSynthesis.getVoices();

  function pararVoz() {
    if (audioAtual) { audioAtual.pause(); audioAtual = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
  }

  // palavra: gravação do Davi ou, se não houver, a voz do aparelho
  async function falar(palavra) {
    if (!somLigado) return;
    pararVoz();
    if (await tocarGravacao('palavras', arquivoDaPalavra(palavra))) return;
    vozDoAparelho(palavra);
  }

  // frase gravada pelo Davi; sem gravação, só fala com a voz do aparelho se houver 'texto'
  async function frase(nome, texto) {
    if (!somLigado) return;
    pararVoz();
    if (await tocarGravacao('frases', nome)) return;
    if (texto) vozDoAparelho(texto);
  }

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

  function telaLogin() {
    davi('davi-login', 'oi');
    $('erro-login').textContent = '';
    $('login-senha').value = '';
    if (!$('login-nome').value) $('login-nome').value = ultimoNome;
    mostrar('tela-login');
    setTimeout(() => $('login-nome').focus(), 300);
  }

  function telaInicio() {
    if (!aluno) return telaLogin();
    $('nome-saudacao').textContent = aluno;
    davi('davi-inicio', 'oi');
    mostrar('tela-inicio');
  }

  $('form-login').onsubmit = (e) => {
    e.preventDefault();
    const nome = $('login-nome').value.trim().replace(/\s+/g, ' ');
    if (nome.length < 2) { $('erro-login').textContent = 'Digite o seu nome.'; return; }
    if ($('login-senha').value.trim() !== SENHA_TURMA) {
      $('erro-login').textContent = 'Senha incorreta. Peça a senha para o professor! 🔒';
      davi('davi-login', 'pensando', 'balanca');
      SOM.errado();
      return;
    }
    aluno = nome;
    ultimoNome = aluno;
    try { localStorage.setItem(CHAVE_ALUNO, aluno); } catch (err) { /* sem armazenamento */ }
    SOM.certo();
    telaInicio();
    frase('ola');   // apresentação gravada pelo Davi (se existir)
  };

  $('btn-trocar').onclick = () => {
    aluno = null;
    ultimoNome = '';
    try { localStorage.removeItem(CHAVE_ALUNO); } catch (e) { /* sem armazenamento */ }
    $('login-nome').value = '';
    telaLogin();
  };

  // missão especial com as palavras de todas as missões, misturadas
  const TODAS = {
    id: 'todas', titulo: 'Todas as palavras', icone: '🌟', cor: '#f08a24', todas: true,
    regra: 'Aqui aparecem as <b>80 palavras</b> de todas as missões, misturadas! Use todos os segredos que você aprendeu. Se cansar, toque em <b>Terminar e ver relatório</b> quando quiser.',
  };

  function telaMissoes() {
    const estrelas = lerEstrelas();
    $('grade-missoes').innerHTML = [...MISSOES, TODAS].map((m) => `
      <button class="missao${m.todas ? ' missao-todas' : ''}" style="--c:${m.cor}" data-id="${m.id}" type="button">
        <span class="missao-icone">${m.icone}</span>
        <span class="missao-titulo">${m.titulo}</span>
        <span class="missao-estrelas">${estrelasTexto(estrelas[m.id] || 0)}</span>
      </button>`).join('');
    const total = MISSOES.reduce((s, m) => s + (estrelas[m.id] || 0), 0);
    $('total-estrelas').textContent = `${aluno}, você já ganhou ${total} de ${MISSOES.length * 3} estrelas nas missões ⭐`;
    mostrar('tela-missoes');
  }

  $('grade-missoes').onclick = (e) => {
    const b = e.target.closest('.missao'); if (!b) return;
    SOM.clique();
    telaRegra(b.dataset.id === 'todas' ? TODAS : MISSOES.find((m) => m.id === b.dataset.id));
  };

  // ---------- Missão ----------
  // fila: lista de { m: missão da palavra, p: pergunta }; resultados: o que aconteceu em cada uma
  let missao = null, fila = [], idx = 0, errosNaPergunta = [], resultados = [];

  function telaRegra(m) {
    missao = m;
    $('regra-icone').textContent = m.icone;
    $('regra-titulo').textContent = m.titulo;
    $('tela-regra').style.setProperty('--c', m.cor);
    $('regra-texto').innerHTML = m.regra;
    davi('davi-regra', 'oi');
    frase('regra-' + m.id);   // o Davi lê o segredo da missão (se gravado)
    mostrar('tela-regra');
  }

  function comecarMissao() {
    fila = missao.todas
      ? embaralhar(MISSOES.flatMap((m) => m.perguntas.map((p) => ({ m, p }))))
      : embaralhar(missao.perguntas).map((p) => ({ m: missao, p }));
    idx = 0; resultados = [];
    $('barra-titulo').textContent = `${missao.icone} ${missao.titulo}`;
    $('tela-pergunta').style.setProperty('--c', missao.cor);
    $('btn-terminar').hidden = !missao.todas;
    mostrar('tela-pergunta');
    mostrarPergunta();
  }

  // palavra certa de cada pergunta (para ouvir, mostrar e pôr no relatório)
  function palavraCerta({ m, p }) {
    if (m.tipo === 'completar') return p.molde.replace('_', p.resp.toLowerCase());
    if (m.tipo === 'escolher') return p.resp;
    return p.certa;
  }

  function balao(html, estado) {
    const b = $('balao-jogo');
    b.innerHTML = html;
    b.className = 'balao balao-cima' + (estado ? ' ' + estado : '');
  }

  function desenharProgresso() {
    if (fila.length > 12) {
      const pct = Math.round((idx / fila.length) * 100);
      $('progresso').innerHTML = `<span class="progresso-barra"><b style="width:${pct}%"></b></span><span class="progresso-num">${idx + 1}/${fila.length}</span>`;
    } else {
      $('progresso').innerHTML = fila.map((_, i) => `<i class="${i < idx ? 'feita' : i === idx ? 'atual' : ''}"></i>`).join('');
    }
  }

  function botaoOpcao(texto, classe, cor, aoTocar) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'opcao' + (classe ? ' ' + classe : ''); b.textContent = texto;
    b.style.setProperty('--c', cor);
    b.onclick = aoTocar;
    $('opcoes').append(b);
  }

  function mostrarPergunta() {
    const { m, p } = fila[idx];
    errosNaPergunta = [];
    desenharProgresso();
    $('btn-proxima').hidden = true;
    $('opcoes').innerHTML = '';
    $('palavra').innerHTML = '';
    $('etiqueta-missao').hidden = !missao.todas;
    $('etiqueta-missao').textContent = `${m.icone} ${m.titulo}`;
    $('etiqueta-missao').style.setProperty('--c', m.cor);
    davi('davi-jogo', 'feliz');

    if (m.tipo === 'detetive') {
      $('figura').textContent = '🔍';
      $('btn-ouvir').hidden = true;
      $('enunciado').textContent = 'Qual palavra está escrita ERRADA?';
      balao('Uma dessas palavras é um <b>monstro da escrita</b>! Toque nela para capturar. 👾');
      for (const w of embaralhar(p.palavras)) botaoOpcao(w, 'palavra-op', m.cor, (e) => responder(e.currentTarget, w === p.errada, w));
      return;
    }

    if (p.img) $('figura').innerHTML = `<img src="${p.img}" alt="" width="240" height="240">`;
    else $('figura').textContent = p.fig;
    $('btn-ouvir').hidden = false;

    if (m.tipo === 'completar') {
      $('enunciado').textContent = 'Qual letra completa a palavra?';
      const [antes, depois] = p.molde.split('_');
      $('palavra').innerHTML = [...antes].map((l) => `<span class="letra">${l.toUpperCase()}</span>`).join('')
        + '<span class="letra lacuna" id="lacuna">?</span>'
        + [...depois].map((l) => `<span class="letra">${l.toUpperCase()}</span>`).join('');
      balao('Olhe a figura, ouça a palavra e escolha a letra que falta! 👀');
      for (const op of m.opcoes) botaoOpcao(op, '', m.cor, (e) => responder(e.currentTarget, op === p.resp, op));
    } else {
      $('enunciado').textContent = 'Qual é o jeito certo de escrever?';
      balao('Olhe bem os <b>acentos</b> e o <b>til</b>! ✨');
      for (const op of embaralhar(p.opcoes)) botaoOpcao(op, 'palavra-op', m.cor, (e) => responder(e.currentTarget, op === p.resp, op));
    }
  }

  // como ficaria a palavra com a escolha errada (para o relatório)
  function comoEscreveu({ m, p }, escolha) {
    if (m.tipo === 'completar') return p.molde.replace('_', escolha.toLowerCase());
    return escolha;
  }

  function responder(botao, acertou, escolha) {
    const item = fila[idx], { m, p } = item;
    if (acertou) {
      SOM.certo();
      resultados.push({ m, p, certa: palavraCerta(item), erros: errosNaPergunta.slice() });
      document.querySelectorAll('#opcoes .opcao').forEach((b) => { b.disabled = true; });
      botao.classList.add(m.tipo === 'detetive' ? 'monstro' : 'certa');
      const certa = palavraCerta(item);
      if (m.tipo === 'completar') {
        $('lacuna').textContent = escolha;
        $('lacuna').classList.add('preenchida');
      }
      if (m.tipo === 'detetive') {
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
      errosNaPergunta.push(comoEscreveu(item, escolha));
      botao.classList.add('errada');
      botao.disabled = true;
      davi('davi-jogo', 'pensando', 'balanca');
      frase('tente-de-novo');
      if (m.tipo === 'detetive') {
        balao(`Hmm… <b>${String(escolha).toUpperCase()}</b> está certinha! O monstro é outra. 🔍`, 'errado');
      } else {
        balao(`Quase! Tente de novo. 💡<br>${m.regra}`, 'errado');
      }
    }
  }

  function proxima() {
    idx++;
    if (idx < fila.length) mostrarPergunta();
    else fimDaMissao();
  }

  // ---------- Relatório de dificuldades ----------
  function montarRelatorio() {
    const respondidas = resultados.length;
    const dePrimeiraN = resultados.filter((r) => r.erros.length === 0).length;
    const comErro = resultados.filter((r) => r.erros.length > 0);
    // agrupa por regra (missão), da que teve mais erros para a que teve menos
    const grupos = [];
    for (const r of comErro) {
      let g = grupos.find((x) => x.m.id === r.m.id);
      if (!g) { g = { m: r.m, itens: [] }; grupos.push(g); }
      g.itens.push(r);
    }
    grupos.sort((a, b) => b.itens.length - a.itens.length);
    return { respondidas, dePrimeiraN, comErro, grupos };
  }

  function desenharRelatorio(rel, estrelas) {
    const data = new Date().toLocaleDateString('pt-BR');
    $('relatorio-info').innerHTML = `<b>Aluno:</b> ${seguro(aluno)} · <b>Data:</b> ${data} · <b>Missão:</b> ${seguro(missao.titulo)}<br>`
      + `<b>Acertos de primeira:</b> ${rel.dePrimeiraN} de ${rel.respondidas} · <b>Estrelas:</b> ${estrelas} de 3`;

    if (!rel.comErro.length) {
      $('relatorio-conteudo').innerHTML = '<p class="relatorio-ok">🎉 Nenhuma dificuldade nesta missão! Você acertou tudo de primeira.</p>';
      return;
    }
    const blocos = rel.grupos.map((g) => `
      <div class="dificuldade" style="--c:${g.m.cor}">
        <h4>${g.m.icone} ${g.m.titulo} <span class="qtd-erros">${g.itens.length} ${g.itens.length === 1 ? 'palavra' : 'palavras'}</span></h4>
        <p class="dica-regra">${g.m.regra}</p>
      </div>`).join('');
    const linhas = rel.comErro.map((r) => `
      <tr><td class="certo">${r.certa.toUpperCase()}</td><td class="escreveu">${r.erros.map((e) => seguro(String(e).toUpperCase())).join(', ')}</td></tr>`).join('');
    $('relatorio-conteudo').innerHTML = `
      <h4 class="relatorio-sub">Principais dificuldades</h4>
      ${blocos}
      <h4 class="relatorio-sub">Palavras para revisar</h4>
      <table class="tabela-revisar">
        <thead><tr><th>Jeito certo</th><th>Você tentou</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
  }

  let ultimoRelatorio = null;

  function fimDaMissao() {
    const rel = montarRelatorio();
    const taxa = rel.respondidas ? rel.dePrimeiraN / rel.respondidas : 0;
    const n = taxa >= 0.9 ? 3 : taxa >= 0.6 ? 2 : 1;
    if (rel.respondidas) salvarEstrelas(missao.id, n);
    ultimoRelatorio = { rel, estrelas: n, missao, data: new Date() };
    SOM.vitoria();
    $('fim-titulo').textContent = n === 3 ? 'Missão perfeita!' : 'Missão cumprida!';
    $('fim-estrelas').innerHTML = estrelasTexto(n);
    $('fim-texto').textContent = `${aluno}, você acertou ${rel.dePrimeiraN} de ${rel.respondidas} de primeira em "${missao.titulo}"!`;
    davi('davi-fim', 'festa', 'pula');
    desenharRelatorio(rel, n);
    mostrar('tela-fim');
    soltarConfete();
    frase(n === 3 ? 'missao-perfeita' : 'missao-cumprida', n === 3 ? `Parabéns, ${aluno}! Missão perfeita!` : `Parabéns, ${aluno}! Missão cumprida!`);
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

  // ---------- PDF do relatório (gerado no próprio aparelho) ----------
  // fontes padrão do PDF não têm emoji: tira tudo que não for letra latina
  const paraPDF = (t) => semHTML(t).replace(/&amp;/g, '&').replace(/[^\u0000-ÿ]/g, '').replace(/\s+/g, ' ').trim();
  const nomeArquivo = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();

  function imagemComoDataURL(src) {
    return new Promise((ok, falha) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        try { ok({ url: c.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight }); } catch (e) { falha(e); }
      };
      img.onerror = falha;
      img.src = src;
    });
  }

  async function baixarPDF() {
    if (!ultimoRelatorio) return;
    const lib = window.jspdf;
    if (!lib || !lib.jsPDF) { window.print(); return; }   // sem a biblioteca: usa "Salvar como PDF" do navegador
    const { rel, estrelas, missao: mis, data } = ultimoRelatorio;
    const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
    const ROXO = [162, 35, 142], TEXTO = [59, 33, 72], CINZA = [120, 106, 128];
    const L = 18, LARG = 210 - 2 * L;
    let y = 16;

    const novaPaginaSePrecisar = (altura) => { if (y + altura > 278) { doc.addPage(); y = 20; } };
    const paragrafo = (texto, tam = 11, estilo = 'normal', cor = TEXTO, recuo = 0) => {
      doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...cor);
      const linhas = doc.splitTextToSize(paraPDF(texto), LARG - recuo);
      for (const l of linhas) { novaPaginaSePrecisar(tam * 0.5); doc.text(l, L + recuo, y); y += tam * 0.45; }
    };

    // cabeçalho com o logo
    try {
      const logo = await imagemComoDataURL('assets/logo-pleno.png');
      doc.addImage(logo.url, 'PNG', L, y - 2, 28, 28 * logo.h / logo.w, undefined, 'FAST');
    } catch (e) { /* sem logo */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...ROXO);
    doc.text('Relatório de Ortografia', L + 34, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...CINZA);
    doc.text('Jogo de Ortografia do Pleno', L + 34, y + 14);
    y += 30;
    doc.setDrawColor(...ROXO); doc.setLineWidth(0.6); doc.line(L, y, L + LARG, y); y += 8;

    paragrafo(`Aluno: ${aluno}`, 12, 'bold');
    paragrafo(`Data: ${data.toLocaleDateString('pt-BR')}    Missão: ${mis.titulo}`, 11);
    paragrafo(`Acertos de primeira: ${rel.dePrimeiraN} de ${rel.respondidas}    Estrelas: ${estrelas} de 3`, 11);
    y += 4;

    if (!rel.comErro.length) {
      paragrafo('Parabéns! Nenhuma dificuldade nesta missão: todas as palavras certas de primeira.', 13, 'bold', ROXO);
    } else {
      novaPaginaSePrecisar(14);
      paragrafo('Principais dificuldades', 15, 'bold', ROXO); y += 1;
      for (const g of rel.grupos) {
        novaPaginaSePrecisar(24);
        paragrafo(`${g.m.titulo} - ${g.itens.length} ${g.itens.length === 1 ? 'palavra' : 'palavras'} com erro`, 12, 'bold');
        paragrafo(`Regra: ${g.m.regra}`, 10.5, 'normal', TEXTO, 4);
        paragrafo(`Palavras: ${g.itens.map((r) => r.certa).join(', ')}`, 10.5, 'italic', CINZA, 4);
        y += 3;
      }

      // tabela: jeito certo x o que o aluno tentou
      y += 2; novaPaginaSePrecisar(20);
      paragrafo('Palavras para revisar', 15, 'bold', ROXO); y += 1;
      const col2 = L + 70;
      const cabecalho = () => {
        doc.setFillColor(...ROXO); doc.rect(L, y - 5, LARG, 8, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
        doc.text('Jeito certo', L + 3, y); doc.text('O aluno tentou', col2 + 3, y);
        y += 7;
      };
      cabecalho();
      rel.comErro.forEach((r, i) => {
        if (y + 8 > 278) { doc.addPage(); y = 20; cabecalho(); }
        if (i % 2 === 0) { doc.setFillColor(248, 238, 247); doc.rect(L, y - 5, LARG, 8, 'F'); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 120, 70);
        doc.text(paraPDF(r.certa.toUpperCase()), L + 3, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 50, 60);
        doc.text(paraPDF(r.erros.map((e) => String(e).toUpperCase()).join(', ')), col2 + 3, y);
        y += 8;
      });
    }

    // rodapé em todas as páginas
    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA);
      doc.text('Projeto desenvolvido por Davi Miguel - 4º ano - Colégio Pleno', L, 286);
      doc.text('© Marco Nunes - Todos os direitos reservados', L, 290);
      doc.text(`${i}/${paginas}`, L + LARG, 290, { align: 'right' });
    }
    doc.save(`relatorio-${nomeArquivo(aluno)}-${nomeArquivo(mis.titulo)}.pdf`);
  }

  // ---------- Botões ----------
  $('btn-jogar').onclick = () => { SOM.clique(); telaMissoes(); };
  $('voltar-inicio').onclick = telaInicio;
  $('btn-comecar').onclick = () => { SOM.clique(); comecarMissao(); };
  $('regra-voltar').onclick = telaMissoes;
  $('sair-missao').onclick = telaMissoes;
  $('btn-terminar').onclick = () => { if (resultados.length) fimDaMissao(); else telaMissoes(); };
  $('btn-proxima').onclick = proxima;
  $('btn-ouvir').onclick = () => falar(palavraCerta(fila[idx]));
  $('btn-repetir').onclick = () => comecarMissao();
  $('btn-outras').onclick = telaMissoes;
  $('btn-pdf').onclick = () => { baixarPDF().catch(() => window.print()); };

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
