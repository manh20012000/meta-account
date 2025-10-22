import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { AppRabbitmqModule } from 'src/configuars/messaging/rabbitmq.module';
import { RabbitmqService } from 'src/configuars/messaging/rabbitmq.service';
import { RedisModule } from 'src/configuars/redis/redis.module';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [AppRabbitmqModule, RedisModule,HttpModule],
  controllers: [AuthController],
  providers: [AuthService,  ConfigService],
  exports: [AuthService],
})
export class AuthModule {}
