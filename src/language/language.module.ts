import {
 Module
} from '@nestjs/common';


import {
 TypeOrmModule
} from '@nestjs/typeorm';


import {
 Language
} from './entities/language.entity';


import {
 LanguageService
} from './language.service';


import {
 LanguageController
} from './language.controller';
import { LanguageSeeder } from './language.seed';



@Module({

 imports:[
  TypeOrmModule.forFeature([
   Language
  ])
 ],

 controllers:[
  LanguageController
 ],

 providers:[
  LanguageService,
  LanguageSeeder
 ],

 exports:[
  LanguageService
 ]

})
export class LanguageModule{}