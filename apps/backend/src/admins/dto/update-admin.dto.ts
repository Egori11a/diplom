import { IsIn, IsOptional } from "class-validator";
import { ADMIN_ROLES } from "../../auth/admin-role";

export class UpdateAdminDto {
  @IsOptional()
  @IsIn(ADMIN_ROLES)
  role?: (typeof ADMIN_ROLES)[number];
}
