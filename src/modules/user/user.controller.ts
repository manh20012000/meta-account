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
 import { SearchUserDto } from './dto/search.dto';
  import { ResponseException } from 'src/configuars/response/response.exception';
  import { Response } from 'express'; // For setting cookies if needed
import { UserService } from './user.service';
  
  @Controller('user')
  export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('search')
    async searchUsers(@Query() searchDto: SearchUserDto) {
      try {
        const { users } = await this.userService.searchUserFindText(searchDto);
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
  