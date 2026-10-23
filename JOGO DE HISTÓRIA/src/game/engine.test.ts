import { describe, expect, it } from "vitest";
import { FINAL, continuar, gerarCodigo, codigoValido, novoJogo, responder, rolar, podio } from "./engine";

const base = () =>
  novoJogo([
    { nome: "A", img: "a", pers: "a" },
    { nome: "B", img: "b", pers: "b" },
  ]);
const certa = (s: ReturnType<typeof rolar>) => s.q!.ops.findIndex((o) => o.ok);
const errada = (s: ReturnType<typeof rolar>) => s.q!.ops.findIndex((o) => !o.ok);

describe("regras", () => {
  it("acertou: fica na casa onde parou", () => {
    let s = rolar(base(), 4, 0);
    s = continuar(responder(s, certa(s)));
    expect(s.times[0].pos).toBe(4);
    expect(s.vez).toBe(1);
  });
  it("errou: volta para a casa de antes", () => {
    let s = rolar(base(), 5, 0);
    s = continuar(responder(s, errada(s)));
    expect(s.times[0].pos).toBe(0);
  });
  it("tempo esgotado conta como erro", () => {
    let s = rolar(base(), 3, 0);
    s = responder(s, -1);
    expect(s.ok).toBe(false);
  });
  it("pontos: 10 por acerto, +5 por acerto seguido", () => {
    let s = base();
    for (let r = 0; r < 2; r++) {
      s = rolar(s, 1, 0);
      s = continuar(responder(s, certa(s)));
      s = rolar(s, 1, 0);
      s = continuar(responder(s, errada(s)));
    }
    expect(s.times[0].pts).toBe(25);
  });
  it("só aceita dado de 1 a 6", () => {
    expect(rolar(base(), 7, 0).fase).toBe("dado");
    expect(rolar(base(), 0, 0).fase).toBe("dado");
  });
  it("chegar ao fim termina o time e o jogo com 2 times acaba no 2º", () => {
    let s = base();
    s.times[0].pos = FINAL - 1;
    s = rolar(s, 6, 0);
    expect(s.times[0].pos).toBe(FINAL);
    s = continuar(responder(s, certa(s)));
    expect(s.times[0].fim).toBe(true);
    expect(s.fim).toBe(false);
    expect(podio(s)[0].nome).toBe("A");
  });
  it("código de sala tem 6 caracteres", () => {
    expect(codigoValido(gerarCodigo())).toBe(true);
  });
});
