import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Faq } from './entities/faq.entity';
import { FaqCategory } from './entities/faq-category.entity';
import { FaqService } from './faq.service';
import { FaqCategoryService } from './faq-category.service';
import { FaqController } from './faq.controller';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([Faq, FaqCategory]), UserModule],
  controllers: [FaqController],
  providers: [FaqService, FaqCategoryService],
  exports: [FaqService, FaqCategoryService, TypeOrmModule],
})
export class FaqModule {}
