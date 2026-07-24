import { IsString, MaxLength, IsOptional } from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @MaxLength(100)
  zoneName!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
