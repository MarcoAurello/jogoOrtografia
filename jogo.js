/* Jogos Educacionais — © Marco Nunes. Todos os direitos reservados. */
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
  }

  function telaLogin() {
    mascote('davi-login', 'oi');
    $('erro-login').textContent = '';
    $('login-senha').value = '';
    $('campo-senha').hidden = !PEDIR_SENHA;
    $('login-senha').required = PEDIR_SENHA;
    if (!$('login-nome').value) $('login-nome').value = ultimoNome;
    desenharEscolhaEmail();
    mostrar('tela-login');
    setTimeout(() => $('login-nome').focus(), 300);
  }

  function telaInicio() {
    if (!aluno) return telaLogin();
    $('nome-saudacao').textContent = aluno;
    const prof = listaEmails().find((x) => x.email === emailEscolhido);
    $('relatorio-para').hidden = !prof;
    if (prof) $('relatorio-para').textContent = `📧 Seus relatórios vão para: ${prof.nome}`;
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
    if (!$('campo-professor').hidden && !$('login-professor').value) {
      $('erro-login').textContent = 'Escolha para quem vai o relatório. 📧';
      SOM.errado();
      return;
    }
    if (!$('campo-professor').hidden) {
      emailEscolhido = $('login-professor').value;
      try { localStorage.setItem(CHAVE_EMAIL_ESCOLHIDO, emailEscolhido); } catch (err) { /* sem armazenamento */ }
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
  const jogoDaMissao = (mis) => (mis.quiz ? 'questionario' : mis.peso ? 'peso' : mis.tiro ? 'tiro' : mis.matematica ? 'matematica' : mis.chuva ? 'chuva' : 'ortografia');
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

  // lista de professores na tela de entrada
  function desenharEscolhaEmail() {
    const lista = listaEmails();
    $('campo-professor').hidden = !lista.length;
    if (lista.length === 1 && !emailEscolhido) emailEscolhido = lista[0].email;   // só um professor: já vem escolhido
    $('login-professor').innerHTML = '<option value="">Escolha o professor…</option>'
      + lista.map((x) => `<option value="${seguro(x.email)}">${seguro(x.nome)}</option>`).join('')
      + '<option value="nenhum">Não enviar relatório</option>';
    $('login-professor').value = emailEscolhido === 'nenhum' || lista.some((x) => x.email === emailEscolhido) ? emailEscolhido : '';
  }

  // traz a aba "E-mails" da planilha (ao abrir o jogo)
  async function carregarEmails() {
    if (URL_RELATORIO) {
      try { const { emails } = await lerDoScript('emails'); gravarJSON(CHAVE_EMAILS, emails || []); } catch (e) { /* sem internet: usa a cópia */ }
    }
    desenharEscolhaEmail();
  }

  function telaProfessor() {
    $('form-senha-professor').hidden = false;
    $('info-emails').hidden = true;
    $('painel-questionarios').hidden = true;
    $('professor-senha').value = '';
    $('erro-professor').textContent = '';
    mostrar('tela-professor');
    setTimeout(() => $('professor-senha').focus(), 300);
  }

  function listarEmailsProfessor() {
    const lista = listaEmails();
    $('lista-emails-prof').innerHTML = lista.length
      ? lista.map((x) => `<div class="quiz-item"><span class="quiz-item-nome">${seguro(x.nome)}</span><span class="quiz-item-qtd">${seguro(x.email)}</span></div>`).join('')
      : '<p class="quiz-status">A aba "E-mails" ainda está vazia: preencha na planilha.</p>';
  }

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
    $('info-emails').hidden = false;
    $('painel-questionarios').hidden = false;
    listarEmailsProfessor();
    listarQuestionariosProfessor();
    await carregarEmails();
    listarEmailsProfessor();
  };

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
    return { respondidas, dePrimeiraN, comErro, grupos, porRegra, niveis };
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
  const chaveQuiz = (id) => `pleno-ortografia:questionario:${id}`;
  let quiz = null;   // o questionário em andamento

  async function telaQuizMenu() {
    quiz = null;
    mascote('davi-quiz', 'oi');
    mostrar('tela-quiz-menu');
    const desenhar = (lista, aviso) => {
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

  // ---------- Textos do relatório de cada jogo ----------
  function textosRelatorio(mis) {
    if (mis.quiz) return { tipo: 'questionario', assunto: 'Questionário da aula', unidade: 'pergunta', revisar: 'Perguntas para revisar',
      certo: 'Pergunta e resposta certa', tentou: 'Você respondeu', tentouPdf: 'O aluno respondeu', porRegra: 'Acertos',
      niveis: 'Nível', atividade: 'Atividade', outras: '📝 Outro questionário' };
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
    for (const n of maximo > 5 ? [1, 4, 7, 10] : [1, 2, 3, 4, 5]) {
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

  function graficosDoRelatorio(rel, mis) {
    if (!rel.respondidas) return [];
    const graficos = [{ c: graficoResultado(rel), alt: `Resultado: ${rel.dePrimeiraN} de ${rel.respondidas} certas de primeira` }];
    const tx = textosRelatorio(mis);
    if (rel.porRegra.length) graficos.push({ c: graficoPorRegra(rel, tx.porRegra), alt: tx.porRegra });
    if (rel.niveis.length) graficos.push({ c: graficoNiveis(rel, tx.niveis, mis.tiro ? TIRO.NIVEL_MAX : MAT.NIVEL_MAX), alt: tx.niveis, largo: true });
    return graficos.map((x) => ({ url: x.c.toDataURL('image/png'), w: x.c.width, h: x.c.height, alt: x.alt, largo: !!x.largo }));
  }

  function desenharRelatorio(rel, estrelas) {
    const data = new Date().toLocaleDateString('pt-BR');
    const tx = textosRelatorio(missao);
    const caixa = (s) => (missao.quiz ? s : s.toUpperCase());   // palavras em caixa alta; perguntas do questionário como estão
    $('relatorio-info').innerHTML = `<b>Aluno:</b> ${seguro(aluno)} · <b>Data:</b> ${data} · <b>${tx.atividade}:</b> ${seguro(missao.titulo)}<br>`
      + `<b>Acertos de primeira:</b> ${rel.dePrimeiraN} de ${rel.respondidas} · <b>Estrelas:</b> ${estrelas} de 3`
      + (missao.extra ? `<br>${seguro(missao.extra)}` : '');
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
      const caixa = (s) => (mis.quiz ? s : s.toUpperCase());
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
  $('btn-repetir').onclick = () => (missao.quiz ? comecarQuiz(missao.quizId) : missao.peso ? comecarPeso() : missao.tiro ? comecarTiro() : missao.matematica ? comecarMat() : missao.chuva ? comecarChuva() : comecarMissao());
  $('btn-outras').onclick = () => (missao.quiz ? telaQuizMenu() : missao.peso ? telaPesoMenu() : missao.tiro ? telaTiroMenu() : missao.matematica ? telaMatMenu() : missao.chuva ? telaChuvaMenu() : telaMissoes());
  $('btn-tiro').onclick = () => { SOM.clique(); telaTiroMenu(); };

  // filtro dos jogos por tema na tela inicial (a escolha fica guardada no aparelho)
  const CHAVE_TEMA = 'pleno-ortografia:tema';
  function filtrarTema(tema) {
    document.querySelectorAll('.filtro-tema').forEach((b) => b.classList.toggle('ativo', b.dataset.tema === tema));
    document.querySelectorAll('.escolha-jogos .jogo-card').forEach((c) => { c.hidden = tema !== 'todos' && c.dataset.tema !== tema; });
    try { localStorage.setItem(CHAVE_TEMA, tema); } catch (e) { /* sem armazenamento */ }
  }
  $('filtro-temas').onclick = (e) => {
    const b = e.target.closest('.filtro-tema'); if (!b) return;
    SOM.clique();
    filtrarTema(b.dataset.tema);
  };
  try { filtrarTema(localStorage.getItem(CHAVE_TEMA) || 'todos'); } catch (e) { filtrarTema('todos'); }
  $('tiro-voltar').onclick = telaInicio;
  $('btn-tiro-comecar').onclick = () => { SOM.clique(); comecarTiro(); };
  $('tiro-sair').onclick = telaTiroMenu;
  $('btn-peso').onclick = () => { SOM.clique(); telaPesoMenu(); };
  $('peso-voltar').onclick = telaInicio;
  $('btn-peso-comecar').onclick = () => { SOM.clique(); comecarPeso(); };
  $('peso-sair').onclick = telaPesoMenu;
  $('btn-quiz').onclick = () => { SOM.clique(); telaQuizMenu(); };
  $('quiz-voltar').onclick = telaInicio;
  $('quiz-sair').onclick = telaQuizMenu;
  $('btn-mat').onclick = () => { SOM.clique(); telaMatMenu(); };
  $('mat-voltar').onclick = telaInicio;
  $('btn-mat-comecar').onclick = () => { SOM.clique(); comecarMat(); };
  $('mat-sair').onclick = telaMatMenu;
  $('btn-chuva').onclick = () => { SOM.clique(); telaChuvaMenu(); };
  $('chuva-voltar').onclick = telaInicio;
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
