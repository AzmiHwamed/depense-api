import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TranslateJsonDto } from './dto/translate-json.dto';
import { TranslateTextDto } from './dto/translate-text.dto';
import { TranslationService } from './translation.service';

@ApiTags('Guest')
@Controller('guest/translation')
export class GuestTranslationController {
  constructor(private readonly translations: TranslationService) {}

  @Post('json')
  @ApiOperation({ summary: 'Translate JSON without storing it' })
  async translateJson(@Body() dto: TranslateJsonDto) {
    const data = await this.translations.translateJson(dto.data, {
      target: dto.target,
      source: dto.source,
      ignoreKeys: dto.ignoreKeys,
    });
    return { data };
  }

  @Post('text')
  @ApiOperation({
    summary: 'Translate text without storing it or spending tokens',
  })
  async translateText(@Body() dto: TranslateTextDto) {
    const translation = await this.translations.translateText(dto.text, {
      target: dto.target,
      source: dto.source,
      throwOnFailure: true,
    });
    return { translation };
  }
}
