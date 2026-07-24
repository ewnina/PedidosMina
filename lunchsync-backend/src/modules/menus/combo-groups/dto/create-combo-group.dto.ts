import { IsString, IsOptional, IsNumber, IsBoolean, MaxLength, Min } from 'class-validator';

export class CreateComboGroupDto {
  @IsString()
  @MaxLength(100)
  groupName!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minSelect?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSelect?: number;
}
