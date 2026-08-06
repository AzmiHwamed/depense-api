import {
 Injectable,
 NotFoundException,
} from '@nestjs/common';


import {
 InjectRepository
} from '@nestjs/typeorm';


import {
 Repository,
 ILike
} from 'typeorm';


import {
 Language
} from './entities/language.entity';


import {
 CreateLanguageDto
} from './dto/create-language.dto';


import {
 UpdateLanguageDto
} from './dto/update-language.dto';



@Injectable()
export class LanguageService {


constructor(
 @InjectRepository(Language)
 private repo:Repository<Language>
){}



async create(
 dto:CreateLanguageDto
){

 const language =
 this.repo.create(dto);

 return this.repo.save(language);

}



async findAll(){

 return this.repo.find({
  order:{
   name:'ASC'
  }
 });

}



async findOne(id:string){

 const language =
 await this.repo.findOne({
  where:{id}
 });


 if(!language)
  throw new NotFoundException(
   'Language not found'
  );


 return language;

}



async update(
 id:string,
 dto:UpdateLanguageDto
){

 const language =
 await this.findOne(id);


 Object.assign(language,dto);


 return this.repo.save(language);

}



async remove(id:string){

 const language =
 await this.findOne(id);


 return this.repo.remove(language);

}




async search(
 query:string
){

 return this.repo.find({

  where:[
   {
    name:ILike(`%${query}%`)
   },
   {
    code:ILike(`%${query}%`)
   }
  ],

  order:{
   name:'ASC'
  }

 });

}



}