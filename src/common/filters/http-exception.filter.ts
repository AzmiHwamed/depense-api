// src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import { TranslationService } from 'src/translation/translation.service';
import { AppException } from 'src/common/exceptions/app.exception';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly translationService: TranslationService) {}

  async catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();
    const user = request.user;

    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Nest's built-in exceptions (NotFoundException, BadRequestException, etc.)
    // put the message in `.message`, which can be a string or string[]
    // (class-validator errors come back as an array).
    let rawMessage: string;
    if (typeof exceptionResponse === 'string') {
      rawMessage = exceptionResponse;
    } else if (Array.isArray((exceptionResponse as any)?.message)) {
      rawMessage = (exceptionResponse as any).message.join(', ');
    } else {
      rawMessage = (exceptionResponse as any)?.message ?? exception.message;
    }

    // AppException lets a specific throw site opt out of translation
    // (e.g. for fixed error codes). Everything else translates by default.
    const shouldTranslate =
      exception instanceof AppException ? exception.translate : true;

    let title = rawMessage;

    if (shouldTranslate) {
      try {
        title = await this.translationService.translateText(rawMessage, {
          user,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to translate error message, using original: ${error}`,
        );
        title = rawMessage;
      }
    }

    response.status(statusCode).json({
      status_code: statusCode,
      title,
      body: title,
      data: null,
    });
  }
}