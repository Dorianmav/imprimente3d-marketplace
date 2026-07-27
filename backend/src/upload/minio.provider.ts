import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

export const MINIO_CLIENT = 'MINIO_CLIENT';

export const MinioProvider: Provider = {
  provide: MINIO_CLIENT,
  useFactory: (config: ConfigService) => {
    return new Client({
      endPoint: config.get<string>('MINIO_ENDPOINT')!,
      port: Number(config.get<string>('MINIO_PORT')),
      useSSL: config.get<string>('MINIO_USE_SSL') === 'true',
      accessKey: config.get<string>('MINIO_ACCESS_KEY')!,
      secretKey: config.get<string>('MINIO_SECRET_KEY')!,
    });
  },
  inject: [ConfigService],
};
