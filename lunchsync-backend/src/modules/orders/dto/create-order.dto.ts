import { IsUUID, IsArray, IsOptional, IsString, IsNumber } from 'class-validator';

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

  @IsNumber()
  totalAmount!: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;
}
