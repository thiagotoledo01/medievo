// Alterna tela cheia (iPhone/Safari não suporta: nesse caso nada acontece)
function tela() {
  try {
    const f = document.fullscreenElement || document.webkitFullscreenElement;
    if (f) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const e = document.documentElement, req = e.requestFullscreen || e.webkitRequestFullscreen;
    if (req) Promise.resolve(req.call(e)).catch(() => {});
    else toast('Neste aparelho, use "Adicionar à tela inicial" para jogar em tela cheia.', 4000);
  } catch (err) { console.log(err); }
}

// ---- Celular: tela cheia + trava na horizontal ----
// No app instalado, o manifest já força a horizontal. No navegador, o Android só permite
// travar a orientação em tela cheia, por isso pedimos tela cheia no primeiro toque.
// (iPhone/Safari não permite travar: o jogo mostra o aviso "Gire o celular".)
const jaApp = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true;
function travaH() {
  try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => {}); } catch (e) {}
}
function modoCelular() {
  try {
    const f = document.fullscreenElement || document.webkitFullscreenElement;
    const e = document.documentElement, req = e.requestFullscreen || e.webkitRequestFullscreen;
    if (!f && !jaApp() && req) Promise.resolve(req.call(e)).then(travaH, travaH);
    else travaH();
  } catch (err) { travaH(); }
}
document.addEventListener('fullscreenchange', () => { if (document.fullscreenElement && typeof DISP !== 'undefined' && DISP == 'mobile') travaH(); });
