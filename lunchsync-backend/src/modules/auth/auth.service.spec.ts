import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { ProviderAccount } from '../provider-accounts/entities/provider-account.entity';
import { AuthToken } from './tokens/entities/auth-token.entity';
import { User } from '../users/entities/user.entity';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let authTokenRepo: jest.Mocked<Repository<AuthToken>>;

  const mockUser: Partial<User> = {
    id: 'user-uuid-1',
    whatsappLid: '137061734588514@lid',
    phoneNumber: null,
    fullName: 'Juan Perez',
    employeeCode: null,
  };

  const mockPendingUser: Partial<User> = {
    id: 'user-uuid-2',
    whatsappLid: '137061734588514@lid',
    phoneNumber: null,
    fullName: 'Empleado 13706173',
    employeeCode: null,
  };

  const mockAuthToken: Partial<AuthToken> = {
    id: 'token-uuid-1',
    userId: 'user-uuid-1',
    providerId: 'provider-uuid-1',
    jti: 'jti-uuid-1',
    expiresAt: new Date(Date.now() + 10 * 60 * 60 * 1000),
    usedAt: null,
    revokedAt: null,
  };

  beforeEach(async () => {
    const mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockAuthTokenRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    const mockProviderAccountRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(AuthToken), useValue: mockAuthTokenRepo },
        { provide: getRepositoryToken(ProviderAccount), useValue: mockProviderAccountRepo },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepo = module.get(getRepositoryToken(User));
    authTokenRepo = module.get(getRepositoryToken(AuthToken));
  });

  describe('validateMagicLink', () => {
    it('should return accessToken for valid registered user', async () => {
      authTokenRepo.findOne.mockResolvedValue(mockAuthToken as AuthToken);
      userRepo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.validateMagicLink({ tokenJti: 'jti-uuid-1', token: 'jwt-token' });

      expect(result).toHaveProperty('accessToken');
      expect((result as { accessToken: string }).accessToken).toBe('mock-jwt-token');
    });

    it('should return userExists: false for pending user', async () => {
      authTokenRepo.findOne.mockResolvedValue(mockAuthToken as AuthToken);
      userRepo.findOne.mockResolvedValue(mockPendingUser as User);

      const result = await service.validateMagicLink({ tokenJti: 'jti-uuid-1', token: 'jwt-token' });

      expect(result).toHaveProperty('userExists', false);
      expect((result as { whatsappLid: string }).whatsappLid).toBe('137061734588514@lid');
    });

    it('should throw for invalid token', async () => {
      authTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.validateMagicLink({ tokenJti: 'invalid', token: 'jwt-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for expired token', async () => {
      const expiredToken = { ...mockAuthToken, expiresAt: new Date(Date.now() - 1000) };
      authTokenRepo.findOne.mockResolvedValue(expiredToken as AuthToken);

      await expect(
        service.validateMagicLink({ tokenJti: 'jti-uuid-1', token: 'jwt-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for used token', async () => {
      const usedToken = { ...mockAuthToken, usedAt: new Date() };
      authTokenRepo.findOne.mockResolvedValue(usedToken as AuthToken);

      await expect(
        service.validateMagicLink({ tokenJti: 'jti-uuid-1', token: 'jwt-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
