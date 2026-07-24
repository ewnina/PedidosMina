import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComboOption } from './entities/combo-option.entity';
import { CreateComboOptionDto } from './dto/create-combo-option.dto';
import { UpdateComboOptionDto } from './dto/update-combo-option.dto';

@Injectable()
export class ComboOptionsService {
  private readonly logger = new Logger(ComboOptionsService.name);

  constructor(
    @InjectRepository(ComboOption)
    private readonly repo: Repository<ComboOption>,
  ) {}

  async findByComboGroup(comboGroupId: string): Promise<ComboOption[]> {
    return this.repo.find({
      where: { comboGroupId },
      order: { createdAt: 'ASC' },
    });
  }

  async findOne(id: string): Promise<ComboOption> {
    const option = await this.repo.findOne({ where: { id } });
    if (!option) {
      throw new NotFoundException('ComboOption not found');
    }
    return option;
  }

  async create(comboGroupId: string, dto: CreateComboOptionDto): Promise<ComboOption> {
    const data: Record<string, unknown> = { comboGroupId, ...dto };
    if (dto.initialStock !== undefined) {
      data.stockQuantity = dto.initialStock;
    }
    const option = this.repo.create(data);
    this.logger.log(`Creating ComboOption for comboGroup ${comboGroupId}`);
    return this.repo.save(option);
  }

  async update(id: string, dto: UpdateComboOptionDto): Promise<ComboOption> {
    const option = await this.findOne(id);
    Object.assign(option, dto);
    this.logger.log(`Updating ComboOption ${id}`);
    return this.repo.save(option);
  }

  async remove(id: string): Promise<void> {
    const option = await this.findOne(id);
    this.logger.log(`Removing ComboOption ${id}`);
    await this.repo.remove(option);
  }
}
