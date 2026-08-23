import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors, UsePipes, ValidationPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateInterpreterTurnDto } from './dto/create-turn.dto';
import { InterpreterService } from './interpreter.service';

@ApiTags('Guest')
@Controller('guest/interpreter')
export class GuestInterpreterController {
  constructor(private readonly service: InterpreterService) {}

  @Post('turn')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Process one interpreter turn without saving it' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  process(@Body() dto: CreateInterpreterTurnDto, @UploadedFile() audio?: Express.Multer.File) {
    if (!audio) throw new BadRequestException('Audio file is required');
    if (!audio.mimetype.startsWith('audio/')) throw new BadRequestException('Uploaded file must be audio');
    return this.service.processGuestTurn(dto, audio);
  }
}
