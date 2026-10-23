// ===== MODO ONLINE (Firebase Realtime Database) =====
// Cada jogador = um time. Quem está na vez escreve a jogada; todos os aparelhos
// (celular, PC, tablet, TV) recebem o mesmo estado em tempo real = crossplay.
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, remove, onValue, onDisconnect, runTransaction } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-database.js";

const V = "13.1.0", LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", MAXJ = 10;
let db, uid, pronto = null, off = 0, code = null, room = null, unsub = null;
let disp = {}, alvo = {}, animando = false, qMostrada = -1, rMostrada = -1, oTimer = null, tAuto = null, tHost = null, chaveTabuleiro = "";
const agora = () => Date.now() + off;
const souVez = g => g && g.ordem && g.ordem[g.vez] === uid;
const souHost = () => room && room.host === uid;

/* ---------- conexão ---------- */
async function conecta() {
  if (pronto) return pronto;
  pronto = (async () => {
    let cfg = window.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey) throw new Error("Preencha a configuração pública do Firebase em js/firebase-config.js.");
    if (!cfg || !cfg.apiKey) throw new Error("Configuração do Firebase ausente");
    const app = initializeApp(cfg);
    const auth = getAuth(app);
    db = getDatabase(app);
    await signInAnonymously(auth);
    uid = auth.currentUser.uid;
    onValue(ref(db, ".info/serverTimeOffset"), s => off = s.val() || 0);
    if (cfg.measurementId) import(`https://www.gstatic.com/firebasejs/${V}/firebase-analytics.js`)
      .then(async m => { if (await m.isSupported()) m.getAnalytics(app); }).catch(() => {});
  })();
  pronto.catch(() => { pronto = null; });
  return pronto;
}

/* ---------- tela de entrada ---------- */
function abre(modo, cod) {
  $("onov").style.display = "flex"; vista("form");
  $("on-codebox").style.display = modo === "entrar" ? "block" : "none";
  $("on-go").textContent = modo === "entrar" ? "🔑 Entrar na sala" : "🌐 Criar sala";
  $("on-go").onclick = () => modo === "entrar" ? entrar() : criar();
  $("on-nome").value = localStorage.getItem("on_nome") || "";
  if (cod) $("on-cod").value = cod;
  $("on-err").textContent = "";
  setTimeout(() => (modo === "entrar" && $("on-nome").value ? $("on-cod") : $("on-nome")).focus(), 50);
}
function vista(v) { ["form", "lobby"].forEach(x => $("on-" + x).style.display = x === v ? "block" : "none"); }
function erro(m) { $("on-err").textContent = m; $("on-go").disabled = false; }
function nomeOk() {
  const n = $("on-nome").value.trim().slice(0, 22);
  if (!n) { erro("Digite seu nome."); return null; }
  localStorage.setItem("on_nome", n); return n;
}
async function criar() {
  const nome = nomeOk(); if (!nome) return;
  $("on-go").disabled = true;
  try {
    await conecta();
    let c;
    for (let t = 0; t < 8; t++) {
      c = Array.from({ length: 5 }, () => LETRAS[Math.random() * LETRAS.length | 0]).join("");
      if (!(await get(ref(db, "rooms/" + c))).exists()) break;
    }
    await set(ref(db, "rooms/" + c), { host: uid, criado: agora(), status: "lobby",
      players: { [uid]: { nome, av: 0, ord: agora(), on: true } } });
    await liga(c);
  } catch (e) { console.error(e); erro(/permission/i.test(e.message) ? "O banco recusou o acesso: publique as regras do Firebase." : "Não foi possível criar a sala. Verifique a conexão."); }
}
async function entrar(cod) {
  const nome = nomeOk(); if (!nome) return;
  const c = (cod || $("on-cod").value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length !== 5) return erro("O código tem 5 letras/números.");
  $("on-go").disabled = true;
  try {
    await conecta();
    const s = await get(ref(db, "rooms/" + c));
    if (!s.exists()) return erro("Sala não encontrada.");
    const r = s.val(), ps = r.players || {};
    if (!ps[uid]) {
      if (r.status !== "lobby") return erro("Essa partida já começou.");
      if (Object.keys(ps).length >= MAXJ) return erro("Sala cheia (máximo 10 jogadores).");
      const usados = Object.values(ps).map(p => p.av);
      const av = AVATARES.findIndex((_, i) => !usados.includes(i));
      await set(ref(db, `rooms/${c}/players/${uid}`), { nome, av: Math.max(av, 0), ord: agora(), on: true });
    } else await update(ref(db, `rooms/${c}/players/${uid}`), { nome, on: true });
    await liga(c);
  } catch (e) { console.error(e); erro(/permission/i.test(e.message) ? "O banco recusou o acesso: publique as regras do Firebase." : "Não foi possível entrar. Verifique a conexão."); }
}
async function liga(c) {
  code = c; window.ONLINE = true;
  localStorage.setItem("on_sala", c);
  history.replaceState(null, "", location.pathname + "?sala=" + c);
  const pr = ref(db, `rooms/${c}/players/${uid}/on`);
  onDisconnect(pr).set(false); set(pr, true);
  $("on-go").disabled = false; vista("lobby");
  $("on-code").textContent = c;
  if (unsub) unsub();
  unsub = onValue(ref(db, "rooms/" + c), s => { room = s.val(); render(); });
}
async function sair() {
  if (!code) return fecha();
  const c = code, r = room;
  if (unsub) unsub(); unsub = null;
  try {
    onDisconnect(ref(db, `rooms/${c}/players/${uid}/on`)).cancel();
    const outros = Object.keys((r && r.players) || {}).filter(u => u !== uid);
    if (r && r.status === "lobby") {
      if (!outros.length) await remove(ref(db, "rooms/" + c));
      else await update(ref(db, "rooms/" + c), { [`players/${uid}`]: null, ...(r.host === uid ? { host: outros[0] } : {}) });
    } else if (r) {
      await update(ref(db, "rooms/" + c), { [`players/${uid}/on`]: false, ...(r.host === uid && outros.length ? { host: outros[0] } : {}) });
    }
  } catch (e) {}
  code = null; room = null; window.ONLINE = false; chaveTabuleiro = ""; qMostrada = rMostrada = -1;
  localStorage.removeItem("on_sala");
  history.replaceState(null, "", location.pathname);
  clearInterval(oTimer); clearTimeout(tAuto); clearTimeout(tHost);
  $("qov").style.display = "none"; $("pov").style.display = "none";
  document.body.classList.remove("online");
  fecha(); S = null; busy = false; mostra("setup");
}
function fecha() { $("onov").style.display = "none"; }

/* ---------- compartilhar ---------- */
const link = () => location.origin + location.pathname + "?sala=" + code;
async function copia(txt, ok) {
  try { await navigator.clipboard.writeText(txt); }
  catch (e) { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
  toast(ok, 2000);
}
function copiaCodigo() { copia(code, "📋 Código " + code + " copiado!"); }
async function compartilha() {
  const d = { title: "Medievo", text: `Entre na minha sala do Medievo! Código: ${code}`, url: link() };
  if (navigator.share) { try { await navigator.share(d); return; } catch (e) { if (e.name === "AbortError") return; } }
  copia(link(), "🔗 Link da sala copiado!");
}

/* ---------- lobby ---------- */
const jogadores = () => Object.entries((room && room.players) || {}).sort((a, b) => a[1].ord - b[1].ord);
function escolheAv(i) {
  if (!room || room.status !== "lobby") return;
  if (jogadores().some(([u, p]) => u !== uid && p.av === i)) return toast("Esse personagem já foi escolhido.");
  update(ref(db, `rooms/${code}/players/${uid}`), { av: i }); bip(660);
}
function renderLobby() {
  $("onov").style.display = "flex"; vista("lobby");
  $("pov").style.display = "none"; $("qov").style.display = "none";
  if (S) { S = null; mostra("setup"); }
  chaveTabuleiro = ""; qMostrada = rMostrada = -1;
  const js = jogadores(), eu = room.players[uid];
  $("on-lista").innerHTML = js.map(([u, p], i) => `<li style="border-color:${COR(i)}"><img src="${AVATARES[p.av].img}" alt=""><span><b>${esc(p.nome)}</b>${u === room.host ? " 👑" : ""}${u === uid ? " (você)" : ""}<small>${esc(AVATARES[p.av].nome)}</small></span>${p.on === false ? "<em>offline</em>" : ""}</li>`).join("");
  $("on-av").innerHTML = AVATARES.map((a, i) => { const dono = js.find(([, p]) => p.av === i); const meu = eu && eu.av === i;
    return `<button type="button" class="${meu ? "on" : ""} ${dono && !meu ? "x" : ""}" onclick="Online.escolheAv(${i})" title="${esc(a.nome)}"><img src="${a.img}" alt=""></button>`; }).join("");
  $("on-start").style.display = souHost() ? "inline-block" : "none";
  $("on-wait").style.display = souHost() ? "none" : "block";
  $("on-count").textContent = js.length + "/" + MAXJ;
}
function comecar() {
  if (!souHost()) return;
  const ordem = jogadores().map(([u]) => u), pos = {}, pts = {}, seq = {}, fim = {};
  ordem.forEach(u => { pos[u] = 0; pts[u] = 0; seq[u] = 0; fim[u] = false; });
  update(ref(db, "rooms/" + code), { status: "jogo", g: { ordem, vez: 0, pos, pts, seq, fim, rank: [], usadas: [], fase: "dado", t: 1 } });
}

/* ---------- jogo ---------- */
function render() {
  if (!room) { toast("A sala foi encerrada."); return sair(); }
  if (!room.players || !room.players[uid]) { toast("Você saiu da sala."); return sair(); }
  document.body.classList.toggle("online", true);
  $("on-tag").textContent = "🌐 Sala " + code;
  if (room.status === "lobby" || !room.g) return renderLobby();
  fecha();
  const g = room.g, chave = g.ordem.join(",");
  if (chave !== chaveTabuleiro) {
    chaveTabuleiro = chave; disp = {};
    S = { n: g.ordem.length, fase: "jogo", vez: g.vez, fim: false, ordem: [], usadas: [],
      times: g.ordem.map(u => { const p = room.players[u] || { nome: "?", av: 0 }; disp[u] = g.pos[u] || 0;
        return { nome: p.nome, img: AVATARES[p.av].img, pers: AVATARES[p.av].nome, pos: disp[u], fim: false, pts: 0, seq: 0 }; }) };
    mostra("jogo"); aba("jogo"); montaTabuleiro();
  }
  g.ordem.forEach((u, i) => { const t = S.times[i]; t.pts = (g.pts || {})[u] || 0; t.seq = (g.seq || {})[u] || 0; t.fim = !!(g.fim || {})[u];
    if (room.players[u]) t.nome = room.players[u].nome; alvo[u] = (g.pos || {})[u] || 0; });
  S.vez = g.vez; S.fim = room.status === "fim";
  busy = !(souVez(g) && g.fase === "dado") || room.status !== "jogo";
  $("b-mover").disabled = $("dado").disabled = $("b-rolar").disabled = busy;
  hud(); placar(); anima(); vigia(g);
}
function anima() {
  if (animando) return;
  const g = room && room.g; if (!g) return;
  const falta = g.ordem.filter(u => disp[u] !== alvo[u]);
  if (!falta.length) return depois();
  animando = true;
  falta.forEach(u => { disp[u] += disp[u] < alvo[u] ? 1 : -1; S.times[g.ordem.indexOf(u)].pos = disp[u]; bip(disp[u] < alvo[u] ? 300 : 500 + disp[u] * 10, .08); });
  posiciona(); hud();
  setTimeout(() => { animando = false; anima(); }, 330);
}
function depois() {
  const g = room && room.g; if (!g) return;
  if (room.status === "fim") return podio(g);
  if ((g.fase === "pergunta" || g.fase === "resultado") && g.q && qMostrada !== g.q.id) mostraPergunta(g);
  if (g.fase === "resultado" && rMostrada !== g.q.id) mostraResultado(g);
  if (g.fase === "dado") $("qov").style.display = "none";
}
function mostraPergunta(g) {
  qMostrada = g.q.id; rMostrada = -1;
  const q = PERGUNTAS[g.q.i], ops = g.q.ops.map(j => ({ o: q[2 + j], ok: j === 0 })), u = g.ordem[g.vez], eu = u === uid;
  Q = { i: g.q.i, q, ops, de: g.de, tema: q[0], feito: false };
  $("qteam").textContent = "❓ " + (room.players[u] || {}).nome + " — casa " + g.pos[u];
  $("qtema").textContent = TEMAS[q[0]][0]; $("qtxt").textContent = q[1]; $("fb").textContent = eu ? "" : "👀 Assistindo: só " + (room.players[u] || {}).nome + " pode responder.";
  $("qact").style.display = "none";
  $("qopts").innerHTML = ops.map((o, k) => `<button class="opt" ${eu ? "" : "disabled"} onclick="responde(${k})"><b>${"ABCD"[k]})</b> ${esc(o.o)}</button>`).join("");
  $("qov").style.display = "flex";
  clearInterval(oTimer);
  const tick = () => { const s = Math.max(0, Math.ceil((g.dl - agora()) / 1000)); $("timer").textContent = s; $("timer").className = s <= 10 ? "u" : "";
    if (s <= 0) { clearInterval(oTimer); if (eu && room.g.fase === "pergunta") responde(-1); } };
  tick(); oTimer = setInterval(tick, 250);
}
function mostraResultado(g) {
  rMostrada = g.q.id; clearInterval(oTimer);
  const r = g.r || { k: -1, ok: false }, u = g.ordem[g.vez], eu = u === uid, nome = (room.players[u] || {}).nome;
  document.querySelectorAll(".opt").forEach((b, j) => { b.disabled = true; if (Q.ops[j].ok) b.classList.add("ok"); else if (j === r.k) b.classList.add("no"); });
  $("fb").innerHTML = r.ok ? `✅ ${eu ? "Resposta correta!" : esc(nome) + " acertou!"} Fica na casa ${g.pos[u]}.` : `${r.k < 0 ? "⏰ Tempo esgotado!" : "❌ " + (eu ? "Errou!" : esc(nome) + " errou!")} Volta para a casa ${g.de}.`;
  r.ok ? somOk() : somNo();
  $("b-rev").style.display = r.ok ? "none" : "inline-block";
  $("qact").style.display = "flex";
  $("qact").querySelector(".btn").style.display = eu ? "" : "none";
  clearTimeout(tAuto); if (eu) tAuto = setTimeout(() => continuar(), 6000);
}
function podio(g) {
  clearInterval(oTimer); $("qov").style.display = "none";
  if ($("pov").style.display === "flex") return;
  S.ordem = (g.rank || []).map(u => g.ordem.indexOf(u));
  fimDeJogo();
  $("pov").querySelector(".btn").textContent = souHost() ? "🔄 Nova partida na sala" : "🚪 Sair da sala";
}
// O anfitrião resolve se o jogador da vez sumiu ou travou
function vigia(g) {
  clearTimeout(tHost);
  if (!souHost() || room.status !== "jogo") return;
  const u = g.ordem[g.vez], t = g.t, offline = room.players[u] && room.players[u].on === false;
  if (g.fase === "dado" && offline) tHost = setTimeout(() => passaVez(t, "dado", true), 8000);
  if (g.fase === "pergunta") tHost = setTimeout(() => resolve(t, -1), Math.max(0, g.dl - agora()) + 4000);
  if (g.fase === "resultado") tHost = setTimeout(() => passaVez(t, "resultado"), 14000);
}
const gRef = () => ref(db, `rooms/${code}/g`);
function rolar(v) {
  const g = room && room.g;
  if (!souVez(g) || g.fase !== "dado") return toast("Aguarde a sua vez.");
  if (!(v >= 1 && v <= 6)) return alert("Digite um valor de 1 a 6.");
  busy = true; $("b-mover").disabled = true;
  const t0 = g.t;
  runTransaction(gRef(), g => {
    if (!g || g.t !== t0 || g.fase !== "dado") return;
    const u = g.ordem[g.vez], de = g.pos[u] || 0, para = Math.min(de + v, CASAS.length - 1);
    let us = g.usadas || []; if (us.length >= PERGUNTAS.length) us = [];
    let i; do { i = Math.random() * PERGUNTAS.length | 0; } while (us.includes(i));
    us.push(i);
    const ops = [0, 1, 2, 3].sort(() => Math.random() - .5);
    Object.assign(g, { de, dado: v, usadas: us, fase: "pergunta", t: t0 + 1, r: null,
      q: { id: t0 + 1, i, ops }, dl: agora() + (para - de) * 330 + 700 + TEMPO_PERGUNTA * 1000 });
    g.pos[u] = para; return g;
  });
}
function responde(k) { const g = room && room.g; if (souVez(g) && g.fase === "pergunta") resolve(g.t, k); }
function resolve(t0, k) {
  runTransaction(gRef(), g => {
    if (!g || g.t !== t0 || g.fase !== "pergunta") return;
    const u = g.ordem[g.vez], ok = k >= 0 && g.q.ops[k] === 0;
    g.seq = g.seq || {}; g.pts = g.pts || {};
    if (ok) { g.seq[u] = (g.seq[u] || 0) + 1; g.pts[u] = (g.pts[u] || 0) + 10 + (g.seq[u] > 1 ? 5 * (g.seq[u] - 1) : 0); } else g.seq[u] = 0;
    Object.assign(g, { fase: "resultado", r: { k, ok }, t: t0 + 1 }); return g;
  });
}
function continuar() { clearTimeout(tAuto); const g = room && room.g; if (g && g.fase === "resultado") passaVez(g.t, "resultado"); }
function passaVez(t0, fase, pular) {
  let acabou = false;
  runTransaction(gRef(), g => {
    if (!g || g.t !== t0 || g.fase !== fase) return;
    const u = g.ordem[g.vez], n = g.ordem.length;
    g.fim = g.fim || {}; g.rank = g.rank || [];
    if (!pular) {
      if (g.r && g.r.ok) { if (g.pos[u] >= CASAS.length - 1 && !g.fim[u]) { g.fim[u] = true; g.rank.push(u); } }
      else g.pos[u] = g.de;
    }
    g.fase = "dado"; g.t = t0 + 1; g.q = null; g.r = null;
    acabou = g.rank.length >= Math.min(MAX_PODIO, n) || g.ordem.every(x => g.fim[x]);
    if (!acabou) { let k = 0; do { g.vez = (g.vez + 1) % n; k++; } while (g.fim[g.ordem[g.vez]] && k <= n); }
    return g;
  }).then(r => {
    if (!r.committed) return;
    if (acabou) update(ref(db, "rooms/" + code), { status: "fim" });
  });
}
function novaPartida() {
  if (souHost()) update(ref(db, "rooms/" + code), { status: "lobby", g: null });
  else sair();
}

/* ---------- integra com game.js ---------- */
const orig = { jogarDado: window.jogarDado, responde: window.responde, fechaPergunta: window.fechaPergunta, reiniciar: window.reiniciar, hud: window.hud };
window.jogarDado = v => window.ONLINE ? rolar(v) : orig.jogarDado(v);
window.responde = k => window.ONLINE ? responde(k) : orig.responde(k);
window.fechaPergunta = () => window.ONLINE ? ($("qov").style.display = "none", continuar()) : orig.fechaPergunta();
window.reiniciar = () => window.ONLINE ? novaPartida() : orig.reiniciar();
window.hud = () => { orig.hud(); const g = window.ONLINE && room && room.g;
  if (g && room.status === "jogo") $("hud").insertAdjacentHTML("beforeend", souVez(g) ? (g.fase === "dado" ? " — 🎲 <b>SUA VEZ!</b>" : "") : " — aguardando…"); };

window.Online = { abre, criar, entrar, sair, fecha, copiaCodigo, compartilha, escolheAv, comecar };

// Link de convite (?sala=CODIGO) ou volta para a sala após recarregar a página
{
  const p = new URLSearchParams(location.search).get("sala"), salva = localStorage.getItem("on_sala"), nome = localStorage.getItem("on_nome");
  if (p) { const c = p.toUpperCase(); if (c === salva && nome) { abre("entrar", c); $("on-nome").value = nome; entrar(c); } else abre("entrar", c); }
}
