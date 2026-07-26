import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findByWhatsappLid(lid: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { whatsappLid: lid } });
  }

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phoneNumber } });
  }

  async createPendingUserByLid(lid: string): Promise<User> {
    const user = this.userRepo.create({
      whatsappLid: lid,
      fullName: `Empleado ${lid.slice(0, 8)}`,
    });
    return this.userRepo.save(user);
  }

  async createPendingUser(phoneNumber: string): Promise<User> {
    const user = this.userRepo.create({
      phoneNumber,
      fullName: `Empleado ${phoneNumber.slice(-4)}`,
    });
    return this.userRepo.save(user);
  }

  async updateProfile(userId: string, data: { fullName: string; employeeCode?: string; phoneNumber?: string }): Promise<User> {
    await this.userRepo.update(userId, {
      fullName: data.fullName,
      employeeCode: data.employeeCode,
      phoneNumber: data.phoneNumber,
    });
    return this.userRepo.findOne({ where: { id: userId } }) as Promise<User>;
  }
}
