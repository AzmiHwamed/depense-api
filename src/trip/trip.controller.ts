import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { CreateTripDto, UpdateTripDto } from './dto/trip.dto';
import { TripService } from './trip.service';
import { Translate } from 'src/translation/translate.decorator';

const TRIP_IGNORE_KEYS = [
  'id', 'userId', 'countryId', 'currencyId', 'categoryId', 'tripId',
  'startDate', 'endDate', 'createdAt', 'updatedAt', 'date', 'time',
  'status', 'currencyCode', 'code', 'alpha2Code', 'alpha3Code', 'flag',
  'color', 'amount', 'totalAmount', 'spent', 'dailyTarget', 'projectedTotal',
  'latitude', 'longitude', 'googlePlaceId', 'googleMapsUri',
  'formattedAddress', 'recommendedPlaceName', 'monumentName', 'location',
];

@UseGuards(FirebaseAuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
@Controller('trips')
export class TripController {
  constructor(private readonly service: TripService) {}
  @Get()
  @Translate({ ignoreKeys: TRIP_IGNORE_KEYS })
  findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id);
  }
  @Get(':id/expenses')
  @Translate({ ignoreKeys: TRIP_IGNORE_KEYS })
  expenses(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.getExpenses(user.id, id);
  }
  @Post()
  @Translate({ ignoreKeys: TRIP_IGNORE_KEYS })
  create(@CurrentUser() user: User, @Body() dto: CreateTripDto) {
    return this.service.create(user.id, dto);
  }
  @Patch(':id')
  @Translate({ ignoreKeys: TRIP_IGNORE_KEYS })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
  @Delete(':id')
  @Translate({ ignoreKeys: TRIP_IGNORE_KEYS })
  archive(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.archive(user.id, id);
  }
  @Post(':id/generate-plan') generate(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.generatePlan(user.id, id, user.language?.code ?? 'en');
  }
  @Post(':id/activate')
  @Translate({ ignoreKeys: TRIP_IGNORE_KEYS })
  activate(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.activate(user.id, id);
  }
}
