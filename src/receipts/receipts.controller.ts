import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { FileInterceptor } from '@nestjs/platform-express';

import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ReceiptsService } from './receipts.service';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { FindReceiptsQueryDto } from './dto/find-receipts-query.dto';
import { Translate } from 'src/translation/translate.decorator';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { MerchantMatchDto } from './dto/merchant-match.dto';
import { MerchantMatchService } from './merchant-match.service';
import { TokenWalletService } from 'src/user/token-wallet.service';

const RECEIPT_IGNORE_KEYS = [
  'id',
  'invoiceNumber',
  'date',
  'time',
  'currency',
  'subtotal',
  'tax',
  'total',
  'quantity',
  'unitPrice',
  'totalPrice',
  'originalFileName',
  'language',
  'country',
  'documentType',
  'imageMimeType',
  'createdAt',
  'updatedAt',
  'receiptId',
  'rawText',
  'googlePlaceId',
  'googleMapsUri',
  'merchantLatitude',
  'merchantLongitude',
];

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(
    private readonly receiptsService: ReceiptsService,
    private readonly merchantMatchService: MerchantMatchService,
    private readonly wallet: TokenWalletService,
  ) {}

  @Post('merchant-match')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiOperation({
    summary: 'Match an extracted merchant near the user device location',
  })
  matchMerchant(@Body() dto: MerchantMatchDto) {
    return this.merchantMatchService.match(dto);
  }

  @Post('extract')
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({
    summary: 'Extract and save receipt from image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['image'],
    },
  })
  async extract(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp|pdf)$/,
        })
        .addMaxSizeValidator({
          maxSize: 10 * 1024 * 1024,
        })
        .build(),
    )
    image: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    const tokenCost = await this.wallet.getCost('receiptScan');
    await this.wallet.spend(user.id, tokenCost, 'receipt scanning');
    try {
      return await this.receiptsService.extractAndSave(image, user);
    } catch (error) {
      await this.wallet.refund(user.id, tokenCost).catch(() => undefined);
      throw error;
    }
  }

  @Post('receipt-recommendations/:receiptId')
  @HttpCode(HttpStatus.OK)
  @Translate({ ignoreKeys: RECEIPT_IGNORE_KEYS })
  @ApiOperation({
    summary: 'Get category and description recommendations',
  })
  @ApiParam({
    name: 'receiptId',
    description: 'Receipt UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Recommendations computed successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Receipt not found',
  })
  async getRecommendations(
    @CurrentUser() user: User,
    @Param('receiptId') receiptId: string,
  ) {
    return this.receiptsService.getReceiptRecommendations(user.id, receiptId);
  }

  @Get()
  @Translate({
    ignoreKeys: RECEIPT_IGNORE_KEYS,
  })
  @ApiOperation({
    summary: 'List all receipts translated',
  })
  @ApiQuery({
    type: FindReceiptsQueryDto,
  })
  @ApiResponse({
    status: 200,
    description: 'List of receipts',
  })
  findAll(@CurrentUser() user: User) {
    return this.receiptsService.findAll(user.id);
  }

  @Get(':id')
  @Translate({
    ignoreKeys: RECEIPT_IGNORE_KEYS,
  })
  @ApiOperation({
    summary: 'Get receipt translated',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt UUID',
  })
  @ApiResponse({
    status: 200,
    description: 'Receipt found',
  })
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.receiptsService.findOne(user.id, id);
  }

  @Patch(':id')
  @Translate({ ignoreKeys: RECEIPT_IGNORE_KEYS })
  @ApiOperation({
    summary: 'Update receipt',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt UUID',
  })
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete receipt',
  })
  @ApiParam({
    name: 'id',
    description: 'Receipt UUID',
  })
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.receiptsService.remove(user.id, id);
  }
}
