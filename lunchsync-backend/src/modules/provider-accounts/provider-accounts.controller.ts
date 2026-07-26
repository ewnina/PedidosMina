import { Controller, Get, Post, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ProviderAccountsService } from './provider-accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../auth/guards/tenant-isolation.guard';
import type { JwtUser } from '../auth/guards/tenant-isolation.guard';

@Controller('provider-accounts')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
export class ProviderAccountsController {
  constructor(private readonly accountsService: ProviderAccountsService) {}

  @Get()
  findAll(@Req() req: { user: JwtUser }) {
    if (req.user.role === 'superuser') {
      return this.accountsService.findAll();
    }
    return this.accountsService.findByProvider(req.user.providerId);
  }

  @Get('provider/:providerId')
  findByProvider(@Param('providerId') providerId: string) {
    return this.accountsService.findByProvider(providerId);
  }

  @Post()
  create(@Req() req: { user: JwtUser }, @Body() dto: CreateAccountDto) {
    return this.accountsService.create({ ...dto, providerId: req.user.providerId });
  }
}
