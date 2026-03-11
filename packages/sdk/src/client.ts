import type { ActiveExperiment } from "./types";

export class ExperimentClient {
  private cacheUntil = 0;
  private cached: ActiveExperiment[] = [];

  constructor(
    private readonly apiUrl: string,
    private readonly cacheTtlMs: number
  ) {}

  async getActiveExperiments(appId: string): Promise<ActiveExperiment[]> {
    const now = Date.now();
    if (now < this.cacheUntil) {
      return this.cached;
    }

    const response = await fetch(
      `${this.apiUrl}/sdk/experiments/active?appId=${encodeURIComponent(appId)}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch experiments: ${response.status}`);
    }

    const data = (await response.json()) as { experiments: ActiveExperiment[] };
    this.cached = data.experiments;
    this.cacheUntil = now + this.cacheTtlMs;
    return this.cached;
  }
}
