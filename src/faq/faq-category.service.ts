import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FaqCategory } from './entities/faq-category.entity';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
} from './dto/faq-category.dto';

@Injectable()
export class FaqCategoryService {
  constructor(
    @InjectRepository(FaqCategory)
    private readonly categoryRepo: Repository<FaqCategory>,
  ) {}

  async create(dto: CreateFaqCategoryDto): Promise<FaqCategory> {
    const existing = await this.categoryRepo.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `A category named "${dto.name}" already exists`,
      );
    }
    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async findAll(includeInactive = false): Promise<FaqCategory[]> {
    return this.categoryRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { order: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<FaqCategory> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('FAQ category not found');
    }
    return category;
  }

  async update(id: string, dto: UpdateFaqCategoryDto): Promise<FaqCategory> {
    const category = await this.findOne(id);

    if (dto.name && dto.name !== category.name) {
      const duplicate = await this.categoryRepo.findOne({
        where: { name: dto.name },
      });
      if (duplicate) {
        throw new ConflictException(
          `A category named "${dto.name}" already exists`,
        );
      }
    }

    Object.assign(category, dto);
    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepo.remove(category);
    // FAQs referencing this category have onDelete: 'SET NULL', so they
    // become uncategorized rather than being deleted.
  }
}
