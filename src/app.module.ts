import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './configuars/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppRabbitmqModule } from './configuars/messaging/rabbitmq.module';
import { RedisModule } from './configuars/redis/redis.module';
import { MinioModule } from './configuars/minio/minio.module';
import { UserModule } from './modules/user/user.module';
import { User } from './modules/user/user.entity';
import { createDataSource } from './database/data-source';

@Module({
  imports: [
    // 1) ENV
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration], // port, db, redis, rabbitmq...
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async () => {
        const ds = createDataSource(); 
        return {
          ...(ds.options as any),
          // entities: [User],
      
        };
      },
    }),
    AppRabbitmqModule,
    MinioModule,
    RedisModule,
    UserModule,
  ],
})
export class AppModule {}
