import { hash } from "bcryptjs";
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

  it("returns null when admin is inactive", async () => {
    const { service, db } = makeService();
    db.pg.query.mockResolvedValue({
      rows: [
        {
          id: "a1",
          email: "admin@local.test",
          password: null,
          password_hash: null,
          role: "owner",
          is_active: false
        }
      ]
    });

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBeNull();
  });

  it("returns null when password is invalid", async () => {
    const { service, db } = makeService();
    db.pg.query.mockResolvedValue({
      rows: [
        {
          id: "a1",
          email: "admin@local.test",
          password: null,
          password_hash: await hash("wrong", 4),
          role: "admin",
          is_active: true
        }
      ]
    });

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBeNull();
  });

  it("returns signed token for valid hashed credentials", async () => {
    const { service, db, jwt } = makeService();
    db.pg.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "a1",
            email: "admin@local.test",
            password: null,
            password_hash: await hash("admin123", 4),
            role: "admin",
            is_active: true
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });
    jwt.sign.mockReturnValue("token-123");

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBe("token-123");
    expect(jwt.sign).toHaveBeenCalledWith({
      sub: "a1",
      email: "admin@local.test",
      role: "admin"
    });
  });

  it("migrates plaintext password to hash on successful login", async () => {
    const { service, db, jwt } = makeService();
    db.pg.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "a1",
            email: "admin@local.test",
            password: "admin123",
            password_hash: null,
            role: "owner",
            is_active: true
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    jwt.sign.mockReturnValue("token-123");

    const token = await service.login("admin@local.test", "admin123");

    expect(token).toBe("token-123");
    expect(db.pg.query).toHaveBeenCalledTimes(3);
    expect(db.pg.query.mock.calls[1][0]).toContain("SET password_hash = $1");
    expect(db.pg.query.mock.calls[2][0]).toContain("SET last_login_at = NOW()");
  });
});
