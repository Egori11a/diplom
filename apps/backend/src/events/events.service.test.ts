import { EventsService } from "./events.service";

describe("EventsService", () => {
  const makeService = () => {
    const db = {
      pg: {
        query: jest.fn().mockResolvedValue({ rows: [] })
      },
      clickhouse: {
        insert: jest.fn(),
        query: jest.fn()
      }
    };

    return {
      db,
      service: new EventsService(db as any)
    };
  };

  it("does nothing for empty event batch", async () => {
    const { service, db } = makeService();

    await service.ingest([]);

    expect(db.clickhouse.insert).not.toHaveBeenCalled();
  });

  it("transforms timestamp and meta before inserting", async () => {
    const { service, db } = makeService();

    await service.ingest([
      {
        event_id: "e-1",
        app_id: "demo-app",
        subject_key: "u-1",
        experiment_key: "checkout-cta",
        variant_key: "A",
        type: "click",
        ts: "2026-03-22T10:30:00.000Z",
        meta: { source: "button" }
      }
    ]);

    expect(db.clickhouse.insert).toHaveBeenCalledTimes(1);
    expect(db.clickhouse.insert).toHaveBeenCalledWith({
      table: "events",
      values: [
        {
          event_id: "e-1",
          app_id: "demo-app",
          subject_key: "u-1",
          experiment_key: "checkout-cta",
          variant_key: "A",
          type: "click",
          ts: "2026-03-22 10:30:00.000",
          meta: "{\"source\":\"button\"}"
        }
      ],
      format: "JSONEachRow"
    });
  });

  it("returns empty analytics when no events exist", async () => {
    const { service, db } = makeService();
    db.clickhouse.query
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([{}])
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([])
      });

    const result = await service.getToggleAnalytics("toggle-key", "demo-app");

    expect(result).toEqual({
      experimentKey: "toggle-key",
      appId: "demo-app",
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        ctr: 0,
        conversion_rate: 0,
        wilson_low: 0,
        wilson_high: 0
      },
      variants: []
    });
  });

  it("calculates totals and variant metrics", async () => {
    const { service, db } = makeService();
    db.clickhouse.query
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { impressions: "10", clicks: "4", conversions: "2" }
        ])
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { variantKey: "A", impressions: "5", clicks: "3", conversions: "1" },
          { variantKey: "B", impressions: "5", clicks: "1", conversions: "1" }
        ])
      });

    const result = await service.getToggleAnalytics("toggle-key");

    expect(result.metrics.impressions).toBe(10);
    expect(result.metrics.clicks).toBe(4);
    expect(result.metrics.conversions).toBe(2);
    expect(result.metrics.ctr).toBeCloseTo(0.4, 5);
    expect(result.metrics.conversion_rate).toBeCloseTo(0.2, 5);
    expect(result.variants).toHaveLength(2);
    expect(result.variants[0]).toMatchObject({
      variantKey: "A",
      impressions: 5,
      clicks: 3,
      conversions: 1
    });
    expect(result.variants[0].ctr).toBeCloseTo(0.6, 5);
    expect(result.variants[0].conversion_rate).toBeCloseTo(0.2, 5);
  });

  it("filters analytics by current configured experiment variants", async () => {
    const { service, db } = makeService();
    db.pg.query
      .mockResolvedValueOnce({ rows: [{ id: "exp-1" }] })
      .mockResolvedValueOnce({
        rows: [{ key: "A" }, { key: "B" }]
      });

    db.clickhouse.query
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { impressions: "14", clicks: "7", conversions: "3" }
        ])
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { variantKey: "A", impressions: "5", clicks: "3", conversions: "1" },
          { variantKey: "B", impressions: "7", clicks: "4", conversions: "2" },
          { variantKey: "C", impressions: "2", clicks: "0", conversions: "0" }
        ])
      });

    const result = await service.getToggleAnalytics("checkout-cta", "demo-app");

    expect(result.metrics.impressions).toBe(12);
    expect(result.metrics.clicks).toBe(7);
    expect(result.metrics.conversions).toBe(3);
    expect(result.variants).toEqual([
      expect.objectContaining({ variantKey: "A", impressions: 5 }),
      expect.objectContaining({ variantKey: "B", impressions: 7 })
    ]);
    expect(result.variants.find((item) => item.variantKey === "C")).toBeUndefined();
  });

  it("filters analytics by current boolean toggle config (only 'on')", async () => {
    const { service, db } = makeService();
    db.pg.query
      .mockResolvedValueOnce({ rows: [{ id: "exp-1" }] })
      .mockResolvedValueOnce({ rows: [] }); // no variants => boolean mode

    db.clickhouse.query
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { impressions: "48", clicks: "0", conversions: "0" }
        ])
      })
      .mockResolvedValueOnce({
        json: jest.fn().mockResolvedValue([
          { variantKey: "A", impressions: "1", clicks: "0", conversions: "0" },
          { variantKey: "B", impressions: "16", clicks: "0", conversions: "0" },
          { variantKey: "C", impressions: "8", clicks: "0", conversions: "0" },
          { variantKey: "on", impressions: "23", clicks: "0", conversions: "0" }
        ])
      });

    const result = await service.getToggleAnalytics(
      "savings-income-simulator",
      "finance-tracker"
    );

    expect(result.metrics.impressions).toBe(23);
    expect(result.variants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantKey: "on",
          impressions: 23,
          clicks: 0,
          conversions: 0
        })
      ])
    );
    expect(result.variants.find((item) => item.variantKey === "A")).toBeUndefined();
    expect(result.variants.find((item) => item.variantKey === "B")).toBeUndefined();
    expect(result.variants.find((item) => item.variantKey === "C")).toBeUndefined();
  });
});
