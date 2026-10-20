import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from '../auth/dto/auth.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

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

  @Get()
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

  @Delete('me')
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.userService.deleteAccount(userId);
  }
}
