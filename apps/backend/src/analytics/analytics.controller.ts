import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@Controller("admin/analytics")
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("experiment/:key")
  getExperimentStats(
    @Param("key") key: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.analyticsService.getExperimentStats(key, from, to);
  }
}
