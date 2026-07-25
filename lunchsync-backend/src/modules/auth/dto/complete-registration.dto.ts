import { IsString, IsOptional, MinLength } from 'class-validator';

export class CompleteRegistrationDto {
  @IsString()
  tokenJti!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  employeeCode?: string;
}
