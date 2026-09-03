import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

const PLAN_TIERS = ['starter', 'pro', 'enterprise'] as const;

export class UpdateLimitDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyEmailLimit?: number;

  @IsOptional()
  @IsIn(PLAN_TIERS)
  planTier?: (typeof PLAN_TIERS)[number];
}
