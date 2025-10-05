import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config();

export const createDataSource = () => {
  const options: DataSourceOptions = {
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT
      ? parseInt(process.env.DATABASE_PORT, 10)
      : 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    schema: process.env.DATABASE_SCHEMA || 'user',
    // logging: process.env.NODE_ENV === 'development',//++
    logging: false,
    synchronize: false,
    migrationsRun: false,
    entities: [join(__dirname, '..', 'models', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '**', '*.{ts,js}')],
    subscribers: [join(__dirname, './subscribers/**/*{.ts,.js}')],
    extra: {
      max: process.env.DATABASE_MAX_CONNECTIONS
        ? parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10)
        : 100,
      ssl:
        process.env.DATABASE_SSL_ENABLED === 'true'
          ? {
              rejectUnauthorized:
                process.env.DATABASE_REJECT_UNAUTHORIZED === 'true',
              ca: process.env.DATABASE_CA,
              key: process.env.DATABASE_KEY,
              cert: process.env.DATABASE_CERT,
            }
          : undefined,
    },
  };

  return new DataSource(options);
};
export const dataSource = createDataSource();
