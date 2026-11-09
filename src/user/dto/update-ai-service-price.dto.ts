import { IsIn, IsInt, Min } from 'class-validator';
import { AI_SERVICES, AiServiceKey } from '../entities/ai-service-price.entity';

export class UpdateAiServicePriceDto {
  @IsIn(AI_SERVICES)
  service: AiServiceKey;

  @IsInt()
  @Min(0)
  tokenCost: number;
}
