import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  S3_CLIENT_USER,
  MINIO_USER_BUCKET,
  MINIO_ENDPOINT,
} from 'src/constants/minio.constants';

@Injectable()
export class MinioUserService implements OnModuleInit {
  private readonly logger = new Logger(MinioUserService.name);

  constructor(
    @Inject(S3_CLIENT_USER) private readonly s3: S3Client,
    @Inject(MINIO_USER_BUCKET) private readonly bucket: string,
    @Inject(MINIO_ENDPOINT) private readonly endpoint: string, // để build URL public
  ) {}

  async onModuleInit() {
    await this.ensureBucket(this.bucket);
  }

  private async ensureBucket(bucket: string) {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
      this.logger.log(`MinIO bucket OK: ${bucket}`);
      console.log('dsjdnjsoki');
    } catch {
      await this.s3.send(new CreateBucketCommand({ Bucket: bucket }));
      this.logger.log(`MinIO bucket created: ${bucket}`);
    }
  }

  async upload(
    key: string,
    body: Buffer | Uint8Array | Blob | string,
    contentType?: string,
  ) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { bucket: this.bucket, key, url: this.buildUrl(key) };
  }

  async remove(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return true;
  }

  // URL thường (cần bucket/objects public-reaad thì mobile tải trực tiếp)
  buildUrl(key: string) {
    const base = this.endpoint.replace(/\/+$/, '');
    return `${base}/${this.bucket}/${encodeURIComponent(key)}`;
  }
}
