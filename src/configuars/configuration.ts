export default () => ({
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? process.env.PORT ?? '3000', 10),
  globalPrefix: process.env.GLOBAL_PREFIX ?? 'api',

  db: {
    type: process.env.DATABASE_TYPE ?? 'postgres',
    host: process.env.DATABASE_HOST!,
    port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
    user: process.env.DATABASE_USERNAME!,
    pass: process.env.DATABASE_PASSWORD!,
    name: process.env.DATABASE_NAME!,
    schema: process.env.DATABASE_SCHEMA ?? 'user',
    max: parseInt(process.env.DATABASE_MAX_CONNECTIONS ?? '10', 10),
    sslEnabled: (process.env.DATABASE_SSL_ENABLED ?? 'false') === 'true',
    rejectUnauthorized:
      (process.env.DATABASE_REJECT_UNAUTHORIZED ?? 'false') === 'true',
    synchronize: (process.env.DATABASE_SYNCHRONIZE ?? 'false') === 'true',
  },

  // ƯU TIÊN URL, fallback host/port
  redis: {
    url: process.env.REDIS_URL,
  },

  rabbitmq: {
    uri: process.env.RABBITMQ_URI!,
    exchange: process.env.USER_RABBITMQ_EXCHANGE ?? 'meta_user_exchange',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT, // ví dụ http://192.168.51.100:9000
    region: process.env.MINIO_REGION ?? 'us-east-1',
    accessKeyId: process.env.MINIO_ACCESS_KEY!,
    secretAccessKey: process.env.MINIO_SECRET_KEY!,
    bucket: {
      user: process.env.MINIO_BUCKET_META_USER ?? 'bucket-meta-user',
    },
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || '',
    username: process.env.ELASTICSEARCH_USERNAME,
    api_key: process.env.ELASTICSEARCH_API_KEY,
  },
});
