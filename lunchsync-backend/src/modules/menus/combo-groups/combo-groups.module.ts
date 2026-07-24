import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComboGroup } from './entities/combo-group.entity';
import { ComboGroupsService } from './combo-groups.service';
import { ComboGroupsController } from './combo-groups.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ComboGroup])],
  controllers: [ComboGroupsController],
  providers: [ComboGroupsService],
  exports: [ComboGroupsService],
})
export class ComboGroupsModule {}
