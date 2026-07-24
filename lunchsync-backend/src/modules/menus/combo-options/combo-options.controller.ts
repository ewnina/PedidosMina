import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ComboOptionsService } from './combo-options.service';
import { CreateComboOptionDto } from './dto/create-combo-option.dto';
import { UpdateComboOptionDto } from './dto/update-combo-option.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('combo-options')
@UseGuards(JwtAuthGuard)
export class ComboOptionsController {
  constructor(private readonly service: ComboOptionsService) {}

  @Get()
  findByComboGroup(@Query('comboGroupId') comboGroupId: string) {
    return this.service.findByComboGroup(comboGroupId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() body: CreateComboOptionDto & { comboGroupId: string }) {
    return this.service.create(body.comboGroupId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateComboOptionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
