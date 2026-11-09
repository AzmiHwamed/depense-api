import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { TokenWalletService } from './token-wallet.service';
import { UpdateAiServicePriceDto } from './dto/update-ai-service-price.dto';

@ApiTags('Admin - AI token pricing')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, AdminGuard)
@Controller('admin/ai-service-prices')
export class AdminAiServicePriceController {
  constructor(private readonly wallet: TokenWalletService) {}

  @Get()
  list() {
    return this.wallet.listPrices();
  }

  @Put()
  update(@Body() dto: UpdateAiServicePriceDto) {
    return this.wallet.setPrice(dto.service, dto.tokenCost);
  }
}
