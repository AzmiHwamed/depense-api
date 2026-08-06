import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'this is the main page of Translate App backend services !';
  }
}
