import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { LocationCheckInDto } from './dto/location-check-in.dto';
import { ExploreService } from './explore.service';

@ApiTags('Explore')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('explore')
export class ExploreController {
  constructor(private readonly service: ExploreService) {}

  @Post('check-in')
  @ApiOperation({ summary: 'Use the current location to recommend and notify about a nearby place' })
  checkIn(@CurrentUser() user: User, @Body() dto: LocationCheckInDto) {
    return this.service.checkIn(user.id, dto);
  }
}
