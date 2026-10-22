// Service worker: permite instalar o app e jogar offline depois do primeiro acesso.
// Ao atualizar os arquivos do jogo, aumente o número da versão abaixo.
const VERSAO = 'medievo-v6';
const ARQUIVOS = ['./', 'index.html', 'css/style.css', 'js/config.js', 'js/game.js', 'js/fullscreen.js', 'js/pwa.js',
  'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'assets/board-bg.png',
  ...Array.from({ length: 10 }, (_, i) => `assets/time${i + 1}.png`)];

self.addEventListener('install', e => {
  // addAll falha se um arquivo faltar; por isso adiciona um a um e ignora os que não existirem
  e.waitUntil(caches.open(VERSAO).then(c => Promise.all(ARQUIVOS.map(a => c.add(a).catch(() => {})))));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))));
  self.clients.claim();
});
// Rede primeiro (sempre pega a versão nova); se estiver offline, usa o cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copia = r.clone();
    caches.open(VERSAO).then(c => c.put(e.request, copia)).catch(() => {});
    return r;
  }).catch(() => caches.match(e.request)));
});