import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';

export class UpdateMenuServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @IsOptional()
  @IsNumber()
  totalStock?: number;

  @IsOptional()
  @IsNumber()
  remainingStock?: number;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
