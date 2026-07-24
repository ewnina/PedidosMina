import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ProviderAccountsService } from './provider-accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('provider-accounts')
@UseGuards(JwtAuthGuard)
export class ProviderAccountsController {
  constructor(private readonly accountsService: ProviderAccountsService) {}

  @Get()
  findAll() {
    return this.accountsService.findAll();
  }

  @Get('provider/:providerId')
  findByProvider(@Param('providerId') providerId: string) {
    return this.accountsService.findByProvider(providerId);
  }

  @Post()
  create(@Body() dto: CreateAccountDto) {
    return this.accountsService.create(dto);
  }
}
