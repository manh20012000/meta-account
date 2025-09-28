import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { MinioAvatarService } from './minio.service';
import {
  S3_CLIENT,
  MINIO_AVATAR_BUCKET,
  MINIO_ENDPOINT,
} from 'src/constants/minio.constants';

@Global()
@Module({
  imports: [ConfigModule], // ⚠️ cần có để dùng ConfigService
  providers: [
    {
      provide: S3_CLIENT,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const m = cfg.get('minio') as any;
        return new S3Client({
          region: m.region,
          endpoint: m.endpoint, // ví dụ http://192.168.51.100:9000
          credentials: {
            accessKeyId: m.accessKeyId,
            secretAccessKey: m.secretAccessKey,
          },
          forcePathStyle: true, // bắt buộc với MinIO
        });
      },
    },
    {
      provide: MINIO_AVATAR_BUCKET,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) =>
        (cfg.get('minio') as any).bucket.avatar,
    },
    {
      provide: MINIO_ENDPOINT,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => (cfg.get('minio') as any).endpoint,
    },
    MinioAvatarService,
  ],
  exports: [MinioAvatarService],
})
export class MinioModule {}
