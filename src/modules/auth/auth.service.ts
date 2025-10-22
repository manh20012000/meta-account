import {
  Injectable,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { RedisDataService } from 'src/configuars/redis/redis-data.service';
import {
  generateAccessToken,
  generateRefreshToken,
  removeAllToken,
  resetDeviceState,
} from '../../utils/auth/auth.util';
import { RabbitmqService } from 'src/configuars/messaging/rabbitmq.service';
import { ResponseException } from 'src/configuars/response/response.exception';
import {
  CreateUserDto,
  LoginDto,
  GoogleLoginDto,
  RefreshTokenDto,
  FcmTokenDto,
} from './dto/create-user.dto';

// ---------- Helpers ----------
const normalizeEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed || null;
};

const normalizePhone = (phone?: string | null): string | null => {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^\d]/g, '');
  return plus + digits || null;
};

const toPublicUser = (u: any) => ({
  _id: u._id,
  name: u.name ?? '',
  userId: u.userId,
  avatar: u.avatar ?? '',
  email: u.email ?? undefined,
  phone: u.phone ?? undefined,
});

@Injectable()
export class AuthService {
  private readonly saltRounds = 10;
  private readonly jwtSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly userUrl: string;

  constructor(
    private configService: ConfigService,
    private redisService: RedisDataService,
    private rabbitmq: RabbitmqService,
    private httpService: HttpService,
  ) {
    this.userUrl =
      this.configService.get('USER_SERVICE_URL') || 'http://localhost:3000';
    this.jwtSecret = this.configService.get('JWT_SECRET') || 'your-secret';
    this.refreshTokenSecret =
      this.configService.get('REFRESH_TOKEN_SECRET') || 'your-refresh-secret';
  }

  // ---------- Đăng ký người dùng ----------
  async register(dto: CreateUserDto) {
    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);

    if (!email && !phone) {
      throw new ResponseException(
        'Cần cung cấp ít nhất email hoặc số điện thoại',
        false,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.userUrl}/account`, dto),
      );
      return {
        message: 'Đăng ký thành công',
        data: data.data,
        status: true,
        statusCode: HttpStatus.CREATED,
      };
    } catch (error) {
      throw new ResponseException(
        error.response?.data?.message || 'Không thể tạo người dùng',
        false,
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ---------- Đăng nhập người dùng ----------
  async login(dto: LoginDto) {
    const email = normalizeEmail(dto.email);
    const phone = normalizePhone(dto.phone);

    if (!email && !phone) {
      throw new ResponseException(
        'Cần cung cấp email hoặc số điện thoại',
        false,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.userUrl}/account/find`, { email, phone }),
      );

      if (!data?.data?.password) {
        throw new ResponseException(
          'Tài khoản không tồn tại',
          false,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const isMatch = await bcrypt.compare(dto.password, data.data.password);
      if (!isMatch) {
        throw new ResponseException(
          'Mật khẩu không đúng',
          false,
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (dto.deviceId) {
        await resetDeviceState(data.data._id, dto.deviceId, this.redisService);
      }

      if (dto.fcmtoken) {
        await this.rabbitmq.publish('user.fcmtoken.set', {
          userId: data.data._id,
          fcmtoken: dto.fcmtoken,
        });
      }

      const info = {
        id: data.data.id,
        name: data.data.name,
        avatar: data.data.avatar,
        userId: data.data.userId,
      };
      const [access_token, refresh_token] = await Promise.all([
        generateAccessToken(info, this.configService, this.redisService),
        generateRefreshToken(info, this.configService, this.redisService),
      ]);

      return {
        user: toPublicUser(data.data),
        access_token,
        refresh_token,
      };
    } catch (error) {
      throw new ResponseException(
        error.response?.data?.message || 'Đăng nhập thất bại',
        false,
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ---------- Đăng nhập bằng Google ----------
  async loginWithGoogle(google_data: GoogleLoginDto) {
    const g = google_data.user;
    const email = normalizeEmail(g.email);
    if (!email) {
      throw new ResponseException(
        'Email không hợp lệ',
        false,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.userUrl}/account/google-login`,
          google_data,
        ),
      );

      if (google_data.deviceId) {
        await resetDeviceState(
          data.data.id,
          google_data.deviceId,
          this.redisService,
        );
      }

      if (google_data.fcmtoken) {
        await this.rabbitmq.publish('user.fcmtoken.set', {
          userId: data.data.id,
          fcmtoken: google_data.fcmtoken,
        });
      }

      const info = {
        id: data.data.id,
        name: data.data.name,
        avatar: data.data.avatar,
        userId: data.data.userId,
      };
      const [access_token, refresh_token] = await Promise.all([
        generateAccessToken(info, this.configService, this.redisService),
        generateRefreshToken(info, this.configService, this.redisService),
      ]);

      return {
        user: toPublicUser(data.data),
        access_token,
        refresh_token,
      };
    } catch (error) {
      console.log(error, 'service login with google', this.userUrl);
      throw new ResponseException(
        error.response?.data?.message || 'Đăng nhập Google thất bại',
        false,
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ---------- Làm mới token ----------
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const decoded = jwt.verify(
        dto.refresh_token,
        this.refreshTokenSecret,
      ) as any;
      const { data } = await firstValueFrom(
        this.httpService.get(`${this.userUrl}/account/${decoded.userId}`),
      );

      if (!data.data) {
        throw new ResponseException(
          'User không tồn tại',
          false,
          HttpStatus.NOT_FOUND,
        );
      }

      const info = {
        id: data.data.id,
        name: data.data.name,
        avatar: data.data.avatar,
        userId: data.data.userId,
      };
      const access_token = await generateAccessToken(
        info,
        this.configService,
        this.redisService,
      );
      const refresh_token = await generateRefreshToken(
        info,
        this.configService,
        this.redisService,
      );

      return {
        user: toPublicUser(data.data),
        access_token,
        refresh_token,
      };
    } catch (error) {
      console.log(error.message, 'lỗi khi làm mới token');
      throw new ResponseException(
        error.message || 'Token không hợp lệ hoặc hết hạn',
        false,
        error.status || HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // ---------- Quên mật khẩu (gửi OTP) ----------
  async forgetPassword(identifier: string) {
    const email = normalizeEmail(identifier);
    const phone = normalizePhone(identifier);

    if (!email && !phone) {
      throw new ResponseException(
        'Vui lòng cung cấp email hoặc số điện thoại hợp lệ',
        false,
        HttpStatus.BAD_REQUEST,
      );
    }
    const emailOrPhone = email || phone;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.userUrl}/account/forgot-password`, {
          identifier: emailOrPhone,
        }),
      );

      if (!data.data || !data.data._id) {
        throw new ResponseException(
          'Tài khoản không tồn tại',
          false,
          HttpStatus.BAD_REQUEST,
        );
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const prefix = `otp:user:${data.data.id}`;
      await this.redisService.set(prefix, otp, 60 * 5);

      const type = email ? 'email' : 'phone';
      await this.rabbitmq.publish('user.send-otp.set', {
        userId: data.data.userId,
        name: data.data.name,
        otp,
        type,
        emailOrPhone,
      });

      return { userId: data.data.userId };
    } catch (error) {
      throw new ResponseException(
        error.response?.data?.message || 'Không thể gửi OTP',
        false,
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ---------- Xác thực OTP ----------
  async verifyOtp(userId: string, otp: string) {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.userUrl}/account/find`, {
          userId: userId,
        }),
      );

      if (!data.data || !data.data.userId) {
        throw new ResponseException(
          'Tài khoản không tồn tại',
          false,
          HttpStatus.BAD_REQUEST,
        );
      }

      const prefix = `otp:user:${userId}`;
      const cachedOtp = await this.redisService.get(prefix);
      if (!cachedOtp || cachedOtp !== otp) {
        throw new ResponseException(
          'OTP không hợp lệ hoặc đã hết hạn',
          false,
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.redisService.del(prefix);
      return { userId: data.data.userId };
    } catch (error) {
      throw new ResponseException(
        error.message || 'Xác thực OTP thất bại',
        false,
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ---------- Tạo mật khẩu mới ----------
  async createNewPassword(userId: string, newPassword: string) {
    if (!userId) {
      throw new ResponseException(
        'Cập nhật password thất bại vì userId không tồn tại',
        false,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(`${this.userUrl}/account/reset-password`, {
          userId,
          newPassword,
        }),
      );

      return { userId: data.data.userId };
    } catch (error) {
      throw new ResponseException(
        error.response?.data?.message || 'Cập nhật mật khẩu thất bại',
        false,
        error.response?.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ---------- Xóa FCM token ----------
  async removeFcmToken(userId: string, { fcmToken }: FcmTokenDto) {
    try {
      await this.rabbitmq.publish('user.fcmtoken.remove', {
        userId: userId,
        fcmToken,
      });
      return { userId };
    } catch (error) {
      throw new ResponseException(
        error.message || 'Xóa FCM token thất bại',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ---------- Đăng xuất ----------
  async logout(userId: string, token: string, fcmtoken?: string) {
    try {
      if (token) {
        await removeAllToken(token, this.redisService);
      }
      if (userId && fcmtoken) {
        await this.removeFcmToken(userId, { fcmToken: fcmtoken });
      }
      return { userId: userId };
    } catch (error) {
      throw new ResponseException(
        error.message || 'Đăng xuất thất bại',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
