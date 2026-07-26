import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    whatsappLid: '137061734588514@lid',
    phoneNumber: null,
    fullName: 'Empleado 13706173',
    employeeCode: null,
  };

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
  });

  describe('findByWhatsappLid', () => {
    it('should return user by LID', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.findByWhatsappLid('137061734588514@lid');

      expect(result).toEqual(mockUser);
      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { whatsappLid: '137061734588514@lid' },
      });
    });

    it('should return null if not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.findByWhatsappLid('nonexistent@lid');

      expect(result).toBeNull();
    });
  });

  describe('createPendingUserByLid', () => {
    it('should create pending user with LID prefix', async () => {
      userRepo.create.mockReturnValue(mockUser as User);
      userRepo.save.mockResolvedValue(mockUser as User);

      const result = await service.createPendingUserByLid('137061734588514@lid');

      expect(userRepo.create).toHaveBeenCalledWith({
        whatsappLid: '137061734588514@lid',
        fullName: 'Empleado 13706173',
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const updatedUser = { ...mockUser, fullName: 'Juan Perez', phoneNumber: '1123456789' };
      userRepo.update.mockResolvedValue({ affected: 1 } as any);
      userRepo.findOne.mockResolvedValue(updatedUser as User);

      const result = await service.updateProfile('user-uuid-1', {
        fullName: 'Juan Perez',
        phoneNumber: '1123456789',
      });

      expect(result.fullName).toBe('Juan Perez');
      expect(result.phoneNumber).toBe('1123456789');
    });
  });
});
