import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../../models/user.entity';
import { AppRabbitmqModule } from 'src/configuars/messaging/rabbitmq.module';
import { ElasticsModule } from 'src/configuars/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AppRabbitmqModule,
    ElasticsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
