import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../entities/user.entity';

export class SetRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.ADMIN })
  @IsEnum(UserRole)
  role: UserRole;
}
