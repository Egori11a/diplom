import { Injectable } from "@nestjs/common";
import { DbService } from "../db/db.service";
import { wilsonInterval } from "./wilson";

interface AnalyticsResponse {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversion_rate: number;
  wilson_low: number;
  wilson_high: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DbService) {}

  async getExperimentStats(
    experimentKey: string,
    from?: string,
    to?: string
  ): Promise<AnalyticsResponse> {
    const fromTs = from ?? "1970-01-01T00:00:00.000Z";
    const toTs = to ?? new Date().toISOString();

    const result = await this.db.clickhouse.query({
      query: `
        SELECT
          countIf(type = 'impression') AS impressions,
          countIf(type = 'click') AS clicks,
          countIf(type = 'conversion') AS conversions
        FROM events
        WHERE experiment_key = {experimentKey:String}
          AND ts >= parseDateTime64BestEffort({fromTs:String})
          AND ts <= parseDateTime64BestEffort({toTs:String})
      `,
      query_params: {
        experimentKey,
        fromTs,
        toTs
      },
      format: "JSONEachRow"
    });

    const rows = (await result.json()) as Array<{
      impressions: number;
      clicks: number;
      conversions: number;
    }>;

    const row = rows[0] ?? { impressions: 0, clicks: 0, conversions: 0 };
    const impressions = Number(row.impressions);
    const clicks = Number(row.clicks);
    const conversions = Number(row.conversions);

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const conversionRate = impressions > 0 ? conversions / impressions : 0;
    const { low, high } = wilsonInterval(conversions, impressions);

    return {
      impressions,
      clicks,
      conversions,
      ctr,
      conversion_rate: conversionRate,
      wilson_low: low,
      wilson_high: high
    };
  }
}
