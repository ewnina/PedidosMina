import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { MenuServicesService } from './menu-services.service';
import { CreateMenuServiceDto } from './dto/create-menu-service.dto';
import { UpdateMenuServiceDto } from './dto/update-menu-service.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('menu-services')
@UseGuards(JwtAuthGuard)
export class MenuServicesController {
  constructor(private readonly service: MenuServicesService) {}

  @Get()
  findByDailyMenu(@Query('dailyMenuId') dailyMenuId: string) {
    return this.service.findByDailyMenu(dailyMenuId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateMenuServiceDto & { dailyMenuId: string }) {
    return this.service.create(body.dailyMenuId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuServiceDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
