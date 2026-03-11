import { Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service";

interface EventInput {
  event_id: string;
  app_id: string;
  anonymous_id: string;
  experiment_key: string;
  variant_key: string;
  type: "impression" | "click" | "conversion" | "custom";
  ts: string;
  meta?: Record<string, unknown>;
}

@Injectable()
export class EventsService {
  constructor(private readonly db: DbService) {}

  private toClickhouseTimestamp(value: string): string {
    return value.replace("T", " ").replace("Z", "");
  }

  async ingest(events: EventInput[]): Promise<void> {
    if (!events.length) {
      return;
    }

    await this.db.clickhouse.insert({
      table: "events",
      values: events.map((event) => ({
        ...event,
        ts: this.toClickhouseTimestamp(event.ts),
        meta: JSON.stringify(event.meta ?? {})
      })),
      format: "JSONEachRow"
    });
  }
}
