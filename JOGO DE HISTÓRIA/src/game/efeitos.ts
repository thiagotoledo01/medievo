import { CORES_TIMES } from "./data";

export const COR = (i: number) => CORES_TIMES[i % CORES_TIMES.length];
let ac: AudioContext | null = null;
export const som = { mudo: false };

export function bip(f: number, d = 0.15, tp: OscillatorType = "sine") {
  if (som.mudo) return;
  try {
    ac = ac || new AudioContext();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = tp; o.frequency.value = f; g.gain.value = 0.12;
    o.connect(g); g.connect(ac.destination); o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + d);
    o.stop(ac.currentTime + d);
  } catch {}
}
export const somOk = () => [523, 659, 784].forEach((f, i) => setTimeout(() => bip(f, 0.2), i * 110));
export const somNo = () => [300, 220].forEach((f, i) => setTimeout(() => bip(f, 0.3, "sawtooth"), i * 160));

export function confete() {
  const c = document.createElement("canvas");
  c.className = "confete"; c.width = innerWidth; c.height = innerHeight;
  document.body.appendChild(c);
  const x = c.getContext("2d")!;
  const p = [...Array(140)].map(() => ({
    x: Math.random() * c.width, y: -20 - (Math.random() * c.height) / 2,
    v: 2 + Math.random() * 4, s: 5 + Math.random() * 7, c: COR((Math.random() * 10) | 0), r: Math.random() * 6,
  }));
  let t = 0;
  (function f() {
    x.clearRect(0, 0, c.width, c.height);
    p.forEach((q) => {
      q.y += q.v; q.r += 0.1; x.fillStyle = q.c; x.save(); x.translate(q.x, q.y); x.rotate(q.r);
      x.fillRect(0, 0, q.s, q.s * 0.6); x.restore();
    });
    if (++t < 220) requestAnimationFrame(f); else c.remove();
  })();
}

/** Diminui a letra (variável --fs) até o conteúdo caber sem rolagem. */
export function encaixa(el: HTMLElement | null, min = 0.55) {
  if (!el) return;
  el.style.setProperty("--fs", "1");
  let f = 1;
  while (f > min && el.scrollHeight > el.clientHeight + 1) {
    f = Math.round((f - 0.05) * 100) / 100;
    el.style.setProperty("--fs", String(f));
  }
}

export async function copiar(txt: string) {
  try {
    await navigator.clipboard.writeText(txt);
    return true;
  } catch {
    const t = document.createElement("textarea");
    t.value = txt; document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy"); t.remove();
    return ok;
  }
}

export function telaCheia() {
  try {
    const d = document as any, e = document.documentElement as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) return (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    const req = e.requestFullscreen || e.webkitRequestFullscreen;
    if (req) Promise.resolve(req.call(e)).catch(() => {});
    return !!req;
  } catch {
    return false;
  }
}
