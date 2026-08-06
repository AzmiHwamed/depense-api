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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FaqService } from './faq.service';
import { FaqCategoryService } from './faq-category.service';
import { CreateFaqDto, UpdateFaqDto } from './dto/faq.dto';
import {
  CreateFaqCategoryDto,
  UpdateFaqCategoryDto,
} from './dto/faq-category.dto';
import { FaqQueryDto } from './dto/faq-query.dto';
import { Faq } from './entities/faq.entity';
import { FaqCategory } from './entities/faq-category.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';
import { AdminGuard } from 'src/auth/admin.guard';
import { Translate } from 'src/translation/translate.decorator';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

const FAQ_CATEGORY_IGNORE_KEYS = ['id', 'order', 'isActive', 'createdAt', 'updatedAt'];
const FAQ_IGNORE_KEYS = ['id', 'categoryId', 'order', 'isActive', 'createdAt', 'updatedAt'];

@ApiTags('FAQ')
@Controller('faqs')
export class FaqController {
  constructor(
    private readonly faqService: FaqService,
    private readonly faqCategoryService: FaqCategoryService,
  ) {}

  // ── Categories ──────────────────────────────

  @Post('categories')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('Category created')
  @ApiOperation({ summary: 'Create a new FAQ category (admin only)' })
  @ApiResponse({ status: 201, description: 'Category created', type: FaqCategory })
  @ApiResponse({ status: 409, description: 'A category with this name already exists' })
  createCategory(@Body() dto: CreateFaqCategoryDto) {
    return this.faqCategoryService.create(dto);
  }

  @Get('categories')
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: FAQ_CATEGORY_IGNORE_KEYS })
  @ApiOperation({ summary: 'List all FAQ categories (public)' })
  @ApiResponse({ status: 200, description: 'List of categories', type: [FaqCategory] })
  findAllCategories() {
    return this.faqCategoryService.findAll();
  }

  @Get('categories/:categoryId')
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: FAQ_CATEGORY_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get a single FAQ category by ID (public)' })
  @ApiParam({ name: 'categoryId', description: 'FAQ category UUID' })
  @ApiResponse({ status: 200, description: 'Category found', type: FaqCategory })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOneCategory(@Param('categoryId') categoryId: string) {
    return this.faqCategoryService.findOne(categoryId);
  }

  @Patch('categories/:categoryId')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('Category updated')
  @ApiOperation({ summary: 'Update a FAQ category (admin only)' })
  @ApiParam({ name: 'categoryId', description: 'FAQ category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated', type: FaqCategory })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 409, description: 'A category with this name already exists' })
  updateCategory(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateFaqCategoryDto,
  ) {
    return this.faqCategoryService.update(categoryId, dto);
  }

  @Delete('categories/:categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiOperation({
    summary: 'Delete a FAQ category (admin only)',
    description: 'FAQs in this category become uncategorized rather than being deleted.',
  })
  @ApiParam({ name: 'categoryId', description: 'FAQ category UUID' })
  @ApiResponse({ status: 204, description: 'Category deleted' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  removeCategory(@Param('categoryId') categoryId: string) {
    return this.faqCategoryService.remove(categoryId);
  }

  // ── FAQs ────────────────────────────────────

  @Get('category/:categoryId')
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: FAQ_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get all FAQs belonging to a specific category (public)' })
  @ApiParam({ name: 'categoryId', description: 'FAQ category UUID' })
  @ApiResponse({ status: 200, description: 'List of FAQs in the category', type: [Faq] })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.faqService.findByCategory(categoryId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('FAQ created')
  @ApiOperation({ summary: 'Create a new FAQ (admin only)' })
  @ApiResponse({ status: 201, description: 'FAQ created', type: Faq })
  @ApiResponse({ status: 404, description: 'Category not found' })
  create(@Body() dto: CreateFaqDto) {
    return this.faqService.create(dto);
  }

  @Get()
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: FAQ_IGNORE_KEYS })
  @ApiOperation({ summary: 'List all FAQs, optionally filtered by category (public)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: 200, description: 'List of FAQs', type: [Faq] })
  findAll(@Query() query: FaqQueryDto) {
    return this.faqService.findAll(query);
  }

  @Get(':id')
  @UseGuards(OptionalFirebaseAuthGuard)
  @Translate({ ignoreKeys: FAQ_IGNORE_KEYS })
  @ApiOperation({ summary: 'Get a single FAQ by ID (public)' })
  @ApiParam({ name: 'id', description: 'FAQ UUID' })
  @ApiResponse({ status: 200, description: 'FAQ found', type: Faq })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ResponseMessage('FAQ updated')
  @ApiOperation({ summary: 'Update a FAQ (admin only)' })
  @ApiParam({ name: 'id', description: 'FAQ UUID' })
  @ApiResponse({ status: 200, description: 'FAQ updated', type: Faq })
  @ApiResponse({ status: 404, description: 'FAQ or category not found' })
  update(@Param('id') id: string, @Body() dto: UpdateFaqDto) {
    return this.faqService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard, AdminGuard)
  @ApiOperation({ summary: 'Delete a FAQ (admin only)' })
  @ApiParam({ name: 'id', description: 'FAQ UUID' })
  @ApiResponse({ status: 204, description: 'FAQ deleted' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  remove(@Param('id') id: string) {
    return this.faqService.remove(id);
  }
}