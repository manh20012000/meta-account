import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { AppRabbitmqModule } from 'src/configuars/messaging/rabbitmq.module';
import { ElasticsModule } from 'src/configuars/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AppRabbitmqModule,
    ElasticsModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
