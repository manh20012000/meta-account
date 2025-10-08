// dto/create-user.dto.ts
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  Validate,
  IsMobilePhone,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// ---------- Helpers ----------
const toUndefIfEmpty = (v: unknown) =>
  typeof v === 'string' && v.trim() === '' ? undefined : v;

const normalizeEmail = ({ value }: { value: any }) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed.toLowerCase();
};

// rất đơn giản: giữ dấu + đầu, còn lại chỉ là số
const normalizePhone = ({ value }: { value: any }) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed === '') return undefined;
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/[^\d]/g, '');
  const out = plus + digits;
  return out.length ? out : undefined;
};

// ========== CREATE ==========
export class CreateUserDto {
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(normalizePhone)
  // dùng IsMobilePhone('any') cho coverage rộng; có thể đổi 'vi-VN' nếu chỉ VN
  phone?: string;
  @IsOptional()
  @Transform(normalizePhone)
  countryCode?: string;

  @Transform(({ value }) =>
    value === undefined || value === null ? value : String(value),
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsDateString()
  birthday?: string;

  @IsOptional()
  gender?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  avatar?: string;
}

// ========== LOGIN ==========
export class LoginDto {
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(normalizePhone)
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  deviceId?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  fcmtoken?: string;
}

// ========== GOOGLE LOGIN ==========
export class GoogleUserPayloadDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email!: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  firstName?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  gender?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  // Trong GoogleUserPayloadDto
  @IsOptional()
  @Transform(normalizePhone)
  phone?: string;

  @IsOptional()
  @Transform(normalizePhone)
  countryCode?: string;
}

export class GoogleLoginDto {
  @ValidateNested()
  @Type(() => GoogleUserPayloadDto)
  user: GoogleUserPayloadDto;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  deviceId?: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  fcmtoken?: string;
}

// ========== MISC ==========
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}

export class FcmTokenDto {
  @IsString()
  @IsNotEmpty()
  fcmToken!: string;
}

export class SearchUserDto {
  @IsString()
  @IsNotEmpty()
  keyword!: string;

  @IsOptional()
  @IsUUID()
  _id?: string;
}
