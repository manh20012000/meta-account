// auth/token.utils.ts
import * as jwt from 'jsonwebtoken';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { RedisDataService } from 'src/configuars/redis/redis-data.service';

interface UserInfo {
  id: string;
  name: string;
  avatar?: string;
  userId: string;
}

export async function generateAccessToken(
  userInfo: UserInfo,
  configService: ConfigService,
  redisService: RedisDataService,
): Promise<string> {
  if (!userInfo.  id) {
    throw new Error('User ID is required');
  }
  try {
    const jwtSecret = configService.get('JWT_SECRET') || 'your-secret-key';
    const token = jwt.sign({ userId: userInfo.userId }, jwtSecret, {
      expiresIn: '72h', // 72 hours as per original
    });

    // Lưu token vào Redis với prefix user:${token} và data là { id, name, avatar }
    await redisService.set(`user:${token}`, {
      id: userInfo.id, // Sửa: dùng 'id' thay vì '_id' để nhất quán
      name: userInfo.name,
      avatar: userInfo.avatar,
      userId: userInfo.userId,
    });

    return token;
  } catch (error) {
    console.error('Error generating access token:', error);
    throw error;
  }
}

export async function generateRefreshToken(
  userInfo: UserInfo,
  configService: ConfigService,
  redisService: RedisDataService,
): Promise<string> {
  if (!userInfo.userId) {  
    throw new Error('User ID is required');
  }
  try {
    const jwtSecret = configService.get('JWT_SECRET') || 'your-secret-key'; // Original uses same secret, adapt if needed
    const token = jwt.sign({ userId: userInfo.userId }  , jwtSecret, {
      expiresIn: '15d', // 15 days as per original
    });

    // Lưu refresh token vào Redis tương tự (nếu cần, với TTL khác)
    // Lưu ý: Nếu access và refresh token khác nhau, key sẽ khác nên không xung đột
    const ttl = 15 * 24 * 60 * 60 * 1000; // 15 days in ms
    await redisService.set(
      `${'user:'}${token}`,
      {
        id: userInfo.id, // Sửa: dùng 'id' thay vì '_id' để nhất quán
        name: userInfo.name,
        avatar: userInfo.avatar,
        userId: userInfo.userId,
      },
      ttl,
    );

    return token;
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw error;
  }
}

export function setTokensInCookies(
  accessToken: string,
  refreshToken: string,
  res: Response,
  configService: ConfigService,
): void {
  const isDevelopment = configService.get('NODE_ENV') === 'development';
  res.cookie('jwt', accessToken, {
    maxAge: 48 * 60 * 60 * 1000, // 48 hours in ms
    httpOnly: true,
    sameSite: 'strict',
    secure: !isDevelopment,
  });
  res.cookie('jwtfresh', refreshToken, {
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in ms
    httpOnly: true,
    sameSite: 'strict',
    secure: !isDevelopment,
  });
}
export async function removeAllToken(
  token: string,
  redisService: RedisDataService,
) {
  await redisService.del(`user:${token}`);
}

export async function resetDeviceState(
  userId: string,
  deviceId: string,
  redisService: RedisDataService, // Thêm param để inject RedisDataService
): Promise<void> {
  const offlineKey = `offline_user:${userId}:${deviceId}`;
  try {
    await redisService.del(offlineKey); // Sửa: dùng redisService.del thay vì this.redisService (vì đây là function, không phải class method)
  } catch (error) {
    console.error('❌ resetDeviceState error:', error);
    // Optionally throw or handle as needed
  }
}

export async function revokeToken(
  token: string,
  redisService: RedisDataService,
  isRefresh: boolean = false, // Để phân biệt nếu cần TTL khác, nhưng dùng chung key
): Promise<void> {
  try {
    const key = `user:${token}`;
    await redisService.del(key);
    console.log(`Token revoked from Redis: ${key}`);
  } catch (error) {
    console.error('Error revoking token:', error);
    throw error;
  }
}
