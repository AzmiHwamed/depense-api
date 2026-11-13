import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { TranslateTextDto } from './dto/translate-text.dto';
import { TranslateJsonDto } from './dto/translate-json.dto';

import { User } from 'src/user/entities/user.entity'; // adjust path
import { CurrentUser } from 'src/auth/current-user.decorator';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';

@UseGuards(FirebaseAuthGuard)
@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('text')
  async translateText(
    @Body() dto: TranslateTextDto,
    @CurrentUser() user: User,
  ) {
    const translation = await this.translationService.translateText(dto.text, {
      target: dto.target,
      source: dto.source,
      user,
      throwOnFailure: true,
    });
    return { translation };
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
