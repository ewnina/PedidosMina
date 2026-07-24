import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComboOption } from './entities/combo-option.entity';
import { ComboOptionsService } from './combo-options.service';
import { ComboOptionsController } from './combo-options.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ComboOption])],
  controllers: [ComboOptionsController],
  providers: [ComboOptionsService],
  exports: [ComboOptionsService],
})
export class ComboOptionsModule {}
