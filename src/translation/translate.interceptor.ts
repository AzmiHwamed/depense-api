// src/translation/translate.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { TRANSLATE_KEY, TranslateOptions } from './translate.decorator';
import { TranslationService } from './translation.service';

@Injectable()
export class TranslateInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly translationService: TranslationService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options =
      this.reflector.get<TranslateOptions>(
        TRANSLATE_KEY,
        context.getHandler(),
      ) ?? {};

    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by FirebaseAuthGuard

    return next.handle().pipe(
      switchMap((data) => {
        // nothing to translate (e.g. DELETE returning void)
        if (data === undefined || data === null) {
          return from([data]);
        }

        return from(
          this.translationService.translateJson(data, {
            user,
            ignoreKeys: options.ignoreKeys ?? [],
          }),
        );
      }),
    );
  }
}