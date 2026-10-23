import { useCallback, useEffect, useRef, useState } from "react";
import { AVATARES, TEMAS } from "./data";
import { continuar, codigoValido, novoJogo, normaliza, pular, responder, rolar, type GameState } from "./engine";
import { COR, bip, copiar, som, telaCheia } from "./efeitos";
import { Partida, Seletor, Slides } from "./componentes";
import { INST, TUT, VERSAO } from "./textos";
import { firebaseConfigurado } from "./firebase-config";
import type { Sala } from "./online";

type Aba = "jogo" | "resumo" | "tut" | "ti";
type Tela = "inicio" | "qtd" | "sel" | "local" | "criar" | "entrar" | "sala";
const KEY = "idade_media_save_v2", KNOME = "medievo_nome", KSALA = "medievo_sala";
const online = () => import("./online");
const RESUMO: [string, string][] = TEMAS.map((t) => [t[0], "<p>" + t[1] + "</p>"]);

export default function MedievoApp() {
  const [aba, setAba] = useState<Aba>("jogo");
  const [tela, setTela] = useState<Tela>("inicio");
  const [menu, setMenu] = useState(false);
  const [mudo, setMudo] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [slide, setSlide] = useState({ resumo: 0, tut: 0, ti: 0 });
  const [retrato, setRetrato] = useState(false);
  const [instalavel, setInstalavel] = useState(false);
  // local
  const [local, setLocal] = useState<GameState | null>(null);
  const [save, setSave] = useState<GameState | null>(null);
  const [qtd, setQtd] = useState(2);
  const [sel, setSel] = useState<{ n: number; times: { nome: string; img: string; pers: string }[]; nome: string }>({ n: 2, times: [], nome: "" });
  // online
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sala, setSala] = useState<Sala | null>(null);
  const [uid, setUid] = useState("");
  const agoraRef = useRef<() => number>(() => Date.now());
  const toastT = useRef<any>(null);

  const toast = useCallback((m: string, ms = 1800) => {
    setMsg(m);
    clearTimeout(toastT.current);
    toastT.current = setTimeout(() => setMsg(null), ms);
  }, []);

  // início: orientação, save local, nome e link de convite
  useEffect(() => {
    const f = () => setRetrato(innerHeight > innerWidth);
    f();
    addEventListener("resize", f);
    addEventListener("orientationchange", () => setTimeout(f, 200));
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && !s.fim) setSave(normaliza(s));
      setNome(localStorage.getItem(KNOME) || "");
    } catch {}
    const p = new URLSearchParams(location.search).get("sala");
    const ult = (() => { try { return localStorage.getItem(KSALA); } catch { return null; } })();
    if (p) { setCodigo(p.toUpperCase().slice(0, 6)); setTela("entrar"); }
    else if (ult) setCodigo(ult);
    const w = window as any;
    if (w.__dip) setInstalavel(true);
    const bi = (e: any) => { e.preventDefault(); w.__dip = e; setInstalavel(true); };
    addEventListener("beforeinstallprompt", bi);
    addEventListener("appinstalled", () => { w.__dip = null; setInstalavel(false); toast("✅ App instalado!", 2500); });
    if ("serviceWorker" in navigator && import.meta.env.PROD) navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => { removeEventListener("resize", f); removeEventListener("beforeinstallprompt", bi); };
  }, [toast]);

  useEffect(() => { som.mudo = mudo; }, [mudo]);

  // salva o jogo local
  useEffect(() => {
    if (!local) return;
    try { if (local.fim) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(local)); } catch {}
  }, [local]);

  // escuta a sala online
  useEffect(() => {
    if (tela !== "sala" || !codigo) return;
    let off: (() => void) | undefined, vivo = true;
    online().then(async (o) => {
      setUid(await o.meuUid());
      agoraRef.current = await o.relogio();
      const u = await o.ouvirSala(codigo, (s) => {
        if (!vivo) return;
        if (!s) { toast("A sala foi encerrada.", 3000); setSala(null); setTela("inicio"); return; }
        setSala(s);
      });
      if (vivo) off = u; else u();
    }).catch(() => { toast("Sem conexão com o servidor.", 3000); setTela("inicio"); });
    return () => { vivo = false; off?.(); };
  }, [tela, codigo, toast]);

  const emJogo = aba === "jogo" && (tela === "local" || (tela === "sala" && sala?.status === "jogo" && !!sala.jogo));
  useEffect(() => { document.body.classList.toggle("em-jogo", emJogo); document.body.classList.toggle("retrato", retrato); }, [emJogo, retrato]);

  function irAba(a: Aba) { setAba(a); setMenu(false); }
  function verTema(t: number) { setSlide((x) => ({ ...x, resumo: t })); irAba("resumo"); }

  /* ----- local ----- */
  function irSelecao() { const n = Math.max(1, Math.min(10, qtd || 2)); setSel({ n, times: [], nome: "" }); setTela("sel"); }
  function confirma(k: number) {
    const a = AVATARES[k];
    const times = [...sel.times, { nome: sel.nome.trim() || "Time " + (sel.times.length + 1), img: a.img, pers: a.nome }];
    bip(660);
    if (times.length >= sel.n) { setLocal(novoJogo(times)); setTela("local"); }
    else setSel({ ...sel, times, nome: "" });
  }
  function encerrarLocal() { try { localStorage.removeItem(KEY); } catch {} setLocal(null); setSave(null); setTela("inicio"); }

  /* ----- online ----- */
  async function criar() {
    const n = nome.trim();
    if (!n) return setErro("Digite seu nome.");
    setErro(""); setCarregando(true);
    try {
      const o = await online();
      const c = await o.criarSala(n);
      guardar(n, c); setCodigo(c); setTela("sala");
    } catch (e: any) { setErro(e?.message || "Não foi possível criar a sala."); }
    setCarregando(false);
  }
  async function entrar() {
    const n = nome.trim(), c = codigo.trim().toUpperCase();
    if (!n) return setErro("Digite seu nome.");
    if (!codigoValido(c)) return setErro("O código tem 6 letras/números.");
    setErro(""); setCarregando(true);
    try {
      const o = await online();
      await o.entrarSala(c, n);
      guardar(n, c); setCodigo(c); setTela("sala");
    } catch (e: any) { setErro(e?.message || "Não foi possível entrar."); }
    setCarregando(false);
  }
  function guardar(n: string, c: string) {
    try { localStorage.setItem(KNOME, n); localStorage.setItem(KSALA, c); } catch {}
    history.replaceState(null, "", "?sala=" + c);
  }
  const link = () => location.origin + "/?sala=" + codigo;
  async function copiarCodigo() { toast((await copiar(codigo)) ? "📋 Código copiado: " + codigo : "Código: " + codigo); }
  async function compartilhar() {
    const url = link(), texto = `Vem jogar Medievo comigo! Código da sala: ${codigo}`;
    if (navigator.share) { try { await navigator.share({ title: "Medievo", text: texto, url }); return; } catch {} }
    toast((await copiar(texto + "\n" + url)) ? "🔗 Link copiado! Cole na conversa." : url, 3000);
  }
  async function sair() {
    setMenu(false);
    if (!confirm("Sair da sala?")) return;
    try { await (await online()).sairSala(codigo); } catch {}
    try { localStorage.removeItem(KSALA); } catch {}
    history.replaceState(null, "", "/");
    setSala(null); setTela("inicio");
  }
  const acaoOnline = (f: (s: GameState, agora: number) => GameState) =>
    online().then((o) => o.acao(codigo, f)).catch(() => toast("Falha de conexão. Tente de novo."));

  /* ----- instalação ----- */
  function instalar() {
    setMenu(false);
    const dip = (window as any).__dip;
    if (dip) { dip.prompt(); dip.userChoice.finally(() => ((window as any).__dip = null)); return; }
    const ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    setSlide((x) => ({ ...x, ti: ios ? 2 : /android/i.test(ua) ? 1 : 3 }));
    setAba("ti");
  }

  /* ----- partida atual ----- */
  let partida: React.ReactNode = null;
  if (tela === "local" && local) {
    partida = (
      <Partida s={local} retrato={retrato} posso conduzo agora={Date.now} toast={toast}
        onRolar={(v) => setLocal((s) => s && rolar(s, v, Date.now()))}
        onResponder={(k) => setLocal((s) => s && responder(s, k))}
        onContinuar={() => setLocal((s) => s && continuar(s))}
        onVerTema={verTema} onNovamente={encerrarLocal} />
    );
  }
  const souHost = !!sala && sala.host === uid;
  if (tela === "sala" && sala?.status === "jogo" && sala.jogo) {
    const g = sala.jogo, atual = g.times[g.vez];
    const atualOnline = !!atual?.uid && !!sala.jogadores[atual.uid]?.online;
    const minha = atual?.uid === uid;
    partida = (
      <Partida s={g} retrato={retrato} posso={minha} conduzo={minha || (souHost && !atualOnline)} agora={agoraRef.current} toast={toast}
        onRolar={(v) => acaoOnline((s, agora) => (s.times[s.vez]?.uid === uid ? rolar(s, v, agora) : s))}
        onResponder={(k) => acaoOnline((s) => responder(s, k))}
        onContinuar={() => acaoOnline((s) => continuar(s))}
        onVerTema={verTema}
        onNovamente={souHost ? () => online().then((o) => o.novaPartida(codigo)) : undefined}
        textoNovamente="Aguardando o dono da sala começar outra partida…" />
    );
  }

  const placar = (() => {
    const g = tela === "local" ? local : tela === "sala" ? sala?.jogo : null;
    if (!g) return null;
    return [...g.times.map((t, i) => ({ t, i }))].sort((a, b) => b.t.pts - a.t.pts);
  })();

  /* ----- telas iniciais ----- */
  function Inicio() {
    return (
      <div className="centro">
        <div className="card">
          <h1><img className="logo" src="/icons/icon-192.png" alt="" />Tabuleiro da Idade Média</h1>
          <div className="grade">
            <button className="btn gold" onClick={() => { setErro(""); setTela("criar"); }}>🌐 Criar sala online</button>
            <button className="btn" onClick={() => { setErro(""); setTela("entrar"); }}>🔑 Entrar numa sala</button>
            <button className="btn gray" onClick={() => setTela("qtd")}>🏠 Jogar neste aparelho</button>
            {save && <button className="btn gray" onClick={() => { setLocal(save); setTela("local"); }}>▶ Continuar partida salva</button>}
          </div>
          <p className="dica">Dica: leia o Resumo antes de jogar!</p>
          <p className="versao">{VERSAO}</p>
        </div>
      </div>
    );
  }

  const semFirebase = !firebaseConfigurado() && (
    <p className="erro">O modo online ainda não foi conectado ao banco. Enquanto isso, use “Jogar neste aparelho”.</p>
  );

  let conteudo: React.ReactNode;
  if (partida) conteudo = partida;
  else if (tela === "qtd")
    conteudo = (
      <div className="centro"><div className="card">
        <h1>🏠 Jogar neste aparelho</h1>
        <p>Quantos times vão jogar? (1 a 10)</p>
        <input className="campo" type="number" min={1} max={10} value={qtd} onChange={(e) => setQtd(+e.target.value)} onKeyDown={(e) => e.key === "Enter" && irSelecao()} />
        <button className="btn" onClick={irSelecao}>Escolher personagens ➜</button>
        <button className="btn gray" onClick={() => setTela("inicio")}>← Voltar</button>
      </div></div>
    );
  else if (tela === "sel")
    conteudo = (
      <Seletor key={sel.times.length} rotulo={`Time ${sel.times.length + 1} de ${sel.n}`}
        usados={sel.times.map((t) => AVATARES.findIndex((a) => a.img === t.img))}
        nome={sel.nome} setNome={(v) => setSel({ ...sel, nome: v })} onEscolher={confirma} botao="✔ Escolher este personagem" />
    );
  else if (tela === "criar" || tela === "entrar")
    conteudo = (
      <div className="centro"><div className="card">
        <h1>{tela === "criar" ? "🌐 Criar sala" : "🔑 Entrar na sala"}</h1>
        <input className="campo" maxLength={18} placeholder="Seu nome" value={nome} autoFocus
          onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (tela === "criar" ? criar() : entrar())} />
        {tela === "entrar" && (
          <input className="campo codigo" maxLength={6} placeholder="CÓDIGO" value={codigo} autoCapitalize="characters"
            onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} onKeyDown={(e) => e.key === "Enter" && entrar()} />
        )}
        <div className="erro">{erro}</div>
        {semFirebase}
        <button className="btn gold" disabled={carregando || !firebaseConfigurado()} onClick={tela === "criar" ? criar : entrar}>
          {carregando ? "Conectando…" : tela === "criar" ? "Criar sala ➜" : "Entrar ➜"}
        </button>
        <button className="btn gray" onClick={() => { history.replaceState(null, "", "/"); setTela("inicio"); }}>← Voltar</button>
      </div></div>
    );
  else if (tela === "sala") {
    if (!sala) conteudo = <div className="centro"><div className="card"><h1>Conectando à sala…</h1></div></div>;
    else {
      const js = Object.entries(sala.jogadores).sort((a, b) => a[1].entrou - b[1].entrou);
      const eu = sala.jogadores[uid];
      const prontos = js.filter(([, j]) => j.avatar >= 0).length;
      conteudo = (
        <div className="lobby">
          <div className="painel">
            <h2>Código da sala</h2>
            <div className="codigo-grande">{codigo}</div>
            <div className="acoes">
              <button className="btn gold sm" onClick={copiarCodigo}>📋 Copiar código</button>
              <button className="btn sm" onClick={compartilhar}>🔗 Compartilhar link</button>
            </div>
            <h2>Jogadores ({js.length}/10)</h2>
            <div className="jogadores">
              {js.map(([id, j], i) => (
                <div key={id} className={`jog ${j.online ? "" : "off"}`} style={{ ["--c" as any]: COR(i) }}>
                  <span className="ponto" />
                  {j.avatar >= 0 && <img src={AVATARES[j.avatar].img} alt="" />}
                  <span>{j.nome}{id === sala.host ? " 👑" : ""}{id === uid ? " (você)" : ""}</span>
                </div>
              ))}
            </div>
            {souHost ? (
              <button className="btn gold" disabled={prontos < 1} onClick={() => online().then((o) => o.comecar(codigo))}>
                ▶ Começar partida ({prontos} pronto{prontos === 1 ? "" : "s"})
              </button>
            ) : (
              <p className="dica">Aguardando o dono da sala 👑 começar…</p>
            )}
          </div>
          {eu ? (
            <Seletor rotulo={eu.avatar >= 0 ? `✔ Você é ${AVATARES[eu.avatar].nome}` : "Escolha seu personagem"}
              usados={js.filter(([id, j]) => id !== uid && j.avatar >= 0).map(([, j]) => j.avatar)}
              inicial={Math.max(0, eu.avatar)}
              onEscolher={(k) => online().then((o) => o.escolherAvatar(codigo, k)).then(() => bip(660)).catch((e) => toast(e.message))}
              botao={eu.avatar >= 0 ? "↺ Trocar para este" : "✔ Escolher este"} />
          ) : (
            <div className="painel"><h2>Você está assistindo</h2></div>
          )}
        </div>
      );
    }
  } else conteudo = <Inicio />;

  const g = tela === "sala" ? sala?.jogo : null;
  const atualAusente = !!g && !g.fim && !!g.times[g.vez]?.uid && !sala?.jogadores[g.times[g.vez].uid!]?.online;

  return (
    <>
      <button id="menu-btn" type="button" onClick={() => setMenu(true)} aria-label="Menu">☰</button>
      {menu && <div id="dback" onClick={() => setMenu(false)} />}
      <aside id="drawer" className={menu ? "open" : ""}>
        <h3><img className="logo" src="/icons/icon-192.png" alt="" />Medievo</h3>
        <button className={aba === "jogo" ? "on" : ""} onClick={() => irAba("jogo")}>🎮 Jogo</button>
        <button className={aba === "resumo" ? "on" : ""} onClick={() => irAba("resumo")}>📖 Resumo</button>
        <button className={aba === "tut" ? "on" : ""} onClick={() => irAba("tut")}>❓ Tutorial</button>
        <button className={aba === "ti" ? "on" : ""} onClick={instalar}>📲 Como instalar</button>
        {tela === "sala" && (
          <>
            <hr />
            <div className="sala-info">Sala <b>{codigo}</b></div>
            <button onClick={() => { setMenu(false); copiarCodigo(); }}>📋 Copiar código</button>
            <button onClick={() => { setMenu(false); compartilhar(); }}>🔗 Compartilhar link</button>
            {souHost && atualAusente && (
              <button onClick={() => { setMenu(false); acaoOnline((s) => pular(s)); }}>⏭️ Pular jogador ausente</button>
            )}
          </>
        )}
        {placar && (
          <>
            <hr />
            <div className="placar">
              {placar.map(({ t, i }) => (
                <span key={i} className={`chip ${t.fim ? "fim" : ""}`} style={{ background: COR(i) }}>
                  {t.fim ? "🏁 " : ""}{t.nome}: {t.pts} pts{t.seq > 1 ? " 🔥" + t.seq : ""}
                </span>
              ))}
            </div>
          </>
        )}
        <hr />
        {instalavel && <button className="instalar" onClick={instalar}>📲 Instalar app</button>}
        <button onClick={() => setMudo(!mudo)}>{mudo ? "🔇 Som: desligado" : "🔊 Som: ligado"}</button>
        <button onClick={() => { setMenu(false); if (telaCheia() === false) toast('Neste aparelho, use "Adicionar à tela inicial" para tela cheia.', 4000); }}>🖥️ Tela cheia</button>
        <hr />
        {tela === "sala" ? (
          <button className="red" onClick={sair}>🚪 Sair da sala</button>
        ) : tela !== "inicio" ? (
          <button className="red" onClick={() => { setMenu(false); if (confirm("Encerrar a partida?")) encerrarLocal(); }}>🗑️ Encerrar partida</button>
        ) : null}
        <p className="versao">{VERSAO}</p>
      </aside>

      <div className={`tab ${aba === "jogo" ? "on" : ""}`} id="t-jogo">{conteudo}</div>
      <div className={`tab ${aba === "resumo" ? "on" : ""}`}><Slides itens={RESUMO} i={slide.resumo} setI={(n) => setSlide((x) => ({ ...x, resumo: n }))} ativo={aba === "resumo"} /></div>
      <div className={`tab ${aba === "tut" ? "on" : ""}`}><Slides itens={TUT} i={slide.tut} setI={(n) => setSlide((x) => ({ ...x, tut: n }))} ativo={aba === "tut"} /></div>
      <div className={`tab ${aba === "ti" ? "on" : ""}`}><Slides itens={INST} i={slide.ti} setI={(n) => setSlide((x) => ({ ...x, ti: n }))} ativo={aba === "ti"} /></div>
      {msg && <div id="toast">{msg}</div>}
    </>
  );
}
