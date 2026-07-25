import { Injectable, UnauthorizedException, ConflictException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ProviderAccount } from '../provider-accounts/entities/provider-account.entity';
import { AuthToken } from './tokens/entities/auth-token.entity';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { GenerateMagicLinkDto } from './dto/generate-magic-link.dto';
import { ValidateMagicLinkDto } from './dto/validate-magic-link.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(ProviderAccount)
    private readonly providerAccountRepo: Repository<ProviderAccount>,
    @InjectRepository(AuthToken)
    private readonly authTokenRepo: Repository<AuthToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const account = await this.providerAccountRepo.findOne({
      where: { email: dto.email, isActive: true },
    });

    if (!account) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (account.lockedUntil && account.lockedUntil > new Date()) {
      throw new UnauthorizedException('Cuenta bloqueada temporalmente');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, account.passwordHash);
    if (!isPasswordValid) {
      const failedAttempts = account.failedAttempts + 1;
      const updates: Partial<ProviderAccount> = { failedAttempts };

      if (failedAttempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
        updates.failedAttempts = 0;
      }

      await this.providerAccountRepo.update(account.id, updates);
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await this.providerAccountRepo.update(account.id, {
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    });

    const payload = {
      sub: account.id,
      email: account.email,
      role: account.role,
      providerId: account.providerId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async generateMagicLink(dto: GenerateMagicLinkDto): Promise<{ token: string; jti: string }> {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const jti = uuidv4();
    const expiresAt = new Date(Date.now() + 10 * 60 * 60 * 1000);

    const authToken = this.authTokenRepo.create({
      userId: dto.userId,
      providerId: dto.providerId,
      jti,
      expiresAt,
    });

    await this.authTokenRepo.save(authToken);

    const token = this.jwtService.sign(
      { sub: dto.userId, jti, type: 'magic-link' },
      { expiresIn: '10h' },
    );

    this.logger.log(`Magic link generated for user ${dto.userId}`);
    return { token, jti };
  }

  async validateMagicLink(dto: ValidateMagicLinkDto): Promise<{ accessToken: string } | { userExists: false; phoneNumber: string; providerId: string; userId: string }> {
    const authToken = await this.authTokenRepo.findOne({
      where: { jti: dto.tokenJti },
    });

    if (!authToken) {
      throw new UnauthorizedException('Token inválido');
    }

    if (authToken.usedAt) {
      throw new UnauthorizedException('Token ya fue utilizado');
    }

    if (authToken.revokedAt) {
      throw new UnauthorizedException('Token revocado');
    }

    if (authToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expirado');
    }

    const user = await this.userRepo.findOne({ where: { id: authToken.userId } });

    // If user does not exist OR it's a pending placeholder user (created by bot),
    // treat as userExists: false so the frontend redirects to registration.
    // Pending users are created with fullName like `Empleado ####` by UsersService.createPendingUser().
    const isPendingUser = user ? /^Empleado\s\d{4}$/.test(user.fullName) : false;

    if (!user || isPendingUser) {
      return {
        userExists: false,
        phoneNumber: user?.phoneNumber ?? '',
        providerId: authToken.providerId,
        userId: authToken.userId,
      };
    }

    await this.authTokenRepo.update(authToken.id, { usedAt: new Date() });

    const payload = {
      sub: user.id,
      email: user.phoneNumber,
      role: 'employee',
      providerId: authToken.providerId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  async completeRegistration(dto: CompleteRegistrationDto): Promise<{ accessToken: string }> {
    const authToken = await this.authTokenRepo.findOne({
      where: { jti: dto.tokenJti },
    });

    if (!authToken) {
      throw new UnauthorizedException('Token inválido');
    }

    if (authToken.usedAt) {
      throw new UnauthorizedException('Token ya fue utilizado');
    }

    if (authToken.revokedAt) {
      throw new UnauthorizedException('Token revocado');
    }

    if (authToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Token expirado');
    }

    const user = await this.userRepo.findOne({ where: { id: authToken.userId } });
    if (!user) {
      throw new BadRequestException('Usuario no encontrado');
    }

    await this.userRepo.update(user.id, {
      fullName: dto.fullName,
      employeeCode: dto.employeeCode,
    });

    await this.authTokenRepo.update(authToken.id, { usedAt: new Date() });

    const payload = {
      sub: user.id,
      email: user.phoneNumber,
      role: 'employee',
      providerId: authToken.providerId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
    };
  }
}
