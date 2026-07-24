import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ComboGroupsService } from './combo-groups.service';
import { CreateComboGroupDto } from './dto/create-combo-group.dto';
import { UpdateComboGroupDto } from './dto/update-combo-group.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('combo-groups')
@UseGuards(JwtAuthGuard)
export class ComboGroupsController {
  constructor(private readonly service: ComboGroupsService) {}

  @Get()
  findByMenuService(@Query('menuServiceId') menuServiceId: string) {
    return this.service.findByMenuService(menuServiceId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateComboGroupDto & { menuServiceId: string }) {
    return this.service.create(body.menuServiceId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComboGroupDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
