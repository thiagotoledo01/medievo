import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AVATARES, CASAS, TABULEIRO_MOBILE, TEMAS, TEMPO_PERGUNTA } from "./data";
import { FINAL, podio, type GameState } from "./engine";
import { COR, bip, confete, encaixa, somNo, somOk } from "./efeitos";

/* ---------- slides ---------- */
export function Slides({ itens, i, setI, ativo }: { itens: [string, string][]; i: number; setI: (n: number) => void; ativo: boolean }) {
  const card = useRef<HTMLDivElement>(null);
  const go = (n: number) => setI((n + itens.length) % itens.length);
  useLayoutEffect(() => {
    if (!ativo) return;
    const f = () => encaixa(card.current, 0.5);
    f();
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, [i, ativo, itens]);
  useEffect(() => {
    if (!ativo) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(i - 1);
      if (e.key === "ArrowRight") go(i + 1);
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  });
  return (
    <div className="sl">
      <div className="sl-wrap">
        <button className="arr l" type="button" onClick={() => go(i - 1)} aria-label="Anterior">‹</button>
        <div className="sl-card" ref={card}>
          <h2>{itens[i][0]}</h2>
          <div className="sl-body" dangerouslySetInnerHTML={{ __html: itens[i][1] }} />
        </div>
        <button className="arr r" type="button" onClick={() => go(i + 1)} aria-label="Próximo">›</button>
      </div>
      <div className="dots">
        {itens.map((t, k) => (
          <i key={k} className={k === i ? "on" : ""} title={t[0]} onClick={() => setI(k)} />
        ))}
        <span>{i + 1} / {itens.length}</span>
      </div>
    </div>
  );
}

/* ---------- escolha de personagem ---------- */
export function Seletor({
  rotulo, usados, nome, setNome, onEscolher, botao, extra, inicial = 0,
}: {
  rotulo: ReactNode; usados: number[]; nome?: string; setNome?: (s: string) => void;
  onEscolher: (k: number) => void; botao: string; extra?: ReactNode; inicial?: number;
}) {
  const [ci, setCi] = useState(inicial);
  const livre = (k: number) => !usados.includes(k);
  useEffect(() => {
    if (!livre(ci)) muda(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usados.join(",")]);
  function muda(d: number) {
    let k = ci, n = 0;
    do { k = (k + d + AVATARES.length) % AVATARES.length; n++; } while (!livre(k) && n < AVATARES.length);
    setCi(k);
  }
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowLeft") muda(-1);
      if (e.key === "ArrowRight") muda(1);
    };
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  });
  const a = AVATARES[ci];
  return (
    <div className="sel">
      <div className="stage">
        <div className="car">
          <button className="arr l" type="button" onClick={() => muda(-1)} aria-label="Anterior">‹</button>
          <div><img src={a.img} alt={a.nome} /></div>
          <button className="arr r" type="button" onClick={() => muda(1)} aria-label="Próximo">›</button>
        </div>
      </div>
      <div className="info">
        <div className="lbl">{rotulo}</div>
        {setNome && (
          <input className="campo" maxLength={22} placeholder="Nome do time" value={nome} onChange={(e) => setNome(e.target.value)} />
        )}
        <h2>{a.nome}</h2>
        <div className="resumo">{a.resumo}</div>
        <div className="thumbs">
          {AVATARES.map((x, k) => (
            <button key={k} type="button" title={x.nome} className={`${k === ci ? "on" : ""} ${livre(k) ? "" : "x"}`} onClick={() => livre(k) && setCi(k)}>
              <img src={x.img} alt="" />
            </button>
          ))}
        </div>
        <div className="acoes">
          <button className="btn" disabled={!livre(ci)} onClick={() => onEscolher(ci)}>{botao}</button>
          {extra}
        </div>
      </div>
    </div>
  );
}

/* ---------- partida (tabuleiro, dado, pergunta, pódio) ---------- */
type PartidaProps = {
  s: GameState;
  retrato: boolean;
  posso: boolean;
  conduzo: boolean;
  agora: () => number;
  toast: (m: string, ms?: number) => void;
  onRolar: (v: number) => void;
  onResponder: (k: number) => void;
  onContinuar: () => void;
  onVerTema: (t: number) => void;
  onNovamente?: () => void;
  textoNovamente?: string;
};

export function Partida({ s, retrato, posso, conduzo, agora, toast, onRolar, onResponder, onContinuar, onVerTema, onNovamente, textoNovamente }: PartidaProps) {
  const casas = retrato ? TABULEIRO_MOBILE.casas : CASAS;
  const img = retrato ? TABULEIRO_MOBILE.img : "/assets/board-bg.jpg";
  const ar = retrato ? 941 / 1672 : 1448 / 1086;
  const [vis, setVis] = useState(() => s.times.map((t) => t.pos));
  const [dado, setDado] = useState(1);
  const [restante, setRestante] = useState(TEMPO_PERGUNTA);
  const qbox = useRef<HTMLDivElement>(null);
  const t = s.times[s.vez];

  // anda casa por casa até a posição do estado
  useEffect(() => {
    const iv = setInterval(() => {
      setVis((v) => {
        const alvo = s.times.map((x) => x.pos);
        if (v.length !== alvo.length) return alvo;
        let mudou = false;
        const n = v.map((p, i) => {
          if (p === alvo[i]) return p;
          mudou = true;
          const q = p + (alvo[i] > p ? 1 : -1);
          bip(alvo[i] > p ? 500 + q * 10 : 300, 0.08, alvo[i] > p ? "sine" : "triangle");
          return q;
        });
        return mudou ? n : v;
      });
    }, 330);
    return () => clearInterval(iv);
  }, [s.times]);

  const chegou = vis[s.vez] === t?.pos;
  const mostraQ = !s.fim && s.fase !== "dado" && !!s.q && (chegou || s.fase === "resultado");

  // sons e avisos quando o estado muda (vale para todos os aparelhos)
  const ant = useRef({ rodada: s.rodada, fase: s.fase, ordem: s.ordem.length, fim: s.fim });
  useEffect(() => {
    const a = ant.current;
    if (s.rodada !== a.rodada && s.fase === "pergunta") toast(`🎲 ${t.nome} tirou ${s.dado}`);
    if (s.fase === "resultado" && a.fase !== "resultado") (s.ok ? somOk : somNo)();
    if (s.ordem.length > a.ordem) {
      const q = s.times[s.ordem[s.ordem.length - 1]];
      toast(`🏁 ${q.nome} chegou em ${s.ordem.length}º lugar!`, 2500);
      confete();
    }
    if (s.fim && !a.fim) { confete(); somOk(); }
    ant.current = { rodada: s.rodada, fase: s.fase, ordem: s.ordem.length, fim: s.fim };
  });

  // cronômetro da pergunta
  const esgotou = useRef(-1);
  useEffect(() => {
    if (s.fase !== "pergunta") return;
    const tick = () => {
      const r = Math.max(0, Math.min(TEMPO_PERGUNTA, Math.ceil((s.prazo - agora()) / 1000)));
      setRestante(r);
      if (r <= 0 && conduzo && esgotou.current !== s.rodada) {
        esgotou.current = s.rodada;
        onResponder(-1);
      }
    };
    tick();
    const iv = setInterval(tick, 250);
    return () => clearInterval(iv);
  }, [s.fase, s.prazo, s.rodada, conduzo, agora, onResponder]);

  useLayoutEffect(() => {
    if (!mostraQ) return;
    const f = () => encaixa(qbox.current, 0.5);
    f();
    addEventListener("resize", f);
    return () => removeEventListener("resize", f);
  }, [mostraQ, s.fase, s.rodada]);

  function rolarVirtual() {
    const v = (1 + Math.random() * 6) | 0;
    setDado(v);
    bip(400, 0.08);
    setTimeout(() => onRolar(v), 400);
  }
  function mover() {
    if (!(dado >= 1 && dado <= 6)) return toast("Digite um valor de 1 a 6.");
    onRolar(dado);
  }
  useEffect(() => setDado(1), [s.vez]);

  // pinos na mesma casa ficam lado a lado
  const grupos: Record<number, number[]> = {};
  vis.forEach((p, i) => (grupos[p] = grupos[p] || []).push(i));
  const lugar = (i: number) => {
    const g = grupos[vis[i]] || [i], k = g.indexOf(i), c = casas[vis[i]] || casas[0];
    return { left: c.x + (k - (g.length - 1) / 2) * 3 + "%", top: c.y + "%" };
  };
  const lista = s.fim ? podio(s) : [];
  const resp = s.resp ?? -2;

  return (
    <div id="jogo">
      <div id="board" style={{ ["--ar" as any]: ar, backgroundImage: `url('${img}')` }}>
        <div id="hud" style={{ background: s.fim ? "var(--ouro-claro)" : COR(s.vez) }}>
          {s.fim ? "Fim de jogo!" : (<><img src={t.img} alt="" />Vez de: <b>{t.nome}</b> (casa {t.pos}/{FINAL})</>)}
        </div>
        <div id="pins">
          {s.times.map((x, i) => (
            <div key={i} className={`pin ${i === s.vez && !s.fim ? "vez" : ""}`} style={lugar(i)}>
              <img src={x.img} alt={x.pers} />
              <i style={{ background: COR(i) }}>{x.nome}</i>
            </div>
          ))}
        </div>
      </div>

      {!s.fim && (
        <div id="dock">
          {s.fase === "dado" && posso && chegou ? (
            <>
              <button className="btn gold" onClick={rolarVirtual}>🎲 Rolar dado virtual</button>
              <div className="linha">
                🎲
                <input className="campo" type="number" min={1} max={6} value={dado} aria-label="Número do dado físico"
                  onChange={(e) => setDado(+e.target.value)} onKeyDown={(e) => e.key === "Enter" && mover()} />
                <button className="btn" onClick={mover}>Mover</button>
              </div>
            </>
          ) : (
            <div className="espera">{s.fase === "dado" && !posso ? <>Aguardando <b>{t.nome}</b> jogar…</> : "🎲 …"}</div>
          )}
        </div>
      )}

      {mostraQ && s.q && (
        <div className="ov">
          <div className="mbox" ref={qbox}>
            <div className="mh">
              <span id="qteam">❓ {t.nome} — casa {t.pos}</span>
              <div id="timer" className={s.fase === "pergunta" && restante <= 10 ? "u" : ""}>{s.fase === "pergunta" ? restante : "✓"}</div>
            </div>
            <span className="tema">{TEMAS[s.q.tema][0]}</span>
            <div id="qtxt">{s.q.texto}</div>
            <div>
              {s.q.ops.map((o, k) => (
                <button key={k} className={`opt ${s.fase === "resultado" ? (o.ok ? "ok" : k === resp ? "no" : "") : ""}`}
                  disabled={s.fase !== "pergunta" || !posso} onClick={() => onResponder(k)}>
                  <b>{"ABCD"[k]})</b> {o.o}
                </button>
              ))}
            </div>
            <div id="fb">
              {s.fase === "resultado" &&
                (s.ok ? `✅ Resposta correta! Fica na casa ${t.pos}.` : `${resp < 0 ? "⏰ Tempo esgotado!" : "❌ Errou!"} Volta para a casa ${s.de}.`)}
              {s.fase === "pergunta" && !posso && <span className="espera">⏳ {t.nome} está respondendo…</span>}
            </div>
            {s.fase === "resultado" && (
              <div className="qact">
                {posso || conduzo ? (
                  <button className="btn" onClick={onContinuar}>Continuar ➜</button>
                ) : (
                  <span className="espera">Aguardando {t.nome} continuar…</span>
                )}
                {!s.ok && <button className="btn gray" onClick={() => onVerTema(s.q!.tema)}>📖 Ver no resumo</button>}
              </div>
            )}
          </div>
        </div>
      )}

      {s.fim && (
        <div className="ov">
          <div className="mbox" style={{ textAlign: "center" }}>
            <h1 style={{ color: "var(--ouro-claro)" }}>🏆 Pódio Final 🏆</h1>
            <div className="pod">
              {[1, 0, 2].filter((i) => lista[i]).map((i) => (
                <div className="slot" key={i}>
                  <b>{lista[i].nome}</b><br />
                  <img src={lista[i].img} alt="" />
                  <div className={`step s${i + 1}`}>{i + 1}º</div>
                </div>
              ))}
            </div>
            {onNovamente ? <button className="btn" onClick={onNovamente}>Jogar de novo</button> : <p>{textoNovamente}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
