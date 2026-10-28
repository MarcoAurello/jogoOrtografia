/* Jogos Educacionais — © Davi e Marco. Todos os direitos reservados. */
/* Sons (sem arquivos, pelo AudioContext) e voz: gravações do Davi em audio/ ou a voz do aparelho. */

import { $ } from './util.js?v=128';

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

export { falar, frase, pararVoz, SOM, tocar };
