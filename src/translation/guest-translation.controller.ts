import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TranslateJsonDto } from './dto/translate-json.dto';
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
}
