
 // Service worker: permite instalar o app e jogar offline depois do primeiro acesso.
 // Ao atualizar os arquivos do jogo, aumente o número da versão abaixo.
const VERSAO = 'medievo-v13';

const ARQUIVOS = [
  './',
  'index.html',
  'css/bootstrap.min.css',
  'css/style.css',
  'js/bootstrap.bundle.min.js',
  'js/config.js',
  'js/game.js',
  'js/fullscreen.js',
  'js/pwa.js',
  'js/online.js',
  'js/firebase-config.js',
  'assets/titulo.png',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'assets/board-bg.png',
  ...Array.from({ length: 10 }, (_, i) => `assets/time${i + 1}.png`)
];

self.addEventListener('install', e => {
  // Adiciona os arquivos individualmente e ignora os que não existirem.
  e.waitUntil(
    caches.open(VERSAO).then(c =>
      Promise.all(
        ARQUIVOS.map(a => c.add(a).catch(() => {}))
      )
    )
  );

  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Remove caches antigos.
  e.waitUntil(
    caches.keys().then(ks =>
      Promise.all(
        ks.filter(k => k !== VERSAO).map(k => caches.delete(k))
      )
    )
  );

  self.clients.claim();
});

// Rede primeiro; se estiver offline, utiliza o cache.
self.addEventListener('fetch', e => {
  if (
    e.request.method !== 'GET' ||
    new URL(e.request.url).origin !== location.origin ||
    e.request.url.includes('/api/')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(r => {
        const copia = r.clone();

        caches.open(VERSAO)
          .then(c => c.put(e.request, copia))
          .catch(() => {});

        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
