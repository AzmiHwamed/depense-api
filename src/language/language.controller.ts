import {
 Controller,
 Get,
 Post,
 Body,
 Param,
 Delete,
 Patch,
 Query
} from '@nestjs/common';


import {
 ApiTags
} from '@nestjs/swagger';


import {
 LanguageService
} from './language.service';


import {
 CreateLanguageDto
} from './dto/create-language.dto';


import {
 UpdateLanguageDto
} from './dto/update-language.dto';



@ApiTags('Languages')
@Controller('languages')
export class LanguageController {


constructor(
 private readonly service:LanguageService
){}



@Post()
create(
 @Body() dto:CreateLanguageDto
){

 return this.service.create(dto);

}



@Get()
findAll(){

 return this.service.findAll();

}



@Get('search')
search(
 @Query('q') q:string
){

 return this.service.search(q);

}



@Get(':id')
findOne(
 @Param('id') id:string
){

 return this.service.findOne(id);

}



@Patch(':id')
update(
 @Param('id') id:string,
 @Body() dto:UpdateLanguageDto
){

 return this.service.update(
  id,
  dto
 );

}



@Delete(':id')
remove(
 @Param('id') id:string
){

 return this.service.remove(id);

}


}