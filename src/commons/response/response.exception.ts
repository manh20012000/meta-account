// ResponseException.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class ResponseException extends HttpException {
  constructor(
    message: string,
    status = false,
    statusCode: number = HttpStatus.BAD_REQUEST,
    data: any = null,
    error?: any,                
  ) {
    super(
      {
        success: status,
        message,
        data,
        statusCode,
        error:
          typeof error === 'string'
            ? error
            : error?.details || error?.message || null, 
      },
      statusCode,
    );
  }
}
