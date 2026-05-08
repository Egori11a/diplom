import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ExperimentsService } from "./experiments.service";

const actor = { userId: "admin-1", email: "admin@local.test", role: "owner" as const };

const validDto = {
  appId: "demo-app",
  key: "checkout-cta",
  name: "Checkout CTA",
  featureKey: "checkout-cta",
  featureEnabled: true,
  status: "active" as const,
  trafficPercent: 100,
  variants: [
    { key: "A", weightPercent: 50, payload: {} },
    { key: "B", weightPercent: 50, payload: {} }
  ],
  segmentRules: { rolloutPercent: 100 }
};

describe("ExperimentsService", () => {
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
      service: new ExperimentsService(db as any, auditService as any)
    };
  };

  it("throws when variants sum is not 100", async () => {
    const { service } = makeService();
    await expect(
      service.create(
        {
          ...validDto,
          variants: [
            { key: "A", weightPercent: 30, payload: {} },
            { key: "B", weightPercent: 30, payload: {} }
          ]
        },
        actor
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("maps duplicate experiment key to ConflictException", async () => {
    const { service, pg } = makeService();
    pg.query.mockRejectedValue({ code: "23505" });

    await expect(service.create(validDto, actor)).rejects.toThrow(ConflictException);
  });

  it("creates experiment and inserts variants", async () => {
    const { service, pg, auditService } = makeService();
    pg.query
      .mockResolvedValueOnce({ rows: [{ id: "exp-1" }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exp-1",
            app_id: "demo-app",
            key: "checkout-cta",
            name: "Checkout CTA",
            feature_key: "checkout-cta",
            feature_enabled: true,
            segment_rules: { rolloutPercent: 100 },
            status: "active",
            traffic_percent: 100,
            start_at: null,
            end_at: null
          }
        ],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [
          { id: "v1", key: "A", weightPercent: 50, payload: {} },
          { id: "v2", key: "B", weightPercent: 50, payload: {} }
        ],
        rowCount: 2
      });

    const result = await service.create(validDto, actor);

    expect(result).toEqual({ id: "exp-1" });
    expect(pg.query).toHaveBeenCalledTimes(5);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "experiment.created" }),
      pg
    );
  });

  it("creates feature-toggle without variants", async () => {
    const { service, pg } = makeService();
    pg.query
      .mockResolvedValueOnce({ rows: [{ id: "exp-2" }], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exp-2",
            app_id: "demo-app",
            key: "simple-flag",
            name: "Checkout CTA",
            feature_key: "simple-flag",
            feature_enabled: true,
            segment_rules: { rolloutPercent: 100 },
            status: "active",
            traffic_percent: 100,
            start_at: null,
            end_at: null
          }
        ],
        rowCount: 1
      })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const result = await service.create(
      {
        ...validDto,
        key: "simple-flag",
        featureKey: "simple-flag",
        variants: []
      },
      actor
    );

    expect(result).toEqual({ id: "exp-2" });
    expect(pg.query).toHaveBeenCalledTimes(3);
  });

  it("returns active experiments with mapped variants", async () => {
    const { service, pg } = makeService();
    pg.query
      .mockResolvedValueOnce({
        rows: [
          {
            id: "exp-1",
            key: "checkout-cta",
            featureKey: "checkout-cta",
            featureEnabled: true,
            segmentRules: { rolloutPercent: 100 },
            trafficPercent: 100
          }
        ],
        rowCount: 1
      })
      .mockResolvedValueOnce({
        rows: [
          { key: "A", weightPercent: 50 },
          { key: "B", weightPercent: 50 }
        ],
        rowCount: 2
      });

    const result = await service.active("demo-app");

    expect(result).toEqual({
      experiments: [
        {
          key: "checkout-cta",
          featureKey: "checkout-cta",
          featureEnabled: true,
          segmentRules: { rolloutPercent: 100 },
          trafficPercent: 100,
          variants: [
            { key: "A", weightPercent: 50 },
            { key: "B", weightPercent: 50 }
          ]
        }
      ]
    });
  });

  it("throws NotFoundException when updating non-existent experiment", async () => {
    const { service, pg } = makeService();
    pg.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(service.update("missing-id", validDto, actor)).rejects.toThrow(
      NotFoundException
    );
  });
});
