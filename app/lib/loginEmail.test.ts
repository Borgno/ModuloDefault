import { describe, expect, it } from "vitest";
import { completeLoginEmail } from "./loginEmail";

describe("completeLoginEmail", () => {
  it("completa o nome com o domínio", () => {
    expect(completeLoginEmail("fulano", "empresa.com.br")).toBe("fulano@empresa.com.br");
  });

  it("mantém o e-mail que já tem @, de qualquer domínio", () => {
    expect(completeLoginEmail("fulano@gmail.com", "empresa.com.br")).toBe("fulano@gmail.com");
  });

  it("tira os espaços antes de completar", () => {
    expect(completeLoginEmail("  fulano  ", "empresa.com.br")).toBe("fulano@empresa.com.br");
  });

  it("não completa campo vazio, para a API apontar o campo obrigatório", () => {
    expect(completeLoginEmail("   ", "empresa.com.br")).toBe("");
  });

  it("sem domínio configurado, envia o que foi digitado", () => {
    expect(completeLoginEmail("fulano", null)).toBe("fulano");
  });
});
