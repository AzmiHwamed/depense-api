import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';

import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { CountryService } from './country.service';

import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

import { Country } from './entities/country.entity';

import { Translate } from 'src/translation/translate.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';

const COUNTRY_IGNORE_KEYS = [
  'id',
  'alpha2Code',
  'alpha3Code',
  'flag',
  'region',
  'capital',
  'currency',
  'currencyId',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('Countries')
@Controller('countries')
export class CountryController {
  constructor(private readonly countryService: CountryService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: COUNTRY_IGNORE_KEYS })
  @ApiOperation({ summary: 'List all countries translated' })
  @ApiResponse({ status: 200, type: [Country] })
  findAll() {
    return this.countryService.findAll();
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: COUNTRY_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get country translated' })
  @ApiResponse({ status: 200, type: Country })
  findOne(@Param('id') id: string) {
    return this.countryService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('Country created')
  @ApiOperation({ summary: 'Create country' })
  @ApiResponse({ status: 201, type: Country })
  create(@Body() dto: CreateCountryDto) {
    return this.countryService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('Country updated')
  @ApiOperation({ summary: 'Update country' })
  @ApiResponse({ status: 200, type: Country })
  update(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.countryService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('Country deleted')
  @ApiOperation({ summary: 'Delete country' })
  remove(@Param('id') id: string) {
    return this.countryService.remove(id);
  }
}
