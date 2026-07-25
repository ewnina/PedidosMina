import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { GenerateMagicLinkDto } from './dto/generate-magic-link.dto';
import { ValidateMagicLinkDto } from './dto/validate-magic-link.dto';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('magic-link/generate')
  @UseGuards(JwtAuthGuard)
  generateMagicLink(@Body() dto: GenerateMagicLinkDto) {
    return this.authService.generateMagicLink(dto);
  }

  @Post('magic-link/validate')
  validateMagicLink(@Body() dto: ValidateMagicLinkDto) {
    return this.authService.validateMagicLink(dto);
  }

  @Post('complete-registration')
  completeRegistration(@Body() dto: CompleteRegistrationDto) {
    return this.authService.completeRegistration(dto);
  }
}
