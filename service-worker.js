// Guarda os arquivos do jogo para funcionar offline.
// Ao mudar qualquer arquivo do jogo, aumente a VERSAO para os aparelhos baixarem a nova.
const VERSAO = 'ortografia-pleno-v253';

const FIGURAS = ['c-cedilha', 'r-rr', 'm-n', 'g-j', 'x-ch', 'acentos']
  .flatMap((id) => Array.from({ length: 10 }, (_, i) => `./assets/figuras/${id}-${i}.jpg`));

const ARQUIVOS = [
  './',
  './index.html',
  './style.css?v=253',
  './js/main.js?v=253',
  './js/util.js?v=253',
  './js/estado.js?v=253',
  './js/som.js?v=253',
  './js/telas.js?v=253',
  './js/habilidades.js?v=253',
  './js/professor.js?v=253',
  './js/ortografia.js?v=253',
  './js/chuva.js?v=253',
  './js/matematica.js?v=253',
  './js/tiro.js?v=253',
  './js/peso.js?v=253',
  './js/quiz.js?v=253',
  './js/luzes.js?v=253',
  './js/rotina.js?v=253',
  './js/fichas.js?v=253',
  './js/escondida.js?v=253',
  './js/copia.js?v=253',
  './js/barcos.js?v=253',
  './js/giro.js?v=253',
  './js/hora.js?v=253',
  './js/somando.js?v=253',
  './js/descobrir.js?v=253',
  './js/chaves.js?v=253',
  './js/caminho.js?v=253',
  './js/policia.js?v=253',
  './js/pontos.js?v=253',
  './js/pixels.js?v=253',
  './js/fracoes.js?v=253',
  './js/escola.js?v=253',
  './js/api.js?v=253',
  './js/usuarios.js?v=253',
  './js/popup.js?v=253',
  './js/alunos.js?v=253',
  './js/anamnese-form.js?v=253',
  './js/dados-anamnese.js?v=253',
  './js/planos.js?v=253',
  './js/entrada.js?v=253',
  './js/partidas.js?v=253',
  './js/turmas.js?v=253',
  './js/painel.js?v=253',
  './js/testegratis.js?v=253',
  './assets/escolas/escola-exemplo.svg',
  './js/competicao.js?v=253',
  './js/cores.js?v=253',
  './js/lados.js?v=253',
  './js/setas.js?v=253',
  './js/vistas.js?v=253',
  './js/dinos.js?v=253',
  './js/pilhas.js?v=253',
  './js/blocos.js?v=253',
  './js/lugar.js?v=253',
  './js/malha.js?v=253',
  './js/fila.js?v=253',
  './js/loja.js?v=253',
  './js/palitos.js?v=253',
  './js/bordas.js?v=253',
  './js/cadeado.js?v=253',
  './js/tatu.js?v=253',
  './js/flores.js?v=253',
  './js/bichos.js?v=253',
  './js/intervalo.js?v=253',
  './js/fita.js?v=253',
  './js/simbolos.js?v=253',
  './js/tabuada.js?v=253',
  './js/classes.js?v=253',
  './js/dados-classes.js?v=253',
  './js/graficos.js?v=253',
  './js/dados-graficos.js?v=253',
  './js/historia.js?v=253',
  './js/dados-historia.js?v=253',
  './js/comercio.js?v=253',
  './js/dados-comercio.js?v=253',
  './js/bandeiras.js?v=253',
  './js/mapa-comercio.js?v=253',
  './js/cartografo.js?v=253',
  './js/dados-cartografo.js?v=253',
  './js/bip.js?v=253',
  './js/dados-bip.js?v=253',
  './js/relatorio.js?v=253',
  './dados.js?v=253',
  './plenix.js?v=253',
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
  './assets/capa-reflexo2.jpg',
  './assets/manual/g08-reflexo2.jpg',
  './assets/capa-rotina.jpg',
  './assets/manual/g09-rotina.jpg',
  './assets/capa-fichas.jpg',
  './assets/manual/g10-fichas.jpg',
  './assets/capa-escondida.jpg',
  './assets/manual/g11-escondida.jpg',
  './assets/capa-copia.jpg',
  './assets/manual/g12-copia.jpg',
  './assets/barco.png',
  './assets/capa-barcos.jpg',
  './assets/manual/g13-barcos.jpg',
  './assets/capa-giro.jpg',
  './assets/manual/g14-giro.jpg',
  './assets/capa-hora.jpg',
  './assets/capa-historia.jpg',
  './assets/capa-comercio.jpg',
  './assets/capa-cartografo.jpg',
  './assets/capa-bip.jpg',
  './assets/logo-games.webp',
  './assets/logo-games-mini.webp',
  './assets/manual/g15-hora.jpg',
  './assets/capa-somando.jpg',
  './assets/manual/g16-somando.jpg',
  './assets/capa-descobrir.jpg',
  './assets/manual/g17-descobrir.jpg',
  './assets/capa-chaves.jpg',
  './assets/manual/g18-chaves.jpg',
  './assets/capa-caminho.jpg',
  './assets/capa-taxi.jpg',
  './assets/manual/g19-caminho.jpg',
  './assets/manual/g20-taxi.jpg',
  './assets/capa-policia.jpg',
  './assets/manual/g21-policia.jpg',
  './assets/capa-pontos.jpg',
  './assets/manual/g22-pontos.jpg',
  './assets/capa-pixels.jpg',
  './assets/manual/g23-pixels.jpg',
  './assets/capa-fracoes.jpg',
  './assets/manual/g24-fracoes.jpg',
  './manual.html',
  './assets/manual/g25-lista-habilidades.jpg',
  './assets/manual/g01-orto-niveis.jpg',
  './assets/manual/g02-orto-pergunta.jpg',
  './assets/manual/g03-chuva.jpg',
  './assets/manual/g04-mat.jpg',
  './assets/manual/g05-tiro.jpg',
  './assets/manual/g06-peso.jpg',
  './assets/manual/p14-inicio-app.jpg',
  './assets/manual/p15-menu-lateral.jpg',
  './assets/manual/a03-codigo-turma.jpg',
  './assets/manual/a04-nomes-turma.jpg',
  './assets/manual/a05-pin.jpg',
  './assets/manual/a06-continuar.jpg',
  './assets/manual/a08-quem-joga.jpg',
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
  './assets/manual/p12-competicao-prof.jpg',
  './assets/manual/p13-competicao-ranking.jpg',
  './assets/video/capa-gestao.jpg',
  './assets/balanca/base.png',
  './assets/balanca/travessao.png',
  './assets/balanca/prato.png',
  './assets/balanca/pesos.png',
  './assets/balanca/objetos.png',
  './vendor/jspdf.umd.min.js',
  './manifest.json',
  './assets/logo-pg.png',
  './assets/logo-pg-168.png',
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
  // a gestão (/gestao/) é outro app, só online: sem isso, sem internet ela cairia no index.html dos jogos
  if (url.pathname.startsWith('/gestao/') || url.pathname === '/gestao') return;
  // vídeo: o navegador pede em pedaços (Range) e o cache não guarda pedaços; vai direto ao servidor
  if (url.pathname.endsWith('.mp4')) return;

  // Imagens: mostra na hora a cópia guardada e atualiza a cópia por trás (as imagens quase nunca mudam;
  // esperar o servidor a cada figura deixava o manual e as listas lentos)
  if (/\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    const daRede = fetch(e.request).then((resposta) => {
      if (resposta.ok) { const copia = resposta.clone(); caches.open(VERSAO).then((cache) => cache.put(e.request, copia)); }
      return resposta;
    });
    e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((salva) => salva || daRede));
    e.waitUntil(daRede.catch(() => {}));
    return;
  }

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
