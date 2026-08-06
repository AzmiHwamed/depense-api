import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateFaqDto {
  @ApiProperty({ example: 'How do I reset my password?', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  question: string;

  @ApiProperty({
    example:
      'Go to Settings > Account > Reset Password and follow the instructions sent to your email.',
  })
  @IsString()
  answer: string;

  @ApiPropertyOptional({
    example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456',
    description:
      'ID of an existing FaqCategory; omit to leave this FAQ uncategorized',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Lower numbers are shown first within a category',
  })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFaqDto extends PartialType(CreateFaqDto) {}
