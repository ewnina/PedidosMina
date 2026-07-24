import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { ProviderAccount } from './entities/provider-account.entity';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class ProviderAccountsService {
  constructor(
    @InjectRepository(ProviderAccount)
    private readonly accountRepo: Repository<ProviderAccount>,
  ) {}

  async findAll(): Promise<ProviderAccount[]> {
    return this.accountRepo.find({
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        providerId: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async findByProvider(providerId: string): Promise<ProviderAccount[]> {
    return this.accountRepo.find({
      where: { providerId },
      order: { createdAt: 'DESC' },
      select: {
        id: true,
        providerId: true,
        email: true,
        role: true,
        fullName: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });
  }

  async create(dto: CreateAccountDto): Promise<ProviderAccount> {
    const existing = await this.accountRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const account = this.accountRepo.create({
      providerId: dto.providerId,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
    });

    const saved = await this.accountRepo.save(account);
    const { passwordHash: _, ...result } = saved;
    return result as ProviderAccount;
  }
}
