import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  companyName: string;

  @IsEmail()
  email: string;

  @MinLength(8)
  password: string;
}
