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
  @Get() findAll(@CurrentUser() user: User) {
    return this.service.findAll(user.id);
  }
  @Get(':id/expenses') expenses(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.getExpenses(user.id, id);
  }
  @Post() create(@CurrentUser() user: User, @Body() dto: CreateTripDto) {
    return this.service.create(user.id, dto);
  }
  @Patch(':id') update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.service.update(user.id, id, dto);
  }
  @Delete(':id') archive(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.archive(user.id, id);
  }
  @Post(':id/generate-plan') generate(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.generatePlan(user.id, id, user.language?.code ?? 'en');
  }
  @Post(':id/activate') activate(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    return this.service.activate(user.id, id);
  }
}
