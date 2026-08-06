import {
  IsOptional,
  IsString,
  IsUUID,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole, SubscriptionStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  photoURL?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  currencyId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  currentCountryId?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ enum: SubscriptionStatus, required: false })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  subscriptionStatus?: SubscriptionStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
