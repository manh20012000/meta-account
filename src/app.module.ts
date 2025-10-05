import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './configuars/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppRabbitmqModule } from './configuars/messaging/rabbitmq.module';
import { RedisModule } from './configuars/redis/redis.module';
import { MinioModule } from './configuars/minio/minio.module';
import { AuthModule } from './modules/auth/auth.module';
import { User } from './models/user.entity';
import { createDataSource } from './database/data-source';
import { ElasticsModule } from './configuars/elasticsearch/elasticsearch.module';
import { FriendUserModule } from './modules/friends/friend.module';
import { UserModule } from './modules/user/user.module';

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
    ElasticsModule,
    AuthModule,
    FriendUserModule,
    UserModule,
  ],
})
export class AppModule {}
