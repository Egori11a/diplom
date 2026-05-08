import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import { CurrentAdmin } from "../auth/current-admin.decorator";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AdminsService } from "./admins.service";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("owner")
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  list() {
    return this.adminsService.list();
  }

  @Post()
  create(@Body() dto: CreateAdminDto, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.adminsService.create(dto, actor);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.adminsService.update(id, dto, actor);
  }

  @Post(":id/reset-password")
  resetPassword(
    @Param("id") id: string,
    @Body() dto: ResetAdminPasswordDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.adminsService.resetPassword(id, dto.password, actor);
  }

  @Post(":id/activate")
  activate(@Param("id") id: string, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.adminsService.activate(id, actor);
  }

  @Post(":id/deactivate")
  deactivate(@Param("id") id: string, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.adminsService.deactivate(id, actor);
  }
}
