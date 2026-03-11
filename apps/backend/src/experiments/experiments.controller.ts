import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpsertExperimentDto } from "./dto/upsert-experiment.dto";
import { ExperimentsService } from "./experiments.service";

@Controller()
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @UseGuards(JwtAuthGuard)
  @Get("admin/experiments")
  list(@Query("appId") appId?: string) {
    return this.experimentsService.list(appId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("admin/feature-toggles")
  featureToggles(@Query("appId") appId?: string) {
    return this.experimentsService.list(appId);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/experiments")
  create(@Body() dto: UpsertExperimentDto) {
    return this.experimentsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post("admin/feature-toggles")
  createFeatureToggle(@Body() dto: UpsertExperimentDto) {
    return this.experimentsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("admin/experiments/:id")
  update(@Param("id") id: string, @Body() dto: UpsertExperimentDto) {
    return this.experimentsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch("admin/feature-toggles/:id")
  updateFeatureToggle(@Param("id") id: string, @Body() dto: UpsertExperimentDto) {
    return this.experimentsService.update(id, dto);
  }

  @Get("sdk/experiments/active")
  active(@Query("appId") appId: string) {
    return this.experimentsService.active(appId);
  }
}
