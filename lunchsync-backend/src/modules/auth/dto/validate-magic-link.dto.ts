import { IsUUID, IsString } from 'class-validator';

export class ValidateMagicLinkDto {
  @IsUUID()
  tokenJti!: string;

  @IsString()
  token!: string;
}
