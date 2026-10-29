import { Request, Response } from "express";
import fs from "fs";
import path from "path";
import Escola from "../models/Escola";

// A página de cada escola (/escolaExemplo) já sai do servidor com o nome, as cores e o logo dela:
// o navegador desenha direto a marca do cliente, sem mostrar a da plataforma antes.
const ARQUIVO_INDEX = path.resolve(process.env.ARQUIVO_INDEX || path.join(__dirname, "..", "..", "publico", "index.html"));

let cache = { mtime: 0, html: "" };
function lerIndex(): string {
  const mtime = fs.statSync(ARQUIVO_INDEX).mtimeMs;
  if (mtime !== cache.mtime) cache = { mtime, html: fs.readFileSync(ARQUIVO_INDEX, "utf-8") };
  return cache.html;
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
function mudarCor(hex: string, f: number, clarear: boolean) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(clarear ? v + (255 - v) * f : v * f));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
// troca um pedaço do HTML (se ele mudar no index.html, a página sai sem aquela troca, mas funciona)
const trocar = (html: string, de: string, para: string) => html.split(de).join(para);

class PaginaController {
  async show(req: Request, res: Response): Promise<Response | void> {
    let html: string;
    try { html = lerIndex(); } catch (error) {
      console.error("index.html não encontrado em", ARQUIVO_INDEX, error);
      return res.status(500).send("Página indisponível.");
    }
    res.set("Cache-Control", "no-cache");
    res.type("html");

    const escola = await Escola.findOne({ where: { slug: req.params.slug } }).catch(() => null);
    if (!escola) return res.send(html);   // escola que não existe: o app abre com a marca da plataforma

    const m = escola.marca();
    const vars = {
      "--primaria": m.cor, "--primaria-escura": mudarCor(m.cor, 0.62, false), "--azul": m.cor,
      "--azul-claro": mudarCor(m.cor, 0.45, true), "--amarelo": m.destaque
    };
    const inicio = `<head>\n  <script>window.ESCOLA_INICIAL = ${JSON.stringify(m).replace(/</g, "\\u003c")};</script>\n`
      + `  <style>:root { ${Object.entries(vars).map(([v, c]) => `${v}: ${c};`).join(" ")} }</style>`;
    html = trocar(html, "<head>", inicio);
    html = trocar(html, '<meta name="theme-color" content="#1fa2b0">', `<meta name="theme-color" content="${m.cor}">`);
    html = trocar(html, "<title>Jogos Psicopedagógicos</title>", `<title>${esc(m.nome)} — Jogos Psicopedagógicos</title>`);
    html = trocar(html, '<meta name="apple-mobile-web-app-title" content="Jogos Psicopedagógicos">', `<meta name="apple-mobile-web-app-title" content="${esc(m.nome)}">`);
    if (m.logo) html = trocar(html, '<img class="logo" src="assets/logo-pg-168.png" alt="Pedagogia Gamificada">', `<img class="logo" src="${esc(m.logo)}" alt="${esc(m.nome)}">`);
    html = trocar(html, '<p class="escola-nome" hidden></p>', `<p class="escola-nome">${esc(m.nome)}</p>`);
    if (m.slogan) html = trocar(html, '<p class="slogan">Jogos com relatórios de desempenho</p>', `<p class="slogan">${esc(m.slogan)}</p>`);
    html = trocar(html, "<body>", '<body class="com-escola">');
    return res.send(html);
  }
}

export default new PaginaController();
