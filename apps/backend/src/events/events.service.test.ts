import { EventsService } from "./events.service";

describe("EventsService", () => {
  const makeService = () => {
    const db = {
      clickhouse: {
        insert: jest.fn()
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
        anonymous_id: "u-1",
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
          anonymous_id: "u-1",
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
});
