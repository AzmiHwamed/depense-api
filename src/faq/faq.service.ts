import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Faq } from './entities/faq.entity';
import { FaqCategory } from './entities/faq-category.entity';
import { FaqQueryDto } from './dto/faq-query.dto';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';

@Injectable()
export class FaqService {
  constructor(
    @InjectRepository(Faq)
    private readonly faqRepo: Repository<Faq>,
    @InjectRepository(FaqCategory)
    private readonly categoryRepo: Repository<FaqCategory>,
  ) {}

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const category = await this.categoryRepo.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('FAQ category not found');
    }
  }

  async create(dto: CreateFaqDto): Promise<Faq> {
    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }
    const faq = this.faqRepo.create(dto);
    return this.faqRepo.save(faq);
  }

  async findAll(query: FaqQueryDto, includeInactive = false): Promise<Faq[]> {
    const qb = this.faqRepo
      .createQueryBuilder('faq')
      .leftJoinAndSelect('faq.category', 'category');

    if (!includeInactive) {
      qb.andWhere('faq.isActive = :isActive', { isActive: true });
    }
    if (query.categoryId) {
      qb.andWhere('faq.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    qb.orderBy('faq.order', 'ASC').addOrderBy('faq.createdAt', 'ASC');
    return qb.getMany();
  }

  async findByCategory(
    categoryId: string,
    includeInactive = false,
  ): Promise<Faq[]> {
    await this.assertCategoryExists(categoryId);
    return this.findAll({ categoryId }, includeInactive);
  }

  async findOne(id: string): Promise<Faq> {
    const faq = await this.faqRepo.findOne({
      where: { id },
      relations: { category: true },
    });
    if (!faq) {
      throw new NotFoundException('FAQ not found');
    }
    return faq;
  }

  async update(id: string, dto: UpdateFaqDto): Promise<Faq> {
    const faq = await this.findOne(id);

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    Object.assign(faq, dto);
    return this.faqRepo.save(faq);
  }

  async remove(id: string): Promise<void> {
    const faq = await this.findOne(id);
    await this.faqRepo.remove(faq);
  }
}
