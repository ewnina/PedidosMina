import { IsString, MaxLength, Matches } from 'class-validator';

export class CreateProviderDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsString()
  @MaxLength(20)
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Phone number must be valid' })
  phoneNumber!: string;
}
