import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { DailyMenusService } from './daily-menus.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantIsolationGuard } from '../../auth/guards/tenant-isolation.guard';
import type { JwtUser } from '../../auth/guards/tenant-isolation.guard';

@Controller('daily-menus')
@UseGuards(JwtAuthGuard, TenantIsolationGuard)
export class DailyMenusController {
  constructor(private readonly menusService: DailyMenusService) {}

  @Get()
  findAll(@Req() req: { user: JwtUser }) {
    return this.menusService.findAll(req.user.providerId);
  }

  @Post()
  create(@Req() req: { user: JwtUser }, @Body() body: { servingDate: string; orderCutoffTime: string }) {
    return this.menusService.create(req.user.providerId, body);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.menusService.publish(id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.menusService.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.menusService.activate(id);
  }
}
