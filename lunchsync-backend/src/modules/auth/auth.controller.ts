import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GenerateMagicLinkDto } from './dto/generate-magic-link.dto';
import { ValidateMagicLinkDto } from './dto/validate-magic-link.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('magic-link/generate')
  @UseGuards(JwtAuthGuard)
  generateMagicLink(@Body() dto: GenerateMagicLinkDto) {
    return this.authService.generateMagicLink(dto);
  }

  @Post('magic-link/validate')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  validateMagicLink(@Body() dto: ValidateMagicLinkDto) {
    return this.authService.validateMagicLink(dto);
  }

  @Post('complete-registration')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  completeRegistration(@Body() dto: CompleteRegistrationDto) {
    return this.authService.completeRegistration(dto);
  }

  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }
}
