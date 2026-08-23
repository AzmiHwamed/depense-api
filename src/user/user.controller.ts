import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

import {
  FileInterceptor
} from '@nestjs/platform-express';

import { diskStorage } from 'multer';
import { extname } from 'path';

import {
  ApiBearerAuth, ApiConsumes, ApiBody,  ApiTags,
} from '@nestjs/swagger';

import { User } from './entities/user.entity';
import { CurrentUser } from 'src/auth/current-user.decorator';
import { FirebaseAuthGuard } from 'src/auth/firebase-auth.guard';
import { UsersService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DeleteAccountDto } from './dto/delete-account.dto';


@ApiTags('Users')
@Controller('users')
export class UserController {


constructor(
 private readonly usersService: UsersService
){}



@UseGuards(FirebaseAuthGuard)
@Get('me')
@ApiBearerAuth()
getProfile(
 @CurrentUser() user: User
){
 return user;
}



@UseGuards(FirebaseAuthGuard)
@Patch('me')
@ApiBearerAuth()
@ApiConsumes('multipart/form-data')
@ApiBody({
  schema: {
    type: 'object',
    properties: {

      displayName: {
        type: 'string',
        example: 'Azmi Hwamed',
      },

      currencyId: {
        type: 'string',
        example: 'b8f7a9e2-xxxx-xxxx-xxxx',
      },

      currentCountryId: {
        type: 'string',
        example: 'd2e8a7c1-xxxx-xxxx-xxxx',
      },

      image: {
        type: 'string',
        format: 'binary',
        description: 'Profile image (only available for password accounts)',
      },

    },
  },
})
@UseInterceptors(
 FileInterceptor('image',{
   storage:diskStorage({

     destination:'./files/profile-images',

     filename:(req,file,cb)=>{

       const name =
       Date.now() +
       '-' +
       Math.round(Math.random()*100000);

       cb(
        null,
        name + extname(file.originalname)
       );

     }

   })
 })
)
async updateProfile(

 @CurrentUser() user:User,

 @Body() dto:UpdateProfileDto,

 @UploadedFile() image?:Express.Multer.File

){

 return this.usersService.updateProfile(
   user.id,
   dto,
   image
 );

}

@UseGuards(FirebaseAuthGuard)
@Delete('me')
@ApiBearerAuth()
deleteAccount(@CurrentUser() user: User, @Body() dto: DeleteAccountDto) {
  return this.usersService.deleteOwnAccount(user, dto.confirmEmail);
}

}
