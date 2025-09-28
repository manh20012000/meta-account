// user.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  Put,
  HttpStatus,
  Res,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';

import {
  CreateUserDto,
  LoginDto,
  GoogleLoginDto,
  RefreshTokenDto,
  FcmTokenDto,
  SearchUserDto,
} from './dto/create-user.dto';

import { ResponseException } from 'src/configuars/response/response.exception';
import { Response } from 'express'; // For setting cookies if needed

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto, @Res() res: Response) {
    try {
      const savedUser = await this.userService.register(createUserDto);
      return res.status(HttpStatus.CREATED).json({
        message: 'Registration successful',
        data: {
          id: savedUser._id,
          email: savedUser.email,
          name: savedUser.name,
        },
        status: true,
        statusCode: HttpStatus.CREATED,
      });
    } catch (error) {
      console.log(error.message, 'error with user registration');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to register user',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { user, access_token, refresh_token } =
        await this.userService.login(loginDto);
      // Set cookies if needed: setTokensInResponse(accessToken, refreshToken, res);
      return {
        message: 'Login successful',
        data: {
          ...user,
          access_token,
          refresh_token,
        },
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with user login');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to login',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Post('login/google')
  async loginWithGoogle(
    @Body() googleDto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { user, access_token, refresh_token } =
        await this.userService.loginWithGoogle(googleDto);
      // setTokensInResponse(accessToken, refreshToken, res);
      return {
        message: 'Google login successful',
        data: {
          ...user,
          access_token,
          refresh_token,
        },
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with google login');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to login with Google',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Post('refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const { user, access_token, refresh_token } =
        await this.userService.refreshToken(refreshTokenDto);
      return {
        message: 'Token refreshed successfully',
        data: {
          ...user,
          access_token,
          refresh_token,
        },
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with refresh token');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to refresh token',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Put(':id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateUserDto>,
  ) {
    try {
      const updatedUser = await this.userService.updateUser(id, updateData);
      return {
        message: 'User updated successfully',
        data: updatedUser,
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with update user');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to update user',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Post('forget-password')
  async forgetPassword(@Body() body: { phone: string }) {
    try {
      const result = await this.userService.forgetPassword(body.phone);
      return {
        message: result.message,
        data: null,
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with forget password');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to process forget password',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Post(':id/fcm-token')
  async setFcmToken(@Param('id') id: string, @Body() fcmTokenDto: FcmTokenDto) {
    try {
      await this.userService.setFcmToken(id, fcmTokenDto);
      return {
        message: 'FCM token set successfully',
        data: { userId: id },
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with fcm token');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to set FCM token',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Delete(':id/fcm-token')
  async removeFcmToken(@Param('id') id: string, @Body() fcmTokenDto: FcmTokenDto) {
    try {
      await this.userService.removeFcmToken(id, fcmTokenDto);
      return {
        message: 'FCM token removed successfully',
        data: { userId: id },
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with remove fcm token');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to remove FCM token',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }

  @Get('search')
  async searchUsers(@Query() searchDto: SearchUserDto) {
    try {
      const { users } = await this.userService.searchUsers(searchDto);
      return {
        message: 'Search successful',
        data: users,
        status: true,
        statusCode: HttpStatus.OK,
      };
    } catch (error) {
      console.log(error.message, 'error with user search');
      if (error instanceof ResponseException) {
        throw error;
      }
      throw new ResponseException(
        'Failed to search users',
        false,
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        error.message,
      );
    }
  }
}