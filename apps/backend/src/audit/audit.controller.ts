import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { AuditService } from "./audit.service";
import { ListAuditLogsDto } from "./dto/list-audit-logs.dto";

@Controller("admin/audit-logs")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("admin")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: ListAuditLogsDto) {
    return this.auditService.list(query);
  }
}
