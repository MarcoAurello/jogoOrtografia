/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Proteção dos jogos contra cópia: trava de endereço e licença renovada pelo servidor. */

// Quem baixa o site ("Salvar página como", copiar os arquivos do app instalado) não consegue jogar fora da plataforma:
// 1) Trava de endereço: o app só roda nos endereços oficiais (e no localhost, para testar). Aberto do computador
//    (file://) ou publicado em outro site, ele mostra o aviso e para.
// 2) Licença: para abrir um jogo, o aparelho precisa de um passe que só a API do site oficial entrega
//    (api/src/services/licenca.ts). O passe é assinado com a chave privada do servidor e conferido aqui com a chave
//    pública, então não dá para fabricar nem esticar o prazo. Vale LICENCA_DIAS (3 dias) sem internet: a escola com
//    internet instável continua jogando, e uma cópia sem o servidor para de funcionar quando o passe vence.
// Não existe proteção total para código que roda no navegador (quem entende de programação pode editar a cópia), mas
// isso fecha o caminho de quem só baixa e abre.
const ENDERECOS = ['gamespedagogicos.store', 'www.gamespedagogicos.store', 'pedagociagamificada.com.br', 'www.pedagociagamificada.com.br', 'localhost', '127.0.0.1'];
const CHAVE_PUBLICA = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE5Bz/nC/QnRM/533ia5xb4fWXjC4avDJiTsk5GojUNiZQ4df5d0xIM5oh+QMwXI0z5Kpo6Ub5lSRf2RPIZY9x3A==';
const CHAVE = 'pleno-ortografia:licenca';
const RENOVAR_DEPOIS = 12 * 60 * 60 * 1000;   // com internet, renova o passe a cada 12 h (o prazo offline volta a ser cheio)
const SITE = 'https://gamespedagogicos.store';

const noEnderecoOficial = () => location.protocol !== 'file:' && ENDERECOS.includes(location.hostname);
const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || null; } catch (e) { return null; } };
const gravar = (v) => { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

// ---------- 1) trava de endereço: roda assim que o app carrega (main.js importa este arquivo primeiro) ----------
if (!noEnderecoOficial()) {
  document.addEventListener('DOMContentLoaded', () => aviso('fora'));
  if (document.readyState !== 'loading') aviso('fora');
  // interrompe o carregamento dos outros módulos: nenhum jogo é ligado
  throw new Error('Os jogos só funcionam no site oficial.');
}

// ---------- 2) o passe ----------
const deBase64 = (b64) => Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4)), (c) => c.charCodeAt(0));
let chavePublica = null;
async function conferirAssinatura(passe) {
  const [cab, dados, assinatura] = String(passe).split('.');
  if (!cab || !dados || !assinatura || !window.crypto?.subtle) return null;
  try {
    chavePublica = chavePublica || await crypto.subtle.importKey('spki', deBase64(CHAVE_PUBLICA), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, chavePublica, deBase64(assinatura), new TextEncoder().encode(`${cab}.${dados}`));
    return ok ? JSON.parse(new TextDecoder().decode(deBase64(dados))) : null;
  } catch (e) { return null; }
}
// válido: assinatura certa, para este endereço, dentro do prazo e sem relógio voltado para trás (para esticar o prazo)
const dentroDoPrazo = (d) => !!d && Date.now() < d.exp * 1000 && Date.now() > d.iat * 1000 - 60 * 60 * 1000;
let valido = null;   // dados do passe já conferido nesta sessão ({ tipo, dom, iat, exp })

// sem a chave no servidor, a licença vem "desligada": deixa jogar, mas a cópia ainda precisa do servidor para renovar
function desligadaValida(l) { return !!l && l.desligada && Date.now() < l.ate && Date.now() > l.em - 60 * 60 * 1000; }

function licencaValida() {
  const l = ler();
  if (desligadaValida(l)) return true;
  return !!valido && l?.passe === valido.passe && dentroDoPrazo(valido);
}

async function pedirAoServidor() {
  const r = await fetch('/api/licenca', { cache: 'no-store', credentials: 'same-origin' });
  const dados = await r.json().catch(() => ({}));
  if (r.status === 403) { const e = new Error(dados.message || 'fora'); e.fora = true; throw e; }
  if (!r.ok) throw new Error(dados.message || 'sem licença');
  if (dados.desligada) { gravar({ desligada: true, em: Date.now(), ate: Date.now() + (dados.dias || 3) * 86400000 }); valido = null; return true; }
  const d = await conferirAssinatura(dados.passe);
  if (!d || d.tipo !== 'licenca' || d.dom !== location.hostname || !dentroDoPrazo(d)) throw new Error('passe inválido');
  gravar({ passe: dados.passe });
  valido = { ...d, passe: dados.passe };
  return true;
}

// garante um passe válido: confere o guardado (sem internet) e renova com o servidor quando precisa.
// Devolve true (pode jogar) ou 'fora' / 'offline' (motivo do bloqueio).
let pedindo = null;
async function garantirLicenca() {
  const l = ler();
  if (l?.passe && (!valido || valido.passe !== l.passe)) {
    const d = await conferirAssinatura(l.passe);
    valido = d && d.tipo === 'licenca' && d.dom === location.hostname ? { ...d, passe: l.passe } : null;
  }
  const temPasse = licencaValida();
  const velho = desligadaValida(l) ? Date.now() - l.em > RENOVAR_DEPOIS : !valido || Date.now() - valido.iat * 1000 > RENOVAR_DEPOIS;
  if (temPasse && !velho) return true;
  if (!pedindo) pedindo = pedirAoServidor().finally(() => { pedindo = null; });
  if (temPasse) { pedindo.catch(() => { /* sem internet: segue com o passe que ainda vale */ }); return true; }
  try { await pedindo; return true; } catch (e) { return e.fora ? 'fora' : 'offline'; }
}

// ---------- 3) o aviso ----------
function aviso(motivo, tentarDeNovo) {
  let caixa = document.getElementById('licenca-aviso');
  if (!caixa) {
    caixa = document.createElement('div');
    caixa.id = 'licenca-aviso';
    caixa.className = 'licenca-aviso';
    caixa.setAttribute('role', 'alertdialog');
    caixa.setAttribute('aria-modal', 'true');
    document.body.appendChild(caixa);
  }
  const textos = {
    fora: ['🔒', 'Os jogos só funcionam no site oficial', 'Esta cópia não pode ser usada. Para jogar, entre no endereço da Pedagogia Gamificada:'],
    offline: ['📶', 'Conecte à internet para continuar', 'A licença dos jogos é renovada a cada 3 dias. Ligue o Wi-Fi ou os dados do aparelho e toque em "Tentar de novo".'],
    conferindo: ['⏳', 'Conferindo a licença...', 'Só um instante.'],
  }[motivo];
  caixa.innerHTML = `<div class="licenca-caixa"><span class="licenca-icone" aria-hidden="true">${textos[0]}</span>
    <h2>${textos[1]}</h2><p>${textos[2]}</p>
    ${motivo === 'fora' ? `<a class="licenca-btn" href="${SITE}">Abrir ${SITE.replace('https://', '')}</a>` : ''}
    ${motivo === 'offline' ? '<button class="licenca-btn" type="button" id="licenca-tentar">Tentar de novo</button><button class="licenca-sec" type="button" id="licenca-fechar">Voltar</button>' : ''}</div>`;
  caixa.hidden = false;
  if (motivo === 'offline') {
    document.getElementById('licenca-tentar').onclick = tentarDeNovo;
    document.getElementById('licenca-fechar').onclick = fecharAviso;
    document.getElementById('licenca-tentar').focus();
  }
}
function fecharAviso() { const c = document.getElementById('licenca-aviso'); if (c) c.hidden = true; }

// antes de abrir uma tela de jogo sem passe válido: confere/renova e só então abre; sem passe, mostra o aviso
function pedirLicencaE(abrir, desistir) {
  aviso('conferindo');
  garantirLicenca().then((r) => {
    if (r === true) { fecharAviso(); abrir(); return; }
    desistir();
    aviso(r, () => pedirLicencaE(abrir, desistir));
  });
}

// ao abrir o app e quando a internet volta: deixa o passe em dia (sem travar nada)
garantirLicenca();
window.addEventListener('online', () => garantirLicenca());

export { garantirLicenca, licencaValida, pedirLicencaE };
