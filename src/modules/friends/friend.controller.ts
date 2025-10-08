import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { FriendUserService } from './friend.service';
import { SearchUserQueryDto } from './dto/search-user.dto';

@Controller('friend-users')
export class FriendUserController {
  constructor(private readonly friendUserService: FriendUserService) {}

  /**
   * GET /friend-users/search?text=...&page=1&limit=10
   * - Nếu text là số điện thoại đủ 10 số → tìm exact trong DB (repo), fallback ES nếu rỗng (tuỳ bạn).
   * - Nếu text là "phone-like" nhưng chưa đủ → tìm partial qua Elasticsearch.
   * - Nếu text là chữ → fuzzy theo name qua Elasticsearch.
   */
  @Get('search')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async search(@Query() dto: SearchUserQueryDto) {
    return this.friendUserService.findUserByTextOrPhone(dto);
  }
}
