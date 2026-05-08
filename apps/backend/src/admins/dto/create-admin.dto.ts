import { IsEmail, IsIn, IsString, MinLength } from "class-validator";
import { ADMIN_ROLES } from "../../auth/admin-role";

export class CreateAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsIn(ADMIN_ROLES)
  role!: (typeof ADMIN_ROLES)[number];
}
