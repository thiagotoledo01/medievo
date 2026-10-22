// Instalação do app (PWA) + service worker
let dip=null;
const standalone=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone;
const btnI=()=>document.getElementById('n-inst');
if(!standalone)btnI().style.display='block';
addEventListener('beforeinstallprompt',e=>{e.preventDefault();dip=e;btnI().style.display='block'});
addEventListener('appinstalled',()=>{dip=null;btnI().style.display='none';toast('✅ App instalado!',2500)});
function instalar(){gaveta(false);
 if(dip){dip.prompt();dip.userChoice.finally(()=>{dip=null});return}
 const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
 toast(ios?'No iPhone/iPad: toque em Compartilhar ⬆️ e depois "Adicionar à Tela de Início".':'Abra o menu ⋮ do navegador e escolha "Instalar app" ou "Adicionar à tela inicial".',6000)}
if('serviceWorker' in navigator)addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.log('SW',e)));
