import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProviderAccountsService } from './provider-accounts.service';
import { ProviderAccountsController } from './provider-accounts.controller';
import { ProviderAccount } from './entities/provider-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProviderAccount])],
  controllers: [ProviderAccountsController],
  providers: [ProviderAccountsService],
  exports: [ProviderAccountsService],
})
export class ProviderAccountsModule {}
