import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyMenu } from './entities/daily-menu.entity';

@Injectable()
export class DailyMenusService {
  constructor(
    @InjectRepository(DailyMenu)
    private readonly menuRepo: Repository<DailyMenu>,
  ) {}

  async findAll(providerId: string): Promise<DailyMenu[]> {
    return this.menuRepo.find({
      where: { providerId },
      order: { servingDate: 'DESC' },
    });
  }

  async create(providerId: string, data: { servingDate: string; orderCutoffTime: string }): Promise<DailyMenu> {
    const cutoff = data.orderCutoffTime.includes('T')
      ? new Date(data.orderCutoffTime)
      : new Date(`${data.servingDate}T${data.orderCutoffTime}:00`);

    const menu = this.menuRepo.create({
      providerId,
      servingDate: data.servingDate,
      orderCutoffTime: cutoff,
    });
    return this.menuRepo.save(menu);
  }

  async publish(id: string): Promise<DailyMenu> {
    const menu = await this.menuRepo.findOne({ where: { id } });
    if (!menu) throw new NotFoundException('Menu not found');
    menu.publishedAt = new Date();
    return this.menuRepo.save(menu);
  }
}
