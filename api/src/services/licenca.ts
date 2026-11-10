import crypto from "crypto";

// Licença dos jogos: um passe curto (LICENCA_DIAS, padrão 3 dias) que o app guarda e confere antes de abrir um jogo.
// O passe é assinado com ECDSA P-256 (ES256): a chave privada fica só aqui (LICENCA_CHAVE_PRIVADA, PEM em base64) e o
// app tem só a chave pública (js/licenca.js), então ninguém consegue fabricar nem esticar um passe no aparelho.
// O passe diz para qual endereço vale ("dom"): uma cópia dos jogos em outro site ou aberta do computador não serve.
// Sem a chave configurada, a licença fica desligada (o app deixa jogar), para um deploy sem a variável não travar todo
// mundo.

const base64url = (b: Buffer) => b.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

let chave: crypto.KeyObject | null | undefined;
function chavePrivada(): crypto.KeyObject | null {
  if (chave !== undefined) return chave;
  const b64 = (process.env.LICENCA_CHAVE_PRIVADA || "").trim();
  try {
    chave = b64 ? crypto.createPrivateKey(Buffer.from(b64, "base64").toString("utf8")) : null;
  } catch {
    console.error("LICENCA_CHAVE_PRIVADA inválida: a licença dos jogos ficou desligada.");
    chave = null;
  }
  return chave;
}

export const diasDaLicenca = () => Math.min(30, Math.max(1, Number(process.env.LICENCA_DIAS) || 3));

// endereços oficiais (os de FRONTEND_URL) e os de teste no computador
export function enderecosOficiais(): string[] {
  const doEnv = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((o) => { try { return new URL(o.trim()).hostname; } catch { return ""; } })
    .filter(Boolean);
  const comEsemWww = doEnv.flatMap((h) => (h.startsWith("www.") ? [h, h.slice(4)] : [h, `www.${h}`]));
  return [...new Set([...comEsemWww, "localhost", "127.0.0.1"])];
}

export function licencaLigada(): boolean {
  return !!chavePrivada();
}

// o passe: cabeçalho.dados.assinatura (como um JWT ES256), com a assinatura no formato r||s que o navegador confere
export function assinarPasse(dominio: string): { passe: string; expira: number } {
  const k = chavePrivada();
  if (!k) throw new Error("licença desligada");
  const agora = Math.floor(Date.now() / 1000);
  const exp = agora + diasDaLicenca() * 24 * 60 * 60;
  const cabecalho = base64url(Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const dados = base64url(Buffer.from(JSON.stringify({ tipo: "licenca", dom: dominio, iat: agora, exp })));
  const assinatura = crypto.sign("sha256", Buffer.from(`${cabecalho}.${dados}`), { key: k, dsaEncoding: "ieee-p1363" });
  return { passe: `${cabecalho}.${dados}.${base64url(assinatura)}`, expira: exp * 1000 };
}
