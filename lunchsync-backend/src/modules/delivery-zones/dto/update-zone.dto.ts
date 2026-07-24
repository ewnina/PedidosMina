import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateZoneDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
