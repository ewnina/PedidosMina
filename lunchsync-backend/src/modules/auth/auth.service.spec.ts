import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { ProviderAccount } from '../provider-accounts/entities/provider-account.entity';
import { AuthToken } from './tokens/entities/auth-token.entity';
import { User } from '../users/entities/user.entity';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<Repository<User>>;
  let authTokenRepo: jest.Mocked<Repository<AuthToken>>;
  let providerAccountRepo: jest.Mocked<Repository<ProviderAccount>>;
  let jwtService: jest.Mocked<JwtService>;

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

  const mockAccount: Partial<ProviderAccount> = {
    id: 'account-uuid-1',
    providerId: 'provider-uuid-1',
    email: 'test@provider.com',
    passwordHash: '$2b$10$hashedpassword',
    role: 'operator',
    isActive: true,
    failedAttempts: 0,
    lockedUntil: null,
    lastLogin: null,
    fullName: 'Test Operator',
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
      verify: jest.fn(),
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
    providerAccountRepo = module.get(getRepositoryToken(ProviderAccount));
    jwtService = module.get(JwtService);
  });

  describe('login', () => {
    it('should return accessToken for valid credentials', async () => {
      providerAccountRepo.findOne.mockResolvedValue(mockAccount as ProviderAccount);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      providerAccountRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.login({ email: 'test@provider.com', password: 'password123' });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(jwtService.sign).toHaveBeenCalledWith(expect.objectContaining({
        sub: 'account-uuid-1',
        email: 'test@provider.com',
        role: 'operator',
        providerId: 'provider-uuid-1',
      }));
      expect(providerAccountRepo.update).toHaveBeenCalledWith('account-uuid-1', expect.objectContaining({
        failedAttempts: 0,
        lockedUntil: null,
        lastLogin: expect.any(Date),
      }));
    });

    it('should throw for non-existent email', async () => {
      providerAccountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@email.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return null-find for inactive account (DB filters isActive)', async () => {
      providerAccountRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@provider.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for locked account', async () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000);
      providerAccountRepo.findOne.mockResolvedValue({ ...mockAccount, lockedUntil: futureDate } as ProviderAccount);

      await expect(
        service.login({ email: 'test@provider.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for wrong password and increment failed attempts', async () => {
      providerAccountRepo.findOne.mockResolvedValue(mockAccount as ProviderAccount);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      providerAccountRepo.update.mockResolvedValue({ affected: 1 } as any);

      await expect(
        service.login({ email: 'test@provider.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(providerAccountRepo.update).toHaveBeenCalledWith('account-uuid-1', {
        failedAttempts: 1,
      });
    });

    it('should lock account after 5 failed attempts', async () => {
      providerAccountRepo.findOne.mockResolvedValue({ ...mockAccount, failedAttempts: 4 } as ProviderAccount);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      providerAccountRepo.update.mockResolvedValue({ affected: 1 } as any);

      await expect(
        service.login({ email: 'test@provider.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(providerAccountRepo.update).toHaveBeenCalledWith('account-uuid-1', {
        failedAttempts: 0,
        lockedUntil: expect.any(Date),
      });
    });
  });

  describe('generateMagicLink', () => {
    it('should generate token and jti for valid user', async () => {
      userRepo.findOne.mockResolvedValue(mockUser as User);
      authTokenRepo.create.mockReturnValue(mockAuthToken as AuthToken);
      authTokenRepo.save.mockResolvedValue(mockAuthToken as AuthToken);

      const result = await service.generateMagicLink({
        userId: 'user-uuid-1',
        providerId: 'provider-uuid-1',
      });

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('jti');
      expect(authTokenRepo.save).toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.generateMagicLink({ userId: 'nonexistent', providerId: 'provider-1' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateMagicLink', () => {
    it('should return accessToken for valid registered user', async () => {
      authTokenRepo.findOne.mockResolvedValue(mockAuthToken as AuthToken);
      userRepo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.validateMagicLink({ tokenJti: 'jti-uuid-1', token: 'jwt-token' });

      expect(result).toHaveProperty('accessToken');
      expect((result as { accessToken: string }).accessToken).toBe('mock-jwt-token');
      expect(authTokenRepo.update).toHaveBeenCalledWith('token-uuid-1', { usedAt: expect.any(Date) });
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

    it('should throw for revoked token', async () => {
      const revokedToken = { ...mockAuthToken, revokedAt: new Date() };
      authTokenRepo.findOne.mockResolvedValue(revokedToken as AuthToken);

      await expect(
        service.validateMagicLink({ tokenJti: 'jti-uuid-1', token: 'jwt-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('completeRegistration', () => {
    it('should complete registration and return accessToken', async () => {
      authTokenRepo.findOne.mockResolvedValue(mockAuthToken as AuthToken);
      userRepo.findOne.mockResolvedValue(mockPendingUser as User);
      userRepo.update.mockResolvedValue({ affected: 1 } as any);
      authTokenRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.completeRegistration({
        tokenJti: 'jti-uuid-1',
        fullName: 'Juan Perez',
        phoneNumber: '1234567890',
        employeeCode: 'EMP001',
      });

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(userRepo.update).toHaveBeenCalledWith('user-uuid-2', {
        fullName: 'Juan Perez',
        employeeCode: 'EMP001',
        phoneNumber: '1234567890',
      });
      expect(authTokenRepo.update).toHaveBeenCalledWith('token-uuid-1', { usedAt: expect.any(Date) });
    });

    it('should throw for invalid token', async () => {
      authTokenRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeRegistration({
          tokenJti: 'invalid',
          fullName: 'Test',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for already used token', async () => {
      authTokenRepo.findOne.mockResolvedValue({ ...mockAuthToken, usedAt: new Date() } as AuthToken);

      await expect(
        service.completeRegistration({
          tokenJti: 'jti-uuid-1',
          fullName: 'Test',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for revoked token', async () => {
      authTokenRepo.findOne.mockResolvedValue({ ...mockAuthToken, revokedAt: new Date() } as AuthToken);

      await expect(
        service.completeRegistration({
          tokenJti: 'jti-uuid-1',
          fullName: 'Test',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for expired token', async () => {
      authTokenRepo.findOne.mockResolvedValue({
        ...mockAuthToken,
        expiresAt: new Date(Date.now() - 1000),
      } as AuthToken);

      await expect(
        service.completeRegistration({
          tokenJti: 'jti-uuid-1',
          fullName: 'Test',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if user not found', async () => {
      authTokenRepo.findOne.mockResolvedValue(mockAuthToken as AuthToken);
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.completeRegistration({
          tokenJti: 'jti-uuid-1',
          fullName: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    it('should return new accessToken for valid token within grace period', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        exp: nowSeconds + 60,
        role: 'employee',
        providerId: 'provider-uuid-1',
      });
      userRepo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.refreshToken('valid-token');

      expect(result).toHaveProperty('accessToken', 'mock-jwt-token');
      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
    });

    it('should allow refresh within 5-minute grace period after expiry', async () => {
      const expiredSeconds = Math.floor(Date.now() / 1000) - 120;
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        exp: expiredSeconds,
        role: 'employee',
        providerId: 'provider-uuid-1',
      });
      userRepo.findOne.mockResolvedValue(mockUser as User);

      const result = await service.refreshToken('expired-but-grace');

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw if expired beyond 5-minute grace period', async () => {
      const veryExpiredSeconds = Math.floor(Date.now() / 1000) - 600;
      jwtService.verify.mockReturnValue({
        sub: 'user-uuid-1',
        exp: veryExpiredSeconds,
        role: 'employee',
        providerId: 'provider-uuid-1',
      });

      await expect(service.refreshToken('very-expired-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw for invalid token format', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid token'); });

      await expect(service.refreshToken('garbage')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if user not found', async () => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      jwtService.verify.mockReturnValue({
        sub: 'nonexistent-user',
        exp: nowSeconds + 60,
        role: 'employee',
        providerId: 'provider-uuid-1',
      });
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if token has no sub claim', async () => {
      jwtService.verify.mockReturnValue({ exp: 9999999999 });

      await expect(service.refreshToken('no-sub')).rejects.toThrow(UnauthorizedException);
    });
  });
});
