import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { ConvertDto } from './dto/convert.dto';
import { Currency } from './entities/currency.entity';
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';
import { Translate } from 'src/translation/translate.decorator';

const CURRENCY_IGNORE_KEYS = [
  'id',
  'code',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('Currency')
@Controller('currencies')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: CURRENCY_IGNORE_KEYS })
  @ApiOperation({ summary: 'List all currencies (your own DB ids)' })
  @ApiResponse({ status: 200, type: [Currency] })
  findAll() {
    return this.currencyService.findAll();
  }

  @Get('convert')
  @ApiOperation({
    summary: 'Convert an amount between two currencies using your DB ids',
  })
  convert(@Query() dto: ConvertDto) {
    return this.currencyService.convert(
      dto.amount,
      dto.fromCurrencyId,
      dto.toCurrencyId,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: CURRENCY_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get one currency by DB id' })
  @ApiResponse({ status: 200, type: Currency })
  findOne(@Param('id') id: string) {
    return this.currencyService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new currency' })
  @ApiResponse({ status: 201, type: Currency })
  create(@Body() dto: CreateCurrencyDto) {
    return this.currencyService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a currency by DB id' })
  @ApiResponse({ status: 200, type: Currency })
  update(@Param('id') id: string, @Body() dto: UpdateCurrencyDto) {
    return this.currencyService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a currency by DB id' })
  remove(@Param('id') id: string) {
    return this.currencyService.remove(id);
  }
}