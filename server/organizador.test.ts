import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

function createMockContext(): { ctx: TrpcContext; setCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {
        cookie: "",
      },
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        setCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, setCookies };
}

describe("auth.simpleLogin", () => {
  it("returns success true with correct credentials", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.simpleLogin({
      username: "USER",
      password: "Wert123.",
    });

    expect(result.success).toBe(true);
    expect(setCookies).toHaveLength(1);
    expect(setCookies[0]?.name).toBe("simple_auth");
    // Cookie now contains JSON with user info
    const cookieValue = setCookies[0]?.value;
    expect(cookieValue).toBeDefined();
    const parsed = JSON.parse(decodeURIComponent(cookieValue!));
    expect(parsed.username).toBe("USER");
    expect(parsed.role).toBe("admin");
  });

  it("returns success false with incorrect credentials", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.simpleLogin({
      username: "wrong",
      password: "wrong",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Credenciais inválidas");
  });

  it("returns success false with correct username but wrong password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.simpleLogin({
      username: "USER",
      password: "wrongpassword",
    });

    expect(result.success).toBe(false);
  });
});

describe("auth.checkSimpleAuth", () => {
  it("returns isAuthenticated true when cookie is present", async () => {
    const { ctx } = createMockContext();
    // Cookie now contains JSON with user info
    const userInfo = { username: "USER", role: "admin", userId: 1 };
    ctx.req.headers.cookie = `simple_auth=${encodeURIComponent(JSON.stringify(userInfo))}`;
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.checkSimpleAuth();

    expect(result.isAuthenticated).toBe(true);
  });

  it("returns isAuthenticated false when cookie is not present", async () => {
    const { ctx } = createMockContext();
    ctx.req.headers.cookie = "";
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.checkSimpleAuth();

    expect(result.isAuthenticated).toBe(false);
  });
});

describe("auth.logout", () => {
  it("clears the session cookies", async () => {
    const { ctx, setCookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(setCookies.length).toBeGreaterThanOrEqual(1);
  });
});
