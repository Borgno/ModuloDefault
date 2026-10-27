import { describe, expect, it } from "vitest";
import { inPeriod, normalizeTerm, parseSearch } from "./search";

const KEYS = ["nome", "cargo"];

describe("parseSearch", () => {
  it("separa texto livre e campo:valor, com valor entre aspas", () => {
    expect(parseSearch('Ana cargo:Admin nome:"José Souza"', KEYS)).toEqual({
      text: "ana",
      filters: [
        { key: "cargo", value: "admin" },
        { key: "nome", value: "jose souza" },
      ],
      period: { from: null, to: null },
    });
  });

  it("chave desconhecida volta inteira para o texto", () => {
    expect(parseSearch("reunião 14:30 http://x.com", KEYS).text).toBe("reuniao 14:30 http://x.com");
  });

  it("valor curto descarta só o filtro, e texto curto vira null sem levar os filtros", () => {
    expect(parseSearch("cargo:ad ana", KEYS)).toMatchObject({ text: "ana", filters: [] });
    expect(parseSearch("al cargo:adm", KEYS)).toMatchObject({
      text: null,
      filters: [{ key: "cargo", value: "adm" }],
    });
  });

  it("período em -03:00, nos dois formatos, e data inválida é ignorada", () => {
    const { period, text } = parseSearch("de:01/10/2026 ate:2026-10-05 ana", KEYS);
    expect(period.from?.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(period.to?.toISOString()).toBe("2026-10-06T02:59:59.999Z");
    expect(text).toBe("ana");

    expect(parseSearch("de:31/02/2026 ana", KEYS)).toMatchObject({
      text: "ana",
      period: { from: null, to: null },
    });
  });

  it("de e ate são reservados mesmo quando a lista declara a chave", () => {
    expect(parseSearch("de:01/10/2026", ["de"]).filters).toEqual([]);
  });
});

describe("normalizeTerm e inPeriod", () => {
  it("tira acento e caixa", () => {
    expect(normalizeTerm("  Usuário ÇÃO ")).toBe("usuario cao");
  });

  it("bordas inclusivas", () => {
    const { period } = parseSearch("de:01/10/2026 ate:01/10/2026", []);
    expect(inPeriod(new Date("2026-10-01T03:00:00.000Z"), period)).toBe(true);
    expect(inPeriod(new Date("2026-10-02T02:59:59.999Z"), period)).toBe(true);
    expect(inPeriod(new Date("2026-10-02T03:00:00.000Z"), period)).toBe(false);
  });
});
