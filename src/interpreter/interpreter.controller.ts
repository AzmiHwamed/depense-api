import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { BadRequestException, UsePipes, ValidationPipe } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { User } from '../user/entities/user.entity';
import { CreateInterpreterConversationDto } from './dto/create-conversation.dto';
import { CreateInterpreterTurnDto } from './dto/create-turn.dto';
import { InterpreterService } from './interpreter.service';
import { TokenWalletService } from '../user/token-wallet.service';

@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
@Controller('interpreter/conversations')
export class InterpreterController {
  constructor(private readonly service: InterpreterService, private readonly wallet: TokenWalletService) {}
  @Post() create(@CurrentUser() user: User, @Body() dto: CreateInterpreterConversationDto) { return this.service.create(user, dto); }
  @Get() list(@CurrentUser() user: User) { return this.service.list(user); }
  @Get(':id') get(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) { return this.service.get(user, id); }

  @Post(':id/turns')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('audio', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async addTurn(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateInterpreterTurnDto, @UploadedFile() audio?: Express.Multer.File) {
    if (!audio) throw new BadRequestException('Audio file is required');
    if (!audio.mimetype.startsWith('audio/')) throw new BadRequestException('Uploaded file must be audio');
    const tokenCost = await this.wallet.getCost('interpreterTurn');
    await this.wallet.spend(user.id, tokenCost, 'live interpretation');
    try {
      return await this.service.addTurn(user, id, dto, audio);
    } catch (error) {
      await this.wallet.refund(user.id, tokenCost).catch(() => undefined);
      throw error;
    }
  }

  @Delete(':id') remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) { return this.service.remove(user, id); }
}
