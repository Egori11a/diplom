import { IsString } from "class-validator";

export class AddGroupMemberDto {
  @IsString()
  memberKey!: string;
}
