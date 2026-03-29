import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BatchEventsDto } from "./dto/batch-events.dto";
import { EventsService } from "./events.service";

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("sdk/events/batch")
  @HttpCode(202)
  async batch(@Body() body: BatchEventsDto): Promise<{ accepted: number }> {
    await this.eventsService.ingest(body.events);
    return { accepted: body.events.length };
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/analytics/feature-toggles/:experimentKey")
  analytics(
    @Param("experimentKey") experimentKey: string,
    @Query("appId") appId?: string
  ) {
    return this.eventsService.getToggleAnalytics(experimentKey, appId);
  }
}
