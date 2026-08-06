import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: User = request.user;

    if (!user.hasActiveAccess()) {
      throw new ForbiddenException({
        message: 'Your trial has ended. Please subscribe to continue.',
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
      });
    }

    return true;
  }
}
