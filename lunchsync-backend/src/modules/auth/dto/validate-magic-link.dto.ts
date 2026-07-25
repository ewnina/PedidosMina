import { IsString } from 'class-validator';

export class ValidateMagicLinkDto {
  @IsString()
  tokenJti!: string;

  @IsString()
  token!: string;
}
