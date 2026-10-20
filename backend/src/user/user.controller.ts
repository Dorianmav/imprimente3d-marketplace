import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from '../auth/dto/auth.dto';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ============================================
  // T-2.1: User profile endpoints
  // ============================================

  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(userId, updateDto);
  }

  /**
   * T-2.1: Geocode address and update location (T-2.1)
   */
  @Post('me/geocode')
  async geocodeAddress(
    @CurrentUser('id') userId: string,
    @Body('address') address: string,
  ) {
    const geo = await this.userService['geocodingService'].geocode(address);
    if (!geo) {
      return { error: 'Adresse non trouvée' };
    }

    await this.userService.updateProfile(userId, {
      localisation: {
        address,
        latitude: geo.latitude,
        longitude: geo.longitude,
        formattedAddress: geo.formattedAddress,
      },
    });

    return { message: 'Localisation mise à jour', ...geo };
  }

  // ============================================
  // T-2.5: Account deletion (anonymization)
  // ============================================

  @Delete('me')
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.userService.deleteAccount(userId);
  }

  // ============================================
  // T-2.6: Data export (GDPR compliance)
  // ============================================

  @Get('me/export')
  async exportUserData(@CurrentUser('id') userId: string) {
    return this.userService.exportUserData(userId);
  }

  // ============================================
  // T-2.7: CGU acceptance
  // ============================================

  @Post('me/cgu')
  async acceptCGU(
    @CurrentUser('id') userId: string,
    @Body('version') version: string,
  ) {
    if (!version) {
      return { error: 'Version required' };
    }
    return this.userService.acceptCGU(userId, version);
  }

  // ============================================
  // T-2.4: User blocking
  // ============================================

  @Post('me/block')
  async blockUser(
    @CurrentUser('id') userId: string,
    @Body() blockDto: { blockedId: string; reason?: string },
  ) {
    return this.userService.blockUser(userId, blockDto);
  }

  @Delete('me/block/:blockedId')
  async unblockUser(
    @CurrentUser('id') userId: string,
    @Param('blockedId') blockedId: string,
  ) {
    return this.userService.unblockUser(userId, blockedId);
  }

  @Get('me/blocked')
  async getBlockedUsers(@CurrentUser('id') userId: string) {
    return this.userService.getBlockedUsers(userId);
  }

  // ============================================
  // Admin endpoints (T-1.7 role protection)
  // ============================================

  @Get()
  @Roles('admin')
  async findAll() {
    return this.userService.findAllUsers();
  }

  @Get('search')
  async search(
    @CurrentUser('id') userId: string,
    @Query('q') query: string,
    @Query('limit') limit: number,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.userService.searchUsers(query, userId, parsedLimit);
  }

  @Get(':id')
  async getUser(@Param('id') userId: string) {
    const user = await this.userService.getProfile(userId);
    // Remove sensitive fields for public profile view
    const {
      email,
      stripeCustomerId,
      stripeAccountId,
      stripeOnboardingComplete,
      ...publicProfile
    } = user;
    return publicProfile;
  }

  @Get(':id/reviews')
  async getUserReviews(@Param('id') userId: string) {
    return this.userService.getReceivedReviews(userId);
  }

  @Get(':id/listings')
  async getUserListings(@Param('id') userId: string) {
    return this.userService.getSellerActiveListings(userId);
  }
}
