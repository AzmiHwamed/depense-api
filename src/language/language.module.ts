import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from 'src/user/user.module';
import { LanguageController } from './language.controller';
import { Language } from './entities/language.entity';
import { LanguageSeeder } from './language.seed';
import { LanguageService } from './language.service';

@Module({
  imports: [TypeOrmModule.forFeature([Language]), UserModule],
  controllers: [LanguageController],
  providers: [LanguageService, LanguageSeeder],
  exports: [LanguageService],
})
export class LanguageModule {}
