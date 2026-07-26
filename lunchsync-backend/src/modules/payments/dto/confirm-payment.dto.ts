import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

export class ConfirmPaymentDto {
  @IsNotEmpty()
  @IsString()
  @IsIn(['confirmed', 'rejected'])
  status!: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
