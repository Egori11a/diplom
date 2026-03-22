import { ConflictException, NotFoundException } from "@nestjs/common";
import { GroupsService } from "./groups.service";

describe("GroupsService", () => {
  const makeService = () => {
    const db = {
      pg: {
        query: jest.fn()
      }
    };

    return {
      db,
      service: new GroupsService(db as any)
    };
  };

  it("maps duplicate group name to ConflictException", async () => {
    const { service, db } = makeService();
    db.pg.query.mockRejectedValue({ code: "23505" });

    await expect(service.create({ name: "beta", description: "" })).rejects.toThrow(
      ConflictException
    );
  });

  it("throws NotFoundException when adding member to missing group", async () => {
    const { service, db } = makeService();
    db.pg.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(service.addMember("missing", "u-1")).rejects.toThrow(NotFoundException);
  });

  it("renames linked groups in experiment segment rules", async () => {
    const { service, db } = makeService();
    db.pg.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "g-1", name: "old-team" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exp-1",
            segment_rules: { includeGroups: ["old-team", "beta"] }
          }
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.update("g-1", {
      name: "new-team",
      description: "updated"
    });

    expect(result).toEqual({ id: "g-1" });
    const lastCall = db.pg.query.mock.calls[3];
    expect(lastCall[1][0]).toBe(JSON.stringify(["new-team", "beta"]));
  });
});
