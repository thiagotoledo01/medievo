const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const FINAL=CASAS.length-1,KEY='idade_media_save_v1',COR=i=>CORES_TIMES[i%CORES_TIMES.length];
let S=null,ci=0,mudo=false,busy=false,timer=null,Q=null,ac=null;
// Pré-carrega todos os personagens para a troca ficar instantânea
const CACHE=AVATARES.map(a=>{const i=new Image();i.src=a.img;return i});
const wait=ms=>new Promise(r=>setTimeout(r,ms));

/* ---------- abas ---------- */
let aba_='jogo',rvT=null;function aba(a){aba_=a;if(a!='resumo'){$('rv-bar').style.display='none';clearInterval(rvT)}gaveta(false);['jogo','resumo','tut','ti'].forEach(x=>{$('t-'+x).classList.toggle('on',x==a);$('n-'+x).classList.toggle('on',x==a)});if(a=="resumo")slR.fit();if(a=="tut")slT.fit();if(a=="ti")slI.fit();modo()}
function toast(m,ms=1800){const t=$('toast');t.textContent=m;t.style.display='block';setTimeout(()=>t.style.display='none',ms)}
/* ---------- som ---------- */
function bip(f,d=.15,tp='sine'){if(mudo)return;try{ac=ac||new AudioContext();const o=ac.createOscillator(),g=ac.createGain();o.type=tp;o.frequency.value=f;g.gain.value=.12;o.connect(g);g.connect(ac.destination);o.start();g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+d);o.stop(ac.currentTime+d)}catch(e){}}
const somOk=()=>[523,659,784].forEach((f,i)=>setTimeout(()=>bip(f,.2),i*110)),somNo=()=>[300,220].forEach((f,i)=>setTimeout(()=>bip(f,.3,'sawtooth'),i*160));
/* ---------- confete ---------- */
function confete(){const c=document.createElement('canvas');c.width=innerWidth;c.height=innerHeight;document.body.appendChild(c);const x=c.getContext('2d'),p=[...Array(140)].map(()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height/2,v:2+Math.random()*4,s:5+Math.random()*7,c:COR(Math.random()*10|0),r:Math.random()*6}));let t=0;(function f(){x.clearRect(0,0,c.width,c.height);p.forEach(q=>{q.y+=q.v;q.r+=.1;x.fillStyle=q.c;x.save();x.translate(q.x,q.y);x.rotate(q.r);x.fillRect(0,0,q.s,q.s*.6);x.restore()});if(++t<220)requestAnimationFrame(f);else c.remove()})()}
/* ---------- resumo ---------- */
/* ---------- slides (resumo e tutorial) ---------- */
function mkSlides(box,itens){let i=0;box.innerHTML='<div class="sl-wrap"><button class="arr" type="button">‹</button><div class="sl-card"></div><button class="arr" type="button">›</button></div><div class="dots"></div>';
 const card=box.querySelector('.sl-card'),dots=box.querySelector('.dots'),[a,b]=box.querySelectorAll('.arr');
 function go(n,hl){i=(n+itens.length)%itens.length;card.innerHTML='<h2>'+itens[i][0]+'</h2><div class="sl-body">'+itens[i][1]+'</div>';if(hl)grifa(card.querySelector('.sl-body'),hl);dots.innerHTML=itens.map((_,k)=>`<i class="${k==i?'on':''}" title="${esc(itens[k][0])}"></i>`).join('')+'<span>'+(i+1)+' / '+itens.length+'</span>';dots.querySelectorAll('i').forEach((d,k)=>d.onclick=()=>go(k));fit()}
 function fit(){card.style.setProperty('--fs',1);let f=1;while(f>.6&&card.scrollHeight>card.clientHeight+1){f=Math.round((f-.05)*100)/100;card.style.setProperty('--fs',f)}}
 addEventListener('resize',()=>{if(box.offsetParent)fit()});
 a.onclick=()=>go(i-1);b.onclick=()=>go(i+1);go(0);return{go,prev:()=>go(i-1),next:()=>go(i+1),fit}}
const TUT=[
 ['⚔️ Bem-vindo!','<p>Este jogo de tabuleiro testa o que você sabe sobre a <b>Idade Média</b>.</p><p>Estude na aba <b>📖 Resumo</b>, depois jogue na aba <b>🎮 Jogo</b>. Use as setas <b>‹ ›</b> (ou o teclado ← →) para passar os slides.</p>'],
 ['1. Preparação','<ul><li>Escolha de <b>1 a 10 times</b>.</li><li>Cada time digita seu <b>nome</b> e usa as setas <b>‹ ›</b> para escolher um personagem.</li><li>Personagens já escolhidos não se repetem.</li></ul>'],
 ['2. Na sua vez','<ul><li>Role o <b>dado físico</b>, digite o número (1 a 6) no campinho do canto da tela e clique em <b>Mover</b> (ou Enter).</li><li>Sem dado? Use <b>🎲 Rolar dado virtual</b> no menu ☰.</li><li>Seu pino <b>anda primeiro</b>. Ao parar na casa, surge uma <b>pergunta</b> e você tem <b>30 segundos</b>.</li></ul>'],
 ['3. Acertou ou errou?','<ul><li><b>Acertou:</b> seu pino <b>permanece</b> na casa onde parou.</li><li><b>Errou ou o tempo acabou:</b> o pino <b>volta</b> para a casa em que estava.</li><li>Não há casas de voltar nem de avançar: só o dado e o conhecimento decidem.</li></ul>'],
 ['4. Vitória','<ul><li>Chegou na última casa? Seu time terminou!</li><li>Os <b>3 primeiros</b> a chegar formam o <b>pódio</b>.</li><li>Errou uma pergunta? Clique em <b>📖 Ver no resumo</b> para revisar o tema.</li></ul>'],
 ['5. Dicas','<ul><li>A partida é <b>salva sozinha</b>: dá para fechar e continuar depois.</li><li>Use 🔊/🔇 para o som e 🖥️ para tela cheia (ótimo na TV!).</li><li>Boa sorte, cavaleiros e damas! 🏰</li></ul>']];
const slR=mkSlides($('sl-resumo'),TEMAS.map(t=>[t[0],'<p>'+t[1]+'</p>'])),slT=mkSlides($('sl-tut'),TUT);
const INST=[
 ['📲 Instalar o jogo','<p>Instalando, o jogo ganha um <b>ícone na tela inicial</b>, abre em <b>tela cheia</b>, sem barra do navegador, e funciona <b>offline</b> depois do primeiro acesso.</p><p>Use as setas <b>‹ ›</b> para ver o passo a passo do seu aparelho: <b>Android</b>, <b>iPhone/iPad</b> ou <b>Computador</b>.</p><ul><li>O jogo precisa estar aberto por um endereço <b>https://</b>.</li><li>Abra no navegador de verdade (Chrome ou Safari), não dentro do WhatsApp, Instagram ou Facebook.</li></ul>'],
 ['🤖 Android (Chrome)','<ul><li>Abra o jogo no <b>Chrome</b>.</li><li>Toque em <b>📲 Instalar app</b> (no menu ☰ ou na tela inicial do jogo) e confirme em <b>Instalar</b>.</li><li>Se o botão não abrir a janela, toque no menu <b>⋮</b> do Chrome e escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</li><li>Procure o ícone <b>Medievo</b> na tela inicial ou na lista de apps.</li></ul>'],
 ['🍎 iPhone e iPad (Safari)','<ul><li>Abra o jogo no <b>Safari</b>. No iPhone, só o Safari instala com garantia.</li><li>Toque no botão <b>Compartilhar</b> ⬆️ (quadrado com seta).</li><li>Role e toque em <b>Adicionar à Tela de Início</b>.</li><li>Toque em <b>Adicionar</b>. O ícone aparece na tela inicial.</li></ul><p>No iPhone não existe o botão automático de instalar: o caminho é sempre pelo Compartilhar.</p>'],
 ['💻 Computador (Chrome ou Edge)','<ul><li>Abra o jogo no <b>Chrome</b> ou no <b>Edge</b>.</li><li>Clique no ícone <b>⊕ / 🖥️ Instalar</b> no canto direito da barra de endereço.</li><li>Ou abra o menu <b>⋮</b> e escolha <b>Transmitir, salvar e compartilhar → Instalar página como app</b> (Chrome) ou <b>Aplicativos → Instalar este site como um aplicativo</b> (Edge).</li><li>Confirme em <b>Instalar</b>. O jogo abre em janela própria e fica no menu Iniciar ou Launchpad.</li></ul><p>O Safari e o Firefox no computador não instalam apps.</p>'],
 ['🌐 Outros navegadores','<ul><li><b>Samsung Internet:</b> menu ☰ → <b>Adicionar página a → Tela inicial</b> (ou o ícone de instalar na barra).</li><li><b>Firefox no Android:</b> menu ⋮ → <b>Instalar</b>.</li><li><b>Chrome no iPhone:</b> botão Compartilhar → <b>Adicionar à Tela de Início</b> (iOS 16.4 ou mais novo).</li><li><b>Edge no celular:</b> menu ⋯ → <b>Adicionar ao telefone</b>.</li></ul>'],
 ['🛠️ Não apareceu a opção?','<ul><li>Confira se o endereço começa com <b>https://</b>.</li><li>Se abriu por um link dentro do WhatsApp, Instagram ou Facebook, toque em <b>⋮ → Abrir no navegador</b>.</li><li>Se já instalou antes, o botão some: abra o jogo pelo ícone na tela inicial.</li><li>Atualize a página algumas vezes, navegue um pouco pelo jogo e tente de novo.</li><li>Ainda nada? Limpe os dados do site nas configurações do navegador e recarregue.</li></ul>']];
const slI=mkSlides($('sl-ti'),INST);
function verInst(){const ua=navigator.userAgent,ios=/iphone|ipad|ipod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);aba('ti');slI.go(ios?2:/android/i.test(ua)?1:3)}
function verTema(i,hl){aba('resumo');slR.go(i,hl)}
// Grifa no slide o trecho que contém a resposta (pode atravessar negritos)
function grifa(el,txt){const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),ns=[];let full='',n;while(n=w.nextNode()){ns.push([n,full.length]);full+=n.data}
 const a=full.indexOf(txt);if(a<0)return;const b=a+txt.length;let first=null;
 ns.forEach(([nd,o])=>{const e=o+nd.data.length;if(e<=a||o>=b)return;const s=Math.max(a,o)-o,f=Math.min(b,e)-o;const r=document.createRange();r.setStart(nd,s);r.setEnd(nd,f);const m=document.createElement('mark');m.className='grifo';r.surroundContents(m);first=first||m})}
document.addEventListener('keydown',e=>{const s=aba_=='resumo'?slR:aba_=='tut'?slT:aba_=='ti'?slI:null;if(!s)return;if(e.key=='ArrowLeft')s.prev();if(e.key=='ArrowRight')s.next()});
/* ---------- save ---------- */
function salva(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function temSave(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
{const s=temSave();if(s&&s.fase==='jogo'&&!s.fim)$('btn-cont').style.display='inline-block'}
function continuar(){S=temSave();mostra('jogo');montaTabuleiro()}
function reiniciar(){try{localStorage.removeItem(KEY)}catch(e){}S=null;$('pov').style.display='none';$('qov').style.display='none';clearInterval(timer);busy=false;$('btn-cont').style.display='none';mostra('setup')}
function modo(){document.body.classList.toggle('em-jogo',aba_=='jogo'&&$('jogo').style.display=='block')}
function mostra(x){['setup','sel','jogo'].forEach(i=>$(i).style.display=i==x?(i=='sel'?'grid':'block'):'none');modo()}
/* ---------- seleção ---------- */
function irSelecao(){const n=Math.max(1,Math.min(10,+$('nt').value||2));S={n,fase:'sel',idx:0,times:[],vez:0,usadas:[],ordem:[],fim:false};ci=0;mostra('sel');renderSel()}
const usado=i=>S.times.some(t=>t.img===AVATARES[i].img);
function mudaP(d){do{ci=(ci+d+AVATARES.length)%AVATARES.length}while(usado(ci)&&S.times.length<AVATARES.length);renderSel()}
function renderSel(){const a=AVATARES[ci];$('s-time').textContent='Time '+(S.idx+1)+' de '+S.n;$('s-nome').value=$('s-nome').dataset.i==S.idx?$('s-nome').value:'';$('s-nome').dataset.i=S.idx;$('s-nome').style.borderColor=COR(S.idx);
 $('s-pers').textContent=a.nome;$('s-res').textContent=a.resumo;const im=$('s-img');im.style.display='';$('s-pf').style.display='none';im.onerror=()=>{im.style.display='none';$('s-pf').style.display='flex'};im.src=a.img;
 $('s-thumbs').innerHTML=AVATARES.map((a,k)=>`<button type="button" class="${k==ci?'on':''} ${usado(k)?'x':''}" onclick="irP(${k})" title="${esc(a.nome)}"><img src="${a.img}" alt=""></button>`).join('');$('s-taken').textContent='';$('s-ok').disabled=false}
function irP(k){if(usado(k))return;ci=k;renderSel()}
function confirmaP(){const nome=$('s-nome').value.trim()||'Time '+(S.idx+1);S.times.push({nome,img:AVATARES[ci].img,pers:AVATARES[ci].nome,pos:0,fim:false,pts:0,seq:0});bip(660);S.idx++;$('s-nome').dataset.i='';
 if(S.idx>=S.n){S.fase='jogo';S.vez=0;salva();mostra('jogo');montaTabuleiro()}else{if(usado(ci))mudaP(1);else renderSel()}}
document.addEventListener('keydown',e=>{if(!S||S.fase!=='sel'||$('t-jogo').className.indexOf('on')<0||e.target.id=='s-nome')return;if(e.key=='ArrowLeft')mudaP(-1);if(e.key=='ArrowRight')mudaP(1);if(e.key=='Enter')confirmaP()});
$('dado').addEventListener('keydown',e=>{if(e.key=='Enter')jogarDado(+$('dado').value)});
/* ---------- tabuleiro ---------- */
function montaTabuleiro(){$('pins').innerHTML=S.times.map((t,i)=>`<div class="pin" id="p${i}"><img src="${t.img}" alt="" onerror="this.outerHTML='<div style=font-size:4vw>🛡️</div>'"><i style="background:${COR(i)};color:#111">${esc(t.nome)}</i></div>`).join('');posiciona();hud();placar();if(S.times.every(t=>t.fim))fimDeJogo()}
function posiciona(){const g={};S.times.forEach((t,i)=>(g[t.pos]=g[t.pos]||[]).push(i));for(const p in g){const c=CAS[p];g[p].forEach((i,k)=>{const e=$('p'+i);e.style.left=(c.x+(k-(g[p].length-1)/2)*3)+'%';e.style.top=c.y+'%'})}}
function hud(){S.times.forEach((_,i)=>$('p'+i).classList.toggle('vez',i==S.vez&&!S.fim));const t=S.times[S.vez];$('hud').style.background=COR(S.vez);$('hud').style.color='#111';$('hud').innerHTML=S.fim?'Fim de jogo!':`<img src="${t.img}" alt="" onerror="this.remove()">Vez de: <b style="color:#111">${esc(t.nome)}</b> (casa ${t.pos}/${FINAL})`}
function placar(){$('score').innerHTML=[...S.times.map((t,i)=>({t,i}))].sort((a,b)=>b.t.pts-a.t.pts).map(({t,i})=>`<span class="chip ${t.fim?'fim':''}" style="background:${COR(i)}">${t.fim?'🏁 ':''}${esc(t.nome)}: ${t.pts} pts${t.seq>1?' 🔥'+t.seq:''}</span>`).join('')}
function rolarVirtual(){if(busy||$('b-rolar').disabled)return;const d=$('die'),b=$('b-rolar');b.disabled=true;d.classList.add('gira');let n=0;
 const it=setInterval(()=>{const f=1+Math.random()*6|0;d.className='die gira f'+f;bip(300+Math.random()*300,.04);if(++n>=12){clearInterval(it);const v=1+Math.random()*6|0;d.className='die f'+v;$('dado').value=v;bip(700,.15);toast('🎲 Saiu '+v);setTimeout(()=>{b.disabled=false;jogarDado(v)},600)}},80)}
/* ---------- turno ---------- */
async function jogarDado(v){if(busy||!S||S.fim)return;if(!(v>=1&&v<=6))return alert('Digite um valor de 1 a 6.');busy=true;
 const t=S.times[S.vez],de=t.pos,alvo=Math.min(de+v,FINAL);
 while(t.pos<alvo){t.pos++;posiciona();bip(500+t.pos*10,.08);await wait(330)}
 await wait(400);perguntar(v,de)}
function perguntar(v,de){if(S.usadas.length>=PERGUNTAS.length)S.usadas=[];
 let i;do{i=Math.random()*PERGUNTAS.length|0}while(S.usadas.includes(i));S.usadas.push(i);
 const q=PERGUNTAS[i],ops=[q[2],q[3],q[4],q[5]].map((o,k)=>({o,ok:k==0})).sort(()=>Math.random()-.5);Q={i,q,ops,v,de,tema:q[0],feito:false};
 const t=S.times[S.vez];$('qteam').textContent='❓ '+t.nome+' — casa '+t.pos;$('qtema').textContent=TEMAS[q[0]][0];$('qtxt').textContent=q[1];$('fb').textContent='';$('qact').style.display='none';
 $('qopts').innerHTML=ops.map((o,k)=>`<button class="opt" onclick="responde(${k})"><b>${'ABCD'[k]})</b> ${esc(o.o)}</button>`).join('');$('qov').style.display='flex';
 let tp=TEMPO_PERGUNTA;$('timer').textContent=tp;$('timer').className='';clearInterval(timer);
 timer=setInterval(()=>{if(aba_!=='jogo')return;tp--;$('timer').textContent=Math.max(tp,0);if(tp<=10)$('timer').className='u';if(tp<=0)responde(-1)},1000)}
function responde(k){if(Q.feito)return;Q.feito=true;clearInterval(timer);const t=S.times[S.vez],ok=k>=0&&Q.ops[k].ok;
 document.querySelectorAll('.opt').forEach((b,j)=>{b.disabled=true;if(Q.ops[j].ok)b.classList.add('ok');else if(j==k)b.classList.add('no')});
 if(ok){t.seq++;t.pts+=10+(t.seq>1?5*(t.seq-1):0);$('fb').innerHTML='✅ Resposta correta! Você fica na casa '+t.pos+'.';somOk()}
 else{t.seq=0;$('fb').innerHTML=(k<0?'⏰ Tempo esgotado!':'❌ Errou!')+' Volta para a casa '+Q.de+'.';somNo()}
 Q.ok=ok;$('b-rev').style.display=ok?'none':'inline-block';$('qact').style.display='flex';placar()}
function verResumo(){const t=Q.tema,q=Q.q,hl=q&&q[6];fechaPergunta();verTema(t,hl);
 $('rv-q').innerHTML='❓ '+esc(q[1])+'<small>✔ Resposta: '+esc(q[2])+'</small>';$('rv-bar').style.display='flex';slR.fit();
 let s=10;const pinta=()=>$('rv-volta').textContent='⬅ Voltar ao jogo ('+s+')';pinta();clearInterval(rvT);
 rvT=setInterval(()=>{s--;if(s<=0)voltaJogo();else pinta()},1000)}
function voltaJogo(){clearInterval(rvT);$('rv-bar').style.display='none';aba('jogo')}
async function fechaPergunta(){$('qov').style.display='none';const t=S.times[S.vez];
 if(Q.ok){if(t.pos>=FINAL){t.fim=true;S.ordem.push(S.vez);toast('🏁 '+t.nome+' chegou em '+S.ordem.length+'º lugar!',2500);confete();await wait(1500)}}
 else{await wait(300);while(t.pos>Q.de){t.pos--;posiciona();bip(300,.08,'triangle');await wait(300)}}
 proximo()}
function proximo(){const fimN=Math.min(MAX_PODIO,S.n);if(S.ordem.length>=fimN||S.times.every(t=>t.fim)){return fimDeJogo()}
 do{S.vez=(S.vez+1)%S.n}while(S.times[S.vez].fim);$('dado').value=1;busy=false;salva();hud();placar()}
function fimDeJogo(){S.fim=true;busy=true;try{localStorage.removeItem(KEY)}catch(e){}hud();placar();
 const o=S.ordem.map(i=>S.times[i]);const rest=S.times.filter(t=>!t.fim).sort((a,b)=>b.pos-a.pos||b.pts-a.pts);const lista=[...o,...rest].slice(0,Math.min(MAX_PODIO,S.n));
 $('pod').innerHTML=[1,0,2].filter(i=>lista[i]).map(i=>`<div class="slot"><b>${esc(lista[i].nome)}</b><br><img src="${lista[i].img}" alt="" onerror="this.remove()"><div class="step s${i+1}">${i+1}º</div></div>`).join('');
 $('pov').style.display='flex';confete();somOk()}

/* ---------- gaveta, som, fundo e layout (paisagem/retrato) ---------- */
function gaveta(a){$('drawer').classList.toggle('open',a);$('dback').style.display=a?'block':'none'}
function toggleSom(){mudo=!mudo;$('mute').textContent=mudo?'🔇 Som: desligado':'🔊 Som: ligado'}
let imgLand=null,CAS=CASAS,AR=16/9;
let DISP=null;try{DISP=localStorage.getItem('disp')}catch(e){}
function layout(){const ret=DISP=='mobile'&&innerHeight>innerWidth;CAS=CASAS;
 document.body.classList.toggle('retrato',ret);document.body.classList.toggle('girar',ret);
 $('board').style.setProperty('--ar',AR);
 if(imgLand)$('board').style.backgroundImage="url('"+imgLand+"')";if(S&&S.times&&$('p0'))posiciona()}
function textoDisp(){$('n-disp').textContent=DISP=='mobile'?'📱 Dispositivo: Celular (trocar)':'🖥️ Dispositivo: Computador (trocar)'}
function setDisp(d){DISP=d;try{localStorage.setItem('disp',d)}catch(e){}$('devov').style.display='none';textoDisp();layout();if(d=='desktop')$('fsov').style.display='flex';else modoCelular()}
(function(){const lista=window.TABULEIRO_IMGS||['assets/board-bg.png'];let k=0;
 (function tenta(){if(k>=lista.length){toast('⚠️ Imagem do tabuleiro não encontrada: '+lista[0],6000);return}
  const im=new Image();im.onload=()=>{imgLand=lista[k];if(im.naturalWidth&&im.naturalHeight)AR=im.naturalWidth/im.naturalHeight;layout()};im.onerror=()=>{k++;tenta()};im.src=lista[k]})();})();
addEventListener('resize',layout);addEventListener('orientationchange',()=>setTimeout(layout,200));layout();
textoDisp();if(!DISP)$('devov').style.display='flex';else if(DISP=='desktop')$('fsov').style.display='flex';else if(DISP=='mobile')addEventListener('pointerdown',modoCelular,{once:true});