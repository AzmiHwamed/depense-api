import {
  IsString,
  Length
} from 'class-validator';


export class CreateLanguageDto {


 @IsString()
 @Length(2,5)
 code:string;


 @IsString()
 name:string;

}