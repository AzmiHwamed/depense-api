import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './user.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { SetActiveDto } from './dto/set-active.dto';

@ApiTags('Admin - Users')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard, AdminGuard)
@Controller('admin/users')
export class AdminUserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 25 })
  findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll(Number(page) || 1, Number(limit) || 25);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one user by DB id' })
  @ApiResponse({ status: 200, type: User })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: "Update a user's profile fields" })
  @ApiResponse({ status: 200, type: User })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Change a user's role (promote/demote admin)" })
  @ApiResponse({ status: 200, type: User })
  setRole(@Param('id') id: string, @Body() dto: SetRoleDto) {
    return this.usersService.setRole(id, dto.role);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  @ApiResponse({ status: 200, type: User })
  setActive(@Param('id') id: string, @Body() dto: SetActiveDto) {
    return this.usersService.setActive(id, dto.isActive);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Permanently delete a user (SQL record only, not Firebase)',
  })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
