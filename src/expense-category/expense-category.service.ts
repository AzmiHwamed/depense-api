import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExpenseCategory } from './entities/expense-category.entity';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoryService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
  ) {}

  async create(
    userId: string,
    dto: CreateExpenseCategoryDto,
  ): Promise<ExpenseCategory> {
    const existing = await this.categoryRepo.findOne({
      where: { userId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `You already have a category named "${dto.name}"`,
      );
    }

    const category = this.categoryRepo.create({ ...dto, userId });
    return this.categoryRepo.save(category);
  }

  async findAll(userId: string): Promise<ExpenseCategory[]> {
    return this.categoryRepo.find({
      where: { userId },
      order: { name: 'ASC' },
    });
  }

  async findOne(userId: string, id: string): Promise<ExpenseCategory> {
    const category = await this.categoryRepo.findOne({
      where: { id, userId },
    });
    if (!category) {
      throw new NotFoundException('Expense category not found');
    }
    return category;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateExpenseCategoryDto,
  ): Promise<ExpenseCategory> {
    const category = await this.findOne(userId, id);

    if (dto.name && dto.name !== category.name) {
      const duplicate = await this.categoryRepo.findOne({
        where: { userId, name: dto.name },
      });
      if (duplicate) {
        throw new ConflictException(
          `You already have a category named "${dto.name}"`,
        );
      }
    }

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findOne(userId, id);
    await this.categoryRepo.remove(category);
    // Note: Expense.category has onDelete: 'CASCADE' at the DB level,
    // so removing a category also removes its expenses. Change that
    // if you'd rather block deletion when expenses still reference it.
  }
}
