import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";
import type { AuthenticatedAdmin } from "../auth/authenticated-admin";
import { CurrentAdmin } from "../auth/current-admin.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AddGroupMemberDto } from "./dto/add-group-member.dto";
import { CreateGroupDto } from "./dto/create-group.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";
import { GroupsService } from "./groups.service";

@Controller("admin/groups")
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Roles("viewer")
  @Get()
  list() {
    return this.groupsService.list();
  }

  @Roles("editor")
  @Post()
  create(@Body() dto: CreateGroupDto, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.groupsService.create(dto, actor);
  }

  @Roles("editor")
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateGroupDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.groupsService.update(id, dto, actor);
  }

  @Roles("admin")
  @Delete(":id")
  remove(@Param("id") id: string, @CurrentAdmin() actor: AuthenticatedAdmin) {
    return this.groupsService.remove(id, actor);
  }

  @Roles("editor")
  @Post(":id/members")
  addMember(
    @Param("id") id: string,
    @Body() dto: AddGroupMemberDto,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.groupsService.addMember(id, dto.memberKey, actor);
  }

  @Roles("editor")
  @Delete(":id/members/:memberKey")
  removeMember(
    @Param("id") id: string,
    @Param("memberKey") memberKey: string,
    @CurrentAdmin() actor: AuthenticatedAdmin
  ) {
    return this.groupsService.removeMember(id, memberKey, actor);
  }
}
