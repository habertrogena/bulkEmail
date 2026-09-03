import { IsEmail } from 'class-validator';

export class AddSenderDto {
  @IsEmail()
  address: string;
}
