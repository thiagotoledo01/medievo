/* Salas online (Firebase Realtime Database + login anônimo). Só roda no navegador. */
import { FIREBASE_CONFIG } from "./firebase-config";
import { gerarCodigo, novoJogo, normaliza, type GameState } from "./engine";
import { AVATARES } from "./data";

export type Jogador = { nome: string; avatar: number; online: boolean; entrou: number };
export type Sala = {
  host: string;
  status: "lobby" | "jogo";
  criada: number;
  jogadores: Record<string, Jogador>;
  jogo: GameState | null;
};

let ctx: Promise<any> | null = null;
function fb() {
  if (!ctx)
    ctx = (async () => {
      const [{ initializeApp }, auth, db] = await Promise.all([
        import("firebase/app"),
        import("firebase/auth"),
        import("firebase/database"),
      ]);
      const app = initializeApp(FIREBASE_CONFIG);
      const a = auth.getAuth(app);
      if (!a.currentUser) await auth.signInAnonymously(a);
      const d = db.getDatabase(app);
      let offset = 0;
      db.onValue(db.ref(d, ".info/serverTimeOffset"), (s) => (offset = s.val() || 0));
      return { uid: a.currentUser!.uid as string, db: d, m: db, agora: () => Date.now() + offset };
    })();
  ctx.catch(() => (ctx = null));
  return ctx;
}

export const conectar = () => fb();

export async function criarSala(nome: string): Promise<string> {
  const { uid, db, m } = await fb();
  for (let t = 0; t < 8; t++) {
    const codigo = gerarCodigo();
    const r = m.ref(db, "salas/" + codigo);
    const res = await m.runTransaction(r, (cur: any) =>
      cur
        ? undefined
        : {
            host: uid, status: "lobby", criada: Date.now(),
            jogadores: { [uid]: { nome, avatar: -1, online: true, entrou: Date.now() } },
          },
    );
    if (res.committed) return codigo;
  }
  throw new Error("Não foi possível gerar um código. Tente de novo.");
}

export async function entrarSala(codigo: string, nome: string): Promise<void> {
  const { uid, db, m } = await fb();
  const snap = await m.get(m.ref(db, "salas/" + codigo));
  if (!snap.exists()) throw new Error("Sala não encontrada. Confira o código.");
  const sala = snap.val() as Sala;
  const js = sala.jogadores || {};
  if (js[uid]) {
    await m.update(m.ref(db, `salas/${codigo}/jogadores/${uid}`), { nome, online: true });
    return;
  }
  if (sala.status !== "lobby") throw new Error("A partida desta sala já começou.");
  if (Object.keys(js).length >= AVATARES.length) throw new Error("A sala está cheia (máx. 10).");
  await m.set(m.ref(db, `salas/${codigo}/jogadores/${uid}`), { nome, avatar: -1, online: true, entrou: Date.now() });
}

export async function ouvirSala(codigo: string, cb: (s: Sala | null) => void) {
  const { uid, db, m } = await fb();
  const me = m.ref(db, `salas/${codigo}/jogadores/${uid}/online`);
  const conn = m.onValue(m.ref(db, ".info/connected"), (s: any) => {
    if (s.val()) {
      m.onDisconnect(me).set(false);
      m.get(m.ref(db, `salas/${codigo}/jogadores/${uid}`)).then((x: any) => x.exists() && m.set(me, true));
    }
  });
  const off = m.onValue(m.ref(db, "salas/" + codigo), (s: any) => {
    const v = s.val();
    cb(v ? { ...v, jogadores: v.jogadores || {}, jogo: v.jogo ? normaliza(v.jogo) : null } : null);
  });
  return () => {
    off();
    conn();
  };
}

export async function escolherAvatar(codigo: string, k: number) {
  const { uid, db, m } = await fb();
  const res = await m.runTransaction(m.ref(db, `salas/${codigo}/jogadores`), (js: any) => {
    if (!js || !js[uid]) return js;
    if (Object.entries(js).some(([id, j]: any) => id !== uid && j.avatar === k)) return;
    js[uid].avatar = k;
    return js;
  });
  if (!res.committed) throw new Error("Outro jogador já escolheu este personagem.");
}

export async function comecar(codigo: string) {
  const { db, m } = await fb();
  await m.runTransaction(m.ref(db, "salas/" + codigo), (s: any) => {
    if (!s || s.status !== "lobby") return s;
    const js = Object.entries(s.jogadores || {}) as [string, Jogador][];
    js.sort((a, b) => a[1].entrou - b[1].entrou);
    s.jogo = novoJogo(
      js.filter(([, j]) => j.avatar >= 0).map(([uid, j]) => ({
        nome: j.nome, uid, img: AVATARES[j.avatar].img, pers: AVATARES[j.avatar].nome,
      })),
    );
    s.status = "jogo";
    return s;
  });
}

/** Aplica uma ação ao jogo de forma atômica (evita jogadas duplicadas entre aparelhos). */
export async function acao(codigo: string, f: (s: GameState, agora: number) => GameState) {
  const { db, m, agora } = await fb();
  await m.runTransaction(m.ref(db, `salas/${codigo}/jogo`), (s: any) => (s ? f(normaliza(s), agora()) : s));
}

export async function novaPartida(codigo: string) {
  const { db, m } = await fb();
  await m.update(m.ref(db, "salas/" + codigo), { status: "lobby", jogo: null });
}

export async function sairSala(codigo: string) {
  const { uid, db, m } = await fb();
  const r = m.ref(db, "salas/" + codigo);
  await m.runTransaction(r, (s: any) => {
    if (!s) return s;
    if (s.status === "lobby" && s.jogadores) delete s.jogadores[uid];
    else if (s.jogadores?.[uid]) s.jogadores[uid].online = false;
    const resto = Object.keys(s.jogadores || {});
    if (!resto.length) return null;
    if (s.host === uid) s.host = resto[0];
    return s;
  });
}

export async function relogio() {
  return (await fb()).agora as () => number;
}
export async function meuUid() {
  return (await fb()).uid as string;
}
