import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './configuars/configuration';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppRabbitmqModule } from './configuars/messaging/rabbitmq.module';
import { RedisModule } from './configuars/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';

@Module({
  imports: [

    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration], 
    }),
    AppRabbitmqModule,
    RedisModule,
    AuthModule,
    
  ],
})
export class AppModule {}
