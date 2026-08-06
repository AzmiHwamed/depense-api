import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { User } from '../user/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user || !user.isAdmin()) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
