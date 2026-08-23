import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from './entities/receipt-item.entity';
import { OcrExtractionResultDto } from './dto/ocr-extraction-result.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { FindReceiptsQueryDto } from './dto/find-receipts-query.dto';
import { ReceiptExtractionService } from './receipt-extraction.service';
import { User } from 'src/user/entities/user.entity';
import { CurrencyService } from 'src/currency/currency.service';
import { ReceiptWithConversion } from './dto/receipt-with-conversion.dto';
import { ExpenseCategory } from 'src/expense-category/entities/expense-category.entity';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NOTIFICATION_EVENT,
  NotificationDispatchEvent,
} from 'src/notification/notification.events';

@Injectable()
export class ReceiptsService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    @InjectRepository(ReceiptItem)
    private readonly itemRepo: Repository<ReceiptItem>,
    private readonly extractionService: ReceiptExtractionService,
    private readonly currencyService: CurrencyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Extract a receipt for guest preview without writing any SQL rows. */
  async extractWithoutSave(file: Express.Multer.File): Promise<ReceiptWithConversion> {
    const result = await this.extractionService.extract(file);
    const receipt = this.receiptRepo.create({
      id: `guest-${Date.now()}`,
      documentType: result.document_type || 'receipt',
      language: result.language ?? null,
      country: result.country ?? null,
      merchant: result.merchant ?? null,
      address: result.address ?? null,
      phone: result.phone ?? null,
      invoiceNumber: result.invoice_number ?? null,
      date: result.date ?? null,
      time: result.time ?? null,
      currency: result.currency ?? null,
      subtotal: result.subtotal ?? null,
      tax: result.tax ?? null,
      total: result.total ?? null,
      paymentMethod: result.payment_method ?? null,
      rawText: result.raw_text ?? null,
      originalFileName: file.originalname,
      imageMimeType: file.mimetype,
      items: (result.items ?? []).map((item) => this.itemRepo.create({
        name: item.name,
        description: item.description ?? null,
        quantity: item.quantity ?? 1,
        unitPrice: item.unit_price ?? null,
        totalPrice: item.total_price ?? null,
      })),
    } as Partial<Receipt>);
    return this.withConvertedAmounts(receipt);
  }

  /**
   * CREATE (via extraction): send the uploaded image to the OCR service,
   * then persist whatever it returns as a new Receipt + ReceiptItems.
   */
  async extractAndSave(
    file: Express.Multer.File,
    user: User,
  ): Promise<ReceiptWithConversion> {
    const result: OcrExtractionResultDto =
      await this.extractionService.extract(file);

    const receipt = this.receiptRepo.create({
      userId: user.id,
      documentType: result.document_type || 'receipt',
      language: result.language ?? null,
      country: result.country ?? null,
      merchant: result.merchant ?? null,
      address: result.address ?? null,
      phone: result.phone ?? null,
      invoiceNumber: result.invoice_number ?? null,
      date: result.date ?? null,
      time: result.time ?? null,
      currency: result.currency ?? null,
      subtotal: result.subtotal ?? null,
      tax: result.tax ?? null,
      total: result.total ?? null,
      paymentMethod: result.payment_method ?? null,
      rawText: result.raw_text ?? null,
      originalFileName: file.originalname,
      imageMimeType: file.mimetype,

      items: (result.items ?? []).map((item) =>
        this.itemRepo.create({
          name: item.name,
          description: item.description ?? null,
          quantity: item.quantity ?? 1,
          unitPrice: item.unit_price ?? null,
          totalPrice: item.total_price ?? null,
        }),
      ),
    } as Partial<Receipt>);

    const saved = await this.receiptRepo.save(receipt);

    this.eventEmitter.emit(
      NOTIFICATION_EVENT,
      new NotificationDispatchEvent(
        'Receipt extracted',
        `${saved.merchant ? `${saved.merchant} receipt` : 'Your receipt'} was extracted successfully`,
        user.id,
        {
          type: 'receipt.extracted',
          receiptId: saved.id,
          merchant: saved.merchant ?? '',
          total: saved.total == null ? '' : String(saved.total),
          currency: saved.currency ?? '',
        },
      ),
    );

    return this.withConvertedAmounts(saved, user);
  }
  async getReceiptRecommendations(userId: string, receiptId: string) {
    const receipt = await this.receiptRepo.findOne({
      where: { id: receiptId, userId },
    });

    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }

    const categories = await this.categoryRepo.find({
      where: { userId },
    });

    const expenseData = {
      merchant: receipt.merchant,
      date: receipt.date,
      total: receipt.total,
      currency: receipt.currency,
      items: receipt.items,
    };

    const [categoryRecommendation, descriptionRecommendation] =
      await Promise.all([
        this.extractionService.recommendExpenseType(categories, expenseData),
        this.extractionService.recommendExpenseDescription(expenseData),
      ]);

    return {
      categoryRecommendation,
      descriptionRecommendation,
    };
  }

  private async withConvertedAmounts(
    receipt: Receipt,
    user?: User,
  ): Promise<ReceiptWithConversion> {
    if (!user || !user.currencyId || !receipt.currency) {
      return this.attachConverted(receipt, null);
    }

    const receiptCurrency = await this.currencyService.findByCode(
      receipt.currency,
    );
    if (!receiptCurrency) {
      return this.attachConverted(receipt, null);
    }

    const rate =
      receiptCurrency.id === user.currencyId
        ? 1
        : (
            await this.currencyService.convert(
              1,
              receiptCurrency.id,
              user.currencyId,
            )
          ).convertedAmount;

    return this.attachConverted(receipt, rate);
  }

  private attachConverted(
    receipt: Receipt,
    rate: number | null,
  ): ReceiptWithConversion {
    const convert = (value: number | null): number | null => {
      if (value === null || value === undefined || rate === null) return null;
      return Math.round(value * rate * 100) / 100;
    };

    return {
      ...receipt,
      convertedSubtotal: convert(receipt.subtotal),
      convertedTax: convert(receipt.tax),
      convertedTotal: convert(receipt.total),
      items: (receipt.items ?? []).map((item) => ({
        ...item,
        convertedUnitPrice: convert(item.unitPrice),
        convertedTotalPrice: convert(item.totalPrice),
      })),
    };
  }

  // READ (list, with basic pagination + merchant filter)
  async findAll(userId: string) {
    const data = await this.receiptRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      data,
    };
  }

  // READ (single)
  async findOne(userId: string, id: string): Promise<Receipt> {
    const receipt = await this.receiptRepo.findOne({ where: { id, userId } });
    if (!receipt) {
      throw new NotFoundException(`Receipt ${id} not found`);
    }
    return receipt;
  }

  // UPDATE
  async update(
    userId: string,
    id: string,
    dto: UpdateReceiptDto,
  ): Promise<Receipt> {
    const receipt = await this.findOne(userId, id);

    const { items, ...rest } = dto;
    Object.assign(receipt, rest);

    if (items) {
      receipt.items = items.map((item) =>
        this.itemRepo.create({
          id: item.id, // if present, TypeORM upserts that row; else inserts new
          name: item.name,
          description: item.description ?? null,
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? null,
          totalPrice: item.totalPrice ?? null,
        }),
      );
    }

    return this.receiptRepo.save(receipt);
  }

  // DELETE
  async remove(userId: string, id: string): Promise<void> {
    const receipt = await this.findOne(userId, id);
    await this.receiptRepo.remove(receipt);
  }
}
