import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength } from 'class-validator';

export class UpdateComboOptionDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  optionName?: string;

  @IsOptional()
  @IsNumber()
  extraPrice?: number;

  @IsOptional()
  @IsNumber()
  initialStock?: number;

  @IsOptional()
  @IsNumber()
  stockQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isUnlimited?: boolean;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;
}
