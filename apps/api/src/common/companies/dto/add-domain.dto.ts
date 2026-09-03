import { IsFQDN } from 'class-validator';

export class AddDomainDto {
  @IsFQDN()
  domain: string;
}
