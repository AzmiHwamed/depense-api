import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AiServicePrice, AiServiceKey, AI_SERVICES } from './entities/ai-service-price.entity';

const DEFAULT_AI_TOKEN_COST: Record<AiServiceKey, number> = {
  receiptScan: 3,
  interpreterTurn: 5,
  textTranslation: 1,
  tripPlan: 8,
} as const;

@Injectable()
export class TokenWalletService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(AiServicePrice) private readonly prices: Repository<AiServicePrice>,
  ) {}

  async getCost(service: AiServiceKey): Promise<number> {
    const stored = await this.prices.findOneBy({ service });
    if (stored) return stored.tokenCost;
    const price = this.prices.create({ service, tokenCost: DEFAULT_AI_TOKEN_COST[service] });
    return (await this.prices.save(price)).tokenCost;
  }

  async listPrices(): Promise<AiServicePrice[]> {
    for (const service of AI_SERVICES) await this.getCost(service);
    return this.prices.find({ order: { service: 'ASC' } });
  }

  async setPrice(service: AiServiceKey, tokenCost: number): Promise<AiServicePrice> {
    const price = await this.prices.findOneBy({ service });
    return this.prices.save({ ...(price ?? this.prices.create({ service })), tokenCost });
  }

  async spend(userId: string, cost: number, service: string): Promise<number> {
    const result = await this.users.createQueryBuilder()
      .update(User)
      .set({ tokenBalance: () => 'tokenBalance - :cost' })
      .where('id = :userId AND tokenBalance >= :cost', { userId, cost })
      .execute();
    if (result.affected) {
      const user = await this.users.findOneByOrFail({ id: userId });
      return user.tokenBalance;
    }
    const user = await this.users.findOneBy({ id: userId });
    throw new HttpException({
      message: `Not enough tokens for ${service}`,
      requiredTokens: cost,
      availableTokens: user?.tokenBalance ?? 0,
      service,
    }, HttpStatus.PAYMENT_REQUIRED);
  }

  /** Reverses a reservation when the metered provider operation fails. */
  async refund(userId: string, cost: number): Promise<void> {
    await this.users.createQueryBuilder()
      .update(User)
      .set({ tokenBalance: () => 'tokenBalance + :cost' })
      .where('id = :userId', { userId, cost })
      .execute();
  }
}
