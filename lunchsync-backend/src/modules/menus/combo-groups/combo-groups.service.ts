import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComboGroup } from './entities/combo-group.entity';
import { CreateComboGroupDto } from './dto/create-combo-group.dto';
import { UpdateComboGroupDto } from './dto/update-combo-group.dto';

@Injectable()
export class ComboGroupsService {
  private readonly logger = new Logger(ComboGroupsService.name);

  constructor(
    @InjectRepository(ComboGroup)
    private readonly repo: Repository<ComboGroup>,
  ) {}

  async findByMenuService(menuServiceId: string): Promise<ComboGroup[]> {
    return this.repo.find({
      where: { menuServiceId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ComboGroup> {
    const group = await this.repo.findOne({ where: { id } });
    if (!group) {
      throw new NotFoundException('ComboGroup not found');
    }
    return group;
  }

  async create(menuServiceId: string, dto: CreateComboGroupDto): Promise<ComboGroup> {
    const group = this.repo.create({ menuServiceId, ...dto });
    this.logger.log(`Creating ComboGroup for menuService ${menuServiceId}`);
    return this.repo.save(group);
  }

  async update(id: string, dto: UpdateComboGroupDto): Promise<ComboGroup> {
    const group = await this.findOne(id);
    Object.assign(group, dto);
    this.logger.log(`Updating ComboGroup ${id}`);
    return this.repo.save(group);
  }

  async remove(id: string): Promise<void> {
    const group = await this.findOne(id);
    this.logger.log(`Removing ComboGroup ${id}`);
    await this.repo.remove(group);
  }
}
