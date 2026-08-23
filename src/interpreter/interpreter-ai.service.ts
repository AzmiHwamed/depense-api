import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import FormData from 'form-data';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class InterpreterAiService {
  private readonly baseUrl: string;
  private readonly receiptAiBaseUrl: string;
  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>(
      'TRANSLATOR_SERVICE_URL',
      'http://localhost:8000',
    );
    this.receiptAiBaseUrl = config.get<string>(
      'OCR_SERVICE_URL',
      'http://localhost:8005',
    );
  }

  async transcribe(
    file: Express.Multer.File,
    language: string,
  ): Promise<string> {
    const form = new FormData();
    form.append('audio', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
    form.append('language', language);
    try {
      const response = await firstValueFrom(
        this.http.post<{ transcript: string }>(
          `${this.baseUrl}/ai/speech-to-text`,
          form,
          { headers: form.getHeaders(), maxBodyLength: 11 * 1024 * 1024 },
        ),
      );
      return response.data.transcript;
    } catch (error) {
      throw new BadGatewayException(
        this.errorMessage(error, 'Speech recognition failed'),
      );
    }
  }

  async synthesize(
    text: string,
    language: string,
  ): Promise<{ audio: Buffer; mimeType: string }> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ audio: string; mimeType: string }>(
          `${this.baseUrl}/ai/text-to-speech`,
          { text, language },
        ),
      );
      return {
        audio: Buffer.from(response.data.audio, 'base64'),
        mimeType: response.data.mimeType,
      };
    } catch (error) {
      throw new BadGatewayException(
        this.errorMessage(error, 'Speech synthesis failed'),
      );
    }
  }

  async translate(
    text: string,
    source: string,
    target: string,
  ): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ translation: string }>(
          `${this.baseUrl}/ai/translate`,
          {
            text,
            source,
            target,
          },
        ),
      );
      return response.data.translation;
    } catch (error) {
      throw new BadGatewayException(
        this.errorMessage(error, 'Translation failed'),
      );
    }
  }

  async describePlace(place: {
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    placeType?: string;
    languageCode: string;
  }): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ description: string }>(
          `${this.receiptAiBaseUrl}/ai/place-description`,
          {
            name: place.name,
            latitude: place.latitude,
            longitude: place.longitude,
            address: place.address,
            place_type: place.placeType,
            language_code: place.languageCode,
          },
        ),
      );
      return response.data.description;
    } catch (error) {
      throw new BadGatewayException(
        this.errorMessage(error, 'Place description generation failed'),
      );
    }
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.response?.data?.detail ?? error?.message ?? fallback;
  }
}
