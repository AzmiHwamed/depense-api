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
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NOTIFICATION_EVENT,
  NotificationDispatchEvent,
} from 'src/notification/notification.events';

@Injectable()
export class ExpenseCategoryService {
  constructor(
    @InjectRepository(ExpenseCategory)
    private readonly categoryRepo: Repository<ExpenseCategory>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private notify(
    category: ExpenseCategory,
    title: string,
    body: string,
    type: string,
  ): void {
    this.eventEmitter.emit(
      NOTIFICATION_EVENT,
      new NotificationDispatchEvent(title, body, category.userId, {
        type,
        categoryId: category.id,
      }),
    );
  }

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
    const saved = await this.categoryRepo.save(category);
    this.notify(
      saved,
      'Category created',
      `The ${saved.name} expense category was created`,
      'expense_category.created',
    );
    return saved;
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
    const saved = await this.categoryRepo.save(category);
    this.notify(
      saved,
      'Category updated',
      `The ${saved.name} expense category was updated`,
      'expense_category.updated',
    );
    return saved;
  }

  async remove(userId: string, id: string): Promise<void> {
    const category = await this.findOne(userId, id);
    await this.categoryRepo.remove(category);
    this.notify(
      category,
      'Category deleted',
      `The ${category.name} expense category was deleted`,
      'expense_category.deleted',
    );
    // Note: Expense.category has onDelete: 'CASCADE' at the DB level,
    // so removing a category also removes its expenses. Change that
    // if you'd rather block deletion when expenses still reference it.
  }
}
