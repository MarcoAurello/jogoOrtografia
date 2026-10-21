// Guarda os arquivos do jogo para funcionar offline.
// Ao mudar qualquer arquivo do jogo, aumente a VERSAO para os aparelhos baixarem a nova.
const VERSAO = 'ortografia-pleno-v31';

const FIGURAS = ['c-cedilha', 'r-rr', 'm-n', 'g-j', 'x-ch', 'acentos']
  .flatMap((id) => Array.from({ length: 10 }, (_, i) => `./assets/figuras/${id}-${i}.jpg`));

const ARQUIVOS = [
  './',
  './index.html',
  './style.css?v=31',
  './jogo.js?v=31',
  './dados.js?v=31',
  './plenix.js?v=31',
  './assets/plenix/plenix_spritesheet_1x.png',
  './assets/tiro/canhao-cano.png',
  './assets/tiro/canhao-carreta.png',
  './assets/tiro/missil.png',
  './assets/tiro/bala.png',
  './assets/tiro/explosao.png',
  './assets/tiro/municao.png',
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
