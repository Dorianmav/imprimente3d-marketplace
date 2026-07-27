import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { MinioProvider } from './minio.provider';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [MinioProvider, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
