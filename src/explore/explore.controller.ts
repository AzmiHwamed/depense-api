import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { LocationCheckInDto } from './dto/location-check-in.dto';
import { NearbySearchDto } from './dto/nearby-search.dto';
import { ExploreService } from './explore.service';

@ApiTags('Explore')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('explore')
export class ExploreController {
  constructor(private readonly service: ExploreService) {}

  @Post('nearby')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({
    summary: 'Find places near the authenticated user device location',
  })
  findNearby(@CurrentUser() user: User, @Body() dto: NearbySearchDto) {
    return this.service.findNearby({
      ...dto,
      languageCode: user.language?.code ?? dto.languageCode ?? 'en',
    });
  }

  @Post('check-in')
  @ApiOperation({
    summary:
      'Use the current location to recommend and notify about a nearby place',
  })
  checkIn(@CurrentUser() user: User, @Body() dto: LocationCheckInDto) {
    return this.service.checkIn(user.id, {
      ...dto,
      languageCode:
        (user.language?.code as 'en' | 'fr' | 'ar' | undefined) ??
        dto.languageCode ??
        'en',
    });
  }
}
