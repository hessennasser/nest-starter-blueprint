import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { Public, CurrentUser, RateLimit } from 'src/shared/decorators';
import { ResponseHelper } from 'src/shared/helpers';
import { extractRequestMeta } from 'src/shared/helpers/request-meta.helper';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private meta(req: Request) {
    const { ip, userAgent } = extractRequestMeta(req);
    return { ipAddress: ip, userAgent };
  }

  @Public()
  @RateLimit(10, 60)
  @Post('register')
  @ApiOperation({ summary: 'Create an account and return tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  async register(@Req() req: Request, @Body() dto: RegisterDto) {
    return ResponseHelper.authenticated(
      await this.authService.register(dto, this.meta(req)),
    );
  }

  @Public()
  @RateLimit(10, 60)
  @Post('login')
  @ApiOperation({ summary: 'Exchange credentials for tokens' })
  @ApiOkResponse({ type: AuthResponseDto })
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    return ResponseHelper.authenticated(
      await this.authService.login(dto, this.meta(req)),
    );
  }

  @Public()
  @RateLimit(30, 60)
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token for a fresh token pair' })
  @ApiOkResponse({ type: AuthResponseDto })
  async refresh(@Req() req: Request, @Body() dto: RefreshTokenDto) {
    return ResponseHelper.authenticated(
      await this.authService.refresh(dto.refreshToken, this.meta(req)),
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Post('logout')
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return ResponseHelper.successMessage('Logged out');
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: 'The current authenticated user' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return ResponseHelper.success(user);
  }
}
