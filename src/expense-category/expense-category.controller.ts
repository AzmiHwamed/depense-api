import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ExpenseCategoryService } from './expense-category.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Translate } from 'src/translation/translate.decorator';

const EXPENSE_CATEGORY_IGNORE_KEYS = [
  'id',
  'userId',
  'icon',
  'color',
  'createdAt',
  'updatedAt',
];

@UseGuards(FirebaseAuthGuard)
@Controller('expense-categories')
export class ExpenseCategoryController {
  constructor(
    private readonly expenseCategoryService: ExpenseCategoryService,
  ) {}

  @Post()
  @ApiBearerAuth()
  @Translate({ ignoreKeys: EXPENSE_CATEGORY_IGNORE_KEYS })
  create(@CurrentUser() user: User, @Body() dto: CreateExpenseCategoryDto) {
    return this.expenseCategoryService.create(user.id, dto);
  }

  @Get()
  @ApiBearerAuth()
  @Translate({ ignoreKeys: EXPENSE_CATEGORY_IGNORE_KEYS })
  findAll(@CurrentUser() user: User) {
    return this.expenseCategoryService.findAll(user.id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Translate({ ignoreKeys: EXPENSE_CATEGORY_IGNORE_KEYS })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expenseCategoryService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Translate({ ignoreKeys: EXPENSE_CATEGORY_IGNORE_KEYS })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expenseCategoryService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.expenseCategoryService.remove(user.id, id);
  }
}
