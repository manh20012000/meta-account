import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { User } from '../../models/user.entity';
import { AppRabbitmqModule } from 'src/configuars/messaging/rabbitmq.module';
import { ElasticsModule } from 'src/configuars/elasticsearch/elasticsearch.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserElasticsearchService } from 'src/configuars/elasticsearch/user-search.service';

@Module({
  imports: [  TypeOrmModule.forFeature([User]), ElasticsModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
