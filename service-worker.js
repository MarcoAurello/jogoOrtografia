// Guarda os arquivos do jogo para funcionar offline.
// Ao mudar qualquer arquivo do jogo, aumente a VERSAO para os aparelhos baixarem a nova.
const VERSAO = 'ortografia-pleno-v53';

const FIGURAS = ['c-cedilha', 'r-rr', 'm-n', 'g-j', 'x-ch', 'acentos']
  .flatMap((id) => Array.from({ length: 10 }, (_, i) => `./assets/figuras/${id}-${i}.jpg`));

const ARQUIVOS = [
  './',
  './index.html',
  './style.css?v=53',
  './jogo.js?v=53',
  './dados.js?v=53',
  './plenix.js?v=53',
  './assets/plenix/plenix_spritesheet_1x.png',
  './assets/tiro/canhao-cano.png',
  './assets/tiro/canhao-carreta.png',
  './assets/tiro/missil.png',
  './assets/tiro/bala.png',
  './assets/tiro/explosao.png',
  './assets/tiro/municao.png',
  './assets/tiro/capa-tiro-certo.jpg',
  './assets/capa-chuva-erros.jpg',
  './assets/capa-chuva-matematica.jpg',
  './assets/capa-peso-certo.jpg',
  './assets/capa-ortografia.jpg',
  './assets/capa-abc-tia-ana.jpg',
  './assets/capa-ingles-rotina.jpg',
  './assets/capa-psico-estrategia.jpg',
  './assets/capa-hive.jpg',
  './assets/capa-reflexo.jpg',
  './assets/manual/g07-reflexo.jpg',
  './manual.html',
  './assets/manual/g00-lista.jpg',
  './assets/manual/g01-orto-niveis.jpg',
  './assets/manual/g02-orto-pergunta.jpg',
  './assets/manual/g03-chuva.jpg',
  './assets/manual/g04-mat.jpg',
  './assets/manual/g05-tiro.jpg',
  './assets/manual/g06-peso.jpg',
  './assets/manual/p01-inicio.jpg',
  './assets/manual/p02-senha.jpg',
  './assets/manual/p03-menu.jpg',
  './assets/manual/p04-emails.jpg',
  './assets/manual/p05-email-ok.jpg',
  './assets/manual/p06-quiz-lista.jpg',
  './assets/manual/p07-quiz-novo.jpg',
  './assets/manual/p08-link.jpg',
  './assets/manual/p09-escolha-prof.jpg',
  './assets/manual/p10-quiz-aluno.jpg',
  './assets/manual/p11-links-jogos.jpg',
  './assets/video/capa-video.jpg',
  './assets/balanca/base.png',
  './assets/balanca/travessao.png',
  './assets/balanca/prato.png',
  './assets/balanca/pesos.png',
  './assets/balanca/objetos.png',
  './vendor/jspdf.umd.min.js',
  './manifest.json',
  './assets/logo-pg.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  ...FIGURAS,
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then((cache) => cache.addAll(ARQUIVOS)));
  self.skipWaiting();
});

// Apaga caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Fonte do Google: guarda na primeira vez para usar offline depois
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(
      caches.open(VERSAO + '-fontes').then(async (cache) => {
        const salvo = await cache.match(e.request);
        if (salvo) return salvo;
        const resposta = await fetch(e.request);
        cache.put(e.request, resposta.clone());
        return resposta;
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;
  // vídeo: o navegador pede em pedaços (Range) e o cache não guarda pedaços; vai direto ao servidor
  if (url.pathname.endsWith('.mp4')) return;

  // Arquivos do jogo: sempre confere com o servidor (sem usar cópia velha do navegador)
  // e só usa o cache quando estiver sem internet
  const pedido = e.request.mode === 'navigate' ? e.request : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(pedido)
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((cache) => cache.put(e.request, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
