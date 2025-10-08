// src/modules/user/friend-user.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../models/user.entity';
import { SearchUserQueryDto } from './dto/search-user.dto';
import { UserElasticsearchService } from 'src/configuars/elasticsearch/user-search.service';
import { normalizePhoneInput } from 'src/utils/common/phone.util';

type FriendUserListItem = {
  _id: string;
  name: string;
  avatar?: string | null;
  phone?: string | null;
};

type FriendUserSearchResult = {
  message: string;
  data: FriendUserListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  status: boolean;
  statusCode: number;
};

@Injectable()
export class FriendUserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userEs: UserElasticsearchService,
  ) {}

  async findUserByTextOrPhone(
    dto: SearchUserQueryDto,
  ): Promise<FriendUserSearchResult> {
    const text = (dto.text ?? '').trim();
    const page = Math.max(dto.page ?? 1, 1);
    const limit = Math.max(dto.limit ?? 10, 1);

    if (!text) throw new BadRequestException('Missing search text');

    const { rawDigits, vnLocal10, isExact10, isPhoneLike } =
      normalizePhoneInput(text);

    let data: FriendUserListItem[] = [];
    let total = 0;

    if (isExact10 && vnLocal10) {
      // ✅ DB exact theo local 10 số
      const [rows, count] = await Promise.all([
        this.userRepo.find({
          where: { phone: vnLocal10 },
          select: ['_id', 'name', 'avatar', 'phone'],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.userRepo.count({ where: { phone: vnLocal10 } }),
      ]);

      data = rows.map((u) => ({
        _id: u._id,
        name: u.name ?? '',
        avatar: u.avatar,
        phone: u.phone,
      }));
      total = count;
    } else {
      // 🔤 Text → ES fuzzy theo name
      try {
        const es = await this.userEs.searchByNamePaged(text, page, limit);
        data = es.data.map((it) => ({
          _id: it._id,
          name: it.name,
          avatar: it.avatar ?? null,
          phone: it.phone ?? undefined,
        }));
        total = es.total;
      } catch {
        /* giữ rỗng */
      }
    }

    return {
      message: 'success',
      data,
      total,
      page,
      limit,
      hasMore: page * limit < total,
      status: true,
      statusCode: 200,
    };
  }
}
