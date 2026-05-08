import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import { CurrentAdmin } from "../auth/current-admin.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { UpsertExperimentDto } from "./dto/upsert-experiment.dto";
import { ExperimentsService } from "./experiments.service";

@Controller()
export class ExperimentsController {
  constructor(private readonly experimentsService: ExperimentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("viewer")
  @Get("admin/experiments")
  list(@Query("appId") appId?: string) {
    return this.experimentsService.list(appId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("viewer")
  @Get("admin/feature-toggles")
  featureToggles(@Query("appId") appId?: string) {
    return this.experimentsService.list(appId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("editor")
  @Post("admin/experiments")
  create(@Body() dto: UpsertExperimentDto, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.experimentsService.create(dto, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("editor")
  @Post("admin/feature-toggles")
  createFeatureToggle(
    @Body() dto: UpsertExperimentDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.experimentsService.create(dto, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("editor")
  @Patch("admin/experiments/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpsertExperimentDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.experimentsService.update(id, dto, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("editor")
  @Patch("admin/feature-toggles/:id")
  updateFeatureToggle(
    @Param("id") id: string,
    @Body() dto: UpsertExperimentDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.experimentsService.update(id, dto, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/experiments/:id")
  remove(@Param("id") id: string, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.experimentsService.remove(id, actor);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @Delete("admin/feature-toggles/:id")
  removeFeatureToggle(@Param("id") id: string, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.experimentsService.remove(id, actor);
  }

  @Get("sdk/experiments/active")
  active(@Query("appId") appId: string) {
    return this.experimentsService.active(appId);
  }
}
