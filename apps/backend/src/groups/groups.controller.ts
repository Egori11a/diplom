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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { GroupsService } from "./groups.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { AddGroupMemberDto } from "./dto/add-group-member.dto";
import { UpdateGroupDto } from "./dto/update-group.dto";

@Controller("admin/groups")
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  list() {
    return this.groupsService.list();
  }

  @Post()
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.groupsService.remove(id);
  }

  @Post(":id/members")
  addMember(@Param("id") id: string, @Body() dto: AddGroupMemberDto) {
    return this.groupsService.addMember(id, dto.memberKey);
  }

  @Delete(":id/members/:memberKey")
  removeMember(@Param("id") id: string, @Param("memberKey") memberKey: string) {
    return this.groupsService.removeMember(id, memberKey);
  }
}
