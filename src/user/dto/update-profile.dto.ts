import {
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';


export class UpdateProfileDto {

  @ApiProperty({required:false})
  @IsOptional()
  @IsString()
  displayName?: string;


  @ApiProperty({required:false})
  @IsOptional()
  @IsUUID()
  currencyId?: string;


  @ApiProperty({required:false})
  @IsOptional()
  @IsUUID()
  currentCountryId?: string;

  @ApiProperty({required:false})
  @IsOptional()
  @IsUUID()
  languageId?: string;

}