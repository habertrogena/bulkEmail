import { IsIn } from 'class-validator';

const EMAIL_PROVIDERS = ['ses', 'resend'] as const;

export class UpdateProviderDto {
  @IsIn(EMAIL_PROVIDERS)
  emailProvider: (typeof EMAIL_PROVIDERS)[number];
}
