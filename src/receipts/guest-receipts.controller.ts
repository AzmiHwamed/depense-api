import { Controller, ParseFilePipeBuilder, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ReceiptsService } from './receipts.service';

@ApiTags('Guest')
@Controller('guest/receipts')
export class GuestReceiptsController {
  constructor(private readonly receipts: ReceiptsService) {}

  @Post('extract')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Extract a receipt without saving it' })
  extract(
    @UploadedFile(new ParseFilePipeBuilder()
      .addFileTypeValidator({ fileType: /(jpg|jpeg|png|webp|pdf)$/ })
      .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 })
      .build()) image: Express.Multer.File,
  ) {
    return this.receipts.extractWithoutSave(image);
  }
}
