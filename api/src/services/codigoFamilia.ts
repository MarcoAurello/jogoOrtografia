import { randomInt } from "crypto";
import Usuario from "../models/Usuario";

// O código da família: FAM- e 5 letras/números (sem 0/O e 1/I, como o código da turma). Sorteado com crypto: quem
// tem o código vê os apelidos dos filhos, então não pode ser previsível. A entrada aceita sem o "FAM-" e em minúsculas.
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const PREFIXO = "FAM-";

export function normalizarCodigoFamilia(valor: unknown): string {
  const limpo = String(valor || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^FAM/, "");
  return /^[A-Z0-9]{5}$/.test(limpo) ? PREFIXO + limpo : "";
}

export async function gerarCodigoFamilia(usuario: Usuario): Promise<string> {
  for (;;) {
    const codigo = PREFIXO + Array.from({ length: 5 }, () => LETRAS[randomInt(LETRAS.length)]).join("");
    if (await Usuario.findOne({ where: { codigo_familia: codigo } })) continue;
    usuario.codigo_familia = codigo;
    await usuario.save({ hooks: false });
    return codigo;
  }
}
