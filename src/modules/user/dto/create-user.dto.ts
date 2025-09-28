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

export enum Gender {
  male = 'male',
  female = 'female',
  other = 'other',
  unknown = 'unknown',
}

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

// ---------- Custom validator: ít nhất một trong các thuộc tính không rỗng ----------
export function AtLeastOneOf(
  props: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'AtLeastOneOf',
      target: object.constructor,
      propertyName,
      constraints: [props],
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const [keys] = args.constraints as [string[]];
          return keys.some((k) => {
            const v = (args.object as any)[k];
            return typeof v === 'string' ? v.trim() !== '' : v != null;
          });
        },
        defaultMessage(args: ValidationArguments) {
          const [keys] = args.constraints as [string[]];
          return `At least one of (${keys.join(', ')}) must be provided`;
        },
      },
    });
  };
}

// ========== CREATE ==========
export class CreateUserDto {
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(normalizePhone)
  // dùng IsMobilePhone('any') cho coverage rộng; có thể đổi 'vi-VN' nếu chỉ VN
  @IsMobilePhone('vi-VN', { strictMode: false })
  phone?: string;

  @Validate(AtLeastOneOf(['email', 'phone']))
  _atLeastOne!: string; // dummy property cho validator (không cần gửi từ client)

  @IsString()
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
  @IsEnum(Gender)
  gender?: Gender;

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
  @IsMobilePhone('vi-VN', { strictMode: false })
  phone?: string;

  @Validate(AtLeastOneOf(['email', 'phone']))
  _atLeastOne!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  deviceId?: string;
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
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsDateString()
  birthday?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class GoogleLoginDto {
  @ValidateNested()
  @Type(() => GoogleUserPayloadDto)
  user!: GoogleUserPayloadDto;

  @IsOptional()
  @Transform(({ value }) => toUndefIfEmpty(value))
  @IsString()
  deviceId?: string;
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
