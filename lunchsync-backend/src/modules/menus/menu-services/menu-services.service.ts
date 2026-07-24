import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuService } from './entities/menu-service.entity';
import { CreateMenuServiceDto } from './dto/create-menu-service.dto';
import { UpdateMenuServiceDto } from './dto/update-menu-service.dto';

@Injectable()
export class MenuServicesService {
  private readonly logger = new Logger(MenuServicesService.name);

  constructor(
    @InjectRepository(MenuService)
    private readonly repo: Repository<MenuService>,
  ) {}

  async findByDailyMenu(dailyMenuId: string): Promise<MenuService[]> {
    return this.repo.find({
      where: { dailyMenuId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<MenuService> {
    const service = await this.repo.findOne({ where: { id } });
    if (!service) {
      throw new NotFoundException('MenuService not found');
    }
    return service;
  }

  async create(dailyMenuId: string, dto: CreateMenuServiceDto): Promise<MenuService> {
    const service = this.repo.create({ dailyMenuId, ...dto });
    this.logger.log(`Creating MenuService for dailyMenu ${dailyMenuId}`);
    return this.repo.save(service);
  }

  async update(id: string, dto: UpdateMenuServiceDto): Promise<MenuService> {
    const service = await this.findOne(id);
    Object.assign(service, dto);
    this.logger.log(`Updating MenuService ${id}`);
    return this.repo.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    this.logger.log(`Removing MenuService ${id}`);
    await this.repo.remove(service);
  }
}
