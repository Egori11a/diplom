import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { BatchEventsDto } from "./dto/batch-events.dto";
import { EventsService } from "./events.service";

@Controller("sdk/events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post("batch")
  @HttpCode(202)
  async batch(@Body() body: BatchEventsDto): Promise<{ accepted: number }> {
    await this.eventsService.ingest(body.events);
    return { accepted: body.events.length };
  }
}
