import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { randomUUID } from 'crypto';
import { MINIO_CLIENT } from './minio.provider';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(
    @Inject(MINIO_CLIENT) private readonly minio: Client,
    private readonly config: ConfigService,
  ) {
    this.bucket = this.config.get<string>('MINIO_BUCKET')!;
    this.publicUrl = this.config.get<string>('MINIO_PUBLIC_URL')!;
  }

  async onModuleInit() {
    const exists = await this.minio
      .bucketExists(this.bucket)
      .catch(() => false);
    if (!exists) {
      await this.minio.makeBucket(this.bucket);
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      };
      await this.minio.setBucketPolicy(this.bucket, JSON.stringify(policy));
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    const ext = file.originalname.split('.').pop();
    const key = `${randomUUID()}.${ext}`;

    await this.minio.putObject(this.bucket, key, file.buffer, file.size, {
      'Content-Type': file.mimetype,
    });

    return `${this.publicUrl}/${this.bucket}/${key}`;
  }

  async deleteFile(url: string): Promise<void> {
    const key = url.split(`${this.bucket}/`)[1];
    if (!key) return;
    await this.minio.removeObject(this.bucket, key).catch(() => undefined);
  }
}
