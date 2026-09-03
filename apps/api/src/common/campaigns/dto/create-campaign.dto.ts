import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCampaignDto {
  @IsNotEmpty()
  subject: string;

  @IsNotEmpty()
  bodyHtml: string;

  @IsEmail()
  fromAddress: string;

  @IsOptional()
  @IsEmail()
  replyTo?: string;
}
