import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested
} from "class-validator";

class VariantDto {
  @IsString()
  key!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  weightPercent!: number;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}

class SegmentRulesDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  includeAnonymousIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  includeGroups?: string[];

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  rolloutPercent?: number;
}

export class UpsertExperimentDto {
  @IsString()
  appId!: string;

  @IsString()
  key!: string;

  @IsString()
  name!: string;

  @IsString()
  featureKey!: string;

  @IsBoolean()
  featureEnabled!: boolean;

  @IsIn(["draft", "active", "paused", "archived"])
  status!: "draft" | "active" | "paused" | "archived";

  @IsInt()
  @Min(0)
  @Max(100)
  trafficPercent!: number;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants!: VariantDto[];

  @ValidateNested()
  @Type(() => SegmentRulesDto)
  @IsOptional()
  segmentRules?: SegmentRulesDto;
}
