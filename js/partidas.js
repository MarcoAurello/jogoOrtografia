/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Partidas no banco: o fim de cada jogo do aluno logado pela turma vai para a API (com fila sem internet). */

import { resultados } from './estado.js?v=132';
import { api, lerTokenAluno } from './api.js?v=132';
import { JOGOS_HAB } from './habilidades.js?v=132';

// ---------- Partidas ----------
// Cada partida ganha um id no aparelho e entra numa fila; a fila vai para a API agora (ou quando a internet voltar,
// ou na próxima vez que o app abrir). O id evita duplicar a partida se ela for mandada duas vezes.
// Só o aluno que entrou com o código da turma tem partidas guardadas; quem joga só com o nome continua como antes.
const CHAVE_FILA = 'pleno-ortografia:fila-partidas';
const MAX_FILA = 300;
const lerFila = () => { try { return JSON.parse(localStorage.getItem(CHAVE_FILA)) || []; } catch (e) { return []; } };
const salvarFila = (f) => { try { localStorage.setItem(CHAVE_FILA, JSON.stringify(f.slice(-MAX_FILA))); } catch (e) { /* sem armazenamento */ } };

// o cartão de cada jogo na tela de jogos (as habilidades estão em js/habilidades.js, pelo id do cartão)
const CARTAO_DO_JOGO = { ortografia: 'btn-jogar', matematica: 'btn-mat', reflexo: 'btn-luzes' };
const habilidadesDoJogo = (jogo) => JOGOS_HAB[CARTAO_DO_JOGO[jogo] || `btn-${jogo}`]?.h || [];

// a competição avisa qual está valendo (js/competicao.js), sem este módulo depender dela
let competicaoDaMissao = () => '';
const definirCompeticaoDaPartida = (f) => { competicaoDaMissao = f; };

const novoId = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));

// chamada no fim de cada jogo (relatorio.js), com o relatório já montado
function registrarPartida({ rel, estrelas, missao: mis, data, jogo }) {
  if (!lerTokenAluno() || !rel.respondidas) return;
  const detalhes = resultados.map((r) => ({ tipo: r.m?.id || '', titulo: r.m?.titulo || '', certa: r.certa, erros: r.erros || [], nivel: r.nivel ?? null,
    tempo: r.tempo == null ? null : Math.round(r.tempo * 10) / 10 }));
  const duracao = resultados.reduce((s, r) => s + (Number(r.tempo) || 0), 0);
  salvarFila([...lerFila(), {
    id: novoId(), jogo, titulo: mis.titulo, acertos: rel.dePrimeiraN, total: rel.respondidas, estrelas,
    nivel_max: rel.niveis && rel.niveis.length ? Math.max(...rel.niveis) : null, duracao_s: duracao ? Math.round(duracao) : null,
    jogada_em: data.toISOString(), habilidades: habilidadesDoJogo(jogo), detalhes, resumo: mis.resumo || [],
    competicao: competicaoDaMissao(mis) || null,
  }]);
  enviarPartidas();
}

// manda a fila, da mais antiga para a mais nova; sem internet, para e tenta depois
let enviando = false;
async function enviarPartidas() {
  if (enviando || !lerTokenAluno()) return;
  enviando = true;
  try {
    for (let item = lerFila()[0]; item; item = lerFila()[0]) {
      try { await api('/partidas', { metodo: 'POST', corpo: item, comoAluno: true }); }
      catch (err) {
        if (!err.status || err.status >= 500 || err.status === 429) break;   // sem internet ou servidor fora: tenta depois
        if (err.status === 401) break;                                     // login do aluno venceu: a fila espera o próximo login
      }
      salvarFila(lerFila().filter((p) => p.id !== item.id));             // gravada (ou recusada de vez: não trava a fila)
    }
  } finally { enviando = false; }
}
window.addEventListener('online', enviarPartidas);
setTimeout(enviarPartidas, 3000);

export { definirCompeticaoDaPartida, enviarPartidas, registrarPartida };
