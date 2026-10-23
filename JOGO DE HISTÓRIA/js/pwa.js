// Instalação do app (PWA) + service worker
// O evento beforeinstallprompt é capturado no <head> (window.__dip) para não se perder.
const standalone = (matchMedia('(display-mode: standalone)').matches ||
  matchMedia('(display-mode: minimal-ui)').matches ||
  (matchMedia('(display-mode: fullscreen)').matches && !(document.fullscreenElement || document.webkitFullscreenElement)) ||
  navigator.standalone === true);
const btnsI = () => document.querySelectorAll('.inst');
const mostraI = on => btnsI().forEach(b => b.classList.toggle('show', on));
mostraI(!standalone);

addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__dip = e; mostraI(true); });
addEventListener('appinstalled', () => { window.__dip = null; mostraI(false); toast('✅ App instalado!', 2500); });

function instalar() {
  gaveta(false);
  const dip = window.__dip;
  if (dip) {
    dip.prompt();
    dip.userChoice.finally(() => { window.__dip = null; });
    return;
  }
  const ua = navigator.userAgent;
  const emApp = /FBAN|FBAV|Instagram|WhatsApp|Line\/|; wv\)|MiuiBrowser.*Mobile.*Version/i.test(ua);
  if (location.protocol === 'file:' || !isSecureContext) {
    toast('Para instalar, o jogo precisa estar publicado em um endereço HTTPS.', 6000);
  } else if (emApp) {
    toast('Você está num navegador dentro de outro app. Abra este link no Chrome (ou Safari) para instalar.', 7000);
  } else {
    verInst(); // abre o tutorial de instalação já no slide do aparelho
  }
}

if ('serviceWorker' in navigator)
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(e => console.log('SW', e)));
