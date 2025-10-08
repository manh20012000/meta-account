// user.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { User } from '../../models/user.entity';
import { SearchUserDto } from './dto/search.dto';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { RedisDataService } from 'src/configuars/redis/redis-data.service';
import {
  generateAccessToken,
  generateRefreshToken,
  resetDeviceState,
} from '../../utils/auth/auth.util';
import { RabbitmqService } from 'src/configuars/messaging/rabbitmq.service';
import { ResponseException } from 'src/configuars/response/response.exception';
import { UserElasticsearchService } from 'src/configuars/elasticsearch/user-search.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    private configService: ConfigService,

    private userElasticsearch: UserElasticsearchService,
  ) {}

  private toDigits(s?: string) {
    return (s || '').replace(/\D+/g, '');
  }

  private isEmail(input: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
  }

  /** Phone: coi là hợp lệ nếu có 8–15 chữ số (tùy bạn chỉnh) */
  private isPhone(input: string) {
    const digits = this.toDigits(input);
    return digits.length >= 8 && digits.length <= 15;
  }

  /** Gộp tên: ưu tiên name; fallback firstName + lastName nếu có */
  private buildDisplayName(u: Partial<User> & Record<string, any>) {
    const full =
      (u as any).name ??
      `${(u as any).firstName ?? ''} ${(u as any).lastName ?? ''}`.trim();
    return full || '';
  }
  // ---------- user ----------

  async searchUserFindText(searchDto: SearchUserDto): Promise<{
    users: Array<{
      _id: string;
      name: string;
      avatar: string | null | undefined;
    }>;
  }> {
    const rawSearch = (searchDto.search ?? '').trim();
    if (!rawSearch) throw new BadRequestException('Keyword is required');

    const skip = Math.max(0, Number(searchDto.skip ?? 0) || 0);
    const limit = Math.min(
      50,
      Math.max(1, Number(searchDto.limit ?? 20) || 20),
    );

    if (this.isPhone(rawSearch)) {
      const cleanSearch = this.toDigits(rawSearch.trim());

      const rows = await this.userRepository.find({
        where: { phone: cleanSearch },
      });

      return {
        users: rows.map((u) => ({
          _id: String(u._id),
          name: this.buildDisplayName(u),
          avatar: u.avatar ?? null,
        })),
      };
    }
    // 2) EMAIL -> ES exact
    if (this.isEmail(rawSearch)) {
      // Sẽ được hiện thực trong file ES: searchEmailExact(search, skip, limit)
      const { data } = await this.userElasticsearch.searchEmailExact(
        rawSearch,
        skip,
        limit,
      );
      const users = data.map((u: any) => ({
        _id: String(u._id),
        name: u.name ?? '',
        avatar: u.avatar ?? null,
      }));
      return { users };
    }

    const { data } = await this.userElasticsearch.searchText(
      rawSearch,
      skip,
      limit,
    );
    const users = data.map((u: any) => ({
      _id: String(u._id),
      name: u.name ?? '',
      avatar: u.avatar ?? null,
    }));
    return { users };
  }
}
