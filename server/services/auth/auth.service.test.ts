import { beforeEach, describe, expect, it } from "vitest";
import { resetStore } from "../../lib/memoryStore";
import { createUser } from "../users/users.service";
import { findUserByLogin } from "./auth.service";

async function addUser(email: string) {
  await createUser("admin", { email, fullName: "Fulano", role: "user", password: "inicial-123" });
}

describe("findUserByLogin", () => {
  beforeEach(() => resetStore());

  it("acha pelo nome antes do @, de qualquer domínio", async () => {
    await addUser("fulano@empresa.com.br");
    expect(findUserByLogin("fulano")?.email).toBe("fulano@empresa.com.br");
    expect(findUserByLogin("  FULANO ")?.email).toBe("fulano@empresa.com.br");
  });

  it("acha pelo e-mail completo", async () => {
    await addUser("fulano@empresa.com.br");
    expect(findUserByLogin("Fulano@Empresa.com.br")?.email).toBe("fulano@empresa.com.br");
  });

  it("não aceita só o começo do nome", async () => {
    await addUser("fulano@empresa.com.br");
    expect(findUserByLogin("ful")).toBeUndefined();
  });

  it("recusa o nome que existe em dois domínios", async () => {
    await addUser("fulano@empresa.com.br");
    await addUser("fulano@gmail.com");
    expect(findUserByLogin("fulano")).toBeUndefined();
    expect(findUserByLogin("fulano@gmail.com")?.email).toBe("fulano@gmail.com");
  });
});
