import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const makeService = () => {
    const db = {
      pg: {
        query: jest.fn()
      }
    };
    const jwt = {
      sign: jest.fn()
    };

    return {
      db,
      jwt,
      service: new AuthService(db as any, jwt as any)
    };
  };

  it("returns null when admin is not found", async () => {
    const { service, db } = makeService();
    db.pg.query.mockResolvedValue({ rows: [] });

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBeNull();
  });

  it("returns null when password is invalid", async () => {
    const { service, db } = makeService();
    db.pg.query.mockResolvedValue({
      rows: [{ id: "a1", email: "admin@local.test", password: "wrong" }]
    });

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBeNull();
  });

  it("returns signed token for valid credentials", async () => {
    const { service, db, jwt } = makeService();
    db.pg.query.mockResolvedValue({
      rows: [{ id: "a1", email: "admin@local.test", password: "admin123" }]
    });
    jwt.sign.mockReturnValue("token-123");

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBe("token-123");
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: "a1",
      email: "admin@local.test",
      role: "admin"
    });
  });
});
