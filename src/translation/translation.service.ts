import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { User } from 'src/user/entities/user.entity'; // adjust path if needed
import {
  TranslateJsonResponse,
  TranslateTextResponse,
} from './translation.interfaces';

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'TRANSLATOR_SERVICE_URL',
      'http://localhost:8000',
    );
  }

  /**
   * Resolves the effective target language:
   * explicit `target` wins, then the user's saved language,
   * falling back to English if neither is available.
   */
  private resolveTarget(user?: User, target?: string): string {
    return target ?? user?.language?.name ?? 'English';
  }

  /**
   * Translates a single string. If the translation service is
   * unreachable or errors, falls back to the original text instead
   * of throwing - a translation outage should never break a request.
   */
  async translateText(
    text: string,
    options: { target?: string; source?: string; user?: User } = {},
  ): Promise<string> {
    const target = this.resolveTarget(options.user, options.target);

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<TranslateTextResponse>(
          `${this.baseUrl}/ai/translate`,
          {
            text,
            target,
            source: options.source ?? null,
          },
        ),
      );

      return data.translation;
    } catch (error) {
      this.logFailure(error, 'translateText');
      return text; // fall back to original, untranslated text
    }
  }

  /**
   * Translates JSON string values. If the translation service is
   * unreachable or errors, falls back to the original data untranslated
   * instead of throwing.
   */
  async translateJson<T = any>(
    data: any,
    options: {
      target?: string;
      source?: string;
      ignoreKeys?: string[];
      user?: User;
    } = {},
  ): Promise<T> {
    const target = this.resolveTarget(options.user, options.target);

    try {
      const response = await firstValueFrom(
        this.httpService.post<TranslateJsonResponse<T>>(
          `${this.baseUrl}/ai/translate-json`,
          {
            data,
            target,
            source: options.source ?? null,
            ignore_keys: options.ignoreKeys ?? [],
          },
        ),
      );

      return response.data.data;
    } catch (error) {
      this.logFailure(error, 'translateJson');
      return data; // fall back to original, untranslated data
    }
  }

  private logFailure(error: unknown, context: string): void {
    const axiosError = error as AxiosError;

    this.logger.warn(
      `${context} failed, falling back to untranslated content: ${axiosError.message}`,
    );
  }
}