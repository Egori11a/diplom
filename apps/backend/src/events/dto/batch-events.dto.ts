import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested
} from "class-validator";

class SdkEventDto {
  @IsString()
  event_id!: string;

  @IsString()
  app_id!: string;

  @IsString()
  anonymous_id!: string;

  @IsString()
  experiment_key!: string;

  @IsString()
  variant_key!: string;

  @IsIn(["impression", "click", "conversion", "custom"])
  type!: "impression" | "click" | "conversion" | "custom";

  @IsISO8601()
  ts!: string;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}

export class BatchEventsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SdkEventDto)
  events!: SdkEventDto[];
}
