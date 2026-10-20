import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { GeocodingService } from './geocoding.service';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, GeocodingService],
  exports: [UserService],
})
export class UserModule {}
