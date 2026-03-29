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

export interface AnalyticsSummary {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
  wilson_low: number;
  wilson_high: number;
}

export interface VariantAnalyticsSummary extends AnalyticsSummary {
  variantKey: string;
}

export interface ToggleAnalyticsSummary {
  experimentKey: string;
  appId?: string;
  metrics: AnalyticsSummary;
  variants: VariantAnalyticsSummary[];
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

  async getToggleAnalytics(
    experimentKey: string,
    appId?: string
  ): Promise<ToggleAnalyticsSummary> {
    const where = ["experiment_key = {experimentKey:String}"];
    const queryParams: Record<string, string> = { experimentKey };
    if (appId) {
      where.push("app_id = {appId:String}");
      queryParams.appId = appId;
    }

    const totalsResult = await this.db.clickhouse.query({
      query: `
        SELECT
          countIf(type = 'impression') AS impressions,
          countIf(type = 'click') AS clicks,
          countIf(type = 'conversion') AS conversions
        FROM events
        WHERE ${where.join(" AND ")}
      `,
      format: "JSONEachRow",
      query_params: queryParams
    });

    const variantResult = await this.db.clickhouse.query({
      query: `
        SELECT
          variant_key AS variantKey,
          countIf(type = 'impression') AS impressions,
          countIf(type = 'click') AS clicks,
          countIf(type = 'conversion') AS conversions
        FROM events
        WHERE ${where.join(" AND ")}
        GROUP BY variant_key
        ORDER BY variant_key
      `,
      format: "JSONEachRow",
      query_params: queryParams
    });

    const totalRows = (await totalsResult.json()) as Array<{
      impressions?: number | string;
      clicks?: number | string;
      conversions?: number | string;
    }>;
    const variantRows = (await variantResult.json()) as Array<{
      variantKey?: string;
      impressions?: number | string;
      clicks?: number | string;
      conversions?: number | string;
    }>;

    const totals = totalRows[0] ?? {};
    const metrics = this.withDerivedMetrics(
      this.toNumber(totals.impressions),
      this.toNumber(totals.clicks),
      this.toNumber(totals.conversions)
    );

    const variants = variantRows.map((row) => ({
      variantKey: row.variantKey ?? "unknown",
      ...this.withDerivedMetrics(
        this.toNumber(row.impressions),
        this.toNumber(row.clicks),
        this.toNumber(row.conversions)
      )
    }));

    return {
      experimentKey,
      appId,
      metrics,
      variants
    };
  }

  private toNumber(value: number | string | undefined): number {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private withDerivedMetrics(
    impressions: number,
    clicks: number,
    conversions: number
  ): AnalyticsSummary {
    const ctr = impressions > 0 ? clicks / impressions : 0;
    const conversionRate = impressions > 0 ? conversions / impressions : 0;
    const [wilsonLow, wilsonHigh] = this.wilsonInterval(clicks, impressions);
    return {
      impressions,
      clicks,
      conversions,
      ctr,
      conversion_rate: conversionRate,
      wilson_low: wilsonLow,
      wilson_high: wilsonHigh
    };
  }

  private wilsonInterval(successes: number, total: number): [number, number] {
    if (total <= 0) {
      return [0, 0];
    }

    const z = 1.96;
    const p = successes / total;
    const denominator = 1 + (z ** 2) / total;
    const center = p + (z ** 2) / (2 * total);
    const margin =
      z *
      Math.sqrt((p * (1 - p) + (z ** 2) / (4 * total)) / total);

    const low = (center - margin) / denominator;
    const high = (center + margin) / denominator;
    return [Math.max(0, low), Math.min(1, high)];
  }
}
