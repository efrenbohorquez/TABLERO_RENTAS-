import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("etl router", () => {
  describe("getStatus", () => {
    it("should return ETL status", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.etl.getStatus();

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("status");
      expect(result.success).toBe(true);
      expect(result.status).toHaveProperty("isRunning");
      expect(result.status).toHaveProperty("progress");
      expect(result.status).toHaveProperty("message");
    });

    it("should have initial progress of 0", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.etl.getStatus();

      expect(result.status.progress).toBe(0);
      expect(result.status.isRunning).toBe(false);
    });
  });

  describe("startProcessing", () => {
    it("should accept valid file path", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.etl.startProcessing({
        filePath: "/home/ubuntu/upload/BaseRentasCedidas.xlsx",
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("status");
    });

    it("should accept optional nrows parameter", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.etl.startProcessing({
        filePath: "/home/ubuntu/upload/BaseRentasCedidas.xlsx",
        nrows: 1000,
      });

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("status");
    });
  });

  describe("cancelProcessing", () => {
    it("should handle cancellation when no process is running", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.etl.cancelProcessing();

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("status");
      // Verificar que retorna la estructura correcta
      expect(typeof result.success).toBe("boolean");
      expect(typeof result.message).toBe("string");
    });
  });
});
