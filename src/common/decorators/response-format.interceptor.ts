// src/common/interceptors/response-format.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { TranslationService } from 'src/translation/translation.service';
import {
  RESPONSE_MESSAGE_KEY,
  ResponseMessageOptions,
} from 'src/common/decorators/response-message.decorator';

interface FormattedResponse<T> {
  status_code: number;
  title: string;
  body: string;
  data: T | null;
}

const METHOD_MESSAGES: Record<string, string> = {
  GET: 'Loaded successfully',
  POST: 'Created successfully',
  PATCH: 'Updated successfully',
  PUT: 'Updated successfully',
  DELETE: 'Deleted successfully',
};

@Injectable()
export class ResponseFormatInterceptor<T> implements NestInterceptor<T, any> {
  constructor(
    private readonly translationService: TranslationService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    const user = request.user;

    if (response.statusCode === HttpStatus.NO_CONTENT) {
      return next.handle(); // 204 stays body-less
    }

    const override = this.reflector.get<ResponseMessageOptions>(
      RESPONSE_MESSAGE_KEY,
      context.getHandler(),
    );

    const message = override?.message ?? METHOD_MESSAGES[request.method] ?? 'Success';
    const shouldTranslate = override?.translate ?? true;

    return next.handle().pipe(
      switchMap((data) =>
        from(
          this.buildResponse(
            data,
            message,
            response.statusCode,
            user,
            shouldTranslate,
          ),
        ),
      ),
    );
  }

  private async buildResponse(
    data: T,
    message: string,
    statusCode: number,
    user: any,
    shouldTranslate: boolean,
  ): Promise<FormattedResponse<T>> {
    const title = shouldTranslate
      ? await this.translationService.translateText(message, { user })
      : message;

    return {
      status_code: statusCode,
      title,
      body: title,
      data: data ?? null,
    };
  }
}