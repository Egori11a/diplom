import { AuditService } from "./audit.service";

describe("AuditService", () => {
  const makeService = () => {
    const pg = {
      query: jest.fn()
    };
    const db = { pg };

    return {
      pg,
      service: new AuditService(db as any)
    };
  };

  it("writes audit log entry", async () => {
    const { service, pg } = makeService();

    await service.log({
      actor: {
        userId: "owner-1",
        email: "owner@local.test",
        role: "owner"
      },
      action: "group.created",
      entityType: "group",
      entityId: "group-1",
      entityLabel: "Team A",
      afterState: { id: "group-1", name: "Team A" }
    });

    expect(pg.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO audit_logs"),
      expect.arrayContaining([
        "owner-1",
        "owner@local.test",
        "owner",
        "group.created",
        "group",
        "group-1",
        "Team A"
      ])
    );
  });

  it("applies actor, action and entity filters with explicit limit", async () => {
    const { service, pg } = makeService();
    pg.query.mockResolvedValue({
      rows: [
        {
          id: "log-1",
          actor_admin_id: "owner-1",
          actor_email: "owner@local.test",
          actor_role: "owner",
          action: "experiment.updated",
          entity_type: "experiment",
          entity_id: "exp-1",
          entity_label: "checkout-cta",
          before_state: { trafficPercent: 50 },
          after_state: { trafficPercent: 100 },
          meta: { source: "test" },
          created_at: "2026-05-10T10:00:00.000Z"
        }
      ]
    });

    const result = await service.list({
      actorEmail: "owner@local.test",
      action: "experiment.updated",
      entityType: "experiment",
      limit: 25
    });

    expect(pg.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE actor_email = $1 AND action = $2 AND entity_type = $3"),
      ["owner@local.test", "experiment.updated", "experiment", 25]
    );
    expect(result.logs).toEqual([
      {
        id: "log-1",
        actorAdminId: "owner-1",
        actorEmail: "owner@local.test",
        actorRole: "owner",
        action: "experiment.updated",
        entityType: "experiment",
        entityId: "exp-1",
        entityLabel: "checkout-cta",
        beforeState: { trafficPercent: 50 },
        afterState: { trafficPercent: 100 },
        meta: { source: "test" },
        createdAt: "2026-05-10T10:00:00.000Z"
      }
    ]);
  });

  it("uses default limit when it is not provided", async () => {
    const { service, pg } = makeService();
    pg.query.mockResolvedValue({ rows: [] });

    await service.list({});

    expect(pg.query).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT $1"),
      [100]
    );
  });
});
