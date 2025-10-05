import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendUserService } from './friend.service';
import { FriendUserController } from './friend.controller';
import { User } from '../../models/user.entity';

// ⚠️ Import đúng ElasticsModule nơi bạn đã register & export UserElasticsearchchService
// (đường dẫn này theo ví dụ bạn dùng trước đó)
import { ElasticsModule } from 'src/configuars/elasticsearch/elasticsearch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ElasticsModule, // cung cấp UserElasticsearchchService cho FriendUserService
  ],
  controllers: [FriendUserController],
  providers: [FriendUserService],
  exports: [FriendUserService],
})
export class FriendUserModule {}
