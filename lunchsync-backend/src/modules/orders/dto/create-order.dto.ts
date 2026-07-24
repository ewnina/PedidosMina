import { IsUUID, IsArray, IsDecimal, IsOptional, IsString } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  dailyMenuId!: string;

  @IsUUID()
  deliveryZoneId!: string;

  @IsUUID()
  menuServiceId!: string;

  @IsArray()
  @IsUUID('4', { each: true })
  selectedOptionIds!: string[];

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
