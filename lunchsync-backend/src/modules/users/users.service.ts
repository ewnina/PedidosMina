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

  async findByPhone(phoneNumber: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { phoneNumber } });
  }

  async findOrCreateByPhone(phoneNumber: string, fullName?: string): Promise<User> {
    let user = await this.findByPhone(phoneNumber);
    if (user) return user;

    user = this.userRepo.create({
      phoneNumber,
      fullName: fullName ?? `Empleado ${phoneNumber.slice(-4)}`,
    });
    return this.userRepo.save(user);
  }
}
