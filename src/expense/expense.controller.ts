import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './entities/expense.entity';
import {
  ExpenseQueryDto,
  ExpenseStatisticsQueryDto,
} from './dto/expense-query.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { Translate } from 'src/translation/translate.decorator';
import { CreateExpenseFromReceiptDto } from './dto/create-expense-from-receipt.dto';

// Fields that should never go through the translation model:
// IDs, amounts, dates, colors, and user-entered free text.
const EXPENSE_IGNORE_KEYS = [
  'id',
  'amount',
  'date',
  'currencyId',
  'categoryId',
  'userId',
  'createdAt',
  'updatedAt',
  'shop', 
  'categoryColor',
  'period',
  'total',
  'count',
  'groupBy',
];

@ApiTags('Expenses')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  // NOTE: this route must be declared before ':id' so "statistics"
  // isn't parsed as an :id param.
  @Get('statistics')
  @Translate({ ignoreKeys: EXPENSE_IGNORE_KEYS })
  @ApiOperation({
    summary: 'Get spending statistics for the authenticated user',
    description:
      'Returns overall total/count, a breakdown by category, and a breakdown over time grouped by day, month, or year.',
  })
  @ApiResponse({ status: 200, description: 'Statistics computed successfully' })
  getStatistics(
    @CurrentUser() user: User,
    @Query() query: ExpenseStatisticsQueryDto,
  ) {
    return this.expenseService.getStatistics(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new expense for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Expense created', type: Expense })
  @ApiResponse({ status: 404, description: 'Expense category not found' })
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseDto) {
    return this.expenseService.create(user.id, dto);
  }
 @Post('from-receipt')
  @ApiOperation({
    summary: 'Create an expense from a scanned receipt',
    description:
      "Loads the receipt, creates an expense from its parsed fields, and returns the expense alongside the amount converted into the authenticated user's current home currency.",
  })
  @ApiResponse({ status: 201, description: 'Expense created from receipt' })
  @ApiResponse({
    status: 404,
    description: 'Receipt, category, or currency not found',
  })
  createFromReceipt(
    @CurrentUser() user: User,
    @Body() dto: CreateExpenseFromReceiptDto,
  ) {
    return this.expenseService.createFromReceipt(user.id, dto);
  }
  @Get()
  @Translate({ ignoreKeys: EXPENSE_IGNORE_KEYS })
  @ApiOperation({ summary: "List the authenticated user's expenses" })
  @ApiResponse({
    status: 200,
    description: 'List of expenses',
    type: [Expense],
  })
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
  findAll(@CurrentUser() user: User, @Query() query: ExpenseQueryDto) {
    return this.expenseService.findAll(user.id, query);
  }

  @Get(':id')
  @Translate({ ignoreKeys: EXPENSE_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get a single expense by ID' })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({ status: 200, description: 'Expense found', type: Expense })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expenseService.findOne(user.id, id);
  }

  @Patch(':id')
  @Translate({ ignoreKeys: EXPENSE_IGNORE_KEYS })
  @ApiOperation({ summary: 'Update an expense' })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({ status: 200, description: 'Expense updated', type: Expense })
  @ApiResponse({ status: 404, description: 'Expense or category not found' })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expenseService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense' })
  @ApiParam({ name: 'id', description: 'Expense UUID' })
  @ApiResponse({ status: 204, description: 'Expense deleted' })
  @ApiResponse({ status: 404, description: 'Expense not found' })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expenseService.remove(user.id, id);
  }
}