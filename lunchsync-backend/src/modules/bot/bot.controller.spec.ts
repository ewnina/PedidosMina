import { Test, TestingModule } from '@nestjs/testing';
import { BotController } from './bot.controller';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('BotController', () => {
  let controller: BotController;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const mockUsersService = {
      findByWhatsappLid: jest.fn(),
      createPendingUserByLid: jest.fn(),
    };

    const mockAuthService = {
      generateMagicLink: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<BotController>(BotController);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);
  });

  describe('generateMagicLink', () => {
    it('should generate link for existing user', async () => {
      usersService.findByWhatsappLid.mockResolvedValue({
        id: 'user-1',
        whatsappLid: '123@lid',
      } as any);
      authService.generateMagicLink.mockResolvedValue({
        token: 'token-123',
        jti: 'jti-123',
      });

      const result = await controller.generateMagicLink(
        { author: '123@lid', whatsappGroupId: 'group-1', providerId: 'provider-1' },
        'lunchsync-bot-internal',
      );

      expect(result.userExists).toBe(true);
      expect(result.link).toContain('/employee/auth?token=token-123&jti=jti-123');
    });

    it('should create pending user if not exists', async () => {
      usersService.findByWhatsappLid.mockResolvedValue(null);
      usersService.createPendingUserByLid.mockResolvedValue({
        id: 'new-user-1',
        whatsappLid: '456@lid',
      } as any);
      authService.generateMagicLink.mockResolvedValue({
        token: 'token-456',
        jti: 'jti-456',
      });

      const result = await controller.generateMagicLink(
        { author: '456@lid', whatsappGroupId: 'group-1', providerId: 'provider-1' },
        'lunchsync-bot-internal',
      );

      expect(result.userExists).toBe(false);
      expect(usersService.createPendingUserByLid).toHaveBeenCalledWith('456@lid');
    });

    it('should reject invalid bot secret', async () => {
      await expect(
        controller.generateMagicLink(
          { author: '123@lid', whatsappGroupId: 'group-1', providerId: 'provider-1' },
          'wrong-secret',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
