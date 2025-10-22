import {
  Controller,
  Post,
  Body,
  HttpStatus,
  Res,
  Delete,
  Param,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import {
  CreateUserDto,
  LoginDto,
  GoogleLoginDto,
  RefreshTokenDto,
  FcmTokenDto,
} from './dto/create-user.dto';
import { ResponseException } from 'src/configuars/response/response.exception';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------- Đăng ký người dùng ----------
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiOkResponse({
    description: 'User registered successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: {
            id: '66f8e1234567890abcdef123',
            email: 'user@example.com',
            name: 'John Doe',
            userId: '66f8e1234567890abcdef123',
          },
        },
        statusCode: { type: 'number', example: 201 },
        message: { type: 'string', example: 'Đăng ký thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Cần cung cấp ít nhất email hoặc số điện thoại',
        },
        status: { type: 'boolean', example: false },
        error: {
          type: 'string',
          example: 'Cần cung cấp ít nhất email hoặc số điện thoại',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict (e.g., email or phone already used)',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 409 },
        message: { type: 'string', example: 'Email đã được sử dụng' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Email đã được sử dụng' },
      },
    },
  })
  async register(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    try {
      const savedUser = await this.authService.register(createUserDto);
      return res.status(HttpStatus.CREATED).json({
        data: {
          id: savedUser.data.id,
          email: savedUser.data.email,
          name: savedUser.data.name,
          userId: savedUser.data.userId,
        },
        statusCode: HttpStatus.CREATED,
        message: 'Đăng ký thành công',
        status: true,
        error: null,
      });
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Đăng ký thất bại';
      return res.status(statusCode).json({
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      });
    }
  }

  // ---------- Đăng nhập người dùng ----------
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiBody({
    type: LoginDto,
    examples: {
      emailLogin: {
        summary: 'Login with email',
        value: {
          email: 'user@example.com',
          password: 'securePassword123',
          deviceId: 'device123',
          fcmtoken: 'fcm_token_example',
        },
      },
      phoneLogin: {
        summary: 'Login with phone',
        value: {
          phone: '+1234567890',
          password: 'securePassword123',
          deviceId: 'device123',
          fcmtoken: 'fcm_token_example',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'User logged in successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: {
            id: '66f8e1234567890abcdef123',
            email: 'user@example.com',
            name: 'John Doe',
            avatar: 'https://example.com/avatar.jpg',
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Đăng nhập thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Mật khẩu không đúng' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Mật khẩu không đúng' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Tài khoản không tồn tại' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Tài khoản không tồn tại' },
      },
    },
  })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const { user, access_token, refresh_token } = await this.authService.login(loginDto);
      return {
        data: {
          ...user,
          access_token,
          refresh_token,
        },
        statusCode: HttpStatus.OK,
        message: 'Đăng nhập thành công',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Đăng nhập thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Đăng nhập bằng Google ----------
  @Post('google')
  @ApiOperation({ summary: 'Login with Google' })
  @ApiBody({
    type: GoogleLoginDto,
    examples: {
      googleLogin: {
        summary: 'Google login example',
        value: {
          user: {
            email: 'user@google.com',
            name: 'John Doe',
            firstName: 'John',
            lastName: 'Doe',
            avatar: 'https://example.com/google-avatar.jpg',
          },
          deviceId: 'device123',
          fcmtoken: 'fcm_token_example',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Google login successful',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: {
            id: '66f8e1234567890abcdef123',
            email: 'user@google.com',
            name: 'John Doe',
            avatar: 'https://example.com/google-avatar.jpg',
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Đăng nhập Google thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Email không hợp lệ' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Email không hợp lệ' },
      },
    },
  })
  async loginWithGoogle(@Body() googleDto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    try {
      const { user, access_token, refresh_token } = await this.authService.loginWithGoogle(googleDto);
      return {
        data: {
          ...user,
          access_token,
          refresh_token,
        },
        statusCode: HttpStatus.OK,
        message: 'Đăng nhập Google thành công',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Đăng nhập Google thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Làm mới token ----------
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      refreshToken: {
        summary: 'Refresh token example',
        value: {
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: {
            id: '66f8e1234567890abcdef123',
            email: 'user@example.com',
            name: 'John Doe',
            avatar: 'https://example.com/avatar.jpg',
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Làm mới token thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Token không hợp lệ hoặc hết hạn' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Token không hợp lệ hoặc hết hạn' },
      },
    },
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const { user, access_token, refresh_token } = await this.authService.refreshToken(refreshTokenDto);
      return {
        data: {
          ...user,
          access_token,
          refresh_token,
        },
        statusCode: HttpStatus.OK,
        message: 'Làm mới token thành công',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Làm mới token thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Quên mật khẩu (gửi OTP) ----------
  @Post('forget-password')
  @ApiOperation({ summary: 'Request password reset OTP' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        identifier: { type: 'string', example: 'user@example.com' },
      },
      required: ['identifier'],
    },
  })
  @ApiOkResponse({
    description: 'OTP sent successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: { userId: '66f8e1234567890abcdef123' },
        },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'OTP đã được gửi đến người dùng' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Vui lòng cung cấp email hoặc số điện thoại hợp lệ',
        },
        status: { type: 'boolean', example: false },
        error: {
          type: 'string',
          example: 'Vui lòng cung cấp email hoặc số điện thoại hợp lệ',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Tài khoản không tồn tại' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Tài khoản không tồn tại' },
      },
    },
  })
  async forgetPassword(@Body() body: { identifier: string }) {
    try {
      const result = await this.authService.forgetPassword(body.identifier);
      return {
        data: { userId: result.userId },  
        statusCode: HttpStatus.OK,
        message: 'OTP đã được gửi đến người dùng',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Xử lý quên mật khẩu thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Xác thực OTP ----------
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '66f8e1234567890abcdef123' },
        otp: { type: 'string', example: '123456' },
      },
      required: ['userId', 'otp'],
    },
  })
  @ApiOkResponse({
    description: 'OTP verified successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: { userId: '66f8e1234567890abcdef123' },
        },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Xác thực OTP thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'OTP không hợp lệ hoặc đã hết hạn' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'OTP không hợp lệ hoặc đã hết hạn' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Tài khoản không tồn tại' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Tài khoản không tồn tại' },
      },
    },
  })
  async verifyOtp(@Body() body: { userId: string; otp: string }) {
    try {
      const result = await this.authService.verifyOtp(body.userId, body.otp);
      return {
        data: { userId: result.userId },
        statusCode: HttpStatus.OK,
        message: 'Xác thực OTP thành công',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Xác thực OTP thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Đặt lại mật khẩu ----------
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '66f8e1234567890abcdef123' },
        newPassword: { type: 'string', example: 'newSecurePassword123' },
      },
      required: ['userId', 'newPassword'],
    },
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: {
            id: '66f8e1234567890abcdef123',
            email: 'user@example.com',
          },
        },
        statusCode: { type: 'number', example: 200 },
        message: {
          type: 'string',
          example: 'Mật khẩu đã được cập nhật thành công',
        },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Cập nhật password thất bại vì userId không tồn tại',
        },
        status: { type: 'boolean', example: false },
        error: {
          type: 'string',
          example: 'Cập nhật password thất bại vì userId không tồn tại',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Tài khoản không tồn tại' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Tài khoản không tồn tại' },
      },
    },
  })
  async createNewPassword(@Body() body: { userId: string; newPassword: string }) {
    try {
      const result = await this.authService.createNewPassword(
        body.userId,
        body.newPassword,
      );
      return {
        data: result.userId,
        statusCode: HttpStatus.OK,
        message: 'Mật khẩu đã được cập nhật thành công',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Đặt lại mật khẩu thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Xóa FCM token ----------
  @Delete(':id/fcm-token')
  @ApiOperation({ summary: 'Remove FCM token' })
  @ApiBody({
    type: FcmTokenDto,
    examples: {
      fcmToken: {
        summary: 'FCM token example',
        value: {
          fcmToken: 'fcm_token_example',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'FCM token removed successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          example: { userId: '66f8e1234567890abcdef123' },
        },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Xóa FCM token thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Xóa FCM token thất bại' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Xóa FCM token thất bại' },
      },
    },
  })
  async removeFcmToken(@Param('id') id: string, @Body() fcmTokenDto: FcmTokenDto) {
    try {
       const result= await this.authService.removeFcmToken(id, fcmTokenDto);
      return {
        data: { userId: result.userId },
        statusCode: HttpStatus.OK,
        message: 'Xóa FCM token thành công',
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Xóa FCM token thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }

  // ---------- Đăng xuất ----------
  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '66f8e1234567890abcdef123' },
        fcmtoken: { type: 'string', example: 'fcm_token_example' },
      },
      required: ['userId'],
    },
  })
  @ApiOkResponse({
    description: 'User logged out successfully',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Đăng xuất thành công' },
        status: { type: 'boolean', example: true },
        error: { type: 'string', example: null },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'null', example: null },
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Thiếu token trong header' },
        status: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Thiếu token trong header' },
      },
    },
  })
  async logout(
    @Headers('authorization') authHeader: string,
    @Body() body: { userId: string; fcmtoken: string },
  ) {
    try {
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
      if (!token) {
        throw new ResponseException(
          'Thiếu token trong header',
          false,
          HttpStatus.UNAUTHORIZED,
        );
      }

      const result = await this.authService.logout(body.userId, token, body.fcmtoken);
      return {
        data: { userId: result.userId },
        statusCode: HttpStatus.OK,
        message: 'Đăng xuất thành công',  
        status: true,
        error: null,
      };
    } catch (error) {
      const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      const message = error.message || 'Đăng xuất thất bại';
      return {
        data: null,
        statusCode,
        message,
        status: false,
        error: message,
      };
    }
  }
}