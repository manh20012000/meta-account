// dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, MinLength, IsEnum, IsDateString } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other', 'unknown'])
  gender?: 'male' | 'female' | 'other' | 'unknown';

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class GoogleLoginDto {
  // Assuming user object from Google: email, name, etc.
  user: {
    email: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    birthday?: string;
    gender?: string;
    avatar?: string;
    password?: string; // Might not be present for Google
  };
  deviceId?: string;
}

export class RefreshTokenDto {
  refreshToken: string;
}

export class FcmTokenDto {
  fcmToken: string;
}

export class SearchUserDto {
  keyword: string;
  _id?: string; // Current user ID for context
}