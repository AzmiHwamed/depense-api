import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entities/user.entity';
import { CurrencyModule } from 'src/currency/currency.module';
import { AdminBootstrapService } from './admin-bootstrap.service';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CurrencyModule],
  controllers: [UserController],
  providers: [UsersService, AdminBootstrapService],
  exports: [UsersService],
})
export class UserModule {}
