import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProviderDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
