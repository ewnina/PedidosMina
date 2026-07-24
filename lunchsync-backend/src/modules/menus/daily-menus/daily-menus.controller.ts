import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { DailyMenusService } from './daily-menus.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('daily-menus')
@UseGuards(JwtAuthGuard)
export class DailyMenusController {
  constructor(private readonly menusService: DailyMenusService) {}

  @Get()
  findAll(@Req() req: { user: { providerId: string } }) {
    return this.menusService.findAll(req.user.providerId);
  }

  @Post()
  create(@Req() req: { user: { providerId: string } }, @Body() body: { servingDate: string; orderCutoffTime: string }) {
    return this.menusService.create(req.user.providerId, body);
  }

  @Patch(':id/publish')
  publish(@Param('id') id: string) {
    return this.menusService.publish(id);
  }
}
