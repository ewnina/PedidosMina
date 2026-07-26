import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsString()
  orderId!: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['cash', 'transfer'])
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  employeeNote?: string;
}
