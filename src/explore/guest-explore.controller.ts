import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { PlaceDescriptionDto } from './dto/place-description.dto';
import { PlaceNarrationDto } from './dto/place-narration.dto';
import { ExploreService } from './explore.service';

@ApiTags('Guest')
@Controller('guest/explore')
export class GuestExploreController {
  constructor(private readonly service: ExploreService) {}

  @Post('nearby')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Find nearby places without saving a check-in' })
  findNearby(@Body() dto: NearbySearchDto) {
    return this.service.findNearby(dto);
  }

  @Get('place/:placeId')
  details(
    @Param('placeId') placeId: string,
    @Query('languageCode') languageCode?: string,
  ) {
    return this.service.getPlaceDetails(placeId, languageCode ?? 'en');
  }

  @Post('place/:placeId/narration')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  narration(@Param('placeId') placeId: string, @Body() dto: PlaceNarrationDto) {
    return this.service.narratePlace(
      placeId,
      dto.targetLanguage ?? 'en',
      dto.description,
    );
  }

  @Post('place/:placeId/description')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({ summary: 'Generate a Gemini description for a place' })
  description(
    @Param('placeId') placeId: string,
    @Body() dto: PlaceDescriptionDto,
  ) {
    return this.service.generatePlaceDescription(
      placeId,
      dto.languageCode ?? 'en',
    );
  }
}
