/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
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
  const PEDIR_SENHA = false;   // por enquanto só o nome; troque para true para voltar a pedir a senha
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
    lapis: (c) => `<svg viewBox="0 0 40 120" width="34"><rect x="8" y="22" width="24" height="70" rx="3" fill="${c}" stroke="#0b2e66" stroke-width="3"/><rect x="8" y="10" width="24" height="14" rx="3" fill="#e53935" stroke="#0b2e66" stroke-width="3"/><rect x="8" y="22" width="24" height="6" fill="#c9c9c9" stroke="#0b2e66" stroke-width="2"/><path d="M8 92 L20 116 L32 92 Z" fill="#f6d2a4" stroke="#0b2e66" stroke-width="3"/><path d="M16 108 L20 116 L24 108 Z" fill="#0b2e66"/></svg>`,
    livro: (c) => `<svg viewBox="0 0 80 90" width="56"><rect x="8" y="6" width="62" height="78" rx="6" fill="${c}" stroke="#0b2e66" stroke-width="3.5"/><rect x="62" y="10" width="10" height="70" rx="3" fill="#fff" stroke="#0b2e66" stroke-width="3"/><rect x="18" y="20" width="38" height="16" rx="3" fill="#fff" opacity=".85"/><line x1="16" y1="6" x2="16" y2="84" stroke="#0b2e66" stroke-width="3"/></svg>`,
    estrela: (c) => `<svg viewBox="0 0 60 60" width="40"><path d="M30 4 L37 22 L56 22 L41 34 L47 54 L30 42 L13 54 L19 34 L4 22 L23 22 Z" fill="${c}" stroke="#0b2e66" stroke-width="3.5" stroke-linejoin="round"/></svg>`,
    bolinha: (c) => `<svg viewBox="0 0 60 40" width="46"><path d="M8 24 Q4 6 24 8 Q36 2 48 12 Q60 26 44 32 Q30 40 18 34 Q10 32 8 24 Z" fill="${c}" stroke="#0b2e66" stroke-width="3"/></svg>`,
    brilho: (c) => `<svg viewBox="0 0 40 40" width="24"><path d="M20 2 Q22 18 38 20 Q22 22 20 38 Q18 22 2 20 Q18 18 20 2 Z" fill="${c}" stroke="#0b2e66" stroke-width="2.5"/></svg>`,
  };
  const POSICOES = [
    ['bolinha', '#f7df1c', 1, 3, -20], ['lapis', '#f7df1c', 9, 1, 35], ['brilho', '#3cc8e8', 17, 4, 0], ['livro', '#3cc8e8', 22, 1, -8],
    ['estrela', '#f7df1c', 36, 2, 10], ['estrela', '#f7df1c', 70, 2, -10], ['lapis', '#f7df1c', 63, 1, -35], ['livro', '#3cc8e8', 80, 1, 8],
    ['bolinha', '#e53935', 92, 3, 15], ['bolinha', '#1565c0', 1, 32, 20], ['lapis', '#e53935', 1, 55, -10], ['bolinha', '#e53935', 2, 84, -15],
    ['lapis', '#f7df1c', 95, 55, 15], ['bolinha', '#f7df1c', 94, 32, -20], ['bolinha', '#1565c0', 95, 85, 10], ['brilho', '#e53935', 8, 92, 0],
    ['estrela', '#3cc8e8', 88, 92, 12], ['brilho', '#f7df1c', 50, 96, 0],
  ];
  $('moldura').innerHTML = POSICOES.map(([tipo, cor, x, y, giro], i) =>
    `<div class="enfeite" style="left:${x}%;top:${y}%;transform:rotate(${giro}deg);--giro:${giro}deg;animation-delay:${(i % 6) * -1}s">${ENFEITES[tipo](cor)}</div>`).join('');

  // ---------- Plenix, o mascote ----------
  // estado: 'oi', 'pensando', 'acertou', 'triste' ou 'festa' (as animações estão no style.css)
  function mascote(area, estado) {
    $(area).innerHTML = plenixHTML(estado);
  }


  // ---------- Telas ----------
  function mostrar(id) {
    document.querySelectorAll('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    encaixarDepois();
  }

  // ---------- Encaixe na tela ----------
  // Jogo em andamento não rola: a tela do jogo (.tela-jogo) ocupa a altura visível do aparelho (descontada a barra
  // do topo) e as áreas com proporção fixa (data-encaixe = largura/altura: transferidor, balança) encolhem ou
  // crescem para caber o que fica embaixo delas. Recalcula ao girar o aparelho, ao mudar o tamanho da janela e
  // quando a barra do navegador aparece ou some.
  // aba ativa da barra inferior para cada tela
  const ABA_DA_TELA = {
    'tela-inicio': 'inicio', 'tela-jogos': 'jogos', 'tela-missoes': 'jogos', 'tela-regra': 'jogos', 'tela-chuva-menu': 'jogos',
    'tela-mat-menu': 'jogos', 'tela-tiro-menu': 'jogos', 'tela-peso-menu': 'jogos', 'tela-luzes-menu': 'jogos', 'tela-fim': 'jogos',
    'tela-rotina-menu': 'jogos', 'tela-fichas-menu': 'jogos', 'tela-cores-menu': 'jogos', 'tela-lados-menu': 'jogos', 'tela-quiz-menu': 'quiz', 'tela-professor': 'professor', 'tela-instalar': 'inicio',
  };
  function encaixarTela() {
    const tela = document.querySelector('.tela.ativa');
    const emJogo = !!tela && tela.classList.contains('tela-jogo');
    document.body.classList.toggle('em-jogo', emJogo);
    // barra inferior: aparece depois do login e fora das partidas
    const barra = $('barra-inferior');
    barra.hidden = !tela || tela.id === 'tela-login' || emJogo;
    document.body.classList.toggle('com-barra', !barra.hidden);
    const aba = tela ? ABA_DA_TELA[tela.id] : '';
    barra.querySelectorAll('.aba').forEach((b) => {
      b.classList.toggle('ativa', b.dataset.aba === aba);
      if (b.dataset.aba === aba) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    if (!tela) return;
    // altura livre = altura visível menos o que fica acima da tela (barra do topo e margens)
    const alto = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const acima = tela.getBoundingClientRect().top + window.scrollY;
    document.documentElement.style.setProperty('--livre', `${Math.floor(alto - acima - 6)}px`);
    for (const el of tela.querySelectorAll('[data-encaixe]')) {
      el.style.width = '';
      if (!emJogo) continue;
      const sobra = tela.clientHeight - (tela.scrollHeight - el.offsetHeight);   // altura que sobra para a área
      const proporcao = Number(el.dataset.encaixe);
      el.style.width = `${Math.max(120, Math.min(el.parentElement.clientWidth, Math.floor(sobra * proporcao)))}px`;
    }
    // celular deitado e o jogo não cabe (ou a área ficou pequena demais): pede para virar o aparelho
    const naoCabe = emJogo && (tela.scrollHeight > tela.clientHeight + 2
      || [...tela.querySelectorAll('[data-encaixe]')].some((el) => el.offsetWidth < 200));
    document.body.classList.toggle('girar', naoCabe && window.innerWidth > window.innerHeight);
    if (typeof tiro !== 'undefined' && tiro) desenharTiro();
  }
  let encaixeAgendado = 0;
  function encaixarDepois() {
    clearTimeout(encaixeAgendado);
    encaixeAgendado = setTimeout(encaixarTela, 40);   // espera a tela nova montar
  }
  window.addEventListener('resize', encaixarDepois);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', encaixarDepois);
  // o conteúdo muda de tamanho (botões de resposta que aparecem, lista de pesos, perguntas): reencaixa.
  // A tela de jogo tem altura fixa, então observa cada parte dela, e não só a página.
  const observador = new ResizeObserver(encaixarDepois);
  observador.observe(document.querySelector('main'));
  document.querySelectorAll('.tela-jogo > *').forEach((el) => observador.observe(el));
  // também quando aparecem ou somem botões e listas (fora das áreas animadas, que mudam a cada quadro)
  const vigia = new MutationObserver(encaixarDepois);
  document.querySelectorAll('.tela-jogo > *:not(.chuva-arena):not(.tiro-arena):not(.peso-arena):not(.luz-palco)')
    .forEach((el) => vigia.observe(el, { childList: true, attributes: true, attributeFilter: ['hidden'] }));

  function telaLogin() {
    mascote('davi-login', 'oi');
    $('erro-login').textContent = '';
    $('login-senha').value = '';
    $('campo-senha').hidden = !PEDIR_SENHA;
    $('login-senha').required = PEDIR_SENHA;
    if (!$('login-nome').value) $('login-nome').value = ultimoNome;
    mostrar('tela-login');
    setTimeout(() => $('login-nome').focus(), 300);
  }

  // tela com a lista de jogos (Português e Matemática); o questionário tem botão próprio na tela inicial
  function telaJogos() {
    if (!aluno) return telaLogin();
    mostrar('tela-jogos');
  }

  function telaInicio() {
    if (!aluno) return telaLogin();
    $('nome-saudacao').textContent = aluno;
    mascote('davi-inicio', 'oi');
    mostrar('tela-inicio');
  }

  $('form-login').onsubmit = (e) => {
    e.preventDefault();
    const nome = $('login-nome').value.trim().replace(/\s+/g, ' ');
    if (nome.length < 2) { $('erro-login').textContent = 'Digite o seu nome.'; return; }
    if (PEDIR_SENHA && $('login-senha').value.trim() !== SENHA_TURMA) {
      $('erro-login').textContent = 'Senha incorreta. Peça a senha para o professor! 🔒';
      mascote('davi-login', 'triste');
      SOM.errado();
      return;
    }
    aluno = nome;
    ultimoNome = aluno;
    try { localStorage.setItem(CHAVE_ALUNO, aluno); } catch (err) { /* sem armazenamento */ }
    SOM.certo();
    if (QUIZ_DO_LINK) { escolherProfessorE('Questionário da aula', telaQuizMenu); return; }   // veio pelo link de um questionário
    const doLink = Object.hasOwn(JOGOS_DO_LINK, JOGO_DO_LINK || '') ? JOGOS_DO_LINK[JOGO_DO_LINK] : null;
    if (doLink) { telaJogos(); escolherProfessorE(doLink.nome, doLink.abrir); return; }       // veio pelo link de um jogo
    telaInicio();
    frase('ola');   // apresentação gravada pelo Davi (se existir)
  };

  // menu suspenso do topo: abre e fecha no botão; fecha ao escolher um item, ao tocar fora ou com Esc
  const abrirMenu = (aberto) => {
    $('menu-app-lista').hidden = !aberto;
    $('btn-menu').setAttribute('aria-expanded', String(aberto));
  };
  $('btn-menu').onclick = (e) => { e.stopPropagation(); abrirMenu($('menu-app-lista').hidden); };
  $('menu-app-lista').addEventListener('click', (e) => { if (e.target.closest('.menu-item')) abrirMenu(false); });
  document.addEventListener('click', (e) => { if (!e.target.closest('#menu-app')) abrirMenu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirMenu(false); });

  function pararJogos() { pararChuva(); pararMat(); pararTiro(); pararPeso(); pararLuz(); pararRotina(); pararFichas(); pararCores(); pararLados(); pararVoz(); }
  const irParaInicio = () => { pararJogos(); $('escolha-prof').hidden = true; telaInicio(); };
  $('btn-logo-inicio').onclick = irParaInicio;
  $('btn-menu-inicio').onclick = irParaInicio;
  $('barra-inferior').onclick = (e) => {
    const aba = e.target.closest('.aba');
    if (!aba) return;
    SOM.clique();
    pararJogos();
    $('escolha-prof').hidden = true;
    if (aba.dataset.aba === 'inicio') telaInicio();
    else if (aba.dataset.aba === 'jogos') telaJogos();
    else if (aba.dataset.aba === 'quiz') escolherProfessorE('Questionário da aula', telaQuizMenu);
    else telaProfessor();
  };

  $('btn-trocar').onclick = () => {
    aluno = null;
    ultimoNome = '';
    try { localStorage.removeItem(CHAVE_ALUNO); } catch (e) { /* sem armazenamento */ }
    $('login-nome').value = '';
    telaLogin();
  };

  // ---------- Para quem vai o relatório: lista da aba "E-mails" da planilha ----------
  // O app não cadastra e-mails: a lista vem da planilha do Google (pelo script ferramentas/relatorio-email.gs)
  // e o aluno escolhe, ao entrar, para qual professor vai o relatório. O aparelho guarda uma cópia da lista
  // (para funcionar sem internet) e lembra a última escolha.
  const SENHA_PROFESSOR = 'app0707';   // conferida aqui (para os alunos não mexerem) e de novo no script
  const CHAVE_EMAILS = 'pleno-ortografia:emails';                    // cópia da aba "E-mails" [{ nome, email }]
  const CHAVE_EMAIL_ESCOLHIDO = 'pleno-ortografia:email-escolhido';  // e-mail escolhido, ou 'nenhum'
  let senhaProfessor = '';   // a senha digitada, mandada ao script para gravar questionários
  const lerJSON = (chave, padrao) => { try { return JSON.parse(localStorage.getItem(chave)) || padrao; } catch (e) { return padrao; } };
  const gravarJSON = (chave, valor) => { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } };
  const jogoDaMissao = (mis) => (mis.quiz ? 'questionario' : mis.cores ? 'cores' : mis.lados ? 'lados' : mis.fichas ? 'fichas' : mis.rotina ? 'rotina' : mis.luzes ? 'reflexo' : mis.peso ? 'peso' : mis.tiro ? 'tiro' : mis.matematica ? 'matematica' : mis.chuva ? 'chuva' : 'ortografia');
  let emailEscolhido = (() => { try { return localStorage.getItem(CHAVE_EMAIL_ESCOLHIDO) || ''; } catch (e) { return ''; } })();
  const listaEmails = () => lerJSON(CHAVE_EMAILS, []);
  // o e-mail para onde vai o relatório (só se estiver na lista da planilha)
  const emailDoRelatorio = () => (listaEmails().some((x) => x.email === emailEscolhido) ? emailEscolhido : '');

  // conversa com o script do Google: leituras por GET, gravações (com a senha) por POST
  async function lerDoScript(acao, extra = '') {
    const r = await fetch(`${URL_RELATORIO}?acao=${acao}${extra}`);
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || 'erro');
    return j;
  }
  async function gravarNoScript(dados) {
    const r = await fetch(URL_RELATORIO, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ chave: CHAVE_RELATORIO, senha: senhaProfessor, ...dados }) });
    const j = await r.json();
    if (!j.ok) throw new Error(j.erro || 'erro');
    return j;
  }

  // lista de professores da janela que aparece antes de cada jogo
  function desenharEscolhaEmail() {
    const lista = listaEmails();
    if (lista.length === 1 && !emailEscolhido) emailEscolhido = lista[0].email;   // só um professor: já vem escolhido
    $('login-professor').innerHTML = '<option value="">Escolha o professor…</option>'
      + lista.map((x) => `<option value="${seguro(x.email)}">${seguro(x.nome)}</option>`).join('')
      + '<option value="nenhum">Não enviar relatório</option>';
    $('login-professor').value = emailEscolhido === 'nenhum' || lista.some((x) => x.email === emailEscolhido) ? emailEscolhido : '';
  }

  // traz a aba "E-mails" da planilha (ao abrir o jogo)
  async function carregarEmails() {
    if (!URL_RELATORIO) return;
    try { const { emails } = await lerDoScript('emails'); gravarJSON(CHAVE_EMAILS, emails || []); } catch (e) { /* sem internet: usa a cópia */ }
  }

  // antes de abrir o jogo escolhido, o aluno escolhe para quem vai o relatório (a última escolha já vem marcada)
  let depoisDaEscolha = null;
  function escolherProfessorE(nomeDoJogo, abrirJogo) {
    if (!listaEmails().length) { abrirJogo(); return; }   // planilha sem e-mails: abre direto
    desenharEscolhaEmail();
    depoisDaEscolha = abrirJogo;
    $('escolha-prof-titulo').textContent = `📧 ${nomeDoJogo}: para quem vai o relatório?`;
    $('escolha-prof-cancelar').hidden = !!QUIZ_DO_LINK;
    $('erro-escolha-prof').textContent = '';
    $('escolha-prof').hidden = false;
    $('login-professor').focus();
  }
  $('form-escolha-prof').onsubmit = (e) => {
    e.preventDefault();
    if (!$('login-professor').value) { $('erro-escolha-prof').textContent = 'Escolha um professor. 📧'; SOM.errado(); return; }
    emailEscolhido = $('login-professor').value;
    try { localStorage.setItem(CHAVE_EMAIL_ESCOLHIDO, emailEscolhido); } catch (err) { /* sem armazenamento */ }
    $('escolha-prof').hidden = true;
    SOM.clique();
    const abrir = depoisDaEscolha;
    depoisDaEscolha = null;
    if (abrir) abrir();
  };
  $('escolha-prof-cancelar').onclick = () => { $('escolha-prof').hidden = true; depoisDaEscolha = null; };

  // Área do professor: senha → menu com dois botões → a parte escolhida (e-mails ou questionários)
  function parteProfessor(qual) {
    $('menu-professor').hidden = qual !== 'menu';
    $('info-emails').hidden = qual !== 'emails';
    $('painel-questionarios').hidden = qual !== 'quiz';
    $('painel-links').hidden = qual !== 'links';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function telaProfessor() {
    $('form-senha-professor').hidden = false;
    parteProfessor('nenhuma');
    $('professor-senha').value = '';
    $('erro-professor').textContent = '';
    mostrar('tela-professor');
    setTimeout(() => $('professor-senha').focus(), 300);
  }

  function avisoEmail(texto, ok) {
    $('aviso-email').textContent = texto;
    $('aviso-email').classList.toggle('aviso-ok', !!ok);
  }
  const mensagemDoErro = (err, padrao) => ({
    senha: 'A planilha não aceitou a senha: confira a SENHA_PROFESSOR no script do Google.',
    email: 'Digite um e-mail válido, como nome@escola.com.',
    repetido: 'Este e-mail já está na lista.',
  }[String(err && err.message)] || padrao);

  // lista de professores com o botão de remover (grava direto na aba "E-mails")
  function listarEmailsProfessor() {
    const lista = listaEmails();
    $('lista-emails-prof').innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhum e-mail ainda: cadastre o primeiro abaixo.</p>';
    for (const x of lista) {
      const item = document.createElement('div');
      item.className = 'quiz-item';
      item.innerHTML = `<span class="quiz-item-nome">${seguro(x.nome)}</span><span class="quiz-item-qtd">${seguro(x.email)}</span>`;
      const remover = document.createElement('button');
      remover.type = 'button';
      remover.className = 'quiz-excluir';
      remover.textContent = '🗑️ Remover';
      remover.onclick = async () => {
        if (!window.confirm(`Remover ${x.nome} (${x.email}) da lista? Os alunos não poderão mais mandar relatórios para este e-mail.`)) return;
        try {
          const { emails } = await gravarNoScript({ acao: 'removerEmail', email: x.email });
          gravarJSON(CHAVE_EMAILS, emails || []);
          listarEmailsProfessor();
          avisoEmail(`${x.nome} saiu da lista. ✔`, true);
        } catch (err) { avisoEmail(mensagemDoErro(err, 'Não deu para remover (sem internet ou script desatualizado).')); }
      };
      item.append(remover);
      $('lista-emails-prof').append(item);
    }
  }

  $('form-novo-email').onsubmit = async (e) => {
    e.preventDefault();
    const nome = $('novo-email-nome').value.trim();
    const email = $('novo-email-email').value.trim().toLowerCase();
    avisoEmail('Salvando na planilha…');
    try {
      const { emails } = await gravarNoScript({ acao: 'adicionarEmail', nome, email });
      gravarJSON(CHAVE_EMAILS, emails || []);
      $('novo-email-nome').value = '';
      $('novo-email-email').value = '';
      listarEmailsProfessor();
      SOM.certo();
      avisoEmail(`${nome || email} entrou na lista! Os alunos já podem escolher. ✔`, true);
    } catch (err) { avisoEmail(mensagemDoErro(err, 'Não deu para salvar (sem internet ou script desatualizado).')); }
  };

  $('form-senha-professor').onsubmit = async (e) => {
    e.preventDefault();
    if ($('professor-senha').value.trim() !== SENHA_PROFESSOR) {
      $('erro-professor').textContent = 'Senha incorreta. 🔒';
      SOM.errado();
      return;
    }
    SOM.certo();
    senhaProfessor = $('professor-senha').value.trim();
    $('form-senha-professor').hidden = true;
    parteProfessor('menu');
    carregarEmails();   // já deixa a lista atualizada para quando abrir os e-mails
  };

  $('btn-prof-emails').onclick = async () => {
    SOM.clique();
    avisoEmail('');
    $('novo-email-nome').value = '';
    $('novo-email-email').value = '';
    parteProfessor('emails');
    listarEmailsProfessor();
    await carregarEmails();
    listarEmailsProfessor();
  };
  $('btn-prof-quiz').onclick = () => {
    SOM.clique();
    avisoQuiz('');
    $('aviso-link').textContent = '';
    parteProfessor('quiz');
    listarQuestionariosProfessor();
  };
  document.querySelectorAll('.prof-voltar').forEach((b) => { b.onclick = () => parteProfessor('menu'); });

  // ---------- Questionários da aula: cadastro pelo professor ----------
  function avisoQuiz(texto, ok) {
    $('aviso-quiz').textContent = texto;
    $('aviso-quiz').classList.toggle('aviso-ok', !!ok);
  }

  async function listarQuestionariosProfessor() {
    const caixa = $('lista-quiz-prof');
    caixa.innerHTML = '<p class="quiz-status">Buscando questionários…</p>';
    try {
      const { lista } = await lerDoScript('questionarios');
      gravarJSON(CHAVE_QUIZ_LISTA, lista);
      caixa.innerHTML = lista.length ? '' : '<p class="quiz-status">Nenhum questionário ainda. Crie o primeiro abaixo!</p>';
      for (const q of lista) {
        const item = document.createElement('div');
        item.className = 'quiz-item';
        item.innerHTML = `<span class="quiz-item-nome">${seguro(q.titulo)}</span><span class="quiz-item-qtd">${q.perguntas} pergunta${q.perguntas === 1 ? '' : 's'}</span>`;
        const copiar = document.createElement('button');
        copiar.type = 'button';
        copiar.className = 'quiz-link';
        copiar.textContent = '🔗 Copiar link';
        copiar.onclick = () => copiarLinkQuestionario(q);
        item.append(copiar);
        const apagar = document.createElement('button');
        apagar.type = 'button';
        apagar.className = 'quiz-excluir';
        apagar.textContent = '🗑️ Excluir';
        apagar.onclick = async () => {
          if (!window.confirm(`Excluir o questionário "${q.titulo}"? A aba dele será apagada da planilha.`)) return;
          try { await gravarNoScript({ acao: 'excluirQuestionario', id: q.id }); listarQuestionariosProfessor(); }
          catch (e) { avisoQuiz('Não deu para excluir (sem internet?). Tente de novo.'); }
        };
        item.append(apagar);
        caixa.append(item);
      }
    } catch (e) {
      caixa.innerHTML = '<p class="quiz-status">Não deu para buscar os questionários (sem internet ou script desatualizado).</p>';
    }
  }

  // link que abre direto um questionário (o aluno não vê os outros jogos): endereço do jogo + ?q=<id da aba>
  // ---------- Links dos jogos: ?jogo=<id> abre direto naquele jogo (os de fora usam o próprio endereço) ----------
  const JOGOS_DO_LINK = {
    ortografia: { nome: 'Jogo de Ortografia', abrir: () => telaMissoes() },
    chuva: { nome: 'Chuva de Erros', abrir: () => telaChuvaMenu() },
    matematica: { nome: 'Chuva de Matemática', abrir: () => telaMatMenu() },
    tiro: { nome: 'Tiro Certo', abrir: () => telaTiroMenu() },
    peso: { nome: 'Peso Certo', abrir: () => telaPesoMenu() },
    reflexo: { nome: 'Jogo do Reflexo', abrir: () => telaLuzesMenu(1) },
    reflexo2: { nome: 'Jogo do Reflexo Nível 2', abrir: () => telaLuzesMenu(2) },
    rotina: { nome: 'Rotina Certa', abrir: () => telaRotinaMenu() },
    fichas: { nome: 'Fichas Coloridas', abrir: () => telaFichasMenu() },
    cores: { nome: 'Somando as Cores', abrir: () => telaCoresMenu() },
    lados: { nome: 'Esquerda e Direita', abrir: () => telaLadosMenu() },
  };
  const JOGOS_DE_FORA = [
    { nome: 'ABC da Tia Ana', link: 'https://abcdaana.vercel.app/' },
    { nome: 'Desafio da Rotina', link: 'https://routinesgame.vercel.app/' },
    { nome: 'Desafio das Peças', link: 'https://nagila.vercel.app/' },
    { nome: 'Hive', link: 'https://hive-alpha-smoky.vercel.app/' },
  ];
  function listarLinksJogos() {
    $('aviso-link-jogo').textContent = '';
    const jogos = [
      ...Object.entries(JOGOS_DO_LINK).map(([id, j]) => ({ nome: j.nome, link: `${location.origin}${location.pathname}?jogo=${id}` })),
      ...JOGOS_DE_FORA.map((j) => ({ ...j, nome: `${j.nome} ↗` })),
    ];
    $('lista-links-jogos').innerHTML = '';
    for (const j of jogos) {
      const item = document.createElement('div');
      item.className = 'quiz-item';
      item.innerHTML = `<span class="quiz-item-nome">${seguro(j.nome)}</span>`;
      const copiar = document.createElement('button');
      copiar.type = 'button';
      copiar.className = 'quiz-link';
      copiar.textContent = '🔗 Copiar link';
      copiar.onclick = async () => {
        try {
          await navigator.clipboard.writeText(j.link);
          $('aviso-link-jogo').textContent = `Link de "${j.nome.replace(' ↗', '')}" copiado! Cole no WhatsApp, e-mail ou mural da turma: ${j.link}`;
          $('aviso-link-jogo').classList.add('aviso-ok');
        } catch (e) { window.prompt(`Copie o link de "${j.nome}":`, j.link); }
      };
      item.append(copiar);
      $('lista-links-jogos').append(item);
    }
  }
  $('btn-prof-links').onclick = () => { SOM.clique(); parteProfessor('links'); listarLinksJogos(); };

  const linkDoQuestionario = (id) => `${location.origin}${location.pathname}?q=${encodeURIComponent(id)}`;
  async function copiarLinkQuestionario(q) {
    const link = linkDoQuestionario(q.id);
    try {
      await navigator.clipboard.writeText(link);
      // o aviso fica logo abaixo da lista (o de "Novo questionário" pode estar fechado)
      $('aviso-link').textContent = `Link de "${q.titulo}" copiado! Cole no WhatsApp, e-mail ou mural da turma: ${link}`;
      $('aviso-link').classList.add('aviso-ok');
    } catch (e) {
      window.prompt(`Copie o link de "${q.titulo}":`, link);
    }
  }

  // editor de perguntas: um bloco por pergunta (1 certa e até 3 erradas)
  function blocoPergunta(q = { pergunta: '', certa: '', erradas: [] }) {
    const div = document.createElement('div');
    div.className = 'quiz-bloco';
    const n = $('quiz-editor').children.length + 1;
    div.innerHTML = `<div class="quiz-bloco-topo"><span>Pergunta ${n}</span><button class="quiz-tirar" type="button">✕ tirar</button></div>
      <input class="q-pergunta" maxlength="300" placeholder="Pergunta" value="${seguro(q.pergunta)}">
      <input class="q-certa certa" maxlength="160" placeholder="✔ Resposta certa" value="${seguro(q.certa)}">
      ${[0, 1, 2].map((i) => `<input class="q-errada errada" maxlength="160" placeholder="✘ Resposta errada ${i + 1}" value="${seguro(q.erradas[i] || '')}">`).join('')}`;
    div.querySelector('.quiz-tirar').onclick = () => { div.remove(); renumerarPerguntas(); };
    $('quiz-editor').append(div);
  }
  function renumerarPerguntas() {
    [...$('quiz-editor').children].forEach((b, i) => { b.querySelector('.quiz-bloco-topo span').textContent = `Pergunta ${i + 1}`; });
  }
  $('btn-quiz-mais').onclick = () => blocoPergunta();

  // planilha enviada pelo professor: A pergunta, B certa, C a E erradas (a primeira linha pode ser cabeçalho)
  function linhasParaPerguntas(linhas) {
    const limpas = linhas.map((l) => (l || []).map((c) => String(c == null ? '' : c).trim()));
    if (limpas.length && /pergunta/i.test(limpas[0][0] || '')) limpas.shift();
    return limpas.filter((l) => l[0] && l[1] && (l[2] || l[3] || l[4]))
      .filter((l) => !(/^pergunta$/i.test(l[0]) && /resposta|certa/i.test(l[1])))   // cabeçalho repetido
      .map((l) => ({ pergunta: l[0], certa: l[1], erradas: [l[2], l[3], l[4]].filter(Boolean) }));
  }
  function lerCSV(texto) {
    const sep = (texto.split('\n')[0].match(/;/g) || []).length > (texto.split('\n')[0].match(/,/g) || []).length ? ';' : texto.includes('\t') ? '\t' : ',';
    const linhas = [];
    let linha = [], campo = '', aspas = false;
    for (let i = 0; i < texto.length; i++) {
      const c = texto[i];
      if (aspas) {
        if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
      } else if (c === '"') aspas = true;
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && texto[i + 1] === '\n') i++; linha.push(campo); linhas.push(linha); linha = []; campo = ''; }
      else campo += c;
    }
    if (campo || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  }
  // a biblioteca de planilhas (.xlsx) só é baixada quando o professor envia uma
  function carregarLeitorXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, falha) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => ok(window.XLSX);
      s.onerror = falha;
      document.head.append(s);
    });
  }
  $('quiz-arquivo').onchange = async (e) => {
    const arquivo = e.target.files[0];
    if (!arquivo) return;
    avisoQuiz('Lendo a planilha…');
    try {
      let linhas;
      if (/\.(csv|txt)$/i.test(arquivo.name)) linhas = lerCSV(await arquivo.text());
      else {
        const XLSX = await carregarLeitorXLSX();
        const livro = XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
        linhas = XLSX.utils.sheet_to_json(livro.Sheets[livro.SheetNames[0]], { header: 1, defval: '' });
      }
      const perguntas = linhasParaPerguntas(linhas);
      if (!perguntas.length) { avisoQuiz('Não achei perguntas: confira as colunas (A pergunta, B certa, C a E erradas).'); return; }
      $('quiz-editor').innerHTML = '';
      perguntas.forEach((q) => blocoPergunta(q));
      if (!$('quiz-nome').value.trim()) $('quiz-nome').value = arquivo.name.replace(/\.[^.]+$/, '');
      avisoQuiz(`${perguntas.length} pergunta${perguntas.length === 1 ? '' : 's'} lida${perguntas.length === 1 ? '' : 's'}. Confira abaixo e toque em Salvar.`, true);
    } catch (err) {
      avisoQuiz('Não consegui ler o arquivo. Use .xlsx ou .csv (e internet para .xlsx).');
    }
    e.target.value = '';
  };

  $('btn-quiz-salvar').onclick = async () => {
    const titulo = $('quiz-nome').value.trim();
    if (!titulo) { avisoQuiz('Dê um nome ao questionário.'); $('quiz-nome').focus(); return; }
    const perguntas = [...$('quiz-editor').children].map((b) => ({
      pergunta: b.querySelector('.q-pergunta').value.trim(),
      certa: b.querySelector('.q-certa').value.trim(),
      erradas: [...b.querySelectorAll('.q-errada')].map((i) => i.value.trim()).filter(Boolean),
    })).filter((q) => q.pergunta || q.certa);
    const incompleta = perguntas.findIndex((q) => !q.pergunta || !q.certa || !q.erradas.length);
    if (!perguntas.length) { avisoQuiz('Adicione pelo menos uma pergunta.'); return; }
    if (incompleta >= 0) { avisoQuiz(`A pergunta ${incompleta + 1} precisa do texto, da resposta certa e de pelo menos uma errada.`); return; }
    avisoQuiz('Salvando na planilha…');
    try {
      await gravarNoScript({ acao: 'salvarQuestionario', titulo, perguntas });
      SOM.certo();
      avisoQuiz(`Questionário "${titulo}" salvo! Os alunos já podem jogar. ✔`, true);
      $('quiz-nome').value = '';
      $('quiz-editor').innerHTML = '';
      listarQuestionariosProfessor();
    } catch (err) {
      avisoQuiz(String(err.message) === 'senha' ? 'A planilha não aceitou a senha: confira a SENHA_PROFESSOR no script.' : 'Não deu para salvar (sem internet ou script desatualizado). Tente de novo.');
    }
  };

  // missão especial com as palavras de todas as missões, misturadas
  // ---------- Níveis do Jogo de Ortografia ----------
  // O aluno escolhe só o nível; cada rodada mistura palavras de várias regras.
  // Fácil: as palavras com figura das missões. Médio e Difícil: as palavras da Chuva de Erros
  // (o jeito certo e o errado), em perguntas de escolher a certa e de achar o "monstro" escrito errado.
  const PERGUNTAS_POR_RODADA = 20;
  // as categorias da Chuva viram regras do Jogo de Ortografia (o mesmo id agrupa os dois tipos no relatório)
  const regraDaChuva = (c, tipo) => ({ ...c, id: 'c-' + c.id, tipo });
  const paresDaChuva = (filtro) => CHUVA_CATEGORIAS.flatMap((c) => c.pares.filter(([certa]) => filtro(c, certa)).map(([certa, errada]) => ({ c, certa, errada })));
  const ehDificil = (c, certa) => c.id === 'escola' || c.id === 'dificeis' || certa.length >= 10;

  // uma pergunta a partir de um par da Chuva: escolher a certa (2 opções) ou achar o monstro entre 3 palavras
  function perguntaDoPar(par, todos, detetive) {
    if (!detetive) return { m: regraDaChuva(par.c, 'escolher'), p: { opcoes: [par.certa, par.errada], resp: par.certa, fig: '✍️' } };   // sem figura própria: ícone neutro
    // duas outras palavras certas, sem repetir (algumas aparecem em mais de uma regra, como "também")
    const outras = embaralhar([...new Set(todos.map((x) => x.certa))].filter((w) => w !== par.certa)).slice(0, 2);
    return { m: regraDaChuva(par.c, 'detetive'),
      p: { palavras: [par.errada, ...outras], errada: par.errada, certa: par.certa, dica: par.c.regra } };
  }

  const NIVEIS_ORTO = [
    { id: 'orto-facil', titulo: 'Fácil', icone: '🌱', cor: '#2e9e5b', mistura: true,
      descricao: 'Palavras curtas com figura',
      regra: 'Palavras curtas, com figura: <b>S ou SS, Ç ou C, R ou RR, M ou N, G ou J, X ou CH</b>, acentos e o <b>Detetive de Erros</b>. Olhe a figura, ouça a palavra e escolha!',
      fila: () => MISSOES.flatMap((m) => m.perguntas.map((p) => ({ m, p }))) },
    { id: 'orto-medio', titulo: 'Médio', icone: '🌿', cor: '#e0a100', mistura: true,
      descricao: 'Palavras do dia a dia',
      regra: 'Palavras do dia a dia que muita gente erra: <b>S, SS, C, Ç e Z</b>, <b>G e J</b>, <b>X e CH</b>, <b>R e RR</b>, <b>M antes de P e B</b>, <b>H inicial</b> e <b>acentos</b>. Escolha o jeito certo ou ache o monstro!',
      fila: () => { const pares = paresDaChuva((c, certa) => !ehDificil(c, certa)); return pares.map((par) => perguntaDoPar(par, pares, Math.random() < 0.3)); } },
    { id: 'orto-dificil', titulo: 'Difícil', icone: '🌳', cor: '#e53935', mistura: true,
      descricao: 'Palavras longas e difíceis',
      regra: 'Palavras longas e difíceis, da escola e do dia a dia: <b>exceção</b>, <b>conhecimento</b>, <b>helicóptero</b>... Leia letra por letra antes de escolher!',
      fila: () => { const pares = paresDaChuva(ehDificil); return pares.map((par) => perguntaDoPar(par, pares, Math.random() < 0.4)); } },
  ];

  function telaMissoes() {
    const estrelas = lerEstrelas();
    $('grade-missoes').innerHTML = NIVEIS_ORTO.map((n) => `
      <button class="missao" style="--c:${n.cor}" data-id="${n.id}" type="button">
        <span class="missao-icone">${n.icone}</span>
        <span class="missao-titulo">${n.titulo}</span>
        <span class="missao-descricao">${n.descricao}</span>
        <span class="missao-estrelas">${estrelasTexto(estrelas[n.id] || 0)}</span>
      </button>`).join('');
    const total = NIVEIS_ORTO.reduce((s, n) => s + (estrelas[n.id] || 0), 0);
    $('total-estrelas').textContent = `${aluno}, você já ganhou ${total} de ${NIVEIS_ORTO.length * 3} estrelas ⭐`;
    mostrar('tela-missoes');
  }

  $('grade-missoes').onclick = (e) => {
    const b = e.target.closest('.missao'); if (!b) return;
    SOM.clique();
    const n = NIVEIS_ORTO.find((x) => x.id === b.dataset.id);
    telaRegra({ ...n, titulo: `Ortografia – nível ${n.titulo}` });
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
    mascote('davi-regra', 'oi');
    frase('regra-' + m.id);   // o Davi lê o segredo da missão (se gravado)
    mostrar('tela-regra');
  }

  function comecarMissao() {
    fila = embaralhar(missao.fila()).slice(0, PERGUNTAS_POR_RODADA);
    idx = 0; resultados = [];
    $('barra-titulo').textContent = `${missao.icone} ${missao.titulo}`;
    $('tela-pergunta').style.setProperty('--c', missao.cor);
    $('btn-terminar').hidden = true;
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
    $('etiqueta-missao').hidden = !missao.mistura;
    $('etiqueta-missao').textContent = `${m.icone} ${m.titulo}`;
    $('etiqueta-missao').style.setProperty('--c', m.cor);
    mascote('davi-jogo', 'pensando');   // enquanto o aluno analisa a questão

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
      balao(m.id === 'acentos' || m.id === 'c-acentos' ? 'Olhe bem os <b>acentos</b> e o <b>til</b>! ✨' : 'Olhe bem <b>cada letra</b>! Qual está escrita certa? ✨');
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
      mascote('davi-jogo', 'acertou');
      falar(certa);
      $('btn-proxima').textContent = idx === fila.length - 1 ? 'Ver resultado ⭐' : 'Próxima ➜';
      $('btn-proxima').hidden = false;
      $('btn-proxima').focus({ preventScroll: true });
    } else {
      SOM.errado();
      errosNaPergunta.push(comoEscreveu(item, escolha));
      botao.classList.add('errada');
      botao.disabled = true;
      mascote('davi-jogo', 'triste');
      // depois de um tempinho, volta a pensar junto com a criança
      const pergunta = idx;
      clearTimeout(mascote.timer);
      mascote.timer = setTimeout(() => {
        if (idx === pergunta && $('btn-proxima').hidden && $('tela-pergunta').classList.contains('ativa')) mascote('davi-jogo', 'pensando');
      }, 2600);
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

  // ---------- Chuva de Erros ----------
  // As palavras caem na arena e o aluno toca só nas certas (ou só nas erradas, se escolher).
  // Cada palavra fica de 2 a 5 segundos na tela: quanto mais rápido o aluno pega, mais rápido elas caem;
  // quando ele erra ou deixa passar, a chuva fica mais lenta.
  const CHUVA = { PALAVRAS: 30, VIDA_MAX: 5, VIDA_MIN: 2, RODAPE: 34 };
  const CHUVA_TODAS = { id: 'todas', titulo: 'Todas as palavras', icone: '🌟', cor: '#1fa2b0' };
  let chuvaModo = 'certas', chuvaCat = 'todas';
  let chuva = null;   // a rodada em andamento
  const limitar = (v, min, max) => Math.min(max, Math.max(min, v));

  function telaChuvaMenu() {
    pararChuva();
    mascote('davi-chuva', 'oi');
    $('chuva-categorias').innerHTML = [CHUVA_TODAS, ...CHUVA_CATEGORIAS].map((c) =>
      `<button class="chuva-cat${c.id === chuvaCat ? ' ativo' : ''}" type="button" data-id="${c.id}" style="--c:${c.cor}">${c.icone} ${c.titulo}</button>`).join('');
    document.querySelectorAll('.chuva-modo').forEach((b) => b.classList.toggle('ativo', b.dataset.modo === chuvaModo));
    mostrar('tela-chuva-menu');
  }

  $('chuva-modos').onclick = (e) => {
    const b = e.target.closest('.chuva-modo'); if (!b) return;
    SOM.clique();
    chuvaModo = b.dataset.modo;
    document.querySelectorAll('.chuva-modo').forEach((x) => x.classList.toggle('ativo', x === b));
  };
  $('chuva-categorias').onclick = (e) => {
    const b = e.target.closest('.chuva-cat'); if (!b) return;
    SOM.clique();
    chuvaCat = b.dataset.id;
    document.querySelectorAll('.chuva-cat').forEach((x) => x.classList.toggle('ativo', x === b));
  };

  function comecarChuva() {
    pararChuva();
    const cat = chuvaCat === 'todas' ? CHUVA_TODAS : CHUVA_CATEGORIAS.find((c) => c.id === chuvaCat);
    const cats = chuvaCat === 'todas' ? CHUVA_CATEGORIAS : [cat];
    const pares = embaralhar(cats.flatMap((m) => m.pares.map(([certa, errada]) => ({ m, certa, errada }))));
    // metade cai do jeito certo e metade do jeito errado
    const filaChuva = embaralhar(pares.slice(0, CHUVA.PALAVRAS).map((p, i) => ({ ...p, mostraCerta: i % 2 === 0 })));
    const pegarCertas = chuvaModo === 'certas';
    missao = { id: 'chuva-' + chuvaModo, chuva: true, icone: '🌧️', cor: '#e53935',
      titulo: `Chuva de Erros: pegar as ${pegarCertas ? 'certas' : 'erradas'} (${cat.titulo})` };
    resultados = [];
    chuva = { fila: filaChuva, idx: 0, gotas: [], vida: CHUVA.VIDA_MAX, proxima: 0, t: 0, ultimo: 0,
      pontos: 0, combo: 0, alvos: 0, pegos: 0, rodando: false, pegarCertas };
    $('chuva-alvo').textContent = pegarCertas ? '✅ Toque nas CERTAS' : '👾 Toque nas ERRADAS';
    hudChuva();
    mostrar('tela-chuva');
    // contagem 3, 2, 1 antes de começar
    const rodada = chuva;
    let n = 3;
    const contar = () => {
      if (chuva !== rodada) return;
      if (n === 0) {
        $('chuva-contagem').textContent = '';
        rodada.rodando = true;
        rodada.ultimo = performance.now();
        requestAnimationFrame(quadroChuva);
        return;
      }
      $('chuva-contagem').textContent = n--;
      SOM.clique();
      setTimeout(contar, 700);
    };
    contar();
  }

  function pararChuva() {
    if (chuva) chuva.rodando = false;
    chuva = null;
    $('chuva-contagem').textContent = '';
    $('chuva-arena').querySelectorAll('.gota, .ponto-voando').forEach((g) => g.remove());
  }

  function hudChuva() {
    const restam = chuva.fila.length - chuva.idx + chuva.gotas.length;
    $('chuva-pontos').textContent = chuva.pontos;
    $('chuva-combo').textContent = chuva.combo >= 3 ? ` 🔥x${chuva.combo}` : '';
    $('chuva-restam').textContent = `Palavras: ${restam}`;
    $('chuva-velocidade').textContent = `⚡ ${chuva.vida.toFixed(1).replace('.', ',')} s`;
  }

  function soltarGota() {
    const item = chuva.fila[chuva.idx++];
    const arena = $('chuva-arena');
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'gota';
    el.textContent = item.mostraCerta ? item.certa : item.errada;
    arena.append(el);
    const w = el.offsetWidth, h = el.offsetHeight, W = arena.clientWidth;
    // procura um lugar que não fique em cima das palavras que acabaram de cair
    let x = 0;
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      x = 8 + Math.random() * Math.max(0, W - w - 16);
      const livre = chuva.gotas.every((o) => (chuva.t - o.nasceu) / o.vida > 0.35 || x + w < o.x - 6 || x > o.x + o.w + 6);
      if (livre) break;
    }
    const g = { ...item, el, x, y: -h, w, h, nasceu: chuva.t, vida: chuva.vida, alvo: item.mostraCerta === chuva.pegarCertas };
    if (g.alvo) chuva.alvos++;
    el.style.transform = `translate(${x}px, ${-h}px)`;
    el.onpointerdown = (e) => { e.preventDefault(); tocarGota(g); };
    chuva.gotas.push(g);
    chuva.proxima = chuva.t + chuva.vida * (0.4 + Math.random() * 0.2);
  }

  function tirarGota(g, depois) {
    g.fim = true;
    chuva.gotas = chuva.gotas.filter((o) => o !== g);
    setTimeout(() => g.el.remove(), depois);
  }

  function pontoVoando(g, texto, cor) {
    const p = document.createElement('span');
    p.className = 'ponto-voando';
    p.textContent = texto;
    p.style.color = cor;
    p.style.left = `${g.x + g.w / 2 - 20}px`;
    p.style.top = `${g.y}px`;
    $('chuva-arena').append(p);
    setTimeout(() => p.remove(), 700);
  }

  function tocarGota(g) {
    if (g.fim || !chuva || !chuva.rodando) return;
    tirarGota(g, 400);
    if (g.alvo) {
      const reacao = chuva.t - g.nasceu;
      const ganhou = 10 + Math.round((1 - reacao / g.vida) * 10) + Math.min(chuva.combo, 10);
      chuva.pontos += ganhou;
      chuva.combo++;
      chuva.pegos++;
      // pegou rápido: as próximas palavras ficam menos tempo na tela
      chuva.vida = limitar(chuva.vida * 0.7 + limitar(reacao * 2.5, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX) * 0.3, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX);
      g.el.classList.add('pegou');
      pontoVoando(g, `+${ganhou}`, '#1d6b3d');
      resultados.push({ m: g.m, certa: g.certa, erros: [] });
      SOM.certo();
    } else {
      chuva.combo = 0;
      chuva.vida = limitar(chuva.vida + 0.25, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX);
      g.el.classList.add('errou');
      pontoVoando(g, chuva.pegarCertas ? '✗ errada!' : '✗ está certa!', '#c62828');
      $('chuva-arena').classList.remove('tremer');
      void $('chuva-arena').offsetWidth;
      $('chuva-arena').classList.add('tremer');
      resultados.push({ m: g.m, certa: g.certa, erros: [chuva.pegarCertas ? g.errada : 'marcou como errada'] });
      SOM.errado();
    }
    hudChuva();
  }

  // a palavra chegou ao chão sem ser tocada
  function gotaEscapou(g) {
    tirarGota(g, 0);
    if (!g.alvo) return;   // não era para pegar: o aluno acertou em deixar passar
    chuva.combo = 0;
    chuva.vida = limitar(chuva.vida + 0.3, CHUVA.VIDA_MIN, CHUVA.VIDA_MAX);
    resultados.push({ m: g.m, certa: g.certa, erros: [chuva.pegarCertas ? 'deixou passar' : `${g.errada} (deixou passar)`] });
    hudChuva();
  }

  function quadroChuva(agora) {
    if (!chuva || !chuva.rodando) return;
    chuva.t += Math.min(0.05, (agora - chuva.ultimo) / 1000);   // aba escondida: a chuva espera
    chuva.ultimo = agora;
    if (chuva.idx < chuva.fila.length && chuva.t >= chuva.proxima) { soltarGota(); hudChuva(); }
    const chao = $('chuva-arena').clientHeight - CHUVA.RODAPE;
    for (const g of [...chuva.gotas]) {
      const p = (chuva.t - g.nasceu) / g.vida;
      if (p >= 1) { gotaEscapou(g); continue; }
      g.y = -g.h + p * chao;
      g.el.style.transform = `translate(${g.x}px, ${g.y}px)`;
      g.el.style.opacity = p > 0.85 ? (1 - p) / 0.15 : 1;   // some aos poucos no fim
    }
    if (chuva.idx >= chuva.fila.length && !chuva.gotas.length) { terminarChuva(); return; }
    requestAnimationFrame(quadroChuva);
  }

  function terminarChuva() {
    const { pegos, alvos, pontos, pegarCertas } = chuva;
    pararChuva();
    fimDaMissao();
    const n = ultimoRelatorio.estrelas;
    $('fim-titulo').textContent = n === 3 ? 'Chuva perfeita!' : 'Fim da chuva!';
    $('fim-texto').textContent = `${aluno}, você pegou ${pegos} de ${alvos} palavras ${pegarCertas ? 'certas' : 'erradas'} e fez ${pontos} pontos!`;
  }

  // ---------- Chuva de Matemática ----------
  // Uma conta cai de cada vez e o aluno escolhe a resposta entre 4 opções antes que ela chegue ao chão.
  // Acertou: a próxima conta fica mais difícil (sobe um nível). Errou ou deixou cair: fica mais fácil.
  const MAT = { CONTAS: 20, NIVEL_MAX: 10, PAUSA: 1300 };
  const OPERACOES = {
    soma: { id: 'soma', titulo: 'Adição', icone: '➕', sinal: '+', cor: '#1565c0',
      regra: 'Na <b>adição</b> juntamos quantidades. Comece pelo número maior e conte para frente; com números grandes, some primeiro as <b>unidades</b> e depois as <b>dezenas</b>.' },
    sub: { id: 'sub', titulo: 'Subtração', icone: '➖', sinal: '−', cor: '#e53935',
      regra: 'Na <b>subtração</b> tiramos uma quantidade da outra. Conte para trás a partir do número maior, ou pense <b>quanto falta</b> do menor para chegar ao maior.' },
    mult: { id: 'mult', titulo: 'Multiplicação', icone: '✖️', sinal: '×', cor: '#e0a100',
      regra: 'Multiplicar é somar parcelas iguais: <b>3 × 4</b> é 4 + 4 + 4. Treine a <b>tabuada</b> e lembre que a ordem não muda o resultado (3 × 4 = 4 × 3).' },
    div: { id: 'div', titulo: 'Divisão', icone: '➗', sinal: '÷', cor: '#2e7d32',
      regra: 'Dividir é repartir em <b>partes iguais</b>. Para achar 12 ÷ 3, pense: que número <b>vezes 3</b> dá 12? A tabuada ajuda!' },
  };
  // tamanho dos números em cada nível (1 a 10)
  const FAIXAS = [[1, 5], [1, 9], [2, 15], [5, 20], [10, 40], [10, 60], [20, 99], [50, 150], [100, 500], [100, 999]];
  // fatores da multiplicação (e da divisão) em cada nível
  const FATORES = [[[1, 2], [1, 5]], [[2, 5], [1, 5]], [[2, 5], [1, 10]], [[2, 6], [2, 10]], [[2, 9], [2, 10]],
    [[3, 10], [3, 10]], [[11, 20], [2, 5]], [[11, 30], [2, 9]], [[11, 20], [11, 15]], [[100, 300], [2, 9]]];
  let matOps = new Set(['soma']);
  let mat = null;   // a rodada em andamento
  const entre = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

  function gerarConta(op, nivel) {
    const [min, max] = FAIXAS[nivel - 1];
    const [f1, f2] = FATORES[nivel - 1];
    let a, b, res, perto;   // perto: um erro comum para usar entre as opções
    if (op === 'soma') { a = entre(min, max); b = entre(min, max); res = a + b; perto = Math.abs(a - b); }
    else if (op === 'sub') { const x = entre(min, max), y = entre(min, max); a = Math.max(x, y); b = Math.min(x, y); res = a - b; perto = a + b; }
    else if (op === 'mult') { a = entre(...f1); b = entre(...f2); if (Math.random() < 0.5) [a, b] = [b, a]; res = a * b; perto = a * (b + 1); }
    else { res = entre(...f1); b = Math.max(nivel > 1 ? 2 : 1, entre(...f2)); a = res * b; perto = res + b; }
    return { op: OPERACOES[op], a, b, res, perto, texto: `${a} ${OPERACOES[op].sinal} ${b}` };
  }

  // 4 opções: a certa e três parecidas com ela
  function opcoesDaConta(c) {
    const passo = c.res >= 30 ? 10 : 2;
    const parecidas = embaralhar([c.res + 1, c.res - 1, c.res + passo, c.res - passo, c.res + entre(3, 5), c.res - entre(3, 5)]);
    const erradas = [];
    for (const v of [c.perto, ...parecidas]) {
      if (v >= 0 && v !== c.res && !erradas.includes(v) && erradas.length < 3) erradas.push(v);
    }
    return embaralhar([c.res, ...erradas]);
  }

  function telaMatMenu() {
    pararMat();
    mascote('davi-mat', 'oi');
    $('mat-erro').textContent = '';
    $('mat-ops').innerHTML = Object.values(OPERACOES).map((o) =>
      `<button class="chuva-modo${matOps.has(o.id) ? ' ativo' : ''}" type="button" data-op="${o.id}" style="--c:${o.cor}">`
      + `<span class="mat-op-sinal">${o.sinal}</span>${o.titulo}</button>`).join('');
    mostrar('tela-mat-menu');
  }

  $('mat-ops').onclick = (e) => {
    const b = e.target.closest('.chuva-modo'); if (!b) return;
    SOM.clique();
    if (matOps.has(b.dataset.op)) matOps.delete(b.dataset.op); else matOps.add(b.dataset.op);
    b.classList.toggle('ativo', matOps.has(b.dataset.op));
    $('mat-erro').textContent = '';
  };

  function comecarMat() {
    if (!matOps.size) { $('mat-erro').textContent = 'Escolha pelo menos uma operação.'; SOM.errado(); return; }
    pararMat();
    const ops = Object.values(OPERACOES).filter((o) => matOps.has(o.id));
    missao = { id: 'matematica', matematica: true, icone: '🔢', cor: '#0b3d91',
      titulo: `Chuva de Matemática (${ops.map((o) => o.titulo).join(', ')})` };
    resultados = [];
    mat = { ops: ops.map((o) => o.id), nivel: 1, nivelMax: 1, feitas: 0, pontos: 0, combo: 0, acertos: 0,
      conta: null, t: 0, ultimo: 0, rodando: false };
    $('mat-conta').hidden = true;
    $('mat-respostas').innerHTML = '';
    hudMat();
    mostrar('tela-mat');
    const rodada = mat;
    let n = 3;
    const contar = () => {
      if (mat !== rodada) return;
      if (n === 0) {
        $('mat-contagem').textContent = '';
        rodada.rodando = true;
        rodada.ultimo = performance.now();
        proximaConta();
        requestAnimationFrame(quadroMat);
        return;
      }
      $('mat-contagem').textContent = n--;
      SOM.clique();
      setTimeout(contar, 700);
    };
    contar();
  }

  function pararMat() {
    if (mat) mat.rodando = false;
    mat = null;
    $('mat-contagem').textContent = '';
  }

  function hudMat() {
    $('mat-nivel').textContent = `🧠 Nível ${mat.nivel}`;
    $('mat-pontos').textContent = mat.pontos;
    $('mat-combo').textContent = mat.combo >= 3 ? ` 🔥x${mat.combo}` : '';
    $('mat-restam').textContent = `Conta ${Math.min(mat.feitas, MAT.CONTAS)} de ${MAT.CONTAS}`;
    $('mat-tempo').textContent = mat.conta ? `⏱ ${mat.conta.vida.toFixed(0)} s` : '';
  }

  function proximaConta() {
    if (!mat || !mat.rodando) return;
    if (mat.feitas >= MAT.CONTAS) { terminarMat(); return; }
    const c = gerarConta(sortear(mat.ops), mat.nivel);
    c.vida = 6 + mat.nivel * 0.6;   // contas mais difíceis caem mais devagar
    c.nivel = mat.nivel;
    c.nasceu = mat.t;
    mat.conta = c;
    mat.feitas++;
    const el = $('mat-conta');
    el.className = 'conta-caindo';
    el.textContent = `${c.texto} = ?`;
    el.style.transform = 'translate(-50%, -100%)';
    el.hidden = false;
    $('mat-respostas').innerHTML = '';
    opcoesDaConta(c).forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mat-resposta';
      b.textContent = v;
      b.dataset.tecla = i + 1;
      b.onclick = () => responderMat(v, b);
      $('mat-respostas').append(b);
    });
    hudMat();
  }

  function responderMat(valor, botao) {
    const c = mat && mat.conta;
    if (!c || c.respondida || !mat.rodando) return;
    c.respondida = true;
    const botoes = [...document.querySelectorAll('#mat-respostas .mat-resposta')];
    botoes.forEach((b) => { b.disabled = true; });
    const certoEl = botoes.find((b) => Number(b.textContent) === c.res);
    const el = $('mat-conta');
    el.textContent = `${c.texto} = ${c.res}`;
    if (valor === c.res) {
      const rapidez = 1 - (mat.t - c.nasceu) / c.vida;
      const ganhou = 10 * mat.nivel + Math.round(rapidez * 10) + Math.min(mat.combo, 10);
      mat.pontos += ganhou;
      mat.combo++;
      mat.acertos++;
      mat.nivel = Math.min(MAT.NIVEL_MAX, mat.nivel + 1);
      mat.nivelMax = Math.max(mat.nivelMax, mat.nivel);
      botao.classList.add('certa');
      el.classList.add('acertou');
      resultados.push({ m: c.op, certa: `${c.texto} = ${c.res}`, erros: [], nivel: c.nivel });
      SOM.certo();
    } else {
      mat.combo = 0;
      mat.nivel = Math.max(1, mat.nivel - 1);
      if (botao) botao.classList.add('errada');
      if (certoEl) certoEl.classList.add('certa');
      botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
      el.classList.add('errou');
      resultados.push({ m: c.op, certa: `${c.texto} = ${c.res}`, erros: [valor == null ? 'não respondeu a tempo' : `${c.texto} = ${valor}`], nivel: c.nivel });
      SOM.errado();
    }
    hudMat();
    const rodada = mat;
    setTimeout(() => { if (mat === rodada) proximaConta(); }, MAT.PAUSA);
  }

  function quadroMat(agora) {
    if (!mat || !mat.rodando) return;
    mat.t += Math.min(0.05, (agora - mat.ultimo) / 1000);   // aba escondida: a conta espera
    mat.ultimo = agora;
    const c = mat.conta;
    if (c && !c.respondida) {
      const p = (mat.t - c.nasceu) / c.vida;
      const el = $('mat-conta');
      if (p >= 1) responderMat(null, null);   // chegou ao chão
      else el.style.transform = `translate(-50%, ${p * ($('mat-arena').clientHeight - 34 - el.offsetHeight)}px)`;
    }
    requestAnimationFrame(quadroMat);
  }

  function terminarMat() {
    const { acertos, feitas, pontos, nivelMax } = mat;
    pararMat();
    fimDaMissao();
    const n = ultimoRelatorio.estrelas;
    $('fim-titulo').textContent = n === 3 ? 'Chuva perfeita!' : 'Fim da chuva!';
    $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} contas, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
  }

  // teclas 1 a 4 escolhem a resposta no computador
  document.addEventListener('keydown', (e) => {
    if (!mat || !$('tela-mat').classList.contains('ativa')) return;
    const b = document.querySelector(`#mat-respostas .mat-resposta[data-tecla="${e.key}"]`);
    if (b && !b.disabled) b.click();
  });

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
    // todas as regras que apareceram, com quantas deram certo de primeira e quantas tiveram erro
    const porRegra = [];
    for (const r of resultados) {
      let x = porRegra.find((o) => o.m.id === r.m.id);
      if (!x) { x = { m: r.m, total: 0, erros: 0 }; porRegra.push(x); }
      x.total++;
      if (r.erros.length) x.erros++;
    }
    porRegra.sort((a, b) => b.erros - a.erros || b.total - a.total);
    const niveis = resultados.filter((r) => r.nivel).map((r) => ({ n: r.nivel, ok: !r.erros.length }));
    // tempo de resposta (só no Jogo do Reflexo): t em segundos, null quando não respondeu
    const tempos = resultados.filter((r) => 'tempo' in r).map((r) => ({ t: r.tempo == null ? null : Math.round(r.tempo * 10) / 10, ok: !r.erros.length }));
    return { respondidas, dePrimeiraN, comErro, grupos, porRegra, niveis, tempos };
  }

  // ---------- Tiro Certo ----------
  // O círculo é um transferidor: 0° à esquerda (onde fica o canhão), 90° em cima, 180° à direita e 270° embaixo.
  // Um míssil entra pela borda numa marca de ângulo e voa em linha reta até o canhão. O aluno escolhe
  // entre 4 ângulos; o canhão mira naquela marca do círculo e só o ângulo por onde o míssil entrou o derruba.
  // Começa com 4 tiros, cada acerto vale +1 tiro. Acabou o tiro ou o míssil chegou ao canhão: fim de jogo.
  const TIRO = { MISSEIS: 20, TIROS: 4, NIVEL_MAX: 5 };
  const TIPOS_ANGULO = [
    { id: 'a90', passo: 90, titulo: 'Ângulos retos (90°)', icone: '📐', cor: '#1565c0',
      regra: 'Os ângulos retos dividem o círculo em 4 partes iguais: <b>90°</b> em cima, <b>180°</b> à direita e <b>270°</b> embaixo. O canhão fica no <b>0°</b>.' },
    { id: 'a45', passo: 45, titulo: 'Múltiplos de 45°', icone: '🍕', cor: '#e53935',
      regra: 'Metade de 90° é <b>45°</b>. Entre 0° e 90° fica o 45°; entre 90° e 180°, o <b>135°</b>; depois <b>225°</b> e <b>315°</b>: é só ir somando 45°.' },
    { id: 'a30', passo: 30, titulo: 'Múltiplos de 30°', icone: '🕐', cor: '#e0a100',
      regra: 'Cada ângulo reto tem 3 partes de <b>30°</b>: 30°, 60°, 90°. Use as marcas maiores do transferidor e conte de 30 em 30.' },
    { id: 'a15', passo: 15, titulo: 'Múltiplos de 15°', icone: '🧭', cor: '#2e7d32',
      regra: 'Entre duas marcas de 30° fica a de <b>15°</b>. Ache a marca de 30° mais perto do míssil e some ou tire 15°.' },
    { id: 'a10', passo: 10, titulo: 'De 10 em 10 graus', icone: '🎯', cor: '#0b3d91',
      regra: 'As marquinhas pequenas valem <b>10°</b>. Ache a marca de 30° mais perto do míssil e conte de 10 em 10.' },
  ];
  const SPRITES = {};
  for (const nome of ['canhao-cano', 'canhao-carreta', 'missil', 'bala', 'explosao', 'municao']) {
    SPRITES[nome] = new Image();
    SPRITES[nome].src = `assets/tiro/${nome}.png`;
  }
  let tiro = null;   // a partida em andamento

  // ângulos que podem aparecer num nível (longe demais do canhão não vale: o míssil chegaria na hora)
  const angulosDoNivel = (passo) => Array.from({ length: Math.floor(359 / passo) }, (_, i) => (i + 1) * passo).filter((a) => a >= 30 && a <= 330);

  function opcoesDoAngulo(certo, passo) {
    const validos = angulosDoNivel(passo === 90 ? 45 : passo);
    const parecidos = embaralhar([certo + passo, certo - passo, certo + 2 * passo, certo - 2 * passo, certo + 90, certo - 90, certo + 180]);
    const erradas = [];
    for (const a of [360 - certo, ...parecidos, ...embaralhar(validos)]) {   // 360 - x: a troca de sentido mais comum
      if (a !== certo && validos.includes(a) && !erradas.includes(a) && erradas.length < 3) erradas.push(a);
    }
    return embaralhar([certo, ...erradas]);
  }

  function telaTiroMenu() {
    pararTiro();
    mascote('davi-tiro', 'oi');
    mostrar('tela-tiro-menu');
  }

  // geometria do transferidor no canvas (em pixels de CSS)
  function medidasTiro() {
    const cv = $('tiro-canvas');
    const S = cv.clientWidth || 400;
    const dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(S * dpr)) { cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr); }
    const R = S * 0.36, cx = S * 0.52, cy = S * 0.5;
    const ponto = (graus, raio = R) => {
      const a = (graus * Math.PI) / 180;
      return { x: cx - Math.cos(a) * raio, y: cy - Math.sin(a) * raio };
    };
    return { cv, S, dpr, R, cx, cy, ponto, k: S / 210, canhao: ponto(0) };
  }

  function comecarTiro() {
    pararTiro();
    missao = { id: 'tiro', tiro: true, icone: '🎯', cor: '#0a8fc2', titulo: 'Tiro Certo (ângulos)' };
    resultados = [];
    tiro = { nivel: 1, nivelMax: 1, tiros: TIRO.TIROS, pontos: 0, derrubados: 0, feitos: 0, t: 0, ultimo: 0,
      rodando: false, missil: null, bala: null, explosoes: [], textos: [], mira: 0, fim: null };
    mostrar('tela-tiro');
    $('tiro-opcoes').innerHTML = '';
    hudTiro();
    const rodada = tiro;
    let n = 3;
    const contar = () => {
      if (tiro !== rodada) return;
      if (n === 0) {
        $('tiro-contagem').textContent = '';
        rodada.rodando = true;
        rodada.ultimo = performance.now();
        novoMissil();
        requestAnimationFrame(quadroTiro);
        return;
      }
      $('tiro-contagem').textContent = n--;
      SOM.clique();
      setTimeout(contar, 700);
    };
    requestAnimationFrame(() => desenharTiro());
    contar();
  }

  function pararTiro() {
    if (tiro) tiro.rodando = false;
    tiro = null;
    $('tiro-contagem').textContent = '';
  }

  function hudTiro() {
    const tipo = TIPOS_ANGULO[tiro.nivel - 1];
    $('tiro-nivel').textContent = `🎯 Nível ${tiro.nivel} · ${tipo.passo}°`;
    $('tiro-pontos').textContent = tiro.pontos;
    $('tiro-contador').textContent = `Míssil ${Math.max(1, tiro.feitos)} de ${TIRO.MISSEIS}`;
    const total = Math.max(TIRO.TIROS, tiro.tiros);
    $('tiro-municao').innerHTML = Array.from({ length: total }, (_, i) =>
      `<img src="assets/tiro/municao.png" alt="" class="${i < tiro.tiros ? '' : 'gasta'}">`).join('');
    $('tiro-municao').setAttribute('aria-label', `${tiro.tiros} tiros`);
  }

  function novoMissil() {
    if (!tiro || !tiro.rodando) return;
    if (tiro.feitos >= TIRO.MISSEIS) { terminarTiro('vitoria'); return; }
    const tipo = TIPOS_ANGULO[tiro.nivel - 1];
    const ultimo = tiro.missil && tiro.missil.angulo;
    const angulos = angulosDoNivel(tipo.passo).filter((a) => a !== ultimo);
    const angulo = sortear(angulos);
    tiro.feitos++;
    tiro.missil = { angulo, tipo, nivel: tiro.nivel, nasceu: tiro.t, vida: 14 - tiro.nivel * 1.4, erros: [], primeira: true };
    tiro.mira = 0;   // o cano volta a apontar para o centro
    mostrarOpcoesTiro();
    hudTiro();
  }

  function mostrarOpcoesTiro() {
    const m = tiro.missil;
    $('tiro-opcoes').innerHTML = '';
    opcoesDoAngulo(m.angulo, m.tipo.passo).forEach((a, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mat-resposta';
      b.textContent = `${a}°`;
      b.dataset.tecla = i + 1;
      b.onclick = () => dispararTiro(a, b);
      $('tiro-opcoes').append(b);
    });
  }

  function dispararTiro(angulo, botao) {
    if (!tiro || !tiro.rodando || tiro.bala || !tiro.missil || tiro.tiros <= 0) return;
    const md = medidasTiro();
    const acerta = angulo === tiro.missil.angulo;
    // tiro certo segue pela reta até encontrar o míssil (mesmo se ele ainda estiver fora do círculo);
    // tiro errado vai até a marca escolhida e cai ali
    const alvo = acerta ? posicaoMissil(md, tiro.missil).ini : md.ponto(angulo);
    tiro.tiros--;
    tiro.mira = Math.atan2(alvo.y - md.canhao.y, alvo.x - md.canhao.x);
    document.querySelectorAll('#tiro-opcoes .mat-resposta').forEach((b) => { b.disabled = true; });
    botao.classList.add(acerta ? 'certa' : 'errada');
    const boca = 40 * md.k;
    tiro.bala = { angulo, acerta, x: md.canhao.x + Math.cos(tiro.mira) * boca, y: md.canhao.y + Math.sin(tiro.mira) * boca,
      alvo, inicio: tiro.t, rastro: [] };
    tocar([[320, 0.06, 'square'], [140, 0.18, 'square']]);
    hudTiro();
  }

  function explodir(x, y, tamanho = 1) {
    tiro.explosoes.push({ x, y, inicio: tiro.t, tamanho });
    tocar([[110, 0.25, 'sawtooth'], [60, 0.3, 'sawtooth']]);
  }

  function textoTiro(x, y, texto, cor) {
    tiro.textos.push({ x, y, texto, cor, inicio: tiro.t });
  }

  // míssil resolvido: entra no relatório e o nível sobe (acertou de primeira) ou desce
  function registrarMissil(m, derrubou) {
    resultados.push({ m: m.tipo, certa: `${m.angulo}°`, erros: m.erros.slice(), nivel: m.nivel });
    if (derrubou && m.primeira) tiro.nivel = Math.min(TIRO.NIVEL_MAX, tiro.nivel + 1);
    else if (!m.primeira) tiro.nivel = Math.max(1, tiro.nivel - 1);
    tiro.nivelMax = Math.max(tiro.nivelMax, tiro.nivel);
  }

  function quadroTiro(agora) {
    if (!tiro || !tiro.rodando) return;
    const dt = Math.min(0.05, (agora - tiro.ultimo) / 1000);   // aba escondida: o jogo espera
    tiro.ultimo = agora;
    tiro.t += dt;
    const md = medidasTiro();
    const m = tiro.missil;

    // bala voando até a marca escolhida
    if (tiro.bala) {
      const b = tiro.bala;
      const vel = md.R * 2.6;
      const dx = b.alvo.x - b.x, dy = b.alvo.y - b.y, dist = Math.hypot(dx, dy);
      b.rastro.push({ x: b.x, y: b.y });
      if (b.rastro.length > 8) b.rastro.shift();
      const passo = Math.min(dist, vel * dt);
      b.x += (dx / (dist || 1)) * passo;
      b.y += (dy / (dist || 1)) * passo;
      const pm = m && posicaoMissil(md, m);
      // no tiro certo, bala e míssil estão na mesma reta: acerta quando a bala chega à distância do míssil
      // (comparar distâncias evita a bala "atravessar" o míssil entre um quadro e outro)
      const longe = (p) => Math.hypot(p.x - md.canhao.x, p.y - md.canhao.y);
      if (b.acerta && pm && longe(b) >= longe(pm) - 4 * md.k) {
        // acertou: míssil derrubado, +1 tiro
        explodir(pm.x, pm.y, 1.3);
        const ganhou = 50 * m.nivel + Math.round(Math.max(0, 1 - (tiro.t - m.nasceu) / m.vida) * 30);
        tiro.pontos += ganhou;
        tiro.tiros++;
        tiro.derrubados++;
        textoTiro(pm.x, pm.y - 20, `+1 tiro! Era ${m.angulo}°`, '#7dffb0');
        textoTiro(pm.x, pm.y + 4, `+${ganhou}`, '#ffd23a');
        SOM.certo();
        registrarMissil(m, true);
        tiro.missil = null;
        tiro.bala = null;
        $('tiro-opcoes').innerHTML = '';
        hudTiro();
        setTimeout(() => { if (tiro && tiro.rodando) novoMissil(); }, 1100);
      } else if (dist < 2) {
        // errou: a bala cai na marca escolhida
        explodir(b.x, b.y, 0.6);
        if (m) {
          m.erros.push(`${b.angulo}°`);
          m.primeira = false;
          textoTiro(b.x, b.y - 16, 'Errou!', '#ff8a74');
          SOM.errado();
        }
        tiro.bala = null;
        if (tiro.tiros <= 0) { if (m) registrarMissil(m, false); terminarTiro('tiros'); return; }
        if (m) mostrarOpcoesTiro();
        hudTiro();
      }
    }

    // míssil chegou ao canhão
    if (tiro.missil && (tiro.t - tiro.missil.nasceu) >= tiro.missil.vida) {
      explodir(md.canhao.x, md.canhao.y, 1.8);
      tiro.missil.erros.push('atingiu o canhão');
      tiro.missil.primeira = false;
      registrarMissil(tiro.missil, false);
      tiro.missil = null;
      tiro.fim = tiro.t;
    }
    desenharTiro();
    if (tiro.fim !== null && tiro.t - tiro.fim > 1.2) { terminarTiro('canhao'); return; }
    requestAnimationFrame(quadroTiro);
  }

  // o míssil vem de fora do círculo pela reta que liga a sua marca ao canhão:
  // cruza a borda exatamente na marca do ângulo e segue até o canhão
  function posicaoMissil(md, m) {
    const p = Math.min(1, (tiro.t - m.nasceu) / m.vida);
    const marca = md.ponto(m.angulo), c = md.canhao;
    const dist = Math.hypot(marca.x - c.x, marca.y - c.y);
    const fora = 34 * md.k;
    const ini = { x: marca.x + ((marca.x - c.x) / dist) * fora, y: marca.y + ((marca.y - c.y) / dist) * fora };
    return { x: ini.x + (c.x - ini.x) * p, y: ini.y + (c.y - ini.y) * p, ini };
  }

  function sprite(g, img, sx, sy, sw, sh, x, y, k, ang = 0, px = sw / 2, py = sh / 2) {
    if (!img.complete || !img.naturalWidth) return;
    g.save();
    g.translate(x, y);
    g.rotate(ang);
    g.drawImage(img, sx, sy, sw, sh, -px * k, -py * k, sw * k, sh * k);
    g.restore();
  }

  function desenharTiro() {
    if (!tiro) return;
    const md = medidasTiro();
    const { cv, S, R, cx, cy, k, ponto } = md;
    const g = cv.getContext('2d');
    g.setTransform(md.dpr, 0, 0, md.dpr, 0, 0);
    g.imageSmoothingEnabled = false;

    // fundo de radar
    const fundo = g.createRadialGradient(cx, cy, R * 0.1, cx, cy, S * 0.75);
    fundo.addColorStop(0, '#163b6e'); fundo.addColorStop(1, '#0a1530');
    g.fillStyle = fundo; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(120, 190, 255, 0.12)'; g.lineWidth = 1;
    for (const f of [0.33, 0.66]) { g.beginPath(); g.arc(cx, cy, R * f, 0, Math.PI * 2); g.stroke(); }
    g.beginPath(); g.moveTo(cx - R, cy); g.lineTo(cx + R, cy); g.moveTo(cx, cy - R); g.lineTo(cx, cy + R); g.stroke();
    // varredura do radar
    const varre = (tiro.t * 0.9) % (Math.PI * 2);
    const grad = g.createLinearGradient(cx, cy, cx + Math.cos(varre) * R, cy + Math.sin(varre) * R);
    grad.addColorStop(0, 'rgba(90, 200, 255, 0)'); grad.addColorStop(1, 'rgba(90, 200, 255, 0.35)');
    g.strokeStyle = grad; g.lineWidth = 2;
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(varre) * R, cy + Math.sin(varre) * R); g.stroke();

    // transferidor: círculo, marcas de 10° e números de 30° em 30° (e dos múltiplos de 45°)
    g.strokeStyle = '#7cc4ff'; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    for (let a = 0; a < 360; a += 5) {
      const grande = a % 30 === 0, medio = a % 45 === 0, pequeno = a % 10 === 0;
      if (!grande && !medio && !pequeno) continue;
      const dentro = ponto(a, R - (grande ? 11 : medio ? 9 : 6)), fora = ponto(a, R);
      g.strokeStyle = grande ? '#d9efff' : medio ? '#ffd23a' : 'rgba(180, 220, 255, 0.6)';
      g.lineWidth = grande || medio ? 2.5 : 1.5;
      g.beginPath(); g.moveTo(dentro.x, dentro.y); g.lineTo(fora.x, fora.y); g.stroke();
    }
    // míssil (aponta para onde voa) com fogo animado
    if (tiro.missil) {
      const pm = posicaoMissil(md, tiro.missil);
      const ang = Math.atan2(md.canhao.y - pm.ini.y, md.canhao.x - pm.ini.x) + Math.PI / 2;
      const quadro = Math.floor(tiro.t * 12) % 3;
      sprite(g, SPRITES.missil, quadro * 16, 0, 16, 42, pm.x, pm.y, k * 0.85, ang, 8, 18);
    }

    // números da escala por cima do míssil, para o aluno sempre conseguir ler
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // só os números de referência (0°, 90°, 180° e 270°): os outros ângulos o aluno descobre contando as marcas
    g.font = `800 ${Math.round(18 * (S / 420))}px Nunito, Arial, sans-serif`;
    g.fillStyle = '#ffd23a';
    for (const a of [90, 180, 270]) {
      const p = ponto(a, R + 22 * (S / 420));
      g.fillText(`${a}°`, p.x, p.y);
    }
    g.fillText('0°', md.canhao.x - 4 * k, md.canhao.y + 34 * k);

    // canhão: carreta parada e cano girando para a mira
    const c = md.canhao;
    sprite(g, SPRITES['canhao-carreta'], 0, 0, 52, 40, c.x, c.y, k, 0, 25, 13);
    sprite(g, SPRITES['canhao-cano'], 0, 0, 46, 18, c.x, c.y, k, tiro.mira, 4, 9);

    // bala com rastro
    if (tiro.bala) {
      tiro.bala.rastro.forEach((r, i) => {
        g.fillStyle = `rgba(255, 210, 120, ${(i + 1) / 12})`;
        g.fillRect(r.x - 2, r.y - 2, 4, 4);
      });
      sprite(g, SPRITES.bala, 0, 0, 10, 10, tiro.bala.x, tiro.bala.y, k * 0.9);
    }

    // explosões (6 quadros) e textos que sobem
    tiro.explosoes = tiro.explosoes.filter((e) => tiro.t - e.inicio < 0.6);
    for (const e of tiro.explosoes) {
      const q = Math.min(5, Math.floor((tiro.t - e.inicio) * 10));
      sprite(g, SPRITES.explosao, q * 48, 0, 48, 48, e.x, e.y, k * e.tamanho);
    }
    tiro.textos = tiro.textos.filter((x) => tiro.t - x.inicio < 1.4);
    for (const x of tiro.textos) {
      const vida = (tiro.t - x.inicio) / 1.4;
      g.globalAlpha = 1 - vida;
      g.font = `800 ${Math.round(16 * (S / 420))}px Nunito, Arial, sans-serif`;
      g.lineWidth = 4; g.strokeStyle = '#0a1530'; g.fillStyle = x.cor;
      g.strokeText(x.texto, x.x, x.y - vida * 30); g.fillText(x.texto, x.x, x.y - vida * 30);
      g.globalAlpha = 1;
    }
  }

  function terminarTiro(motivo) {
    const { derrubados, feitos, pontos, nivelMax } = tiro;
    pararTiro();
    fimDaMissao();
    $('fim-titulo').textContent = motivo === 'vitoria' ? 'Defesa perfeita!' : motivo === 'tiros' ? 'Acabaram os tiros!' : 'O míssil chegou ao canhão!';
    $('fim-texto').textContent = `${aluno}, você derrubou ${derrubados} de ${feitos} mísseis, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
  }

  // teclas 1 a 4 também disparam no computador
  document.addEventListener('keydown', (e) => {
    if (!tiro || !$('tela-tiro').classList.contains('ativa')) return;
    const b = document.querySelector(`#tiro-opcoes .mat-resposta[data-tecla="${e.key}"]`);
    if (b && !b.disabled) b.click();
  });
  window.addEventListener('resize', () => { if (tiro) desenharTiro(); });

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
    missao = { id: 'peso-' + nivel.id, peso: true, icone: '⚖️', cor: '#e0a100', titulo: `Peso Certo (${nivel.titulo}: ${nivel.unidades})` };
    resultados = [];
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

  // ---------- Questionário da aula (aluno) ----------
  // Os questionários vêm da planilha do professor (pelo script). Uma pergunta por vez, as respostas
  // sempre embaralhadas; no fim, o resultado e o relatório. Fica uma cópia no aparelho para jogar sem internet.
  const CHAVE_QUIZ_LISTA = 'pleno-ortografia:questionarios';
  // aberto por um link de questionário (?q=<id>): o aluno vai direto para ele, sem ver os outros jogos
  const QUIZ_DO_LINK = new URLSearchParams(location.search).get('q');
  const JOGO_DO_LINK = new URLSearchParams(location.search).get('jogo');
  let quizDoLinkAberto = false;
  const chaveQuiz = (id) => `pleno-ortografia:questionario:${id}`;
  let quiz = null;   // o questionário em andamento

  async function telaQuizMenu() {
    quiz = null;
    mascote('davi-quiz', 'oi');
    mostrar('tela-quiz-menu');
    $('quiz-voltar').hidden = !!QUIZ_DO_LINK;
    const desenhar = (todos, aviso) => {
      const lista = QUIZ_DO_LINK ? todos.filter((q) => String(q.id) === QUIZ_DO_LINK) : todos;
      if (QUIZ_DO_LINK && !lista.length && !aviso) aviso = 'Este link não abre nenhum questionário: ele pode ter sido excluído. Peça um novo link ao professor.';
      $('quiz-status').textContent = aviso || (lista.length ? '' : 'O professor ainda não criou nenhum questionário.');
      $('lista-quiz').innerHTML = '';
      for (const q of lista) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-item';
        b.innerHTML = `<span class="quiz-item-nome">📝 ${seguro(q.titulo)}</span><span class="quiz-item-qtd">${q.perguntas} pergunta${q.perguntas === 1 ? '' : 's'}</span>`;
        b.onclick = () => { SOM.clique(); comecarQuiz(q.id); };
        $('lista-quiz').append(b);
      }
    };
    const copia = lerJSON(CHAVE_QUIZ_LISTA, []);
    desenhar(copia, URL_RELATORIO ? 'Buscando questionários…' : 'Os questionários ainda não foram ligados no jogo.');
    if (!URL_RELATORIO) return;
    try {
      const { lista } = await lerDoScript('questionarios');
      gravarJSON(CHAVE_QUIZ_LISTA, lista);
      if ($('tela-quiz-menu').classList.contains('ativa')) desenhar(lista);
      // pelo link, o questionário já abre sozinho na primeira vez
      if (QUIZ_DO_LINK && !quizDoLinkAberto && lista.some((q) => String(q.id) === QUIZ_DO_LINK)) { quizDoLinkAberto = true; comecarQuiz(QUIZ_DO_LINK); }
    } catch (e) {
      desenhar(copia, copia.length ? 'Sem internet: mostrando os questionários salvos neste aparelho.' : 'Sem internet: não deu para buscar os questionários.');
    }
  }

  async function comecarQuiz(id) {
    $('quiz-status').textContent = 'Abrindo…';
    let q = null;
    try { q = (await lerDoScript('questionario', `&id=${encodeURIComponent(id)}`)).questionario; gravarJSON(chaveQuiz(id), q); }
    catch (e) { q = lerJSON(chaveQuiz(id), null); }
    if (!q || !q.perguntas.length) { $('quiz-status').textContent = 'Não deu para abrir este questionário agora (sem internet?).'; return; }
    const regra = { id: 'quiz-' + q.id, titulo: q.titulo.slice(0, 40), icone: '📝', cor: '#7b4fc9',
      regra: 'Reveja estas perguntas com a turma: compare a resposta certa com a que o aluno marcou.' };
    missao = { id: 'quiz-' + q.id, quiz: true, quizId: q.id, icone: '📝', cor: '#7b4fc9', titulo: `Questionário: ${q.titulo}` };
    resultados = [];
    quiz = { q, regra, idx: 0, acertos: 0 };
    $('quiz-titulo').textContent = `📝 ${q.titulo}`;
    mostrar('tela-quiz');
    mostrarPerguntaQuiz();
  }

  function mostrarPerguntaQuiz() {
    const { q, idx } = quiz;
    const p = q.perguntas[idx];
    $('quiz-contador').textContent = `${idx + 1} de ${q.perguntas.length}`;
    $('quiz-texto').textContent = p.pergunta;
    $('quiz-feedback').textContent = '';
    $('quiz-feedback').className = 'peso-msg';
    $('btn-quiz-proxima').hidden = true;
    $('quiz-opcoes').innerHTML = '';
    for (const resposta of embaralhar([p.certa, ...p.erradas])) {   // as respostas sempre embaralhadas
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'quiz-opcao';
      b.textContent = resposta;
      b.onclick = () => responderQuiz(resposta, b);
      $('quiz-opcoes').append(b);
    }
  }

  function responderQuiz(resposta, botao) {
    const p = quiz.q.perguntas[quiz.idx];
    const botoes = [...document.querySelectorAll('#quiz-opcoes .quiz-opcao')];
    botoes.forEach((b) => { b.disabled = true; });
    const acertou = resposta === p.certa;
    if (acertou) {
      quiz.acertos++;
      botao.classList.add('certa');
      $('quiz-feedback').textContent = `✔ ${sortear(ELOGIOS)}`;
      $('quiz-feedback').className = 'peso-msg certo';
      SOM.certo();
    } else {
      botao.classList.add('errada');
      botoes.forEach((b) => { if (b.textContent === p.certa) b.classList.add('certa'); else if (b !== botao) b.classList.add('apagada'); });
      $('quiz-feedback').textContent = `✘ A resposta certa é: ${p.certa}`;
      $('quiz-feedback').className = 'peso-msg erro';
      SOM.errado();
    }
    resultados.push({ m: quiz.regra, certa: `${p.pergunta} → ${p.certa}`, erros: acertou ? [] : [resposta] });
    $('btn-quiz-proxima').textContent = quiz.idx === quiz.q.perguntas.length - 1 ? 'Ver resultado ⭐' : 'Próxima ➜';
    $('btn-quiz-proxima').hidden = false;
    $('btn-quiz-proxima').focus({ preventScroll: true });
  }

  $('btn-quiz-proxima').onclick = () => {
    quiz.idx++;
    if (quiz.idx < quiz.q.perguntas.length) { mostrarPerguntaQuiz(); return; }
    const { acertos } = quiz, total = quiz.q.perguntas.length;
    fimDaMissao();
    const n = ultimoRelatorio.estrelas;
    $('fim-titulo').textContent = n === 3 ? 'Mandou muito bem!' : 'Questionário concluído!';
    $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${total} perguntas de "${quiz.q.titulo}"!`;
  };

  // ---------- Jogo do Reflexo ----------
  // Atenção, memória e reflexo. No alto, 4 lâmpadas, cada uma com uma cor e um som; embaixo, 4 botões das mesmas
  // cores, sempre em outra ordem. As lâmpadas piscam (ex.: a azul 2 vezes, depois a vermelha 1 vez) e o aluno repete
  // tocando os botões das mesmas cores, na mesma ordem e quantas vezes cada uma piscou.
  // Acertou: o próximo desafio fica mais difícil (mais cores, mais piscadas, mais rápido). Errou: fica mais fácil.
  // Os pontos dependem da rapidez: quanto mais rápido responder, mais pontos.
  // Nível 2: em vez de botões, copos e filas de bolinhas. A lâmpada pisca e o aluno arrasta a bolinha da mesma cor
  // até o copo da mesma cor (quantas vezes piscou). Lâmpadas, copos e filas nunca têm a mesma cor um embaixo do outro.
  const LUZ = { RODADAS: 15, NIVEL_MAX: 8, ESPERA: 15, ESPERA2: 25 };   // ESPERA: segundos para responder
  const CORES_LUZ = [
    { id: 'vermelha', nome: 'Vermelha', copo: 'vermelho', cor: '#ff3b30', freq: 330 },
    { id: 'amarela', nome: 'Amarela', copo: 'amarelo', cor: '#ffd60a', freq: 523 },
    { id: 'verde', nome: 'Verde', copo: 'verde', cor: '#30d158', freq: 392 },
    { id: 'azul', nome: 'Azul', copo: 'azul', cor: '#1e88ff', freq: 262 },
  ];
  // passos: quantas cores na sequência; max: até quantas piscadas por cor; ms: duração de cada piscada
  const NIVEIS_LUZ = [
    { passos: 1, max: 2, ms: 760 }, { passos: 1, max: 3, ms: 700 },
    { passos: 2, max: 2, ms: 640 }, { passos: 2, max: 3, ms: 580 },
    { passos: 3, max: 2, ms: 540 }, { passos: 3, max: 3, ms: 490 },
    { passos: 4, max: 2, ms: 450 }, { passos: 4, max: 3, ms: 400 },
  ];
  // Nível 2 começa mais leve: arrastar leva mais tempo que tocar
  const NIVEIS_LUZ2 = [
    { passos: 1, max: 1, ms: 800 }, { passos: 1, max: 2, ms: 760 },
    { passos: 2, max: 1, ms: 700 }, { passos: 2, max: 2, ms: 640 },
    { passos: 3, max: 1, ms: 600 }, { passos: 3, max: 2, ms: 560 },
    { passos: 4, max: 1, ms: 520 }, { passos: 4, max: 2, ms: 480 },
  ];
  let modoLuz = 1;   // 1 = botões; 2 = copos e bolinhas
  const TEXTO_MENU_LUZ = {
    1: $('luz-menu-texto').innerHTML,
    2: `Lá em cima estão <b>4 lâmpadas</b>; no meio, <b>4 copos</b>; embaixo, <b>filas de bolinhas</b>. Quando uma lâmpada
      <b>piscar</b>, arraste a <b>bolinha da mesma cor</b> até o <b>copo da mesma cor</b>, uma bolinha para cada piscada.
      Cuidado: nada fica embaixo da mesma cor! Se preferir, toque na bolinha e depois no copo. ⚡`,
  };
  const TIPOS_LUZ = [1, 2, 3, 4].map((n) => ({
    id: `luz${n}`, titulo: n === 1 ? 'Sequência de 1 cor' : `Sequência de ${n} cores`, icone: '💡', cor: '#7b4fc9',
    regra: n === 1
      ? 'Uma lâmpada pisca algumas vezes: o aluno precisa contar as piscadas e tocar o botão da mesma cor o mesmo número de vezes.'
      : `${n} lâmpadas piscam, uma depois da outra: o aluno precisa guardar a ordem e quantas vezes cada cor piscou (memória de trabalho).`,
  }));
  let luz = null;   // a partida em andamento
  const pausaLuz = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const corLuz = (id) => CORES_LUZ.find((c) => c.id === id);
  const segundos = (s) => `${s.toFixed(1).replace('.', ',')} s`;

  function telaLuzesMenu(modo = modoLuz) {
    pararLuz();
    modoLuz = modo;
    $('luz-menu-titulo').textContent = modo === 2 ? '💡 Jogo do Reflexo Nível 2' : '💡 Jogo do Reflexo';
    $('luz-menu-texto').innerHTML = TEXTO_MENU_LUZ[modo];
    mascote('davi-luzes', 'oi');
    mostrar('tela-luzes-menu');
  }

  function comecarLuz() {
    pararLuz();
    missao = modoLuz === 2
      ? { id: 'luzes2', luzes: true, icone: '💡', cor: '#c2185b', titulo: 'Jogo do Reflexo Nível 2 (copos e bolinhas)' }
      : { id: 'luzes', luzes: true, icone: '💡', cor: '#7b4fc9', titulo: 'Jogo do Reflexo (atenção e memória)' };
    resultados = [];
    luz = { modo: modoLuz, nivel: 1, nivelMax: 1, pontos: 0, feitas: 0, acertos: 0, rodando: true, vez: 0, erros: {} };
    $('luz-botoes').hidden = luz.modo === 2;
    $('luz-copos').hidden = luz.modo !== 2;
    $('luz-bolas').hidden = luz.modo !== 2;
    $('luz-lampadas').innerHTML = CORES_LUZ.map((c) =>
      `<div class="lampada" data-cor="${c.id}" style="--cor:${c.cor}" role="img" aria-label="Lâmpada ${c.nome}"><span class="vidro"></span><span class="rosca"></span></div>`).join('');
    mostrar('tela-luzes');
    rodadaLuz();
  }

  function pararLuz() {
    if (luz) { luz.rodando = false; clearTimeout(luz.proxima); clearInterval(luz.relogio); }
    luz = null;
    soltarArrasto();
    document.querySelectorAll('.lampada.acesa').forEach((l) => l.classList.remove('acesa'));
  }

  function hudLuz() {
    $('luz-nivel').textContent = `💡 Nível ${luz.nivel} de ${LUZ.NIVEL_MAX}`;
    $('luz-pontos').textContent = luz.pontos;
    $('luz-rodada').textContent = `Rodada ${luz.feitas} de ${LUZ.RODADAS}`;
  }
  const msgLuz = (texto, tipo = '') => { $('luz-msg').textContent = texto; $('luz-msg').className = `luz-msg ${tipo}`; };

  // os botões nunca ficam na mesma posição das lâmpadas
  function montarBotoesLuz() {
    let ordem;
    do { ordem = embaralhar(CORES_LUZ); } while (ordem.some((c, i) => c === CORES_LUZ[i]));
    $('luz-botoes').innerHTML = ordem.map((c) =>
      `<button class="luz-botao" type="button" data-cor="${c.id}" style="--cor:${c.cor}" aria-label="Botão ${c.nome}"><span></span></button>`).join('');
  }

  // Nível 2: copos e filas de bolinhas; nenhuma cor fica embaixo da mesma cor (nem da lâmpada, nem do copo)
  function montarCoposBolas() {
    let copos, bolas;
    do { copos = embaralhar(CORES_LUZ); } while (copos.some((c, i) => c === CORES_LUZ[i]));
    do { bolas = embaralhar(CORES_LUZ); } while (bolas.some((c, i) => c === CORES_LUZ[i] || c === copos[i]));
    $('luz-copos').innerHTML = copos.map((c) =>
      `<div class="copo" data-cor="${c.id}" style="--cor:${c.cor}" role="button" tabindex="0" aria-label="Copo ${c.nome}"><span class="copo-corpo"></span><span class="copo-bolas"></span></div>`).join('');
    $('luz-bolas').innerHTML = bolas.map((c) =>
      `<div class="fila-bolas" data-cor="${c.id}" style="--cor:${c.cor}"><button class="bola" type="button" data-cor="${c.id}" aria-label="Bolinha ${c.nome}"></button><span class="bola bola-espera"></span></div>`).join('');
  }

  const bloquearLuz = (sim) => $('luz-palco').classList.toggle('bloqueado', sim);

  async function acenderLuz(id, ms) {
    const lampada = document.querySelector(`.lampada[data-cor="${id}"]`);
    tocar([[corLuz(id).freq, ms / 1000, 'sine']]);
    lampada.classList.add('acesa');
    await pausaLuz(ms);
    lampada.classList.remove('acesa');
  }

  async function rodadaLuz() {
    if (!luz || !luz.rodando) return;
    if (luz.feitas >= LUZ.RODADAS) { terminarLuz(); return; }
    luz.feitas++;
    const vez = ++luz.vez;
    const ativa = () => luz && luz.rodando && luz.vez === vez;
    const nv = (luz.modo === 2 ? NIVEIS_LUZ2 : NIVEIS_LUZ)[luz.nivel - 1];
    // sequência: cada passo é uma cor (diferente da anterior) que pisca de 1 até "max" vezes
    const seq = [];
    for (let i = 0; i < nv.passos; i++) {
      let c;
      do { c = sortear(CORES_LUZ); } while (seq.length && seq[seq.length - 1].cor === c);
      seq.push({ cor: c, vezes: 1 + Math.floor(Math.random() * nv.max) });
    }
    Object.assign(luz, { seq, esperado: seq.flatMap((s) => Array(s.vezes).fill(s.cor.id)), tocadas: [], respondendo: false });
    // nos primeiros níveis os botões ficam no mesmo lugar; depois mudam de lugar a cada rodada
    if (luz.modo === 2) {
      if (luz.feitas === 1 || luz.nivel >= 2) montarCoposBolas();
      document.querySelectorAll('.copo-bolas').forEach((c) => { c.innerHTML = ''; });
      luz.bolaSelecionada = null;
    } else if (luz.feitas === 1 || luz.nivel >= 3) montarBotoesLuz();
    bloquearLuz(true);
    $('luz-tempo').textContent = '';
    hudLuz();
    msgLuz('👀 Olhe e escute…');
    await pausaLuz(800);
    for (const [i, s] of seq.entries()) {
      for (let k = 0; k < s.vezes; k++) {
        if (!ativa()) return;
        await acenderLuz(s.cor.id, nv.ms * 0.6);
        await pausaLuz(nv.ms * 0.45);
      }
      if (i < seq.length - 1) await pausaLuz(nv.ms * 0.7);
    }
    if (!ativa()) return;
    luz.respondendo = true;
    luz.t0 = performance.now();
    bloquearLuz(false);
    msgLuz(luz.modo === 2 ? '👆 Sua vez! Leve as bolinhas aos copos.' : '👆 Sua vez! Toque nos botões.');
    const limite = luz.modo === 2 ? LUZ.ESPERA2 : LUZ.ESPERA;
    luz.relogio = setInterval(() => {
      if (!ativa() || !luz.respondendo) return;
      const t = (performance.now() - luz.t0) / 1000;
      $('luz-tempo').textContent = `⏱ ${segundos(t)}`;
      if (t >= limite) respostaLuz(false, 'não respondeu a tempo', 'sem resposta');
    }, 100);
  }

  // tipo do erro, para o relatório: contou a mais, contou a menos, trocou a ordem ou tocou uma cor que não piscou
  function tipoDoErroLuz(tocou) {
    const { esperado } = luz, i = luz.tocadas.length;
    const anterior = esperado[i - 1];
    const proxima = esperado.slice(i).find((c) => c !== esperado[i]);
    const verbo = luz.modo === 2 ? 'colocou' : 'tocou';
    if (tocou === anterior) return `${verbo} a mais`;
    if (tocou === proxima) return `${verbo} a menos`;
    if (esperado.includes(tocou)) return 'trocou a ordem';
    return 'cor que não piscou';
  }

  $('luz-botoes').onclick = (e) => {
    const b = e.target.closest('.luz-botao');
    if (!b || !luz || !luz.respondendo) return;
    const id = b.dataset.cor;
    b.classList.remove('apertado');
    void b.offsetWidth;   // reinicia a animação de apertar
    b.classList.add('apertado');
    const lampada = document.querySelector(`.lampada[data-cor="${id}"]`);
    lampada.classList.add('acesa');
    setTimeout(() => lampada.classList.remove('acesa'), 160);
    tocar([[corLuz(id).freq, 0.16, 'sine']]);
    jogadaLuz(id, 'tocou');
  };

  // confere a jogada (botão tocado ou bolinha colocada no copo certo) com a sequência que piscou
  function jogadaLuz(id, verbo) {
    if (id !== luz.esperado[luz.tocadas.length]) {
      const tipo = tipoDoErroLuz(id);
      luz.tocadas.push(id);
      respostaLuz(false, `${verbo} ${luz.tocadas.map((c) => corLuz(c).nome).join(', ')} (${tipo})`, tipo);
      return;
    }
    luz.tocadas.push(id);
    if (luz.tocadas.length === luz.esperado.length) respostaLuz(true);
  }

  // ----- Nível 2: arrastar a bolinha até o copo (ou tocar na bolinha e depois no copo) -----
  let arrasto = null;
  function soltarArrasto() {
    if (!arrasto) return;
    arrasto.fantasma.remove();
    arrasto.bola.classList.remove('pega');
    document.querySelectorAll('.copo.alvo').forEach((c) => c.classList.remove('alvo'));
    arrasto = null;
  }
  const copoNoPonto = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest('#luz-copos .copo'); };

  $('luz-bolas').addEventListener('pointerdown', (e) => {
    const bola = e.target.closest('button.bola');
    if (!bola || !luz || !luz.respondendo) return;
    e.preventDefault();
    soltarArrasto();
    const r = bola.getBoundingClientRect();
    const fantasma = document.createElement('span');
    fantasma.className = 'bola bola-fantasma';
    fantasma.style.cssText = `--cor:${corLuz(bola.dataset.cor).cor};width:${r.width}px;height:${r.height}px`;
    document.body.append(fantasma);
    arrasto = { bola, fantasma, dx: r.width / 2, dy: r.height / 2, x0: e.clientX, y0: e.clientY, moveu: false };
    fantasma.style.transform = `translate(${e.clientX - arrasto.dx}px, ${e.clientY - arrasto.dy}px) scale(1.15)`;
    bola.classList.add('pega');
  });
  document.addEventListener('pointermove', (e) => {
    if (!arrasto) return;
    if (Math.hypot(e.clientX - arrasto.x0, e.clientY - arrasto.y0) > 8) arrasto.moveu = true;
    arrasto.fantasma.style.transform = `translate(${e.clientX - arrasto.dx}px, ${e.clientY - arrasto.dy}px) scale(1.15)`;
    const copo = copoNoPonto(e.clientX, e.clientY);
    document.querySelectorAll('.copo').forEach((c) => c.classList.toggle('alvo', c === copo));
  });
  document.addEventListener('pointerup', (e) => {
    if (!arrasto) return;
    const { bola, moveu } = arrasto;
    soltarArrasto();
    if (!moveu) { selecionarBola(bola); return; }   // só tocou: escolhe a bolinha e depois toca no copo
    const copo = copoNoPonto(e.clientX, e.clientY);
    if (copo) soltarBola(bola.dataset.cor, copo);   // soltou fora de um copo: a bolinha volta para a fila
  });
  document.addEventListener('pointercancel', soltarArrasto);

  function selecionarBola(bola) {
    const ja = bola.classList.contains('selecionada');
    document.querySelectorAll('.bola.selecionada').forEach((b) => b.classList.remove('selecionada'));
    luz.bolaSelecionada = ja ? null : bola.dataset.cor;
    if (!ja) { bola.classList.add('selecionada'); SOM.clique(); }
  }
  $('luz-copos').onclick = (e) => {
    const copo = e.target.closest('.copo');
    if (copo && luz && luz.respondendo && luz.bolaSelecionada) soltarBola(luz.bolaSelecionada, copo);
  };

  function soltarBola(corBola, copo) {
    if (!luz || !luz.respondendo) return;
    luz.bolaSelecionada = null;
    document.querySelectorAll('.bola.selecionada').forEach((b) => b.classList.remove('selecionada'));
    const corCopo = copo.dataset.cor;
    // a bolinha cai no copo (o copo dá um pulinho) e a fila anda: aparece outra bolinha
    const dentro = copo.querySelector('.copo-bolas');
    if (dentro.children.length < 4) dentro.insertAdjacentHTML('beforeend', `<i style="--cor:${corLuz(corBola).cor}"></i>`);
    copo.classList.remove('caiu');
    void copo.offsetWidth;
    copo.classList.add('caiu');
    const fila = document.querySelector(`.fila-bolas[data-cor="${corBola}"]`);
    fila.classList.remove('andou');
    void fila.offsetWidth;
    fila.classList.add('andou');
    tocar([[corLuz(corCopo).freq, 0.16, 'sine']]);
    if (corBola !== corCopo) {
      luz.tocadas.push(corBola);
      respostaLuz(false, `colocou a bolinha ${corLuz(corBola).nome.toLowerCase()} no copo ${corLuz(corCopo).copo} (copo de outra cor)`, 'copo de outra cor');
      return;
    }
    jogadaLuz(corBola, 'colocou');
  }

  function respostaLuz(acertou, motivo, tipoErro) {
    luz.respondendo = false;
    clearInterval(luz.relogio);
    bloquearLuz(true);
    soltarArrasto();
    const tempo = (performance.now() - luz.t0) / 1000;
    const texto = luz.seq.map((s) => `${s.cor.nome} ${s.vezes}x`).join(' → ');
    const tipo = TIPOS_LUZ[luz.seq.length - 1];
    if (acertou) {
      // pontos: base pelo nível + bônus de rapidez (o tempo "bom" cresce com o número de toques)
      const bom = luz.modo === 2 ? 1.5 + luz.esperado.length * 1.3 : 0.8 + luz.esperado.length * 0.6;
      const bonus = Math.max(0, Math.round(100 * (1 - (tempo - bom) / (bom * 2))));
      const ganho = 20 * luz.nivel + Math.min(100, bonus);
      luz.pontos += ganho;
      luz.acertos++;
      resultados.push({ m: tipo, certa: texto, erros: [], nivel: luz.nivel, tempo });
      SOM.certo();
      msgLuz(`✅ Muito bem! +${ganho} pontos em ${segundos(tempo)}`, 'ok');
      luz.nivel = Math.min(LUZ.NIVEL_MAX, luz.nivel + 1);
    } else {
      resultados.push({ m: tipo, certa: texto, erros: [motivo], nivel: luz.nivel, tempo: tipoErro === 'sem resposta' ? null : tempo });
      luz.erros[tipoErro] = (luz.erros[tipoErro] || 0) + 1;
      SOM.errado();
      const palco = $('luz-palco');
      palco.classList.remove('tremer');
      void palco.offsetWidth;
      palco.classList.add('tremer');
      msgLuz(`❌ Era: ${texto}`, 'erro');
      luz.nivel = Math.max(1, luz.nivel - 1);
    }
    luz.nivelMax = Math.max(luz.nivelMax, luz.nivel);
    hudLuz();
    $('luz-rodada').textContent = `Rodada ${luz.feitas} de ${LUZ.RODADAS}`;
    luz.proxima = setTimeout(rodadaLuz, acertou ? 1400 : 2400);
  }

  // destaques do relatório: rapidez, nível, tipos de erro e se o aluno ficou mais rápido durante a partida
  function resumoLuz(l) {
    const tempos = resultados.filter((r) => !r.erros.length).map((r) => r.tempo);
    const linhas = [`Pontos: ${l.pontos}. Chegou ao nível ${l.nivelMax} de ${LUZ.NIVEL_MAX}.`];
    if (tempos.length) {
      const media = tempos.reduce((s, t) => s + t, 0) / tempos.length;
      linhas.push(`Tempo médio nos acertos: ${segundos(media)} (mais rápido: ${segundos(Math.min(...tempos))}; mais lento: ${segundos(Math.max(...tempos))}).`);
      const metade = Math.ceil(tempos.length / 2);
      if (tempos.length >= 4) {
        const m1 = tempos.slice(0, metade).reduce((s, t) => s + t, 0) / metade;
        const m2 = tempos.slice(metade).reduce((s, t) => s + t, 0) / (tempos.length - metade);
        linhas.push(m2 < m1 * 0.9 ? `Ficou mais rápido durante a partida (${segundos(m1)} → ${segundos(m2)}).`
          : m2 > m1 * 1.1 ? `Ficou mais lento no fim da partida (${segundos(m1)} → ${segundos(m2)}): pode ser cansaço ou desafios mais longos.`
            : `Manteve a rapidez durante a partida (cerca de ${segundos((m1 + m2) / 2)}).`);
      }
    }
    const erros = Object.entries(l.erros);
    linhas.push(erros.length ? `Erros: ${erros.map(([t, n]) => `${n} ${t}`).join(', ')}.` : 'Nenhum erro na partida!');
    const maior = resultados.filter((r) => !r.erros.length).reduce((m, r) => Math.max(m, r.certa.split('→').length), 0);
    if (maior) linhas.push(`Maior sequência que acertou: ${maior} ${maior === 1 ? 'cor' : 'cores'}.`);
    return linhas;
  }

  function terminarLuz() {
    const l = luz;
    pararLuz();
    missao.extra = '';
    missao.resumo = resumoLuz(l);
    fimDaMissao();
    $('fim-titulo').textContent = l.acertos === l.feitas ? 'Reflexo de campeão!' : 'Fim das luzes!';
    $('fim-texto').textContent = `${aluno}, você acertou ${l.acertos} de ${l.feitas} sequências e fez ${l.pontos} pontos!`;
  }

  $('btn-luzes').onclick = () => { SOM.clique(); escolherProfessorE('Jogo do Reflexo', () => telaLuzesMenu(1)); };
  $('btn-luzes2').onclick = () => { SOM.clique(); escolherProfessorE('Jogo do Reflexo Nível 2', () => telaLuzesMenu(2)); };
  $('luzes-voltar').onclick = telaJogos;
  $('btn-luzes-comecar').onclick = () => { SOM.clique(); comecarLuz(); };
  $('luzes-sair').onclick = telaLuzesMenu;

  // ---------- Rotina Certa ----------
  // Sequência e planejamento (funções executivas). Cada rotina do dia a dia tem 6 passos em ordem; os passos aparecem
  // embaralhados numa pilha de botões e a criança arrasta (ou toca em dois para trocar) até ficar na ordem certa,
  // depois toca em "Testar". Os passos certos ficam verdes e presos; os outros ela tenta de novo (até 3 vezes).
  // Acertou de primeira: a próxima rotina tem mais passos (3 a 6). Precisou de ajuda: a próxima tem menos.
  const ROTINA = { NIVEL_MAX: 4, TENTATIVAS: 3 };   // nível 1 = 3 passos ... nível 4 = 6 passos
  const ROTINAS = [
    { titulo: 'Tomar banho', icone: '🛁', passos: [
      ['🧺', 'Separar a toalha e a roupa limpa'], ['👕', 'Tirar a roupa suja'], ['🚿', 'Entrar no chuveiro e molhar o corpo'],
      ['🧼', 'Passar o sabonete e o xampu'], ['💦', 'Enxaguar o corpo todo'], ['👚', 'Secar com a toalha e vestir a roupa'] ] },
    { titulo: 'Hora do almoço', icone: '🍽️', passos: [
      ['🧴', 'Lavar as mãos'], ['🪑', 'Sentar à mesa'], ['🍛', 'Servir a comida no prato'],
      ['😋', 'Comer devagar, mastigando bem'], ['🧽', 'Levar o prato para a pia'], ['🪥', 'Escovar os dentes'] ] },
    { titulo: 'Ir para a escola', icone: '🎒', passos: [
      ['⏰', 'Acordar com o despertador'], ['🛏️', 'Levantar da cama'], ['🥣', 'Tomar o café da manhã'],
      ['🪥', 'Escovar os dentes'], ['🎒', 'Colocar a mochila nas costas'], ['🏫', 'Ir para a escola'] ] },
    { titulo: 'Fazer um bolo (com um adulto)', icone: '🎂', passos: [
      ['🧴', 'Lavar as mãos e separar os ingredientes'], ['🥚', 'Quebrar os ovos numa tigela'], ['🥄', 'Misturar os ovos, o açúcar e a farinha'],
      ['🫗', 'Colocar a massa na forma'], ['🔥', 'Assar no forno com a ajuda do adulto'], ['🍰', 'Esperar esfriar e cortar'] ] },
    { titulo: 'Escovar os dentes', icone: '🪥', passos: [
      ['🪥', 'Pegar a escova de dentes'], ['🧴', 'Colocar um pouco de pasta na escova'], ['😁', 'Escovar os dentes da frente'],
      ['👅', 'Escovar os dentes de trás e a língua'], ['💧', 'Cuspir e enxaguar a boca'], ['🧽', 'Lavar a escova e guardar'] ] },
    { titulo: 'Hora de dormir', icone: '🌙', passos: [
      ['🧸', 'Guardar os brinquedos'], ['🛁', 'Tomar banho'], ['👘', 'Vestir o pijama'],
      ['🪥', 'Escovar os dentes'], ['📖', 'Deitar e ouvir uma história'], ['💡', 'Apagar a luz e dormir'] ] },
  ];
  // tamanho da rotina no relatório
  const TIPOS_ROTINA = [3, 4, 5, 6].map((n) => ({
    id: `rotina${n}`, titulo: `Rotina com ${n} passos`, icone: '🧩', cor: '#2e9e5b',
    regra: `Ordenar ${n} passos de uma tarefa do dia a dia: pensar no que vem primeiro, no meio e por último (planejamento e sequência).`,
  }));
  let rotina = null;   // a partida em andamento

  function telaRotinaMenu() {
    pararRotina();
    mascote('davi-rotina', 'oi');
    mostrar('tela-rotina-menu');
  }

  function comecarRotina() {
    pararRotina();
    missao = { id: 'rotina', rotina: true, icone: '🧩', cor: '#2e9e5b', titulo: 'Rotina Certa (sequência e planejamento)' };
    resultados = [];
    rotina = { fila: embaralhar(ROTINAS), feitas: 0, nivel: 1, nivelMax: 1, pontos: 0, acertosPrimeira: 0, tentativasTotal: 0, rodando: true };
    mostrar('tela-rotina');
    novaRotina();
  }

  function pararRotina() {
    if (rotina) { rotina.rodando = false; clearInterval(rotina.relogio); clearTimeout(rotina.proxima); }
    rotina = null;
  }

  // escolhe quantos passos usar pelo nível, sempre mantendo a ordem original (o primeiro e o último ficam sempre)
  function passosDoNivel(r, n) {
    if (n >= r.passos.length) return r.passos.map((p, i) => ({ id: i, icone: p[0], texto: p[1] }));
    const meio = embaralhar(r.passos.slice(1, -1).map((_, i) => i + 1)).slice(0, n - 2).sort((a, b) => a - b);
    return [0, ...meio, r.passos.length - 1].map((i) => ({ id: i, icone: r.passos[i][0], texto: r.passos[i][1] }));
  }

  function novaRotina() {
    if (!rotina || !rotina.rodando) return;
    if (rotina.feitas >= rotina.fila.length) { terminarRotina(); return; }
    const r = rotina.fila[rotina.feitas];
    rotina.feitas++;
    const certos = passosDoNivel(r, rotina.nivel + 2);
    let ordem;
    do { ordem = embaralhar(certos); } while (ordem.every((p, i) => p === certos[i]));   // nunca começa já certa
    Object.assign(rotina, { atual: r, certos, ordem, presos: new Set(), tentativas: 0, t0: performance.now(), selecionado: null, respondendo: true });
    $('rotina-nivel').textContent = `🧩 Nível ${rotina.nivel} de ${ROTINA.NIVEL_MAX}`;
    $('rotina-pontos').textContent = rotina.pontos;
    $('rotina-contador').textContent = `Rotina ${rotina.feitas} de ${rotina.fila.length}`;
    $('rotina-tarefa').textContent = `${r.icone} ${r.titulo}`;
    msgRotina(`Coloque os ${certos.length} passos na ordem certa.`);
    $('btn-rotina-testar').disabled = false;
    desenharPilha(true);
    clearInterval(rotina.relogio);
    rotina.relogio = setInterval(() => {
      if (rotina && rotina.respondendo) $('rotina-tempo').textContent = `⏱ ${segundos((performance.now() - rotina.t0) / 1000)}`;
    }, 200);
  }
  const msgRotina = (texto, tipo = '') => { $('rotina-msg').textContent = texto; $('rotina-msg').className = `rotina-msg ${tipo}`; };

  // a pilha: cada botão fica numa "vaga" (top = posição × altura); ao arrastar, os outros deslizam para abrir espaço
  const alturaVaga = () => { const b = $('rotina-pilha').querySelector('.passo-rotina'); return b ? b.offsetHeight + 8 : 60; };
  function desenharPilha(novos) {
    const pilha = $('rotina-pilha');
    if (novos) {
      pilha.innerHTML = rotina.ordem.map((p) =>
        `<button class="passo-rotina" type="button" role="listitem" data-id="${p.id}"><span class="passo-num"></span><span class="passo-icone" aria-hidden="true">${p.icone}</span><span class="passo-texto">${seguro(p.texto)}</span><span class="passo-alca" aria-hidden="true">⠿</span></button>`).join('');
    }
    const h = alturaVaga();
    pilha.style.height = `${rotina.ordem.length * h - 8}px`;
    rotina.ordem.forEach((p, i) => {
      const b = pilha.querySelector(`[data-id="${p.id}"]`);
      if (!b.classList.contains('arrastando')) b.style.transform = `translateY(${i * h}px)`;
      b.querySelector('.passo-num').textContent = i + 1;
      b.setAttribute('aria-label', `Posição ${i + 1}: ${p.texto}`);
      b.classList.toggle('preso', rotina.presos.has(p.id));
      b.classList.toggle('selecionado', rotina.selecionado === p.id);
    });
  }

  // arrastar: o botão "levanta" (antecipação), segue o dedo e os outros abrem espaço; ao soltar, encaixa com um quique
  let arrastoRotina = null;
  $('rotina-pilha').addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.passo-rotina');
    if (!b || !rotina || !rotina.respondendo) return;
    const id = Number(b.dataset.id);
    if (rotina.presos.has(id)) return;
    e.preventDefault();
    arrastoRotina = { b, id, y0: e.clientY, inicio: rotina.ordem.findIndex((p) => p.id === id), moveu: false };
  });
  document.addEventListener('pointermove', (e) => {
    if (!arrastoRotina || !rotina) return;
    const a = arrastoRotina, h = alturaVaga();
    const dy = e.clientY - a.y0;
    if (!a.moveu && Math.abs(dy) < 6) return;
    if (!a.moveu) { a.moveu = true; a.b.classList.add('arrastando'); rotina.selecionado = null; }
    const max = (rotina.ordem.length - 1) * h;
    const y = Math.max(-h * 0.3, Math.min(max + h * 0.3, a.inicio * h + dy));
    a.b.style.transform = `translateY(${y}px) scale(1.04)`;
    // vaga para onde o botão está indo (os presos não saem do lugar)
    let alvo = Math.max(0, Math.min(rotina.ordem.length - 1, Math.round(y / h)));
    if (rotina.presos.has(rotina.ordem[alvo].id)) return;
    const atual = rotina.ordem.findIndex((p) => p.id === a.id);
    if (alvo !== atual) {
      const [item] = rotina.ordem.splice(atual, 1);
      rotina.ordem.splice(alvo, 0, item);
      // os presos voltam para a vaga deles
      corrigirPresos();
      desenharPilha(false);
    }
  });
  function soltarRotina() {
    if (!arrastoRotina) return;
    const { b, moveu } = arrastoRotina;
    arrastoRotina = null;
    if (!rotina) return;
    if (!moveu) { tocarPassoRotina(Number(b.dataset.id)); return; }
    b.classList.remove('arrastando');
    b.classList.add('encaixou');
    setTimeout(() => b.classList.remove('encaixou'), 260);
    tocar([[523, 0.06]]);
    desenharPilha(false);
  }
  document.addEventListener('pointerup', soltarRotina);
  document.addEventListener('pointercancel', soltarRotina);

  // mantém cada passo preso (já testado como certo) na sua posição certa
  function corrigirPresos() {
    const livres = rotina.ordem.filter((p) => !rotina.presos.has(p.id));
    rotina.ordem = rotina.certos.map((p) => (rotina.presos.has(p.id) ? p : livres.shift()));
  }

  // sem arrastar: toca em um passo e depois em outro para trocarem de lugar
  function tocarPassoRotina(id) {
    if (rotina.presos.has(id)) return;
    if (rotina.selecionado == null) { rotina.selecionado = id; SOM.clique(); desenharPilha(false); return; }
    if (rotina.selecionado !== id) {
      const i = rotina.ordem.findIndex((p) => p.id === rotina.selecionado), j = rotina.ordem.findIndex((p) => p.id === id);
      [rotina.ordem[i], rotina.ordem[j]] = [rotina.ordem[j], rotina.ordem[i]];
      tocar([[523, 0.06]]);
    }
    rotina.selecionado = null;
    desenharPilha(false);
  }

  $('btn-rotina-testar').onclick = () => {
    if (!rotina || !rotina.respondendo) return;
    rotina.tentativas++;
    rotina.tentativasTotal++;
    rotina.selecionado = null;
    const erradas = [];
    rotina.ordem.forEach((p, i) => { if (p.id === rotina.certos[i].id) rotina.presos.add(p.id); else erradas.push(p); });
    const pilha = $('rotina-pilha');
    pilha.querySelectorAll('.passo-rotina').forEach((b) => b.classList.remove('errado'));
    if (!erradas.length) { fimDaRotina(true); return; }
    // o primeiro passo fora do lugar vira a dica no relatório
    const i = rotina.ordem.findIndex((p, k) => p.id !== rotina.certos[k].id);
    rotina.primeiroErro = rotina.primeiroErro || `pôs "${rotina.ordem[i].texto}" no lugar de "${rotina.certos[i].texto}"`;
    erradas.forEach((p) => pilha.querySelector(`[data-id="${p.id}"]`).classList.add('errado'));
    SOM.errado();
    pilha.classList.remove('tremer');
    void pilha.offsetWidth;
    pilha.classList.add('tremer');
    desenharPilha(false);
    if (rotina.tentativas >= ROTINA.TENTATIVAS) { fimDaRotina(false); return; }
    msgRotina(`${erradas.length} ${erradas.length === 1 ? 'passo está' : 'passos estão'} fora do lugar. Os verdes já estão certos: tente de novo!`, 'erro');
  };

  function fimDaRotina(acertou) {
    rotina.respondendo = false;
    clearInterval(rotina.relogio);
    $('btn-rotina-testar').disabled = true;
    const tempo = (performance.now() - rotina.t0) / 1000;
    const n = rotina.certos.length;
    const tipo = TIPOS_ROTINA[n - 3];
    const texto = `${rotina.atual.titulo} (${n} passos)`;
    if (acertou) {
      // pontos: base pelo nível, bônus de rapidez e menos pontos a cada tentativa a mais
      const bom = n * 3;
      const bonus = Math.max(0, Math.min(100, Math.round(100 * (1 - (tempo - bom) / (bom * 2)))));
      const ganho = Math.max(10, Math.round((30 * rotina.nivel + bonus) / rotina.tentativas));
      rotina.pontos += ganho;
      const primeira = rotina.tentativas === 1;
      if (primeira) rotina.acertosPrimeira++;
      resultados.push({ m: tipo, certa: texto, erros: primeira ? [] : [`acertou na ${rotina.tentativas}ª tentativa; ${rotina.primeiroErro}`], nivel: rotina.nivel, tempo });
      SOM.certo();
      msgRotina(primeira ? `✅ Ordem perfeita! +${ganho} pontos em ${segundos(tempo)}` : `✅ Agora sim! +${ganho} pontos`, 'ok');
      $('rotina-pilha').querySelectorAll('.passo-rotina').forEach((b, i) => setTimeout(() => b.classList.add('festa'), i * 70));
      rotina.nivel = primeira ? Math.min(ROTINA.NIVEL_MAX, rotina.nivel + 1) : rotina.nivel;
    } else {
      // depois de 3 tentativas mostra a ordem certa
      resultados.push({ m: tipo, certa: texto, erros: [`não conseguiu em ${ROTINA.TENTATIVAS} tentativas; ${rotina.primeiroErro}`], nivel: rotina.nivel, tempo });
      rotina.ordem = rotina.certos.slice();
      rotina.certos.forEach((p) => rotina.presos.add(p.id));
      desenharPilha(false);
      msgRotina('Esta é a ordem certa. Vamos para a próxima!', 'erro');
      rotina.nivel = Math.max(1, rotina.nivel - 1);
    }
    rotina.primeiroErro = '';
    rotina.nivelMax = Math.max(rotina.nivelMax, rotina.nivel);
    $('rotina-pontos').textContent = rotina.pontos;
    rotina.proxima = setTimeout(novaRotina, acertou ? 1800 : 3200);
  }

  function terminarRotina() {
    const r = rotina;
    pararRotina();
    const tempos = resultados.filter((x) => !x.erros.length).map((x) => x.tempo);
    missao.extra = '';
    missao.resumo = [
      `Pontos: ${r.pontos}. Chegou a rotinas de ${r.nivelMax + 2} passos (nível ${r.nivelMax} de ${ROTINA.NIVEL_MAX}).`,
      `Acertou de primeira ${r.acertosPrimeira} de ${r.feitas} rotinas; usou ${r.tentativasTotal} tentativas no total.`,
      ...(tempos.length ? [`Tempo médio para ordenar (acertos de primeira): ${segundos(tempos.reduce((s, t) => s + t, 0) / tempos.length)}.`] : []),
    ];
    fimDaMissao();
    $('fim-titulo').textContent = r.acertosPrimeira === r.feitas ? 'Rotina perfeita!' : 'Rotinas concluídas!';
    $('fim-texto').textContent = `${aluno}, você organizou ${r.feitas} rotinas e fez ${r.pontos} pontos!`;
  }

  $('btn-rotina').onclick = () => { SOM.clique(); escolherProfessorE('Rotina Certa', telaRotinaMenu); };
  $('rotina-voltar').onclick = telaJogos;
  $('btn-rotina-comecar').onclick = () => { SOM.clique(); comecarRotina(); };
  $('rotina-sair').onclick = telaRotinaMenu;

  // ---------- Fichas Coloridas ----------
  // Agrupar e trocar (a ideia do valor posicional, em base 3), cálculo e atenção. A criança joga contra o Plenix:
  // na sua vez tira uma cartela e ganha essa quantidade de fichas vermelhas (1 ponto). Tocando em 3 fichas iguais, elas
  // viram 1 ficha da cor seguinte: 3 vermelhas = 1 azul (3 pontos), 3 azuis = 1 amarela (9 pontos). Ao terminar toca em
  // "Pronto"; se ainda dava para trocar, conta como esquecimento (atenção). Nos níveis Médio e Difícil o jogo pergunta
  // quantos pontos ela tem (uma das respostas erradas é o número de fichas: o erro de contar fichas sem olhar o valor).
  const FICHAS = { MAX_JOGADAS: 16 };
  const CORES_FICHA = [
    { id: 'vermelha', nome: 'vermelha', plural: 'vermelhas', valor: 1, cor: '#e53935' },
    { id: 'azul', nome: 'azul', plural: 'azuis', valor: 3, cor: '#1e88e5' },
    { id: 'amarela', nome: 'amarela', plural: 'amarelas', valor: 9, cor: '#fbc02d' },
  ];
  const NIVEIS_FICHAS = [
    { id: 'facil', titulo: 'Fácil', resumo: 'cartelas 1 a 3 · 1 amarela', max: 3, meta: 1, pergunta: false },
    { id: 'medio', titulo: 'Médio', resumo: 'cartelas 1 a 6 · 2 amarelas', max: 6, meta: 2, pergunta: true },
    { id: 'dificil', titulo: 'Difícil', resumo: 'cartelas 1 a 9 · 2 amarelas', max: 9, meta: 2, pergunta: true },
  ];
  const TIPOS_FICHAS = {
    troca: { id: 'troca', titulo: 'Trocar 3 fichas iguais', icone: '🔁', cor: '#e53935',
      regra: 'Toda vez que junta 3 fichas iguais, troca pela ficha seguinte: 3 vermelhas = 1 azul e 3 azuis = 1 amarela. É a mesma ideia de juntar 10 unidades em 1 dezena.' },
    conta: { id: 'conta', titulo: 'Contar os pontos', icone: '🔢', cor: '#1e88e5',
      regra: 'Cada cor vale um tanto: vermelha 1, azul 3 e amarela 9. Para saber os pontos, multiplica cada cor pelo valor e soma (não é o número de fichas).' },
  };
  let fichasNivel = 1;
  let fichas = null;   // a partida em andamento
  const pontosDe = (m) => m.vermelha + m.azul * 3 + m.amarela * 9;
  const podeTrocar = (m) => m.vermelha >= 3 || m.azul >= 3;

  function telaFichasMenu() {
    pararFichas();
    mascote('davi-fichas', 'oi');
    $('fichas-niveis').innerHTML = NIVEIS_FICHAS.map((n, i) =>
      `<button class="chuva-modo${i === fichasNivel ? ' ativo' : ''}" type="button" data-nivel="${i}">${n.titulo}<small>${n.resumo}</small></button>`).join('');
    mostrar('tela-fichas-menu');
  }
  $('fichas-niveis').onclick = (e) => {
    const b = e.target.closest('.chuva-modo'); if (!b) return;
    SOM.clique();
    fichasNivel = Number(b.dataset.nivel);
    document.querySelectorAll('#fichas-niveis .chuva-modo').forEach((x) => x.classList.toggle('ativo', x === b));
  };

  function comecarFichas() {
    pararFichas();
    const nivel = NIVEIS_FICHAS[fichasNivel];
    missao = { id: 'fichas-' + nivel.id, fichas: true, icone: '🔴', cor: '#e53935', titulo: `Fichas Coloridas (${nivel.titulo}: ${nivel.resumo})` };
    resultados = [];
    fichas = { nivel, rodando: true, aluno: { vermelha: 0, azul: 0, amarela: 0 }, rival: { vermelha: 0, azul: 0, amarela: 0 },
      jogadas: 0, trocas: 0, esquecimentos: 0, contasCertas: 0, contas: 0, selecao: [], fase: 'tirar', timers: [] };
    $('fichas-titulo').textContent = `🔴 ${nivel.titulo}`;
    $('fichas-meta').textContent = `Meta: ${'🟡'.repeat(nivel.meta)}`;
    mostrar('tela-fichas');
    desenharFichas();
    vezDoAluno();
  }

  function pararFichas() {
    if (fichas) { fichas.rodando = false; fichas.timers.forEach(clearTimeout); }
    fichas = null;
  }
  const depoisFichas = (ms, fn) => { const f = fichas; const t = setTimeout(() => { if (fichas === f && f.rodando) fn(); }, ms); f.timers.push(t); };
  const msgFichas = (texto, tipo = '') => { $('fichas-msg').innerHTML = texto; $('fichas-msg').className = `fichas-msg ${tipo}`; };

  // bandeja do aluno (fichas que dá para tocar) e a do Plenix (só para ver)
  function desenharFichas() {
    const m = fichas.aluno;
    $('fichas-bandeja').innerHTML = CORES_FICHA.slice().reverse().map((c) => `
      <div class="fichas-linha" data-cor="${c.id}">
        <span class="fichas-rotulo">${c.plural} <b>×${c.valor}</b></span>
        <div class="fichas-pilha">${Array.from({ length: m[c.id] }, (_, i) =>
          `<button class="ficha" type="button" data-cor="${c.id}" data-i="${i}" style="--cor:${c.cor}" aria-label="Ficha ${c.nome}, vale ${c.valor}">${c.valor}</button>`).join('')
          || `<span class="ficha-vaga" style="--cor:${c.cor}" aria-hidden="true">${c.valor}</span>`}</div>
      </div>`).join('');
    const r = fichas.rival;
    $('fichas-rival').innerHTML = `<span class="fichas-rival-nome">🤖 Plenix</span>`
      + CORES_FICHA.slice().reverse().map((c) => `<span class="fichas-mini" style="--cor:${c.cor}">${r[c.id]}</span>`).join('')
      + `<span class="fichas-rival-pts">${pontosDe(r)} pts</span>`;
    fichas.selecao = [];
  }

  function vezDoAluno() {
    fichas.fase = 'tirar';
    $('btn-fichas-tirar').hidden = false;
    $('btn-fichas-tirar').disabled = false;
    $('btn-fichas-pronto').hidden = true;
    $('fichas-pergunta').hidden = true;
    msgFichas('Sua vez! Toque em <b>🃏 Tirar cartela</b>.');
  }

  function virarCartela(n) {
    const c = $('fichas-cartela');
    c.classList.remove('virou');
    void c.offsetWidth;
    c.classList.add('virou');
    c.innerHTML = `<span>${n}</span>`;
  }

  $('btn-fichas-tirar').onclick = () => {
    if (!fichas || fichas.fase !== 'tirar') return;
    const n = 1 + Math.floor(Math.random() * fichas.nivel.max);
    fichas.jogadas++;
    fichas.fase = 'trocar';
    fichas.t0 = performance.now();
    fichas.esqueceuNestaJogada = false;
    fichas.trocasNestaJogada = 0;
    fichas.cartela = n;
    $('btn-fichas-tirar').disabled = true;
    virarCartela(n);
    tocar([[392, 0.08], [523, 0.1]]);
    // as fichas vermelhas caem uma a uma na bandeja
    for (let i = 0; i < n; i++) {
      depoisFichas(250 + i * 140, () => {
        fichas.aluno.vermelha++;
        desenharFichas();
        const nova = $('fichas-bandeja').querySelector('.fichas-linha[data-cor="vermelha"] .ficha:last-child');
        if (nova) nova.classList.add('caiu');
        tocar([[660 + i * 30, 0.05]]);
      });
    }
    depoisFichas(300 + n * 140, () => {
      $('btn-fichas-tirar').hidden = true;
      $('btn-fichas-pronto').hidden = false;
      msgFichas(`Você ganhou <b>${n}</b> ficha${n === 1 ? '' : 's'} vermelha${n === 1 ? '' : 's'}! Toque em <b>3 fichas iguais</b> para trocar. Depois, <b>✔ Pronto</b>.`);
    });
  };

  // tocar em fichas: 3 iguais selecionadas viram 1 da cor seguinte (as amarelas não trocam)
  $('fichas-bandeja').onclick = (e) => {
    const b = e.target.closest('.ficha');
    if (!b || !fichas || fichas.fase !== 'trocar') return;
    const cor = b.dataset.cor;
    if (cor === 'amarela') { msgFichas('A amarela é a ficha mais valiosa: ela não troca. 🟡'); return; }
    const chave = `${cor}-${b.dataset.i}`;
    if (fichas.selecao.length && !fichas.selecao[0].startsWith(cor)) {   // trocou de cor: recomeça a seleção
      fichas.selecao = [];
      $('fichas-bandeja').querySelectorAll('.ficha.escolhida').forEach((x) => x.classList.remove('escolhida'));
    }
    if (fichas.selecao.includes(chave)) {
      fichas.selecao = fichas.selecao.filter((x) => x !== chave);
      b.classList.remove('escolhida');
      return;
    }
    fichas.selecao.push(chave);
    b.classList.add('escolhida');
    tocar([[523 + fichas.selecao.length * 80, 0.06]]);
    if (fichas.selecao.length === 3) trocarFichas(cor);
  };

  function trocarFichas(cor) {
    const i = CORES_FICHA.findIndex((c) => c.id === cor);
    const proxima = CORES_FICHA[i + 1];
    fichas.fase = 'animando';
    // as 3 fichas se juntam (antecipação) e viram 1 da cor seguinte (encaixe com quique)
    $('fichas-bandeja').querySelectorAll('.ficha.escolhida').forEach((x) => x.classList.add('juntando'));
    depoisFichas(320, () => {
      fichas.aluno[cor] -= 3;
      fichas.aluno[proxima.id]++;
      fichas.trocas++;
      fichas.trocasNestaJogada++;
      desenharFichas();
      const nova = $('fichas-bandeja').querySelector(`.fichas-linha[data-cor="${proxima.id}"] .ficha:last-child`);
      if (nova) nova.classList.add('nasceu');
      tocar([[523, 0.08], [784, 0.14]]);
      if (fichas.aluno.amarela >= fichas.nivel.meta) {   // chegou na meta: trava os botões e termina
        fichas.fase = 'fim';
        $('btn-fichas-pronto').hidden = true;
        msgFichas('🏆 Você juntou as amarelas!', 'ok');
        depoisFichas(800, () => fimFichas('aluno'));
        return;
      }
      fichas.fase = 'trocar';
      msgFichas(`3 ${CORES_FICHA[i].plural} viraram 1 <b>${proxima.nome}</b>! ${podeTrocar(fichas.aluno) ? 'Ainda dá para trocar mais.' : 'Agora toque em <b>✔ Pronto</b>.'}`, 'ok');
    });
  }

  $('btn-fichas-pronto').onclick = () => {
    if (!fichas || fichas.fase !== 'trocar') return;
    if (podeTrocar(fichas.aluno)) {
      // esqueceu uma troca: avisa (conta uma vez por jogada) e deixa trocar
      if (!fichas.esqueceuNestaJogada) { fichas.esqueceuNestaJogada = true; fichas.esquecimentos++; }
      SOM.errado();
      const bandeja = $('fichas-bandeja');
      bandeja.classList.remove('tremer');
      void bandeja.offsetWidth;
      bandeja.classList.add('tremer');
      const cor = fichas.aluno.vermelha >= 3 ? 'vermelhas' : 'azuis';
      msgFichas(`Ainda dá para trocar! Você tem 3 ou mais fichas <b>${cor}</b>. 👀`, 'erro');
      return;
    }
    const tempo = (performance.now() - fichas.t0) / 1000;
    const m = fichas.aluno;
    const texto = `Cartela ${fichas.cartela}: ficou com ${m.amarela} amarela${m.amarela === 1 ? '' : 's'}, ${m.azul} azu${m.azul === 1 ? 'l' : 'is'} e ${m.vermelha} vermelha${m.vermelha === 1 ? '' : 's'}`;
    resultados.push({ m: TIPOS_FICHAS.troca, certa: texto, erros: fichas.esqueceuNestaJogada ? ['tocou em Pronto ainda com uma troca para fazer'] : [], tempo });
    if (fichas.nivel.pergunta) perguntarPontos(texto); else vezDoPlenix();
  };

  // quantos pontos? a resposta certa, o número de fichas (erro comum) e uma vizinha
  function perguntarPontos(texto) {
    fichas.fase = 'pergunta';
    $('btn-fichas-pronto').hidden = true;
    const m = fichas.aluno, certo = pontosDe(m), qtd = m.vermelha + m.azul + m.amarela;
    const opcoes = new Set([certo]);
    if (qtd !== certo) opcoes.add(qtd);
    for (const d of [3, 1, -1, -3, 9, 2]) { if (opcoes.size >= 3) break; if (certo + d > 0) opcoes.add(certo + d); }
    $('fichas-opcoes').innerHTML = embaralhar([...opcoes]).map((v) => `<button class="mat-resposta" type="button" data-v="${v}">${v}</button>`).join('');
    $('fichas-pergunta').hidden = false;
    msgFichas('Conte: vermelha vale 1, azul vale 3, amarela vale 9.');
    fichas.textoConta = texto;
    fichas.t1 = performance.now();
  }
  $('fichas-opcoes').onclick = (e) => {
    const b = e.target.closest('.mat-resposta');
    if (!b || !fichas || fichas.fase !== 'pergunta') return;
    const m = fichas.aluno, certo = pontosDe(m), v = Number(b.dataset.v), qtd = m.vermelha + m.azul + m.amarela;
    fichas.contas++;
    const conta = `${m.amarela}×9 + ${m.azul}×3 + ${m.vermelha}×1 = ${certo} pontos`;
    if (v === certo) {
      fichas.contasCertas++;
      b.classList.add('certa');
      SOM.certo();
      msgFichas(`✅ Isso! ${conta}.`, 'ok');
      resultados.push({ m: TIPOS_FICHAS.conta, certa: conta, erros: [] });
    } else {
      b.classList.add('errada');
      SOM.errado();
      msgFichas(`Quase! ${conta}.`, 'erro');
      resultados.push({ m: TIPOS_FICHAS.conta, certa: conta, erros: [v === qtd && qtd !== certo ? `respondeu ${v} (contou as fichas, sem o valor de cada cor)` : `respondeu ${v}`] });
    }
    fichas.fase = 'animando';
    depoisFichas(1600, vezDoPlenix);
  };

  // vez do Plenix: tira uma cartela e faz as trocas sozinho, devagar, para a criança acompanhar
  function vezDoPlenix() {
    $('fichas-pergunta').hidden = true;
    $('btn-fichas-pronto').hidden = true;
    $('btn-fichas-tirar').hidden = false;
    $('btn-fichas-tirar').disabled = true;
    if (fichas.jogadas >= FICHAS.MAX_JOGADAS) { fimFichas('tempo'); return; }
    fichas.fase = 'plenix';
    const n = 1 + Math.floor(Math.random() * fichas.nivel.max);
    msgFichas(`🤖 Vez do Plenix…`);
    depoisFichas(700, () => {
      virarCartela(n);
      fichas.rival.vermelha += n;
      desenharFichas();
      msgFichas(`🤖 O Plenix tirou <b>${n}</b> e ganhou ${n} vermelha${n === 1 ? '' : 's'}.`);
      const passo = () => {
        const r = fichas.rival;
        if (r.vermelha >= 3) { r.vermelha -= 3; r.azul++; msgFichas('🤖 O Plenix trocou 3 vermelhas por 1 azul.'); }
        else if (r.azul >= 3) { r.azul -= 3; r.amarela++; msgFichas('🤖 O Plenix trocou 3 azuis por 1 amarela.'); }
        else { if (r.amarela >= fichas.nivel.meta) fimFichas('plenix'); else depoisFichas(700, vezDoAluno); return; }
        desenharFichas();
        tocar([[392, 0.06], [494, 0.08]]);
        depoisFichas(900, passo);
      };
      depoisFichas(1000, passo);
    });
  }

  function fimFichas(quem) {
    const f = fichas;
    pararFichas();
    missao.extra = '';
    missao.resumo = [
      quem === 'aluno' ? `Ganhou do Plenix! Juntou ${f.nivel.meta} amarela${f.nivel.meta === 1 ? '' : 's'} em ${f.jogadas} jogadas.`
        : quem === 'plenix' ? `O Plenix chegou primeiro desta vez (${f.jogadas} jogadas). O aluno terminou com ${pontosDe(f.aluno)} pontos.`
          : `A partida acabou depois de ${f.jogadas} jogadas, com ${pontosDe(f.aluno)} pontos.`,
      `Fez ${f.trocas} troca${f.trocas === 1 ? '' : 's'}; esqueceu de trocar em ${f.esquecimentos} de ${f.jogadas} jogadas.`,
      ...(f.contas ? [`Contou os pontos certo em ${f.contasCertas} de ${f.contas} perguntas.`] : []),
    ];
    fimDaMissao();
    $('fim-titulo').textContent = quem === 'aluno' ? 'Você venceu! 🏆' : 'O Plenix venceu desta vez!';
    $('fim-texto').textContent = `${aluno}, você fez ${f.trocas} trocas e terminou com ${pontosDe(f.aluno)} pontos!`;
  }

  $('btn-fichas').onclick = () => { SOM.clique(); escolherProfessorE('Fichas Coloridas', telaFichasMenu); };
  $('fichas-voltar').onclick = telaJogos;
  $('btn-fichas-comecar').onclick = () => { SOM.clique(); comecarFichas(); };
  $('fichas-sair').onclick = telaFichasMenu;

  // ---------- Somando as Cores ----------
  // Coordenadas, atenção e cálculo. Uma tabela de cores (linhas A, B, C... e colunas 1, 2, 3...) e, em cima, as
  // bolinhas com o valor de cada cor. A conta usa casas da tabela (A2 + C3): o aluno acha a cor de cada casa, troca
  // pelo valor e faz a conta. Acertar sobe um nível, errar desce. Os níveis aumentam a tabela, as cores, os valores,
  // o número de casas na conta e trazem a subtração e a multiplicação. As respostas erradas imitam os erros comuns:
  // trocar a linha pela coluna (ler A2 como B1) e olhar a casa vizinha. Tocar numa casa da conta acende a linha e a
  // coluna dela (dica, contada no relatório).
  const CORES = { CONTAS: 15, NIVEL_MAX: 8, PAUSA: 2200 };
  const PALETA_CORES = [
    { id: 'verde', nome: 'verde', cor: '#2e7d32' },
    { id: 'vermelho', nome: 'vermelho', cor: '#e53935' },
    { id: 'roxo', nome: 'roxo', cor: '#8e44ad' },
    { id: 'azul', nome: 'azul', cor: '#1e64d2' },
    { id: 'amarelo', nome: 'amarelo', cor: '#fbc02d' },
    { id: 'laranja', nome: 'laranja', cor: '#f57c00' },
  ];
  // lado da tabela, quantas cores, faixa dos valores, casas na conta e operações de cada nível
  const NIVEIS_CORES = [
    { lado: 4, cores: 3, min: 1, max: 5, termos: 2, ops: ['+'] },
    { lado: 4, cores: 4, min: 1, max: 9, termos: 2, ops: ['+'] },
    { lado: 4, cores: 4, min: 1, max: 9, termos: 2, ops: ['+', '−'] },
    { lado: 4, cores: 5, min: 2, max: 12, termos: 3, ops: ['+'] },
    { lado: 5, cores: 5, min: 2, max: 15, termos: 3, ops: ['+', '−'] },
    { lado: 5, cores: 6, min: 1, max: 9, termos: 2, ops: ['×'] },
    { lado: 5, cores: 6, min: 2, max: 20, termos: 3, ops: ['+', '−'] },
    { lado: 5, cores: 6, min: 1, max: 9, termos: 3, ops: ['×', '+'] },
  ];
  const TIPOS_CORES = {
    soma: { id: 'soma', titulo: 'Somar as cores', icone: '➕', cor: '#2e7d32',
      regra: 'Ache a linha (letra) e a coluna (número) de cada casa, veja a cor e troque pelo valor da bolinha. Depois some.' },
    sub: { id: 'sub', titulo: 'Somar e tirar', icone: '➖', cor: '#e53935',
      regra: 'Troque cada casa pelo valor da cor e faça a conta da esquerda para a direita: primeiro o que vem antes.' },
    mult: { id: 'mult', titulo: 'Multiplicar as cores', icone: '✖️', cor: '#8e44ad',
      regra: 'Troque cada casa pelo valor da cor. Na conta com × e +, faça primeiro a multiplicação e depois some.' },
  };
  const LETRAS = 'ABCDE';
  let cores = null;   // a partida em andamento
  const nomeCasa = (l, c) => `${LETRAS[l]}${c + 1}`;

  function telaCoresMenu() {
    pararCores();
    mascote('davi-cores', 'oi');
    mostrar('tela-cores-menu');
  }

  function comecarCores() {
    pararCores();
    missao = { id: 'cores', cores: true, icone: '🎨', cor: '#8e44ad', titulo: 'Somando as Cores' };
    resultados = [];
    cores = { nivel: 1, nivelMax: 1, feitas: 0, acertos: 0, pontos: 0, dicas: 0, conta: null, timers: [], rodando: true };
    mostrar('tela-cores');
    proximaCores();
  }

  function pararCores() {
    if (cores) { cores.rodando = false; cores.timers.forEach(clearTimeout); }
    cores = null;
  }
  const depoisCores = (ms, fn) => { const c = cores; const t = setTimeout(() => { if (cores === c && c.rodando) fn(); }, ms); c.timers.push(t); };
  const msgCores = (texto, tipo = '') => { $('cores-msg').innerHTML = texto; $('cores-msg').className = `cores-msg ${tipo}`; };

  // valores diferentes para cada cor, sorteados na faixa do nível
  function sortearValores(nv) {
    const faixa = Array.from({ length: nv.max - nv.min + 1 }, (_, i) => nv.min + i);
    return embaralhar(faixa).slice(0, nv.cores);
  }

  // tabela com todas as cores do nível (cada uma aparece pelo menos uma vez)
  function sortearTabela(nv) {
    const n = nv.lado * nv.lado;
    const lista = Array.from({ length: n }, (_, i) => (i < nv.cores ? i : Math.floor(Math.random() * nv.cores)));
    const misturada = embaralhar(lista);
    return Array.from({ length: nv.lado }, (_, l) => misturada.slice(l * nv.lado, (l + 1) * nv.lado));
  }

  // calcula a conta (× antes de + e −; o resto da esquerda para a direita); null se algum passo ficar negativo
  function calcularCores(vals, ops) {
    const termos = [vals[0]], sinais = [];
    ops.forEach((op, i) => {
      if (op === '×') termos.push(termos.pop() * vals[i + 1]);
      else { sinais.push(op); termos.push(vals[i + 1]); }
    });
    let total = termos[0];
    for (let i = 0; i < sinais.length; i++) {
      total = sinais[i] === '+' ? total + termos[i + 1] : total - termos[i + 1];
      if (total < 0) return null;
    }
    return total;
  }

  function montarContaCores(nv, tabela, valores) {
    const todas = [];
    for (let l = 0; l < nv.lado; l++) for (let c = 0; c < nv.lado; c++) todas.push([l, c]);
    for (let tentativa = 0; tentativa < 80; tentativa++) {
      const casas = embaralhar(todas).slice(0, nv.termos);
      let ops = Array.from({ length: nv.termos - 1 }, () => sortear(nv.ops));
      if (nv.ops.includes('×') && nv.ops.length > 1) ops = ['×', '+'];   // nível 8: A1 × B2 + C3
      if (nv.ops.includes('−') && !ops.includes('−') && Math.random() < 0.6) ops[ops.length - 1] = '−';
      const vals = casas.map(([l, c]) => valores[tabela[l][c]]);
      const res = calcularCores(vals, ops);
      if (res == null) continue;
      if (res === 0 && tentativa < 60) continue;   // evita muitas contas que dão zero
      const tipo = ops.includes('×') ? TIPOS_CORES.mult : ops.includes('−') ? TIPOS_CORES.sub : TIPOS_CORES.soma;
      return { casas, ops, vals, res, tipo };
    }
    return null;
  }

  // respostas erradas: trocou linha e coluna, olhou a casa vizinha e errou a conta (vizinhos do resultado)
  function opcoesCores(conta, nv, tabela, valores) {
    const erradas = new Map();   // valor -> motivo
    const valorCom = (casas) => calcularCores(casas.map(([l, c]) => valores[tabela[l][c]]), conta.ops);
    const trocadas = conta.casas.map(([l, c]) => [c, l]);
    const r1 = valorCom(trocadas);
    if (r1 != null && r1 !== conta.res) erradas.set(r1, 'trocou a linha pela coluna');
    for (let k = 0; k < conta.casas.length && erradas.size < 2; k++) {
      const [l, c] = conta.casas[k];
      for (const [dl, dc] of embaralhar([[0, 1], [0, -1], [1, 0], [-1, 0]])) {
        const nl = l + dl, nc = c + dc;
        if (nl < 0 || nc < 0 || nl >= nv.lado || nc >= nv.lado) continue;
        const casas = conta.casas.map((x, i) => (i === k ? [nl, nc] : x));
        const r = valorCom(casas);
        if (r != null && r !== conta.res && !erradas.has(r)) { erradas.set(r, 'olhou a casa vizinha'); break; }
      }
    }
    for (const d of embaralhar([1, -1, 2, -2, 10, -10, 3])) {
      if (erradas.size >= 3) break;
      const v = conta.res + d;
      if (v >= 0 && v !== conta.res && !erradas.has(v)) erradas.set(v, 'errou a conta');
    }
    for (let v = conta.res + 4; erradas.size < 3; v++) if (!erradas.has(v)) erradas.set(v, 'errou a conta');   // sempre 4 botões, só 1 certo
    conta.motivos = erradas;
    return embaralhar([conta.res, ...[...erradas.keys()].slice(0, 3)]);
  }

  function proximaCores() {
    if (cores.feitas >= CORES.CONTAS) { terminarCores(); return; }
    const nv = NIVEIS_CORES[cores.nivel - 1];
    let tabela, valores, conta;
    do {
      tabela = sortearTabela(nv);
      valores = sortearValores(nv);
      conta = montarContaCores(nv, tabela, valores);
    } while (!conta);
    cores.feitas++;
    cores.nv = nv;
    cores.tabela = tabela;
    cores.valores = valores;
    cores.conta = conta;
    cores.t0 = performance.now();
    cores.dicaNestaConta = false;
    hudCores();
    // legenda: uma bolinha por cor com o valor
    $('cores-legenda').innerHTML = valores.map((v, i) =>
      `<span class="cores-bola" style="--cor:${PALETA_CORES[i].cor};animation-delay:${i * 60}ms" title="${PALETA_CORES[i].nome}">${v}</span>`).join('');
    // tabela com cabeçalhos: canto vazio, números das colunas e letras das linhas
    const g = $('cores-grade');
    g.style.setProperty('--lado', nv.lado);
    let html = '<span class="cores-cab cores-canto"></span>';
    for (let c = 0; c < nv.lado; c++) html += `<span class="cores-cab" data-col="${c}">${c + 1}</span>`;
    for (let l = 0; l < nv.lado; l++) {
      html += `<span class="cores-cab" data-lin="${l}">${LETRAS[l]}</span>`;
      for (let c = 0; c < nv.lado; c++) {
        const k = tabela[l][c];
        html += `<span class="cores-casa" data-lin="${l}" data-col="${c}" style="--cor:${PALETA_CORES[k].cor};animation-delay:${(l + c) * 35}ms" aria-label="${nomeCasa(l, c)} ${PALETA_CORES[k].nome}"></span>`;
      }
    }
    g.innerHTML = html;
    // a conta: cada casa é um botão que acende a linha e a coluna
    $('cores-conta').className = 'cores-conta';
    $('cores-conta').innerHTML = conta.casas.map(([l, c], i) =>
      (i ? `<span class="cores-sinal">${conta.ops[i - 1]}</span>` : '')
      + `<button class="cores-coord" type="button" data-lin="${l}" data-col="${c}">${nomeCasa(l, c)}</button>`).join('')
      + '<span class="cores-sinal">=</span><span class="cores-res">?</span>';
    msgCores(cores.feitas === 1 ? 'Ache a cor de cada casa e troque pelo número da bolinha.' : '');
    $('cores-respostas').innerHTML = '';
    opcoesCores(conta, nv, tabela, valores).forEach((v, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'mat-resposta';
      b.textContent = v;
      b.dataset.tecla = i + 1;
      b.onclick = () => responderCores(v, b);
      $('cores-respostas').append(b);
    });
  }

  function hudCores() {
    $('cores-nivel').textContent = `🎨 Nível ${cores.nivel} de ${CORES.NIVEL_MAX}`;
    $('cores-pontos').textContent = cores.pontos;
    $('cores-contador').textContent = `${cores.feitas}/${CORES.CONTAS}`;
  }

  // acende a linha e a coluna de uma casa (e a própria casa)
  function acenderCasa(l, c, fixo) {
    const g = $('cores-grade');
    g.querySelectorAll('.guia').forEach((x) => x.classList.remove('guia'));
    g.querySelectorAll(`[data-lin="${l}"], [data-col="${c}"]`).forEach((x) => x.classList.add('guia'));
    const casa = g.querySelector(`.cores-casa[data-lin="${l}"][data-col="${c}"]`);
    if (casa) { casa.classList.remove('alvo'); void casa.offsetWidth; casa.classList.add('alvo'); }
    if (!fixo) depoisCores(1600, () => g.querySelectorAll('.guia').forEach((x) => x.classList.remove('guia')));
  }

  $('cores-conta').onclick = (e) => {
    const b = e.target.closest('.cores-coord');
    if (!b || !cores || !cores.conta) return;
    if (!cores.conta.respondida && !cores.dicaNestaConta) { cores.dicaNestaConta = true; cores.dicas++; }
    tocar([[660, 0.05]]);
    acenderCasa(Number(b.dataset.lin), Number(b.dataset.col), false);
  };

  function responderCores(valor, botao) {
    const conta = cores && cores.conta;
    if (!conta || conta.respondida || !cores.rodando) return;
    conta.respondida = true;
    const tempo = (performance.now() - cores.t0) / 1000;
    const botoes = [...document.querySelectorAll('#cores-respostas .mat-resposta')];
    botoes.forEach((b) => { b.disabled = true; });
    const certoEl = botoes.find((b) => Number(b.textContent) === conta.res);
    const nomes = conta.casas.map(([l, c]) => nomeCasa(l, c));
    const texto = nomes.map((n, i) => (i ? ` ${conta.ops[i - 1]} ` : '') + n).join('') + ` = ${conta.res}`;
    const explicacao = conta.casas.map(([l, c], i) => {
      const k = cores.tabela[l][c];
      return `${nomes[i]} <span class="cores-mini" style="--cor:${PALETA_CORES[k].cor}"></span> = <b>${conta.vals[i]}</b>`;
    }).join(' · ');
    const contaNum = conta.vals.map((v, i) => (i ? ` ${conta.ops[i - 1]} ` : '') + v).join('') + ` = ${conta.res}`;
    $('cores-conta').querySelector('.cores-res').textContent = conta.res;
    // as casas da conta piscam na tabela (continuação: a resposta aponta de volta para onde estava a cor)
    conta.casas.forEach(([l, c], i) => depoisCores(i * 220, () => {
      const casa = $('cores-grade').querySelector(`.cores-casa[data-lin="${l}"][data-col="${c}"]`);
      if (casa) { casa.classList.remove('alvo'); void casa.offsetWidth; casa.classList.add('alvo'); }
    }));
    const cor = (n) => PALETA_CORES[cores.tabela[conta.casas[n][0]][conta.casas[n][1]]].nome;
    const textoRel = `${texto} (${conta.casas.map((_, i) => `${nomes[i]} ${cor(i)} = ${conta.vals[i]}`).join(', ')})`;
    if (valor === conta.res) {
      const rapidez = Math.max(0, 1 - tempo / 30);
      const ganhou = 10 * cores.nivel + Math.round(rapidez * 10) - (cores.dicaNestaConta ? 3 : 0);
      cores.pontos += Math.max(5, ganhou);
      cores.acertos++;
      botao.classList.add('certa');
      $('cores-conta').classList.remove('acertou', 'errou'); void $('cores-conta').offsetWidth;
      $('cores-conta').classList.add('acertou');
      resultados.push({ m: conta.tipo, certa: textoRel, erros: [], nivel: cores.nivel, tempo });
      cores.nivel = Math.min(CORES.NIVEL_MAX, cores.nivel + 1);
      cores.nivelMax = Math.max(cores.nivelMax, cores.nivel);
      msgCores(`✅ Isso! ${explicacao} → ${contaNum}`, 'ok');
      SOM.certo();
    } else {
      const motivo = conta.motivos.get(valor) || 'errou a conta';
      botao.classList.add('errada');
      if (certoEl) certoEl.classList.add('certa');
      botoes.forEach((b) => { if (b !== botao && b !== certoEl) b.classList.add('apagada'); });
      $('cores-conta').classList.remove('acertou', 'errou'); void $('cores-conta').offsetWidth;
      $('cores-conta').classList.add('errou');
      // tremida curta na tabela (impacto do erro, sem exagero)
      const q = $('cores-quadro');
      q.classList.remove('tremer'); void q.offsetWidth; q.classList.add('tremer');
      resultados.push({ m: conta.tipo, certa: textoRel, erros: [`respondeu ${valor} (${motivo})`], nivel: cores.nivel, tempo });
      cores.nivel = Math.max(1, cores.nivel - 1);
      const dica = motivo === 'trocou a linha pela coluna' ? 'A <b>letra</b> é a linha (deitada) e o <b>número</b> é a coluna (em pé). '
        : motivo === 'olhou a casa vizinha' ? 'Siga a linha e a coluna com o dedo até elas se encontrarem. ' : '';
      msgCores(`Quase! ${dica}${explicacao} → ${contaNum}`, 'erro');
      SOM.errado();
    }
    hudCores();
    depoisCores(CORES.PAUSA + (valor === conta.res ? 0 : 1200), proximaCores);
  }

  function terminarCores() {
    const { acertos, feitas, pontos, nivelMax, dicas } = cores;
    pararCores();
    missao.resumo = [
      `Acertou ${acertos} de ${feitas} contas e chegou ao nível ${nivelMax} de ${CORES.NIVEL_MAX}.`,
      `Pediu para acender a linha e a coluna em ${dicas} de ${feitas} contas.`,
    ];
    fimDaMissao();
    const n = ultimoRelatorio.estrelas;
    $('fim-titulo').textContent = n === 3 ? 'Tabela dominada! 🎨' : 'Fim das contas!';
    $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitas} contas, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
  }

  // teclas 1 a 4 escolhem a resposta no computador
  document.addEventListener('keydown', (e) => {
    if (!cores || !$('tela-cores').classList.contains('ativa')) return;
    const b = document.querySelector(`#cores-respostas .mat-resposta[data-tecla="${e.key}"]`);
    if (b && !b.disabled) b.click();
  });

  $('btn-cores').onclick = () => { SOM.clique(); escolherProfessorE('Somando as Cores', telaCoresMenu); };
  $('cores-voltar').onclick = telaJogos;
  $('btn-cores-comecar').onclick = () => { SOM.clique(); comecarCores(); };
  $('cores-sair').onclick = telaCoresMenu;

  // ---------- Esquerda e Direita ----------
  // Lateralidade, atenção e controle inibitório. A mesa tem um buraco em cada canto e uma bola de cada lado.
  // No meio aparecem setas: uma seta deitada (← ou →) diz qual bola jogar e a seta em pé (↑ ou ↓) diz para onde;
  // só aquela bola deve ser jogada. A partir do nível 4, às vezes aparecem duas setas em pé: as duas bolas são
  // jogadas, cada uma no sentido da sua seta (mesmo sentido ou, do nível 5 em diante, sentidos opostos).
  // Quanto mais rápido, mais pontos. Dois acertos seguidos sobem um nível; um erro desce.
  // A bola vai com o dedo (deslizar para cima ou para baixo na metade da mesa) ou tocando no buraco;
  // no computador, W/S jogam a bola da esquerda e ↑/↓ a da direita.
  const LADOS = { COMANDOS: 20, NIVEL_MAX: 8 };
  // tempo para responder (s), chance de vir o comando com as duas bolas e se ele pode ter sentidos opostos
  const NIVEIS_LADOS = [
    { tempo: 5, dupla: 0, oposto: false },
    { tempo: 4.5, dupla: 0, oposto: false },
    { tempo: 4, dupla: 0, oposto: false },
    { tempo: 4.5, dupla: 0.3, oposto: false },
    { tempo: 4.5, dupla: 0.4, oposto: true },
    { tempo: 4, dupla: 0.5, oposto: true },
    { tempo: 3.5, dupla: 0.5, oposto: true },
    { tempo: 3, dupla: 0.5, oposto: true },
  ];
  const TIPOS_LADOS = {
    simples: { id: 'simples', titulo: 'Uma bola: lado e direção', icone: '➡️', cor: '#1e64d2',
      regra: 'A seta deitada mostra qual bola jogar (esquerda ou direita) e a seta em pé mostra se ela vai para cima ou para baixo. Só essa bola se mexe.' },
    mesmo: { id: 'mesmo', titulo: 'Duas bolas, mesmo sentido', icone: '⏬', cor: '#0a8f6a',
      regra: 'Duas setas em pé: as duas bolas vão juntas, cada uma para onde a sua seta aponta (aqui, as duas para o mesmo lado).' },
    oposto: { id: 'oposto', titulo: 'Duas bolas, sentidos opostos', icone: '↕️', cor: '#e53935',
      regra: 'Duas setas em pé apontando para lados diferentes: a bola da esquerda segue a seta da esquerda e a da direita segue a seta da direita.' },
  };
  const NOME_LADO = { E: 'esquerda', D: 'direita' };
  const SETA_SVG = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M6 36h50V12l38 38-38 38V64H6z"/></svg>';
  const GIRO_SETA = { direita: 0, baixo: 90, esquerda: 180, cima: -90 };
  let lados = null;   // a partida em andamento

  function telaLadosMenu() {
    pararLados();
    mascote('davi-lados', 'oi');
    mostrar('tela-lados-menu');
  }

  function comecarLados() {
    pararLados();
    missao = { id: 'lados', lados: true, icone: '↔️', cor: '#0a8f6a', titulo: 'Esquerda e Direita' };
    resultados = [];
    lados = { nivel: 1, nivelMax: 1, seguidos: 0, feitos: 0, acertos: 0, pontos: 0, cmd: null, timers: [], rodando: true, ultimo: '' };
    $('lados-setas').innerHTML = '';
    $('lados-tempo').style.transition = 'none';
    $('lados-tempo').style.width = '0';
    ['E', 'D'].forEach((l) => { $(`lados-bola-${l}`).getAnimations().forEach((a) => a.cancel()); });
    hudLados();
    msgLados('Prepare-se…');
    mostrar('tela-lados');
    let n = 3;
    const contar = () => {
      if (n === 0) { $('lados-contagem').textContent = ''; proximoLados(); return; }
      $('lados-contagem').textContent = n--;
      SOM.clique();
      depoisLados(650, contar);
    };
    contar();
  }

  function pararLados() {
    if (lados) { lados.rodando = false; lados.timers.forEach(clearTimeout); }
    lados = null;
    $('lados-contagem').textContent = '';
  }
  const depoisLados = (ms, fn) => { const j = lados; const t = setTimeout(() => { if (lados === j && j.rodando) fn(); }, ms); j.timers.push(t); return t; };
  const msgLados = (texto, tipo = '') => { $('lados-msg').innerHTML = texto; $('lados-msg').className = `cores-msg ${tipo}`; };
  const setaHTML = (dir, rotulo = '') => `<span class="lados-seta" style="--giro:${GIRO_SETA[dir]}deg">${SETA_SVG}${rotulo ? `<small>${rotulo}</small>` : ''}</span>`;

  function hudLados() {
    $('lados-nivel').textContent = `↔️ Nível ${lados.nivel} de ${LADOS.NIVEL_MAX}`;
    $('lados-pontos').textContent = lados.pontos;
    $('lados-contador').textContent = `${lados.feitos}/${LADOS.COMANDOS}`;
  }

  // sorteia o próximo comando (sem repetir o anterior igualzinho)
  function sortearComando(nv) {
    for (;;) {
      let cmd;
      if (Math.random() < nv.dupla) {
        const E = sortear(['cima', 'baixo']);
        const D = nv.oposto && Math.random() < 0.5 ? (E === 'cima' ? 'baixo' : 'cima') : E;
        cmd = { dupla: true, dirs: { E, D }, tipo: E === D ? TIPOS_LADOS.mesmo : TIPOS_LADOS.oposto };
      } else {
        cmd = { dupla: false, lado: sortear(['E', 'D']), dir: sortear(['cima', 'baixo']), tipo: TIPOS_LADOS.simples };
      }
      const chave = cmd.dupla ? `2${cmd.dirs.E}${cmd.dirs.D}` : `1${cmd.lado}${cmd.dir}`;
      if (chave !== lados.ultimo) { lados.ultimo = chave; return cmd; }
    }
  }

  const textoComando = (c) => (c.dupla
    ? `as duas bolas: esquerda para ${c.dirs.E}, direita para ${c.dirs.D}`
    : `a bola da ${NOME_LADO[c.lado]} para ${c.dir}`);

  function proximoLados() {
    if (lados.feitos >= LADOS.COMANDOS) { terminarLados(); return; }
    const nv = NIVEIS_LADOS[lados.nivel - 1];
    const cmd = sortearComando(nv);
    cmd.feitos = { E: null, D: null };
    cmd.t0 = performance.now();
    cmd.limite = nv.tempo;
    lados.cmd = cmd;
    lados.feitos++;
    hudLados();
    msgLados('');
    $('lados-mesa').querySelectorAll('.lados-buraco').forEach((b) => b.classList.remove('certo', 'errado'));
    const setas = $('lados-setas');
    setas.className = `lados-setas${cmd.dupla ? ' dupla' : ''}`;
    setas.innerHTML = cmd.dupla
      ? setaHTML(cmd.dirs.E, 'E') + setaHTML(cmd.dirs.D, 'D')
      : setaHTML(cmd.lado === 'E' ? 'esquerda' : 'direita') + setaHTML(cmd.dir);
    // barra do tempo: começa cheia e esvazia até o limite
    const barra = $('lados-tempo');
    barra.style.transition = 'none';
    barra.style.width = '100%';
    void barra.offsetWidth;
    barra.style.transition = `width ${nv.tempo}s linear`;
    barra.style.width = '0';
    cmd.timer = depoisLados(nv.tempo * 1000, () => {
      const c = lados.cmd;
      if (!c || c.resolvido) return;
      const so = ['E', 'D'].filter((l) => c.feitos[l]);
      resolverLados(false, c.dupla && so.length ? `jogou só a bola da ${NOME_LADO[so[0]]}` : 'não jogou a tempo');
    });
  }

  // a bola vai até o buraco: antecipação (encolhe para o outro lado), viagem esticada e cai no buraco
  function jogarBola(lado, dir, certo) {
    const bola = $(`lados-bola-${lado}`);
    const alvo = dir === 'cima' ? '13%' : '87%', antes = dir === 'cima' ? '53%' : '47%';
    bola.getAnimations().forEach((a) => a.cancel());
    const ida = bola.animate([
      { top: '50%', transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      { top: antes, transform: 'translate(-50%, -50%) scale(1.15, 0.85)', opacity: 1, offset: 0.18 },
      { top: alvo, transform: 'translate(-50%, -50%) scale(0.88, 1.15)', opacity: 1, offset: 0.78 },
      { top: alvo, transform: 'translate(-50%, -50%) scale(0.25)', opacity: 0 },
    ], { duration: 380, easing: 'ease-in', fill: 'forwards' });
    const buraco = $('lados-mesa').querySelector(`.lados-buraco[data-lado="${lado}"][data-dir="${dir}"]`);
    ida.onfinish = () => {
      if (buraco) { buraco.classList.remove('certo', 'errado'); void buraco.offsetWidth; buraco.classList.add(certo ? 'certo' : 'errado'); }
      tocar(certo ? [[dir === 'cima' ? 660 : 440, 0.06]] : [[180, 0.1]]);
      // volta uma bola nova no meio (nasce pequena, passa do ponto e assenta)
      bola.animate([
        { top: '50%', transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0 },
        { top: '50%', transform: 'translate(-50%, -50%) scale(1.15, 0.9)', opacity: 1, offset: 0.65 },
        { top: '50%', transform: 'translate(-50%, -50%) scale(1)', opacity: 1 },
      ], { duration: 320, delay: 260, easing: 'ease-out', fill: 'forwards' });
    };
  }

  function jogarLados(lado, dir) {
    const c = lados && lados.cmd;
    if (!c || c.resolvido || !lados.rodando || c.feitos[lado]) return;
    c.feitos[lado] = dir;
    if (!c.dupla) {
      const certo = lado === c.lado && dir === c.dir;
      jogarBola(lado, dir, certo);
      if (certo) resolverLados(true);
      else resolverLados(false, lado !== c.lado ? `jogou a bola da ${NOME_LADO[lado]} (era a da ${NOME_LADO[c.lado]})` : `jogou para ${dir} (era para ${c.dir})`);
      return;
    }
    const certo = c.dirs[lado] === dir;
    jogarBola(lado, dir, certo);
    if (!certo) resolverLados(false, `a bola da ${NOME_LADO[lado]} foi para ${dir} (era para ${c.dirs[lado]})`);
    else if (c.feitos.E && c.feitos.D) resolverLados(true);
  }

  function resolverLados(acertou, motivo) {
    const c = lados.cmd;
    c.resolvido = true;
    clearTimeout(c.timer);
    const tempo = (performance.now() - c.t0) / 1000;
    const barra = $('lados-tempo');
    barra.style.width = getComputedStyle(barra).width;   // congela a barra onde parou
    barra.style.transition = 'none';
    const texto = `${c.dupla ? '⬆⬇ ' : ''}Jogar ${textoComando(c)}`;
    if (acertou) {
      const rapidez = Math.max(0, 1 - tempo / c.limite);
      const ganhou = 10 * lados.nivel + Math.round(rapidez * 20);
      lados.pontos += ganhou;
      lados.acertos++;
      lados.seguidos++;
      resultados.push({ m: c.tipo, certa: texto, erros: [], nivel: lados.nivel, tempo });
      if (lados.seguidos >= 2) { lados.seguidos = 0; lados.nivel = Math.min(LADOS.NIVEL_MAX, lados.nivel + 1); }
      lados.nivelMax = Math.max(lados.nivelMax, lados.nivel);
      msgLados(`✅ Isso! +${ganhou} ${rapidez > 0.6 ? '⚡ Rapidinho!' : ''}`, 'ok');
      SOM.certo();
    } else {
      lados.seguidos = 0;
      resultados.push({ m: c.tipo, certa: texto, erros: [motivo], nivel: lados.nivel, tempo: motivo === 'não jogou a tempo' ? null : tempo });
      lados.nivel = Math.max(1, lados.nivel - 1);
      const mesa = $('lados-mesa');
      mesa.classList.remove('tremer'); void mesa.offsetWidth; mesa.classList.add('tremer');   // tremida curta: impacto do erro
      msgLados(`Ops! Era para jogar ${textoComando(c)}.`, 'erro');
      SOM.errado();
    }
    hudLados();
    depoisLados(acertou ? 900 : 1900, proximoLados);
  }

  // deslizar na metade da mesa (ou tocar no buraco) joga a bola daquele lado
  let toqueLados = null;
  $('lados-mesa').addEventListener('pointerdown', (e) => {
    if (!lados) return;
    const r = $('lados-mesa').getBoundingClientRect();
    toqueLados = { x: e.clientX, y: e.clientY, lado: e.clientX - r.left < r.width / 2 ? 'E' : 'D', buraco: e.target.closest('.lados-buraco') };
  });
  $('lados-mesa').addEventListener('pointerup', (e) => {
    const t = toqueLados;
    toqueLados = null;
    if (!t || !lados) return;
    const dy = e.clientY - t.y;
    if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(e.clientX - t.x) * 0.8) jogarLados(t.lado, dy < 0 ? 'cima' : 'baixo');
    else if (t.buraco) jogarLados(t.buraco.dataset.lado, t.buraco.dataset.dir);
  });
  $('lados-mesa').addEventListener('pointercancel', () => { toqueLados = null; });

  const TECLAS_LADOS = { w: ['E', 'cima'], s: ['E', 'baixo'], ArrowUp: ['D', 'cima'], ArrowDown: ['D', 'baixo'] };
  document.addEventListener('keydown', (e) => {
    if (!lados || !$('tela-lados').classList.contains('ativa')) return;
    const k = TECLAS_LADOS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    if (!k) return;
    e.preventDefault();
    jogarLados(k[0], k[1]);
  });

  function terminarLados() {
    const { acertos, feitos, pontos, nivelMax } = lados;
    pararLados();
    const duplas = resultados.filter((r) => r.m.id !== 'simples');
    missao.resumo = [
      `Acertou ${acertos} de ${feitos} comandos e chegou ao nível ${nivelMax} de ${LADOS.NIVEL_MAX}.`,
      ...(duplas.length ? [`Com as duas bolas: acertou ${duplas.filter((r) => !r.erros.length).length} de ${duplas.length}.`] : []),
      `Errou o lado (esquerda/direita) ${resultados.filter((r) => r.erros.some((x) => x.startsWith('jogou a bola'))).length} vez(es) e a direção (cima/baixo) ${resultados.filter((r) => r.erros.some((x) => / \(era para /.test(x))).length} vez(es).`,
    ];
    fimDaMissao();
    const n = ultimoRelatorio.estrelas;
    $('fim-titulo').textContent = n === 3 ? 'Reflexo de campeão! ⚡' : 'Fim do jogo!';
    $('fim-texto').textContent = `${aluno}, você acertou ${acertos} de ${feitos} comandos, chegou ao nível ${nivelMax} e fez ${pontos} pontos!`;
  }

  $('btn-lados').onclick = () => { SOM.clique(); escolherProfessorE('Esquerda e Direita', telaLadosMenu); };
  $('lados-voltar').onclick = telaJogos;
  $('btn-lados-comecar').onclick = () => { SOM.clique(); comecarLados(); };
  $('lados-sair').onclick = telaLadosMenu;

  // ---------- Textos do relatório de cada jogo ----------
  function textosRelatorio(mis) {
    if (mis.quiz) return { tipo: 'questionario', assunto: 'Questionário da aula', unidade: 'pergunta', revisar: 'Perguntas para revisar',
      certo: 'Pergunta e resposta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos',
      niveis: 'Nível', atividade: 'Atividade', outras: '📝 Outro questionário' };
    if (mis.lados) return { tipo: 'lateralidade', assunto: 'Lateralidade e atenção (esquerda, direita, cima e baixo)', unidade: 'comando', revisar: 'Comandos para revisar',
      certo: 'Comando', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tipo de comando',
      niveis: 'Nível em cada comando', atividade: 'Atividade', outras: '↔️ Esquerda e Direita', tempos: 'Tempo de resposta em cada comando' };
    if (mis.cores) return { tipo: 'cores', assunto: 'Coordenadas e cálculo (tabela de cores)', unidade: 'conta', revisar: 'Contas para revisar',
      certo: 'Conta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos por tipo de conta',
      niveis: 'Nível em cada conta', atividade: 'Atividade', outras: '🎨 Somando as Cores', tempos: 'Tempo para resolver cada conta' };
    if (mis.fichas) return { tipo: 'fichas', assunto: 'Agrupar e trocar (valor das fichas)', unidade: 'jogada', revisar: 'Jogadas para revisar',
      certo: 'Jogada', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tipo',
      niveis: 'Nível', atividade: 'Atividade', outras: '🔴 Fichas Coloridas', tempos: 'Tempo para fazer as trocas em cada jogada' };
    if (mis.rotina) return { tipo: 'sequencia', assunto: 'Sequência e planejamento', unidade: 'rotina', revisar: 'Rotinas para revisar',
      certo: 'Rotina', tentou: 'O que aconteceu', tentouPdf: 'O que aconteceu', porRegra: 'Acertos por tamanho da rotina',
      niveis: 'Nível em cada rotina', atividade: 'Atividade', outras: '🧩 Rotina Certa', tempos: 'Tempo para ordenar cada rotina' };
    if (mis.luzes) return { tipo: 'atencao', assunto: 'Atenção e memória', unidade: 'sequência', revisar: 'Sequências para revisar',
      certo: 'Sequência que piscou', tentou: 'O que você fez', tentouPdf: 'O que o aluno fez', porRegra: 'Acertos por tamanho da sequência',
      niveis: 'Nível em cada rodada', atividade: 'Atividade', outras: mis.id === 'luzes2' ? '💡 Reflexo Nível 2' : '💡 Jogo do Reflexo', tempos: 'Tempo de resposta em cada rodada' };
    if (mis.peso) return { tipo: 'medidas', assunto: 'Medidas de massa', unidade: 'objeto', revisar: 'Objetos para revisar',
      certo: 'Objeto e peso', tentou: 'Passou do ponto com', tentouPdf: 'Passou do ponto com', porRegra: 'Acertos por unidade',
      niveis: 'Nível', atividade: 'Atividade', outras: '⚖️ Peso Certo' };
    if (mis.tiro) return { tipo: 'angulos', assunto: 'Ângulos', unidade: 'ângulo', revisar: 'Ângulos para revisar',
      certo: 'Ângulo certo', tentou: 'Você escolheu', tentouPdf: 'O aluno escolheu', porRegra: 'Acertos por tipo de ângulo',
      niveis: 'Nível em cada míssil', atividade: 'Atividade', outras: '🎯 Tiro Certo' };
    if (mis.matematica) return { tipo: 'matematica', assunto: 'Matemática', unidade: 'conta', revisar: 'Contas para revisar',
      certo: 'Conta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos por operação',
      niveis: 'Nível em cada conta', atividade: 'Atividade', outras: '🔢 Outras contas' };
    return { tipo: 'ortografia', assunto: 'Ortografia', unidade: 'palavra', revisar: 'Palavras para revisar',
      certo: 'Jeito certo', tentou: 'Você tentou', tentouPdf: 'O aluno tentou', porRegra: 'Acertos por regra',
      niveis: 'Nível', atividade: 'Atividade', outras: mis.chuva ? '🌧️ Outra chuva' : 'Outro nível' };
  }

  // ---------- Gráficos do relatório ----------
  // Desenhados num canvas no próprio aparelho; a mesma imagem aparece na tela e no PDF.
  const COR_OK = '#2e9e5b', COR_ERRO = '#e53935', COR_TEXTO = '#13294b', COR_GRADE = '#dce9f8', COR_LINHA = '#1fa2b0';
  const fonteGrafico = (tam, peso = 700) => `${peso} ${tam}px Nunito, Arial, sans-serif`;

  function novoGrafico(w, h, titulo) {
    const c = document.createElement('canvas');
    c.width = w * 2; c.height = h * 2;   // dobro do tamanho: fica nítido na tela e no PDF
    const g = c.getContext('2d');
    g.scale(2, 2);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.textBaseline = 'middle';
    g.fillStyle = COR_TEXTO; g.font = fonteGrafico(16, 800); g.textAlign = 'left';
    g.fillText(titulo, 14, 20);
    return { c, g, w, h };
  }

  function legendaGrafico(g, w, y, itens, tam = 13) {
    g.font = fonteGrafico(tam);
    const larguras = itens.map(([, texto]) => 18 + g.measureText(texto).width);
    let x = (w - larguras.reduce((s, l) => s + l + 18, -18)) / 2;
    itens.forEach(([cor, texto], i) => {
      g.fillStyle = cor; g.beginPath(); g.arc(x + 6, y, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = COR_TEXTO; g.textAlign = 'left'; g.fillText(texto, x + 16, y);
      x += larguras[i] + 18;
    });
  }

  // rosca: quanto o aluno acertou de primeira
  function graficoResultado(rel) {
    const { c, g, w } = novoGrafico(300, 240, 'Resultado');
    const ok = rel.dePrimeiraN, erro = rel.respondidas - ok, total = rel.respondidas || 1;
    const cx = w / 2, cy = 122, raio = 72;
    let inicio = -Math.PI / 2;
    for (const [v, cor] of [[ok, COR_OK], [erro, COR_ERRO]]) {
      if (!v) continue;
      const fim = inicio + (v / total) * Math.PI * 2;
      g.beginPath(); g.arc(cx, cy, raio, inicio, fim); g.arc(cx, cy, raio - 26, fim, inicio, true); g.closePath();
      g.fillStyle = cor; g.fill();
      inicio = fim;
    }
    g.fillStyle = COR_TEXTO; g.textAlign = 'center';
    g.font = fonteGrafico(28, 800); g.fillText(`${Math.round((ok / total) * 100)}%`, cx, cy - 6);
    g.font = fonteGrafico(12); g.fillText('de primeira', cx, cy + 18);
    legendaGrafico(g, w, 222, [[COR_OK, `${ok} ${ok === 1 ? 'acerto' : 'acertos'}`], [COR_ERRO, `${erro} com erro`]]);
    return c;
  }

  // barras: acertos e erros em cada regra (ou operação)
  function graficoPorRegra(rel, titulo) {
    const linhas = rel.porRegra;
    const w = 440, h = 64 + linhas.length * 32 + 30;
    const { c, g } = novoGrafico(w, h, titulo);
    const x0 = 170, x1 = w - 56, maior = Math.max(...linhas.map((l) => l.total), 1);
    linhas.forEach((l, i) => {
      const y = 56 + i * 32;
      g.font = fonteGrafico(13); g.fillStyle = COR_TEXTO; g.textAlign = 'right';
      let rotulo = l.m.titulo;
      while (g.measureText(rotulo).width > x0 - 22 && rotulo.length > 4) rotulo = rotulo.slice(0, -2) + '…';
      g.fillText(rotulo, x0 - 10, y);
      const larg = (x1 - x0) / maior;
      const acertos = l.total - l.erros;
      g.fillStyle = COR_OK; g.fillRect(x0, y - 10, acertos * larg, 20);
      g.fillStyle = COR_ERRO; g.fillRect(x0 + acertos * larg, y - 10, l.erros * larg, 20);
      g.fillStyle = COR_TEXTO; g.textAlign = 'left'; g.font = fonteGrafico(12, 800);
      g.fillText(`${acertos}/${l.total}`, x0 + l.total * larg + 6, y);
    });
    legendaGrafico(g, w, h - 18, [[COR_OK, 'certo de primeira'], [COR_ERRO, 'com erro']]);
    return c;
  }

  // linha: o nível de cada conta da Chuva de Matemática
  function graficoNiveis(rel, titulo, maximo) {
    const pts = rel.niveis, w = 640, h = 280;
    const { c, g } = novoGrafico(w, h, titulo);
    const x0 = 46, x1 = w - 20, yTopo = 46, yBase = 210;
    const yDe = (n) => yBase - ((n - 1) / (maximo - 1)) * (yBase - yTopo);
    const xDe = (i) => (pts.length === 1 ? (x0 + x1) / 2 : x0 + (i * (x1 - x0)) / (pts.length - 1));
    g.font = fonteGrafico(16); g.textAlign = 'right';
    for (const n of maximo > 5 ? [1, 4, 7, 10] : Array.from({ length: maximo }, (_, i) => i + 1)) {
      g.strokeStyle = COR_GRADE; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, yDe(n)); g.lineTo(x1, yDe(n)); g.stroke();
      g.fillStyle = COR_TEXTO; g.fillText(String(n), x0 - 10, yDe(n));
    }
    g.strokeStyle = COR_LINHA; g.lineWidth = 3; g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(xDe(i), yDe(p.n)) : g.moveTo(xDe(i), yDe(p.n))));
    g.stroke();
    g.textAlign = 'center';
    pts.forEach((p, i) => {
      g.fillStyle = p.ok ? COR_OK : COR_ERRO;
      g.beginPath(); g.arc(xDe(i), yDe(p.n), 7, 0, Math.PI * 2); g.fill();
      g.fillStyle = COR_TEXTO; g.font = fonteGrafico(14); g.fillText(String(i + 1), xDe(i), yBase + 18);
    });
    legendaGrafico(g, w, h - 20, [[COR_OK, 'acertou (o nível sobe)'], [COR_ERRO, 'errou (o nível desce)']], 17);
    return c;
  }

  // tempo de resposta em cada rodada (Jogo do Reflexo): barra verde = acertou, vermelha = errou, cinza = não respondeu
  function graficoTempos(rel, titulo) {
    const pts = rel.tempos, w = 640, h = 280;
    const { c, g } = novoGrafico(w, h, titulo);
    const x0 = 50, x1 = w - 20, yTopo = 50, yBase = 210;
    const maior = Math.max(4, ...pts.map((p) => p.t || 0));
    const topo = Math.ceil(maior / 2) * 2;
    const yDe = (t) => yBase - (t / topo) * (yBase - yTopo);
    g.font = fonteGrafico(15); g.textAlign = 'right';
    for (let t = 0; t <= topo; t += topo / 4) {
      g.strokeStyle = COR_GRADE; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0, yDe(t)); g.lineTo(x1, yDe(t)); g.stroke();
      g.fillStyle = COR_TEXTO; g.fillText(`${t} s`, x0 - 8, yDe(t));
    }
    const passo = (x1 - x0) / pts.length, larg = Math.min(30, passo * 0.7);
    g.textAlign = 'center';
    pts.forEach((p, i) => {
      const x = x0 + passo * (i + 0.5);
      const t = p.t == null ? topo : p.t;
      g.fillStyle = p.t == null ? '#b0bec5' : p.ok ? COR_OK : COR_ERRO;
      g.fillRect(x - larg / 2, yDe(t), larg, yBase - yDe(t));
      g.fillStyle = COR_TEXTO; g.font = fonteGrafico(13); g.fillText(String(i + 1), x, yBase + 16);
    });
    legendaGrafico(g, w, h - 20, [[COR_OK, 'acertou'], [COR_ERRO, 'errou'], ['#b0bec5', 'sem resposta']], 16);
    return c;
  }

  function graficosDoRelatorio(rel, mis) {
    if (!rel.respondidas) return [];
    const graficos = [{ c: graficoResultado(rel), alt: `Resultado: ${rel.dePrimeiraN} de ${rel.respondidas} certas de primeira` }];
    const tx = textosRelatorio(mis);
    if (rel.porRegra.length) graficos.push({ c: graficoPorRegra(rel, tx.porRegra), alt: tx.porRegra });
    if (rel.niveis.length) graficos.push({ c: graficoNiveis(rel, tx.niveis, mis.rotina ? ROTINA.NIVEL_MAX : mis.luzes ? LUZ.NIVEL_MAX : mis.tiro ? TIRO.NIVEL_MAX : MAT.NIVEL_MAX), alt: tx.niveis, largo: true });
    if (rel.tempos.length && tx.tempos) graficos.push({ c: graficoTempos(rel, tx.tempos), alt: tx.tempos, largo: true });
    return graficos.map((x) => ({ url: x.c.toDataURL('image/png'), w: x.c.width, h: x.c.height, alt: x.alt, largo: !!x.largo }));
  }

  function desenharRelatorio(rel, estrelas) {
    const data = new Date().toLocaleDateString('pt-BR');
    const tx = textosRelatorio(missao);
    const caixa = (s) => (missao.quiz || missao.rotina || missao.luzes || missao.fichas || missao.cores || missao.lados ? s : s.toUpperCase());   // palavras em caixa alta; frases e perguntas como estão
    $('relatorio-info').innerHTML = `<b>Aluno:</b> ${seguro(aluno)} · <b>Data:</b> ${data} · <b>${tx.atividade}:</b> ${seguro(missao.titulo)}<br>`
      + `<b>Acertos de primeira:</b> ${rel.dePrimeiraN} de ${rel.respondidas} · <b>Estrelas:</b> ${estrelas} de 3`
      + (missao.extra ? `<br>${seguro(missao.extra)}` : '')
      + (missao.resumo ? `<ul class="relatorio-resumo">${missao.resumo.map((l) => `<li>${seguro(l)}</li>`).join('')}</ul>` : '');
    const graficos = graficosDoRelatorio(rel, missao);
    $('relatorio-graficos').innerHTML = graficos.map((x) =>
      `<img class="grafico${x.largo ? ' grafico-largo' : ''}" src="${x.url}" alt="${seguro(x.alt)}">`).join('');

    if (!rel.comErro.length) {
      $('relatorio-conteudo').innerHTML = '<p class="relatorio-ok">🎉 Nenhuma dificuldade nesta atividade! Você acertou tudo de primeira.</p>';
      return graficos;
    }
    const blocos = rel.grupos.map((g) => `
      <div class="dificuldade" style="--c:${g.m.cor}">
        <h4>${g.m.icone} ${g.m.titulo} <span class="qtd-erros">${g.itens.length} ${tx.unidade}${g.itens.length === 1 ? '' : 's'}</span></h4>
        <p class="dica-regra">${g.m.regra}</p>
      </div>`).join('');
    const linhas = rel.comErro.map((r) => `
      <tr><td class="certo">${seguro(caixa(r.certa))}</td><td class="escreveu">${r.erros.map((e) => seguro(caixa(String(e)))).join(', ')}</td></tr>`).join('');
    $('relatorio-conteudo').innerHTML = `
      <h4 class="relatorio-sub">Principais dificuldades</h4>
      ${blocos}
      <h4 class="relatorio-sub">${tx.revisar}</h4>
      <table class="tabela-revisar">
        <thead><tr><th>${tx.certo}</th><th>${tx.tentou}</th></tr></thead>
        <tbody>${linhas}</tbody>
      </table>`;
    return graficos;
  }

  // ---------- Relatório por e-mail (Google Apps Script: ferramentas/relatorio-email.gs) ----------
  // Endereço do script publicado (veja "Relatório por e-mail" no README). Vazio: não envia.
  const URL_RELATORIO = 'https://script.google.com/macros/s/AKfycbzfaBB9wEG3wlP7PKRymBNOfvovZxViQ08vuC0IzTBZS63iYjqQW2GBskUEqM0DHj3i/exec';
  const CHAVE_RELATORIO = 'jogo-ortografia';   // a mesma CHAVE do script
  // relatórios que ainda não foram enviados ficam numa fila no aparelho (sem internet, vão depois)
  const CHAVE_FILA = 'pleno-ortografia:fila-relatorios';
  const lerFila = () => { try { return JSON.parse(localStorage.getItem(CHAVE_FILA)) || []; } catch (e) { return []; } };
  const salvarFila = (f) => { try { localStorage.setItem(CHAVE_FILA, JSON.stringify(f.slice(-50))); } catch (e) { /* sem armazenamento */ } };
  const resultadoEnvio = {};   // id do relatório -> 'ok' ou 'erro'
  let enviando = false;

  // devolve '' se enviou, ou o erro do script; sem internet, a promessa falha
  async function postarRelatorio(dados) {
    const r = await fetch(URL_RELATORIO, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(dados) });
    const j = await r.json();
    return j.ok ? '' : (j.erro || 'erro');
  }

  // envia a fila, do mais antigo para o mais novo
  async function enviarFila() {
    if (enviando || !URL_RELATORIO) return;
    enviando = true;
    try {
      for (let item = lerFila()[0]; item; item = lerFila()[0]) {
        let erro;
        try { erro = await postarRelatorio(item); } catch (e) { break; }   // sem internet: tenta depois
        if (erro === 'cota') break;                                         // passou do limite do dia: tenta depois
        salvarFila(lerFila().filter((r) => r.id !== item.id));
        resultadoEnvio[item.id] = erro ? 'erro' : 'ok';
      }
    } finally { enviando = false; }
  }

  async function enviarRelatorioPorEmail({ rel, estrelas, missao: mis, data }) {
    const aviso = $('envio-email');
    aviso.hidden = true;
    const para = emailDoRelatorio();
    if (!URL_RELATORIO || !para || !rel.respondidas) return;
    const id = `${data.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    salvarFila([...lerFila(), {
      id, chave: CHAVE_RELATORIO, para, jogo: jogoDaMissao(mis), aluno, tipo: textosRelatorio(mis).tipo, assunto: textosRelatorio(mis).assunto, missao: mis.titulo, data: data.toLocaleDateString('pt-BR'),
      acertos: rel.dePrimeiraN, total: rel.respondidas, estrelas,
      grupos: rel.grupos.map((g) => ({ titulo: g.m.titulo, qtd: g.itens.length, regra: semHTML(g.m.regra) })),
      palavras: rel.comErro.map((r) => ({ certa: r.certa, tentou: r.erros })),
      porRegra: rel.porRegra.map((x) => ({ titulo: x.m.titulo, total: x.total, erros: x.erros })),
      niveis: rel.niveis,
      extra: mis.extra || '',
      resumo: mis.resumo || [],
      tempos: rel.tempos,
    }]);
    aviso.className = 'envio-email';
    aviso.textContent = '📧 Enviando o relatório para o professor…';
    aviso.hidden = false;
    await enviarFila();
    if (resultadoEnvio[id] === 'ok') {
      aviso.className = 'envio-email ok';
      aviso.textContent = `📧 Relatório enviado para ${(listaEmails().find((x) => x.email === para) || { nome: para }).nome}.`;
    } else if (resultadoEnvio[id] === 'erro') {
      aviso.className = 'envio-email erro';
      aviso.textContent = 'Não foi possível enviar o relatório. Peça ao professor para conferir o e-mail na Área do professor.';
    } else {
      aviso.textContent = '📧 Sem internet agora: o relatório será enviado ao professor quando houver conexão.';
    }
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
    mascote('davi-fim', 'festa');
    $('btn-outras').textContent = textosRelatorio(missao).outras;
    ultimoRelatorio.graficos = desenharRelatorio(rel, n);
    enviarRelatorioPorEmail(ultimoRelatorio);
    mostrar('tela-fim');
    soltarConfete();
    frase(n === 3 ? 'missao-perfeita' : 'missao-cumprida', n === 3 ? `Parabéns, ${aluno}! Missão perfeita!` : `Parabéns, ${aluno}! Missão cumprida!`);
  }

  function soltarConfete() {
    const c = $('confete');
    c.innerHTML = '';
    const itens = ['⭐', '🎉', '✨', '❤️', '💛', '💙'];
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
    const tx = textosRelatorio(mis);
    const doc = new lib.jsPDF({ unit: 'mm', format: 'a4' });
    const AZUL = [19, 119, 132], TEXTO = [34, 54, 74], CINZA = [100, 116, 139];
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
      const logo = await imagemComoDataURL('assets/logo-pg.png');
      doc.addImage(logo.url, 'PNG', L, y - 2, 28, 28 * logo.h / logo.w, undefined, 'FAST');
    } catch (e) { /* sem logo */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(...AZUL);
    doc.text(`Relatório de ${tx.assunto}`, L + 34, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...CINZA);
    doc.text('Jogos Educacionais', L + 34, y + 14);
    y += 30;
    doc.setDrawColor(...AZUL); doc.setLineWidth(0.6); doc.line(L, y, L + LARG, y); y += 8;

    paragrafo(`Aluno: ${aluno}`, 12, 'bold');
    paragrafo(`Data: ${data.toLocaleDateString('pt-BR')}    ${tx.atividade}: ${mis.titulo}`, 11);
    paragrafo(`Acertos de primeira: ${rel.dePrimeiraN} de ${rel.respondidas}    Estrelas: ${estrelas} de 3`, 11);
    if (mis.extra) paragrafo(mis.extra, 11);
    for (const linha of mis.resumo || []) paragrafo(`• ${linha}`, 11);
    y += 4;

    // gráficos: os pequenos lado a lado, o de níveis na largura toda
    const graficos = ultimoRelatorio.graficos || [];
    const pequenos = graficos.filter((x) => !x.largo), largos = graficos.filter((x) => x.largo);
    if (pequenos.length) {
      const larguras = pequenos.length === 1 ? [70] : [62, LARG - 62 - 6];
      const alturas = pequenos.map((x, i) => (larguras[i] * x.h) / x.w);
      novaPaginaSePrecisar(Math.max(...alturas) + 4);
      let x = L;
      pequenos.forEach((g, i) => { doc.addImage(g.url, 'PNG', x, y, larguras[i], alturas[i], undefined, 'FAST'); x += larguras[i] + 6; });
      y += Math.max(...alturas) + 4;
    }
    for (const g of largos) {
      const alt = (LARG * g.h) / g.w;
      novaPaginaSePrecisar(alt + 4);
      doc.addImage(g.url, 'PNG', L, y, LARG, alt, undefined, 'FAST');
      y += alt + 4;
    }
    y += 2;

    if (!rel.comErro.length) {
      paragrafo('Parabéns! Nenhuma dificuldade nesta atividade: todas as respostas certas de primeira.', 13, 'bold', AZUL);
    } else {
      novaPaginaSePrecisar(14);
      paragrafo('Principais dificuldades', 15, 'bold', AZUL); y += 1;
      for (const g of rel.grupos) {
        novaPaginaSePrecisar(24);
        paragrafo(`${g.m.titulo} - ${g.itens.length} ${tx.unidade}${g.itens.length === 1 ? '' : 's'} com erro`, 12, 'bold');
        paragrafo(`Regra: ${g.m.regra}`, 10.5, 'normal', TEXTO, 4);
        paragrafo(`${tx.revisar.split(' ')[0]}: ${g.itens.map((r) => r.certa).join(', ')}`, 10.5, 'italic', CINZA, 4);
        y += 3;
      }

      // tabela: jeito certo x o que o aluno tentou
      y += 2; novaPaginaSePrecisar(20);
      paragrafo(tx.revisar, 15, 'bold', AZUL); y += 1;
      const col2 = L + 70;
      const cabecalho = () => {
        doc.setFillColor(...AZUL); doc.rect(L, y - 5, LARG, 8, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
        doc.text(tx.certo, L + 3, y); doc.text(tx.tentouPdf, col2 + 3, y);
        y += 7;
      };
      cabecalho();
      const caixa = (s) => (mis.quiz || mis.rotina || mis.luzes || mis.fichas || mis.cores || mis.lados ? s : s.toUpperCase());
      rel.comErro.forEach((r, i) => {
        // textos longos (perguntas do questionário) quebram em várias linhas dentro da coluna
        doc.setFontSize(11);
        const esquerda = doc.splitTextToSize(paraPDF(caixa(r.certa)), col2 - L - 6);
        const direita = doc.splitTextToSize(paraPDF(r.erros.map((e) => caixa(String(e))).join(', ')), L + LARG - col2 - 6);
        const alt = Math.max(esquerda.length, direita.length) * 5 + 3;
        if (y + alt > 278) { doc.addPage(); y = 20; cabecalho(); }
        if (i % 2 === 0) { doc.setFillColor(232, 246, 248); doc.rect(L, y - 5, LARG, alt, 'F'); }
        doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 120, 70);
        doc.text(esquerda, L + 3, y);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 50, 60);
        doc.text(direita, col2 + 3, y);
        y += alt;
      });
    }

    // rodapé em todas as páginas
    const paginas = doc.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...CINZA);
      doc.text('© Davi e Marco - Todos os direitos reservados', L, 290);
      doc.text(`${i}/${paginas}`, L + LARG, 290, { align: 'right' });
    }
    doc.save(`relatorio-${nomeArquivo(aluno)}-${nomeArquivo(mis.titulo)}.pdf`);
  }

  // ---------- Botões ----------
  $('btn-jogar').onclick = () => { SOM.clique(); escolherProfessorE('Jogo de Ortografia', telaMissoes); };
  $('voltar-inicio').onclick = telaJogos;
  $('btn-comecar').onclick = () => { SOM.clique(); comecarMissao(); };
  $('regra-voltar').onclick = telaMissoes;
  $('sair-missao').onclick = telaMissoes;
  $('btn-terminar').onclick = () => { if (resultados.length) fimDaMissao(); else telaMissoes(); };
  $('btn-proxima').onclick = proxima;
  $('btn-ouvir').onclick = () => falar(palavraCerta(fila[idx]));
  $('btn-repetir').onclick = () => (missao.quiz ? comecarQuiz(missao.quizId) : missao.cores ? comecarCores() : missao.lados ? comecarLados() : missao.fichas ? comecarFichas() : missao.rotina ? comecarRotina() : missao.luzes ? comecarLuz() : missao.peso ? comecarPeso() : missao.tiro ? comecarTiro() : missao.matematica ? comecarMat() : missao.chuva ? comecarChuva() : comecarMissao());
  $('btn-outras').onclick = () => (missao.quiz ? telaQuizMenu() : missao.cores ? telaCoresMenu() : missao.lados ? telaLadosMenu() : missao.fichas ? telaFichasMenu() : missao.rotina ? telaRotinaMenu() : missao.luzes ? telaLuzesMenu() : missao.peso ? telaPesoMenu() : missao.tiro ? telaTiroMenu() : missao.matematica ? telaMatMenu() : missao.chuva ? telaChuvaMenu() : telaMissoes());
  $('btn-tiro').onclick = () => { SOM.clique(); escolherProfessorE('Tiro Certo', telaTiroMenu); };

  // filtro dos jogos por tema (ao abrir o app, todos os jogos aparecem)
  function filtrarTema(tema) {
    $('filtro-tema').value = tema;
    // um jogo pode estar em mais de um tema (data-tema com os temas separados por espaço)
    document.querySelectorAll('.escolha-jogos .jogo-card').forEach((c) => { c.hidden = tema !== 'todos' && !c.dataset.tema.split(' ').includes(tema); });
  }
  $('filtro-tema').onchange = () => { SOM.clique(); filtrarTema($('filtro-tema').value); };
  // cada opção do menu mostra quantos jogos tem a categoria
  const cartoesDeJogo = [...document.querySelectorAll('.escolha-jogos .jogo-card')];
  for (const op of $('filtro-tema').options) {
    const n = op.value === 'todos' ? cartoesDeJogo.length : cartoesDeJogo.filter((c) => c.dataset.tema.split(' ').includes(op.value)).length;
    op.textContent = `${op.textContent} (${n})`;
  }
  filtrarTema('todos');
  $('btn-area-jogos').onclick = () => { SOM.clique(); telaJogos(); };
  $('jogos-voltar').onclick = telaInicio;
  $('tiro-voltar').onclick = telaJogos;
  $('btn-tiro-comecar').onclick = () => { SOM.clique(); comecarTiro(); };
  $('tiro-sair').onclick = telaTiroMenu;
  $('btn-peso').onclick = () => { SOM.clique(); escolherProfessorE('Peso Certo', telaPesoMenu); };
  $('peso-voltar').onclick = telaJogos;
  $('btn-peso-comecar').onclick = () => { SOM.clique(); comecarPeso(); };
  $('peso-sair').onclick = telaPesoMenu;
  $('btn-quiz').onclick = () => { SOM.clique(); escolherProfessorE('Questionário da aula', telaQuizMenu); };
  $('quiz-voltar').onclick = telaInicio;
  $('quiz-sair').onclick = telaQuizMenu;
  $('btn-mat').onclick = () => { SOM.clique(); escolherProfessorE('Chuva de Matemática', telaMatMenu); };
  $('mat-voltar').onclick = telaJogos;
  $('btn-mat-comecar').onclick = () => { SOM.clique(); comecarMat(); };
  $('mat-sair').onclick = telaMatMenu;
  $('btn-chuva').onclick = () => { SOM.clique(); escolherProfessorE('Chuva de Erros', telaChuvaMenu); };
  $('chuva-voltar').onclick = telaJogos;
  $('btn-chuva-comecar').onclick = () => { SOM.clique(); comecarChuva(); };
  $('chuva-sair').onclick = telaChuvaMenu;
  $('btn-pdf').onclick = () => { baixarPDF().catch((e) => { console.error('PDF:', e); window.print(); }); };

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
  $('btn-professor').onclick = () => { SOM.clique(); telaProfessor(); };
  $('professor-voltar').onclick = telaInicio;

  // relatórios que ficaram sem enviar: tenta ao abrir o jogo e quando a internet voltar
  window.addEventListener('online', enviarFila);
  carregarEmails().then(enviarFila);

  telaInicio();
})();
