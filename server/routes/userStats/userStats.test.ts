import { beforeEach, describe, expect, it } from "vitest";
import { findUserByEmail } from "../../services/users/users.service";
import { ADMIN_EMAIL, loginAs, setupApp, USER_EMAIL } from "../../test/helpers";

let app: Awaited<ReturnType<typeof setupApp>>;
beforeEach(async () => {
  app = await setupApp();
});

describe("GET /api/v1/userStats", () => {
  it("conta usuários por status e role, e lista os últimos logins", async () => {
    await loginAs(app, USER_EMAIL);
    const admin = await loginAs(app, ADMIN_EMAIL);
    findUserByEmail(USER_EMAIL)!.mustChangePassword = true;

    const res = await app.request("/api/v1/userStats", { headers: { Cookie: admin } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      total: number;
      active: number;
      pendingPasswordChange: number;
      byRole: { role: string; count: number }[];
      recentLogins: { email: string }[];
    };
    expect(body).toMatchObject({ total: 2, active: 2, inactive: 0, pendingPasswordChange: 1 });
    expect(body.byRole).toEqual([
      { role: "admin", count: 1 },
      { role: "user", count: 1 },
    ]);
    // O admin entrou por último.
    expect(body.recentLogins.map((u) => u.email)).toEqual([ADMIN_EMAIL, USER_EMAIL]);
  });

  it("usuário comum recebe 403", async () => {
    const user = await loginAs(app, USER_EMAIL);
    expect((await app.request("/api/v1/userStats", { headers: { Cookie: user } })).status).toBe(
      403,
    );
  });
});
