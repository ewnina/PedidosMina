import { IsUUID } from 'class-validator';

export class GenerateMagicLinkDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  providerId!: string;
}
