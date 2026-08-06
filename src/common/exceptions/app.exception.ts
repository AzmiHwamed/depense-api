// src/common/exceptions/app.exception.ts
import { HttpException } from '@nestjs/common';

export interface AppExceptionOptions {
  statusCode: number;
  message: string;
  translate?: boolean; // default true
}

/**
 * Throw this instead of NotFoundException/BadRequestException etc.
 * when you want a specific title/body message in the response.
 *
 * throw new AppException({
 *   statusCode: 404,
 *   message: 'Country not found',
 * });
 *
 * throw new AppException({
 *   statusCode: 400,
 *   message: 'INVALID_CURRENCY_CODE', // e.g. a fixed error code, don't translate
 *   translate: false,
 * });
 */
export class AppException extends HttpException {
  public readonly translate: boolean;

  constructor(options: AppExceptionOptions) {
    super(options.message, options.statusCode);
    this.translate = options.translate ?? true;
  }
}