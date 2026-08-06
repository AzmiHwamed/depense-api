import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpenseCategoryService } from './expense-category.service';
import { ExpenseCategoryController } from './expense-category.controller';
import { UserModule } from 'src/user/user.module';
import { ExpenseCategory } from './entities/expense-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExpenseCategory]), UserModule],
  controllers: [ExpenseCategoryController],
  providers: [ExpenseCategoryService],
  exports: [ExpenseCategoryService, TypeOrmModule],
})
export class ExpenseCategoryModule {}
