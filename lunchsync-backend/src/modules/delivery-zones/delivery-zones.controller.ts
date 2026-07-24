import { Controller, Get, Post, Patch, Param, Body, UseGuards, Req } from '@nestjs/common';
import { DeliveryZonesService } from './delivery-zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('delivery-zones')
@UseGuards(JwtAuthGuard)
export class DeliveryZonesController {
  constructor(private readonly zonesService: DeliveryZonesService) {}

  @Get()
  findAll(@Req() req: { user: { providerId: string } }) {
    return this.zonesService.findAll(req.user.providerId);
  }

  @Post()
  create(@Req() req: { user: { providerId: string } }, @Body() dto: CreateZoneDto) {
    return this.zonesService.create(req.user.providerId, dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.update(id, dto);
  }
}
