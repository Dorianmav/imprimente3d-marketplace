import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { RateLimitAuth, RateLimitEmailVerification, RateLimitPasswordChange } from '../common/decorators/rate-limit.decorator';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  OAuthCallbackDto,
  RefreshTokenDto,
  ResendVerificationDto,
  ResetPasswordDto,
  SignupDto,
  UpdateProfileDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ============================================
  // Public endpoints
  // ============================================

  @Public()
  @RateLimitAuth() // T-1.6: anti brute-force (5 req/5min)
  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.signup(signupDto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @RateLimitAuth() // T-1.6: anti brute-force (5 req/5min)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  @Public()
  @RateLimitAuth() // T-1.6: rate limit refresh token endpoint (5 req/5min)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!body.refreshToken) {
      throw new Error('Refresh token missing');
    }
    const tokens = await this.authService.refreshTokens(userId, body.refreshToken);
    this.setRefreshTokenCookie(res, tokens.refreshToken);
    return tokens;
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser('id') userId: string,
  ) {
    await this.authService.logout(userId, refreshToken);
    res.clearCookie('refreshToken');
    return { message: 'Logged out successfully' };
  }

  @Public()
  @RateLimitAuth() // T-1.6: anti brute-force (5 req/5min)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    // CDC T-1.5: always return same response regardless of user existence
    await this.authService.requestPasswordReset(dto.email);
    return {
      message:
        'Si cet email existe, vous recevrez un lien de réinitialisation.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Mot de passe mis à jour.' };
  }

  @Public()
  @RateLimitEmailVerification() // T-1.6: prevent email enumeration (3 req/60min)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);
    return { message: 'Email vérifié avec succès.' };
  }

  @Public()
  @RateLimitEmailVerification() // T-1.6: prevent email enumeration (3 req/60min)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(@Body() dto: ResendVerificationDto) {
    // CDC T-1.2: always return same response
    await this.authService.requestEmailVerification(dto.email);
    return {
      message:
        'Si cet email existe, vous recevrez un nouveau lien de vérification.',
    };
  }

  @Public()
  @Post('oauth')
  async oauthCallback(@Body() dto: OAuthCallbackDto) {
    const result = await this.authService.oauthCallback(dto);
    this.setRefreshTokenCookie(dto.provider === 'apple' ? undefined : undefined, result.refreshToken);
    return result;
  }

  // ============================================
  // Protected endpoints
  // ============================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.authService.updateProfile(userId, updateDto);
  }

  @RateLimitPasswordChange() // T-1.6: prevent brute-force on password change (3 req/15min)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  // ============================================
  // Cookie helper
  // ============================================

  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    if (!res || !refreshToken) return;
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
