/* Regras do jogo (puras): usadas igualmente no modo local e no online. */
import { CASAS, MAX_PODIO, PERGUNTAS, TEMPO_PERGUNTA } from "./data";

export const FINAL = CASAS.length - 1;

export type Team = {
  nome: string;
  img: string;
  pers: string;
  pos: number;
  fim: boolean;
  pts: number;
  seq: number;
  uid?: string;
};

export type Opcao = { o: string; ok: boolean };
export type Pergunta = { i: number; texto: string; tema: number; ops: Opcao[] };

export type GameState = {
  times: Team[];
  vez: number;
  usadas: number[];
  ordem: number[];
  fim: boolean;
  fase: "dado" | "pergunta" | "resultado";
  de: number;
  dado: number;
  q: Pergunta | null;
  prazo: number;
  resp: number | null;
  ok: boolean | null;
  rodada: number;
};

export function novoJogo(times: Omit<Team, "pos" | "fim" | "pts" | "seq">[]): GameState {
  return {
    times: times.map((t) => ({ ...t, pos: 0, fim: false, pts: 0, seq: 0 })),
    vez: 0,
    usadas: [],
    ordem: [],
    fim: false,
    fase: "dado",
    de: 0,
    dado: 0,
    q: null,
    prazo: 0,
    resp: null,
    ok: null,
    rodada: 0,
  };
}

/** O banco online remove listas vazias e valores nulos: restaura o formato. */
export function normaliza(s: any): GameState {
  const arr = (v: any) => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);
  const times = arr(s?.times).map((t: any) => ({ pts: 0, seq: 0, pos: 0, fim: false, ...t }));
  const q = s?.q ? { ...s.q, ops: arr(s.q.ops) } : null;
  return {
    vez: 0, fim: false, fase: "dado", de: 0, dado: 0, prazo: 0, rodada: 0,
    ...s,
    times,
    usadas: arr(s?.usadas),
    ordem: arr(s?.ordem),
    q,
    resp: s?.resp ?? null,
    ok: s?.ok ?? null,
  };
}

export function rolar(s: GameState, v: number, agora: number, rnd: () => number = Math.random): GameState {
  if (s.fim || s.fase !== "dado" || !(v >= 1 && v <= 6)) return s;
  const times = s.times.map((t) => ({ ...t }));
  const t = times[s.vez];
  const de = t.pos;
  t.pos = Math.min(de + v, FINAL);
  let usadas = s.usadas.length >= PERGUNTAS.length ? [] : [...s.usadas];
  let i: number;
  do i = Math.floor(rnd() * PERGUNTAS.length);
  while (usadas.includes(i));
  usadas.push(i);
  const p = PERGUNTAS[i];
  const ops = [p[2], p[3], p[4], p[5]]
    .map((o, k) => ({ o, ok: k === 0, r: rnd() }))
    .sort((a, b) => a.r - b.r)
    .map(({ o, ok }) => ({ o, ok }));
  return {
    ...s, times, usadas, de, dado: v, fase: "pergunta",
    q: { i, texto: p[1], tema: p[0], ops },
    // tempo da pergunta começa depois que o pino termina de andar
    prazo: agora + (TEMPO_PERGUNTA + 0.33 * v + 0.6) * 1000,
    resp: null, ok: null, rodada: s.rodada + 1,
  };
}

/** k = índice da opção, ou -1 para tempo esgotado. */
export function responder(s: GameState, k: number): GameState {
  if (s.fase !== "pergunta" || !s.q) return s;
  const times = s.times.map((t) => ({ ...t }));
  const t = times[s.vez];
  const ok = k >= 0 && !!s.q.ops[k]?.ok;
  if (ok) {
    t.seq++;
    t.pts += 10 + (t.seq > 1 ? 5 * (t.seq - 1) : 0);
  } else t.seq = 0;
  return { ...s, times, fase: "resultado", resp: k, ok };
}

export function continuar(s: GameState): GameState {
  if (s.fase !== "resultado") return s;
  const times = s.times.map((t) => ({ ...t }));
  const ordem = [...s.ordem];
  const t = times[s.vez];
  if (s.ok) {
    if (t.pos >= FINAL && !t.fim) {
      t.fim = true;
      ordem.push(s.vez);
    }
  } else t.pos = s.de;
  const n = { ...s, times, ordem, fase: "dado" as const, q: null, resp: null, ok: null };
  return proximo(n);
}

function proximo(s: GameState): GameState {
  const fimN = Math.min(MAX_PODIO, s.times.length);
  if (s.ordem.length >= fimN || s.times.every((t) => t.fim)) return { ...s, fim: true };
  let vez = s.vez;
  do vez = (vez + 1) % s.times.length;
  while (s.times[vez].fim);
  return { ...s, vez };
}

/** Pula a vez de um jogador ausente (usado pelo dono da sala online). */
export function pular(s: GameState): GameState {
  if (s.fim) return s;
  if (s.fase === "pergunta") return continuar(responder(s, -1));
  if (s.fase === "resultado") return continuar(s);
  return proximo(s);
}

export function podio(s: GameState): Team[] {
  const o = s.ordem.map((i) => s.times[i]);
  const rest = s.times.filter((t) => !t.fim).sort((a, b) => b.pos - a.pos || b.pts - a.pts);
  return [...o, ...rest].slice(0, Math.min(MAX_PODIO, s.times.length));
}

const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function gerarCodigo(rnd: () => number = Math.random): string {
  let c = "";
  for (let i = 0; i < 6; i++) c += LETRAS[Math.floor(rnd() * LETRAS.length)];
  return c;
}
export const codigoValido = (c: string) => /^[A-Z0-9]{6}$/.test(c);
