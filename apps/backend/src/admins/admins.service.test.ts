import { BadRequestException, ConflictException } from "@nestjs/common";
import { AdminsService } from "./admins.service";

const actor = { userId: "owner-1", email: "owner@local.test", role: "owner" as const };

describe("AdminsService", () => {
  const makeService = () => {
    const pg = {
      query: jest.fn()
    };
    const db = {
      pg,
      withTransaction: jest.fn(async (callback: (queryable: typeof pg) => Promise<unknown>) =>
        callback(pg)
      )
    };
    const auditService = {
      log: jest.fn().mockResolvedValue(undefined)
    };

    return {
      pg,
      db,
      auditService,
      service: new AdminsService(db as any, auditService as any)
    };
  };

  it("maps duplicate admin email to ConflictException", async () => {
    const { service, pg } = makeService();
    pg.query.mockRejectedValue({ code: "23505" });

    await expect(
      service.create(
        { email: "admin@local.test", password: "strongpass", role: "admin" },
        actor
      )
    ).rejects.toThrow(ConflictException);
  });

  it("prevents removing the last active owner role", async () => {
    const { service, pg } = makeService();
    pg.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "owner-2",
            email: "owner2@local.test",
            role: "owner",
            is_active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            last_login_at: null
          }
        ],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "owner-2",
            email: "owner2@local.test",
            role: "owner",
            is_active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            last_login_at: null
          }
        ],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ count: "1" }],
        rowCount: 1
      });

    await expect(
      service.update("owner-2", { role: "admin" }, actor)
    ).rejects.toThrow(BadRequestException);
  });

  it("prevents changing own role", async () => {
    const { service, pg } = makeService();
    pg.query.mockResolvedValueOnce({
      rows: [
        {
          id: "owner-1",
          email: "owner@local.test",
          role: "owner",
          is_active: true,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          last_login_at: null
        }
      ],
      rowCount: 1
    });

    await expect(
      service.update("owner-1", { role: "admin" }, actor)
    ).rejects.toThrow(new BadRequestException("You cannot change your own role"));
  });

  it("prevents deactivating own account", async () => {
    const { service } = makeService();

    await expect(service.deactivate("owner-1", actor)).rejects.toThrow(
      new BadRequestException("You cannot deactivate your own account")
    );
  });

  it("creates admin and writes audit log", async () => {
    const { service, pg, auditService } = makeService();
    pg.query
      .mockResolvedValueOnce({ rows: [{ id: "admin-2" }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "admin-2",
            email: "admin2@local.test",
            role: "editor",
            is_active: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            last_login_at: null
          }
        ],
        rowCount: 1
      });

    const result = await service.create(
      { email: "admin2@local.test", password: "strongpass", role: "editor" },
      actor
    );

    expect(result).toEqual({ id: "admin-2" });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "admin.created" }),
      pg
    );
  });
});
