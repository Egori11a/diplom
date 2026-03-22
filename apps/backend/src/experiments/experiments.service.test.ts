import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ExperimentsService } from "./experiments.service";

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
    const db = {
      pg: {
        query: jest.fn()
      }
    };

    return {
      db,
      service: new ExperimentsService(db as any)
    };
  };

  it("throws when variants sum is not 100", async () => {
    const { service } = makeService();
    await expect(
      service.create({
        ...validDto,
        variants: [
          { key: "A", weightPercent: 30, payload: {} },
          { key: "B", weightPercent: 30, payload: {} }
        ]
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("maps duplicate experiment key to ConflictException", async () => {
    const { service, db } = makeService();
    db.pg.query.mockRejectedValue({ code: "23505" });

    await expect(service.create(validDto)).rejects.toThrow(ConflictException);
  });

  it("creates experiment and inserts variants", async () => {
    const { service, db } = makeService();
    db.pg.query
      .mockResolvedValueOnce({ rows: [{ id: "exp-1" }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await service.create(validDto);

    expect(result).toEqual({ id: "exp-1" });
    expect(db.pg.query).toHaveBeenCalledTimes(3);
  });

  it("returns active experiments with mapped variants", async () => {
    const { service, db } = makeService();
    db.pg.query
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
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          { key: "A", weightPercent: 50 },
          { key: "B", weightPercent: 50 }
        ]
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
    const { service, db } = makeService();
    db.pg.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    await expect(service.update("missing-id", validDto)).rejects.toThrow(NotFoundException);
  });
});
