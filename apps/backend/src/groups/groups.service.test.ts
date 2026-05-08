import { ConflictException, NotFoundException } from "@nestjs/common";
import { GroupsService } from "./groups.service";

const actor = { userId: "admin-1", email: "admin@local.test", role: "owner" as const };

describe("GroupsService", () => {
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
      db,
      pg,
      auditService,
      service: new GroupsService(db as any, auditService as any)
    };
  };

  it("maps duplicate group name to ConflictException", async () => {
    const { service, pg } = makeService();
    pg.query.mockRejectedValue({ code: "23505" });

    await expect(service.create({ name: "beta", description: "" }, actor)).rejects.toThrow(
      ConflictException
    );
  });

  it("throws NotFoundException when adding member to missing group", async () => {
    const { service, pg } = makeService();
    pg.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(service.addMember("missing", "u-1", actor)).rejects.toThrow(
      NotFoundException
    );
  });

  it("renames linked groups in experiment segment rules", async () => {
    const { service, pg, auditService } = makeService();
    pg.query
      .mockResolvedValueOnce({
        rows: [{ id: "g-1", name: "old-team", description: "desc" }],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ memberKey: "user:one" }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [{ id: "g-1", name: "old-team" }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ id: "exp-1", segment_rules: { includeGroups: ["old-team", "beta"] } }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ id: "g-1", name: "new-team", description: "updated" }],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ memberKey: "user:one" }],
        rowCount: 1
      });

    const result = await service.update(
      "g-1",
      {
        name: "new-team",
        description: "updated"
      },
      actor
    );

    expect(result).toEqual({ id: "g-1" });
    expect(pg.query.mock.calls[5][1][0]).toBe(JSON.stringify(["new-team", "beta"]));
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "group.updated" }),
      pg
    );
  });

  it("removes deleted group from experiment segment rules", async () => {
    const { service, pg, auditService } = makeService();
    pg.query
      .mockResolvedValueOnce({
        rows: [{ id: "g-1", name: "team-a", description: "desc" }],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [{ memberKey: "user:one" }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [{ id: "exp-1", segment_rules: { includeGroups: ["team-a", "team-b"] } }],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const result = await service.remove("g-1", actor);

    expect(result).toEqual({ ok: true });
    expect(pg.query.mock.calls[4][1][0]).toBe(JSON.stringify(["team-b"]));
    expect(pg.query.mock.calls[4][1][1]).toBe("exp-1");
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "group.deleted" }),
      pg
    );
  });
});
