// src/translation/translate.decorator.ts
import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { TranslateInterceptor } from './translate.interceptor';

export const TRANSLATE_KEY = 'translate_options';

export interface TranslateOptions {
  ignoreKeys?: string[];
}

/**
 * Auto-translates the route's response based on the current user's
 * saved language preference. Put it on the handler, right alongside
 * @Get()/@Post()/etc.
 *
 * @Translate({ ignoreKeys: ['id', 'createdAt'] })
 */
export function Translate(options: TranslateOptions = {}) {
  return applyDecorators(
    SetMetadata(TRANSLATE_KEY, options),
    UseInterceptors(TranslateInterceptor),
  );
}