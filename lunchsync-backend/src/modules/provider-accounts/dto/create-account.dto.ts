import { IsString, IsEmail, MinLength, IsUUID, IsIn } from 'class-validator';

export class CreateAccountDto {
  @IsUUID()
  providerId!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  fullName!: string;

  @IsString()
  @IsIn(['operator', 'admin', 'superuser'])
  role!: string;
}
