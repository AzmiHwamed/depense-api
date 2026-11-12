import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { TokenWalletService } from './token-wallet.service';

@ApiTags('AI token pricing')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('ai-service-prices')
export class AiServicePriceController {
  constructor(private readonly wallet: TokenWalletService) {}

  @Get()
  list() {
    return this.wallet.listPrices();
  }
}
