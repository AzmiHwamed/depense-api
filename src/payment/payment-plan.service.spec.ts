import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentPlan } from './entities/payment-plan.entity';
import { Currency } from '../currency/entities/currency.entity';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { CurrencyService } from '../currency/currency.service';
import { UpdatePaymentPlanDto } from './dto/update-payment-plan.dto';

export interface PlanWithConvertedPrice {
  id: string;
  name: string;
  description: string;
  tokenCount: number;
  price: number;
  currency: { id: string; code: string; name: string };
  isActive: boolean;
}

@Injectable()
export class PaymentPlanService {
  constructor(
    @InjectRepository(PaymentPlan) private planRepo: Repository<PaymentPlan>,
    @InjectRepository(Currency) private currencyRepo: Repository<Currency>,
    private currencyService: CurrencyService,
  ) {}

  // ── CRUD, all keyed by your own DB id ────────────────────
  findAllRaw(): Promise<PaymentPlan[]> {
    return this.planRepo.find({ order: { tokenCount: 'ASC' } });
  }

  async findOneRaw(id: string): Promise<PaymentPlan> {
    const plan = await this.planRepo.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Payment plan ${id} not found`);
    return plan;
  }

  async create(dto: CreatePaymentPlanDto): Promise<PaymentPlan> {
    const currency = await this.currencyRepo.findOne({
      where: { id: dto.baseCurrencyId },
    });
    if (!currency)
      throw new BadRequestException(`Currency ${dto.baseCurrencyId} not found`);

    const plan = this.planRepo.create(dto);
    return this.planRepo.save(plan);
  }

  async update(id: string, dto: UpdatePaymentPlanDto): Promise<PaymentPlan> {
    const plan = await this.findOneRaw(id);

    if (dto.baseCurrencyId) {
      const currency = await this.currencyRepo.findOne({
        where: { id: dto.baseCurrencyId },
      });
      if (!currency)
        throw new BadRequestException(
          `Currency ${dto.baseCurrencyId} not found`,
        );
    }

    Object.assign(plan, dto);
    return this.planRepo.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findOneRaw(id);
    await this.planRepo.remove(plan);
  }

  // ── Plans converted to a target currency (e.g. the calling user's) ──
  async findAllInCurrency(
    targetCurrencyId: string,
  ): Promise<PlanWithConvertedPrice[]> {
    const plans = await this.planRepo.find({
      where: { isActive: true },
      order: { tokenCount: 'ASC' },
    });

    const targetCurrency = await this.currencyRepo.findOne({
      where: { id: targetCurrencyId },
    });
    if (!targetCurrency)
      throw new BadRequestException(`Currency ${targetCurrencyId} not found`);

    return Promise.all(
      plans.map(async (plan) => {
        // Same currency — no conversion needed, avoid an unnecessary API call
        if (plan.baseCurrencyId === targetCurrency.id) {
          return {
            id: plan.id,
            name: plan.name,
            description: plan.description,
            tokenCount: plan.tokenCount,
            price: Number(plan.basePrice),
            currency: {
              id: targetCurrency.id,
              code: targetCurrency.code,
              name: targetCurrency.name,
            },
            isActive: plan.isActive,
          };
        }

        const converted = await this.currencyService.convert(
          Number(plan.basePrice),
          plan.baseCurrencyId,
          targetCurrency.id,
        );

        return {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          tokenCount: plan.tokenCount,
          price: converted.convertedAmount,
          currency: {
            id: targetCurrency.id,
            code: targetCurrency.code,
            name: targetCurrency.name,
          },
          isActive: plan.isActive,
        };
      }),
    );
  }

  async findAllInCurrencyCode(
    targetCurrencyCode: string,
  ): Promise<PlanWithConvertedPrice[]> {
    const currency = await this.currencyRepo.findOne({
      where: { code: targetCurrencyCode },
    });
    if (!currency) {
      throw new BadRequestException(`Currency ${targetCurrencyCode} not found`);
    }
    return this.findAllInCurrency(currency.id);
  }
}
