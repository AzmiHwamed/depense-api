import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseFilePipeBuilder,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

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
import { OptionalFirebaseAuthGuard } from 'src/auth/optional-firebase-auth.guard';
import { Translate } from 'src/translation/translate.decorator';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { User } from 'src/user/entities/user.entity';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';


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
  'rawText'
];


@ApiTags('Receipts')
@Controller('receipts')
export class ReceiptsController {

  constructor(
    private readonly receiptsService: ReceiptsService,
  ) { }


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
  @UseGuards(OptionalFirebaseAuthGuard)
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
    return this.receiptsService.extractAndSave(image, user);
  }


  @Post('receipt-recommendations/:receiptId')
  @ApiOperation({
    summary: 'Get category and description recommendations',
  })
  @ApiBearerAuth()
  @UseGuards(FirebaseAuthGuard)
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
    return this.receiptsService.getReceiptRecommendations(
      user.id,
      receiptId,
    );
  }


  @Get()
  @ApiBearerAuth()
  @UseGuards(OptionalFirebaseAuthGuard)

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

  findAll(
  ) {
    return this.receiptsService.findAll();
  }



  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(OptionalFirebaseAuthGuard)
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

  findOne(
    @Param('id') id: string,
  ) {
    return this.receiptsService.findOne(id);
  }



  @Patch(':id')

  @ApiOperation({
    summary: 'Update receipt',
  })

  @ApiParam({
    name: 'id',
    description: 'Receipt UUID',
  })

  update(
    @Param('id') id: string,
    @Body() dto: UpdateReceiptDto,
  ) {
    return this.receiptsService.update(id, dto);
  }



  @Delete(':id')

  @ApiOperation({
    summary: 'Delete receipt',
  })

  @ApiParam({
    name: 'id',
    description: 'Receipt UUID',
  })

  remove(
    @Param('id') id: string,
  ) {
    return this.receiptsService.remove(id);
  }
}