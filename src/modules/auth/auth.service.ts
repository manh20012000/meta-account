// user.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from '../../models/user.entity';
import {
  CreateUserDto,
  LoginDto,
  GoogleLoginDto,
  RefreshTokenDto,
  FcmTokenDto,
  SearchUserDto,
} from './dto/create-user.dto';
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

// ---------- Helpers ----------
const normalizeEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
};

// Giữ dấu + đầu, còn lại chỉ là số
const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^\d]/g, '');
  const out = plus + digits;
  return out || null;
};

const normalizeGender = (
  g?: string,
): 'male' | 'female' | 'other' | 'unknown' => {
  if (!g) return 'unknown';
  const low = g.toLowerCase();
  return (['male', 'female', 'other', 'unknown'] as const).includes(low as any)
    ? (low as any)
    : 'unknown';
};

const normalizeBirthday = (b?: string | Date | null): Date | null => {
  if (!b) return null;
  if (b instanceof Date) return isNaN(b.getTime()) ? null : b;
  const d = new Date(b);
  return isNaN(d.getTime()) ? null : d;
};

const toPublicUser = (u: User) => ({
  _id: u._id,
  name: u.name ?? '',
  avatar: u.avatar ?? '',
  email: u.email ?? undefined,
  phone: u.phone ?? undefined,
});

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly jwtSecret: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
    private redisService: RedisDataService,
    private readonly rabbitmq: RabbitmqService,
    private userElasticsearch: UserElasticsearchService,
  ) {
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'your-secret';
  }

  // ---------- Auth ----------
  async register(dto: CreateUserDto): Promise<User> {
    const email = normalizeEmail(dto.email ?? null);
    const phone = normalizePhone(dto.phone ?? null);

    if (!email && !phone) {
      throw new BadRequestException('Cần cung cấp ít nhất email hoặc phone');
    }

    if (email) {
      const existed = await this.userRepository.findOne({ where: { email } });
      if (existed) {
      }
    }
    if (phone) {
      const existed = await this.userRepository.findOne({ where: { phone } });
      if (existed) throw new ConflictException('Số điện thoại đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const name =
      `${dto.firstName || ''} ${dto.lastName || ''}`.trim() ||
      email ||
      phone ||
      '';

    const user = this.userRepository.create({
      email: email ?? null,
      phone: phone ?? null,
      password: passwordHash,
      firstName: dto.firstName || null,
      lastName: dto.lastName || null,
      name: name || null,
      birthday: normalizeBirthday(dto.birthday),
      gender: normalizeGender(dto.gender),
      avatar: dto.avatar ?? null,
    });

    const saved = await this.userRepository.save(user);

    try {
      await this.userElasticsearch.indexUser({
        user_id: saved._id,
        name:
          saved.name ??
          `${saved.firstName ?? ''} ${saved.lastName ?? ''}`.trim(),
        email: saved.email ?? undefined,
        avatar: saved.avatar ?? undefined,
        status: undefined, // nếu có status trong schema ES thì điền
        createdAt: saved.createdAt ?? new Date().toISOString(),
      });
      // Dev/test muốn thấy ngay thì:
      // await this.userElasticsearch.indexUser({ ... , refresh: 'wait_for' }); // → bạn có thể thêm overload
    } catch (e) {
      // Không throw để không chặn đăng ký
      console.warn(`Failed to index user ${saved._id}: ${e.message}`);
    }
    return saved;
  }

  async login(dto: LoginDto): Promise<{
    user: ReturnType<typeof toPublicUser>;
    access_token: string;
    refresh_token: string;
  }> {
    const email = normalizeEmail(dto.email ?? null);
    const phone = normalizePhone(dto.phone ?? null);

    if (!email && !phone) {
      throw new BadRequestException('Cần cung cấp email hoặc phone');
    }

    let user: User | null = null;
    if (email) {
      user = await this.userRepository.findOne({ where: { email } });
    } else if (phone) {
      user = await this.userRepository.findOne({ where: { phone } });
    }
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (dto.deviceId) {
      await resetDeviceState(user._id, dto.deviceId, this.redisService);
    }

    const info = {
      _id: user._id,
      name: user.name || '',
      avatar: user.avatar || '',
    };
    const [access_token, refresh_token] = await Promise.all([
      generateAccessToken(info, this.configService, this.redisService),
      generateRefreshToken(info, this.configService, this.redisService),
    ]);
    await this.rabbitmq.publish('user.fcmtoken.set', {
      user_id: user._id,
      fcmtoken: dto.fcmtoken,
    });
    return { user: toPublicUser(user), access_token, refresh_token };
  }

  async loginWithGoogle(googleDto: GoogleLoginDto): Promise<{
    user: ReturnType<typeof toPublicUser>;
    access_token: string;
    refresh_token: string;
  }> {
    const g = googleDto.user;
    const email = normalizeEmail(g.email);
    if (!email) throw new BadRequestException('Email không hợp lệ');

    let dbUser = await this.userRepository.findOne({ where: { email } });

    if (dbUser) {
      if (g.password && !(await bcrypt.compare(g.password, dbUser.password))) {
        throw new UnauthorizedException('Invalid password');
      }

      if (googleDto.deviceId) {
        await resetDeviceState(
          dbUser._id,
          googleDto.deviceId,
          this.redisService,
        );
      }

      const info = {
        _id: dbUser._id,
        name: dbUser.name || '',
        avatar: dbUser.avatar || '',
      };

      if (googleDto.fcmtoken) {
        await this.rabbitmq.publish('user.fcmtoken.set', {
          user_id: info._id,
          fcmtoken: googleDto.fcmtoken,
        });
      } else {
        console.warn?.(
          `Login OK but no fcmtoken provided for user ${info._id}`,
        );
      }
      console.log('gdsfhdh gữi fcmtoken 1 ');
      const [access_token, refresh_token] = await Promise.all([
        generateAccessToken(info, this.configService, this.redisService),
        generateRefreshToken(info, this.configService, this.redisService),
      ]);

      return { user: toPublicUser(dbUser), access_token, refresh_token };
    }

    // Create mới
    const passwordHash = await bcrypt.hash(
      g.password || 'google-default-pass',
      this.saltRounds,
    );
    const name =
      g.name || `${g.firstName || ''} ${g.lastName || ''}`.trim() || '';

    const newUser = this.userRepository.create({
      email,
      password: passwordHash,
      firstName: g.firstName || null,
      lastName: g.lastName || null,
      name: name || null,
      birthday: normalizeBirthday(g.birthday),
      gender: normalizeGender(g.gender),
      avatar: g.avatar ?? null,
    });

    const savedUser = await this.userRepository.save(newUser);
    try {
      await this.userElasticsearch.indexUser({
        user_id: savedUser._id,
        name:
          savedUser.name ??
          `${savedUser.firstName ?? ''} ${savedUser.lastName ?? ''}`.trim(),
        email: savedUser.email ?? undefined,
        avatar: savedUser.avatar ?? undefined,
        status: undefined, // nếu có status trong schema ES thì điền
        createdAt: savedUser.createdAt ?? new Date().toISOString(),
      });
      // Dev/test muốn thấy ngay thì:
      // await this.userElasticsearch.indexUser({ ... , refresh: 'wait_for' }); // → bạn có thể thêm overload
    } catch (e) {
      // Không throw để không chặn đăng ký
      console.warn(`Failed to index user ${savedUser._id}: ${e.message}`);
    }
    if (googleDto.deviceId) {
      await resetDeviceState(
        savedUser._id,
        googleDto.deviceId,
        this.redisService,
      );
    }

    const info = {
      _id: savedUser._id,
      name: savedUser.name || '',
      avatar: savedUser.avatar || '',
    };

    await this.rabbitmq.publish('user.fcmtoken.set', {
      user_id: savedUser._id,
      fcmtoken: googleDto.fcmtoken,
    });
    console.log('gdsfhdh gữi fcmtoken 2 ');
    const [access_token, refresh_token] = await Promise.all([
      generateAccessToken(info, this.configService, this.redisService),
      generateRefreshToken(info, this.configService, this.redisService),
    ]);

    return { user: toPublicUser(savedUser), access_token, refresh_token };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{
    user: ReturnType<typeof toPublicUser>;
    access_token: string;
    refresh_token: string;
  }> {
    const { refreshToken } = refreshTokenDto;

    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as {
        userId: string;
      };
      const user = await this.userRepository.findOne({
        where: { _id: decoded.userId },
      });
      if (!user) throw new NotFoundException('User not found');

      const info = {
        _id: user._id,
        name: user.name || '',
        avatar: user.avatar || '',
      };
      const access_token = await generateAccessToken(
        info,
        this.configService,
        this.redisService,
      );

      return {
        user: toPublicUser(user),
        access_token,
        refresh_token: refreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ---------- Profile ----------
  async updateUser(
    _id: string,
    updateData: Partial<CreateUserDto>,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { _id } });
    if (!user) throw new NotFoundException('User not found');

    // Normalize & check trùng nếu đổi email/phone
    if (typeof updateData.email !== 'undefined') {
      const email = normalizeEmail(updateData.email);
      if (email && email !== user.email) {
        const existed = await this.userRepository.findOne({ where: { email } });
        if (existed) throw new ConflictException('Email đã được sử dụng');
      }
      user.email = email;
    }

    if (typeof updateData.phone !== 'undefined') {
      const phone = normalizePhone(updateData.phone);
      if (phone && phone !== user.phone) {
        const existed = await this.userRepository.findOne({ where: { phone } });
        if (existed)
          throw new ConflictException('Số điện thoại đã được sử dụng');
      }
      user.phone = phone ?? null;
    }

    if (updateData.password) {
      user.password = await bcrypt.hash(updateData.password, this.saltRounds);
      delete (updateData as any).password;
    }

    if (typeof updateData.firstName !== 'undefined')
      user.firstName = updateData.firstName || null;
    if (typeof updateData.lastName !== 'undefined')
      user.lastName = updateData.lastName || null;
    if (typeof updateData.avatar !== 'undefined')
      user.avatar = updateData.avatar ?? null;
    if (typeof updateData.gender !== 'undefined')
      user.gender = normalizeGender(updateData.gender);
    if (typeof updateData.birthday !== 'undefined')
      user.birthday = normalizeBirthday(updateData.birthday);

    if (
      typeof updateData.firstName !== 'undefined' ||
      typeof updateData.lastName !== 'undefined'
    ) {
      const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      user.name = full || user.email || user.phone || null;
    }

    return await this.userRepository.save(user);
  }

  // ---------- Other ----------
  async forgetPassword(identifier: string): Promise<{ message: string }> {
    const email = normalizeEmail(identifier);
    const phone = normalizePhone(identifier);

    if (!email && !phone) {
      throw new BadRequestException(
        'Vui lòng cung cấp email hoặc số điện thoại hợp lệ',
      );
    }

    const user = await this.userRepository.findOne({
      where: email ? ({ email } as any) : ({ phone } as any),
    });
    if (!user) throw new NotFoundException('User not found');

    // TODO: gửi OTP qua email/phone
    return { message: 'OTP sent successfully' };
  }

  async removeFcmToken(
    userId: string,
    { fcmToken }: FcmTokenDto,
  ): Promise<void> {
    await this.rabbitmq.publish('user.fcmtoken.remove', {
      user_id: userId,
      fcmToken,
    });
  }

  async searchUsers(searchDto: SearchUserDto): Promise<{
    users: Array<{
      _id: string;
      name: string;
      avatar: string | null | undefined;
    }>;
  }> {
    const { keyword, _id } = searchDto;
    if (!keyword) throw new BadRequestException('Keyword is required');

    let users: User[] = [];

    if (keyword === '@') {
      if (!_id) return { users: [] };
      const current = await this.userRepository.findOne({
        where: { _id },
      });
      if (current?.friends?.length) {
        users = await this.userRepository.find({
          where: { _id: In(current.friends) },
          select: ['_id', 'firstName', 'lastName', 'avatar', 'name'],
          take: 15,
        });
      }
    } else if (keyword.startsWith('@')) {
      const term = keyword.slice(1).toLowerCase();
      users = await this.userRepository
        .createQueryBuilder('user')
        .where(
          '(LOWER(user.firstName) LIKE :t OR LOWER(user.lastName) LIKE :t)',
          { t: `%${term}%` },
        )
        .select([
          'user._id',
          'user.firstName',
          'user.lastName',
          'user.avatar',
          'user.name',
        ])
        .take(20)
        .getMany();
    }

    const formatted = users.map((u) => ({
      _id: u._id,
      name: u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      avatar: u.avatar,
    }));

    return { users: formatted };
  }
}
