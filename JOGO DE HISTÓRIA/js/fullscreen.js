// Alterna tela cheia (botão 🖥️ no topo)
function tela() {
  const f = document.fullscreenElement || document.webkitFullscreenElement;
  if (f) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
  else { const e = document.documentElement; (e.requestFullscreen || e.webkitRequestFullscreen).call(e); }
}
