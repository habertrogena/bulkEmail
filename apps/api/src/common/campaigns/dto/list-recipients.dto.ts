import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

const RECIPIENT_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'bounced',
  'complained',
  'failed',
] as const;

export class ListRecipientsDto {
  @IsOptional()
  @IsIn(RECIPIENT_STATUSES)
  status?: (typeof RECIPIENT_STATUSES)[number];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize: number = 50;
}
