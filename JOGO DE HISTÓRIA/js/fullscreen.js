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
