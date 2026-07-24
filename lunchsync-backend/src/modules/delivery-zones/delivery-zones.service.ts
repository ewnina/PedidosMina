import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';

@Injectable()
export class DeliveryZonesService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly zoneRepo: Repository<DeliveryZone>,
  ) {}

  async findAll(providerId: string): Promise<DeliveryZone[]> {
    return this.zoneRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(providerId: string, dto: CreateZoneDto): Promise<DeliveryZone> {
    const zone = this.zoneRepo.create({ ...dto, providerId });
    return this.zoneRepo.save(zone);
  }

  async update(id: string, dto: UpdateZoneDto): Promise<DeliveryZone> {
    const zone = await this.zoneRepo.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone not found');
    Object.assign(zone, dto);
    return this.zoneRepo.save(zone);
  }
}
