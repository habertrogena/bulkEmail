import { IsBoolean, IsFQDN, IsOptional, IsString } from 'class-validator';

/**
 * For a company whose domain was set up directly in the provider's own
 * dashboard (e.g. Resend) rather than through our `/companies/domain`
 * endpoint — lets an admin record that domain as verified so the company's
 * own dashboard (approved senders, campaigns) treats it exactly like one
 * verified through our own flow.
 */
export class UpdateDomainDto {
  @IsFQDN()
  sendingDomain: string;

  @IsOptional()
  @IsBoolean()
  domainVerified?: boolean = true;

  @IsOptional()
  @IsString()
  providerDomainId?: string;
}
