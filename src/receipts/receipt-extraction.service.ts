import { HttpService } from '@nestjs/axios';
import {
  BadGatewayException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { OcrExtractionResultDto } from './dto/ocr-extraction-result.dto';
import FormData from 'form-data';

/**
 * Talks to the existing FastAPI "Gemini Receipt OCR API"
 * (the `app.include_router(receipt.router, prefix="/ai")` service).
 */
@Injectable()
export class ReceiptExtractionService {
  private readonly logger = new Logger(ReceiptExtractionService.name);
  private readonly baseUrl: string;
  private readonly endpoint: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>(
      'OCR_SERVICE_URL',
      'http://localhost:8005',
    );
    this.endpoint = this.configService.get<string>(
      'OCR_RECEIPT_ENDPOINT',
      '/ai/receipt',
    );
    this.apiKey = this.configService.get<string>('OCR_SERVICE_API_KEY', '');
  }
  async recommendExpenseType(
    expenseTypes: any[],
    expense: any,
  ) {
    const { data } = await this.httpService.axiosRef.post(
      `${this.baseUrl}/recommend-expense-type`,
      {
        expense_types: expenseTypes,
        expense,
      },
    );

    return data;
  }
  

  async recommendExpenseDescription(
    expense: any,
  ) {
    const { data } = await this.httpService.axiosRef.post(
      `${this.baseUrl}/recommend-expense-description`,
      {
        expense,
      },
    );

    return data;
  }

  async recommendExpense(
    expenseTypes: any[],
    expense: any,
  ): Promise<{
    categoryRecommendation: any | null;
    descriptionRecommendation: any | null;
  }> {
    const { data } = await this.httpService.axiosRef.post(
      `${this.baseUrl}/ai/recommend-expense`,
      {
        expense_types: expenseTypes,
        expense,
      },
    );

    return data;
  }

  async extract(file: Express.Multer.File): Promise<OcrExtractionResultDto> {
    const form = new FormData();
    // Adjust the field name below ("file") to whatever the FastAPI
    // route's UploadFile parameter is actually named.
    form.append('file', file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const url = `${this.baseUrl}${this.endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<OcrExtractionResultDto>(url, form, {
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `OCR extraction failed: ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadGatewayException(
        'Failed to extract data from image via OCR service',
      );
    }
  }
}
