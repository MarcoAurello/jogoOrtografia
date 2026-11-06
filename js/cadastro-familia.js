/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* A página de cadastro da família (cadastro.html, aberta em /<escola>/cadastro ou /cadastro/<apelido>): pergunta à API
   de quem é a página e se está aberta, e envia a conta do responsável, a autorização (LGPD) e os filhos (cada um com um
   PIN de 4 números, digitado duas vezes). Quem confere tudo é a API. Nada fica guardado no aparelho. */

const $ = (id) => document.getElementById(id);
const MAX_FILHOS = 6;
const PIN_OK = /^\d{4}$/;
// os mesmos PINs fáceis que a API recusa (tudo igual, 1234, 4321)
const pinObvio = (p) => /^(\d)\1+$/.test(p) || '0123456789'.includes(p) || '9876543210'.includes(p);
const corValida = (c) => /^#[0-9a-f]{6}$/i.test(c || '');

// o endereço diz de quem é: /cadastro/<apelido> (professor avulso) ou /<escola>/cadastro
const partes = location.pathname.split('/').filter(Boolean);
const destino = partes[0] === 'cadastro' && partes[1] ? { tipo: 'profissional', chave: partes[1] }
  : partes[1] === 'cadastro' ? { tipo: 'escola', chave: partes[0] } : null;
const urlApi = destino ? `/api/cadastro-familia/publico/${destino.tipo}/${encodeURIComponent(destino.chave)}` : '';
let ehEscola = true;

function falha(texto) {
  $('cf-status').classList.remove('carregando');
  $('cf-status').textContent = texto;
  $('cf-form').hidden = true;
}

async function abrir() {
  if (!destino) { falha('Endereço incompleto. Abra o link exatamente como a escola mandou.'); return; }
  let r, dados = {};
  try {
    r = await fetch(urlApi);
    dados = await r.json();
  } catch (e) { falha('Sem internet agora. Tente de novo quando a conexão voltar.'); return; }
  if (!r.ok) { falha(dados.message || 'Página de cadastro não encontrada.'); return; }
  ehEscola = dados.tipo === 'escola';
  const nome = ehEscola ? dados.escola.nome : dados.profissional;
  $('cf-dono').textContent = nome;
  document.title = `Cadastro da família · ${nome}`;
  if (ehEscola && dados.escola.logo) $('cf-logo').src = dados.escola.logo;
  if (ehEscola && corValida(dados.escola.cor)) document.documentElement.style.setProperty('--an-cor', dados.escola.cor);
  if (!dados.aberta) { falha(`O cadastro de famílias de ${nome} não está aberto agora. Fale com ${ehEscola ? 'a escola' : 'o(a) profissional'}.`); return; }
  $('cf-intro').textContent = ehEscola
    ? `Cadastre-se para acompanhar seus filhos em ${nome}. Depois do cadastro, a escola coloca cada um na turma.`
    : `Cadastre-se para acompanhar o atendimento dos seus filhos com ${nome}.`;
  $('cf-consentimento-texto').textContent = `Autorizo ${ehEscola ? 'a escola' : nome} a guardar os dados dos meus filhos e o desempenho
    deles nos jogos para acompanhar o desenvolvimento. Só a equipe e eu vemos essas informações; elas não são compartilhadas.`;
  novoFilho();
  $('cf-status').hidden = true;
  $('cf-form').hidden = false;
}

// ---------- os filhos (um bloco por filho, cada um com a sua senha de figuras) ----------

function renumerar() {
  const blocos = [...$('cf-filhos').children];
  blocos.forEach((b, i) => {
    b.querySelector('.cf-numero').textContent = `Filho ${i + 1}`;
    b.querySelector('.cf-tirar').hidden = blocos.length === 1;
  });
  $('cf-mais').hidden = blocos.length >= MAX_FILHOS;
}

function novoFilho() {
  const bloco = $('cf-modelo-filho').content.firstElementChild.cloneNode(true);
  bloco.querySelector('.cf-tirar').onclick = () => { bloco.remove(); renumerar(); };
  bloco.querySelector('.cf-f-nascimento').max = new Date().toISOString().slice(0, 10);
  // o PIN aceita só números
  bloco.querySelectorAll('.cf-f-pin, .cf-f-pin2').forEach((c) => { c.oninput = () => { c.value = c.value.replace(/\D/g, '').slice(0, 4); }; });
  $('cf-filhos').appendChild(bloco);
  renumerar();
  return bloco;
}

$('cf-mais').onclick = () => { novoFilho().querySelector('.cf-f-nome').focus(); };

// ---------- enviar ----------

const aviso = (t) => { $('cf-aviso').textContent = t; };
function erroNo(campo, texto) {
  aviso(texto);
  campo.classList.add('faltando');
  campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
  if (campo.focus) campo.focus({ preventScroll: true });
}

$('cf-form').oninput = (ev) => ev.target.classList.remove('faltando');

$('cf-form').onsubmit = async (ev) => {
  ev.preventDefault();
  const nome = $('cf-nome').value.trim(), email = $('cf-email').value.trim(), senha = $('cf-senha').value;
  if (nome.length < 3) return erroNo($('cf-nome'), 'Digite o seu nome.');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return erroNo($('cf-email'), 'Digite um e-mail válido.');
  if (senha.length < 8) return erroNo($('cf-senha'), 'A senha precisa de 8 ou mais letras e números.');
  const filhos = [];
  for (const [i, bloco] of [...$('cf-filhos').children].entries()) {
    const campoNome = bloco.querySelector('.cf-f-nome');
    if (campoNome.value.trim().length < 2) return erroNo(campoNome, `Filho ${i + 1}: digite como ele(a) é chamado(a).`);
    const pin = bloco.querySelector('.cf-f-pin'), pin2 = bloco.querySelector('.cf-f-pin2');
    if (!PIN_OK.test(pin.value)) return erroNo(pin, `Filho ${i + 1}: o PIN precisa ter 4 números.`);
    if (pinObvio(pin.value)) return erroNo(pin, `Filho ${i + 1}: esse PIN é fácil demais (como 0000 ou 1234). Escolha outro.`);
    if (pin2.value !== pin.value) return erroNo(pin2, `Filho ${i + 1}: os dois PINs não são iguais.`);
    filhos.push({ nome: campoNome.value.trim(), nome_completo: bloco.querySelector('.cf-f-completo').value.trim(),
      data_nascimento: bloco.querySelector('.cf-f-nascimento').value, pin: pin.value, pin_confirmacao: pin2.value });
  }
  if (!$('cf-consentimento').checked) return erroNo($('cf-consentimento'), 'Marque a autorização para fazer o cadastro.');

  aviso('Enviando…');
  $('cf-enviar').disabled = true;
  try {
    const r = await fetch(urlApi, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha, parentesco: $('cf-parentesco').value, consentimento: true, filhos }),
    });
    const dados = await r.json().catch(() => ({}));
    if (!r.ok) {
      $('cf-enviar').disabled = false;
      if (dados.codigo === 'conta_existe') return erroNo($('cf-senha'), dados.message);
      return aviso(dados.message || 'Não deu para fazer o cadastro. Tente de novo.');
    }
    // já entra na conta: o botão "Acompanhar meus filhos" abre a área da família sem pedir o login de novo
    try { if (dados.token) localStorage.setItem('pleno-ortografia:token', dados.token); } catch (e) { /* sem armazenamento: entra pelo login */ }
    $('cf-fim-texto').textContent = ehEscola
      ? 'A escola já recebeu o cadastro e vai colocar cada filho na turma. Filhos cadastrados:'
      : 'O cadastro já chegou para o(a) profissional. Filhos cadastrados:';
    $('cf-resumo').innerHTML = '';
    filhos.forEach((f) => {
      const li = document.createElement('li');
      li.textContent = f.nome;
      $('cf-resumo').appendChild(li);
    });
    $('cf-form').hidden = true;
    $('cf-fim').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (e) {
    aviso('Sem internet agora: o que você digitou continua aqui. Tente enviar de novo quando a conexão voltar.');
    $('cf-enviar').disabled = false;
  }
};

abrir();
