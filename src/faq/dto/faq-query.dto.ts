import { IsOptional, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FaqQueryDto {
  @ApiPropertyOptional({
    example: 'b3f1c2a0-1234-4a5b-8c9d-abcdef123456',
    description: 'Filter results to a single category',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
