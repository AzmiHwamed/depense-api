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
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { UpdatePaymentPlanDto } from './dto/update-payment-plan.dto';
import { PaymentPlan } from './entities/payment-plan.entity';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { Translate } from 'src/translation/translate.decorator';

const PAYMENT_PLAN_IGNORE_KEYS = [
  'id', 'durationMonths', 'basePrice', 'convertedPrice', 'baseCurrencyId',
  'currencyId', 'code', 'isActive', 'createdAt', 'updatedAt',
];
import { PaymentPlanService } from './payment-plan.service.spec';

@ApiTags('Payment Plans')
@Controller('payment-plans')
export class PaymentPlanController {
  constructor(private readonly planService: PaymentPlanService) {}

  // ── Admin-style CRUD, raw prices in base currency ──────────
  @Get('raw')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all plans with raw base-currency prices (admin view)',
  })
  @ApiResponse({ status: 200, type: [PaymentPlan] })
  findAllRaw() {
    return this.planService.findAllRaw();
  }

  @Get('raw/:id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one plan by DB id, raw base-currency price' })
  @ApiResponse({ status: 200, type: PaymentPlan })
  findOneRaw(@Param('id') id: string) {
    return this.planService.findOneRaw(id);
  }

  @Post()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new payment plan' })
  @ApiResponse({ status: 201, type: PaymentPlan })
  create(@Body() dto: CreatePaymentPlanDto) {
    return this.planService.create(dto);
  }

  @Patch(':id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a payment plan' })
  @ApiResponse({ status: 200, type: PaymentPlan })
  update(@Param('id') id: string, @Body() dto: UpdatePaymentPlanDto) {
    return this.planService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a payment plan' })
  remove(@Param('id') id: string) {
    return this.planService.remove(id);
  }

  // ── User-facing: plans converted to the caller's own currency ──
  @UseGuards(FirebaseAuthGuard)
  @ApiBearerAuth()
  @Get()
  @Translate({ ignoreKeys: PAYMENT_PLAN_IGNORE_KEYS })
  @ApiOperation({
    summary: "List active plans, priced in the calling user's currency",
  })
  findAllForUser(@CurrentUser() user: User) {
    // Falls back to plan's own base currency conversion target if user has none set
    const targetCurrencyId = user.currencyId;
    return this.planService.findAllInCurrency(targetCurrencyId);
  }
}
