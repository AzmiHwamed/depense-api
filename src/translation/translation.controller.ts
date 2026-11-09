import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslateTextDto } from './dto/translate-text.dto';
import { TranslateJsonDto } from './dto/translate-json.dto';

import { User } from 'src/user/entities/user.entity'; // adjust path
import { CurrentUser } from 'src/auth/current-user.decorator';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { TokenWalletService } from 'src/user/token-wallet.service';

@UseGuards(FirebaseAuthGuard)
@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService, private readonly wallet: TokenWalletService) {}

  @Post('text')
  async translateText(
    @Body() dto: TranslateTextDto,
    @CurrentUser() user: User,
  ) {
    const tokenCost = await this.wallet.getCost('textTranslation');
    await this.wallet.spend(user.id, tokenCost, 'text translation');
    try {
      const translation = await this.translationService.translateText(
        dto.text,
        {
          target: dto.target,
          source: dto.source,
          user,
        },
      );
      return { translation };
    } catch (error) {
      await this.wallet.refund(user.id, tokenCost).catch(() => undefined);
      throw error;
    }
  }

  @Post('json')
  @UseGuards(OptionalFirebaseAuthGuard)
  @ApiBearerAuth()
  async translateJson(
    @Body() dto: TranslateJsonDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.translationService.translateJson(dto.data, {
      target: dto.target,
      source: dto.source,
      ignoreKeys: dto.ignoreKeys,
      user,
    });

    return { data };
  }
}
